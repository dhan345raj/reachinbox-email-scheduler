import { Batch, Email } from '@prisma/client';
import prisma from '../config/database';
import { config } from '../config';
import { queueService } from './queue.service';
import { elasticsearchService } from './elasticsearch.service';
import {
  ScheduleEmailsRequest,
  PaginatedResult,
  EmailWithRelations,
} from '../types';

export class EmailService {
  /**
   * Creates a batch and schedules delayed email jobs
   */
  async createBatchAndSchedule(
    userId: string,
    data: ScheduleEmailsRequest & { csvFileName?: string }
  ): Promise<{ batch: Batch; emails: Email[] }> {
    const {
      senderId,
      subject,
      body,
      recipients = [],
      startTime,
      delayBetweenSeconds = Math.floor(config.worker.minDelayBetweenEmailsMs / 1000),
      hourlyLimit = config.rateLimit.maxEmailsPerHour,
      csvFileName,
    } = data;

    // Validate sender belongs to user
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId },
    });

    if (!sender) {
      throw new Error('Sender not found or does not belong to the authenticated user');
    }

    // Clean and validate recipients
    const uniqueRecipients = Array.from(
      new Set(
        recipients
          .map((r) => r.trim().toLowerCase())
          .filter((r) => r.length > 0 && r.includes('@'))
      )
    );

    if (uniqueRecipients.length === 0) {
      throw new Error('At least one valid recipient email address is required');
    }

    const baseStartTime = startTime ? new Date(startTime).getTime() : Date.now();
    const effectiveDelay = Math.max(1, delayBetweenSeconds);
    const effectiveHourlyLimit = Math.max(1, hourlyLimit);

    // Create the batch record
    const batch = await prisma.batch.create({
      data: {
        userId,
        senderId,
        subject,
        body,
        csvFileName: csvFileName || null,
        totalEmails: uniqueRecipients.length,
        startTime: new Date(baseStartTime),
        delayBetweenSeconds: effectiveDelay,
        hourlyLimit: effectiveHourlyLimit,
        status: 'ACTIVE',
      },
    });

    const createdEmails: Email[] = [];
    const now = Date.now();

    // Create each email and enqueue the BullMQ job
    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const scheduledTimeMs = baseStartTime + i * effectiveDelay * 1000;
      const scheduledAt = new Date(scheduledTimeMs);
      const idempotencyKey = `${batch.id}:${recipient}:${i}`;
      const delayMs = Math.max(0, scheduledTimeMs - now);

      const email = await prisma.email.create({
        data: {
          userId,
          senderId,
          batchId: batch.id,
          recipient,
          subject,
          body,
          scheduledAt,
          status: 'SCHEDULED',
          idempotencyKey,
        },
      });

      // Queue the job
      const job = await queueService.addEmailJob(email.id, delayMs);

      // Save the BullMQ Job ID
      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: { bullmqJobId: String(job.id) },
      });

      createdEmails.push(updatedEmail);

      // Index in Elasticsearch (non-blocking)
      elasticsearchService.indexEmail({ ...email, sender: { email: sender.email } } as any).catch(err => {
        console.error('[EmailService] ES index failed:', err);
      });
    }

    console.log(
      `[EmailService] Scheduled batch ${batch.id} with ${createdEmails.length} emails for user ${userId}`
    );

    return {
      batch,
      emails: createdEmails,
    };
  }

  /**
   * Retrieves paginated scheduled emails for a user
   */
  async getScheduledEmails(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<EmailWithRelations>> {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const take = Math.max(1, limit);

    const where = {
      userId,
      status: {
        in: ['SCHEDULED', 'RATE_LIMITED', 'SENDING'],
      },
    };

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: {
          sender: { select: { id: true, email: true, createdAt: true } },
          batch: true,
        },
      }),
    ]);

    const mappedEmails = emails.map((e) => ({
      ...e,
      senderEmail: e.sender?.email || '',
    }));

    return {
      data: mappedEmails,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Retrieves paginated sent emails for a user
   */
  async getSentEmails(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<EmailWithRelations>> {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const take = Math.max(1, limit);

    const where = {
      userId,
      status: 'SENT',
    };

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take,
        orderBy: { sentAt: 'desc' },
        include: {
          sender: { select: { id: true, email: true, createdAt: true } },
          batch: true,
        },
      }),
    ]);

    const mappedEmails = emails.map((e) => ({
      ...e,
      senderEmail: e.sender?.email || '',
    }));

    return {
      data: mappedEmails,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Retrieves paginated batches for a user
   */
  async getBatches(userId: string, page = 1, limit = 20): Promise<PaginatedResult<Batch>> {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const take = Math.max(1, limit);

    const where = { userId };

    const [total, batches] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, email: true, createdAt: true } },
          _count: {
            select: { emails: true },
          },
        },
      }),
    ]);

    return {
      data: batches,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Retrieves a single batch by ID
   */
  async getBatchById(batchId: string, userId: string) {
    return prisma.batch.findFirst({
      where: { id: batchId, userId },
      include: {
        sender: { select: { id: true, email: true, createdAt: true } },
        emails: {
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });
  }
}

export const emailService = new EmailService();
export default emailService;

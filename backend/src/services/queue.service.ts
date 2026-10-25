import { Job } from 'bullmq';
import { emailQueue, EmailJobData } from '../config/queue';
import prisma from '../config/database';

export class QueueService {
  /**
   * Adds an email sending job to BullMQ with a specific delay in milliseconds
   */
  async addEmailJob(emailId: string, delayMs: number): Promise<Job<EmailJobData>> {
    const delay = Math.max(0, Math.floor(delayMs));

    // Custom job ID to assist with idempotency and tracking
    const jobId = `email-job-${emailId}`;

    const job = await emailQueue.add(
      'send-email',
      { emailId },
      {
        delay,
        jobId,
        removeOnComplete: true,
      }
    );

    return job;
  }

  /**
   * Checks BullMQ queue to see if a job with the specified ID exists and is active/delayed/waiting
   */
  async isJobInQueue(jobId: string): Promise<boolean> {
    try {
      const job = await emailQueue.getJob(jobId);
      if (!job) {
        return false;
      }
      const state = await job.getState();
      return ['delayed', 'waiting', 'active', 'prioritized'].includes(state);
    } catch {
      return false;
    }
  }

  /**
   * Re-queues any emails in DB that have status SCHEDULED or RATE_LIMITED
   * whose BullMQ jobs might have been lost due to Redis crash/restart
   */
  async restoreJobsOnStartup(): Promise<number> {
    console.log('[QueueService] Checking for orphaned or un-queued emails to restore...');

    try {
      const pendingEmails = await prisma.email.findMany({
        where: {
          status: {
            in: ['SCHEDULED', 'RATE_LIMITED', 'SENDING'],
          },
        },
      });

      console.log(`[QueueService] Found ${pendingEmails.length} pending email(s) in database.`);
      let restoredCount = 0;

      for (const email of pendingEmails) {
        if (email.status === 'SENDING') {
          await prisma.email.update({ where: { id: email.id }, data: { status: 'SCHEDULED' } });
        }

        let jobExists = false;

        if (email.bullmqJobId) {
          jobExists = await this.isJobInQueue(email.bullmqJobId);
        }

        if (!jobExists) {
          const now = Date.now();
          const scheduledTime = email.scheduledAt.getTime();
          const delayMs = Math.max(0, scheduledTime - now);

          const job = await this.addEmailJob(email.id, delayMs);

          await prisma.email.update({
            where: { id: email.id },
            data: {
              bullmqJobId: String(job.id),
              status: 'SCHEDULED',
            },
          });

          restoredCount++;
          console.log(
            `[QueueService] Restored job for email ${email.id} (recipient: ${email.recipient}, delay: ${delayMs}ms)`
          );
        }
      }

      console.log(`[QueueService] Restoration complete. Restored ${restoredCount} jobs.`);
      return restoredCount;
    } catch (error: any) {
      console.error('[QueueService] Error restoring jobs on startup:', error.message || error);
      return 0;
    }
  }
}

export const queueService = new QueueService();
export default queueService;

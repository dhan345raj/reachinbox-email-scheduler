import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { emailService } from '../services/email.service';
import { elasticsearchService } from '../services/elasticsearch.service';

export class EmailController {
  /**
   * Schedules email batch from JSON payload or CSV file upload
   */
  async scheduleEmails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const {
        senderId,
        subject,
        body,
        startTime,
        delayBetweenSeconds,
        hourlyLimit,
      } = req.body;

      let recipients: string[] = [];

      // 1. Check if recipients are provided in body (array or JSON-stringified array or comma-separated)
      if (req.body.recipients) {
        if (Array.isArray(req.body.recipients)) {
          recipients = req.body.recipients;
        } else if (typeof req.body.recipients === 'string') {
          try {
            const parsed = JSON.parse(req.body.recipients);
            if (Array.isArray(parsed)) {
              recipients = parsed;
            } else {
              recipients = req.body.recipients.split(',').map((e: string) => e.trim());
            }
          } catch {
            recipients = req.body.recipients.split(',').map((e: string) => e.trim());
          }
        }
      }

      // 2. Check if a CSV file was uploaded via multipart/form-data
      let csvFileName: string | undefined;
      if (req.file) {
        csvFileName = req.file.originalname;
        try {
          const records: any[] = parse(req.file.buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          for (const row of records) {
            // Find key case-insensitively for "email"
            const emailKey = Object.keys(row).find(
              (k) => k.toLowerCase() === 'email' || k.toLowerCase() === 'recipient'
            );

            if (emailKey && row[emailKey]) {
              recipients.push(String(row[emailKey]).trim());
            } else {
              // Fallback: Check if any value in the row looks like an email address
              const potentialEmail = Object.values(row).find(
                (val) => typeof val === 'string' && val.includes('@') && val.includes('.')
              );
              if (potentialEmail) {
                recipients.push(String(potentialEmail).trim());
              }
            }
          }
        } catch (csvErr: any) {
          res.status(400).json({ success: false, error: `CSV Parsing error: ${csvErr.message}` });
          return;
        }
      }

      // Clean and validate recipients
      recipients = Array.from(
        new Set(
          recipients
            .map((r) => r.trim().toLowerCase())
            .filter((r) => r.length > 0 && r.includes('@'))
        )
      );

      if (!senderId) {
        res.status(400).json({ success: false, error: 'senderId is required' });
        return;
      }
      if (!subject || subject.trim().length === 0) {
        res.status(400).json({ success: false, error: 'subject is required' });
        return;
      }
      if (!body || body.trim().length === 0) {
        res.status(400).json({ success: false, error: 'body is required' });
        return;
      }
      if (recipients.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid recipient email addresses found in request body or CSV file',
        });
        return;
      }

      const result = await emailService.createBatchAndSchedule(req.user.id, {
        senderId,
        subject,
        body,
        recipients,
        startTime: startTime ? new Date(startTime) : undefined,
        delayBetweenSeconds: delayBetweenSeconds ? parseInt(delayBetweenSeconds, 10) : undefined,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : undefined,
        csvFileName,
      });

      res.status(201).json({
        success: true,
        data: {
          batch: result.batch,
          totalEmailsScheduled: result.emails.length,
        },
      });
    } catch (error: any) {
      console.error('[EmailController] scheduleEmails error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to schedule emails' });
    }
  }

  /**
   * Returns paginated list of scheduled emails for authenticated user
   */
  async getScheduledEmails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await emailService.getScheduledEmails(req.user.id, page, limit);
      res.status(200).json({
        success: true,
        data: {
          items: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[EmailController] getScheduledEmails error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve scheduled emails' });
    }
  }

  /**
   * Returns paginated list of sent emails for authenticated user
   */
  async getSentEmails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await emailService.getSentEmails(req.user.id, page, limit);
      res.status(200).json({
        success: true,
        data: {
          items: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[EmailController] getSentEmails error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve sent emails' });
    }
  }

  /**
   * Full-text search across indexed emails via Elasticsearch
   */
  async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const query = (req.query.q as string) || (req.query.query as string) || '';
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await elasticsearchService.searchEmails(req.user.id, query, {
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: {
          items: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[EmailController] searchEmails error:', error);
      res.status(500).json({ success: false, error: 'Failed to search emails' });
    }
  }

  /**
   * Returns paginated batches created by authenticated user
   */
  async getBatches(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await emailService.getBatches(req.user.id, page, limit);
      res.status(200).json({
        success: true,
        data: {
          items: result.data,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      console.error('[EmailController] getBatches error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve batches' });
    }
  }

  /**
   * Returns single batch details by ID
   */
  async getBatchById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const id = req.params.id as string;
      const batch = await emailService.getBatchById(id, req.user.id);

      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      res.status(200).json({ success: true, data: batch });
    } catch (error: any) {
      console.error('[EmailController] getBatchById error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve batch' });
    }
  }
}

export const emailController = new EmailController();
export default emailController;

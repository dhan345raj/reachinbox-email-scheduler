import { Request, Response } from 'express';
import { senderService } from '../services/sender.service';

export class SenderController {
  /**
   * Returns all senders configured for authenticated user
   */
  async getSenders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const senders = await senderService.getSenders(req.user.id);
      res.status(200).json({ success: true, data: senders });
    } catch (error: any) {
      console.error('[SenderController] getSenders error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve senders' });
    }
  }

  /**
   * Creates a new Ethereal email sender account for authenticated user
   */
  async createSender(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const sender = await senderService.createSender(req.user.id);
      res.status(201).json({
        success: true,
        data: sender,
      });
    } catch (error: any) {
      console.error('[SenderController] createSender error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create sender' });
    }
  }

  /**
   * Deletes a sender
   */
  async deleteSender(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const id = req.params.id as string;
      await senderService.deleteSender(id, req.user.id);
      res.status(200).json({ success: true, message: 'Sender deleted successfully' });
    } catch (error: any) {
      console.error('[SenderController] deleteSender error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete sender' });
    }
  }
}

export const senderController = new SenderController();
export default senderController;

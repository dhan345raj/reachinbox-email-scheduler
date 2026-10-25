import nodemailer from 'nodemailer';
import { Sender } from '@prisma/client';
import prisma from '../config/database';

export class SenderService {
  /**
   * Creates a new Ethereal Email test account and registers it as a sender for the user
   */
  async createSender(userId: string): Promise<Sender> {
    try {
      const testAccount = await nodemailer.createTestAccount();

      const sender = await prisma.sender.create({
        data: {
          userId,
          email: testAccount.user,
          etherealUser: testAccount.user,
          etherealPass: testAccount.pass,
        },
      });

      console.log(`[SenderService] Created Ethereal sender: ${sender.email} for user: ${userId}`);
      return sender;
    } catch (error: any) {
      console.error('[SenderService] Failed to create Ethereal sender:', error);
      throw new Error(`Failed to create test email sender: ${error.message}`);
    }
  }

  /**
   * Returns all senders configured for a specific user
   */
  async getSenders(userId: string): Promise<Sender[]> {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emails: true, batches: true },
        },
      },
    });
  }

  /**
   * Returns a single sender belonging to a user by ID
   */
  async getSenderById(id: string, userId: string): Promise<Sender | null> {
    return prisma.sender.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Deletes a sender belonging to a user
   */
  async deleteSender(id: string, userId: string): Promise<Sender> {
    const existing = await prisma.sender.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new Error('Sender not found or does not belong to user');
    }

    return prisma.sender.delete({
      where: { id },
    });
  }
}

export const senderService = new SenderService();
export default senderService;

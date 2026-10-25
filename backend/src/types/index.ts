import { Request } from 'express';
import { User, Sender, Batch, Email } from '@prisma/client';

export type UserWithoutSecrets = Omit<User, 'slackAccessToken'> & {
  hasSlackConnected: boolean;
};

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: UserWithoutSecrets;
}

export interface CreateSenderResponse {
  sender: Sender;
}

export interface ScheduleEmailsRequest {
  senderId: string;
  subject: string;
  body: string;
  recipients?: string[];
  startTime?: string | Date;
  delayBetweenSeconds?: number;
  hourlyLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EmailWithRelations = Email & {
  sender?: Partial<Sender>;
  batch?: Batch;
  user?: User;
  senderEmail?: string;
};

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
}

export interface IndexedEmailDocument {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  batchId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  etherealUrl: string | null;
  createdAt: string | null;
}

export interface SlackAuthStatus {
  isConnected: boolean;
  teamName: string | null;
  channelId: string | null;
}

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

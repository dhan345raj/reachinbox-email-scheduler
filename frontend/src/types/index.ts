export type EmailStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  slackConnected: boolean;
  slackTeamName: string | null;
}

export interface SenderResponse {
  id: string;
  email: string;
  createdAt: string;
}

export interface EmailResponse {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  senderEmail: string;
  etherealUrl: string | null;
  errorMessage: string | null;
}

export interface BatchResponse {
  id: string;
  subject: string;
  totalEmails: number;
  startTime: string;
  delayBetweenSeconds: number;
  hourlyLimit: number;
  status: string;
  createdAt: string;
  senderEmail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  senderId: string;
  startTime: string;
  delayBetweenSeconds: number;
  hourlyLimit: number;
}

export interface SlackStatusResponse {
  connected: boolean;
  teamName?: string;
}

export interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

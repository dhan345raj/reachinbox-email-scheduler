import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  BatchResponse,
  EmailResponse,
  PaginatedResponse,
  ScheduleEmailPayload,
  SenderResponse,
  SlackStatusResponse,
  UserResponse,
} from '../types';

export const TOKEN_KEY = 'reachinbox_auth_token';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token') || localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// API service calls
export const authApi = {
  loginGoogle: async (credential: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: UserResponse }>>('/auth/google', {
      credential,
    });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<ApiResponse<UserResponse>>('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await api.post<ApiResponse<null>>('/auth/logout');
    return res.data;
  },
};

export const sendersApi = {
  getSenders: async () => {
    const res = await api.get<ApiResponse<SenderResponse[]>>('/senders');
    return res.data;
  },
  createSender: async (email: string) => {
    const res = await api.post<ApiResponse<SenderResponse>>('/senders', { email });
    return res.data;
  },
};

export const emailsApi = {
  schedule: async (payload: ScheduleEmailPayload) => {
    const res = await api.post<ApiResponse<BatchResponse>>('/emails/schedule', payload);
    return res.data;
  },
  getScheduled: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<PaginatedResponse<EmailResponse>>>(
      `/emails/scheduled?page=${page}&limit=${limit}`
    );
    return res.data;
  },
  getSent: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<PaginatedResponse<EmailResponse>>>(
      `/emails/sent?page=${page}&limit=${limit}`
    );
    return res.data;
  },
  search: async (q: string, status?: string) => {
    const statusParam = status ? `&status=${encodeURIComponent(status)}` : '';
    const res = await api.get<ApiResponse<EmailResponse[]>>(
      `/emails/search?q=${encodeURIComponent(q)}${statusParam}`
    );
    return res.data;
  },
};

export const slackApi = {
  getStatus: async () => {
    const res = await api.get<ApiResponse<SlackStatusResponse>>('/slack/status');
    return res.data;
  },
  disconnect: async () => {
    const res = await api.delete<ApiResponse<null>>('/slack/disconnect');
    return res.data;
  },
  getConnectUrl: (): string => {
    const token = localStorage.getItem('token') || localStorage.getItem(TOKEN_KEY);
    return `/api/slack/connect?token=${encodeURIComponent(token || '')}`;
  },
};

export default api;

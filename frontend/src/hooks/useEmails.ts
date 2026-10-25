import { useState, useEffect, useCallback } from 'react';
import { EmailResponse, PaginatedResponse, SenderResponse } from '../types';
import { emailsApi, sendersApi } from '../services/api';

export function useScheduledEmails(page = 1, limit = 20) {
  const [data, setData] = useState<PaginatedResponse<EmailResponse> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await emailsApi.getScheduled(page, limit);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to fetch scheduled emails');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error fetching scheduled emails';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { data, loading, error, refetch: fetchEmails };
}

export function useSentEmails(page = 1, limit = 20) {
  const [data, setData] = useState<PaginatedResponse<EmailResponse> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await emailsApi.getSent(page, limit);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to fetch sent emails');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error fetching sent emails';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return { data, loading, error, refetch: fetchEmails };
}

export function useSearchEmails(query: string, status?: string) {
  const [data, setData] = useState<EmailResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchEmails = useCallback(async () => {
    if (!query || query.trim().length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await emailsApi.search(query.trim(), status);
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : (res.data as any)?.items || []);
      } else {
        setError(res.message || 'Search failed');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error searching emails';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchEmails();
    }, 300); // 300ms debounce for search query

    return () => clearTimeout(handler);
  }, [searchEmails]);

  return { data, loading, error, refetch: searchEmails };
}

export function useSenders() {
  const [data, setData] = useState<SenderResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSenders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sendersApi.getSenders();
      if (res.success) {
        setData(Array.isArray(res.data) ? res.data : (res.data as any)?.senders || []);
      } else {
        setError(res.message || 'Failed to fetch senders');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Error fetching senders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSenders();
  }, [fetchSenders]);

  return { data, loading, error, refetch: fetchSenders };
}

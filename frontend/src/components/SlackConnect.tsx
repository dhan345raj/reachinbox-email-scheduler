import React, { useState, useEffect, useCallback } from 'react';
import { slackApi } from '../services/api';
import { SlackStatusResponse } from '../types';
import Button from './ui/Button';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const SlackConnect: React.FC = () => {
  const [status, setStatus] = useState<SlackStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await slackApi.getStatus();
      if (res.success && res.data) {
        setStatus({
          connected: Boolean(res.data?.connected),
          teamName: res.data?.teamName,
        });
      } else if (res.data?.connected !== undefined) {
        setStatus({
          connected: Boolean(res.data?.connected),
          teamName: res.data?.teamName,
        });
      } else if ((res as any)?.connected !== undefined) {
        setStatus({
          connected: Boolean((res as any)?.connected),
          teamName: (res as any)?.teamName,
        });
      } else {
        setStatus({ connected: false });
      }
    } catch {
      // Default to disconnected on error
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Recheck status when window regains focus (e.g. after OAuth popup closes)
    const onFocus = () => {
      fetchStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStatus]);

  const handleConnect = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('reachinbox_auth_token');
    const url = `/api/slack/connect?token=${encodeURIComponent(token || '')}`;
    const popup = window.open(url, 'slack-auth', 'width=600,height=700,left=400,top=200');

    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchStatus();
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const res = await slackApi.disconnect();
      if (res.success) {
        setStatus({ connected: false });
        toast.success('Slack disconnected successfully');
      } else {
        toast.error('Failed to disconnect Slack');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error disconnecting Slack';
      toast.error(msg);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      </div>
    );
  }

  const isConnected = Boolean(status?.connected);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center space-x-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
            isConnected ? 'bg-[#4A154B]' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {/* Slack SVG Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.528 2.528 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">Slack Integration</h4>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                <AlertCircle className="w-3 h-3 text-gray-400" /> Not Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isConnected
              ? `Connected to workspace: ${status?.teamName || 'Active Workspace'}`
              : 'Receive real-time notifications for scheduled and sent emails'}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center">
        {isConnected ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisconnect}
            isLoading={disconnecting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-300"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            className="bg-[#4A154B] hover:bg-[#3f1240] text-white border-transparent"
          >
            Connect Slack
          </Button>
        )}
      </div>
    </div>
  );
};

export default SlackConnect;

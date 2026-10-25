import React from 'react';
import { EmailStatus } from '../../types';

export interface BadgeProps {
  status: EmailStatus | string;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  SENDING: {
    label: 'Sending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  SENT: {
    label: 'Sent',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  FAILED: {
    label: 'Failed',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  RATE_LIMITED: {
    label: 'Rate Limited',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
};

export const Badge: React.FC<BadgeProps> = ({ status, label, className = '' }) => {
  const normalizedKey = status.toUpperCase();
  const config = statusConfig[normalizedKey] || {
    label: status,
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{label || config.label}</span>
    </span>
  );
};

export default Badge;

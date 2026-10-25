import React, { useState } from 'react';
import { EmailResponse } from '../types';
import Badge from './ui/Badge';
import LoadingSpinner from './ui/LoadingSpinner';
import EmptyState from './ui/EmptyState';
import Modal from './ui/Modal';
import {
  ExternalLink,
  Eye,
  Mail,
  Clock,
  AlertCircle,
  Send,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface EmailTableProps {
  emails: EmailResponse[];
  loading: boolean;
  type: 'scheduled' | 'sent' | 'search';
  onRefresh?: () => void;
  onComposeClick?: () => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  loading,
  type,
  onComposeClick,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailResponse | null>(null);

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '—';
    try {
      return format(parseISO(isoString), 'MMM d, yyyy h:mm a');
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <LoadingSpinner size="md" text="Loading emails..." />
      </div>
    );
  }

  if (emails.length === 0) {
    const emptyTitle =
      type === 'scheduled'
        ? 'No scheduled emails'
        : type === 'sent'
        ? 'No sent emails yet'
        : 'No matching emails found';

    const emptyDesc =
      type === 'scheduled'
        ? 'You have no pending scheduled emails. Click below to compose and schedule a campaign.'
        : type === 'sent'
        ? 'No emails have been sent yet. Emails will appear here once processed by the worker.'
        : 'Try searching with a different term, recipient email, or status.';

    return (
      <EmptyState
        icon={type === 'sent' ? <Send className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        title={emptyTitle}
        description={emptyDesc}
        actionLabel={type !== 'search' ? 'Compose New Email' : undefined}
        onAction={onComposeClick}
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/75">
              <tr>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Recipient
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Subject
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  {type === 'sent' ? 'Sent Time' : 'Scheduled Time'}
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Sender
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {emails.map((email) => (
                <tr
                  key={email.id}
                  className="hover:bg-blue-50/30 transition-colors duration-100 group cursor-pointer"
                  onClick={() => setSelectedEmail(email)}
                >
                  {/* Recipient */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">
                        {email.recipient}
                      </span>
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-6 py-4">
                    <span className="text-gray-900 font-medium line-clamp-1 max-w-[240px]">
                      {email.subject}
                    </span>
                  </td>

                  {/* Scheduled or Sent Time */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {type === 'sent' && email.sentAt
                          ? formatDate(email.sentAt)
                          : formatDate(email.scheduledAt)}
                      </span>
                    </div>
                  </td>

                  {/* Sender Email */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs truncate max-w-[160px]">
                    {email.senderEmail || (email as any).sender?.email || 'N/A'}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge status={email.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                    <div
                      className="flex items-center justify-end space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {email.etherealUrl && (
                        <a
                          href={email.etherealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          title="View delivered preview on Ethereal"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Preview</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedEmail(email)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Details Modal */}
      {selectedEmail && (
        <Modal
          isOpen={Boolean(selectedEmail)}
          onClose={() => setSelectedEmail(null)}
          title="Email Details"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <Badge status={selectedEmail.status} />
              {selectedEmail.etherealUrl && (
                <a
                  href={selectedEmail.etherealUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Ethereal Mail
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-lg border border-gray-200">
              <div>
                <p className="text-gray-400 font-medium">Recipient</p>
                <p className="font-semibold text-gray-800 break-all">{selectedEmail.recipient}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Sender</p>
                <p className="font-semibold text-gray-800 break-all">
                  {selectedEmail.senderEmail || (selectedEmail as any).sender?.email || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Scheduled At</p>
                <p className="font-semibold text-gray-800">{formatDate(selectedEmail.scheduledAt)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-medium">Sent At</p>
                <p className="font-semibold text-gray-800">{formatDate(selectedEmail.sentAt)}</p>
              </div>
            </div>

            {selectedEmail.errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Delivery Error</p>
                  <p className="mt-0.5">{selectedEmail.errorMessage}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Subject
              </p>
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {selectedEmail.subject}
              </h4>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Body
              </p>
              <div className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-lg border border-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {selectedEmail.body}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default EmailTable;

import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Input, { Textarea } from './ui/Input';
import Button from './ui/Button';
import FileUpload from './ui/FileUpload';
import { emailsApi, sendersApi } from '../services/api';
import { SenderResponse } from '../types';
import toast from 'react-hot-toast';
import { Send, Plus, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Form fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderId, setSenderId] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() =>
    format(new Date(Date.now() + 5 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);

  // Senders list & inline sender creation
  const [senders, setSenders] = useState<SenderResponse[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [isAddingSender, setIsAddingSender] = useState(false);
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [creatingSender, setCreatingSender] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch senders when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSenders();
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      setLoadingSenders(true);
      const res = await sendersApi.getSenders();
      const sendersList: SenderResponse[] = res.success
        ? Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.senders || []
        : Array.isArray(res)
        ? (res as any)
        : [];

      if (sendersList.length > 0) {
        setSenders(sendersList);
        if (!senderId) {
          setSenderId(sendersList[0].id);
        }
      }
    } catch {
      toast.error('Failed to load sender accounts');
    } finally {
      setLoadingSenders(false);
    }
  };

  const handleCreateSender = async () => {
    if (!newSenderEmail || !newSenderEmail.includes('@')) {
      toast.error('Please enter a valid sender email address');
      return;
    }

    try {
      setCreatingSender(true);
      const res = await sendersApi.createSender(newSenderEmail.trim());
      const newSender = res.success && res.data ? res.data : (res as any)?.id ? (res as any) : null;
      if (newSender) {
        toast.success(`Sender ${newSender.email} created`);
        setSenders((prev) => [...prev, newSender]);
        setSenderId(newSender.id);
        setNewSenderEmail('');
        setIsAddingSender(false);
      } else {
        toast.error(res.message || 'Could not create sender');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error creating sender';
      toast.error(msg);
    } finally {
      setCreatingSender(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = 'Subject is required';
    if (!body.trim()) errs.body = 'Email body is required';
    if (!senderId) errs.senderId = 'Sender is required';
    if (recipients.length === 0) errs.recipients = 'Please upload a CSV or TXT file with valid recipients';
    if (!startTime) errs.startTime = 'Start time is required';
    if (delayBetweenSeconds < 0) errs.delay = 'Delay must be 0 or greater';
    if (hourlyLimit <= 0) errs.hourlyLimit = 'Hourly limit must be at least 1';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const isoStartTime = new Date(startTime).toISOString();

      const res = await emailsApi.schedule({
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        senderId,
        startTime: isoStartTime,
        delayBetweenSeconds: Number(delayBetweenSeconds),
        hourlyLimit: Number(hourlyLimit),
      });

      if (res.success || (res as any)?.id || (res as any)?.batchId) {
        toast.success(
          `Successfully scheduled ${recipients.length} email${
            recipients.length === 1 ? '' : 's'
          }!`
        );
        handleReset();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Failed to schedule emails');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to schedule emails';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubject('');
    setBody('');
    setRecipients([]);
    setErrors({});
    setIsAddingSender(false);
    setNewSenderEmail('');
    setStartTime(format(new Date(Date.now() + 5 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Scheduled Campaign"
      description="Create a throttled email campaign to be sent automatically according to your rate limits."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Sender Dropdown & Inline Adder */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Sender Account <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsAddingSender(!isAddingSender)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAddingSender ? 'Choose existing' : 'Add new sender'}
            </button>
          </div>

          {isAddingSender ? (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="new-sender@example.com"
                value={newSenderEmail}
                onChange={(e) => setNewSenderEmail(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 text-sm px-3.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleCreateSender}
                isLoading={creatingSender}
              >
                Save
              </Button>
            </div>
          ) : (
            <select
              value={senderId}
              onChange={(e) => {
                setSenderId(e.target.value);
                if (errors.senderId) setErrors((prev) => ({ ...prev, senderId: '' }));
              }}
              disabled={loadingSenders || senders.length === 0}
              className={`block w-full rounded-lg border text-sm px-3.5 py-2 bg-white transition-colors duration-150 focus:outline-none focus:ring-2 ${
                errors.senderId
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              {senders.length === 0 ? (
                <option value="">No senders found. Click &quot;Add new sender&quot;</option>
              ) : (
                senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email}
                  </option>
                ))
              )}
            </select>
          )}
          {errors.senderId && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.senderId}</p>
          )}
        </div>

        {/* Recipients File Upload */}
        <div>
          <FileUpload
            label="Recipients File (CSV or TXT)"
            onEmailsExtracted={(emails) => {
              setRecipients(emails);
              if (emails.length > 0 && errors.recipients) {
                setErrors((prev) => ({ ...prev, recipients: '' }));
              }
            }}
            extractedCount={recipients.length}
            error={errors.recipients}
          />
        </div>

        {/* Subject */}
        <div>
          <Input
            label="Email Subject"
            required
            placeholder="e.g. Introducing our new analytics platform"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
            }}
            error={errors.subject}
          />
        </div>

        {/* Body Textarea */}
        <div>
          <Textarea
            label="Email Body"
            required
            rows={5}
            placeholder="Hi there,&#10;&#10;We are excited to share..."
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
            }}
            error={errors.body}
          />
        </div>

        {/* Throttling & Scheduling Controls */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Scheduling &amp; Rate Limits
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Input
                label="Start Time"
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }));
                }}
                error={errors.startTime}
              />
            </div>

            <div>
              <Input
                label="Delay Between (sec)"
                type="number"
                min={0}
                required
                value={delayBetweenSeconds}
                onChange={(e) => {
                  setDelayBetweenSeconds(Number(e.target.value));
                  if (errors.delay) setErrors((prev) => ({ ...prev, delay: '' }));
                }}
                error={errors.delay}
              />
            </div>

            <div>
              <Input
                label="Hourly Limit"
                type="number"
                min={1}
                required
                value={hourlyLimit}
                onChange={(e) => {
                  setHourlyLimit(Number(e.target.value));
                  if (errors.hourlyLimit) setErrors((prev) => ({ ...prev, hourlyLimit: '' }));
                }}
                error={errors.hourlyLimit}
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Schedule Campaign {recipients.length > 0 && `(${recipients.length})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ComposeModal;

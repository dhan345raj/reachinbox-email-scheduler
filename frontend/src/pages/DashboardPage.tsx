import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import Tabs, { TabItem } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import EmailTable from '../components/EmailTable';
import ComposeModal from '../components/ComposeModal';
import SlackConnect from '../components/SlackConnect';
import { useScheduledEmails, useSentEmails, useSearchEmails } from '../hooks/useEmails';
import {
  Clock,
  Send,
  Plus,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledPage, setScheduledPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Data hooks
  const {
    data: scheduledData,
    loading: scheduledLoading,
    refetch: refetchScheduled,
  } = useScheduledEmails(scheduledPage, 20);

  const {
    data: sentData,
    loading: sentLoading,
    refetch: refetchSent,
  } = useSentEmails(sentPage, 20);

  const isSearching = searchQuery.trim().length > 0;
  const searchStatus = activeTab === 'scheduled' ? 'SCHEDULED' : 'SENT';

  const {
    data: searchResults,
    loading: searchLoading,
    refetch: refetchSearch,
  } = useSearchEmails(searchQuery, isSearching ? searchStatus : undefined);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'scheduled' | 'sent');
  };

  const handleRefresh = () => {
    if (isSearching) {
      refetchSearch();
    } else if (activeTab === 'scheduled') {
      refetchScheduled();
    } else {
      refetchSent();
    }
  };

  const handleComposeSuccess = () => {
    refetchScheduled();
    setActiveTab('scheduled');
    setScheduledPage(1);
  };

  const tabs: TabItem[] = [
    {
      id: 'scheduled',
      label: 'Scheduled Emails',
      count: scheduledData?.total ?? 0,
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'sent',
      label: 'Sent Emails',
      count: sentData?.total ?? 0,
      icon: <Send className="w-4 h-4" />,
    },
  ];

  // Current table view parameters
  const currentLoading = isSearching
    ? searchLoading
    : activeTab === 'scheduled'
    ? scheduledLoading
    : sentLoading;

  const searchItems = Array.isArray(searchResults)
    ? searchResults
    : (searchResults as any)?.items || [];

  const currentEmails = isSearching
    ? searchItems
    : activeTab === 'scheduled'
    ? scheduledData?.items || []
    : sentData?.items || [];

  const currentPagination =
    activeTab === 'scheduled'
      ? {
          page: scheduledPage,
          totalPages: scheduledData?.totalPages || 1,
          total: scheduledData?.total || 0,
          onPageChange: (p: number) => setScheduledPage(p),
        }
      : {
          page: sentPage,
          totalPages: sentData?.totalPages || 1,
          total: sentData?.total || 0,
          onPageChange: (p: number) => setSentPage(p),
        };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Section: Slack Integration Card */}
        <section aria-label="Integrations">
          <SlackConnect />
        </section>

        {/* Action Header: Search & Compose */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder={`Search in ${activeTab} emails (subject, recipient)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="pointer-events-auto p-1 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              title="Refresh emails"
              leftIcon={<RefreshCw className={`w-4 h-4 ${currentLoading ? 'animate-spin' : ''}`} />}
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => setIsComposeOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Compose New Email
            </Button>
          </div>
        </div>

        {/* Dashboard Tabs & Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

            {isSearching && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Searching results for &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {/* Email Table */}
          <EmailTable
            emails={currentEmails}
            loading={currentLoading}
            type={isSearching ? 'search' : activeTab}
            onComposeClick={() => setIsComposeOpen(true)}
            onRefresh={handleRefresh}
          />

          {/* Pagination (only when not searching) */}
          {!isSearching && (
            <Pagination
              currentPage={currentPagination.page}
              totalPages={currentPagination.totalPages}
              totalItems={currentPagination.total}
              onPageChange={currentPagination.onPageChange}
            />
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
      />
    </Layout>
  );
};

export default DashboardPage;

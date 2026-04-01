import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Search, RotateCcw } from 'lucide-react';
import { getCampaignSends } from '../../db/database';
import type { CampaignSend } from '../../types';

interface CampaignDeliveryTabProps {
  campaignId: number;
  onRetryFailed?: () => void;
}

export function CampaignDeliveryTab({ campaignId, onRetryFailed }: CampaignDeliveryTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  const sends = useMemo(() => getCampaignSends(campaignId), [campaignId]);

  const filtered = useMemo(() => {
    let list = sends;
    if (filter !== 'all') list = list.filter((s) => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.subscriber_email ?? '').toLowerCase().includes(q) ||
          (s.subscriber_name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sends, filter, search]);

  const sentCount = sends.filter((s) => s.status === 'sent').length;
  const failedCount = sends.filter((s) => s.status === 'failed').length;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'Z'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (sends.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 p-8">
        No delivery records yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Summary bar */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 flex-shrink-0 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
          <CheckCircle size={14} />
          <span><strong>{sentCount}</strong> delivered</span>
        </div>
        {failedCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400">
            <XCircle size={14} />
            <span><strong>{failedCount}</strong> failed</span>
          </div>
        )}
        {failedCount > 0 && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <RotateCcw size={12} />
            Retry failed
          </button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'sent' | 'failed')}
            className="px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All ({sends.length})</option>
            <option value="sent">Delivered ({sentCount})</option>
            <option value="failed">Failed ({failedCount})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur">
            <tr className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-2.5">Status</th>
              <th className="px-5 py-2.5">Recipient</th>
              <th className="px-5 py-2.5">Sent at</th>
              <th className="px-5 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filtered.map((send: CampaignSend) => (
              <tr key={send.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-2.5">
                  {send.status === 'sent' ? (
                    <CheckCircle size={15} className="text-green-500" />
                  ) : send.error && send.error.toLowerCase().includes('bounce') ? (
                    <AlertTriangle size={15} className="text-amber-400" />
                  ) : (
                    <XCircle size={15} className="text-red-400" />
                  )}
                </td>
                <td className="px-5 py-2.5">
                  <div className="font-medium text-gray-900 dark:text-white">{send.subscriber_email ?? '(deleted)'}</div>
                  {send.subscriber_name && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">{send.subscriber_name}</div>
                  )}
                </td>
                <td className="px-5 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(send.sent_at)}
                </td>
                <td className="px-5 py-2.5 text-gray-400 dark:text-gray-500 max-w-xs truncate">
                  {send.status === 'sent' ? (
                    <span className="text-green-600 dark:text-green-400">Delivered</span>
                  ) : (
                    <span className="text-red-400" title={send.error}>{send.error || 'Unknown error'}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400 dark:text-gray-500">
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

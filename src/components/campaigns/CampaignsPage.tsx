import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Edit2, Send as SendIcon } from 'lucide-react';
import { getCampaigns, deleteCampaign, duplicateCampaign } from '../../db/database';
import type { Campaign } from '../../types';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { useHotkey } from '../../hooks/useHotkey';

interface CampaignsPageProps {
  onCreateCampaign: () => void;
  onEditCampaign: (id: number) => void;
}

type Filter = 'all' | 'draft' | 'sent';

function formatDate(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CampaignsPage({ onCreateCampaign, onEditCampaign }: CampaignsPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<Campaign | null>(null);

  const refresh = () => setCampaigns(getCampaigns());
  useEffect(() => { refresh(); }, []);

  useHotkey('n', onCreateCampaign, !deleteConfirm);

  const filtered = campaigns.filter((c) => filter === 'all' || c.status === filter);

  const handleDuplicate = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = duplicateCampaign(id);
    refresh();
    onEditCampaign(newId);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteCampaign(deleteConfirm.id);
    setDeleteConfirm(null);
    refresh();
  };

  const statusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      status === 'sent'
        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    }`}>
      {status === 'sent' ? <SendIcon size={10} /> : null}
      {status === 'sent' ? 'Sent' : 'Draft'}
    </span>
  );

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      render: (row: Campaign) => <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>,
    },
    { key: 'subject', header: 'Subject', render: (row: Campaign) => <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs block">{row.subject}</span> },
    { key: 'list_name', header: 'List', render: (row: Campaign) => <span className="text-gray-500 dark:text-gray-400">{row.list_name || '—'}</span> },
    { key: 'status', header: 'Status', render: (row: Campaign) => statusBadge(row.status) },
    {
      key: 'date',
      header: 'Date',
      render: (row: Campaign) => (
        <span className="text-gray-400 text-xs">
          {row.status === 'sent' ? formatDate(row.sent_at) : formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row: Campaign) => (
        <div className="flex items-center justify-end gap-1">
          {row.status !== 'sent' && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditCampaign(row.id); }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
          )}
          <button
            onClick={(e) => handleDuplicate(row.id, e)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Duplicate as new draft"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const filterTabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: campaigns.length },
    { id: 'draft', label: 'Drafts', count: campaigns.filter((c) => c.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: campaigns.filter((c) => c.status === 'sent').length },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Campaigns</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300 dark:text-gray-600 hidden sm:block">n new</span>
          <Button variant="primary" onClick={onCreateCampaign}>
            <Plus size={16} />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              filter === tab.id ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <Table
          columns={columns}
          data={filtered}
          onRowClick={(row) => {
            if (row.status === 'sent') {
              const newId = duplicateCampaign(row.id);
              refresh();
              onEditCampaign(newId);
            } else {
              onEditCampaign(row.id);
            }
          }}
          emptyMessage={
            filter === 'all'
              ? 'No campaigns yet. Create your first campaign.'
              : `No ${filter} campaigns.`
          }
        />
      </div>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Campaign"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

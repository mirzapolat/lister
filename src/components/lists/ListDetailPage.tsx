import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, Download, Search, X, AlertCircle } from 'lucide-react';
import {
  getList, getSubscribersForList, removeSubscriberFromList,
  getImportHistory, getAllTags,
  getTagsForSubscriber, setTagsForSubscriber, getBounces, removeBounce,
  updateSubscriber, getLists, getListsForSubscriber, addSubscriberToList,
} from '../../db/database';
import type { List, Subscriber, ImportHistory, Bounce } from '../../types';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { MultiSelect } from '../ui/MultiSelect';
import { ImportModal } from './ImportModal';

// ── Subscriber Edit Modal ─────────────────────────────────────────────────────

interface SubscriberEditModalProps {
  subscriber: Subscriber;
  allTags: string[];
  allLists: List[];
  onClose: () => void;
  onSaved: () => void;
}

function SubscriberEditModal({ subscriber, allTags, allLists, onClose, onSaved }: SubscriberEditModalProps) {
  const [name, setName] = useState(subscriber.name ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(() => getTagsForSubscriber(subscriber.id));
  const [memberListIds, setMemberListIds] = useState<number[]>(() =>
    getListsForSubscriber(subscriber.id).map((l) => l.id)
  );
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      updateSubscriber(subscriber.id, subscriber.email, name);
      setTagsForSubscriber(subscriber.id, selectedTags);
      const currentIds = getListsForSubscriber(subscriber.id).map((l) => l.id);
      for (const id of memberListIds) {
        if (!currentIds.includes(id)) addSubscriberToList(subscriber.id, id);
      }
      for (const id of currentIds) {
        if (!memberListIds.includes(id)) removeSubscriberFromList(subscriber.id, id);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal isOpen title="Edit Subscriber" onClose={onClose} size="md">
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</label>
          <p className="text-sm text-gray-900 dark:text-white font-medium px-1">{subscriber.email}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tags</label>
          <MultiSelect
            options={allTags.map((t) => ({ id: t, label: t }))}
            selected={selectedTags}
            onChange={(s) => setSelectedTags(s as string[])}
            placeholder="Add tags..."
            allowCreate
          />
        </div>
        {allLists.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Lists</label>
            <MultiSelect
              options={allLists.map((l) => ({ id: l.id, label: l.name }))}
              selected={memberListIds}
              onChange={(s) => setMemberListIds(s as number[])}
              placeholder="Select lists..."
            />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── ListDetailPage ────────────────────────────────────────────────────────────

interface ListDetailPageProps {
  listId: number;
  onBack: () => void;
}

function formatDate(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function exportCSV(subscribers: Subscriber[], filename = 'subscribers.csv') {
  const header = 'email,name,created_at';
  const rows = subscribers.map((s) => `"${s.email}","${s.name}","${s.created_at}"`);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'email' | 'name' | 'created_at';

export function ListDetailPage({ listId, onBack }: ListDetailPageProps) {
  const [list, setList] = useState<List | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [subscriberTags, setSubscriberTags] = useState<Record<number, string[]>>({});
  const [bounces, setBounces] = useState<Bounce[]>([]);

  const refresh = () => {
    setList(getList(listId));
    const subs = getSubscribersForList(listId);
    setSubscribers(subs);
    setSelectedIds([]);
    setImportHistory(getImportHistory(listId));
    setAllTags(getAllTags());
    setAllLists(getLists());
    const tagMap: Record<number, string[]> = {};
    subs.forEach((s) => { tagMap[s.id] = getTagsForSubscriber(s.id); });
    setSubscriberTags(tagMap);
    setBounces(getBounces());
  };

  useEffect(() => { refresh(); }, [listId]);

  const bouncedEmails = useMemo(() => new Set(bounces.map((b) => b.email)), [bounces]);

  const filtered = useMemo(() => {
    let result = subscribers;
    if (activeTag) {
      result = result.filter((s) => (subscriberTags[s.id] ?? []).includes(activeTag));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.email.toLowerCase().includes(q) || (s.name ?? '').toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [subscribers, search, sortKey, sortDir, activeTag, subscriberTags]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key as SortKey); setSortDir('asc'); }
  };

  const handleBulkRemove = () => {
    if (!selectedIds.length) return;
    setDeleteConfirm(true);
  };

  const confirmRemove = () => {
    for (const id of selectedIds) {
      removeSubscriberFromList(id, listId);
    }
    setDeleteConfirm(false);
    refresh();
  };

  const handleExport = (all: boolean) => {
    const toExport = all ? subscribers : subscribers.filter((s) => selectedIds.includes(s.id));
    exportCSV(toExport, `${list?.name ?? 'subscribers'}.csv`);
  };

  const handleRemoveBounce = (email: string) => {
    removeBounce(email);
    refresh();
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (row: Subscriber) => (
        <div className="flex items-center gap-2">
          {bouncedEmails.has(row.email) ? (
            <span className="line-through text-gray-400 dark:text-gray-500">{row.email}</span>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white">{row.email}</span>
          )}
          {bouncedEmails.has(row.email) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
              <AlertCircle size={10} />
              bounced
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row: Subscriber) => <span className="text-gray-500 dark:text-gray-400">{row.name || '—'}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row: Subscriber) => {
        const tags = subscriberTags[row.id] ?? [];
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Added',
      sortable: true,
      render: (row: Subscriber) => <span className="text-gray-400 text-xs">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'bounce_action',
      header: '',
      render: (row: Subscriber) => bouncedEmails.has(row.email) ? (
        <button
          onClick={() => handleRemoveBounce(row.email)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Remove bounce
        </button>
      ) : null,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{list?.name}</h2>
            {list?.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{list.description}</p>}
            <p className="text-sm text-gray-400 mt-1">{subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleExport(false)}>
                <Download size={14} />
                Export Selected ({selectedIds.length})
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkRemove}>
                <Trash2 size={14} />
                Remove ({selectedIds.length})
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => handleExport(true)}>
            <Download size={14} />
            Export All
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
            <Plus size={14} />
            Add Subscribers
          </Button>
        </div>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter by tag:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
              }`}
            >
              {tag}
              {activeTag === tag && <X size={10} />}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscribers..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Note about removal */}
      <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <AlertCircle size={12} className="flex-shrink-0" />
        Removing from this list does not delete the subscriber globally. Manage all subscribers in the Subscribers page.
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <Table
          columns={columns}
          data={filtered}
          selectable
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(row) => setEditingSubscriber(row)}
          emptyMessage={search || activeTag ? 'No subscribers match your filter.' : 'No subscribers yet. Import some to get started.'}
        />
      </div>

      {/* Import History */}
      {importHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import History</h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Added</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Skipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {importHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{formatDateTime(h.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{h.source}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-medium">{h.added_count}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{h.skipped_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 z-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Remove from List</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Remove {selectedIds.length} subscriber{selectedIds.length !== 1 ? 's' : ''} from this list?
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              This only removes them from this list. Their global subscriber record is kept.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmRemove}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        listId={listId}
        onImported={refresh}
      />

      {editingSubscriber && (
        <SubscriberEditModal
          subscriber={editingSubscriber}
          allTags={allTags}
          allLists={allLists}
          onClose={() => setEditingSubscriber(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Search, Trash2, Download, Plus, Edit2, X, ChevronUp, ChevronDown, Check,
} from 'lucide-react';
import {
  getAllSubscribers, deleteSubscribers, updateSubscriber,
  getTagsForSubscriber, setTagsForSubscriber, getLists,
  getListsForSubscriber, addSubscriberToList, removeSubscriberFromList, getAllTags,
} from '../../db/database';
import type { Subscriber, List } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MultiSelect } from '../ui/MultiSelect';
import { ImportModal } from '../lists/ImportModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function exportSubscribersCSV(subscribers: Subscriber[], filename = 'subscribers.csv') {
  const header = 'email,name,tags,list_count,created_at';
  const rows = subscribers.map((s) =>
    `"${s.email}","${s.name}","${s.tags ?? ''}",${s.list_count ?? 0},"${s.created_at}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'email' | 'name' | 'tags' | 'list_count' | 'created_at';

// ── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  subscriber: Subscriber;
  allLists: List[];
  allTags: string[];
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ subscriber, allLists, allTags, onClose, onSaved }: EditModalProps) {
  const [email, setEmail] = useState(subscriber.email);
  const [name, setName] = useState(subscriber.name);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => getTagsForSubscriber(subscriber.id));
  const [memberListIds, setMemberListIds] = useState<number[]>(() =>
    getListsForSubscriber(subscriber.id).map((l) => l.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    setSaving(true);
    try {
      updateSubscriber(subscriber.id, email, name);
      setTagsForSubscriber(subscriber.id, selectedTags);
      const currentListIds = getListsForSubscriber(subscriber.id).map((l) => l.id);
      for (const listId of memberListIds) {
        if (!currentListIds.includes(listId)) addSubscriberToList(subscriber.id, listId);
      }
      for (const listId of currentListIds) {
        if (!memberListIds.includes(listId)) removeSubscriberFromList(subscriber.id, listId);
      }
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Modal isOpen title="Edit Subscriber" onClose={onClose} size="md">
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
          <MultiSelect
            options={allTags.map((t) => ({ id: t, label: t }))}
            selected={selectedTags}
            onChange={(s) => setSelectedTags(s as string[])}
            placeholder="Add tags..."
            allowCreate
          />
        </div>
        {allLists.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lists</label>
            <MultiSelect
              options={allLists.map((l) => ({ id: l.id, label: l.name }))}
              selected={memberListIds}
              onChange={(s) => setMemberListIds(s as number[])}
              placeholder="Add to lists..."
            />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── SubscribersPage ──────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [page, setPage] = useState(0);

  const refresh = () => {
    setSubscribers(getAllSubscribers());
    setAllLists(getLists());
    setAllTags(getAllTags());
    setSelectedIds([]);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setPage(0); }, [search]);

  const filtered = useMemo(() => {
    let result = subscribers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.email.toLowerCase().includes(q) || (s.name ?? '').toLowerCase().includes(q) || (s.tags ?? '').toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortKey === 'list_count') {
        const av = a.list_count ?? 0;
        const bv = b.list_count ?? 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [subscribers, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={13} className="text-gray-300 dark:text-gray-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-indigo-500" />
      : <ChevronDown size={13} className="text-indigo-500" />;
  };

  const allOnPageSelected = paginated.length > 0 && paginated.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginated.some((s) => s.id === id)));
    } else {
      const newIds = paginated.map((s) => s.id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newIds]);
    }
  };

  const confirmDelete = () => {
    deleteSubscribers(selectedIds);
    setDeleteConfirm(false);
    refresh();
  };

  const handleExport = (selected: boolean) => {
    exportSubscribersCSV(selected ? filtered.filter((s) => selectedIds.includes(s.id)) : filtered);
  };

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'tags', label: 'Tags' },
    { key: 'list_count', label: 'Lists' },
    { key: 'created_at', label: 'Date added' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Subscribers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} across all lists
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleExport(true)}>
                <Download size={14} />Export ({selectedIds.length})
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
                <Trash2 size={14} />Delete ({selectedIds.length})
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => handleExport(false)}>
            <Download size={14} />Export all
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
            <Plus size={14} />Add Subscribers
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, tag..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="w-10 px-4 py-3">
                  <div
                    onClick={toggleSelectAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                      allOnPageSelected
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    }`}
                  >
                    {allOnPageSelected && <Check size={10} className="text-white" />}
                  </div>
                </th>
                {sortColumns.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    {search ? 'No subscribers match your search.' : 'No subscribers yet.'}
                  </td>
                </tr>
              ) : (
                paginated.map((subscriber) => {
                  const isSelected = selectedIds.includes(subscriber.id);
                  const tags = subscriber.tags ? subscriber.tags.split(',').filter(Boolean) : [];
                  return (
                    <tr
                      key={subscriber.id}
                      className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div
                          onClick={() =>
                            setSelectedIds((prev) =>
                              isSelected ? prev.filter((x) => x !== subscriber.id) : [...prev, subscriber.id]
                            )
                          }
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{subscriber.email}</span>
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subscriber.name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Lists count */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {subscriber.list_count ?? 0}
                        </span>
                      </td>
                      {/* Date added */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(subscriber.created_at)}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingSubscriber(subscriber)}
                            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => { deleteSubscribers([subscriber.id]); refresh(); }}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <ImportModal isOpen listId={null} onClose={() => setShowImport(false)} onImported={refresh} />
      )}

      {editingSubscriber && (
        <EditModal
          subscriber={editingSubscriber}
          allLists={allLists}
          allTags={allTags}
          onClose={() => setEditingSubscriber(null)}
          onSaved={refresh}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 z-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Subscribers</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permanently delete {selectedIds.length} subscriber{selectedIds.length !== 1 ? 's' : ''}? This removes them from all lists. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

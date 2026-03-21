import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Trash2, Download, Plus, Edit2, X, ChevronUp, ChevronDown, Check, Tag, FolderPlus, MoreVertical,
} from 'lucide-react';
import {
  getAllSubscribers, deleteSubscribers, updateSubscriber,
  getTagsForSubscriber, setTagsForSubscriber, getLists,
  getListsForSubscriber, addSubscriberToList, removeSubscriberFromList, getAllTags,
  getCampaignSendsForSubscriber,
} from '../../db/database';
import type { Subscriber, List, CampaignSend } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MultiSelect } from '../ui/MultiSelect';
import { ImportModal } from '../lists/ImportModal';
import { useHotkey } from '../../hooks/useHotkey';

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
  onDeleted: () => void;
}

function EditModal({ subscriber, allLists, allTags, onClose, onSaved, onDeleted }: EditModalProps) {
  const [email, setEmail] = useState(subscriber.email);
  const [name, setName] = useState(subscriber.name);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => getTagsForSubscriber(subscriber.id));
  const [memberListIds, setMemberListIds] = useState<number[]>(() =>
    getListsForSubscriber(subscriber.id).map((l) => l.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sendHistory] = useState<CampaignSend[]>(() => getCampaignSendsForSubscriber(subscriber.id));

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

  const handleDelete = () => {
    deleteSubscribers([subscriber.id]);
    onDeleted();
    onClose();
  };

  return (
    <Modal isOpen title="Edit Subscriber" onClose={onClose} size="md">
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div>
          <label htmlFor="subscriber-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            id="subscriber-email" name="subscriber_email"
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="subscriber-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            id="subscriber-name" name="subscriber_name"
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
        {sendHistory.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Send History</label>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {sendHistory.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.status === 'sent' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{s.campaign_name ?? '(deleted campaign)'}</span>
                  <span className="text-gray-400 whitespace-nowrap">{new Date(s.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {confirmDelete ? (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Delete this subscriber permanently?</p>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2">
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />Delete
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        )}
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
  const [inlineDeleteId, setInlineDeleteId] = useState<number | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const openImport = useCallback(() => setShowImport(true), []);
  const focusSearch = useCallback(() => { searchRef.current?.focus(); searchRef.current?.select(); }, []);
  const noModal = !showImport && !editingSubscriber && !deleteConfirm;
  useHotkey('n', openImport, noModal);
  useHotkey('/', focusSearch, noModal);

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

  const handleBulkAddTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    for (const id of selectedIds) {
      const current = getTagsForSubscriber(id);
      if (!current.includes(t)) setTagsForSubscriber(id, [...current, t]);
    }
    setShowTagDropdown(false);
    setNewTagInput('');
    refresh();
  };

  const handleBulkAddToList = (listId: number) => {
    for (const id of selectedIds) {
      try { addSubscriberToList(id, listId); } catch { /* already a member */ }
    }
    setShowListDropdown(false);
    refresh();
  };

  const sortColumns: { key: SortKey; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'tags', label: 'Tags' },
    { key: 'list_count', label: 'Lists' },
    { key: 'created_at', label: 'Date added' },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subscribers</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Three-dot menu for export */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="More options"
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[180px]">
                  <button
                    onClick={() => { handleExport(false); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download size={14} />Export all
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      onClick={() => { handleExport(true); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Download size={14} />Export selected ({selectedIds.length})
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Plus button */}
          <button
            onClick={() => setShowImport(true)}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="Add Subscribers"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} across all lists
        </p>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Tag dropdown */}
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => { setShowTagDropdown((v) => !v); setShowListDropdown(false); }}>
                <Tag size={14} />Tag
              </Button>
              {showTagDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 w-64">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Add tag to {selectedIds.length} subscriber{selectedIds.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-1.5 mb-2.5">
                      <input
                        autoFocus
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBulkAddTag(newTagInput)}
                        placeholder="Tag name…"
                        className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Button size="sm" variant="primary" onClick={() => handleBulkAddTag(newTagInput)}>Apply</Button>
                    </div>
                    {allTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleBulkAddTag(tag)}
                            className="px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Add to list dropdown */}
            {allLists.length > 0 && (
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => { setShowListDropdown((v) => !v); setShowTagDropdown(false); }}>
                  <FolderPlus size={14} />Add to list
                </Button>
                {showListDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowListDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 w-52">
                      <p className="px-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Add to list</p>
                      {allLists.map((list) => (
                        <button
                          key={list.id}
                          onClick={() => handleBulkAddToList(list.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="truncate">{list.name}</span>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{list.contact_count ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 size={14} />Delete ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
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
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
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
                      onClick={() => setEditingSubscriber(subscriber)}
                      className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {inlineDeleteId === subscriber.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Delete?</span>
                            <button
                              onClick={() => setInlineDeleteId(null)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                            <button
                              onClick={() => { deleteSubscribers([subscriber.id]); setInlineDeleteId(null); refresh(); }}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Confirm delete"
                            >
                              <Check size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingSubscriber(subscriber)}
                              className="p-1.5 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setInlineDeleteId(subscriber.id)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
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
          onDeleted={refresh}
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

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, AtSign, Users, Search, X, Check, Plus } from 'lucide-react';
import {
  addSubscribers, addSubscribersToList, upsertSubscriber, addSubscriberToList,
  getAllSubscribers, getSubscribersForList, getLists, getAllTags,
  getTagsForSubscriber, setTagsForSubscriber,
} from '../../db/database';
import type { List } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MultiSelect } from '../ui/MultiSelect';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = Subscribers page (no default list) */
  listId?: number | null;
  onImported: () => void;
}

type ImportTab = 'single' | 'bulk' | 'file' | 'existing';

function parseEmailLine(line: string): { email: string; name: string } {
  line = line.trim();
  const match = line.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  const parts = line.split(',');
  if (parts.length >= 2) return { email: parts[0].trim(), name: parts[1].trim() };
  return { email: line, name: '' };
}

function parseCSV(text: string): Array<{ email: string; name: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const firstLine = lines[0]?.toLowerCase() ?? '';
  const startIndex = firstLine.includes('email') ? 1 : 0;
  const results: Array<{ email: string; name: string }> = [];
  for (let i = startIndex; i < lines.length; i++) {
    const parsed = parseEmailLine(lines[i]);
    if (parsed.email.includes('@')) results.push(parsed);
  }
  return results;
}

// ── Tags + Lists picker ───────────────────────────────────────────────────────

interface TagsListsPickerProps {
  allTags: string[];
  allLists: List[];
  selectedTags: string[];
  selectedListIds: number[];
  onTagsChange: (tags: string[]) => void;
  onListsChange: (ids: number[]) => void;
  primaryListId?: number | null;
  singleMode?: boolean;
}

function TagsListsPicker({
  allTags, allLists, selectedTags, selectedListIds,
  onTagsChange, onListsChange, primaryListId, singleMode,
}: TagsListsPickerProps) {
  const listOptions = allLists
    .filter((l) => primaryListId == null || l.id !== primaryListId)
    .map((l) => ({ id: l.id, label: l.name }));

  return (
    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          {singleMode ? 'Apply tags' : 'Apply tags to all'}
        </label>
        <MultiSelect
          options={allTags.map((t) => ({ id: t, label: t }))}
          selected={selectedTags}
          onChange={(s) => onTagsChange(s as string[])}
          placeholder="Type to find or create tags…"
          allowCreate
        />
      </div>
      {listOptions.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            {primaryListId != null ? 'Also add to lists' : 'Add to lists'}
          </label>
          <MultiSelect
            options={listOptions}
            selected={selectedListIds}
            onChange={(s) => onListsChange(s as number[])}
            placeholder="Select lists…"
          />
        </div>
      )}
    </div>
  );
}

// ── Existing subscribers picker ───────────────────────────────────────────────

interface ExistingPickerProps {
  listId: number;
  allTags: string[];
  onImported: () => void;
  onClose: () => void;
}

function ExistingPicker({ listId, allTags, onImported, onClose }: ExistingPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number } | null>(null);

  const alreadyInList = useMemo(
    () => new Set(getSubscribersForList(listId).map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const candidates = useMemo(() => {
    const all = getAllSubscribers().filter((s) => !alreadyInList.has(s.id));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (s) => s.email.toLowerCase().includes(q) || (s.name ?? '').toLowerCase().includes(q)
    );
  }, [search, alreadyInList]);

  const allSelected = candidates.length > 0 && candidates.every((s) => selectedIds.includes(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !candidates.some((s) => s.id === id)));
    } else {
      const toAdd = candidates.map((s) => s.id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...toAdd]);
    }
  };

  const handleImport = () => {
    if (!selectedIds.length) return;
    setImporting(true);
    const r = addSubscribersToList(selectedIds, listId, selectedTags);
    setResult(r);
    onImported();
    setTimeout(() => onClose(), 2000);
    setImporting(false);
  };

  if (result) {
    return (
      <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-700 dark:text-green-400">
          <strong>{result.added}</strong> subscriber{result.added !== 1 ? 's' : ''} added to list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subscribers…"
          className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {search ? 'No matching subscribers.' : 'All subscribers are already in this list.'}
        </p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
          <div
            onClick={toggleAll}
            className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
              {allSelected && <Check size={10} className="text-white" />}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {allSelected ? 'Deselect all' : `Select all (${candidates.length})`}
            </span>
            {selectedIds.length > 0 && (
              <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-medium">{selectedIds.length} selected</span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {candidates.map((s) => {
              const sel = selectedIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedIds((prev) => sel ? prev.filter((id) => id !== s.id) : [...prev, s.id])}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${sel ? 'bg-indigo-50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                    {sel && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.email}</p>
                    {s.name && <p className="text-xs text-gray-400 truncate">{s.name}</p>}
                  </div>
                  {s.tags && (
                    <div className="ml-auto flex gap-1 flex-shrink-0">
                      {s.tags.split(',').slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Apply tags to selected
          </label>
          <MultiSelect
            options={allTags.map((t) => ({ id: t, label: t }))}
            selected={selectedTags}
            onChange={(s) => setSelectedTags(s as string[])}
            placeholder="Add tags…"
            allowCreate
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={importing} disabled={selectedIds.length === 0} onClick={handleImport}>
          Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}Subscriber{selectedIds.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

// ── Contact preview list ──────────────────────────────────────────────────────

function ContactPreview({ contacts, onEdit }: { contacts: Array<{ email: string; name: string }>; onEdit: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready to import
        </p>
        <button onClick={onEdit} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
      </div>
      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
        {contacts.slice(0, 50).map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className="text-gray-900 dark:text-white font-medium">{c.email}</span>
            {c.name && <span className="text-gray-400 text-xs">{c.name}</span>}
          </div>
        ))}
        {contacts.length > 50 && (
          <div className="px-3 py-2 text-sm text-gray-400 text-center">+{contacts.length - 50} more…</div>
        )}
      </div>
    </div>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────

export function ImportModal({ isOpen, onClose, listId, onImported }: ImportModalProps) {
  const [tab, setTab] = useState<ImportTab>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Array<{ email: string; name: string }> | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allLists, setAllLists] = useState<List[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAllTags(getAllTags());
      setAllLists(getLists());
    }
  }, [isOpen]);

  const reset = () => {
    setSingleEmail(''); setSingleName(''); setBulkText('');
    setPreview(null); setError(''); setImportResult(null);
    setSelectedTags([]); setSelectedListIds([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileRead = (text: string) => {
    const contacts = parseCSV(text);
    if (!contacts.length) { setError('No valid email addresses found in file.'); return; }
    setPreview(contacts);
    setError('');
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    handleFileRead(await file.text());
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileRead(await file.text());
    e.target.value = '';
  };

  const handleBulkPreview = () => {
    const contacts = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.includes('@'))
      .map(parseEmailLine);
    if (!contacts.length) { setError('No valid email addresses found.'); return; }
    setPreview(contacts);
    setError('');
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      if (tab === 'single') {
        if (!singleEmail.includes('@')) { setError('Please enter a valid email address.'); setImporting(false); return; }
        const subscriberId = upsertSubscriber(singleEmail, singleName);
        const allListIds = [...(listId != null ? [listId] : []), ...selectedListIds];
        for (const lid of allListIds) addSubscriberToList(subscriberId, lid);
        if (selectedTags.length > 0) {
          const existing = getTagsForSubscriber(subscriberId);
          setTagsForSubscriber(subscriberId, [...new Set([...existing, ...selectedTags])]);
        }
        setImportResult({ added: 1, skipped: 0 });
        onImported();
        setTimeout(handleClose, 2000);
      } else if (preview) {
        const source = tab === 'file' ? 'file' : 'bulk';
        const result = addSubscribers(listId ?? null, preview, source, selectedTags, selectedListIds);
        setImportResult(result);
        onImported();
        setTimeout(handleClose, 2500);
      }
    } finally {
      setImporting(false);
    }
  };

  const showExistingTab = listId != null;

  const tabs: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'single', label: 'Single', icon: <AtSign size={14} /> },
    { id: 'bulk', label: 'Bulk text', icon: <FileText size={14} /> },
    { id: 'file', label: 'File', icon: <Upload size={14} /> },
    ...(showExistingTab ? [{ id: 'existing' as ImportTab, label: 'From existing', icon: <Users size={14} /> }] : []),
  ];

  const canImport =
    (tab === 'single' && singleEmail.includes('@')) ||
    ((tab === 'bulk' || tab === 'file') && preview != null);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Subscribers" size="lg">
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); reset(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Success result */}
        {importResult && (
          <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>{importResult.added}</strong> added, <strong>{importResult.skipped}</strong> skipped (already exist or bounced)
            </p>
          </div>
        )}

        {/* ── Existing tab ── */}
        {tab === 'existing' && listId != null && !importResult && (
          <ExistingPicker listId={listId} allTags={allTags} onImported={onImported} onClose={handleClose} />
        )}

        {/* ── Single tab ── */}
        {tab === 'single' && !importResult && (
          <div className="space-y-3">
            <div>
              <label htmlFor="import-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
              <input
                id="import-email" name="import_email"
                type="email"
                value={singleEmail}
                onChange={(e) => { setSingleEmail(e.target.value); setError(''); }}
                placeholder="contact@example.com"
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="import-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <input
                id="import-name" name="import_name"
                type="text"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <TagsListsPicker
              allTags={allTags} allLists={allLists}
              selectedTags={selectedTags} selectedListIds={selectedListIds}
              onTagsChange={setSelectedTags} onListsChange={setSelectedListIds}
              primaryListId={listId}
              singleMode
            />
          </div>
        )}

        {/* ── Bulk tab ── */}
        {tab === 'bulk' && !importResult && (
          <div className="space-y-3">
            {!preview ? (
              <>
                <div>
                  <label htmlFor="bulk-email-addresses" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email addresses
                    <span className="text-gray-400 font-normal ml-2 text-xs">one per line — "Name &lt;email&gt;" or "email, name"</span>
                  </label>
                  <textarea
                    id="bulk-email-addresses" name="bulk_email_addresses"
                    value={bulkText}
                    onChange={(e) => { setBulkText(e.target.value); setError(''); }}
                    placeholder={'contact@example.com\nJohn Doe <john@example.com>\njane@example.com, Jane Smith'}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <TagsListsPicker
                  allTags={allTags} allLists={allLists}
                  selectedTags={selectedTags} selectedListIds={selectedListIds}
                  onTagsChange={setSelectedTags} onListsChange={setSelectedListIds}
                  primaryListId={listId}
                />
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={handleBulkPreview} disabled={!bulkText.trim()}>
                    Preview contacts
                  </Button>
                </div>
              </>
            ) : (
              <ContactPreview contacts={preview} onEdit={() => setPreview(null)} />
            )}
          </div>
        )}

        {/* ── File tab ── */}
        {tab === 'file' && !importResult && (
          <div className="space-y-3">
            {!preview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop a CSV or text file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileSelect} />
              </div>
            ) : (
              <>
                <ContactPreview contacts={preview} onEdit={() => setPreview(null)} />
                <TagsListsPicker
                  allTags={allTags} allLists={allLists}
                  selectedTags={selectedTags} selectedListIds={selectedListIds}
                  onTagsChange={setSelectedTags} onListsChange={setSelectedListIds}
                  primaryListId={listId}
                />
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Footer buttons — all tabs except 'existing' */}
        {tab !== 'existing' && !importResult && (
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" loading={importing} disabled={!canImport} onClick={handleImport}>
              <Plus size={14} />
              {tab === 'single' ? 'Add subscriber' : `Import ${preview ? `${preview.length} ` : ''}contact${preview?.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Copy, Trash2, Edit2, Search, X, Download, Upload, BookOpen, MoreVertical } from 'lucide-react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } from '../../db/database';
import type { EmailTemplate } from '../../types';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { useHotkey } from '../../hooks/useHotkey';

type SortKey = 'name' | 'subject' | 'created_at';

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Editor (full-screen) ──────────────────────────────────────────────────────

interface EditorProps {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

function TemplateEditor({ template, onClose, onSaved }: EditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mobileTab, setMobileTab] = useState<'details' | 'body'>('details');

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!subject.trim()) errs.subject = 'Subject is required';
    if (!body.trim()) errs.body = 'Body is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (template) {
      updateTemplate(template.id, { name: name.trim(), description: description.trim(), subject: subject.trim(), body, is_builtin: 0 });
    } else {
      createTemplate({ name: name.trim(), description: description.trim(), subject: subject.trim(), body, is_builtin: 0 });
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {template ? 'Edit Template' : 'New Template'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save<span className="hidden sm:inline"> Template</span>
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden flex flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['details', 'body'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              mobileTab === tab
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'details' ? 'Details' : 'Body'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: metadata */}
        <div className={`flex-col border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto sm:flex sm:w-80 sm:flex-shrink-0 sm:border-r ${mobileTab === 'details' ? 'flex flex-1' : 'hidden'}`}>
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label htmlFor="template-name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Template Name *</label>
              <input
                id="template-name" name="template_name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="e.g. Monthly Newsletter"
                autoFocus
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="template-description" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
              <textarea
                id="template-description" name="template_description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div>
              <label htmlFor="template-subject" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Default Subject *</label>
              <input
                id="template-subject" name="template_subject"
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: '' })); }}
                placeholder="Email subject line..."
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.subject ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                Use tokens like{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono">{'{{name}}'}</code>,{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono">{'{{first_name}}'}</code>, or{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono">{'{{email}}'}</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Right: body */}
        <div className={`flex-col overflow-hidden sm:flex sm:flex-1 ${mobileTab === 'body' ? 'flex flex-1' : 'hidden'}`}>
          <div className="flex-shrink-0 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Email Body (Markdown)</p>
          </div>
          {errors.body && (
            <div className="px-6 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
              <p className="text-xs text-red-500">{errors.body}</p>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: '' })); }}
            className="flex-1 w-full px-6 py-4 text-sm font-mono focus:outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none leading-relaxed"
            placeholder="Write your email content here in Markdown..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

// ── TemplatesPage ─────────────────────────────────────────────────────────────

interface TemplatesPageProps {
  onUseTemplate?: (template: EmailTemplate) => void;
}

export function TemplatesPage({ onUseTemplate }: TemplatesPageProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [editorTemplate, setEditorTemplate] = useState<EmailTemplate | null | 'new'>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EmailTemplate | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => setTemplates(getTemplates());
  useEffect(() => { refresh(); }, []);

  useHotkey('n', () => setEditorTemplate('new'), !editorTemplate && !deleteConfirm);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key as SortKey); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let result = [...templates];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [templates, search, sortKey, sortDir]);

  const handleDuplicate = (t: EmailTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateTemplate(t.id);
    refresh();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteTemplate(deleteConfirm.id);
    setDeleteConfirm(null);
    setSelectedIds((ids) => ids.filter((id) => id !== deleteConfirm.id));
    refresh();
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteTemplate(id));
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
    refresh();
  };

  const handleExport = () => {
    const toExport = selectedIds.length > 0
      ? templates.filter((t) => selectedIds.includes(t.id))
      : templates;
    const data = toExport.map(({ name, description, subject, body }) => ({ name, description, subject, body }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item.name && item.body) {
            createTemplate({ name: item.name, description: item.description ?? '', subject: item.subject ?? '', body: item.body, is_builtin: 0 });
          }
        }
        refresh();
      } catch {
        alert('Failed to import: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const columns: import('../ui/Table').Column<EmailTemplate>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (t) => (
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
          {t.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">{t.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (t) => <span className="text-sm text-gray-600 dark:text-gray-300 truncate block max-w-xs">{t.subject || '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (t) => <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (t) => (
        <div className="flex items-center gap-1 justify-end">
          {onUseTemplate && (
            <button
              onClick={(e) => { e.stopPropagation(); onUseTemplate(t); }}
              className="p-1.5 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              title="Use in campaign"
            >
              <BookOpen size={14} />
            </button>
          )}
          <button
            onClick={(e) => handleDuplicate(t, e)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditorTemplate(t); }}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t); }}
            className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const selectedDeletable = selectedIds;

  if (editorTemplate !== null) {
    return (
      <TemplateEditor
        template={editorTemplate === 'new' ? null : editorTemplate}
        onClose={() => setEditorTemplate(null)}
        onSaved={() => { refresh(); setEditorTemplate(null); }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Three-dot: import / export */}
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
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => { importRef.current?.click(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Upload size={14} />Import JSON
                  </button>
                  <button
                    onClick={() => { handleExport(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download size={14} />{selectedIds.length > 0 ? `Export (${selectedIds.length})` : 'Export all'}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Plus button */}
          <button
            onClick={() => setEditorTemplate('new')}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="New Template"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        {selectedDeletable.length > 0 && (
          <Button variant="danger" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 size={13} />Delete ({selectedDeletable.length})
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
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
          onRowClick={(t) => setPreviewTemplate(t)}
          emptyMessage={
            search
              ? 'No templates match your search.'
              : 'No templates yet. Create one or import from JSON.'
          }
        />
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={previewTemplate?.name ?? ''} size="lg">
        {previewTemplate && (
          <div className="space-y-4">
            {previewTemplate.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{previewTemplate.description}</p>
            )}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 font-mono">{previewTemplate.subject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Body Preview</p>
              <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 max-h-72 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                {previewTemplate.body}
              </pre>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewTemplate(null)}>Close</Button>
              <Button variant="secondary" size="sm" onClick={() => { setEditorTemplate(previewTemplate); setPreviewTemplate(null); }}>
                <Edit2 size={13} />Edit
              </Button>
              {onUseTemplate && (
                <Button variant="primary" size="sm" onClick={() => { onUseTemplate(previewTemplate); setPreviewTemplate(null); }}>
                  <BookOpen size={13} />Use in Campaign
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Template" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk delete confirmation */}
      <Modal isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title="Delete Templates" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delete {selectedDeletable.length} template{selectedDeletable.length !== 1 ? 's' : ''}? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>Delete All</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Copy, Trash2, Plus, Star, Search, X, Download, Upload, MoreVertical, SlidersHorizontal } from 'lucide-react';
import { Marked } from 'marked';
import { getThemes, createTheme, updateTheme, deleteTheme, setDefaultTheme } from '../../db/database';
import type { EmailTheme } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const marked = new Marked({ gfm: true, breaks: true });

const SAMPLE_MARKDOWN = `# Hello from Lister! 👋

Welcome to this **beautiful email**. This preview shows how your theme will look with real content.

## What's inside

Here's a quick summary of the key points in this newsletter:

- Clean and professional layout
- Excellent typography and spacing
- Works great on all devices

> "Great design is invisible — it just feels right."

---

Thanks for reading. See you next week!`;

const STARTER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{subject}}</title>
<style>
  /* ── Reset ─────────────────────────────────── */
  *,*::before,*::after { box-sizing: border-box; }

  /* ── Base ──────────────────────────────────── */
  body {
    margin: 0;
    padding: 0;
    background: #f9fafb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #374151;
    font-size: 15px;
    line-height: 1.7;
  }

  /* ── Layout ────────────────────────────────── */
  .outer { padding: 40px 16px; }
  .card {
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .body { padding: 40px 48px; }

  /* ── Typography ────────────────────────────── */
  p  { margin: 0 0 16px; }
  h1 { font-size: 1.875em; font-weight: 700; margin: 0 0 16px; color: #111827; line-height: 1.25; }
  h2 { font-size: 1.375em; font-weight: 700; margin: 28px 0 12px; color: #111827; }
  h3 { font-size: 1.1em;   font-weight: 600; margin: 20px 0 8px;  color: #111827; }
  ul, ol { margin: 0 0 16px; padding-left: 28px; }
  li { margin: 4px 0; }
  blockquote {
    margin: 0 0 16px;
    padding: 12px 20px;
    border-left: 4px solid #e5e7eb;
    color: #6b7280;
    font-style: italic;
  }
  blockquote p { margin: 0; }
  pre {
    margin: 0 0 16px;
    padding: 16px;
    background: #f3f4f6;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.6;
  }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.875em;
    font-family: 'SFMono-Regular', Consolas, monospace;
  }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  a  { color: #4f46e5; text-decoration: underline; }
  img { max-width: 100%; height: auto; display: block; margin: 0 0 16px; }

  /* ── Footer ────────────────────────────────── */
  .footer {
    padding: 20px 48px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 12px;
    color: #9ca3af;
  }
</style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="body">
        {{content}}
      </div>
      <div class="footer">
        You received this because you subscribed to our newsletter.
      </div>
    </div>
  </div>
</body>
</html>`;

function renderPreview(templateHtml: string): string {
  const sampleHtml = marked.parse(SAMPLE_MARKDOWN) as string;
  return templateHtml
    .replace(/\{\{content\}\}/g, sampleHtml)
    .replace(/\{\{subject\}\}/g, 'Your Weekly Update');
}

function exportTheme(theme: EmailTheme) {
  const blob = new Blob([theme.template_html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${theme.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── ThemeEditorModal ─────────────────────────────────────────────────────────

interface ThemeEditorModalProps {
  theme: EmailTheme | null;
  onClose: () => void;
  onSaved: (id: number) => void;
  onSetDefault?: () => void;
  onDelete?: () => void;
  initialName?: string;
  initialHtml?: string;
}

function ThemeEditorModal({ theme, onClose, onSaved, onSetDefault, onDelete, initialName, initialHtml }: ThemeEditorModalProps) {
  const [name, setName] = useState(theme?.name ?? initialName ?? '');
  const [description, setDescription] = useState(theme?.description ?? '');
  const [html, setHtml] = useState(theme?.template_html ?? initialHtml ?? STARTER_TEMPLATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [mobileTab, setMobileTab] = useState<'code' | 'preview'>('code');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDefault = theme?.is_default === 1;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreviewHtml(renderPreview(html)), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [html]);

  useEffect(() => { setPreviewHtml(renderPreview(html)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!html.includes('{{content}}')) errs.html = 'Template must include {{content}}';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    let id: number;
    if (theme) {
      updateTheme(theme.id, {
        name: name.trim(),
        description: description.trim(),
        template_html: html,
        is_default: theme.is_default,
        is_builtin: 0,
      });
      id = theme.id;
    } else {
      id = createTheme({
        name: name.trim(),
        description: description.trim(),
        template_html: html,
        is_default: 0,
        is_builtin: 0,
      });
    }
    onSaved(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {theme ? 'Edit Theme' : 'New Theme'}
        </h2>
        <div className="flex items-center gap-2">
          {/* Desktop: full action buttons */}
          {theme && (
            <button
              onClick={() => exportTheme({ ...theme, name, template_html: html })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Export theme as HTML file"
            >
              <Download size={13} />Export
            </button>
          )}
          {theme && onSetDefault && (
            <button
              onClick={onSetDefault}
              disabled={isDefault}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDefault
                  ? 'text-indigo-400 dark:text-indigo-500 cursor-default'
                  : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }`}
              title={isDefault ? 'Already the default theme' : 'Set as default theme'}
            >
              <Star size={13} className={isDefault ? 'fill-current' : ''} />
              {isDefault ? 'Default' : 'Set default'}
            </button>
          )}
          {onDelete && (
            <>
              <button
                onClick={onDelete}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13} />Delete
              </button>
              <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-600" />
            </>
          )}
          <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-600" />

          {/* Mobile: three-dot menu for secondary actions */}
          {(theme) && (
            <div className="relative sm:hidden">
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              {showMobileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMobileMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[170px]">
                    {theme && (
                      <button
                        onClick={() => { exportTheme({ ...theme, name, template_html: html }); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Download size={14} />Export
                      </button>
                    )}
                    {theme && onSetDefault && (
                      <button
                        onClick={() => { onSetDefault(); setShowMobileMenu(false); }}
                        disabled={isDefault}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${isDefault ? 'text-indigo-400 cursor-default' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <Star size={14} className={isDefault ? 'fill-current' : ''} />
                        {isDefault ? 'Default' : 'Set default'}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save<span className="hidden sm:inline"> Theme</span>
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden flex flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['code', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              mobileTab === tab
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'code' ? 'Code' : 'Preview'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: fields + code */}
        <div className={`flex-col border-gray-200 dark:border-gray-700 overflow-hidden sm:flex sm:w-1/2 sm:border-r ${mobileTab === 'code' ? 'flex flex-1' : 'hidden'}`}>
          <div className="flex-shrink-0 px-4 sm:px-6 py-4 space-y-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div>
              <label htmlFor="theme-name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Theme Name</label>
              <input
                id="theme-name" name="theme_name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                placeholder="e.g. My Brand Theme"
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="theme-description" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
              <input
                id="theme-description" name="theme_description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this theme..."
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono">{'{{content}}'}</code> for the email body,{' '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded font-mono">{'{{subject}}'}</code> for the subject line.
            </p>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6 py-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex-shrink-0">HTML Template</label>
            {errors.html && <p className="text-xs text-red-500 mb-1">{errors.html}</p>}
            <textarea
              value={html}
              onChange={(e) => { setHtml(e.target.value); setErrors((p) => ({ ...p, html: '' })); }}
              className="flex-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right: live preview */}
        <div className={`flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 sm:flex sm:w-1/2 ${mobileTab === 'preview' ? 'flex flex-1' : 'hidden'}`}>
          <div className="flex-shrink-0 px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Live Preview</p>
          </div>
          <iframe
            srcDoc={previewHtml}
            className="flex-1 w-full border-none"
            sandbox="allow-same-origin"
            title="Theme preview"
          />
        </div>
      </div>
    </div>
  );
}

// ── ThemePreviewModal ─────────────────────────────────────────────────────────

interface ThemePreviewModalProps {
  theme: EmailTheme;
  onClose: () => void;
  onSetDefault: () => void;
  onDuplicateAndEdit: () => void;
  onDelete: () => void;
}

function ThemePreviewModal({ theme, onClose, onSetDefault, onDuplicateAndEdit, onDelete }: ThemePreviewModalProps) {
  const previewDoc = useMemo(() => renderPreview(theme.template_html), [theme.template_html]);
  const isDefault = theme.is_default === 1;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const header = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{theme.name}</h3>
          {isDefault && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
              <Check size={9} />Default
            </span>
          )}
          <span className="text-xs text-gray-400">Built-in</span>
        </div>
        {theme.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{theme.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
        <button
          onClick={onSetDefault}
          disabled={isDefault}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isDefault
              ? 'text-indigo-400 dark:text-indigo-500 cursor-default'
              : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
          }`}
        >
          <Star size={12} className={isDefault ? 'fill-current' : ''} />
          <span className="hidden sm:inline">{isDefault ? 'Default' : 'Set default'}</span>
        </button>
        <button
          onClick={onDuplicateAndEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Copy size={12} /><span className="hidden sm:inline">Duplicate &amp; </span>Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete theme"
        >
          <Trash2 size={12} /><span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Mobile: bottom sheet */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-10 flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out"
        style={{ height: '88dvh', transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex justify-center pt-2.5 pb-0.5 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 gap-2">
          {header}
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>
        <iframe
          srcDoc={previewDoc}
          className="flex-1 w-full border-none min-h-0"
          sandbox="allow-same-origin"
          title={`Full preview of ${theme.name}`}
        />
      </div>

      {/* Desktop: centered card */}
      <div className="hidden sm:flex fixed inset-0 items-center justify-center p-6">
        <div
          className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 w-full max-w-2xl max-h-[90vh] transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <div className="flex items-center px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 gap-2">
            {header}
            <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 ml-1">
              <X size={16} />
            </button>
          </div>
          <iframe
            srcDoc={previewDoc}
            className="flex-1 w-full border-none min-h-0"
            sandbox="allow-same-origin"
            title={`Full preview of ${theme.name}`}
            style={{ minHeight: '480px' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── ThemeCard ────────────────────────────────────────────────────────────────

interface ThemeCardProps {
  theme: EmailTheme;
  onClick: () => void;
  onSetDefault: () => void;
  onDuplicateAndEdit: () => void;
  onDelete: () => void;
}

function ThemeCard({ theme, onClick, onSetDefault, onDuplicateAndEdit, onDelete }: ThemeCardProps) {
  const previewDoc = useMemo(() => renderPreview(theme.template_html), [theme.template_html]);
  const isDefault = theme.is_default === 1;
  const isBuiltin = theme.is_builtin === 1;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border-2 overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px ${isDefault ? 'border-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
      onClick={onClick}
    >
      {/* Preview */}
      <div className="flex-shrink-0">
        <div className="overflow-hidden bg-gray-50 dark:bg-gray-900/50 relative" style={{ height: '160px' }}>
          <iframe
            srcDoc={previewDoc}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              marginLeft: '-300px',
              width: '600px',
              height: '700px',
              transform: 'scale(0.32)',
              transformOrigin: 'top center',
              border: 'none',
              pointerEvents: 'none',
            }}
            sandbox="allow-same-origin"
            title={`Preview of ${theme.name}`}
          />
          {isDefault && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white shadow-sm pointer-events-none">
              <Check size={8} />Default
            </div>
          )}
        </div>
      </div>

      {/* Info + Actions */}
      <div className="px-3 py-2.5 flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">{theme.name}</p>
          <span className={`text-xs ${isBuiltin ? 'text-gray-400 dark:text-gray-500' : 'text-purple-500 dark:text-purple-400'}`}>
            {isBuiltin ? 'Built-in' : 'Custom'}
          </span>
        </div>

        <div className="flex items-center gap-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onSetDefault}
            disabled={isDefault}
            title={isDefault ? 'Already default' : 'Set as default'}
            className={`p-1.5 rounded-lg transition-colors ${isDefault ? 'text-indigo-400 dark:text-indigo-500 cursor-default' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
          >
            <Star size={12} className={isDefault ? 'fill-current' : ''} />
          </button>

          <button
            onClick={onDuplicateAndEdit}
            title={isBuiltin ? 'Duplicate & Edit' : 'Duplicate'}
            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Copy size={12} />
          </button>

          <button
            onClick={onDelete}
            title="Delete theme"
            className="p-1.5 rounded-lg transition-colors text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ThemesPage ───────────────────────────────────────────────────────────────

type FilterType = 'all' | 'preset' | 'custom';

const filterTabs: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'preset', label: 'Presets' },
  { id: 'custom', label: 'Custom' },
];

export function ThemesPage() {
  const [themes, setThemes] = useState<EmailTheme[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editorTheme, setEditorTheme] = useState<EmailTheme | null | undefined>(undefined); // undefined = closed, null = new
  const [deleteTarget, setDeleteTarget] = useState<EmailTheme | null>(null);
  const [previewTarget, setPreviewTarget] = useState<EmailTheme | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const load = () => setThemes(getThemes());
  useEffect(() => { load(); }, []);

  const customCount = themes.filter((t) => t.is_builtin === 0).length;

  const filtered = useMemo(() => {
    let result = themes;
    if (filter === 'preset') result = result.filter((t) => t.is_builtin === 1);
    else if (filter === 'custom') result = result.filter((t) => t.is_builtin === 0);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [themes, filter, search]);

  const openEditor = (theme: EmailTheme | null) => {
    setEditorTheme(theme);
    setPreviewTarget(null);
  };

  const handleCardClick = (theme: EmailTheme) => {
    if (theme.is_builtin === 0) {
      openEditor(theme); // custom → edit directly
    } else {
      setPreviewTarget(theme); // preset → preview modal
    }
  };

  const handleDuplicateAndEdit = (theme: EmailTheme) => {
    const newId = createTheme({
      name: theme.name + ' (Copy)',
      description: theme.description,
      template_html: theme.template_html,
      is_default: 0,
      is_builtin: 0,
    });
    load();
    // Fetch the freshly-created theme and open editor
    const allThemes = getThemes();
    const newTheme = allThemes.find((t) => t.id === newId) ?? null;
    openEditor(newTheme);
  };

  const handleSetDefault = (theme: EmailTheme) => {
    setDefaultTheme(theme.id);
    load();
  };

  const handleSetDefaultFromEditor = (theme: EmailTheme) => {
    setDefaultTheme(theme.id);
    // Refresh the theme object inside the editor so the button updates
    setEditorTheme((prev) => prev ? { ...prev, is_default: 1 } : prev);
    load();
  };

  const handleEditorSaved = () => {
    setEditorTheme(undefined);
    load();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteTheme(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  // Import theme from HTML file
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,text/html';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const html = e.target?.result as string;
        const name = file.name.replace(/\.html?$/i, '').replace(/[_-]/g, ' ');
        // Pre-populate editor with imported content (as new theme)
        const draft: EmailTheme = {
          id: 0,
          name,
          description: '',
          template_html: html,
          is_default: 0,
          is_builtin: 0,
          created_at: '',
        };
        setEditorTheme(draft as EmailTheme & { _isImportDraft: true });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Themes</h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Three-dot: import */}
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
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                  <button
                    onClick={() => { handleImport(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Upload size={14} />Import theme
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Plus button */}
          <button
            onClick={() => openEditor(null)}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="New Theme"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{themes.length} theme{themes.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search + Filter row */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes..."
            className="w-full pl-8 pr-7 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowFilterMenu((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              filter !== 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="Filter"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">
              {filter === 'all' ? 'Filter' : filterTabs.find((t) => t.id === filter)?.label}
            </span>
          </button>
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setFilter(tab.id); setShowFilterMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      filter === tab.id
                        ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.id !== 'all' && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        {tab.id === 'preset' ? themes.filter((t) => t.is_builtin === 1).length : customCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">
            {search || filter !== 'all' ? 'No themes match your filters.' : 'No themes found. Try reopening your database to seed built-in themes.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onClick={() => handleCardClick(theme)}
              onSetDefault={() => handleSetDefault(theme)}
              onDuplicateAndEdit={() => handleDuplicateAndEdit(theme)}
              onDelete={() => setDeleteTarget(theme)}
            />
          ))}
        </div>
      )}

      {/* Preset preview modal */}
      {previewTarget && (
        <ThemePreviewModal
          theme={previewTarget}
          onClose={() => setPreviewTarget(null)}
          onSetDefault={() => { handleSetDefault(previewTarget); setPreviewTarget({ ...previewTarget, is_default: 1 }); }}
          onDuplicateAndEdit={() => handleDuplicateAndEdit(previewTarget)}
          onDelete={() => { setPreviewTarget(null); setDeleteTarget(previewTarget); }}
        />
      )}

      {/* Editor (new / edit / import draft) */}
      {editorTheme !== undefined && (
        <ThemeEditorModal
          theme={editorTheme?.id === 0 ? null : editorTheme}
          onClose={() => setEditorTheme(undefined)}
          onSaved={handleEditorSaved}
          onSetDefault={editorTheme && editorTheme.id !== 0 ? () => handleSetDefaultFromEditor(editorTheme) : undefined}
          onDelete={editorTheme && editorTheme.id !== 0 ? () => { setEditorTheme(undefined); setDeleteTarget(editorTheme); } : undefined}
          initialName={editorTheme?.id === 0 ? editorTheme.name : undefined}
          initialHtml={editorTheme?.id === 0 ? editorTheme.template_html : undefined}
        />
      )}

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Theme" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>Delete Theme</Button>
        </div>
      </Modal>
    </div>
  );
}

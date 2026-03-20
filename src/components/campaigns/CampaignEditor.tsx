import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Save, Send, Eye, EyeOff, FlaskConical, Users, Palette, Radio, FileText, AlertTriangle, BookOpen, BookmarkPlus, X, Check, AlignLeft, AlignCenter, AlignRight, ArrowDownUp, Link2, ImageIcon } from 'lucide-react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { Marked } from 'marked';
import { getCampaign, createCampaign, updateCampaign, getLists, getAllTags, getSenderProfiles, senderProfileToSmtp, getDefaultSenderProfile, getThemes, getDefaultTheme, getSubscribersForList, getTemplates, createTemplate } from '../../db/database';
import { useSettings } from '../../context/SettingsContext';
import type { List, SenderProfile, EmailTheme, EmailTemplate } from '../../types';
import { Button } from '../ui/Button';
import { SendProgressModal } from './SendProgressModal';
import { TestEmailModal } from './TestEmailModal';

interface CampaignEditorProps {
  campaignId: number | null;
  templateToLoad?: EmailTemplate | null;
  onTemplateLoaded?: () => void;
  onBack: () => void;
  onSaved: (id: number) => void;
}

const marked = new Marked({ gfm: true, breaks: true });

function markdownToHtml(md: string): string {
  return marked.parse(md) as string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PREVIEW_TOKENS: Record<string, string> = {
  '{{name}}': 'Jane Smith',
  '{{first_name}}': 'Jane',
  '{{email}}': 'jane@example.com',
  '{{unsubscribe_url}}': '#',
};

function applyPreviewTokens(text: string): string {
  return Object.entries(PREVIEW_TOKENS).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text
  );
}

function buildEmailHtml(subject: string, body: string, _senderName: string, preview = false, themeHtml?: string): string {
  const processedBody = preview ? applyPreviewTokens(body) : body;
  const content = markdownToHtml(processedBody) as string;

  if (themeHtml) {
    return themeHtml
      .replace(/\{\{content\}\}/g, content)
      .replace(/\{\{subject\}\}/g, subject);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
<style>
  body{margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#374151;font-size:15px;line-height:1.7}
  .wrap{max-width:600px;margin:0 auto;padding:40px 24px}
  p{margin:0 0 14px}
  h1{font-size:2em;font-weight:700;margin:0 0 12px;color:#111827;line-height:1.3}
  h2{font-size:1.5em;font-weight:700;margin:24px 0 10px;color:#111827;line-height:1.3}
  h3{font-size:1.2em;font-weight:600;margin:20px 0 8px;color:#111827}
  h4,h5,h6{font-size:1em;font-weight:600;margin:16px 0 6px;color:#111827}
  ul,ol{margin:0 0 14px;padding-left:24px}
  li{margin:2px 0}
  li p{margin:0}
  blockquote{margin:0 0 14px;padding:8px 16px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic}
  blockquote p{margin:0}
  pre{margin:0 0 14px;padding:14px 16px;background:#f3f4f6;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.6}
  code{background:#f3f4f6;padding:2px 5px;border-radius:3px;font-size:0.88em;color:#111827;font-family:monospace}
  pre code{background:none;padding:0;font-size:inherit}
  hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
  a{color:#4f46e5;text-decoration:underline}
  table{width:100%;border-collapse:collapse;margin:0 0 14px;font-size:14px}
  th{padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;text-align:left}
  td{padding:8px 12px;border:1px solid #e5e7eb}
  img{max-width:100%;height:auto;display:block;margin:0 0 14px}
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
</style>
</head>
<body>
  <div class="wrap">${content}</div>
</body>
</html>`;
}

// ── Send Confirmation Modal ───────────────────────────────────────────────────

interface SendConfirmModalProps {
  name: string;
  subject: string;
  list: List | null;
  profile: SenderProfile;
  theme: EmailTheme | null;
  tagFilter?: string;
  onConfirm: () => void;
  onClose: () => void;
}

function SendConfirmModal({ name, subject, list, profile, theme, tagFilter, onConfirm, onClose }: SendConfirmModalProps) {
  const subscriberCount = list ? getSubscribersForList(list.id).length : 0;
  const recipientCount = subscriberCount;

  const rows: { icon: React.ReactNode; label: string; value: string; warning?: boolean }[] = [
    { icon: <FileText size={14} />, label: 'Campaign', value: name || '(untitled)' },
    { icon: <FileText size={14} />, label: 'Subject', value: subject || '(no subject)' },
    { icon: <Users size={14} />, label: 'List', value: list ? `${list.name} · ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}${tagFilter ? ` (filtered by "${tagFilter}")` : ''}` : '—' },
    { icon: <Radio size={14} />, label: 'From', value: `${profile.sender_name ? profile.sender_name + ' · ' : ''}${profile.sender_email}` },
    { icon: <Palette size={14} />, label: 'Theme', value: theme ? theme.name : 'Plain (no theme)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <Send size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ready to send?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review before sending — this cannot be undone.</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {rows.map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="flex items-center gap-2 w-24 flex-shrink-0 pt-0.5">
                  <span className="text-gray-400">{icon}</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
                </div>
                <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{value}</span>
              </div>
            ))}
          </div>

          {recipientCount === 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="text-xs">This list has no subscribers. Nothing will be sent.</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={recipientCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            Send to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Custom MDEditor Commands ──────────────────────────────────────────────────

const alignLeftCmd = {
  name: 'alignLeft', keyCommand: 'alignLeft',
  buttonProps: { 'aria-label': 'Align left', title: 'Align left' },
  icon: <AlignLeft size={12} />,
  execute(state: { selectedText: string }, api: { replaceSelection: (t: string) => void }) {
    api.replaceSelection(`<div align="left">\n\n${state.selectedText || 'Your text'}\n\n</div>`);
  },
};

const alignCenterCmd = {
  name: 'alignCenter', keyCommand: 'alignCenter',
  buttonProps: { 'aria-label': 'Align center', title: 'Align center' },
  icon: <AlignCenter size={12} />,
  execute(state: { selectedText: string }, api: { replaceSelection: (t: string) => void }) {
    api.replaceSelection(`<div align="center">\n\n${state.selectedText || 'Your text'}\n\n</div>`);
  },
};

const alignRightCmd = {
  name: 'alignRight', keyCommand: 'alignRight',
  buttonProps: { 'aria-label': 'Align right', title: 'Align right' },
  icon: <AlignRight size={12} />,
  execute(state: { selectedText: string }, api: { replaceSelection: (t: string) => void }) {
    api.replaceSelection(`<div align="right">\n\n${state.selectedText || 'Your text'}\n\n</div>`);
  },
};

// ── Spacer Insert Modal ───────────────────────────────────────────────────────

const SPACER_PRESETS = [
  { label: 'XS', px: 8 },
  { label: 'S',  px: 16 },
  { label: 'M',  px: 24 },
  { label: 'L',  px: 40 },
  { label: 'XL', px: 64 },
];

interface SpacerInsertModalProps {
  onInsert: (md: string) => void;
  onClose: () => void;
}

function SpacerInsertModal({ onInsert, onClose }: SpacerInsertModalProps) {
  const [px, setPx] = useState(24);
  const matched = SPACER_PRESETS.find((p) => p.px === px);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs mx-4 z-10 overflow-hidden">
        <div className="px-6 pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownUp size={16} className="text-indigo-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Insert Spacer</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Height</label>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {SPACER_PRESETS.map((p) => (
                  <button
                    key={p.px} onClick={() => setPx(p.px)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${px === p.px ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >{p.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={4} max={200} value={px}
                  onChange={(e) => setPx(Math.min(200, Math.max(4, Number(e.target.value))))}
                  className="w-14 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">px</span>
              </div>
            </div>
            {matched && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{matched.label} — {px}px of vertical space</p>
            )}
          </div>

          {/* Visual preview */}
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Preview</div>
            <div className="bg-white dark:bg-gray-800 px-3">
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
              <div style={{ height: Math.min(px, 80) }} />
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button
            onClick={() => onInsert(`<div style="height: ${px}px;"></div>`)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >Insert Spacer</button>
        </div>
      </div>
    </div>
  );
}

function tokenCmd(token: string, label: string) {
  return {
    name: `token-${token}`,
    keyCommand: `token-${token}`,
    buttonProps: { 'aria-label': `Insert ${token}`, title: `Insert ${token}` },
    icon: (
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'monospace',
        letterSpacing: 0,
        background: 'rgba(99,102,241,0.12)',
        color: '#6366f1',
        borderRadius: 4,
        padding: '1px 4px',
        border: '1px solid rgba(99,102,241,0.25)',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    ),
    execute(_state: unknown, api: { replaceSelection: (t: string) => void }) {
      api.replaceSelection(token);
    },
  };
}

const tokenNameCmd      = tokenCmd('{{name}}',       'name');
const tokenFirstNameCmd = tokenCmd('{{first_name}}', 'first');
const tokenEmailCmd     = tokenCmd('{{email}}',      'email');

// ── Link Insert Modal ─────────────────────────────────────────────────────────

const LINK_COLORS = [
  { label: 'Blue',   hex: '#2563eb' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Green',  hex: '#16a34a' },
  { label: 'Red',    hex: '#dc2626' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Gray',   hex: '#6b7280' },
  { label: 'Black',  hex: '#111827' },
];

const DEFAULT_LINK_COLOR = '#2563eb';

interface LinkInsertModalProps {
  initialText: string;
  onInsert: (md: string) => void;
  onClose: () => void;
}

function LinkInsertModal({ initialText, onInsert, onClose }: LinkInsertModalProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl]   = useState('');
  const [color, setColor]       = useState(DEFAULT_LINK_COLOR);
  const [underline, setUnderline] = useState(true);

  const isDefault = color === DEFAULT_LINK_COLOR && underline;

  function handleInsert() {
    if (!url.trim()) return;
    const display = text.trim() || url;
    const md = isDefault
      ? `[${display}](${url})`
      : `<a href="${url}" style="color:${color};text-decoration:${underline ? 'underline' : 'none'};">${display}</a>`;
    onInsert(md);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 overflow-hidden">
        <div className="px-6 pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-indigo-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Insert Link</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">URL *</label>
              <input
                type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleInsert(); if (e.key === 'Escape') onClose(); }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Displayed Text</label>
              <input
                type="text" value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Leave empty to use URL"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {LINK_COLORS.map(({ label, hex }) => (
                  <button
                    key={hex} title={label} onClick={() => setColor(hex)}
                    className={`w-6 h-6 rounded-full transition-all ${color === hex ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <div className="relative w-6 h-6" title="Custom color">
                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                    <input
                      type="color" value={color} onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Underline</p>
              <button
                onClick={() => setUnderline(!underline)}
                className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${underline ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-150 ${underline ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {url && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Preview</p>
                <a href="#" onClick={(e) => e.preventDefault()}
                  style={{ color, textDecoration: underline ? 'underline' : 'none' }}
                  className="text-sm">{text || url}</a>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button
            onClick={handleInsert} disabled={!url.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >Insert Link</button>
        </div>
      </div>
    </div>
  );
}

// ── Image Insert Modal ────────────────────────────────────────────────────────

const IMAGE_WIDTH_PRESETS = ['25', '50', '75', '100'];

interface ImageInsertModalProps {
  onInsert: (md: string) => void;
  onClose: () => void;
}

function ImageInsertModal({ onInsert, onClose }: ImageInsertModalProps) {
  const [url, setUrl]       = useState('');
  const [alt, setAlt]       = useState('');
  const [align, setAlign]   = useState<'left' | 'center' | 'right'>('center');
  const [width, setWidth]   = useState('100');
  const [imgError, setImgError] = useState(false);

  function handleInsert() {
    if (!url.trim()) return;
    const style = `width:${width}%;height:auto;`;
    const img = `<img src="${url}" alt="${alt}"${align !== 'center' ? ` align="${align}"` : ''} style="${style}" />`;
    const md = align === 'center' ? `<div align="center">${img}</div>` : img;
    onInsert(md);
  }

  const ALIGNMENTS: { value: 'left' | 'center' | 'right'; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 overflow-hidden">
        <div className="px-6 pt-5 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Insert Image</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Image URL *</label>
              <input
                type="url" value={url} onChange={(e) => { setUrl(e.target.value); setImgError(false); }}
                placeholder="https://…" autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alt Text</label>
              <input
                type="text" value={alt} onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image…"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Alignment</label>
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {ALIGNMENTS.map(({ value, label }) => (
                  <button
                    key={value} onClick={() => setAlign(value)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${align === value ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Width</label>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {IMAGE_WIDTH_PRESETS.map((w) => (
                    <button
                      key={w} onClick={() => setWidth(w)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${width === w ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >{w}%</button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={1} max={100} value={width}
                    onChange={(e) => setWidth(String(Math.min(100, Math.max(1, Number(e.target.value)))))}
                    className="w-14 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
            </div>

            {url && !imgError && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Preview</p>
                <div style={{ textAlign: align }}>
                  <img
                    src={url} alt={alt}
                    style={{ width: `${width}%`, height: 'auto', display: 'inline-block' }}
                    onError={() => setImgError(true)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button
            onClick={handleInsert} disabled={!url.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >Insert Image</button>
        </div>
      </div>
    </div>
  );
}

export function CampaignEditor({ campaignId, templateToLoad, onTemplateLoaded, onBack, onSaved }: CampaignEditorProps) {
  const { settings } = useSettings();

  const [name, setName] = useState(() => {
    if (campaignId) return '';
    const now = new Date();
    return `Campaign – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('# Hello!\n\nWrite your email content here.\n\n---\n\nBest regards');
  const [listId, setListId] = useState<number | ''>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [lists, setLists] = useState<List[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<SenderProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | ''>('');
  const [themes, setThemes] = useState<EmailTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<number | ''>('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSpacerModal, setShowSpacerModal] = useState(false);
  const [linkInitText, setLinkInitText] = useState('');
  const [currentId, setCurrentId] = useState<number | null>(campaignId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pendingApiRef = useRef<{ replaceSelection: (t: string) => void } | null>(null);

  const customLinkCmd = useMemo(() => ({
    name: 'custom-link', keyCommand: 'custom-link',
    buttonProps: { 'aria-label': 'Add link', title: 'Add link' },
    icon: <Link2 size={12} />,
    execute(state: { selectedText: string }, api: { replaceSelection: (t: string) => void }) {
      pendingApiRef.current = api;
      setLinkInitText(state.selectedText || '');
      setShowLinkModal(true);
    },
  }), []);

  const customImageCmd = useMemo(() => ({
    name: 'custom-image', keyCommand: 'custom-image',
    buttonProps: { 'aria-label': 'Add image', title: 'Add image' },
    icon: <ImageIcon size={12} />,
    execute(_state: unknown, api: { replaceSelection: (t: string) => void }) {
      pendingApiRef.current = api;
      setShowImageModal(true);
    },
  }), []);

  const customSpacerCmd = useMemo(() => ({
    name: 'custom-spacer', keyCommand: 'custom-spacer',
    buttonProps: { 'aria-label': 'Add spacer', title: 'Add vertical space' },
    icon: <ArrowDownUp size={12} />,
    execute(_state: unknown, api: { replaceSelection: (t: string) => void }) {
      pendingApiRef.current = api;
      setShowSpacerModal(true);
    },
  }), []);

  useEffect(() => {
    setLists(getLists());
    setAvailableTags(getAllTags());
    const profiles = getSenderProfiles();
    setSenderProfiles(profiles);
    const def = getDefaultSenderProfile();
    if (def) setSelectedProfileId(def.id);
    const loadedThemes = getThemes();
    setThemes(loadedThemes);
    const defTheme = getDefaultTheme();
    if (defTheme) setSelectedThemeId(defTheme.id);
    if (campaignId) {
      const campaign = getCampaign(campaignId);
      if (campaign) {
        setName(campaign.name);
        setSubject(campaign.subject);
        setBody(campaign.body);
        setListId(campaign.list_id ?? '');
        setCurrentId(campaign.id);
        if (campaign.sender_profile_id) setSelectedProfileId(campaign.sender_profile_id);
        if (campaign.theme_id) setSelectedThemeId(campaign.theme_id);
      }
    }
  }, [campaignId]);

  // Apply a template when one is passed in from the Templates page
  useEffect(() => {
    if (templateToLoad) {
      setSubject(templateToLoad.subject);
      setBody(templateToLoad.body);
      onTemplateLoaded?.();
    }
  }, [templateToLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Campaign name is required';
    if (!subject.trim()) errs.subject = 'Subject is required';
    if (!body.trim()) errs.body = 'Email body is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDraft = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const profileId = selectedProfileId ? Number(selectedProfileId) : null;
      const themeId = selectedThemeId ? Number(selectedThemeId) : null;
      if (currentId) {
        updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft', profileId, themeId);
        onSaved(currentId);
      } else {
        const id = createCampaign(name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft', profileId, themeId);
        setCurrentId(id);
        onSaved(id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [name, subject, body, listId, selectedProfileId, selectedThemeId, currentId, onSaved]);

  const handleSend = useCallback(() => {
    if (!validate()) return;
    if (!listId) { setErrors((p) => ({ ...p, list: 'Select a list to send to' })); return; }
    if (!selectedProfileId) { setErrors((p) => ({ ...p, profile: 'Select a sender profile' })); return; }
    // Save first so the campaign exists before sending
    const profileId = selectedProfileId ? Number(selectedProfileId) : null;
    const themeId = selectedThemeId ? Number(selectedThemeId) : null;
    if (currentId) {
      updateCampaign(currentId, name.trim(), subject.trim(), body, Number(listId), 'draft', profileId, themeId);
    } else {
      const id = createCampaign(name.trim(), subject.trim(), body, Number(listId), 'draft', profileId, themeId);
      setCurrentId(id);
      onSaved(id);
    }
    if (settings.confirmBeforeSending) setShowConfirmModal(true);
    else setShowSendModal(true);
  }, [name, subject, body, listId, selectedProfileId, selectedThemeId, currentId, onSaved, settings.confirmBeforeSending]);

  const handleSendComplete = useCallback(() => {
    if (currentId) {
      const profileId = selectedProfileId ? Number(selectedProfileId) : null;
      const themeId = selectedThemeId ? Number(selectedThemeId) : null;
      updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'sent', profileId, themeId);
    }
  }, [currentId, name, subject, body, listId, selectedProfileId, selectedThemeId]);

  // Auto-save draft on change
  useEffect(() => {
    if (!name && !subject) return;
    const timer = setTimeout(() => {
      if (name.trim() && subject.trim() && body.trim()) {
        if (currentId) {
          const profileId = selectedProfileId ? Number(selectedProfileId) : null;
          const themeId = selectedThemeId ? Number(selectedThemeId) : null;
          updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft', profileId, themeId);
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [name, subject, body, listId, selectedProfileId, selectedThemeId, currentId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSaveDraft();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (listId) handleSend();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveDraft, handleSend, listId]);

  const selectedProfile = senderProfiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedSmtp = selectedProfile ? senderProfileToSmtp(selectedProfile) : null;
  const selectedTheme = themes.find((t) => t.id === selectedThemeId) ?? null;
  const htmlForSend = buildEmailHtml(subject, body, selectedProfile?.sender_name ?? '', false, selectedTheme?.template_html);


  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
              placeholder="Campaign name..."
              className={`text-base font-semibold bg-transparent border-none outline-none placeholder-gray-300 w-64 text-gray-900 dark:text-white ${errors.name ? 'text-red-500' : ''}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Saved</span>}
          <span className="text-xs text-gray-300 dark:text-gray-600 hidden sm:block">⌘S save · ⌘↵ send</span>
          <button
            onClick={() => setShowLoadTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Load a template"
          >
            <BookOpen size={14} />
            Template
          </button>
          <button
            onClick={() => setShowSaveTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Save as template"
          >
            <BookmarkPlus size={14} />
            Save as Template
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <Button variant="secondary" size="sm" loading={saving} onClick={handleSaveDraft}>
            <Save size={14} />
            Save Draft
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowTestModal(true)}>
            <FlaskConical size={14} />
            Test
          </Button>
          <Button variant="primary" size="sm" onClick={handleSend}>
            <Send size={14} />
            Send
          </Button>
        </div>
      </div>

      {/* Form + Editor */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex flex-col overflow-hidden ${showPreview ? 'w-1/2' : 'w-full'}`}>
          {/* Meta fields */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-3 space-y-2.5">
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {/* Subject */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: '' })); }}
                  placeholder="Email subject line…"
                  className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 ${errors.subject ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
              </div>

              {/* From */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">From</label>
                {senderProfiles.length === 0 ? (
                  <p className="text-xs text-amber-500 dark:text-amber-400 py-1.5">No sender profiles — add one in Sender Profiles.</p>
                ) : (
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select sender profile…</option>
                    {senderProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.sender_email ? ` — ${p.sender_email}` : ''}</option>
                    ))}
                  </select>
                )}
                {errors.profile && <p className="text-xs text-red-500">{errors.profile}</p>}
              </div>

              {/* List */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">List</label>
                <select
                  value={listId}
                  onChange={(e) => { setListId(e.target.value === '' ? '' : Number(e.target.value)); setErrors((p) => ({ ...p, list: '' })); setTagFilter(''); }}
                  className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.list ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
                >
                  <option value="">No list selected</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                {errors.list && <p className="text-xs text-red-500">{errors.list}</p>}
              </div>

              {/* Theme */}
              {themes.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Theme</label>
                  <select
                    value={selectedThemeId}
                    onChange={(e) => setSelectedThemeId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">No theme (plain)</option>
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}{t.is_default === 1 ? ' (default)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Segment — always full width */}
            {listId !== '' && availableTags.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Segment</label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All contacts (no segment filter)</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Tokens: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{name}}'}</code>{', '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{first_name}}'}</code>{', '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email}}'}</code>
            </p>
          </div>

          {/* MD Editor */}
          <div className="flex-1 overflow-hidden" data-color-mode={settings.editorTheme}>
            <MDEditor
              value={body}
              onChange={(val) => setBody(val ?? '')}
              height="100%"
              preview="edit"
              commands={[
                commands.bold, commands.italic, commands.strikethrough,
                commands.divider,
                commands.title1, commands.title2, commands.title3,
                commands.divider,
                customLinkCmd, commands.quote, commands.code, commands.codeBlock, customImageCmd,
                commands.divider,
                commands.unorderedListCommand, commands.orderedListCommand, commands.checkedListCommand,
                commands.divider,
                commands.hr,
                commands.divider,
                alignLeftCmd, alignCenterCmd, alignRightCmd,
                commands.divider,
                customSpacerCmd,
                commands.divider,
                tokenNameCmd, tokenFirstNameCmd, tokenEmailCmd,
              ]}
              extraCommands={[]}
              style={{ height: '100%', borderRadius: 0 }}
              visibleDragbar={false}
            />
          </div>
        </div>

        {/* Email Preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-100 dark:bg-gray-900">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400"><strong>From:</strong> {selectedProfile?.sender_name || '—'} &lt;{selectedProfile?.sender_email || 'no profile selected'}&gt;</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><strong>Subject:</strong> {subject || '(no subject)'}</p>
            </div>
            <iframe
              srcDoc={buildEmailHtml(subject || '(no subject)', body, selectedProfile?.sender_name ?? '', true, selectedTheme?.template_html)}
              className="flex-1 w-full border-none"
              sandbox="allow-same-origin"
              title="Email preview"
            />
          </div>
        )}
      </div>

      {showConfirmModal && listId && selectedProfile && (
        <SendConfirmModal
          name={name}
          subject={subject}
          list={lists.find((l) => l.id === Number(listId)) ?? null}
          profile={selectedProfile}
          theme={selectedTheme}
          tagFilter={tagFilter || undefined}
          onConfirm={() => { setShowConfirmModal(false); setShowSendModal(true); }}
          onClose={() => setShowConfirmModal(false)}
        />
      )}

      {showSendModal && listId && selectedSmtp && (
        <SendProgressModal
          campaignId={currentId}
          listId={Number(listId)}
          subject={subject}
          html={htmlForSend}
          text={body}
          smtp={selectedSmtp}
          rateLimit={selectedProfile?.rate_limit_ms ?? 0}
          onAllSent={handleSendComplete}
          onClose={() => { setShowSendModal(false); onBack(); }}
          tagFilter={tagFilter || undefined}
        />
      )}

      {showTestModal && selectedSmtp && (
        <TestEmailModal
          subject={subject}
          html={htmlForSend}
          text={body}
          smtp={selectedSmtp}
          defaultEmail={selectedProfile?.sender_email ?? ''}
          onClose={() => setShowTestModal(false)}
        />
      )}

      {showLoadTemplateModal && (
        <LoadTemplateModal
          onClose={() => setShowLoadTemplateModal(false)}
          onLoad={(t) => {
            setSubject(t.subject);
            setBody(t.body);
            setShowLoadTemplateModal(false);
          }}
        />
      )}

      {showSaveTemplateModal && (
        <SaveTemplateModal
          defaultName={name}
          subject={subject}
          body={body}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}

      {showLinkModal && (
        <LinkInsertModal
          initialText={linkInitText}
          onInsert={(md) => {
            pendingApiRef.current?.replaceSelection(md);
            setShowLinkModal(false);
          }}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {showImageModal && (
        <ImageInsertModal
          onInsert={(md) => {
            pendingApiRef.current?.replaceSelection(md);
            setShowImageModal(false);
          }}
          onClose={() => setShowImageModal(false)}
        />
      )}

      {showSpacerModal && (
        <SpacerInsertModal
          onInsert={(md) => {
            pendingApiRef.current?.replaceSelection(md);
            setShowSpacerModal(false);
          }}
          onClose={() => setShowSpacerModal(false)}
        />
      )}
    </div>
  );
}

// ── Load Template Modal ───────────────────────────────────────────────────────

interface LoadTemplateModalProps {
  onClose: () => void;
  onLoad: (template: EmailTemplate) => void;
}

function LoadTemplateModal({ onClose, onLoad }: LoadTemplateModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { setTemplates(getTemplates()); }, []);

  const filtered = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
    : templates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 z-10 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Load Template</h3>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              autoFocus
              className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Loading a template will replace the current subject and body.</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No templates found.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onLoad(t)}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                    {t.is_builtin === 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">Preset</span>
                    )}
                  </div>
                  {t.subject && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.subject}</p>}
                  {t.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{t.description}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Save Template Modal ───────────────────────────────────────────────────────

interface SaveTemplateModalProps {
  defaultName: string;
  subject: string;
  body: string;
  onClose: () => void;
}

function SaveTemplateModal({ defaultName, subject, body, onClose }: SaveTemplateModalProps) {
  const [name, setName] = useState(defaultName ? defaultName + ' Template' : '');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    createTemplate({ name: name.trim(), description: description.trim(), subject, body, is_builtin: 0 });
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 overflow-hidden">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Save as Template</h3>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
          {saved ? (
            <div className="flex items-center gap-2 py-3 text-green-600 dark:text-green-400">
              <Check size={16} />
              <span className="text-sm font-medium">Template saved!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="e.g. My Newsletter Template"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                  className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Saves the current subject and body as a reusable template.</p>
            </div>
          )}
        </div>
        {!saved && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Save Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

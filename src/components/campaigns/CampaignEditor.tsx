import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Send, Eye, EyeOff, FlaskConical } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Marked } from 'marked';
import { getCampaign, createCampaign, updateCampaign, getLists, getSettings, getAllTags } from '../../db/database';
import type { List, SmtpSettings } from '../../types';
import { Button } from '../ui/Button';
import { SendProgressModal } from './SendProgressModal';
import { TestEmailModal } from './TestEmailModal';

interface CampaignEditorProps {
  campaignId: number | null;
  onBack: () => void;
  onSaved: (id: number) => void;
}

const marked = new Marked({ gfm: true, breaks: true });

function markdownToHtml(md: string): string {
  return marked.parse(md) as string;
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

function buildEmailHtml(subject: string, body: string, _senderName: string, preview = false): string {
  const processedBody = preview ? applyPreviewTokens(body) : body;
  const content = markdownToHtml(processedBody);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
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
  input[type=checkbox]{margin-right:6px;vertical-align:middle}
</style>
</head>
<body>
  <div class="wrap">${content}</div>
</body>
</html>`;
}

export function CampaignEditor({ campaignId, onBack, onSaved }: CampaignEditorProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('# Hello!\n\nWrite your email content here.\n\n---\n\nBest regards');
  const [listId, setListId] = useState<number | ''>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [lists, setLists] = useState<List[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(campaignId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLists(getLists());
    setSettings(getSettings());
    setAvailableTags(getAllTags());
    if (campaignId) {
      const campaign = getCampaign(campaignId);
      if (campaign) {
        setName(campaign.name);
        setSubject(campaign.subject);
        setBody(campaign.body);
        setListId(campaign.list_id ?? '');
        setCurrentId(campaign.id);
      }
    }
  }, [campaignId]);

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
      if (currentId) {
        updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft');
        onSaved(currentId);
      } else {
        const id = createCampaign(name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft');
        setCurrentId(id);
        onSaved(id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [name, subject, body, listId, currentId, onSaved]);

  const handleSend = useCallback(() => {
    if (!validate()) return;
    if (!listId) { setErrors((p) => ({ ...p, list: 'Select a list to send to' })); return; }
    // Save first so the campaign exists before sending
    if (currentId) {
      updateCampaign(currentId, name.trim(), subject.trim(), body, Number(listId), 'draft');
    } else {
      const id = createCampaign(name.trim(), subject.trim(), body, Number(listId), 'draft');
      setCurrentId(id);
      onSaved(id);
    }
    setShowSendModal(true);
  }, [name, subject, body, listId, currentId, onSaved]);

  const handleSendComplete = useCallback(() => {
    if (currentId) {
      updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'sent');
    }
  }, [currentId, name, subject, body, listId]);

  // Auto-save draft on change
  useEffect(() => {
    if (!name && !subject) return;
    const timer = setTimeout(() => {
      if (name.trim() && subject.trim() && body.trim()) {
        if (currentId) {
          updateCampaign(currentId, name.trim(), subject.trim(), body, listId ? Number(listId) : null, 'draft');
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [name, subject, body, listId, currentId]);

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

  const htmlForSend = buildEmailHtml(subject, body, settings?.sender_name ?? '');

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
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 space-y-3">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: '' })); }}
                placeholder="Email subject line..."
                className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.subject ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">List</label>
              <select
                value={listId}
                onChange={(e) => { setListId(e.target.value === '' ? '' : Number(e.target.value)); setErrors((p) => ({ ...p, list: '' })); setTagFilter(''); }}
                className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.list ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">No list selected</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {errors.list && <p className="text-xs text-red-500 mt-0.5">{errors.list}</p>}
            </div>
            {listId !== '' && availableTags.length > 0 && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">Segment</label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All contacts (no segment filter)</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Personalization token hint */}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Available tokens: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{name}}'}</code>{', '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{first_name}}'}</code>{', '}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{email}}'}</code>
            </p>
          </div>

          {/* MD Editor */}
          <div className="flex-1 overflow-hidden" data-color-mode="light">
            <MDEditor
              value={body}
              onChange={(val) => setBody(val ?? '')}
              height="100%"
              preview="edit"
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
              <p className="text-xs text-gray-500 dark:text-gray-400"><strong>From:</strong> {settings?.sender_name} &lt;{settings?.sender_email}&gt;</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"><strong>Subject:</strong> {subject || '(no subject)'}</p>
            </div>
            <iframe
              srcDoc={buildEmailHtml(subject || '(no subject)', body, settings?.sender_name ?? '', true)}
              className="flex-1 w-full border-none"
              sandbox="allow-same-origin"
              title="Email preview"
            />
          </div>
        )}
      </div>

      {showSendModal && listId && (
        <SendProgressModal
          listId={Number(listId)}
          subject={subject}
          html={htmlForSend}
          text={body}
          onAllSent={handleSendComplete}
          onClose={() => { setShowSendModal(false); onBack(); }}
          tagFilter={tagFilter || undefined}
        />
      )}

      {showTestModal && (
        <TestEmailModal
          subject={subject}
          html={htmlForSend}
          text={body}
          defaultEmail={settings?.sender_email ?? ''}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}

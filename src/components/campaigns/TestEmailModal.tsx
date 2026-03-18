import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { getSettings } from '../../db/database';
import { Button } from '../ui/Button';

interface TestEmailModalProps {
  subject: string;
  html: string;
  text: string;
  defaultEmail: string;
  onClose: () => void;
}

const SAMPLE_CONTACT = { name: 'Test User', email: '', first_name: 'Test' };

function applyTokens(template: string, email: string): string {
  return template
    .replace(/\{\{name\}\}/g, SAMPLE_CONTACT.name)
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{\{first_name\}\}/g, SAMPLE_CONTACT.first_name);
}

export function TestEmailModal({ subject, html, text, defaultEmail, onClose }: TestEmailModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!email.includes('@')) return;
    setSending(true);
    setResult(null);
    try {
      const smtp = getSettings();
      const personalizedHtml = applyTokens(html, email);
      const personalizedText = applyTokens(text, email);
      const res = await fetch('http://localhost:3001/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp,
          to: email,
          toName: SAMPLE_CONTACT.name,
          subject: `[TEST] ${subject}`,
          html: personalizedHtml,
          text: personalizedText,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ ok: true, message: `Test email sent to ${email}` });
      } else {
        setResult({ ok: false, message: data.error ?? `HTTP ${res.status}` });
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Send Test Email</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sends a test email with sample values for personalization tokens (name = "Test User").
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Send to</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setResult(null); }}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>

          {result && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
              result.ok
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {result.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              loading={sending}
              onClick={handleSend}
              disabled={!email.includes('@')}
            >
              <FlaskConical size={14} />
              Send test
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { getSubscribersForList, getSubscribersWithTag, addBounce, recordCampaignSend, saveDatabase } from '../../db/database';
import type { Subscriber, SmtpSettings } from '../../types';

interface Recipient {
  contact: Subscriber;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}

interface SendProgressModalProps {
  campaignId: number | null;
  listId: number;
  subject: string;
  html: string;
  text: string;
  smtp: SmtpSettings;
  rateLimit: number;
  onClose: () => void;
  onAllSent: () => void;
  tagFilter?: string;
}

const BOUNCE_INDICATORS = ['550', 'user unknown', 'does not exist', 'invalid', 'rejected', 'no such user', 'mailbox not found'];

function isBounceError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return BOUNCE_INDICATORS.some((indicator) => lower.includes(indicator));
}

function applyTokens(template: string, contact: Subscriber): string {
  const firstName = contact.name ? contact.name.split(' ')[0] : '';
  return template
    .replace(/\{\{name\}\}/g, contact.name ?? '')
    .replace(/\{\{email\}\}/g, contact.email ?? '')
    .replace(/\{\{first_name\}\}/g, firstName);
}

async function sendOne(
  smtp: SmtpSettings,
  contact: Subscriber,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const base = '';
  const personalizedHtml = applyTokens(html, contact);
  const personalizedText = applyTokens(text, contact);
  let res: Response;
  try {
    res = await fetch(`${base}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp, to: contact.email, toName: contact.name, subject, html: personalizedHtml, text: personalizedText }),
    });
  } catch (e) {
    const msg = e instanceof TypeError
      ? `Cannot reach ${base} — check API URL in Settings or CORS headers on the server`
      : String(e);
    throw new Error(msg);
  }
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
}

export function SendProgressModal({ campaignId, listId, subject, html, text, smtp, rateLimit, onClose, onAllSent, tagFilter }: SendProgressModalProps) {
  const contacts = tagFilter
    ? getSubscribersWithTag(listId, tagFilter)
    : getSubscribersForList(listId);
  const [recipients, setRecipients] = useState<Recipient[]>(
    contacts.map((c) => ({ contact: c, status: 'pending' }))
  );
  const [done, setDone] = useState(false);
  const cancelRef = useRef(false);

  const sentCount = recipients.filter((r) => r.status === 'sent').length;
  const failedCount = recipients.filter((r) => r.status === 'failed').length;
  const progress = recipients.length > 0 ? ((sentCount + failedCount) / recipients.length) * 100 : 0;

  useEffect(() => {
    if (contacts.length === 0) return;
    cancelRef.current = false;

    const run = async () => {
      for (let i = 0; i < contacts.length; i++) {
        if (cancelRef.current) break;
        const contact = contacts[i];

        setRecipients((prev) =>
          prev.map((r) => r.contact.id === contact.id ? { ...r, status: 'sending' } : r)
        );

        try {
          await sendOne(smtp, contact, subject, html, text);
          recordCampaignSend(campaignId, contact.id, 'sent');
          setRecipients((prev) =>
            prev.map((r) => r.contact.id === contact.id ? { ...r, status: 'sent' } : r)
          );
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          // Auto-register bounce if error looks like a bounce
          if (isBounceError(errorMsg)) {
            addBounce(contact.email, errorMsg);
          }
          recordCampaignSend(campaignId, contact.id, 'failed', errorMsg);
          setRecipients((prev) =>
            prev.map((r) =>
              r.contact.id === contact.id
                ? { ...r, status: 'failed', error: errorMsg }
                : r
            )
          );
        }

        // Rate limiting between sends
        if (i < contacts.length - 1 && rateLimit > 0) {
          await new Promise((resolve) => setTimeout(resolve, rateLimit));
        }
      }

      saveDatabase();
      setDone(true);
      if (!cancelRef.current) onAllSent();
    };

    run();
    return () => { cancelRef.current = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {done ? 'Send complete' : 'Sending campaign…'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{subject}</p>
            {tagFilter && (
              <p className="text-xs text-indigo-500 mt-0.5">Segment: {tagFilter}</p>
            )}
          </div>
          {done && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={16} />
            </button>
          )}
        </div>

        <>
            {/* Progress bar */}
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{sentCount} sent · {failedCount} failed · {recipients.length - sentCount - failedCount} remaining</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: failedCount > 0 && done ? '#ef4444' : '#4f46e5',
                  }}
                />
              </div>
            </div>

            {/* Failed recipients only */}
            {(recipients.some(r => r.status === 'failed') || contacts.length === 0) && (
              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1 mt-1">
                {contacts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No contacts in the selected list{tagFilter ? ` with tag "${tagFilter}"` : ''}.</p>
                )}
                {recipients.filter(r => r.status === 'failed').map((r) => (
                  <div key={r.contact.id} className="flex items-start gap-2 py-1">
                    <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-sm text-red-500 truncate block">{r.contact.email}</span>
                      {r.error && <p className="text-xs text-red-400">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer summary */}
            {done && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle size={15} />
                    <span><strong>{sentCount}</strong> sent successfully</span>
                  </div>
                  {failedCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-red-500">
                      <XCircle size={15} />
                      <span><strong>{failedCount}</strong> failed</span>
                    </div>
                  )}
                  <button
                    onClick={onClose}
                    className="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
        </>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Server, User, Lock, Mail, CheckCircle, Zap, Wifi, Plus, Pencil, Trash2, Star } from 'lucide-react';
import {
  getSenderProfiles, createSenderProfile, updateSenderProfile, deleteSenderProfile,
  senderProfileToSmtp,
} from '../../db/database';
import type { SenderProfile } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

// ── Profile form modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  sender_name: '',
  sender_email: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_tls: 'true',
  is_default: 0,
  rate_limit_ms: 500,
};

type ProfileForm = typeof EMPTY_FORM;

interface ProfileModalProps {
  profile: SenderProfile | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProfileModal({ profile, onClose, onSaved }: ProfileModalProps) {
  const [form, setForm] = useState<ProfileForm>(
    profile
      ? {
          name: profile.name,
          sender_name: profile.sender_name,
          sender_email: profile.sender_email,
          smtp_host: profile.smtp_host,
          smtp_port: profile.smtp_port,
          smtp_username: profile.smtp_username,
          smtp_password: profile.smtp_password,
          smtp_tls: profile.smtp_tls,
          is_default: profile.is_default,
          rate_limit_ms: profile.rate_limit_ms ?? 500,
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const set = (key: keyof ProfileForm, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim()) { setError('Profile name is required.'); return; }
    if (profile) {
      updateSenderProfile(profile.id, form);
    } else {
      createSenderProfile(form);
    }
    onSaved();
    onClose();
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch('http://localhost:3001/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: senderProfileToSmtp({ ...form, id: 0, created_at: '' }) }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('ok');
        setTimeout(() => setTestStatus('idle'), 4000);
      } else {
        setTestStatus('error');
        setTestError(data.error ?? 'Connection failed');
      }
    } catch (e) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : 'Cannot reach relay server');
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

  return (
    <Modal isOpen onClose={onClose} title={profile ? 'Edit Sender Profile' : 'New Sender Profile'} size="lg">
      <div className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

        {/* Profile name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Profile name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => { set('name', e.target.value); setError(''); }}
            placeholder="e.g. Newsletter, Transactional"
            autoFocus
            className={inputClass}
          />
        </div>

        {/* Sender info */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sender Information</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From name</label>
              <input type="text" value={form.sender_name} onChange={(e) => set('sender_name', e.target.value)} placeholder="Acme Newsletter" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.sender_email} onChange={(e) => set('sender_email', e.target.value)} placeholder="newsletter@acme.com" className={`${inputClass} pl-9`} />
              </div>
            </div>
          </div>
        </div>

        {/* SMTP */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Server size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SMTP Configuration</span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Host</label>
                <input type="text" value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Port</label>
                <input type="number" value={form.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} placeholder="587" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                <input type="text" value={form.smtp_username} onChange={(e) => set('smtp_username', e.target.value)} placeholder="user@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={form.smtp_password} onChange={(e) => set('smtp_password', e.target.value)} placeholder="••••••••" className={`${inputClass} pl-9`} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.smtp_tls === 'true'}
                onClick={() => set('smtp_tls', form.smtp_tls === 'true' ? 'false' : 'true')}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.smtp_tls === 'true' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${form.smtp_tls === 'true' ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">Use TLS/STARTTLS</span>
            </div>
          </div>
        </div>

        {/* Rate limit */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Send Rate</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Delay between emails (ms)</label>
              <input
                type="number"
                value={form.rate_limit_ms}
                onChange={(e) => set('rate_limit_ms', Math.max(0, Number(e.target.value)))}
                min="0"
                step="100"
                className={inputClass}
              />
            </div>
            <div className="pt-6 text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {form.rate_limit_ms === 0 ? 'No delay' : `~${Math.round(1000 / Math.max(Number(form.rate_limit_ms), 1))}/sec`}
            </div>
          </div>
        </div>

        {/* Default toggle */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_default === 1}
            onClick={() => set('is_default', form.is_default === 1 ? 0 : 1)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${form.is_default === 1 ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${form.is_default === 1 ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Set as default profile</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleTest} loading={testStatus === 'testing'}>
              <Wifi size={13} />
              Test connection
            </Button>
            {testStatus === 'ok' && (
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><CheckCircle size={13} />Connected</span>
            )}
            {testStatus === 'error' && (
              <span className="text-sm text-red-500">{testError}</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{profile ? 'Save Changes' : 'Create Profile'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── SenderProfilesPage ────────────────────────────────────────────────────────

export function SettingsPage() {
  const [profiles, setProfiles] = useState<SenderProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<SenderProfile | null | undefined>(undefined);
  // undefined = modal closed, null = creating new, SenderProfile = editing
  const [deleteConfirm, setDeleteConfirm] = useState<SenderProfile | null>(null);

  const refresh = () => setProfiles(getSenderProfiles());
  useEffect(() => { refresh(); }, []);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteSenderProfile(deleteConfirm.id);
    setDeleteConfirm(null);
    refresh();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sender Profiles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your SMTP configurations and sending identities
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditingProfile(null)}>
          <Plus size={15} />
          New Profile
        </Button>
      </div>

      {/* Profiles table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-8">
        {profiles.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            No sender profiles yet. Create one to start sending campaigns.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profile</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SMTP Host</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Default</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 dark:text-gray-300">{p.sender_name || <span className="text-gray-300 dark:text-gray-600">—</span>}</div>
                    <div className="text-xs text-gray-400">{p.sender_email || <span className="text-gray-300 dark:text-gray-600">no email set</span>}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.smtp_host
                      ? <>{p.smtp_host}<span className="text-gray-300 dark:text-gray-600 ml-1">:{p.smtp_port}</span></>
                      : <span className="text-gray-300 dark:text-gray-600">not configured</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-sm">
                    {p.rate_limit_ms === 0 ? 'No delay' : `${p.rate_limit_ms}ms`}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_default === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <Star size={10} />
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingProfile(p)}
                        className="p-1.5 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                        disabled={profiles.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Profile modal */}
      {editingProfile !== undefined && (
        <ProfileModal
          profile={editingProfile}
          onClose={() => setEditingProfile(undefined)}
          onSaved={refresh}
        />
      )}

      {/* Delete confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Profile" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

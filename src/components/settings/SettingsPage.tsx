import { useState, useEffect, useMemo } from 'react';
import { Server, User, Lock, Mail, CheckCircle, Zap, Wifi, Plus, Pencil, Trash2, Star, Search, X, ExternalLink, KeyRound, ChevronUp, ChevronDown } from 'lucide-react';
import {
  getSenderProfiles, createSenderProfile, updateSenderProfile, deleteSenderProfile,
  senderProfileToSmtp,
} from '../../db/database';
import type { SenderProfile } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

// ── SMTP presets ──────────────────────────────────────────────────────────────

const SMTP_PRESETS = {
  gmail: {
    label: 'Gmail',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_tls: 'true',
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    guide: 'Use your Gmail address as the username. For the password, generate an App Password (requires 2-Step Verification to be enabled).',
  },
  outlook: {
    label: 'Outlook',
    smtp_host: 'smtp.office365.com',
    smtp_port: '587',
    smtp_tls: 'true',
    appPasswordUrl: 'https://account.microsoft.com/security',
    guide: 'Use your full Microsoft/Outlook address as the username. Generate an App Password in your Microsoft account security settings.',
  },
  icloud: {
    label: 'iCloud Mail',
    smtp_host: 'smtp.mail.me.com',
    smtp_port: '587',
    smtp_tls: 'true',
    appPasswordUrl: 'https://appleid.apple.com/account/manage',
    guide: 'Use your full iCloud email address (e.g. you@icloud.com). Generate an App-Specific Password in your Apple ID account settings.',
  },
  yahoo: {
    label: 'Yahoo Mail',
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: '587',
    smtp_tls: 'true',
    appPasswordUrl: 'https://login.yahoo.com/account/security',
    guide: 'Use your Yahoo email address as the username. Generate an App Password in your Yahoo account security settings.',
  },
  zoho: {
    label: 'Zoho Mail',
    smtp_host: 'smtp.zoho.com',
    smtp_port: '587',
    smtp_tls: 'true',
    appPasswordUrl: 'https://accounts.zoho.com/home#security/app-passwords',
    guide: 'Use your Zoho email address as the username. Generate an App-Specific Password in your Zoho account security settings.',
  },
} as const;

type PresetKey = keyof typeof SMTP_PRESETS;

const PROVIDER_DOMAINS: Record<PresetKey, string> = {
  gmail: 'google.com',
  outlook: 'outlook.live.com',
  icloud: 'apple.com',
  yahoo: 'yahoo.com',
  zoho: 'zoho.com',
};

// ── Provider quick-setup modal ────────────────────────────────────────────────

interface ProviderModalProps {
  provider: PresetKey;
  onClose: () => void;
  onSaved: () => void;
}

function ProviderModal({ provider, onClose, onSaved }: ProviderModalProps) {
  const preset = SMTP_PRESETS[provider];
  const [profileName, setProfileName] = useState<string>(preset.label);
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const buildSmtp = () => ({
    name: profileName.trim(),
    sender_name: senderName.trim(),
    sender_email: email.trim(),
    smtp_host: preset.smtp_host,
    smtp_port: preset.smtp_port,
    smtp_username: email.trim(),
    smtp_password: appPassword,
    smtp_tls: preset.smtp_tls,
    is_default: isDefault ? 1 : 0,
    rate_limit_ms: 0,
  });

  const handleTest = async () => {
    if (!email || !appPassword) { setError('Enter your email and app password first.'); return; }
    setTestStatus('testing'); setTestError('');
    try {
      const res = await fetch('http://localhost:3001/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: buildSmtp() }),
      });
      const data = await res.json();
      if (data.ok) { setTestStatus('ok'); setTimeout(() => setTestStatus('idle'), 4000); }
      else { setTestStatus('error'); setTestError(data.error ?? 'Connection failed'); }
    } catch (e) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : 'Cannot reach relay server');
    }
  };

  const handleSave = () => {
    if (!profileName.trim()) { setError('Profile name is required.'); return; }
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!appPassword.trim()) { setError('App password is required.'); return; }
    createSenderProfile(buildSmtp());
    onSaved();
    onClose();
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

  return (
    <Modal isOpen onClose={onClose} title={`Add ${preset.label} Account`} size="md">
      <div className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>}

        {/* App password guide */}
        <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
          <KeyRound size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">{preset.guide}</p>
            <a
              href={preset.appPasswordUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Generate App Password <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Email + App password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{preset.label} address</label>
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder={provider === 'gmail' ? 'you@gmail.com' : 'you@outlook.com'}
              autoFocus
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">App Password</label>
          <div className="relative">
            <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={appPassword}
              onChange={(e) => { setAppPassword(e.target.value); setError(''); }}
              placeholder="xxxx xxxx xxxx xxxx"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        {/* Sender name + profile name */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-gray-700 pt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From name</label>
            <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your Name" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Profile name</label>
            <input type="text" value={profileName} onChange={(e) => { setProfileName(e.target.value); setError(''); }} className={inputClass} />
          </div>
        </div>

        {/* Default toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isDefault}
            onClick={() => setIsDefault((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isDefault ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isDefault ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Set as default profile</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleTest} loading={testStatus === 'testing'}>
              <Wifi size={13} />Test connection
            </Button>
            {testStatus === 'ok' && <span className="flex items-center gap-1 text-sm text-green-600 font-medium"><CheckCircle size={13} />Connected</span>}
            {testStatus === 'error' && <span className="text-sm text-red-500">{testError}</span>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Add Account</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

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
  rate_limit_ms: 0,
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
          rate_limit_ms: profile.rate_limit_ms ?? 0,
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  const applyPreset = (key: PresetKey) => {
    const p = SMTP_PRESETS[key];
    setForm((f) => ({ ...f, smtp_host: p.smtp_host, smtp_port: p.smtp_port, smtp_tls: p.smtp_tls }));
    setActivePreset(key);
  };

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SMTP Configuration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Quick setup:</span>
              {(Object.keys(SMTP_PRESETS) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activePreset === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {SMTP_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* App Password guide */}
          {activePreset && (
            <div className="mb-3 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
              <div className="flex-1 text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                {SMTP_PRESETS[activePreset].guide}
              </div>
              <a
                href={SMTP_PRESETS[activePreset].appPasswordUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                App Passwords <ExternalLink size={11} />
              </a>
            </div>
          )}

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
  const [providerModal, setProviderModal] = useState<PresetKey | null>(null);
  const [providerDropdown, setProviderDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SenderProfile | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'sender_email' | 'smtp_host' | 'is_default'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const refresh = () => setProfiles(getSenderProfiles());
  useEffect(() => { refresh(); }, []);

  const handleSort = (key: 'name' | 'sender_email' | 'smtp_host' | 'is_default') => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let result = profiles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sender_email.toLowerCase().includes(q) ||
        p.smtp_host.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (sortKey === 'is_default') {
        const av = a.is_default ?? 0, bv = b.is_default ?? 0;
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const av = String(a[sortKey] ?? ''), bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [profiles, search, sortKey, sortDir]);

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
        <div className="flex items-center gap-2">
          {/* Email provider dropdown */}
          <div className="relative">
            <button
              onClick={() => setProviderDropdown((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Mail size={14} />
              Add email account
              <X size={12} className={`transition-transform duration-150 ${providerDropdown ? '' : 'rotate-45'} text-gray-400`} />
            </button>
            {providerDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProviderDropdown(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  {(Object.entries(SMTP_PRESETS) as [PresetKey, typeof SMTP_PRESETS[PresetKey]][]).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => { setProviderModal(key); setProviderDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <img src={`https://www.google.com/s2/favicons?domain=${PROVIDER_DOMAINS[key]}&sz=16`} alt="" className="w-4 h-4" />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button variant="primary" onClick={() => setEditingProfile(null)}>
            <Plus size={15} />
            Manual config
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          )}
        </div>
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
                {(['name', 'sender_email', 'smtp_host'] as const).map((col, i) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <span className="flex items-center gap-1">
                      {['Profile', 'From', 'SMTP Host'][i]}
                      {sortKey === col
                        ? sortDir === 'asc' ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />
                        : <ChevronUp size={13} className="text-gray-300 dark:text-gray-600" />}
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rate</th>
                <th
                  onClick={() => handleSort('is_default')}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <span className="flex items-center gap-1">
                    Default
                    {sortKey === 'is_default'
                      ? sortDir === 'asc' ? <ChevronUp size={13} className="text-indigo-500" /> : <ChevronDown size={13} className="text-indigo-500" />
                      : <ChevronUp size={13} className="text-gray-300 dark:text-gray-600" />}
                  </span>
                </th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No profiles match your search.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => setEditingProfile(p)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

      {/* Provider quick-setup modal */}
      {providerModal && (
        <ProviderModal
          provider={providerModal}
          onClose={() => setProviderModal(null)}
          onSaved={refresh}
        />
      )}

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

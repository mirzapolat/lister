import React, { useState } from 'react';
import {
  Database, Mail, List as ListIcon, Check, Server,
  KeyRound, ExternalLink, Eye, EyeOff, ArrowRight,
  ChevronLeft, Wifi, CheckCircle,
} from 'lucide-react';
import { createSenderProfile, createList } from '../db/database';

// ── Animations ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes ob-fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ob-scaleIn {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ob-slideRight {
  from { opacity: 0; transform: translateX(48px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ob-slideLeft {
  from { opacity: 0; transform: translateX(-48px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ob-ringGrow {
  0%   { transform: scale(0);    opacity: 0; }
  60%  { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes ob-drawCheck {
  from { stroke-dashoffset: 52; }
  to   { stroke-dashoffset: 0; }
}
@keyframes ob-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
`;

function fu(delay = 0, duration = 0.45): React.CSSProperties {
  return { animation: `ob-fadeUp ${duration}s cubic-bezier(0.4,0,0.2,1) ${delay}s both` };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESETS = {
  gmail:   { label: 'Gmail',      host: 'smtp.gmail.com',       port: '587', domain: 'google.com',       appUrl: 'https://myaccount.google.com/apppasswords',            guide: 'Requires 2-Step Verification. Generate an App Password in your Google Account settings.' },
  outlook: { label: 'Outlook',    host: 'smtp.office365.com',   port: '587', domain: 'outlook.live.com', appUrl: 'https://account.microsoft.com/security',               guide: 'Generate an App Password in your Microsoft account security settings.' },
  icloud:  { label: 'iCloud',     host: 'smtp.mail.me.com',     port: '587', domain: 'apple.com',        appUrl: 'https://appleid.apple.com/account/manage',             guide: 'Generate an App-Specific Password in your Apple ID account settings.' },
  yahoo:   { label: 'Yahoo',      host: 'smtp.mail.yahoo.com',  port: '587', domain: 'yahoo.com',        appUrl: 'https://login.yahoo.com/account/security',             guide: 'Generate an App Password in your Yahoo account security settings.' },
  zoho:    { label: 'Zoho',       host: 'smtp.zoho.com',        port: '587', domain: 'zoho.com',         appUrl: 'https://accounts.zoho.com/home#security/app-passwords', guide: 'Generate an App-Specific Password in your Zoho account settings.' },
} as const;

type ProviderKey = keyof typeof PRESETS;

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400';

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{children}</label>;
}

function StepNav({ onBack, backLabel = 'Back' }: { onBack?: () => void; backLabel?: string }) {
  if (!onBack) return null;
  return (
    <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mb-6">
      <ChevronLeft size={16} />
      {backLabel}
    </button>
  );
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center py-4">
      <div style={{ animation: 'ob-scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }} className="mx-auto mb-7">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Database size={40} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          {/* Orbiting dots */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center" style={{ animation: 'ob-scaleIn 0.4s ease 0.4s both' }}>
            <Mail size={10} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-indigo-400 rounded-full flex items-center justify-center" style={{ animation: 'ob-scaleIn 0.4s ease 0.55s both' }}>
            <ListIcon size={10} className="text-white" />
          </div>
        </div>
      </div>

      <h1 style={fu(0.1)} className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to Lister
      </h1>
      <p style={fu(0.2)} className="text-gray-500 dark:text-gray-400 mb-10 text-base leading-relaxed">
        Let's get you set up in two quick steps — then you're ready to send your first campaign.
      </p>

      <div style={fu(0.3)} className="space-y-2.5 mb-10 text-left">
        {[
          { icon: <Mail size={18} />, n: '1', title: 'Connect your email', sub: 'Set up Gmail, Outlook, or any SMTP server' },
          { icon: <ListIcon size={18} />, n: '2', title: 'Create your first list', sub: 'Organise your subscribers into a list' },
        ].map(({ icon, n, title, sub }) => (
          <div key={n} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/70 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{n}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        style={fu(0.42)}
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40"
      >
        Get started
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ── Step 1: Sender Profile ────────────────────────────────────────────────────

interface SenderStepProps {
  provider: ProviderKey | 'manual' | null;
  onSelect: (p: ProviderKey | 'manual') => void;
  profileName: string; setProfileName: (v: string) => void;
  senderName: string; setSenderName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  smtpHost: string; setSmtpHost: (v: string) => void;
  smtpPort: string; setSmtpPort: (v: string) => void;
  smtpTls: string; setSmtpTls: (v: string) => void;
  error: string;
  testStatus: 'idle' | 'testing' | 'ok' | 'error';
  testError: string;
  onTest: () => void;
  onSave: () => void;
  onSkip: () => void;
  onBack: () => void;
}

function SenderStep(props: SenderStepProps) {
  const { provider } = props;
  const preset = provider && provider !== 'manual' ? PRESETS[provider as ProviderKey] : null;

  const providers: { key: ProviderKey | 'manual'; label: string; icon: React.ReactNode }[] = [
    ...Object.entries(PRESETS).map(([k, p]) => ({
      key: k as ProviderKey,
      label: p.label,
      icon: <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=24`} className="w-5 h-5" alt="" />,
    })),
    { key: 'manual', label: 'Manual', icon: <Server size={18} className="text-gray-500 dark:text-gray-400" /> },
  ];

  return (
    <div>
      <StepNav onBack={props.onBack} />

      <h2 style={fu(0)} className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">
        Connect your email
      </h2>
      <p style={fu(0.06)} className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Choose a provider for quick setup, or configure SMTP manually.
      </p>

      {/* Provider grid */}
      <div style={fu(0.1)} className="grid grid-cols-3 gap-2 mb-5">
        {providers.map(({ key, label, icon }, i) => (
          <button
            key={key}
            onClick={() => props.onSelect(key)}
            style={{ animationDelay: `${0.1 + i * 0.04}s` }}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-150 ${
              provider === key
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            {icon}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>

      {/* Form — appears when provider selected */}
      {provider && (
        <div key={provider} style={{ animation: 'ob-fadeUp 0.3s ease both' }} className="space-y-3">
          {/* App password guide for presets */}
          {preset && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-lg">
              <KeyRound size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex-1">
                {preset.guide}{' '}
                <a href={preset.appUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium underline">
                  Get app password <ExternalLink size={10} />
                </a>
              </p>
            </div>
          )}

          {provider === 'manual' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Profile name</Label>
                  <input value={props.profileName} onChange={e => props.setProfileName(e.target.value)} placeholder="My SMTP" className={inputCls} />
                </div>
                <div>
                  <Label>Sender name</Label>
                  <input value={props.senderName} onChange={e => props.setSenderName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
                </div>
              </div>
              <div>
                <Label>From email</Label>
                <input type="email" value={props.email} onChange={e => props.setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>SMTP host</Label>
                  <input value={props.smtpHost} onChange={e => props.setSmtpHost(e.target.value)} placeholder="smtp.example.com" className={inputCls} />
                </div>
                <div>
                  <Label>Port</Label>
                  <input value={props.smtpPort} onChange={e => props.setSmtpPort(e.target.value)} placeholder="587" className={inputCls} />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <input type={props.showPw ? 'text' : 'password'} value={props.password} onChange={e => props.setPassword(e.target.value)} placeholder="SMTP password" className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => props.setShowPw(!props.showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {props.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Profile name</Label>
                  <input value={props.profileName} onChange={e => props.setProfileName(e.target.value)} placeholder={preset?.label ?? ''} className={inputCls} />
                </div>
                <div>
                  <Label>Sender name</Label>
                  <input value={props.senderName} onChange={e => props.setSenderName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
                </div>
              </div>
              <div>
                <Label>Email address</Label>
                <input type="email" value={props.email} onChange={e => props.setEmail(e.target.value)} placeholder={`you@${preset?.domain.replace('smtp.', '') ?? 'example.com'}`} className={inputCls} />
              </div>
              <div>
                <Label>App password</Label>
                <div className="relative">
                  <input type={props.showPw ? 'text' : 'password'} value={props.password} onChange={e => props.setPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => props.setShowPw(!props.showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {props.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Test button */}
          <div className="flex items-center gap-2">
            <button
              onClick={props.onTest}
              disabled={props.testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Wifi size={12} />
              {props.testStatus === 'testing' ? 'Testing…' : 'Test connection'}
            </button>
            {props.testStatus === 'ok' && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={12} /> Connected</span>}
            {props.testStatus === 'error' && <span className="text-xs text-red-500 truncate max-w-[200px]">{props.testError}</span>}
          </div>

          {props.error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{props.error}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button onClick={props.onSkip} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Skip for now
        </button>
        <button
          onClick={props.onSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          {provider ? 'Save & continue' : 'Continue'}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: List ──────────────────────────────────────────────────────────────

interface ListStepProps {
  listName: string; setListName: (v: string) => void;
  listDesc: string; setListDesc: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
  onBack: () => void;
}

function ListStep({ listName, setListName, listDesc, setListDesc, onSave, onSkip, onBack }: ListStepProps) {
  return (
    <div>
      <StepNav onBack={onBack} />

      <h2 style={fu(0)} className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">
        Create your first list
      </h2>
      <p style={fu(0.06)} className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Lists group your subscribers. You can create as many as you need later.
      </p>

      <div style={fu(0.12)} className="space-y-4">
        <div>
          <Label>List name</Label>
          <input
            autoFocus
            type="text"
            value={listName}
            onChange={e => setListName(e.target.value)}
            placeholder="e.g. Newsletter, Customers, Beta users…"
            className={inputCls}
            onKeyDown={e => e.key === 'Enter' && listName.trim() && onSave()}
          />
        </div>
        <div>
          <Label>Description <span className="normal-case font-normal text-gray-400">(optional)</span></Label>
          <textarea
            value={listDesc}
            onChange={e => setListDesc(e.target.value)}
            placeholder="What's this list for?"
            rows={3}
            className={inputCls + ' resize-none'}
          />
        </div>
      </div>

      <div style={fu(0.22)} className="flex items-center justify-between mt-8">
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          Skip for now
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
          disabled={!listName.trim()}
        >
          Finish setup
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────

function DoneStep({ createdProfile, createdList, onComplete }: { createdProfile: string | null; createdList: string | null; onComplete: () => void }) {
  const items = [
    createdProfile ? { ok: true,  text: `Sender profile "${createdProfile}" created` } : { ok: false, text: 'No sender profile — add one in Sender Profiles' },
    createdList    ? { ok: true,  text: `List "${createdList}" created` }               : { ok: false, text: 'No list yet — create one in Lists' },
  ];

  return (
    <div className="text-center py-4">
      {/* Animated checkmark */}
      <div className="flex items-center justify-center mb-8">
        <div style={{ animation: 'ob-ringGrow 0.55s cubic-bezier(0.34,1.56,0.64,1) both' }}
          className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-300 dark:shadow-indigo-900/60"
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path
              d="M10 22 L19 31 L34 13"
              stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="52" strokeDashoffset="52"
              style={{ animation: 'ob-drawCheck 0.45s cubic-bezier(0.4,0,0.2,1) 0.35s both' }}
            />
          </svg>
        </div>
      </div>

      <h2 style={fu(0.3)} className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        You're all set!
      </h2>
      <p style={fu(0.38)} className="text-gray-500 dark:text-gray-400 mb-10">
        Lister is ready to go. Here's what was set up:
      </p>

      <div style={fu(0.46)} className="space-y-2.5 mb-10 text-left">
        {items.map(({ ok, text }) => (
          <div key={text} className={`flex items-center gap-3 p-3.5 rounded-xl border ${
            ok
              ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/40'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50'
          }`}>
            {ok
              ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              : <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
            }
            <span className={`text-sm ${ok ? 'text-green-800 dark:text-green-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              {text}
            </span>
          </div>
        ))}
      </div>

      <button
        style={fu(0.54)}
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40"
      >
        Open Lister
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // Sender state
  const [provider, setProvider] = useState<ProviderKey | 'manual' | null>(null);
  const [profileName, setProfileName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpTls] = useState('true');
  const [senderError, setSenderError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  // List state
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');

  // What was created
  const [createdProfile, setCreatedProfile] = useState<string | null>(null);
  const [createdList, setCreatedList] = useState<string | null>(null);

  const nav = (next: number, d = 1) => { setDir(d); setStep(next); };

  const selectProvider = (p: ProviderKey | 'manual') => {
    setProvider(p);
    setSenderError('');
    setTestStatus('idle');
    setProfileName(p !== 'manual' ? PRESETS[p].label : '');
  };

  const buildSmtp = () => {
    if (!provider) return null;
    if (provider === 'manual') {
      return { name: profileName.trim(), sender_name: senderName.trim(), sender_email: email.trim(), smtp_host: smtpHost.trim(), smtp_port: smtpPort, smtp_username: email.trim(), smtp_password: password, smtp_tls: smtpTls, is_default: 1 as const, rate_limit_ms: 0 };
    }
    const p = PRESETS[provider];
    return { name: profileName.trim() || p.label, sender_name: senderName.trim(), sender_email: email.trim(), smtp_host: p.host, smtp_port: p.port, smtp_username: email.trim(), smtp_password: password, smtp_tls: 'true', is_default: 1 as const, rate_limit_ms: 0 };
  };

  const handleTest = async () => {
    const smtp = buildSmtp();
    if (!smtp) return;
    if (!email.trim() || !password.trim()) { setSenderError('Fill in your email and password first.'); return; }
    setTestStatus('testing'); setTestError(''); setSenderError('');
    try {
      const res = await fetch('http://localhost:3001/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smtp }) });
      const data = await res.json();
      if (data.ok) { setTestStatus('ok'); setTimeout(() => setTestStatus('idle'), 3000); }
      else { setTestStatus('error'); setTestError(data.error ?? 'Connection failed'); }
    } catch (e) { setTestStatus('error'); setTestError(e instanceof Error ? e.message : 'Cannot reach relay server'); }
  };

  const saveSender = () => {
    if (!provider) { nav(2); return; }
    if (provider === 'manual') {
      if (!profileName.trim()) { setSenderError('Profile name is required.'); return; }
      if (!smtpHost.trim()) { setSenderError('SMTP host is required.'); return; }
    } else {
      if (!email.trim()) { setSenderError('Email address is required.'); return; }
      if (!password.trim()) { setSenderError('App password is required.'); return; }
    }
    const smtp = buildSmtp()!;
    createSenderProfile(smtp);
    setCreatedProfile(smtp.name);
    nav(2);
  };

  const saveList = () => {
    if (listName.trim()) {
      createList(listName.trim(), listDesc.trim());
      setCreatedList(listName.trim());
    }
    nav(3);
  };

  const slideAnim: React.CSSProperties = {
    animation: `${dir >= 0 ? 'ob-slideRight' : 'ob-slideLeft'} 0.38s cubic-bezier(0.4,0,0.2,1) both`,
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
      <style>{KEYFRAMES}</style>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Database size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Lister</span>
        </div>

        {step > 0 && step < 3 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">Step {step} of 2</span>
            <div className="flex gap-1.5">
              {[1, 2].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${s > step ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                  style={{ width: '2.5rem', backgroundColor: s <= step ? '#6366f1' : undefined }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-12">
        <div key={step} style={slideAnim} className="w-full max-w-md">
          {step === 0 && <WelcomeStep onNext={() => nav(1)} />}

          {step === 1 && (
            <SenderStep
              provider={provider} onSelect={selectProvider}
              profileName={profileName} setProfileName={setProfileName}
              senderName={senderName} setSenderName={setSenderName}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              showPw={showPw} setShowPw={setShowPw}
              smtpHost={smtpHost} setSmtpHost={setSmtpHost}
              smtpPort={smtpPort} setSmtpPort={setSmtpPort}
              smtpTls={smtpTls} setSmtpTls={() => {}}
              error={senderError}
              testStatus={testStatus} testError={testError}
              onTest={handleTest}
              onSave={saveSender}
              onSkip={() => nav(2)}
              onBack={() => nav(0, -1)}
            />
          )}

          {step === 2 && (
            <ListStep
              listName={listName} setListName={setListName}
              listDesc={listDesc} setListDesc={setListDesc}
              onSave={saveList}
              onSkip={() => { nav(3); }}
              onBack={() => nav(1, -1)}
            />
          )}

          {step === 3 && (
            <DoneStep
              createdProfile={createdProfile}
              createdList={createdList}
              onComplete={onComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}

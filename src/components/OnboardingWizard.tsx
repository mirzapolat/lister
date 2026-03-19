import React, { useState } from 'react';
import {
  Database, Mail, List as ListIcon, Check, Server,
  KeyRound, ExternalLink, Eye, EyeOff, ArrowRight,
  ChevronLeft, Wifi, CheckCircle, AlertTriangle, Download,
  Save, HardDrive, FolderOpen, RefreshCw,
} from 'lucide-react';
import { createSenderProfile, createList, hasFileSystemApi } from '../db/database';

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
@keyframes ob-pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
  100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
}
`;

function fu(delay = 0, duration = 0.45): React.CSSProperties {
  return { animation: `ob-fadeUp ${duration}s cubic-bezier(0.4,0,0.2,1) ${delay}s both` };
}

// ── Browser detection ─────────────────────────────────────────────────────────

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Brave') || (navigator as { brave?: { isBrave?: unknown } }).brave?.isBrave) return 'Brave';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'your browser';
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

const CHROMIUM_BROWSERS = [
  { name: 'Chrome', domain: 'chrome.google.com', url: 'https://www.google.com/chrome/' },
  { name: 'Edge',   domain: 'microsoft.com',     url: 'https://www.microsoft.com/edge/' },
  { name: 'Brave',  domain: 'brave.com',         url: 'https://brave.com/' },
  { name: 'Arc',    domain: 'arc.net',            url: 'https://arc.net/' },
];

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

// ── Step -1: Browser Warning ──────────────────────────────────────────────────

const FEATURES: { label: string; chromium: string; other: string; chromiumOk: boolean }[] = [
  { label: 'File saving',       chromium: 'Auto-saves directly to disk',  other: 'Manual download required',    chromiumOk: true  },
  { label: 'Open recent file',  chromium: 'Reopens last file instantly',  other: 'Must re-open each session',   chromiumOk: true  },
  { label: 'Data safety',       chromium: 'Changes never lost',           other: 'Close tab = lose unsaved work', chromiumOk: true },
  { label: 'Filesystem access', chromium: 'Full File System Access API',  other: 'Not available',               chromiumOk: true  },
];

function BrowserWarningStep({ browserName, onContinue }: { browserName: string; onContinue: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_1.5fr] gap-10 items-start">
      {/* Left column */}
      <div className="flex flex-col">
        <div style={{ animation: 'ob-scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }} className="mb-7">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center border-2 border-amber-200 dark:border-amber-700/50">
            <AlertTriangle size={34} className="text-amber-500" />
          </div>
        </div>

        <h2 style={fu(0.08)} className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Chromium browser recommended
        </h2>
        <p style={fu(0.14)} className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          You're using <strong className="text-gray-700 dark:text-gray-300">{browserName}</strong>. Lister works, but some features are only available in Chrome, Edge, Brave, or Arc.
        </p>

        {/* Recommended browsers */}
        <div style={fu(0.2)} className="mb-8">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Switch to a Chromium browser</p>
          <div className="grid grid-cols-2 gap-2.5">
            {CHROMIUM_BROWSERS.map(({ name, domain, url }, i) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ animationDelay: `${0.22 + i * 0.04}s` }}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=24`} alt={name} className="w-5 h-5 rounded flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium truncate">{name.split(' ')[0]}</span>
                <ExternalLink size={11} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 ml-auto flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div style={fu(0.4)} className="flex flex-col gap-2 mt-8">
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Continue with {browserName}
            <ArrowRight size={15} />
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            We'll show you how to save manually.
          </p>
        </div>
      </div>

      {/* Right column: feature comparison */}
      <div style={fu(0.12)}>
        {/* Column headers */}
        <div className="grid grid-cols-2 mb-2">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Chromium</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">{browserName}</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {FEATURES.map(({ label, chromium, other }, i) => (
            <div key={label} style={fu(0.16 + i * 0.06)}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
                <div className="px-4 py-4 bg-indigo-50/40 dark:bg-indigo-900/10 flex items-start gap-2">
                  <CheckCircle size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{chromium}</span>
                </div>
                <div className="px-4 py-4 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 leading-snug">{other}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Save Tutorial (non-Chromium) ──────────────────────────────────────

function SaveTutorialStep({ onComplete }: { onComplete: () => void }) {
  const steps = [
    { icon: <HardDrive size={16} className="text-indigo-400" />, title: 'Work normally in Lister', desc: 'Add subscribers, create campaigns, configure sender profiles — use Lister as you normally would.' },
    { icon: <Save size={16} className="text-indigo-400" />, title: 'Click "Save" in the top bar', desc: 'Your browser downloads an updated .sqlite file with all your changes.' },
    { icon: <FolderOpen size={16} className="text-indigo-400" />, title: 'Keep the file somewhere safe', desc: 'Documents or Desktop works well. Name it something clear like "lister.sqlite".' },
    { icon: <RefreshCw size={16} className="text-indigo-400" />, title: 'Next session: open that file', desc: 'Click "Open existing file" on the start screen and pick your saved .sqlite file.' },
  ];

  return (
    <div className="grid grid-cols-[1fr_1.4fr] gap-10 items-start">
      {/* Left column */}
      <div className="flex flex-col">
        <div style={{ animation: 'ob-scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }} className="mb-7">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center border-2 border-amber-200 dark:border-amber-700/50">
            <Save size={34} className="text-amber-500" />
          </div>
        </div>

        <h2 style={fu(0.08)} className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Save your work manually
        </h2>
        <p style={fu(0.14)} className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Your browser doesn't support live file saving. You control when to save — follow the steps on the right.
        </p>

        {/* Warning */}
        <div style={fu(0.2)} className="flex items-start gap-3 px-4 py-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 mb-8">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
            <strong>Closing this tab without saving permanently loses all unsaved changes.</strong> There is no auto-save.
          </p>
        </div>

        <button
          style={fu(0.3)}
          onClick={onComplete}
          className="mt-8 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
        >
          Got it — open Lister
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Right column: header mockup + steps */}
      <div className="flex flex-col">
        {/* Header mockup */}
        <div style={fu(0.12)} className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">The Save button</p>
          <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden shadow-md">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Database size={12} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Lister</span>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md ml-1">mylist.sqlite</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
                style={{ animation: 'ob-pulse-ring 1.8s ease-out infinite' }}
              >
                <Download size={12} />
                Save
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 h-14 flex items-center justify-center">
              <span className="text-xs text-gray-200 dark:text-gray-700">App content</span>
            </div>
          </div>
          <p className="text-right text-sm text-indigo-500 font-medium mt-1.5 pr-1">↑ click this to save</p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          {steps.map(({ icon, title, desc }, i) => (
            <div
              key={title}
              style={fu(0.2 + i * 0.06)}
              className="flex items-start gap-3.5 px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50"
            >
              <div className="flex-shrink-0 w-7 h-7 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-600 shadow-sm">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
              <div className="flex-shrink-0 opacity-40 mt-0.5">{icon}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
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

function DoneStep({ createdProfile, createdList, onNext }: { createdProfile: string | null; createdList: string | null; onNext: () => void }) {
  const items = [
    createdProfile ? { ok: true,  text: `Sender profile "${createdProfile}" created` } : { ok: false, text: 'No sender profile — add one in Sender Profiles' },
    createdList    ? { ok: true,  text: `List "${createdList}" created` }               : { ok: false, text: 'No list yet — create one in Lists' },
  ];

  return (
    <div className="text-center py-4">
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
        onClick={onNext}
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
  const isChromium = hasFileSystemApi();
  const browserName = isChromium ? '' : detectBrowser();

  // Steps: -1=browser-warn (non-chromium only), 0=welcome, 1=sender, 2=list, 3=done, 4=save-tutorial (non-chromium only)
  const [step, setStep] = useState(isChromium ? 0 : -1);
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
      const res = await fetch('/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smtp }) });
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

  // After Done: go to save tutorial for non-chromium, or complete for chromium
  const afterDone = () => {
    if (!isChromium) { nav(4); }
    else { onComplete(); }
  };

  const slideAnim: React.CSSProperties = {
    animation: `${dir >= 0 ? 'ob-slideRight' : 'ob-slideLeft'} 0.38s cubic-bezier(0.4,0,0.2,1) both`,
  };

  // Which step numbers count as "setup steps" for the progress bar (1 and 2)
  const showProgress = step === 1 || step === 2;

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

        {showProgress && (
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

        {/* Non-chromium indicator on save-tutorial step */}
        {step === 4 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50">
            <AlertTriangle size={11} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Manual save required</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto flex justify-center ${step === -1 || step === 4 ? 'items-center px-8 py-8' : 'items-start px-4 py-12'}`}>
        <div key={step} style={slideAnim} className={`w-full ${step === -1 || step === 4 ? 'max-w-3xl' : 'max-w-md'}`}>
          {step === -1 && (
            <BrowserWarningStep browserName={browserName} onContinue={() => nav(0)} />
          )}

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
              onSkip={() => nav(3)}
              onBack={() => nav(1, -1)}
            />
          )}

          {step === 3 && (
            <DoneStep
              createdProfile={createdProfile}
              createdList={createdList}
              onNext={afterDone}
            />
          )}

          {step === 4 && (
            <SaveTutorialStep onComplete={onComplete} />
          )}
        </div>
      </div>
    </div>
  );
}

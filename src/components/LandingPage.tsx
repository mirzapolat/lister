import { useEffect } from 'react';
import {
  Database, FolderOpen, Plus, AlertCircle,
  Shield, Lock, Mail, Zap, Users, PenLine, Palette,
  LayoutTemplate, Server, Fingerprint, WifiOff,
  FileText, ArrowRight, CheckCircle, Heart,
} from 'lucide-react';

const STRIPE_LINK = 'https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03';


// ── App Mockup ────────────────────────────────────────────────────────────────

function AppMockup() {
  const subscribers = [
    { name: 'Anna Schmidt', tag: 'Tech', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    { name: 'Ben Müller', tag: 'News', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { name: 'Clara Weber', tag: 'Both', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { name: 'David Koch', tag: 'Tech', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    { name: 'Eva Bauer', tag: 'News', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ];

  return (
    <div className="relative w-full max-w-lg mx-auto select-none" aria-hidden="true">
      {/* Glow behind mockup */}
      <div className="absolute inset-0 -z-10 translate-y-6 blur-3xl opacity-30 dark:opacity-20 rounded-3xl bg-gradient-to-br from-indigo-400 via-indigo-300 to-purple-300" />

      {/* Window chrome */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden bg-white dark:bg-gray-900 text-xs">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
          <div className="mx-auto flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-200/70 dark:bg-gray-700/70 text-gray-500 dark:text-gray-400">
            <Database size={10} />
            <span className="font-mono">newsletter.sqlite</span>
            <Lock size={9} className="text-indigo-400" />
          </div>
        </div>

        <div className="flex" style={{ height: 260 }}>
          {/* Sidebar */}
          <div className="w-36 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 py-3 flex flex-col gap-0.5 px-2">
            {[
              { icon: FileText, label: 'Lists', active: false },
              { icon: Mail, label: 'Campaigns', active: false },
              { icon: Users, label: 'Subscribers', active: true },
              { icon: Palette, label: 'Themes', active: false },
              { icon: Server, label: 'Settings', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-default ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                <Icon size={11} />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Subscribers</p>
                <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: 10 }}>1,247 total</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-5 w-12 rounded bg-indigo-600" />
              </div>
            </div>

            {/* Table header */}
            <div className="flex items-center px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500" style={{ fontSize: 10 }}>
              <span className="w-4 mr-3">☐</span>
              <span className="flex-1">Name</span>
              <span className="w-16">Email</span>
              <span className="w-12 text-right">Tag</span>
            </div>

            {/* Rows */}
            <div className="flex-1 divide-y divide-gray-50 dark:divide-gray-800/60 overflow-hidden">
              {subscribers.map((s, i) => (
                <div key={i} className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300">
                  <span className="w-4 mr-3 text-gray-300 dark:text-gray-600">☐</span>
                  <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                  <span className="w-16 text-gray-300 dark:text-gray-600">••••••</span>
                  <span className={`w-12 text-right`}>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${s.color}`}>{s.tag}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 flex items-center justify-between" style={{ fontSize: 10 }}>
              <span>Showing 5 of 1,247</span>
              <span className="flex gap-1">
                <span className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">‹</span>
                <span className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">›</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-3 -right-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
        <CheckCircle size={11} />
        Sent 3 min ago
      </div>
    </div>
  );
}

// ── Features data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Shield,
    title: '100% Local & Private',
    description: 'Your subscriber data never leaves your machine. No cloud sync, no accounts, no analytics. What you build is yours alone.',
    accent: 'indigo',
  },
  {
    icon: Database,
    title: 'One Portable File',
    description: 'Your entire newsletter operation — subscribers, campaigns, themes — lives in a single SQLite file you can copy, back up, or move freely.',
    accent: 'indigo',
  },
  {
    icon: Lock,
    title: 'File Encryption',
    description: 'Lock your database with AES-256. Use a password or go passwordless with a passkey — Touch ID, Windows Hello, or a hardware key.',
    accent: 'indigo',
  },
  {
    icon: Mail,
    title: 'Your SMTP, Your Domain',
    description: 'Connect Gmail, Outlook, iCloud, or any custom SMTP server. Send from your own domain with no shared infrastructure.',
    accent: 'sky',
  },
  {
    icon: Users,
    title: 'Subscriber Management',
    description: 'Organize subscribers into lists, apply tags, import from CSV, handle bulk actions, and track bounces — all without leaving the app.',
    accent: 'sky',
  },
  {
    icon: PenLine,
    title: 'Campaign Editor',
    description: 'Write in Markdown with a live preview pane. Apply themes in one click and see exactly how your email will render.',
    accent: 'sky',
  },
  {
    icon: Palette,
    title: 'Beautiful Themes',
    description: 'Fully customizable HTML email themes with live preview. Build pixel-perfect branded emails without touching raw HTML.',
    accent: 'violet',
  },
  {
    icon: LayoutTemplate,
    title: 'Reusable Templates',
    description: 'Save content blocks as templates and reuse them across campaigns. Spin up a new issue in seconds, not hours.',
    accent: 'violet',
  },
  {
    icon: Server,
    title: 'Multiple Sender Profiles',
    description: "Different SMTP accounts for different sending contexts — company newsletter, personal digest, client work. Switch with one click.",
    accent: 'violet',
  },
  {
    icon: Zap,
    title: 'Fast & Lightweight',
    description: 'No background services, no electron overhead, no internet required. Opens instantly. Works entirely offline.',
    accent: 'amber',
  },
] as const;

const accentMap = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  sky:    'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
};

// ── Why Local-First section data ──────────────────────────────────────────────

const WHY_POINTS = [
  {
    icon: WifiOff,
    heading: 'Works without the internet',
    body: "Your campaigns don't care about connectivity. Write, preview, and send from a plane, a cabin, or a spotty café.",
  },
  {
    icon: Shield,
    heading: 'No vendor lock-in',
    body: "A SQLite file is a universal format. Move to a different tool tomorrow and take everything with you — no export taxes.",
  },
  {
    icon: Fingerprint,
    heading: 'You own your data',
    body: "Not us. Not a SaaS. You. There's no terms-of-service that can revoke your access to your own subscriber list.",
  },
];

// ── LandingPage ───────────────────────────────────────────────────────────────

interface LandingPageProps {
  onOpenFile: () => void;
  onNewFile: () => void;
  error: string;
  fsApi: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LandingPage({
  onOpenFile, onNewFile,
  error, fileInputRef, onFileInputChange,
}: LandingPageProps) {

  // Inject distinctive display font
  useEffect(() => {
    if (document.getElementById('lister-lp-font')) return;
    const link = document.createElement('link');
    link.id = 'lister-lp-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap';
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#fafaf9] dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy + CTAs */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <rect width="32" height="32" rx="7" fill="#4f46e5"/>
                <g transform="translate(7.5, 6.5)" stroke="white" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <ellipse cx="8.5" cy="4.5" rx="6.5" ry="2.2" strokeWidth="1.6"/>
                  <line x1="2" y1="4.5" x2="2" y2="14.5" strokeWidth="1.6"/>
                  <line x1="15" y1="4.5" x2="15" y2="14.5" strokeWidth="1.6"/>
                  <ellipse cx="8.5" cy="14.5" rx="6.5" ry="2.2" strokeWidth="1.6"/>
                  <path d="M2 9.5 C2 11.7 4.9 13.5 8.5 13.5 C12.1 13.5 15 11.7 15 9.5" strokeWidth="1.3" opacity="0.75"/>
                </g>
              </svg>
              <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Lister</span>
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.05] tracking-tight text-gray-900 dark:text-white mb-6"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Newsletter management,{' '}
              <span className="italic text-indigo-600 dark:text-indigo-400">without the cloud.</span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-md font-light">
              Send campaigns, manage subscribers, and track lists — all stored
              in a single SQLite file on your machine. No accounts. No subscriptions. No tracking.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={onNewFile}
                className="flex items-center justify-center gap-2 px-6 py-4 sm:py-3.5 text-base bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 shadow-md shadow-indigo-500/30 group"
              >
                <Plus size={18} />
                Create new file
                <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </button>
              <button
                onClick={onOpenFile}
                className="flex items-center justify-center gap-2 px-6 py-4 sm:py-3.5 text-base bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-700/60 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all"
              >
                <FolderOpen size={18} />
                Open existing file
              </button>
            </div>



            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          {/* Right: app mockup */}
          <div className="hidden lg:block">
            <AppMockup />
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-16 pt-10 border-t border-gray-200/70 dark:border-gray-800/70 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '0', label: 'Cloud servers involved' },
            { value: '1', label: 'File for everything' },
            { value: '∞', label: 'Subscribers supported' },
            { value: '100%', label: 'Your data, your rules' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p
                className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                {value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14 max-w-xl">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Features</p>
            <h2
              className="text-4xl lg:text-5xl text-gray-900 dark:text-white leading-tight"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description, accent }) => (
              <div
                key={title}
                className="group p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 bg-[#fafaf9] dark:bg-gray-800/40 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${accentMap[accent]}`}>
                  <Icon size={16} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-light">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why local-first ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <div className="mb-14 max-w-xl">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Philosophy</p>
          <h2
            className="text-4xl lg:text-5xl text-gray-900 dark:text-white leading-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Why local-first?
          </h2>
          <p className="mt-4 text-base text-gray-500 dark:text-gray-400 font-light leading-relaxed">
            Most newsletter tools treat your subscriber list as their asset. We don't.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-16">
          {WHY_POINTS.map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{heading}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-light">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
              <div className="px-4 sm:px-5 py-3 text-gray-500 dark:text-gray-400">What matters</div>
              <div className="px-4 sm:px-5 py-3 text-gray-500 dark:text-gray-400 border-x border-gray-200 dark:border-gray-700">Typical SaaS</div>
              <div className="px-4 sm:px-5 py-3 text-indigo-600 dark:text-indigo-400">Lister</div>
            </div>
            {[
              ['Your data is portable',      '✗  Locked in their DB',        '✓  SQLite file, yours forever'],
              ['Works offline',              '✗  Requires internet',          '✓  Fully offline'],
              ['No subscription needed',     '✗  Monthly billing',            '✓  One-time, no fees'],
              ['Subscriber privacy',         '✗  Third-party servers',        '✓  Never leaves your device'],
              ['Your SMTP, your domain',     '✗  Shared infrastructure',      '✓  Bring your own SMTP'],
              ['Encrypted at rest',          '△  Vendor-managed',             '✓  Password or passkey'],
            ].map(([feature, saas, lister]) => (
              <div key={feature} className="grid grid-cols-3 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="px-4 sm:px-5 py-3 text-gray-700 dark:text-gray-300 font-medium">{feature}</div>
                <div className="px-4 sm:px-5 py-3 text-gray-500 dark:text-gray-500 border-x border-gray-100 dark:border-gray-800">{saas}</div>
                <div className="px-4 sm:px-5 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{lister}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="bg-indigo-600 dark:bg-indigo-700 py-16 lg:py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-4xl lg:text-5xl text-white mb-4 leading-tight"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Your newsletters, on your terms.
          </h2>
          <p className="text-indigo-200 mb-8 text-base font-light">
            Open a file or start fresh. No signup required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onNewFile}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Plus size={16} />
              Create new file
            </button>
            <button
              onClick={onOpenFile}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-xl border border-indigo-400 transition-colors"
            >
              <FolderOpen size={16} />
              Open existing file
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#fafaf9] dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
              <Database size={10} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Lister</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 transition-colors font-medium"
            >
              <Heart size={11} className="fill-current" />
              Support
            </a>
          </div>
        </div>
      </footer>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite,.db"
        className="hidden"
        onChange={onFileInputChange}
      />

    </div>
  );
}

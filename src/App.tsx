import { useState, useEffect, useRef } from 'react';
import { Database, FolderOpen, Plus, AlertCircle, Mail, Lock, Zap } from 'lucide-react';
import {
  promptOpenFile, promptSaveNewFile, initSqlJs_,
  hasFileSystemApi, openDatabaseFromFileInput, createNewDatabaseFallback, downloadDatabase,
  getStoredFileHandle, openDatabaseFromFile, clearStoredFileHandle, closeDatabase,
} from './db/database';
import { Layout } from './components/Layout';
import { ListsPage } from './components/lists/ListsPage';
import { ListDetailPage } from './components/lists/ListDetailPage';
import { CampaignsPage } from './components/campaigns/CampaignsPage';
import { CampaignEditor } from './components/campaigns/CampaignEditor';
import { SettingsPage } from './components/settings/SettingsPage';
import { SubscribersPage } from './components/subscribers/SubscribersPage';
import type { Page } from './types';

type AppStatus = 'loading' | 'welcome' | 'ready' | 'error';

function useDarkMode() {
  const [dark, setDarkState] = useState(() => document.documentElement.classList.contains('dark'));
  const setDark = (next: boolean) => {
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lister-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lister-theme', 'light');
    }
    setDarkState(next);
  };
  return [dark, setDark] as const;
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [dark, setDark] = useDarkMode();
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState<Page>('lists');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsApi = hasFileSystemApi();

  useEffect(() => {
    initSqlJs_().then(async () => {
      if (hasFileSystemApi()) {
        try {
          const handle = await getStoredFileHandle();
          if (handle) {
            const h = handle as unknown as { queryPermission(o: object): Promise<string>; requestPermission(o: object): Promise<string> };
            const perm = await h.queryPermission({ mode: 'readwrite' });
            const granted = perm === 'granted'
              ? 'granted'
              : await h.requestPermission({ mode: 'readwrite' });
            if (granted === 'granted') {
              await openDatabaseFromFile(handle);
              setFileName(handle.name);
              setStatus('ready');
              return;
            }
          }
        } catch { /* stale handle or denied — fall through */ }
      }
      setStatus('welcome');
    }).catch((e) => { setError(String(e)); setStatus('error'); });
  }, []);

  const handleOpenFile = async () => {
    if (!fsApi) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setError('');
      const result = await promptOpenFile();
      if (!result) return;
      setFileName(result.fileName);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const result = await openDatabaseFromFileInput(file);
      setFileName(result.fileName);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
    e.target.value = '';
  };

  const handleNewFile = async () => {
    try {
      setError('');
      if (!fsApi) {
        const result = await createNewDatabaseFallback('lister.sqlite');
        setFileName(result.fileName);
        setStatus('ready');
        return;
      }
      const result = await promptSaveNewFile();
      if (!result) return;
      setFileName(result.fileName);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleSave = () => { downloadDatabase(); };

  const handleUnload = async () => {
    closeDatabase();
    await clearStoredFileHandle();
    setStatus('welcome');
    setFileName('');
    setPage('lists');
    setSelectedListId(null);
    setSelectedCampaignId(null);
  };

  const navigate = (p: Page) => {
    setPage(p);
    if (p !== 'list-detail') setSelectedListId(null);
    if (p !== 'campaign-editor') setSelectedCampaignId(null);
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading Lister...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md text-center px-6">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 font-mono">{error}</p>
          <button
            onClick={() => setStatus('welcome')}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'welcome') {
    return (
      <div className="h-screen flex overflow-hidden bg-white dark:bg-gray-900">
        {/* Left panel — marketing */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-indigo-600 p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/40" />
            <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-700/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Lister</span>
            </div>
          </div>

          <div className="relative">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Newsletter management,<br />
              <span className="text-indigo-200">without the cloud.</span>
            </h1>
            <p className="text-indigo-200 text-lg mb-10 leading-relaxed">
              Send campaigns, manage subscribers, and track lists — all stored in a single file on your machine.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                  <Lock size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">100% local, 100% private</p>
                  <p className="text-indigo-300 text-sm mt-0.5">Your data never leaves your device. No accounts, no subscriptions, no tracking.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                  <Mail size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Send real campaigns</p>
                  <p className="text-indigo-300 text-sm mt-0.5">Write in Markdown, preview live, send via your own SMTP — full delivery control.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center mt-0.5">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Lightweight and fast</p>
                  <p className="text-indigo-300 text-sm mt-0.5">One SQLite file. Import thousands of subscribers in seconds. No bloat.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <p className="text-indigo-400 text-xs">Free and open source. Works in any modern browser.</p>
          </div>
        </div>

        {/* Right panel — actions */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white dark:bg-gray-900">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Database size={18} className="text-white" />
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-lg">Lister</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Get started</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Open an existing database or create a new one.</p>

            <div className="space-y-3">
              <button
                onClick={handleNewFile}
                className="w-full flex items-center gap-4 px-5 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Plus size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Create new file</p>
                  <p className="text-xs text-indigo-300 mt-0.5">Start with an empty database</p>
                </div>
              </button>

              <button
                onClick={handleOpenFile}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                  <FolderOpen size={20} className="text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Open existing file</p>
                  <p className="text-xs text-gray-400 mt-0.5">Load a .sqlite database file</p>
                </div>
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {!fsApi && (
              <p className="text-center text-xs text-gray-400 mt-6">
                Firefox detected — changes are saved in memory. Use the Save button to download your file.
              </p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sqlite,.db"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    );
  }

  // Ready state
  const renderPage = () => {
    switch (page) {
      case 'lists':
        return (
          <ListsPage
            onSelectList={(id) => {
              setSelectedListId(id);
              setPage('list-detail');
            }}
          />
        );
      case 'list-detail':
        return selectedListId ? (
          <ListDetailPage
            listId={selectedListId}
            onBack={() => navigate('lists')}
          />
        ) : null;
      case 'campaigns':
        return (
          <CampaignsPage
            onCreateCampaign={() => {
              setSelectedCampaignId(null);
              setPage('campaign-editor');
            }}
            onEditCampaign={(id) => {
              setSelectedCampaignId(id);
              setPage('campaign-editor');
            }}
          />
        );
      case 'campaign-editor':
        return (
          <CampaignEditor
            campaignId={selectedCampaignId}
            onBack={() => navigate('campaigns')}
            onSaved={(id) => setSelectedCampaignId(id)}
          />
        );
      case 'subscribers':
        return <SubscribersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".sqlite,.db"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <Layout
        currentPage={page}
        fileName={fileName}
        onNavigate={navigate}
        onSave={!fsApi ? handleSave : undefined}
        onUnload={handleUnload}
        dark={dark}
        onToggleDark={() => setDark(!dark)}
      >
        {renderPage()}
      </Layout>
    </>
  );
}

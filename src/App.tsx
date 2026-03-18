import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  promptOpenFile, promptSaveNewFile, initSqlJs_,
  hasFileSystemApi, openDatabaseFromFileInput, createNewDatabaseFallback, downloadDatabase,
  getStoredFileHandle, openDatabaseFromFile, closeDatabase,
} from './db/database';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ListsPage } from './components/lists/ListsPage';
import { ListDetailPage } from './components/lists/ListDetailPage';
import { CampaignsPage } from './components/campaigns/CampaignsPage';
import { CampaignEditor } from './components/campaigns/CampaignEditor';
import { SettingsPage } from './components/settings/SettingsPage';
import { SubscribersPage } from './components/subscribers/SubscribersPage';
import { ThemesPage } from './components/themes/ThemesPage';
import type { Page } from './types';

type AppStatus = 'loading' | 'welcome' | 'onboarding' | 'ready' | 'error';

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
  const [recentFileName, setRecentFileName] = useState(() => localStorage.getItem('lister-recent-filename') ?? '');
  const [page, setPage] = useState<Page>('lists');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsApi = hasFileSystemApi();

  const saveRecentFile = (name: string) => {
    localStorage.setItem('lister-recent-filename', name);
    setRecentFileName(name);
  };

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
              saveRecentFile(handle.name);
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
      saveRecentFile(result.fileName);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleOpenRecent = async () => {
    try {
      setError('');
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
          saveRecentFile(handle.name);
          setStatus('ready');
          return;
        }
        setError('Permission denied — please open the file manually.');
      } else {
        // Handle was cleared (e.g. after unload); fall back to file picker
        handleOpenFile();
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const result = await openDatabaseFromFileInput(file);
      setFileName(result.fileName);
      saveRecentFile(result.fileName);
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
        saveRecentFile(result.fileName);
        setStatus('onboarding');
        return;
      }
      const result = await promptSaveNewFile();
      if (!result) return;
      setFileName(result.fileName);
      saveRecentFile(result.fileName);
      setStatus('onboarding');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleSave = () => { downloadDatabase(); };

  const handleUnload = async () => {
    closeDatabase();
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

  if (status === 'onboarding') {
    return <OnboardingWizard onComplete={() => setStatus('ready')} />;
  }

  if (status === 'welcome') {
    return (
      <LandingPage
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onOpenRecent={recentFileName && fsApi ? handleOpenRecent : undefined}
        recentFileName={recentFileName}
        error={error}
        fsApi={fsApi}
        fileInputRef={fileInputRef}
        onFileInputChange={handleFileInputChange}
      />
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
      case 'themes':
        return <ThemesPage />;
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

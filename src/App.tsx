import { useState, useEffect, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  promptOpenFile, promptSaveNewFile, initSqlJs_,
  hasFileSystemApi, openDatabaseFromFileInput, createNewDatabaseFallback, downloadDatabase,
  getStoredFileHandle, openDatabaseFromFile, closeDatabase,
} from './db/database';
import type { OpenResult } from './db/database';
import type { EncryptionMethod } from './db/crypto';
import { PasswordPrompt } from './components/ui/PasswordPrompt';
import { Layout } from './components/Layout';
import { SettingsProvider } from './context/SettingsContext';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ListsPage } from './components/lists/ListsPage';
import { ListDetailPage } from './components/lists/ListDetailPage';
import { CampaignsPage } from './components/campaigns/CampaignsPage';
import { CampaignEditor } from './components/campaigns/CampaignEditor';
import { SettingsPage, SenderProfilesPage } from './components/settings/SettingsPage';
import { SubscribersPage } from './components/subscribers/SubscribersPage';
import { ThemesPage } from './components/themes/ThemesPage';
import { TemplatesPage } from './components/templates/TemplatesPage';
import type { Page, EmailTemplate } from './types';

type AppStatus = 'loading' | 'welcome' | 'onboarding' | 'ready' | 'error';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Unhandled error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md text-center px-6">
            <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 font-mono">
              {(this.state.error as Error).message}
            </p>
            <button onClick={() => this.setState({ error: null })} className="mt-4 text-sm text-indigo-600 hover:underline">
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [recentFileName, setRecentFileName] = useState(() => localStorage.getItem('lister-recent-filename') ?? '');
  const [page, setPage] = useState<Page>('lists');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [templateToLoad, setTemplateToLoad] = useState<EmailTemplate | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    method: EncryptionMethod; salt: Uint8Array; fileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsApi = hasFileSystemApi();

  const handleOpenResult = (result: OpenResult) => {
    if (result.status === 'needs-auth') {
      setPendingAuth({ method: result.method, salt: result.salt, fileName: result.fileName });
      return false; // caller should not set status='ready'
    }
    setFileName(result.fileName);
    saveRecentFile(result.fileName);
    return true;
  };

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
              const result = await openDatabaseFromFile(handle);
              if (result.status === 'needs-auth') {
                setStatus('welcome');
                setPendingAuth({ method: result.method, salt: result.salt, fileName: result.fileName });
                return;
              }
              setFileName(result.fileName);
              saveRecentFile(result.fileName);
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
      if (!handleOpenResult(result)) return;
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
          const result = await openDatabaseFromFile(handle);
          if (!handleOpenResult(result)) return;
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
      if (!handleOpenResult(result)) return;
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
    setTemplateToLoad(null);
    setPendingAuth(null);
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
      <>
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
        {pendingAuth && (
          <PasswordPrompt
            method={pendingAuth.method}
            salt={pendingAuth.salt}
            fileName={pendingAuth.fileName}
            onSuccess={(result) => {
              setFileName(result.fileName);
              saveRecentFile(result.fileName);
              setPendingAuth(null);
              setStatus('ready');
            }}
            onCancel={() => setPendingAuth(null)}
          />
        )}
      </>
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
            templateToLoad={templateToLoad}
            onTemplateLoaded={() => setTemplateToLoad(null)}
            onBack={() => navigate('campaigns')}
            onSaved={(id) => setSelectedCampaignId(id)}
          />
        );
      case 'subscribers':
        return <SubscribersPage />;
      case 'themes':
        return <ThemesPage />;
      case 'templates':
        return (
          <TemplatesPage
            onUseTemplate={(t) => {
              setTemplateToLoad(t);
              setSelectedCampaignId(null);
              setPage('campaign-editor');
            }}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'sender-profiles':
        return <SenderProfilesPage />;
      default:
        return null;
    }
  };

  return (
    <SettingsProvider>
    <ErrorBoundary>
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
      >
        {renderPage()}
      </Layout>
    </ErrorBoundary>
    </SettingsProvider>
  );
}

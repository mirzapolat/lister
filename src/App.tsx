import { useState, useEffect, useRef, useCallback, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  promptOpenFile, promptSaveNewFile, initSqlJs_,
  hasFileSystemApi, openDatabaseFromFileInput, createNewDatabaseFallback, downloadDatabase,
  getStoredFileHandle, openDatabaseFromFile, closeDatabase, clearStoredFileHandle,
  openDatabaseFromBytes, setActiveWorkspaceId, saveDatabaseElectron, disableEncryption,
} from './db/database';
import type { OpenResult } from './db/database';
import type { EncryptionMethod } from './db/crypto';
import { isElectron } from './lib/platform';
import { PasswordPrompt } from './components/ui/PasswordPrompt';
import { Layout } from './components/Layout';
import { SettingsProvider } from './context/SettingsContext';
import { AppPreferencesModal } from './components/AppPreferencesModal';
import { LandingPage } from './components/LandingPage';
import { WorkspaceManager } from './components/WorkspaceManager';
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
  const [page, setPage] = useState<Page>('lists');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [templateToLoad, setTemplateToLoad] = useState<EmailTemplate | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    method: EncryptionMethod; salt: Uint8Array; fileName: string;
  } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [pendingSelectorAction, setPendingSelectorAction] = useState<'open' | 'remove-encryption'>('open');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [autoCreateWorkspaceSignal, setAutoCreateWorkspaceSignal] = useState(0);
  const [workspaceRefreshSignal, setWorkspaceRefreshSignal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsApi = hasFileSystemApi();

  // ── Shared helpers ──────────────────────────────────────────────────────────

  const handleOpenResult = (result: OpenResult) => {
    if (result.status === 'needs-auth') {
      setPendingAuth({ method: result.method, salt: result.salt, fileName: result.fileName });
      return false;
    }
    setFileName(result.fileName);
    saveRecentFile(result.fileName);
    return true;
  };

  const saveRecentFile = (name: string) => {
    localStorage.setItem('lister-recent-filename', name);
  };

  const navigate = useCallback((p: Page) => {
    setPage(p);
    if (p !== 'list-detail') setSelectedListId(null);
    if (p !== 'campaign-editor') setSelectedCampaignId(null);
  }, []);

  const handleUnload = async () => {
    // Flush save in Electron
    if (workspaceId && window.electronAPI) {
      try { await saveDatabaseElectron(workspaceId); } catch { /* ignore */ }
    }
    closeDatabase();
    setActiveWorkspaceId(null);
    setWorkspaceId(null);
    if (!isElectron()) await clearStoredFileHandle();
    localStorage.removeItem('lister-recent-filename');
    setStatus('welcome');
    setFileName('');
    setPage('lists');
    setSelectedListId(null);
    setSelectedCampaignId(null);
    setTemplateToLoad(null);
    setPendingAuth(null);
  };

  const returnToWorkspaceLibrary = async () => {
    if (status === 'ready') {
      await handleUnload();
    } else if (status !== 'welcome') {
      setStatus('welcome');
    }
  };

  const prepareForElectronWorkspaceChange = async () => {
    if (workspaceId && window.electronAPI) {
      try { await saveDatabaseElectron(workspaceId); } catch { /* ignore */ }
    }
    closeDatabase();
    setActiveWorkspaceId(null);
    setWorkspaceId(null);
    setFileName('');
    setPage('lists');
    setSelectedListId(null);
    setSelectedCampaignId(null);
    setTemplateToLoad(null);
    setPendingAuth(null);
  };

  const finishElectronSelectorRemoveEncryption = async (id: string) => {
    await disableEncryption();
    await saveDatabaseElectron(id);
    closeDatabase();
    setActiveWorkspaceId(null);
    setWorkspaceId(null);
    setFileName('');
    setPage('lists');
    setSelectedListId(null);
    setSelectedCampaignId(null);
    setTemplateToLoad(null);
    setPendingAuth(null);
    setPendingSelectorAction('open');
    setStatus('welcome');
    setWorkspaceRefreshSignal((value) => value + 1);
  };

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    initSqlJs_().then(async () => {
      if (isElectron()) {
        // Electron: go straight to workspace manager
        setStatus('welcome');
        return;
      }
      // Browser: try to restore file handle
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
                return;
              }
              setFileName(result.fileName);
              saveRecentFile(result.fileName);
              setStatus('ready');
              return;
            }
          }
        } catch { /* stale handle — fall through */ }
      }
      setStatus('welcome');
    }).catch((e) => { setError(String(e)); setStatus('error'); });
  }, []);

  // ── Menu action listener (Electron) ─────────────────────────────────────────

  useEffect(() => {
    if (!isElectron()) return;
    const menuContext = status === 'ready'
      ? 'workspace'
      : status === 'onboarding' && workspaceId !== null
        ? 'onboarding'
        : 'selector';
    window.electronAPI!.setMenuContext(menuContext).catch(console.error);
  }, [status, workspaceId]);

  useEffect(() => {
    if (!isElectron()) return;
    const unsub = window.electronAPI!.onMenuAction((action) => {
      if (action.startsWith('open-workspace-id:')) {
        const id = action.replace('open-workspace-id:', '');
        void handleElectronOpen(id);
        return;
      }

      switch (action) {
        case 'save':
          if (workspaceId) saveDatabaseElectron(workspaceId).catch(console.error);
          break;
        case 'close-workspace':
          void returnToWorkspaceLibrary();
          break;
        case 'new-workspace':
          void (async () => {
            await returnToWorkspaceLibrary();
            setAutoCreateWorkspaceSignal((value) => value + 1);
          })();
          break;
        case 'open-workspace':
          void handleElectronImport();
          break;
        case 'import-workspace':
          void handleElectronImport();
          break;
        case 'export-workspace':
          if (workspaceId) window.electronAPI!.exportWorkspace(workspaceId);
          break;
        case 'preferences':
          setPreferencesOpen(true);
          break;
        case 'toggle-sidebar':
          // Dispatch a custom event the Layout component listens for
          window.dispatchEvent(new CustomEvent('lister:toggle-sidebar'));
          break;
        default:
          if (action.startsWith('navigate:') && status === 'ready') {
            navigate(action.replace('navigate:', '') as Page);
          }
      }
    });
    return unsub;
  }); // intentionally no deps — always gets latest closures

  // ── Electron workspace handlers ─────────────────────────────────────────────

  const handleElectronOpen = async (id: string) => {
    try {
      setError('');
      setPendingSelectorAction('open');
      if (workspaceId !== id || status !== 'ready') {
        await prepareForElectronWorkspaceChange();
      }
      const data = await window.electronAPI!.openWorkspace(id);
      const result = await openDatabaseFromBytes(data.bytes);
      if (result.status === 'needs-auth') {
        setPendingAuth({ method: result.method, salt: result.salt, fileName: data.name });
        setWorkspaceId(id);
        return;
      }
      setWorkspaceId(id);
      setActiveWorkspaceId(id);
      setFileName(data.name);
      saveRecentFile(data.name);
      setStatus('ready');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleElectronRemoveEncryption = async (id: string) => {
    try {
      setError('');
      setPendingSelectorAction('remove-encryption');
      await prepareForElectronWorkspaceChange();
      const confirmed = await window.electronAPI!.confirmDialog(
        'Remove Encryption',
        'Unlock this workspace and save it unencrypted?',
      );
      if (!confirmed) {
        setPendingSelectorAction('open');
        return;
      }
      const data = await window.electronAPI!.openWorkspace(id);
      const result = await openDatabaseFromBytes(data.bytes);
      if (result.status === 'needs-auth') {
        setPendingAuth({ method: result.method, salt: result.salt, fileName: data.name });
        setWorkspaceId(id);
        return;
      }
      await finishElectronSelectorRemoveEncryption(id);
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleElectronCreate = async (name: string) => {
    try {
      setError('');
      const ws = await window.electronAPI!.createWorkspace(name);
      const result = await openDatabaseFromBytes(new Uint8Array(0));
      if (result.status !== 'ok') return;
      setWorkspaceId(ws.id);
      setActiveWorkspaceId(ws.id);
      setFileName(ws.name);
      // Save initial schema
      await saveDatabaseElectron(ws.id);
      setStatus('onboarding');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  };

  const handleElectronImport = async (): Promise<string | null> => {
    try {
      const ws = await window.electronAPI!.importWorkspace();
      if (!ws) return null;
      await handleElectronOpen(ws.id);
      return ws.id;
    } catch (e) {
      setError(String(e));
      return null;
    }
  };

  // ── Browser file handlers (unchanged) ───────────────────────────────────────

  const handleOpenFile = async () => {
    if (!fsApi) { fileInputRef.current?.click(); return; }
    try {
      setError('');
      const result = await promptOpenFile();
      if (!result) return;
      if (!handleOpenResult(result)) return;
      setStatus('ready');
    } catch (e) { setError(String(e)); setStatus('error'); }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const result = await openDatabaseFromFileInput(file);
      if (!handleOpenResult(result)) return;
      setStatus('ready');
    } catch (e) { setError(String(e)); setStatus('error'); }
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
    } catch (e) { setError(String(e)); setStatus('error'); }
  };

  const handleSave = () => { downloadDatabase(); };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderContent = () => {
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
            <button onClick={() => setStatus('welcome')} className="mt-4 text-sm text-indigo-600 hover:underline">
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
      if (isElectron()) {
        return (
          <>
            <WorkspaceManager
              autoCreateSignal={autoCreateWorkspaceSignal}
              refreshSignal={workspaceRefreshSignal}
              onOpen={handleElectronOpen}
              onCreate={handleElectronCreate}
              onImport={handleElectronImport}
              onRemoveEncryption={handleElectronRemoveEncryption}
              onOpenPreferences={() => setPreferencesOpen(true)}
            />
            {pendingAuth && (
              <PasswordPrompt
                method={pendingAuth.method}
                salt={pendingAuth.salt}
                fileName={pendingAuth.fileName}
                onSuccess={(result) => {
                  void (async () => {
                    try {
                      if (workspaceId && pendingSelectorAction === 'remove-encryption') {
                        await finishElectronSelectorRemoveEncryption(workspaceId);
                        return;
                      }
                      setFileName(result.fileName);
                      if (workspaceId) setActiveWorkspaceId(workspaceId);
                      setPendingAuth(null);
                      setPendingSelectorAction('open');
                      setStatus('ready');
                    } catch (e) {
                      setError(String(e));
                      setStatus('error');
                    }
                  })();
                }}
                onCancel={() => {
                  setPendingAuth(null);
                  setWorkspaceId(null);
                  setPendingSelectorAction('open');
                }}
              />
            )}
          </>
        );
      }

      return (
        <>
          <LandingPage
            onOpenFile={handleOpenFile}
            onNewFile={handleNewFile}
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

    // ── Ready state ───────────────────────────────────────────────────────────

    const renderPage = () => {
      switch (page) {
        case 'lists':
          return (
            <ListsPage onSelectList={(id) => { setSelectedListId(id); setPage('list-detail'); }} />
          );
        case 'list-detail':
          return selectedListId ? (
            <ListDetailPage listId={selectedListId} onBack={() => navigate('lists')} />
          ) : null;
        case 'campaigns':
          return (
            <CampaignsPage
              onCreateCampaign={() => { setSelectedCampaignId(null); setPage('campaign-editor'); }}
              onEditCampaign={(id) => { setSelectedCampaignId(id); setPage('campaign-editor'); }}
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
        case 'subscribers': return <SubscribersPage />;
        case 'themes': return <ThemesPage />;
        case 'templates':
          return (
            <TemplatesPage
              onUseTemplate={(t) => { setTemplateToLoad(t); setSelectedCampaignId(null); setPage('campaign-editor'); }}
            />
          );
        case 'settings': return <SettingsPage onOpenPreferences={() => setPreferencesOpen(true)} />;
        case 'sender-profiles': return <SenderProfilesPage />;
        default: return null;
      }
    };

    const usesIntegratedTitleBar = page === 'campaign-editor'
      || page === 'templates'
      || page === 'themes'
      || page === 'settings'
      || page === 'sender-profiles';

    return (
      <Layout
        currentPage={page}
        fileName={fileName}
        onNavigate={navigate}
        onSave={!isElectron() && !fsApi ? handleSave : undefined}
        onUnload={handleUnload}
        onOpenPreferences={() => setPreferencesOpen(true)}
        showContentDragBar={!usesIntegratedTitleBar}
      >
        {renderPage()}
      </Layout>
    );
  };

  return (
    <SettingsProvider>
      <ErrorBoundary>
        {!isElectron() && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.db"
            className="hidden"
            onChange={handleFileInputChange}
          />
        )}
        {renderContent()}
        <AppPreferencesModal isOpen={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      </ErrorBoundary>
    </SettingsProvider>
  );
}

import { app, BrowserWindow, shell, ipcMain, dialog, Menu, screen } from 'electron';
import { join, basename, dirname, extname, resolve, sep } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, copyFileSync, statSync, readdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { startServer, type StartedServer } from '../server/index';

const isDev = !app.isPackaged;
const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 640;
const SUPPORTED_WORKSPACE_EXTENSIONS = new Set(['.sqlite', '.db']);

const userDataPath = app.getPath('userData');
const workspacesDir = join(userDataPath, 'workspaces');
const metadataPath = join(userDataPath, 'workspaces.json');
const windowStatePath = join(userDataPath, 'window-state.json');

interface WorkspaceMeta {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  lastOpenedAt: string;
  sizeBytes: number;
  isProtected: boolean;
  sourcePath?: string;
}

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

type MenuContext = 'selector' | 'workspace' | 'onboarding';

let mainWindow: BrowserWindow | null = null;
let localServer: StartedServer | null = null;
let rendererReady = false;
let rendererUrl = 'http://localhost:5173';
let currentMenuContext: MenuContext = 'selector';
const pendingExternalWorkspacePaths: string[] = [];
const queuedRendererActions: string[] = [];

function ensureDirs(): void {
  mkdirSync(workspacesDir, { recursive: true });
}

function isWorkspaceFilePath(filePath: string): boolean {
  return existsSync(filePath) && SUPPORTED_WORKSPACE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function inferWorkspaceName(filePath: string): string {
  return basename(filePath, extname(filePath)) || 'Workspace';
}

function isProtectedWorkspaceFile(filePath: string): boolean {
  try {
    const bytes = readFileSync(filePath);
    if (bytes.length < 7) return false;
    return bytes.subarray(0, 7).equals(Buffer.from('LISTER1'));
  } catch {
    return false;
  }
}

function sortMetadata(data: WorkspaceMeta[]): WorkspaceMeta[] {
  return [...data].sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt));
}

function readMetadataFile(): WorkspaceMeta[] | null {
  if (!existsSync(metadataPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((entry): entry is WorkspaceMeta =>
        !!entry &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.fileName === 'string' &&
        typeof entry.filePath === 'string')
      .map((entry) => ({
        ...entry,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
        lastOpenedAt: typeof entry.lastOpenedAt === 'string' ? entry.lastOpenedAt : new Date().toISOString(),
        sizeBytes: typeof entry.sizeBytes === 'number' ? entry.sizeBytes : 0,
        isProtected: typeof entry.isProtected === 'boolean'
          ? entry.isProtected
          : isProtectedWorkspaceFile(entry.filePath),
      }));
  } catch {
    return null;
  }
}

function saveMetadata(data: WorkspaceMeta[]): void {
  writeFileSync(metadataPath, JSON.stringify(sortMetadata(data), null, 2), 'utf-8');
}

function loadMetadata(): WorkspaceMeta[] {
  ensureDirs();
  const parsed = readMetadataFile();
  const existingByPath = new Map(
    (parsed ?? []).map((entry) => [resolve(entry.filePath), entry] as const),
  );

  const recovered = readdirSync(workspacesDir)
    .filter((fileName) => SUPPORTED_WORKSPACE_EXTENSIONS.has(extname(fileName).toLowerCase()))
    .map((fileName) => {
      const filePath = join(workspacesDir, fileName);
      const stat = statSync(filePath);
      const existing = existingByPath.get(resolve(filePath));
      return {
        id: existing?.id ?? (basename(fileName, extname(fileName)) || randomUUID()),
        name: existing?.name ?? inferWorkspaceName(fileName),
        fileName,
        filePath,
        createdAt: existing?.createdAt ?? stat.birthtime.toISOString(),
        lastOpenedAt: existing?.lastOpenedAt ?? stat.mtime.toISOString(),
        sizeBytes: stat.size,
        isProtected: isProtectedWorkspaceFile(filePath),
        sourcePath: existing?.sourcePath,
      } satisfies WorkspaceMeta;
    });

  const sortedRecovered = sortMetadata(recovered);
  if (parsed === null || JSON.stringify(parsed) !== JSON.stringify(sortedRecovered)) {
    saveMetadata(sortedRecovered);
  }

  return sortedRecovered;
}

function upsertWorkspaceMeta(entry: WorkspaceMeta): WorkspaceMeta {
  const meta = loadMetadata().filter((workspace) => workspace.id !== entry.id);
  meta.unshift(entry);
  saveMetadata(meta);
  return entry;
}

function importWorkspaceFromPath(sourcePath: string): WorkspaceMeta {
  const resolvedSourcePath = resolve(sourcePath);
  if (!isWorkspaceFilePath(resolvedSourcePath)) {
    throw new Error('Selected file is not a supported SQLite workspace.');
  }

  const now = new Date().toISOString();
  const meta = loadMetadata();

  const existingManaged = meta.find((workspace) => resolve(workspace.filePath) === resolvedSourcePath);
  if (existingManaged) {
    return upsertWorkspaceMeta({
      ...existingManaged,
      lastOpenedAt: now,
      sizeBytes: statSync(existingManaged.filePath).size,
      isProtected: isProtectedWorkspaceFile(existingManaged.filePath),
    });
  }

  const existingBySource = meta.find((workspace) =>
    workspace.sourcePath && resolve(workspace.sourcePath) === resolvedSourcePath && existsSync(workspace.filePath));

  if (existingBySource) {
    copyFileSync(resolvedSourcePath, existingBySource.filePath);
    return upsertWorkspaceMeta({
      ...existingBySource,
      name: inferWorkspaceName(resolvedSourcePath),
      lastOpenedAt: now,
      sizeBytes: statSync(existingBySource.filePath).size,
      isProtected: isProtectedWorkspaceFile(existingBySource.filePath),
    });
  }

  const managedDirectoryPrefix = `${resolve(workspacesDir)}${sep}`;
  const isManagedSource = resolvedSourcePath.startsWith(managedDirectoryPrefix);
  const id = isManagedSource ? basename(resolvedSourcePath, extname(resolvedSourcePath)) || randomUUID() : randomUUID();
  const fileName = isManagedSource ? basename(resolvedSourcePath) : `${id}.sqlite`;
  const filePath = isManagedSource ? resolvedSourcePath : join(workspacesDir, fileName);

  if (!isManagedSource) {
    copyFileSync(resolvedSourcePath, filePath);
  }

  return upsertWorkspaceMeta({
    id,
    name: inferWorkspaceName(resolvedSourcePath),
    fileName,
    filePath,
    createdAt: now,
    lastOpenedAt: now,
    sizeBytes: statSync(filePath).size,
    isProtected: isProtectedWorkspaceFile(filePath),
    sourcePath: isManagedSource ? undefined : resolvedSourcePath,
  });
}

function getImportDialogPath(): string {
  const metadata = loadMetadata();
  const latestExternalDirectory = metadata
    .map((workspace) => workspace.sourcePath)
    .filter((sourcePath): sourcePath is string => typeof sourcePath === 'string')
    .map((sourcePath) => dirname(sourcePath))
    .find((directoryPath) => existsSync(directoryPath));

  return latestExternalDirectory ?? app.getPath('documents');
}

function sanitizeWindowState(state: WindowState): WindowState {
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  const width = Math.min(Math.max(state.width || 1280, MIN_WINDOW_WIDTH), primaryWorkArea.width);
  const height = Math.min(Math.max(state.height || 800, MIN_WINDOW_HEIGHT), primaryWorkArea.height);

  if (state.x === undefined || state.y === undefined) {
    return { width, height, isMaximized: Boolean(state.isMaximized) };
  }

  const visible = screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    const horizontalOverlap = Math.min(state.x + width, area.x + area.width) - Math.max(state.x, area.x);
    const verticalOverlap = Math.min(state.y + height, area.y + area.height) - Math.max(state.y, area.y);
    return horizontalOverlap > 120 && verticalOverlap > 120;
  });

  if (!visible) {
    return { width, height, isMaximized: Boolean(state.isMaximized) };
  }

  return { x: state.x, y: state.y, width, height, isMaximized: Boolean(state.isMaximized) };
}

function loadWindowState(): WindowState {
  try {
    if (existsSync(windowStatePath)) {
      return sanitizeWindowState(JSON.parse(readFileSync(windowStatePath, 'utf-8')));
    }
  } catch {
    // ignore bad state and fall back to defaults
  }
  return { width: 1280, height: 800, isMaximized: false };
}

function saveWindowState(win: BrowserWindow): void {
  const bounds = win.getBounds();
  writeFileSync(windowStatePath, JSON.stringify({
    ...bounds,
    isMaximized: win.isMaximized(),
  } satisfies WindowState), 'utf-8');
}

function focusMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function dispatchRendererAction(action: string): void {
  if (mainWindow && rendererReady) {
    mainWindow.webContents.send('menu:action', action);
    return;
  }
  queuedRendererActions.push(action);
}

function flushQueuedRendererActions(): void {
  if (!mainWindow || !rendererReady) return;
  while (queuedRendererActions.length > 0) {
    mainWindow.webContents.send('menu:action', queuedRendererActions.shift()!);
  }
}

async function processPendingExternalWorkspacePaths(): Promise<void> {
  const paths = [...new Set(pendingExternalWorkspacePaths.splice(0))];
  for (const filePath of paths) {
    if (!isWorkspaceFilePath(filePath)) continue;
    try {
      const workspace = importWorkspaceFromPath(filePath);
      focusMainWindow();
      dispatchRendererAction(`open-workspace-id:${workspace.id}`);
    } catch (error) {
      dialog.showErrorBox(
        'Unable to open workspace',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

function registerIPC(): void {
  ipcMain.handle('workspace:list', () => loadMetadata());

  ipcMain.handle('workspace:create', (_event, name: string) => {
    const id = randomUUID();
    const fileName = `${id}.sqlite`;
    const filePath = join(workspacesDir, fileName);
    writeFileSync(filePath, Buffer.alloc(0));
    return upsertWorkspaceMeta({
      id,
      name,
      fileName,
      filePath,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      sizeBytes: 0,
      isProtected: false,
    });
  });

  ipcMain.handle('workspace:open', (_event, id: string) => {
    const meta = loadMetadata();
    const entry = meta.find((workspace) => workspace.id === id);
    if (!entry) throw new Error('Workspace not found');
    const nextEntry = upsertWorkspaceMeta({
      ...entry,
      lastOpenedAt: new Date().toISOString(),
      sizeBytes: existsSync(entry.filePath) ? statSync(entry.filePath).size : 0,
      isProtected: existsSync(entry.filePath) ? isProtectedWorkspaceFile(entry.filePath) : false,
    });
    const bytes = existsSync(nextEntry.filePath) ? readFileSync(nextEntry.filePath) : Buffer.alloc(0);
    return { id: nextEntry.id, name: nextEntry.name, bytes: new Uint8Array(bytes) };
  });

  ipcMain.handle('workspace:save', (_event, id: string, bytes: Uint8Array) => {
    const meta = loadMetadata();
    const entry = meta.find((workspace) => workspace.id === id);
    if (!entry) throw new Error('Workspace not found');
    writeFileSync(entry.filePath, Buffer.from(bytes));
    upsertWorkspaceMeta({
      ...entry,
      sizeBytes: bytes.length,
      isProtected: isProtectedWorkspaceFile(entry.filePath),
    });
  });

  ipcMain.handle('workspace:rename', (_event, id: string, name: string) => {
    const meta = loadMetadata();
    const entry = meta.find((workspace) => workspace.id === id);
    if (!entry) throw new Error('Workspace not found');
    upsertWorkspaceMeta({ ...entry, name });
  });

  ipcMain.handle('workspace:delete', (_event, id: string) => {
    const meta = loadMetadata();
    const entry = meta.find((workspace) => workspace.id === id);
    if (!entry) return;
    try { unlinkSync(entry.filePath); } catch { /* already gone */ }
    saveMetadata(meta.filter((workspace) => workspace.id !== id));
  });

  ipcMain.handle('workspace:export', async (_event, id: string) => {
    const meta = loadMetadata();
    const entry = meta.find((workspace) => workspace.id === id);
    if (!entry) throw new Error('Workspace not found');
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    const result = await dialog.showSaveDialog(win ?? undefined, {
      defaultPath: `${entry.name}.sqlite`,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    });
    if (result.canceled || !result.filePath) return false;
    copyFileSync(entry.filePath, result.filePath);
    return true;
  });

  ipcMain.handle('workspace:import', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    const result = await dialog.showOpenDialog(win ?? undefined, {
      defaultPath: getImportDialogPath(),
      filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return importWorkspaceFromPath(result.filePaths[0]);
  });
  ipcMain.handle('workspace:import-path', (_event, filePath: string) => {
    return importWorkspaceFromPath(filePath);
  });

  ipcMain.handle('workspace:get-path', () => workspacesDir);
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:set-menu-context', (_event, context: MenuContext) => {
    currentMenuContext = context;
    buildMenu();
  });
  ipcMain.handle('dialog:confirm', async (_event, title: string, message: string) => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
    const result = await dialog.showMessageBox(win ?? undefined, {
      type: 'warning',
      buttons: ['Cancel', 'Confirm'],
      defaultId: 0,
      cancelId: 0,
      title,
      message,
    });
    return result.response === 1;
  });
}

function sendMenuAction(action: string): void {
  focusMainWindow();
  dispatchRendererAction(action);
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const fileMenu: Electron.MenuItemConstructorOptions[] = [
    { label: 'New Workspace', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new-workspace') },
  ];

  if (currentMenuContext === 'selector') {
    fileMenu.push(
      { label: 'Import Workspace...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('import-workspace') },
    );
  } else {
    fileMenu.push(
      { label: 'Open Workspace...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('open-workspace') },
      { type: 'separator' },
      { label: 'Close Workspace', accelerator: 'CmdOrCtrl+W', click: () => sendMenuAction('close-workspace') },
      { type: 'separator' },
      { label: 'Export Workspace...', click: () => sendMenuAction('export-workspace') },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save') },
    );
  }

  const viewMenu: Electron.MenuItemConstructorOptions[] = [];
  if (currentMenuContext === 'workspace') {
    viewMenu.push(
      { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: () => sendMenuAction('toggle-sidebar') },
      { type: 'separator' },
    );
  }
  if (isDev) {
    viewMenu.push(
      { role: 'reload' as const },
      { role: 'toggleDevTools' as const },
      { type: 'separator' as const },
    );
  }
  viewMenu.push(
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  );

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { label: 'Preferences...', accelerator: 'Cmd+,' as const, click: () => sendMenuAction('preferences') },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'File',
      submenu: fileMenu,
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: viewMenu,
    },
    ...(currentMenuContext === 'workspace'
      ? [{
        label: 'Go',
        submenu: [
          { label: 'Lists', accelerator: 'CmdOrCtrl+1', click: () => sendMenuAction('navigate:lists') },
          { label: 'Subscribers', accelerator: 'CmdOrCtrl+2', click: () => sendMenuAction('navigate:subscribers') },
          { label: 'Campaigns', accelerator: 'CmdOrCtrl+3', click: () => sendMenuAction('navigate:campaigns') },
          { label: 'Templates', accelerator: 'CmdOrCtrl+4', click: () => sendMenuAction('navigate:templates') },
          { label: 'Themes', accelerator: 'CmdOrCtrl+5', click: () => sendMenuAction('navigate:themes') },
          { label: 'Sender Profiles', accelerator: 'CmdOrCtrl+6', click: () => sendMenuAction('navigate:sender-profiles') },
          { label: 'Settings', accelerator: 'CmdOrCtrl+7', click: () => sendMenuAction('navigate:settings') },
        ],
      }] satisfies Electron.MenuItemConstructorOptions[]
      : []),
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function getRendererPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'out', 'renderer')
    : join(__dirname, '..', '..', 'out', 'renderer');
}

function getAppIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app.asar.unpacked', 'out', 'renderer', 'icon-512.png');
  }
  const buildIconPath = join(process.cwd(), 'build', 'icon.png');
  return existsSync(buildIconPath) ? buildIconPath : join(process.cwd(), 'public', 'icon-512.png');
}

function createWindow(): void {
  const state = loadWindowState();
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(state.x !== undefined && state.y !== undefined ? { x: state.x, y: state.y } : {}),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1a1f2e',
    ...(process.platform !== 'darwin' && existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'Lister',
    show: false,
  });

  if (state.isMaximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  let saveTimeout: ReturnType<typeof setTimeout>;
  const debouncedSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (mainWindow) saveWindowState(mainWindow);
    }, 500);
  };

  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);
  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

  const appOrigin = new URL(rendererUrl).origin;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    rendererReady = true;
    flushQueuedRendererActions();
    void processPendingExternalWorkspacePaths();
  });

  mainWindow.loadURL(rendererUrl);

  mainWindow.on('closed', () => {
    rendererReady = false;
    mainWindow = null;
  });
}

function collectWorkspacePathsFromArgv(argv: string[]): string[] {
  return argv.filter((arg) => isWorkspaceFilePath(arg));
}

app.setAboutPanelOptions({
  applicationName: 'Lister',
  applicationVersion: app.getVersion(),
  copyright: 'Local-first newsletter management.\nAll data stays on your device.',
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    pendingExternalWorkspacePaths.push(...collectWorkspacePathsFromArgv(argv));
    focusMainWindow();
    void processPendingExternalWorkspacePaths();
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (!isWorkspaceFilePath(filePath)) return;
    pendingExternalWorkspacePaths.push(filePath);
    if (app.isReady()) {
      focusMainWindow();
      void processPendingExternalWorkspacePaths();
    }
  });

  app.whenReady().then(async () => {
    try {
      ensureDirs();
      registerIPC();
      buildMenu();

      if (process.platform === 'darwin' && !app.isPackaged && existsSync(getAppIconPath())) {
        app.dock.setIcon(getAppIconPath());
      }

      pendingExternalWorkspacePaths.push(...collectWorkspacePathsFromArgv(process.argv));

      if (!isDev) {
        localServer = await startServer({
          port: 0,
          host: '127.0.0.1',
          staticPath: getRendererPath(),
        });
        rendererUrl = localServer.url;
      }

      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
        else focusMainWindow();
      });
    } catch (error) {
      dialog.showErrorBox(
        'Lister failed to start',
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (localServer) {
    void localServer.stop().catch((error) => {
      console.error('[Lister backend] Failed to stop cleanly:', error);
    });
  }
});

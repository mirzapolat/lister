import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace CRUD
  listWorkspaces: () => ipcRenderer.invoke('workspace:list'),
  createWorkspace: (name: string) => ipcRenderer.invoke('workspace:create', name),
  openWorkspace: (id: string) => ipcRenderer.invoke('workspace:open', id),
  saveWorkspace: (id: string, bytes: Uint8Array) => ipcRenderer.invoke('workspace:save', id, bytes),
  renameWorkspace: (id: string, name: string) => ipcRenderer.invoke('workspace:rename', id, name),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('workspace:delete', id),
  exportWorkspace: (id: string) => ipcRenderer.invoke('workspace:export', id),
  importWorkspace: () => ipcRenderer.invoke('workspace:import'),
  importWorkspaceFromPath: (filePath: string) => ipcRenderer.invoke('workspace:import-path', filePath),

  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getDataPath: () => ipcRenderer.invoke('workspace:get-path'),
  setMenuContext: (context: 'selector' | 'workspace' | 'onboarding') => ipcRenderer.invoke('app:set-menu-context', context),

  // Native dialogs
  confirmDialog: (title: string, message: string) =>
    ipcRenderer.invoke('dialog:confirm', title, message),

  // Menu actions (main → renderer)
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('menu:action', handler);
    return () => { ipcRenderer.removeListener('menu:action', handler); };
  },

  // Platform
  platform: process.platform,
});

export interface WorkspaceMeta {
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

export interface ElectronAPI {
  listWorkspaces(): Promise<WorkspaceMeta[]>;
  createWorkspace(name: string): Promise<WorkspaceMeta>;
  openWorkspace(id: string): Promise<{ id: string; name: string; bytes: Uint8Array }>;
  saveWorkspace(id: string, bytes: Uint8Array): Promise<void>;
  renameWorkspace(id: string, name: string): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  exportWorkspace(id: string): Promise<boolean>;
  importWorkspace(): Promise<WorkspaceMeta | null>;
  importWorkspaceFromPath(filePath: string): Promise<WorkspaceMeta>;
  getVersion(): Promise<string>;
  getDataPath(): Promise<string>;
  setMenuContext(context: 'selector' | 'workspace' | 'onboarding'): Promise<void>;
  confirmDialog(title: string, message: string): Promise<boolean>;
  onMenuAction(callback: (action: string) => void): () => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

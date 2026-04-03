import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, MoreHorizontal, FolderOpen, Pencil, Download, Trash2, Database, Send, Clock, Heart, Lock, ArrowUpDown, Settings, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import type { WorkspaceMeta } from '../types/electron';

const STRIPE_LINK = 'https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03';

interface WorkspaceManagerProps {
  autoCreateSignal?: number;
  refreshSignal?: number;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onImport: () => void;
  onRemoveEncryption: (id: string) => Promise<void>;
  onOpenPreferences: () => void;
}

type WorkspaceSortMode = 'last-used' | 'created' | 'name' | 'size';

const SORT_LABELS: Record<WorkspaceSortMode, string> = {
  'last-used': 'Last used',
  created: 'Created',
  name: 'Name',
  size: 'Size',
};

const SORT_ORDER: WorkspaceSortMode[] = ['last-used', 'created', 'name', 'size'];
const DROP_EXTENSIONS = ['.sqlite', '.db'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatSize(bytes: number): string {
  if (bytes === 0) return 'Empty';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getNextSortMode(current: WorkspaceSortMode): WorkspaceSortMode {
  const index = SORT_ORDER.indexOf(current);
  return SORT_ORDER[(index + 1) % SORT_ORDER.length];
}

function sortWorkspaces(workspaces: WorkspaceMeta[], sortMode: WorkspaceSortMode): WorkspaceMeta[] {
  const sorted = [...workspaces];
  switch (sortMode) {
    case 'created':
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      break;
    case 'size':
      sorted.sort((a, b) => b.sizeBytes - a.sizeBytes || Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt));
      break;
    case 'last-used':
    default:
      sorted.sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt));
      break;
  }
  return sorted;
}

export function WorkspaceManager({
  autoCreateSignal = 0,
  refreshSignal = 0,
  onOpen,
  onCreate,
  onImport,
  onRemoveEncryption,
  onOpenPreferences,
}: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dropError, setDropError] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceMeta | null>(null);
  const [sortMode, setSortMode] = useState<WorkspaceSortMode>(() => {
    const stored = localStorage.getItem('lister-workspace-sort');
    return stored && SORT_ORDER.includes(stored as WorkspaceSortMode)
      ? stored as WorkspaceSortMode
      : 'last-used';
  });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);

  const api = window.electronAPI!;

  const refresh = async () => {
    const list = await api.listWorkspaces();
    setWorkspaces(list);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (creating) nameInputRef.current?.focus(); }, [creating]);
  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);
  useEffect(() => {
    if (autoCreateSignal > 0) setCreating(true);
  }, [autoCreateSignal]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('lister-workspace-sort', sortMode);
  }, [sortMode]);

  const handleCreate = () => {
    const name = newName.trim() || 'Untitled Workspace';
    setCreating(false);
    setNewName('');
    onCreate(name);
  };

  const handleRename = async (id: string) => {
    const name = editingName.trim();
    if (!name) { setEditingId(null); return; }
    await api.renameWorkspace(id, name);
    setEditingId(null);
    setEditingName('');
    refresh();
  };

  const handleDelete = (ws: WorkspaceMeta) => {
    setDeleteTarget(ws);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await api.deleteWorkspace(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  const handleExport = async (id: string) => {
    await api.exportWorkspace(id);
    setMenuOpenId(null);
  };

  const getDroppedWorkspacePath = (event: React.DragEvent<HTMLDivElement>): string | null => {
    const files = Array.from(event.dataTransfer.files) as Array<File & { path?: string }>;
    const match = files.find((file) => {
      const lower = (file.path ?? file.name).toLowerCase();
      return DROP_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });
    return match?.path ?? null;
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
    setDropError('');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragActive(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    setDropError('');

    const filePath = getDroppedWorkspacePath(event);
    if (!filePath) {
      setDropError('Drop a .sqlite or .db workspace file to import it.');
      return;
    }

    try {
      const workspace = await api.importWorkspaceFromPath(filePath);
      await refresh();
      onOpen(workspace.id);
    } catch (error) {
      setDropError(error instanceof Error ? error.message : 'Could not import that workspace file.');
    }
  };

  const sortedWorkspaces = sortWorkspaces(workspaces, sortMode);

  return (
    <div
      className="relative h-screen flex bg-gray-50 dark:bg-gray-900 select-none"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-indigo-950/10 backdrop-blur-[1px]">
          <div className="rounded-2xl border-2 border-dashed border-indigo-400 bg-white/95 px-8 py-10 text-center shadow-xl dark:border-indigo-500/60 dark:bg-gray-900/95">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Upload size={22} />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">Drop workspace to import</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Supports `.sqlite` and `.db` files</p>
          </div>
        </div>
      )}

      {/* ── Left panel: branding + quick actions ──────────────────────── */}
      <div
        className="hidden md:flex flex-col w-[280px] flex-shrink-0"
        style={{ backgroundColor: '#1a1f2e' }}
      >
        {/* Drag region for traffic lights */}
        <div
          className="flex-shrink-0 h-[52px]"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Branding */}
        <div className="px-7 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Send size={16} className="text-white -rotate-12" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Lister</h1>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Newsletter Manager</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-5 space-y-1.5">
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <Plus size={16} />
            New Workspace
          </button>
          <button
            onClick={onImport}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <Upload size={16} />
            Import .sqlite
          </button>
        </div>

        {/* Spacer + footer */}
        <div className="flex-1" />
        <div className="px-5 py-5 space-y-2 border-t border-white/10">
          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors"
          >
            <Heart size={14} className="fill-current flex-shrink-0" />
            <span className="font-medium">Support Lister</span>
          </a>
          <button
            onClick={onOpenPreferences}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <Settings size={14} className="flex-shrink-0" />
            <span className="font-medium">App Settings</span>
          </button>
        </div>
      </div>

      {/* ── Right panel: workspace list ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Drag region across top */}
        <div
          className="flex-shrink-0 h-[52px] flex items-end px-8 pb-2"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* Mobile-only: show title here */}
          <span className="md:hidden text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Lister
          </span>
        </div>

        {/* Header */}
        <div className="px-8 pt-2 pb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspaces</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {workspaces.length === 0 ? 'Get started by creating a workspace' : `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => setSortMode((current) => getNextSortMode(current))}
              className="inline-flex items-center gap-2 rounded-lg bg-transparent px-2.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-gray-200"
              title={`Sort: ${SORT_LABELS[sortMode]}. Click to switch.`}
            >
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">Sort: {SORT_LABELS[sortMode]}</span>
              <span className="sm:hidden">{SORT_LABELS[sortMode]}</span>
            </button>
            {/* Mobile-only buttons (left panel hidden on mobile) */}
            <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="sm" onClick={onOpenPreferences}>
              <Settings size={15} className="mr-1.5" /> Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={onImport}>
              <Upload size={15} className="mr-1.5" /> Import
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus size={15} className="mr-1.5" /> New
            </Button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-8 pb-12">
          {dropError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {dropError}
            </div>
          )}

          {/* Inline create form */}
          {creating && (
            <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-300 dark:border-indigo-500/40 p-5 shadow-sm">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Workspace name
              </label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="My Newsletter..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                className="w-full mt-2 bg-transparent text-gray-900 dark:text-white text-lg font-semibold placeholder-gray-300 dark:placeholder-gray-600 outline-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(''); }}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleCreate}>
                  Create
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="text-center py-24">
              <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : workspaces.length === 0 && !creating ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-5">
                <Database size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No workspaces yet
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto mb-6">
                A workspace holds your subscriber lists, campaigns, and templates — all in one local file.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" size="sm" onClick={onImport}>
                  <Upload size={15} className="mr-1.5" /> Import
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                  <Plus size={15} className="mr-1.5" /> Create Workspace
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="group relative bg-white dark:bg-gray-800/70 rounded-xl border border-gray-200/80 dark:border-gray-700/60
                    hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5
                    transition-all duration-150 cursor-pointer"
                  onClick={() => { if (editingId !== ws.id) onOpen(ws.id); }}
                >
                  <div className="flex items-center px-5 py-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5 flex items-center justify-center mr-4 border border-indigo-100 dark:border-indigo-500/10">
                      <Database size={18} className="text-indigo-500 dark:text-indigo-400" />
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      {editingId === ws.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(ws.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => handleRename(ws.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent text-gray-900 dark:text-white text-sm font-semibold outline-none border-b-2 border-indigo-400 pb-0.5"
                        />
                      ) : (
                        <div className="min-w-0">
                          <h3 className="min-w-0 truncate text-sm font-semibold leading-5 text-gray-900 dark:text-white">
                            {ws.name}
                          </h3>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Clock size={11} />
                          {timeAgo(ws.lastOpenedAt)}
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatSize(ws.sizeBytes)}
                        </span>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <div className="relative flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {ws.isProtected && (
                        <Lock
                          size={12}
                          className="flex-shrink-0 text-gray-300 dark:text-gray-600"
                          aria-label="Encrypted workspace"
                        />
                      )}
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === ws.id ? null : ws.id)}
                        className="p-2 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300
                          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {menuOpenId === ws.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-gray-800
                            border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl shadow-black/10 py-1.5 overflow-hidden"
                        >
                          <button
                            onClick={() => { onOpen(ws.id); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70"
                          >
                            <FolderOpen size={14} /> Open
                          </button>
                          <button
                            onClick={() => { setEditingId(ws.id); setEditingName(ws.name); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70"
                          >
                            <Pencil size={14} /> Rename
                          </button>
                          <button
                            onClick={() => handleExport(ws.id)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70"
                          >
                            <Download size={14} /> Export .sqlite
                          </button>
                          {ws.isProtected && (
                            <button
                              onClick={() => {
                                void onRemoveEncryption(ws.id);
                                setMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/70"
                            >
                              <Lock size={14} /> Remove Encryption
                            </button>
                          )}
                          <div className="border-t border-gray-100 dark:border-gray-700/70 my-1" />
                          <button
                            onClick={() => { handleDelete(ws); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Workspace"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Delete <span className="break-all">“{deleteTarget?.name}”</span>?
              </p>
              <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">
                This permanently removes the workspace file from Lister and cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              Delete Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { List, Users, Send, Settings, Radio, Download, ChevronLeft, ChevronRight, ChevronDown, LogOut, Palette, BookOpen, Menu, Heart } from 'lucide-react';
import { isElectron, isMac } from '../lib/platform';

const STRIPE_LINK = 'https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03';
import type { Page } from '../types';

interface NavChild {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { id: 'lists', label: 'Lists', icon: <List size={18} /> },
  { id: 'subscribers', label: 'Subscribers', icon: <Users size={18} /> },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: <Send size={18} />,
    children: [
      { id: 'templates', label: 'Templates', icon: <BookOpen size={15} /> },
      { id: 'themes', label: 'Themes', icon: <Palette size={15} /> },
    ],
  },
  { id: 'sender-profiles', label: 'Sender Profiles', icon: <Radio size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const topLevelPages: Page[] = ['lists', 'subscribers', 'campaigns', 'themes', 'templates', 'sender-profiles', 'settings'];

function getParentId(page: Page): Page | null {
  for (const item of navItems) {
    if (item.children?.some((c) => c.id === page)) return item.id;
  }
  return null;
}

function loadOpenSections(): Set<Page> {
  try {
    const raw = localStorage.getItem('lister-sidebar-sections');
    if (raw) return new Set(JSON.parse(raw) as Page[]);
  } catch {}
  return new Set(navItems.filter((i) => i.children).map((i) => i.id));
}

function saveOpenSections(sections: Set<Page>) {
  localStorage.setItem('lister-sidebar-sections', JSON.stringify([...sections]));
}

interface LayoutProps {
  currentPage: Page;
  fileName: string;
  onNavigate: (page: Page) => void;
  onSave?: () => void;
  onUnload?: () => void;
  onOpenPreferences?: () => void;
  showContentDragBar?: boolean;
  children: React.ReactNode;
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lister-sidebar') === 'collapsed');
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    localStorage.setItem('lister-sidebar', next ? 'collapsed' : 'expanded');
    return next;
  });

  // Listen for menu-driven toggle (Electron)
  useEffect(() => {
    const handler = () => toggle();
    window.addEventListener('lister:toggle-sidebar', handler);
    return () => window.removeEventListener('lister:toggle-sidebar', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [collapsed, toggle] as const;
}

const pageLabels: Partial<Record<Page, string>> = {
  lists: 'Lists', subscribers: 'Subscribers', campaigns: 'Campaigns',
  templates: 'Templates', themes: 'Themes', 'sender-profiles': 'Sender Profiles',
  settings: 'Settings', 'list-detail': 'List', 'campaign-editor': 'Campaign',
};

const DEFAULT_COLLAPSED_WIDTH = '56px';
const MAC_COLLAPSED_WIDTH = '92px';
const EXPANDED_WIDTH = '280px';
const COLLAPSED_BUTTON_SIZE = 'h-11 w-11';

export function Layout({
  currentPage,
  fileName,
  onNavigate,
  onSave,
  onUnload,
  onOpenPreferences,
  showContentDragBar = true,
  children,
}: LayoutProps) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [openSections, setOpenSections] = useState<Set<Page>>(loadOpenSections);
  const [mobileOpen, setMobileOpen] = useState(false);
  const electronMac = isElectron() && isMac();
  const sidebarWidth = collapsed
    ? (electronMac ? MAC_COLLAPSED_WIDTH : DEFAULT_COLLAPSED_WIDTH)
    : EXPANDED_WIDTH;

  const activePage: Page = topLevelPages.includes(currentPage) ? currentPage :
    currentPage === 'list-detail' ? 'lists' :
    currentPage === 'campaign-editor' ? 'campaigns' :
    currentPage;

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  // Auto-expand parent when navigating to a child
  useEffect(() => {
    const parentId = getParentId(activePage);
    if (parentId && !openSections.has(parentId)) {
      setOpenSections((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        saveOpenSections(next);
        return next;
      });
    }
  }, [activePage]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (id: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveOpenSections(next);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 md:hidden flex items-center px-3 h-14 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-900 dark:text-white">
          {pageLabels[currentPage] ?? 'Lister'}
        </span>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200
          md:static md:z-auto md:translate-x-0 md:flex-shrink-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          backgroundColor: '#1a1f2e',
          width: sidebarWidth,
        }}
      >
        {/* Draggable title bar region (Electron macOS) — sits behind the traffic lights */}
        {electronMac && (
          <div
            className="flex-shrink-0 h-[52px]"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}

        {/* Logo + collapse toggle */}
        <div
          className={`min-h-[60px] ${collapsed ? 'border-b border-white/10 py-4' : 'px-7 pt-4 pb-8'}`}
          style={electronMac ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
        >
          {collapsed ? (
            <div className="flex justify-center">
              <button
                onClick={toggleCollapsed}
                className={`${COLLAPSED_BUTTON_SIZE} inline-flex items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white`}
                title="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
                  <Send size={16} className="text-white -rotate-12" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">Lister</h1>
                  <p className="text-[11px] text-slate-500 font-medium -mt-0.5 whitespace-nowrap">Newsletter Manager</p>
                </div>
              </div>
              <button
                onClick={toggleCollapsed}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'px-0 py-4 space-y-2' : 'px-5 py-0 space-y-1.5'}`}>
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isOpen = openSections.has(item.id);
            const isActive = activePage === item.id;
            const hasActiveChild = item.children?.some((c) => c.id === activePage) ?? false;

            return (
              <div key={item.id}>
                {/* Parent row */}
                <div className={`flex items-center ${collapsed ? 'justify-center' : `rounded-lg ${isActive ? 'bg-white/10' : ''}`}`}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex-1 flex items-center min-w-0 text-sm font-medium transition-colors duration-150
                      ${collapsed ? `mx-auto ${COLLAPSED_BUTTON_SIZE} max-w-[44px] justify-center rounded-xl` : 'gap-3 px-3 py-2.5'}
                      ${isActive
                        ? collapsed ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-white'
                        : hasActiveChild
                          ? collapsed ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-white'
                          : collapsed ? 'text-slate-400 hover:text-slate-200 hover:bg-white/8' : 'text-slate-400 hover:text-slate-200'}
                    `}
                  >
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>

                  {/* Chevron — only in expanded mode, only for items with children */}
                  {!collapsed && hasChildren && (
                    <button
                      onClick={(e) => toggleSection(item.id, e)}
                      title={isOpen ? 'Collapse' : 'Expand'}
                      className={`mr-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive || hasActiveChild ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                      />
                    </button>
                  )}
                </div>

                {/* Children — expanded sidebar + section open */}
                {!collapsed && hasChildren && isOpen && (
                  <div className="mb-1 ml-4 mt-0.5 space-y-1 border-l border-white/10 pl-3">
                    {item.children!.map((child) => {
                      const isChildActive = activePage === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNavigate(child.id)}
                          className={`
                            w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                            px-3 py-2.5
                            ${isChildActive
                              ? 'bg-white/10 text-white'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}
                          `}
                        >
                          {child.icon}
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-white/10 ${collapsed ? 'px-0 py-4 space-y-2' : 'px-5 py-5 space-y-2'}`}>
          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            title="Support Lister"
            className={`w-full flex items-center rounded-lg text-rose-400 hover:text-rose-300 hover:bg-white/5 text-sm transition-colors
              ${collapsed ? `mx-auto ${COLLAPSED_BUTTON_SIZE} max-w-[44px] justify-center rounded-xl` : 'gap-3 px-3 py-2.5'}`}
          >
            <Heart size={14} className="fill-current flex-shrink-0" />
            {!collapsed && <span className="font-medium">Support Lister</span>}
          </a>

          {onOpenPreferences && (
            <button
              onClick={onOpenPreferences}
              title="App Settings"
              className={`w-full flex items-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 text-sm transition-colors
                ${collapsed ? `mx-auto ${COLLAPSED_BUTTON_SIZE} max-w-[44px] justify-center rounded-xl` : 'gap-3 px-3 py-2.5'}`}
            >
              <Settings size={14} className="flex-shrink-0" />
              {!collapsed && <span className="font-medium">App Settings</span>}
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              title="Save file"
              className={`w-full flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors
                ${collapsed ? `mx-auto ${COLLAPSED_BUTTON_SIZE} max-w-[44px] justify-center rounded-xl shadow-sm shadow-indigo-950/25` : 'gap-3 px-3 py-2.5'}`}
            >
              <Download size={14} />
              {!collapsed && 'Save file'}
            </button>
          )}

          {onUnload && (
            <button
              onClick={onUnload}
              title={`Close ${fileName}`}
              className={`w-full flex items-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 text-sm transition-colors
                ${collapsed ? `mx-auto ${COLLAPSED_BUTTON_SIZE} max-w-[44px] justify-center rounded-xl` : 'gap-3 px-3 py-2.5'}`}
            >
              <LogOut size={14} />
              {!collapsed && (
                <span className="truncate">Close <span className="text-slate-200 font-medium">{fileName}</span></span>
              )}
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pt-14 md:pt-0">
        {/* Draggable top bar for Electron (main content area) */}
        {electronMac && showContentDragBar && (
          <div
            className="hidden md:block h-[52px] flex-shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}
        {children}
      </div>
    </div>
  );
}

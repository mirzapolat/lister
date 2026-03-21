import React, { useState, useEffect } from 'react';
import { List, Users, Send, Settings, Radio, Download, ChevronLeft, ChevronRight, ChevronDown, LogOut, Palette, BookOpen, Menu } from 'lucide-react';
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
  children: React.ReactNode;
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lister-sidebar') === 'collapsed');
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    localStorage.setItem('lister-sidebar', next ? 'collapsed' : 'expanded');
    return next;
  });
  return [collapsed, toggle] as const;
}

const pageLabels: Partial<Record<Page, string>> = {
  lists: 'Lists', subscribers: 'Subscribers', campaigns: 'Campaigns',
  templates: 'Templates', themes: 'Themes', 'sender-profiles': 'Sender Profiles',
  settings: 'Settings', 'list-detail': 'List', 'campaign-editor': 'Campaign',
};

export function Layout({ currentPage, fileName, onNavigate, onSave, onUnload, children }: LayoutProps) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [openSections, setOpenSections] = useState<Set<Page>>(loadOpenSections);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        style={{ backgroundColor: '#1a1f2e', width: collapsed ? '56px' : '224px' }}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-4 min-h-[60px]">
          {!collapsed && (
            <div className="pl-2 overflow-hidden">
              <h1 className="text-base font-bold text-white tracking-tight whitespace-nowrap">Lister</h1>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Newsletter Manager</p>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isOpen = openSections.has(item.id);
            const isActive = activePage === item.id;
            const hasActiveChild = item.children?.some((c) => c.id === activePage) ?? false;

            return (
              <div key={item.id}>
                {/* Parent row */}
                <div className={`flex items-center rounded-lg ${isActive ? 'bg-white/10' : ''}`}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex-1 flex items-center min-w-0 text-sm font-medium transition-colors duration-150
                      ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                      ${isActive
                        ? 'text-white'
                        : hasActiveChild
                          ? 'text-slate-300 hover:text-white'
                          : 'text-slate-400 hover:text-slate-200'}
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
                      className={`flex-shrink-0 p-2 mr-1 rounded transition-colors ${
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
                  <div className="mt-0.5 mb-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                    {item.children!.map((child) => {
                      const isChildActive = activePage === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNavigate(child.id)}
                          className={`
                            w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                            px-2.5 py-2
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
        <div className="px-2 py-3 border-t border-white/10 space-y-1">
          {onSave && (
            <button
              onClick={onSave}
              title="Save file"
              className={`w-full flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors
                ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'}`}
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
                ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'}`}
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
        {children}
      </div>
    </div>
  );
}

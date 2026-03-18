import React, { useState } from 'react';
import { List, Users, Send, Radio, Download, Moon, Sun, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import type { Page } from '../types';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'lists', label: 'Lists', icon: <List size={18} /> },
  { id: 'subscribers', label: 'Subscribers', icon: <Users size={18} /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Send size={18} /> },
  { id: 'settings', label: 'Sender Profiles', icon: <Radio size={18} /> },
];

const topLevelPages: Page[] = ['lists', 'subscribers', 'campaigns', 'settings'];

interface LayoutProps {
  currentPage: Page;
  fileName: string;
  onNavigate: (page: Page) => void;
  onSave?: () => void;
  onUnload?: () => void;
  dark: boolean;
  onToggleDark: () => void;
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

export function Layout({ currentPage, fileName, onNavigate, onSave, onUnload, dark, onToggleDark, children }: LayoutProps) {
  const [collapsed, toggleCollapsed] = useCollapsed();

  const activePage = topLevelPages.includes(currentPage) ? currentPage :
    currentPage === 'list-detail' ? 'lists' :
    currentPage === 'campaign-editor' ? 'campaigns' :
    currentPage;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-200"
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
        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  w-full flex items-center rounded-lg text-sm font-medium transition-colors duration-150
                  ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                  ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                `}
              >
                {item.icon}
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/10 space-y-1">
          {/* Save file (Firefox only) */}
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

          {/* Dark mode */}
          <button
            onClick={onToggleDark}
            title={dark ? 'Light mode' : 'Dark mode'}
            className={`w-full flex items-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 text-sm transition-colors
              ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'}`}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && (dark ? 'Light mode' : 'Dark mode')}
          </button>

          {/* Unload */}
          {onUnload && (
            <button
              onClick={onUnload}
              title={`Close ${fileName}`}
              className={`w-full flex items-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 text-sm transition-colors
                ${collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'}`}
            >
              <LogOut size={14} />
              {!collapsed && (
                <span className="truncate">Close {fileName}</span>
              )}
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AppSettings {
  editorFontSize: number;
  colorScheme: 'light' | 'dark' | 'auto';
  editorTheme: 'light' | 'dark';
  confirmBeforeSending: boolean;
}

const DEFAULTS: AppSettings = {
  editorFontSize: 15,
  colorScheme: 'auto',
  editorTheme: 'light',
  confirmBeforeSending: true,
};

const KEY = 'lister-app-settings';

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    localStorage.removeItem('lister-theme');
  } catch {}
  return DEFAULTS;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  updateSettings: () => {},
});

function applyDark(dark: boolean) {
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);

  // Apply editor font size
  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${settings.editorFontSize}px`);
  }, [settings.editorFontSize]);

  // Apply color scheme — including media query listener for 'auto'
  useEffect(() => {
    if (settings.colorScheme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      applyDark(settings.colorScheme === 'dark');
    }
  }, [settings.colorScheme]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

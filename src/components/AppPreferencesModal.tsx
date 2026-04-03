import React, { useState } from 'react';
import { Monitor, Moon, Sun, Type } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useSettings } from '../context/SettingsContext';
import type { AppSettings } from '../context/SettingsContext';

type PreferencesSection = 'appearance' | 'editor';

interface AppPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AppearanceSection() {
  const { settings, updateSettings } = useSettings();

  const schemes: { value: AppSettings['colorScheme']; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={15} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
    { value: 'auto', label: 'System', icon: <Monitor size={15} /> },
  ];

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Appearance</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how Lister looks. These preferences apply across the whole app.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Color Scheme</label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {schemes.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => updateSettings({ colorScheme: value })}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                settings.colorScheme === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorSection() {
  const { settings, updateSettings } = useSettings();
  const { editorFontSize, editorTheme, confirmBeforeSending } = settings;

  const themes: { value: typeof editorTheme; label: string; description: string }[] = [
    { value: 'light', label: 'GitHub Light', description: 'Light background, classic GitHub colors' },
    { value: 'dark', label: 'GitHub Dark', description: 'Dark background, GitHub dark colors' },
  ];

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Editor</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">These preferences apply to every workspace you open.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Font Size</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Controls the text size in all markdown editors.</p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={11}
            max={24}
            value={editorFontSize}
            onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })}
            className="flex-1 accent-indigo-600"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateSettings({ editorFontSize: Math.max(11, editorFontSize - 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              -
            </button>
            <span className="w-10 text-center text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{editorFontSize}px</span>
            <button
              onClick={() => updateSettings({ editorFontSize: Math.min(24, editorFontSize + 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Preview: <span style={{ fontSize: editorFontSize }}>The quick brown fox jumps over the lazy dog.</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Syntax Highlight Theme</label>
        <div className="space-y-2">
          {themes.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => updateSettings({ editorTheme: value })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                editorTheme === value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 ${editorTheme === value ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sending</label>
        <button
          onClick={() => updateSettings({ confirmBeforeSending: !confirmBeforeSending })}
          className="flex items-center gap-3 w-full text-left"
        >
          <div className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${confirmBeforeSending ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${confirmBeforeSending ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Show confirmation before sending</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Review recipients and settings before a campaign is sent.</p>
          </div>
        </button>
      </div>
    </div>
  );
}

const SECTIONS: { id: PreferencesSection; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Sun size={15} /> },
  { id: 'editor', label: 'Editor', icon: <Type size={15} /> },
];

export function AppPreferencesModal({ isOpen, onClose }: AppPreferencesModalProps) {
  const [section, setSection] = useState<PreferencesSection>('appearance');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preferences" size="xl">
      <div className="flex flex-col sm:flex-row">
        <aside className="flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sm:w-48 sm:px-2 sm:py-4">
          <p className="hidden sm:block px-3 pb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">App</p>
          <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible gap-1 px-2 py-2 sm:p-0 sm:space-y-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex-shrink-0 flex items-center gap-2 sm:gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap sm:w-full ${
                  section === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6">
          {section === 'appearance' && <AppearanceSection />}
          {section === 'editor' && <EditorSection />}
        </div>
      </div>
    </Modal>
  );
}

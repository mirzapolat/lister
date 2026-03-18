import { useState, useEffect } from 'react';
import { Server, User, Lock, Mail, CheckCircle, Zap, Wifi } from 'lucide-react';
import { getSettings, saveSettings, hasFileSystemApi, getRateLimit, setRateLimit } from '../../db/database';
import type { SmtpSettings } from '../../types';
import { Button } from '../ui/Button';

const fsApi = hasFileSystemApi();

export function SettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    smtp_tls: 'true',
    sender_name: '',
    sender_email: '',
  });
  const [rateLimit, setRateLimitState] = useState(500);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  useEffect(() => {
    setSettings(getSettings());
    setRateLimitState(getRateLimit());
  }, []);

  const update = (key: keyof SmtpSettings, value: string) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (!fsApi) {
      saveSettings(next);
    } else {
      setSaved(false);
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    setRateLimit(rateLimit);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch('http://localhost:3001/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp: settings }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('ok');
        setTimeout(() => setTestStatus('idle'), 4000);
      } else {
        setTestStatus('error');
        setTestError(data.error ?? 'Connection failed');
      }
    } catch (e) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : 'Cannot reach relay server');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure your SMTP server and sender information</p>
      </div>

      <div className="space-y-6">
        {/* Sender Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sender Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sender Name</label>
              <input
                type="text"
                value={settings.sender_name}
                onChange={(e) => update('sender_name', e.target.value)}
                placeholder="Acme Newsletter"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sender Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={settings.sender_email}
                  onChange={(e) => update('sender_email', e.target.value)}
                  placeholder="newsletter@acme.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SMTP Config */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SMTP Configuration</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SMTP Host</label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => update('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Port</label>
                <input
                  type="number"
                  value={settings.smtp_port}
                  onChange={(e) => update('smtp_port', e.target.value)}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
              <input
                type="text"
                value={settings.smtp_username}
                onChange={(e) => update('smtp_username', e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => update('smtp_password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={settings.smtp_tls === 'true'}
                onClick={() => update('smtp_tls', settings.smtp_tls === 'true' ? 'false' : 'true')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  settings.smtp_tls === 'true' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.smtp_tls === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use TLS/STARTTLS</span>
            </div>
          </div>
        </div>

        {/* Rate Limit */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Send Rate Limit</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Delay between emails (ms)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimitState(Math.max(0, Number(e.target.value)))}
                min="0"
                step="100"
                placeholder="500"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="pt-6 text-sm text-gray-400 dark:text-gray-500">
              {rateLimit === 0 ? 'No delay' : `${rateLimit}ms (~${Math.round(1000 / Math.max(rateLimit, 1))}/sec max)`}
            </div>
          </div>
        </div>

        {fsApi ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
            <Button variant="secondary" onClick={handleTestConnection} loading={testStatus === 'testing'}>
              <Wifi size={14} />
              Test Connection
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle size={15} />
                Settings saved
              </span>
            )}
            {testStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle size={15} />
                Connection successful
              </span>
            )}
            {testStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-500">
                {testError}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-400" />
              Changes are saved automatically — use <strong>Save file</strong> in the header to write them to disk.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleTestConnection} loading={testStatus === 'testing'}>
                <Wifi size={14} />
                Test Connection
              </Button>
              {testStatus === 'ok' && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={15} />
                  Connection successful
                </span>
              )}
              {testStatus === 'error' && (
                <span className="text-sm text-red-500">{testError}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

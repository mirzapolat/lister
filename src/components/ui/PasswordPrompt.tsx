import { useState } from 'react';
import { Lock, Fingerprint, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import type { Database } from 'sql.js';
import { deriveKeyFromPassword, authenticateWithPasskey, getPasskeyCredentialId } from '../../db/crypto';
import { completePendingOpenWithKey } from '../../db/database';
import type { EncryptionMethod } from '../../db/crypto';

interface PasswordPromptProps {
  method: EncryptionMethod;
  salt: Uint8Array;
  fileName: string;
  onSuccess: (result: { db: Database; fileName: string }) => void;
  onCancel: () => void;
}

export function PasswordPrompt({ method, salt, fileName, onSuccess, onCancel }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const key = await deriveKeyFromPassword(password, salt);
      const result = await completePendingOpenWithKey(key, 'password');
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const credentialId = await getPasskeyCredentialId(fileName) ?? undefined;
      const key = await authenticateWithPasskey(credentialId);
      const result = await completePendingOpenWithKey(key, 'passkey');
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm z-10">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <Lock size={15} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Unlock file</h2>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{fileName}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {method === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter file password"
                      autoFocus
                      disabled={loading}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Unlocking…</>
                    : <><Lock size={14} />Unlock</>
                  }
                </button>
              </form>
            )}

            {method === 'passkey' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This file is locked with a passkey. Authenticate to open it.
                </p>
                <button
                  onClick={handlePasskeyAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating…</>
                    : <><Fingerprint size={16} />Authenticate with passkey</>
                  }
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {method === 'password'
                ? 'If you forgot your password, the file cannot be recovered — encryption is permanent.'
                : 'Use the passkey you set up when locking this file.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';

/**
 * Fires `handler` when `key` is pressed, unless the user is typing in an
 * input / textarea / select or holding a modifier key.
 */
export function useHotkey(key: string, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === key) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, handler, enabled]);
}

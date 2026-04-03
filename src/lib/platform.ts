/** True when running inside the Electron shell (preload exposed the bridge). */
export const isElectron = (): boolean => !!window.electronAPI;

/** Shorthand – only call when you've already checked isElectron(). */
export const electronAPI = () => window.electronAPI!;

/** True on macOS (works in both Electron and browser). */
export const isMac = (): boolean =>
  isElectron()
    ? window.electronAPI!.platform === 'darwin'
    : navigator.platform.toLowerCase().includes('mac');

/**
 * Light/dark theming. The system preference is the default; an explicit choice is stored and
 * applied as html[data-theme]. The pre-paint bootstrap in Base.astro mirrors THEME_STORAGE_KEY and
 * sets the first theme-color; this module keeps it current.
 */

export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['auto', 'light', 'dark'];
export const THEME_STORAGE_KEY = 'vb-theme';
const THEME_EVENT = 'vb:theme';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Resolved value of a design token on :root. */
export function cssVar(name: `--${string}`): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Keeps the browser chrome (mobile address bar) the colour of the page, overrides included. */
function syncThemeColor(): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cssVar('--bg'));
}
systemDark().addEventListener('change', syncThemeColor);

export function getThemePreference(): ThemePreference {
  const theme = document.documentElement.dataset.theme;
  return theme === 'light' || theme === 'dark' ? theme : 'auto';
}

export function setThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'auto') delete root.dataset.theme;
  else root.dataset.theme = preference;
  try {
    if (preference === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode); the in-page choice still applies.
  }
  syncThemeColor();
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Fires on explicit toggles and on system changes. Returns an unsubscribe function. */
export function onThemeChange(callback: () => void): () => void {
  const media = systemDark();
  media.addEventListener('change', callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    media.removeEventListener('change', callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

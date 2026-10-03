/** Shared with docs site — localStorage key `scas-theme`. */
export type ScasTheme = 'light' | 'dark';

export const SCAS_THEME_KEY = 'scas-theme';
export const SCAS_THEME_META: Record<ScasTheme, string> = {
  light: '#2f27ce',
  dark: '#050315',
};

export function readStoredTheme(): ScasTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(SCAS_THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* private mode */
  }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function applyTheme(theme: ScasTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', SCAS_THEME_META[theme]);
}

export function persistTheme(theme: ScasTheme): void {
  try {
    window.localStorage.setItem(SCAS_THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('scas-theme-change', { detail: theme }));
}

export function toggleTheme(current: ScasTheme): ScasTheme {
  const next: ScasTheme = current === 'dark' ? 'light' : 'dark';
  persistTheme(next);
  return next;
}

/** Inline bootstrap — paste into <head> to avoid FOUC. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k='scas-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

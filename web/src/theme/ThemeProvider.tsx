/**
 * ThemeProvider — applies the active theme's CSS variables to the document root
 * and exposes the resolved palette (esp. `phaseHex`) to TS consumers.
 *
 * Why both channels:
 *   • CSS vars (set on <html>) retint every Tailwind utility + var()-driven style.
 *   • `phaseHex` is handed to the two components (Room, Pipeline) that need a real
 *     hex string to concatenate alpha suffixes (`${color}AA`).
 *
 * The theme id persists to localStorage under `ccc:theme`. Variables are applied
 * in a layout effect so there is no flash of the default theme on first paint.
 */

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Phase } from '../types';
import { DEFAULT_THEME_ID, THEMES, themeById, type Theme } from './registry';

const STORAGE_KEY = 'ccc:theme';

interface ThemeContextValue {
  theme: Theme;
  themes: Theme[];
  setTheme: (id: string) => void;
  /** Advance to the next theme in the registry (wraps). */
  cycle: () => void;
  phaseHex: Record<Phase, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStored = (): string => {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>(readStored);
  const theme = useMemo(() => themeById(themeId), [themeId]);

  // Apply the theme's CSS variables to <html> before paint, and tag data-theme
  // so CSS can also key off it (e.g. scanline intensity, light-mode tweaks).
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
    root.dataset.theme = theme.id;
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* quota/denied — non-fatal */
    }
  }, []);

  const cycle = useCallback(() => {
    const idx = THEMES.findIndex((t) => t.id === themeId);
    const next = THEMES[(idx + 1) % THEMES.length]!;
    setTheme(next.id);
  }, [themeId, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themes: THEMES, setTheme, cycle, phaseHex: theme.phaseHex }),
    [theme, setTheme, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ThemeVariant, ColorMode, UserSettings } from '@/types';

const DEFAULT_THEME: ThemeVariant =
  (process.env.NEXT_PUBLIC_DEFAULT_THEME as ThemeVariant) || 'classic';
const DEFAULT_COLOR_MODE: ColorMode = 'light';

const STORAGE_KEY_THEME = 'app-theme';
const STORAGE_KEY_COLOR_MODE = 'app-color-mode';

interface ThemeContextValue {
  theme: ThemeVariant;
  colorMode: ColorMode;
  setTheme: (t: ThemeVariant) => void;
  setColorMode: (m: ColorMode) => void;
  isModern: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  colorMode: DEFAULT_COLOR_MODE,
  setTheme: () => {},
  setColorMode: () => {},
  isModern: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeVariant>(DEFAULT_THEME);
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [mounted, setMounted] = useState(false);

  // Read from localStorage on mount (client only)
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeVariant | null;
    if (storedTheme === 'classic' || storedTheme === 'modern') {
      setThemeState(storedTheme);
    }
    const storedMode = localStorage.getItem(STORAGE_KEY_COLOR_MODE) as ColorMode | null;
    if (storedMode === 'light' || storedMode === 'dark') {
      setColorModeState(storedMode);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: ThemeVariant) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY_THEME, t);
  }, []);

  const setColorMode = useCallback((m: ColorMode) => {
    setColorModeState(m);
    localStorage.setItem(STORAGE_KEY_COLOR_MODE, m);
  }, []);

  // Apply dark class and data-theme attribute to <html>
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [colorMode, theme, mounted]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorMode,
        setTheme,
        setColorMode,
        isModern: theme === 'modern',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

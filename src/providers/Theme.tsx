import React, { createContext, useContext, useEffect, useState } from 'react';

import { getTheme } from '@/utils/shared/config';
import { THEME_NAMES, THEME_STORAGE_KEY, ThemeName } from '@/utils/theme/themeConfig';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === THEME_NAMES.SOLARPUNK || stored === THEME_NAMES.CRYPTOMONDAYS) {
    return stored as ThemeName;
  }

  const envTheme = getTheme();
  if (envTheme === THEME_NAMES.SOLARPUNK || envTheme === THEME_NAMES.CRYPTOMONDAYS) {
    return envTheme as ThemeName;
  }

  return THEME_NAMES.CRYPTOMONDAYS;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

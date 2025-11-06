export type ThemeName = 'solarpunk' | 'cryptomondays';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  primaryColor: string;
  logoPath: string;
  logoIconPath?: string;
  logoOnDarkPath?: string;
}

export const AVAILABLE_THEMES: Record<ThemeName, ThemeConfig> = {
  solarpunk: {
    name: 'solarpunk',
    displayName: 'SolarPunk',
    description: 'Original purple-to-orange gradient theme',
    primaryColor: '#fe8950',
    logoPath: '/assets/themes/solarpunk/logo.png',
  },
  cryptomondays: {
    name: 'cryptomondays',
    displayName: 'CryptoMondays',
    description: 'Modern blue theme for CryptoMondays partnership',
    primaryColor: '#377dff',
    logoPath: '/assets/themes/cryptomondays/logo.svg',
    logoIconPath: '/assets/themes/cryptomondays/logo-icon.svg',
    logoOnDarkPath: '/assets/themes/cryptomondays/logo-on-black.svg',
  },
};

export function getActiveTheme(): ThemeName {
  const envTheme = import.meta.env.VITE_THEME as string | undefined;

  if (envTheme && envTheme in AVAILABLE_THEMES) {
    return envTheme as ThemeName;
  }

  return 'solarpunk';
}

export function getActiveThemeConfig(): ThemeConfig {
  const themeName = getActiveTheme();
  return AVAILABLE_THEMES[themeName];
}

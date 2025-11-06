export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  primaryColor: string;
  logoPath: string;
  logoIconPath?: string;
  logoOnDarkPath?: string;
}

export const THEME_NAMES = {
  SOLARPUNK: 'solarpunk',
  CRYPTOMONDAYS: 'cryptomondays',
} as const;

export type ThemeName = (typeof THEME_NAMES)[keyof typeof THEME_NAMES];

export const THEME_STORAGE_KEY = 'msrs-theme';

export const AVAILABLE_THEMES: Record<ThemeName, ThemeConfig> = {
  [THEME_NAMES.SOLARPUNK]: {
    name: THEME_NAMES.SOLARPUNK,
    displayName: 'SolarPunk',
    description: 'Original purple-to-orange gradient theme',
    primaryColor: '#fe8950',
    logoPath: '/assets/themes/solarpunk/logo.png',
  },
  [THEME_NAMES.CRYPTOMONDAYS]: {
    name: THEME_NAMES.CRYPTOMONDAYS,
    displayName: 'CryptoMondays',
    description: 'Modern blue theme for CryptoMondays partnership',
    primaryColor: '#377dff',
    logoPath: '/assets/themes/cryptomondays/logo.svg',
    logoIconPath: '/assets/themes/cryptomondays/logo-icon.svg',
    logoOnDarkPath: '/assets/themes/cryptomondays/logo-on-black.svg',
  },
};

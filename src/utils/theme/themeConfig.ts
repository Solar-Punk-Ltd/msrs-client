export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  primaryColor: string;
  logoPath: string;
  logoIconPath?: string;
  logoOnDarkPath?: string;
  backgroundVideoPath?: string;
  showFooter?: boolean;
  /** Group the stream browser into Live / Next stream / Upcoming / Past sections. */
  groupStreamsBySchedule?: boolean;
}

export const THEME_NAMES = {
  SOLARPUNK: 'solarpunk',
  CRYPTOMONDAYS: 'cryptomondays',
  SWARM: 'swarm',
  ETHIS: 'ethis',
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
  [THEME_NAMES.SWARM]: {
    name: THEME_NAMES.SWARM,
    displayName: 'Swarm',
    description: 'Ethereum Swarm Foundation theme with brand orange and video background',
    primaryColor: '#f47a20',
    logoPath: '/assets/themes/swarm/logo.svg',
    showFooter: true,
    groupStreamsBySchedule: true,
  },
  // Ethis mirrors the Swarm brand's colours/fonts but uses the Ethereum mark.
  [THEME_NAMES.ETHIS]: {
    name: THEME_NAMES.ETHIS,
    displayName: 'Ethis',
    description: 'Ethis theme (Swarm brand styling with the Ethereum logo)',
    primaryColor: '#f47a20',
    logoPath: '/assets/themes/ethis/logo.png',
    showFooter: true,
  },
};

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  primaryColor: string;
  logoPath: string;
  logoIconPath?: string;
  logoOnDarkPath?: string;
  /** Optional looping/single-play background video shown behind the main layout. */
  backgroundVideoPath?: string;
  /** Render a marketing footer below the main content. */
  showFooter?: boolean;
}

export const THEME_NAMES = {
  SOLARPUNK: 'solarpunk',
  CRYPTOMONDAYS: 'cryptomondays',
  SWARM: 'swarm',
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
    primaryColor: '#fe6e00',
    logoPath: '/assets/themes/swarm/logo.svg',
    backgroundVideoPath: '/assets/themes/swarm/doors_v3.mp4',
    showFooter: true,
  },
};

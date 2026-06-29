import { useEffect } from 'react';

import { THEME_NAMES, ThemeName } from '@/utils/theme/themeConfig';

const themeConfig = {
  [THEME_NAMES.SOLARPUNK]: {
    title: 'Multimedia Streaming over Swarm',
    favicon: '/assets/themes/solarpunk/favicon.png',
    loadingGradient: 'linear-gradient(180deg, #8841e4 0%, #ff8a50 100%)',
  },
  [THEME_NAMES.CRYPTOMONDAYS]: {
    title: 'CryptoMondays Streaming',
    favicon: '/assets/themes/cryptomondays/logo-icon.svg',
    loadingGradient: 'linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(8, 4, 27, 0.95) 100%)',
  },
  [THEME_NAMES.SWARM]: {
    title: 'Swarm Streaming',
    favicon: '/assets/themes/swarm/favicon.png',
    loadingGradient: 'linear-gradient(180deg, #0d1216 0%, #141a20 100%)',
  },
  [THEME_NAMES.ETHIS]: {
    title: 'Ethis Streaming',
    favicon: '/assets/themes/ethis/favicon.png',
    loadingGradient: 'linear-gradient(180deg, #151517 0%, #1b1b1c 100%)',
  },
};

export function useThemeAssets(theme: ThemeName) {
  useEffect(() => {
    const config = themeConfig[theme];

    // Update document title
    document.title = config.title;

    // Update favicon
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon) {
      favicon.href = config.favicon;
    }

    // Update initial loading screen gradient
    const loadingScreen = document.querySelector<HTMLDivElement>('.initial-loading');
    if (loadingScreen) {
      loadingScreen.style.background = config.loadingGradient;
    }
  }, [theme]);
}

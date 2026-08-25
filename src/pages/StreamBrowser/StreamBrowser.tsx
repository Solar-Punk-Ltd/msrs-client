import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Footer } from '@/components/Footer';
import { StreamList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';
import { useTheme } from '@/providers/Theme';
import { MessageReceiveMode } from '@/types/messaging';
import { AVAILABLE_THEMES } from '@/utils/theme/themeConfig';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { fetchAppState, fetchInitialAppState, setNewStreamList, isLoading, messageReceiveMode } = useAppContext();
  const { theme } = useTheme();
  const isWindowFocusRefetch = useRef(false);

  const showFooter = AVAILABLE_THEMES[theme].showFooter ?? false;
  const isWide = AVAILABLE_THEMES[theme].groupStreamsBySchedule ?? false;
  const { heroTitle, heroSubtitle } = AVAILABLE_THEMES[theme];

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: async () => {
      if (isWindowFocusRefetch.current) {
        isWindowFocusRefetch.current = false;
        return fetchInitialAppState();
      }
      return fetchAppState();
    },
    refetchInterval: messageReceiveMode !== MessageReceiveMode.SWARM ? 5000 : 1000,
    retry: true,
    enabled: !isLoading,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnWindowFocus: () => {
      isWindowFocusRefetch.current = true;
      return true;
    },
  });

  useEffect(() => {
    if (data) {
      setNewStreamList(data);
    }
  }, [data, setNewStreamList]);

  return (
    <div className="stream-browser-page">
      {heroTitle && (
        <div className="stream-browser-hero">
          <h1 className="stream-browser-hero-title">{heroTitle}</h1>
          {heroSubtitle && <p className="stream-browser-hero-subtitle">{heroSubtitle}</p>}
        </div>
      )}
      <div className={`stream-browser ${isWide ? 'stream-browser--wide' : ''}`}>
        <StreamList />
      </div>
      {showFooter && <Footer />}
    </div>
  );
}

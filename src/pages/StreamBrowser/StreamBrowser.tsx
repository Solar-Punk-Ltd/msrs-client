import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StreamList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';
import { MessageReceiveMode } from '@/types/messaging';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { fetchAppState, fetchInitialAppState, setNewStreamList, isLoading, messageReceiveMode } = useAppContext();
  const isWindowFocusRefetch = useRef(false);

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
    <div className="stream-browser">
      <StreamList />
    </div>
  );
}

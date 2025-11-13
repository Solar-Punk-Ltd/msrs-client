import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StreamList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';
import { MessageReceiveMode } from '@/types/messaging';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { fetchAppState, setNewStreamList, isLoading, messageReceiveMode } = useAppContext();

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      try {
        const result = await fetchAppState(controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    refetchInterval: messageReceiveMode !== MessageReceiveMode.SWARM ? 5000 : 250,
    retry: true,
    enabled: !isLoading,
    staleTime: 0,
    gcTime: Infinity,
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

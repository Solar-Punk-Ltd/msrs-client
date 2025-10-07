import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StreamList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { fetchAppState, setNewStreamList, isLoading, isWakuEnabled } = useAppContext();

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: () => fetchAppState(),
    refetchInterval: isWakuEnabled ? false : 2500,
    retry: true,
    enabled: isWakuEnabled ? false : !isLoading,
    staleTime: 0,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (data && !isWakuEnabled) {
      setNewStreamList(data);
    }
  }, [data, setNewStreamList, isWakuEnabled]);

  return (
    <div className="stream-browser">
      <StreamList />
    </div>
  );
}

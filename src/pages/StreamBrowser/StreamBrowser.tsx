import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StreamList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { fetchAppState, setNewStreamList, isLoading } = useAppContext();

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: fetchAppState,
    refetchInterval: 5000,
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

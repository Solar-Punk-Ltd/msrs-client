import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';

import { Stream } from '@/types/stream';
import { config } from '@/utils/config';

type AppContextState = {
  streamList: Stream[] | null;
  setNewStreamList: (data: any) => void;
  fetchAppState: () => Promise<Stream[]>;
  refreshStreamList: () => Promise<void>;
  setLoadingState: (loading: boolean) => void;
};

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppContextProvider');
  return context;
};

type Props = {
  children: ReactNode;
};

export const AppContextProvider = ({ children }: Props) => {
  const [streamList, setStreamList] = useState<Stream[] | null>(null);

  const fetchAppState = async (): Promise<Stream[]> => {
    try {
      const topic = Topic.fromString(config.rawAppTopic);
      const response = await fetch(`${config.readerBeeUrl}/feeds/${config.appOwner}/${topic.toString()}`);

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    } catch (err) {
      console.error('Failed to fetch app state:', err);
      return [];
    }
  };

  const setNewStreamList = useCallback((data: Stream[]) => {
    if (!Array.isArray(data)) return;

    // If data is empty, update to empty list
    if (data.length === 0) {
      setStreamList([]);
      return;
    }

    setStreamList((currentStreamList) => {
      const latestFetched = data[data.length - 1];
      const latestExisting = currentStreamList?.[currentStreamList.length - 1];

      if (!latestExisting || latestFetched.updatedAt > latestExisting.updatedAt) {
        return data;
      }
      return currentStreamList;
    });
  }, []);

  // Only streamList for now
  const initAppState = useCallback(async () => {
    const data = await fetchAppState();
    setStreamList(data);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    if (loading) {
      setStreamList(null);
    }
  }, []);

  const refreshStreamList = useCallback(async () => {
    setLoadingState(true);
    const freshData = await fetchAppState();
    setStreamList(freshData);
  }, [setLoadingState]);

  useEffect(() => {
    initAppState();
  }, [initAppState]);

  return (
    <AppContext.Provider value={{ streamList, setNewStreamList, fetchAppState, refreshStreamList, setLoadingState }}>
      {children}
    </AppContext.Provider>
  );
};

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';

import { Stream } from '@/types/stream';
import { config } from '@/utils/config';

type AppContextState = {
  streamList: Stream[] | null;
  setNewStreamList: (data: any) => void;
  fetchAppState: () => Promise<Stream[]>;
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

  const setNewStreamList = (data: Stream[]) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const latestFetched = data[data.length - 1];
    const latestExisting = streamList?.[streamList.length - 1];

    if (!latestExisting || latestFetched.updatedAt > latestExisting.updatedAt) {
      setStreamList(data);
    }
  };

  // Only streamList for now
  const initAppState = async () => {
    const data = await fetchAppState();
    console.log('Initial fetched stream list:', data);
    setStreamList(data);
  };

  useEffect(() => {
    initAppState();
  }, []);

  return <AppContext.Provider value={{ streamList, setNewStreamList, fetchAppState }}>{children}</AppContext.Provider>;
};

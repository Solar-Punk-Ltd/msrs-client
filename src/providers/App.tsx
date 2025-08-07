import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';

import { config } from '@/utils/config';

type Stream = {
  owner: string;
  topic: string;
  state?: string;
  duration?: string;
  index?: number;
  timestamp: number;
  mediatype: 'audio' | 'video';
  title: string;
};

type AppContextState = {
  streamList: Stream[] | null;
  setNewStreamList: (data: any) => void;
  fetchAppState: () => Promise<any>;
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

  const fetchAppState = async () => {
    const topic = Topic.fromString(config.rawAppTopic);
    const response = await fetch(`${config.readerBeeUrl}/feeds/${config.appOwner}/${topic.toString()}`);
    return response.json();
  };

  const setNewStreamList = (data: any) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const latestFetched = data[data.length - 1];
    const latestExisting = streamList?.[streamList.length - 1];

    if (!latestExisting || latestFetched.timestamp > latestExisting.timestamp) {
      setStreamList(data);
    }
  };

  // Only streamList for now
  const initAppState = async () => {
    const data = await fetchAppState();
    setStreamList(data);
  };

  useEffect(() => {
    initAppState();
  }, []);

  return <AppContext.Provider value={{ streamList, setNewStreamList, fetchAppState }}>{children}</AppContext.Provider>;
};

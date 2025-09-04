import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import { mutate } from 'swr';

import { Stream } from '@/types/stream';
import { config } from '@/utils/config';

type ChangeType = 'create' | 'delete' | 'update';

interface ExpectedChange {
  type: ChangeType;
  streamId?: string;
}

interface AppContextState {
  streamList: Stream[] | null;
  isLoading: boolean;
  error: Error | null;
  setNewStreamList: (data: Stream[]) => void;
  fetchAppState: () => Promise<Stream[]>;
  refreshStreamList: (expectedChange: ExpectedChange) => Promise<void>;
  setLoadingState: (loading: boolean) => void;
}

const RETRY_CONFIG = {
  maxRetries: 5,
  retryDelay: 1000,
} as const;

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

const fetchStreamData = async (): Promise<Stream[]> => {
  try {
    const topic = Topic.fromString(config.rawAppTopic);
    const response = await fetch(`${config.readerBeeUrl}/feeds/${config.appOwner}/${topic.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch app state:', error);
    throw error;
  }
};

const hasNewerData = (newData: Stream[], existingData: Stream[] | null): boolean => {
  if (!existingData || existingData.length === 0) return true;
  if (newData.length === 0) return false;

  const latestNew = newData[newData.length - 1];
  const latestExisting = existingData[existingData.length - 1];

  return latestNew.updatedAt > latestExisting.updatedAt;
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const [streamList, setStreamList] = useState<Stream[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousListRef = useRef<Stream[] | null>(null);

  const fetchAppState = useCallback(async (): Promise<Stream[]> => {
    try {
      setError(null);
      const data = await fetchStreamData();
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      return [];
    }
  }, []);

  const setNewStreamList = useCallback((data: Stream[]) => {
    if (!Array.isArray(data)) {
      console.error('Invalid data: expected array');
      return;
    }

    setStreamList((current) => {
      if (data.length === 0) return [];
      if (hasNewerData(data, current)) return data;
      return current;
    });
  }, []);

  const initAppState = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAppState();
      setStreamList(data);
      previousListRef.current = data;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppState]);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const checkExpectedChange = useCallback((newData: Stream[], expectedChange?: ExpectedChange): boolean => {
    const currentList = previousListRef.current || [];

    switch (expectedChange?.type) {
      case 'create':
        return newData.length > currentList.length;

      case 'delete':
        return newData.length < currentList.length;

      case 'update':
        return hasNewerData(newData, currentList);

      default:
        return false;
    }
  }, []);

  const refreshStreamList = useCallback(
    async (expectedChange: ExpectedChange) => {
      setIsLoading(true);

      try {
        let changeDetected = false;

        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.retryDelay));
          }

          const freshData = await fetchAppState();

          changeDetected = checkExpectedChange(freshData, expectedChange);

          if (changeDetected) {
            setStreamList(freshData);
            previousListRef.current = freshData;
            await mutate('app-state', freshData, false);
            break;
          }
        }

        if (!changeDetected) {
          console.warn('Expected change not detected after maximum retries');
        }
      } catch (error) {
        console.error('Error refreshing stream list:', error);
        setError(error instanceof Error ? error : new Error('Failed to refresh'));
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAppState, checkExpectedChange],
  );

  useEffect(() => {
    initAppState();
  }, [initAppState]);

  const contextValue: AppContextState = {
    streamList,
    isLoading,
    error,
    setNewStreamList,
    fetchAppState,
    refreshStreamList,
    setLoadingState,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

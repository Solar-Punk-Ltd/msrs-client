import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';
import { mutate } from 'swr';

import { StateEntry } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

type ChangeType = 'create' | 'delete' | 'update';

interface ExpectedChange {
  type: ChangeType;
  streamId?: string;
}

interface AppContextState {
  streamList: StateEntry[] | null;
  isLoading: boolean;
  error: Error | null;
  setNewStreamList: (data: StateEntry[]) => void;
  fetchAppState: () => Promise<StateEntry[]>;
  refreshStreamList: (expectedChange: ExpectedChange) => Promise<void>;
}

const RETRY_CONFIG = {
  maxRetries: 10,
  retryDelay: 2000,
} as const;

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

const hasNewerData = (newData: StateEntry[], existingData: StateEntry[] | null): boolean => {
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
  const [streamList, setStreamList] = useState<StateEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentIndexRef = useRef<FeedIndex | null>(null);
  const previousListRef = useRef<StateEntry[] | null>(null);

  useEffect(() => {
    initAppState();
  }, []);

  const fetchAppState = useCallback(async (): Promise<StateEntry[]> => {
    try {
      setError(null);
      const topic = Topic.fromString(config.streamStateTopic);

      if (!currentIndexRef.current) {
        const response = await fetch(`${config.readerBeeUrl}/feeds/${config.streamStateOwner}/${topic.toString()}`, {
          headers: {
            'swarm-chunk-retrieval-timeout': '2000ms',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const hex = response.headers.get('Swarm-Feed-Index');
        if (hex) {
          currentIndexRef.current = FeedIndex.fromBigInt(BigInt(`0x${hex}`));
        }

        const data = await response.json();
        previousListRef.current = data;
        return data;
      }

      const nextIndex = currentIndexRef.current.next();
      const nextId = makeFeedIdentifier(topic, nextIndex);

      const response = await fetch(`${config.readerBeeUrl}/soc/${config.streamStateOwner}/${nextId.toString()}`, {
        headers: {
          'swarm-chunk-retrieval-timeout': '2000ms',
        },
      });

      if (!response.ok) {
        // No new data yet, return cached
        if (response.status === 404) {
          return previousListRef.current || [];
        }
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      currentIndexRef.current = nextIndex;
      const data = await response.json();
      previousListRef.current = data;
      return data;
    } catch (error) {
      console.error('Failed to fetch app state:', error);
      setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      return previousListRef.current || [];
    }
  }, []);

  const setNewStreamList = useCallback((data: StateEntry[]) => {
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
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppState]);

  const checkExpectedChange = useCallback((newData: StateEntry[], expectedChange?: ExpectedChange): boolean => {
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

          const freshData = await mutate('app-state');

          if (freshData) {
            changeDetected = checkExpectedChange(freshData, expectedChange);

            if (changeDetected) {
              setStreamList(freshData);
              await mutate('app-state', freshData, false);
              break;
            }
          }
        }

        if (!changeDetected) {
          console.warn('Expected change not detected after maximum retries');
          // Just keep polling with the current index - the change might appear later
        }
      } catch (error) {
        console.error('Error refreshing stream list:', error);
        setError(error instanceof Error ? error : new Error('Failed to refresh'));
      } finally {
        setIsLoading(false);
      }
    },
    [checkExpectedChange],
  );

  const contextValue: AppContextState = {
    streamList,
    isLoading,
    error,
    setNewStreamList,
    fetchAppState,
    refreshStreamList,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

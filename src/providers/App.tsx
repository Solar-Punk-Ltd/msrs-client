import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';
import { useQueryClient } from '@tanstack/react-query';
import { cloneDeep, isEqual } from 'lodash';

import { StateEntry } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

interface AppContextState {
  streamList: StateEntry[];
  isLoading: boolean;
  error: Error | null;
  setNewStreamList: (data: StateEntry[]) => void;
  fetchAppState: () => Promise<StateEntry[] | null>;
  refreshStreamList: () => Promise<void>;
}

const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 4000,
} as const;

const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const [streamList, setStreamList] = useState<StateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentIndexRef = useRef<FeedIndex | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    initAppState();
  }, []);

  const fetchAppState = useCallback(async (): Promise<StateEntry[] | null> => {
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
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      currentIndexRef.current = nextIndex;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch app state:', error);
      setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      return null;
    }
  }, []);

  const setNewStreamList = useCallback((data: any) => {
    if (!Array.isArray(data)) {
      console.error('Invalid data: expected array');
      return;
    }

    setStreamList((current) => {
      const clonedData = cloneDeep(data);
      if (!isEqual(current, clonedData)) {
        return clonedData;
      }
      return current;
    });
  }, []);

  const initAppState = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAppState();
      setNewStreamList(data);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppState]);

  const refreshStreamList = useCallback(async () => {
    setIsLoading(true);

    try {
      let changeDetected = false;

      const currentStateSnapshot = streamList ? cloneDeep(streamList) : null;

      for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_CONFIG.retryDelay));
        }

        const freshData = await fetchAppState();

        if (freshData) {
          changeDetected = !isEqual(currentStateSnapshot, freshData);

          if (changeDetected) {
            setNewStreamList(freshData);
            queryClient.setQueryData(['app-state'], cloneDeep(freshData));
            break;
          }
        }
      }

      if (!changeDetected) {
        console.warn('No changes detected after maximum retries');
      }
    } catch (error) {
      console.error('Error refreshing stream list:', error);
      setError(error instanceof Error ? error : new Error('Failed to refresh'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppState, setNewStreamList, streamList, queryClient]);

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

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import { useQueryClient } from '@tanstack/react-query';
import { cloneDeep, isEqual } from 'lodash';

import { StateEntry } from '@/types/stream';
import { config } from '@/utils/shared/config';

import { useWakuContext } from '../Waku';

import { WakuStreamManager } from './WakuStreamManager';

interface AppContextState {
  streamList: StateEntry[];
  isLoading: boolean;
  error: Error | null;
  isWakuEnabled: boolean;
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
  const { node } = useWakuContext();
  const queryClient = useQueryClient();

  const [streamList, setStreamList] = useState<StateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wakuManagerRef = useRef<WakuStreamManager | null>(null);
  const isSettingUpRef = useRef(false);

  const isWakuEnabled = config.isWakuEnabled;

  const fetchAppState = useCallback(async (): Promise<StateEntry[] | null> => {
    try {
      setError(null);
      const topic = Topic.fromString(config.streamStateTopic);

      const response = await fetch(`${config.readerBeeUrl}/feeds/${config.streamStateOwner}/${topic.toString()}`, {
        headers: {
          'swarm-chunk-retrieval-timeout': '2000ms',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch app state:', error);
      setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      return null;
    }
  }, []);

  const setNewStreamList = useCallback((data: StateEntry[] | null) => {
    if (!data || !Array.isArray(data)) {
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

  const setupStreamManager = useCallback(
    async (currentNode: typeof node, initialEntries: StateEntry[] | null) => {
      if (!currentNode || isSettingUpRef.current) {
        return;
      }

      isSettingUpRef.current = true;

      try {
        const manager = new WakuStreamManager(currentNode, initialEntries);
        wakuManagerRef.current = manager;

        await manager.subscribe((entries) => {
          console.log('Received stream update via Waku');
          setNewStreamList(entries);
        });
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to setup Waku'));
      } finally {
        isSettingUpRef.current = false;
      }
    },
    [setNewStreamList],
  );

  const cleanupStreamManager = useCallback(async () => {
    if (wakuManagerRef.current) {
      console.log('Cleaning up stream manager');
      const managerToCleanup = wakuManagerRef.current;
      wakuManagerRef.current = null;

      try {
        await managerToCleanup.cleanup();
      } catch (err) {
        console.error('Error during cleanup', err);
      }
    }
    isSettingUpRef.current = false;
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const initializeApp = async () => {
      if (!node || isCancelled) return;

      setIsLoading(true);

      try {
        const data = await fetchAppState();

        if (isCancelled) return;

        setNewStreamList(data);

        if (isWakuEnabled) {
          await setupStreamManager(node, data);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to initialize app state:', error);
          setError(error instanceof Error ? error : new Error('Initialization failed'));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    if (node) {
      initializeApp();
    }

    return () => {
      isCancelled = true;
      if (isWakuEnabled) {
        cleanupStreamManager();
      }
    };
  }, [node, isWakuEnabled, fetchAppState, setNewStreamList, setupStreamManager, cleanupStreamManager]);

  const refreshStreamList = useCallback(async () => {
    setIsLoading(true);

    try {
      if (isWakuEnabled && wakuManagerRef.current) {
        const freshData = await wakuManagerRef.current.waitForStreamListChange(streamList, 10000);

        if (freshData) {
          setNewStreamList(freshData);
        } else {
          console.warn('No stream list change detected within timeout');
        }
      } else {
        // Polling mode
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
      }
    } catch (error) {
      console.error('Error refreshing stream list:', error);
      setError(error instanceof Error ? error : new Error('Failed to refresh'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppState, setNewStreamList, streamList, queryClient, isWakuEnabled]);

  const contextValue: AppContextState = {
    streamList,
    isLoading,
    error,
    isWakuEnabled,
    setNewStreamList,
    fetchAppState,
    refreshStreamList,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

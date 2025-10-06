import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import { useQueryClient } from '@tanstack/react-query';
import { useWaku } from '@waku/react';
import type { LightNode } from '@waku/sdk';
import { cloneDeep, isEqual } from 'lodash';

import { StateEntry } from '@/types/stream';
import { config } from '@/utils/config';
import { WakuSubscriber } from '@/utils/waku';

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
  const queryClient = useQueryClient();
  const { node } = useWaku();

  const [streamList, setStreamList] = useState<StateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wakuManagerRef = useRef<WakuStreamManager | null>(null);

  const isWakuEnabled = config.isWakuEnabled;

  useEffect(() => {
    if (isWakuEnabled && node && !wakuManagerRef.current) {
      const wakuInstance = WakuSubscriber.getInstance();
      wakuInstance.setWakuNode(node as LightNode);

      wakuManagerRef.current = new WakuStreamManager();

      const setupWakuSubscription = async () => {
        try {
          await wakuManagerRef.current!.subscribe((entries) => {
            setNewStreamList(entries);
          });
        } catch (error) {
          console.error('Failed to setup Waku subscription:', error);
        }
      };

      setupWakuSubscription();
    }

    return () => {
      if (wakuManagerRef.current) {
        wakuManagerRef.current.cleanup();
        wakuManagerRef.current = null;
      }
    };
  }, [node, isWakuEnabled, queryClient]);

  useEffect(() => {
    initAppState();
  }, []);

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
  }, [fetchAppState, setNewStreamList]);

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
        // Polling mode: use existing logic
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

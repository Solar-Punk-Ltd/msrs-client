import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import { useQueryClient } from '@tanstack/react-query';
import { cloneDeep, isEqual } from 'lodash';

import { useSerializedEffect } from '@/hooks/useSerializedEffect';
import { StateArrayWithTimestamp, StateEntry } from '@/types/stream';
import { config } from '@/utils/shared/config';

import { useWakuContext } from '../Waku';

import { WakuStreamManager } from './WakuStreamManager';

interface AppContextState {
  streamList: StateEntry[];
  isLoading: boolean;
  error: Error | null;
  isWakuEnabled: boolean;
  setNewStreamList: (data: StateArrayWithTimestamp) => void;
  fetchAppState: () => Promise<StateArrayWithTimestamp | null>;
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
  const { node, channelManager } = useWakuContext();
  const queryClient = useQueryClient();

  const [streamList, setStreamList] = useState<StateArrayWithTimestamp>({
    entries: [],
    lastModified: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const wakuManagerRef = useRef<WakuStreamManager | null>(null);

  const isWakuEnabled = config.isWakuEnabled;

  const fetchAppState = useCallback(async (): Promise<StateArrayWithTimestamp | null> => {
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

  const setNewStreamList = useCallback((data: StateArrayWithTimestamp | null) => {
    if (!data || !Array.isArray(data.entries) || !data.lastModified) {
      console.error('Invalid data as stream list:', data);
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

  useSerializedEffect(
    'app-stream-manager',
    async (isMounted) => {
      if (!node || !channelManager) {
        // Clean up existing manager if it exists
        if (wakuManagerRef.current) {
          console.log('🧹 Cleaning up existing stream manager due to missing node or channel manager');
          await wakuManagerRef.current.cleanup();
          wakuManagerRef.current = null;

          // Reset state
          if (isMounted()) {
            setStreamList({ entries: [], lastModified: 0 });
            setIsLoading(true);
            setError(null);
          }
        }

        console.log('⏸️  Waiting for Waku node and channel manager to become available...');
        return;
      }

      // Skip if already initialized with current node
      if (wakuManagerRef.current) {
        console.log('✅ Stream manager already exists and node is available');
        return;
      }

      setIsLoading(true);

      try {
        const data = await fetchAppState();

        // Check if still mounted after async operation
        if (!isMounted()) {
          console.log('⏭️  Component unmounted during fetch, aborting');
          return;
        }

        setNewStreamList({
          entries: data ? data.entries : [],
          lastModified: data ? data.lastModified : 0,
        });

        // Setup Waku stream manager if enabled
        if (isWakuEnabled && node && channelManager) {
          const manager = new WakuStreamManager(channelManager, data);

          // Check if still mounted after instantiation
          if (!isMounted()) {
            console.log('⏭️  Component unmounted during manager setup, cleaning up');
            await manager.cleanup();
            return;
          }

          wakuManagerRef.current = manager;

          await manager.subscribe((stateArray) => {
            // Only update if still mounted
            if (isMounted()) {
              console.log('📨 Received stream update via Waku');
              setNewStreamList(stateArray);
            }
          });

          // Check if still mounted after subscription
          if (!isMounted()) {
            console.log('⏭️  Component unmounted after subscription, cleaning up');
            await manager.cleanup();
            wakuManagerRef.current = null;
            return;
          }

          console.log('✅ Waku stream manager setup complete');
        }

        // Check if still mounted before final state update
        if (!isMounted()) {
          console.log('⏭️  Component unmounted, skipping final state update');
          // Cleanup manager if we created one
          if (wakuManagerRef.current) {
            await wakuManagerRef.current.cleanup();
            wakuManagerRef.current = null;
          }
          return;
        }

        setIsLoading(false);
        console.log('✅ App initialization complete');
      } catch (error) {
        if (!isMounted()) {
          console.log('⏭️  Component unmounted, ignoring error');
          return;
        }

        console.error('❌ Failed to initialize app state:', error);
        setError(error instanceof Error ? error : new Error('Initialization failed'));
        setIsLoading(false);
      }
    },
    async () => {
      if (wakuManagerRef.current) {
        const managerToCleanup = wakuManagerRef.current;
        wakuManagerRef.current = null;

        try {
          await managerToCleanup.cleanup();
          console.log('✅ Stream manager cleanup complete');
        } catch (err) {
          console.error('❌ Error during cleanup:', err);
        }
      }
    },
    [node, channelManager, isWakuEnabled],
  );

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
    streamList: streamList.entries,
    isLoading,
    error,
    isWakuEnabled,
    setNewStreamList,
    fetchAppState,
    refreshStreamList,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

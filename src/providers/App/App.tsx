import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';
import { useQueryClient } from '@tanstack/react-query';
import { cloneDeep, isEqual } from 'lodash';

import { useSerializedEffect } from '@/hooks/useSerializedEffect';
import { MessageReceiveMode } from '@/types/messaging';
import { StateArrayWithTimestamp, StateEntry } from '@/types/stream';
import { fetchRegistrationFeed } from '@/utils/auth/login';
import { persistAdminConfigs } from '@/utils/auth/persistence';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { sleep } from '@/utils/shared/async';
import { config } from '@/utils/shared/config';

import { useWakuContext } from '../Waku';

import { WakuStreamManager } from './WakuStreamManager';

interface AppContextState {
  streamList: StateEntry[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  messageReceiveMode: MessageReceiveMode;
  setNewStreamList: (data: StateArrayWithTimestamp) => void;
  fetchAppState: () => Promise<StateArrayWithTimestamp | null>;
  fetchInitialAppState: () => Promise<StateArrayWithTimestamp | null>;
  refreshStreamList: (signal?: AbortSignal) => Promise<void>;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wakuManagerRef = useRef<WakuStreamManager | null>(null);
  const currentIndexRef = useRef<FeedIndex | null>(null);

  const messageReceiveMode = config.messageReceiveMode;
  const shouldUseWaku =
    messageReceiveMode === MessageReceiveMode.WAKU || messageReceiveMode === MessageReceiveMode.BOTH;

  const fetchInitialAppState = useCallback(async (): Promise<StateArrayWithTimestamp | null> => {
    try {
      setError(null);
      const topic = Topic.fromString(config.streamStateTopic);

      const response = await fetch(`${config.readerBeeUrl}/feeds/${config.streamStateOwner}/${topic.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const hex = response.headers.get('Swarm-Feed-Index');
      if (hex) {
        currentIndexRef.current = FeedIndex.fromBigInt(BigInt(`0x${hex}`));
      }

      const data = await response.json();
      return data;
    } catch (error) {
      currentIndexRef.current = FeedIndex.fromBigInt(BigInt(-1));
      console.error('Failed to fetch initial app state:', error);
      setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      return null;
    }
  }, []);

  const fetchAppState = useCallback(async (): Promise<StateArrayWithTimestamp | null> => {
    if (!currentIndexRef.current) {
      console.warn('Index not available, call fetchInitialAppState first');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      setError(null);
      const topic = Topic.fromString(config.streamStateTopic);

      const nextIndex = currentIndexRef.current.next();
      const nextId = makeFeedIdentifier(topic, nextIndex);

      const response = await fetch(`${config.readerBeeUrl}/soc/${config.streamStateOwner}/${nextId.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      currentIndexRef.current = nextIndex;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
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
      const isInitialState = current.lastModified === 0 && current.entries.length === 0;
      const isNewerData = data.lastModified > current.lastModified;

      if (isInitialState || isNewerData) {
        return cloneDeep(data);
      }

      return current;
    });
  }, []);

  useSerializedEffect(
    'app-stream-manager',
    async (isMounted) => {
      if (shouldUseWaku && (!node || !channelManager)) {
        if (wakuManagerRef.current) {
          console.log('🧹 Cleaning up existing stream manager due to missing node or channel manager');
          const managerToCleanup = wakuManagerRef.current;
          wakuManagerRef.current = null;

          try {
            await managerToCleanup.cleanup();
          } catch (err) {
            console.error('Error cleaning up manager:', err);
          }

          if (isMounted()) {
            setStreamList({ entries: [], lastModified: 0 });
            setIsLoading(true);
            setError(null);
          }
        }

        console.log('⏸️  Waiting for Waku node and channel manager to become available...');
        return;
      }

      if (wakuManagerRef.current) {
        console.log('✅ Stream manager already initialized');
        return;
      }

      setIsLoading(true);

      try {
        const [adminConfigsResult, dataResult] = await Promise.allSettled([
          fetchRegistrationFeed(),
          fetchInitialAppState(),
        ]);

        const adminConfigs = adminConfigsResult.status === 'fulfilled' ? adminConfigsResult.value : [];
        const data = dataResult.status === 'fulfilled' ? dataResult.value : null;

        if (adminConfigs.length > 0) {
          persistAdminConfigs(adminConfigs);
        }

        if (!isMounted()) {
          console.log('⏭️  Component unmounted during fetch, aborting');
          return;
        }

        setNewStreamList({
          entries: data ? data.entries : [],
          lastModified: data ? data.lastModified : 0,
        });

        if (shouldUseWaku && node && channelManager && !wakuManagerRef.current) {
          const manager = new WakuStreamManager(channelManager, data);

          if (!isMounted()) {
            console.log('⏭️  Component unmounted during manager setup');
            await manager.cleanup();
            return;
          }

          wakuManagerRef.current = manager;

          try {
            await manager.subscribe((stateArray) => {
              if (isMounted() && wakuManagerRef.current === manager) {
                console.log('📨 Received stream update via Waku');
                setNewStreamList(stateArray);
              }
            });

            if (!isMounted() || wakuManagerRef.current !== manager) {
              console.log('⏭️  Invalid state after subscription, cleaning up');
              await manager.cleanup();
              if (wakuManagerRef.current === manager) {
                wakuManagerRef.current = null;
              }
              return;
            }

            console.log('✅ Waku stream manager setup complete');
          } catch (err) {
            console.error('Failed to subscribe to Waku:', err);
            if (wakuManagerRef.current === manager) {
              wakuManagerRef.current = null;
            }
            await manager.cleanup();
            throw err;
          }
        }

        if (isMounted()) {
          setIsLoading(false);
          console.log(`✅ App initialization complete (mode: ${messageReceiveMode})`);
        }
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
          console.log('✅ Waku stream manager cleanup complete');
        } catch (err) {
          console.error('❌ Error during Waku cleanup:', err);
        }
      }
    },
    [node, channelManager, messageReceiveMode, shouldUseWaku],
  );

  const refreshStreamList = useCallback(
    async (signal?: AbortSignal) => {
      if (signal?.aborted) {
        return;
      }

      setIsRefreshing(true);

      try {
        if (shouldUseWaku && wakuManagerRef.current) {
          const wakuPromise = wakuManagerRef.current.waitForStreamListChange(streamList, 10000);

          const fallbackPromise = new Promise<StateArrayWithTimestamp | null>((resolve) => {
            setTimeout(async () => {
              if (signal?.aborted) {
                resolve(null);
                return;
              }
              const data = await fetchAppState();
              resolve(data);
            }, 3500);
          });

          const freshData = await Promise.race([wakuPromise, fallbackPromise]);

          if (signal?.aborted) {
            return;
          }

          if (freshData) {
            setNewStreamList(freshData);
            queryClient.setQueryData(['app-state'], cloneDeep(freshData));
          } else {
            console.warn('No stream list change detected within timeout');
          }
        } else {
          let changeDetected = false;
          const currentStateSnapshot = streamList ? cloneDeep(streamList) : null;

          for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
            if (signal?.aborted) {
              return;
            }

            if (attempt > 0) {
              await sleep(RETRY_CONFIG.retryDelay);
            }

            if (signal?.aborted) {
              return;
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

          if (!changeDetected && !signal?.aborted) {
            console.warn('No changes detected after maximum retries');
          }
        }
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        console.error('Error refreshing stream list:', error);
        setError(error instanceof Error ? error : new Error('Failed to refresh'));
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchAppState, setNewStreamList, streamList, queryClient, shouldUseWaku],
  );

  const contextValue: AppContextState = {
    streamList: streamList.entries,
    isLoading,
    isRefreshing,
    error,
    messageReceiveMode,
    setNewStreamList,
    fetchAppState,
    fetchInitialAppState,
    refreshStreamList,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

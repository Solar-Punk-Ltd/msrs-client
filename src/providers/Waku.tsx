import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { LightNode } from '@solarpunkltd/waku-sdk';

import { useSerializedEffect } from '@/hooks/useSerializedEffect';
import { WakuChannelManager } from '@/utils/waku/WakuChannelManager';

import { WakuNodeManager } from '../utils/waku/WakuNodeManager';

interface WakuContextState {
  isHealty: boolean;
  isRecovering: boolean;
  node: LightNode | null;
  channelManager: WakuChannelManager | null;
}

const WakuContext = createContext<WakuContextState | null>(null);

interface WakuProviderProps {
  children: React.ReactNode;
}

interface NodeState {
  isHealty: boolean;
  isRecovering: boolean;
  node: LightNode | null;
}

export function WakuProvider({ children }: WakuProviderProps) {
  const [nodeState, setNodeState] = useState<NodeState>({
    isHealty: false,
    isRecovering: false,
    node: null,
  });

  const [channelManager, setChannelManager] = useState<WakuChannelManager | null>(null);

  const nodeManagerRef = useRef<WakuNodeManager | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;
    let setupAborted = false;

    const nodeManager = WakuNodeManager.getInstance();
    nodeManagerRef.current = nodeManager;

    const initNode = async () => {
      try {
        await nodeManager.setupWakuNode();

        if (!isMounted || setupAborted) {
          console.log('[WakuProvider] Setup aborted, component unmounted');
          return;
        }

        listenerCleanupRef.current = nodeManager.addListener({
          onNodeReady: () => {
            if (!isMounted) return;

            console.log('[WakuProvider] Node ready', Date.now());
            const node = nodeManagerRef.current?.getWakuNode() || null;
            setNodeState({
              isHealty: true,
              isRecovering: false,
              node,
            });
          },
          onNodeLost: () => {
            if (!isMounted) return;

            console.log('[WakuProvider] Node lost');
            setNodeState({
              isHealty: false,
              isRecovering: true,
              node: null,
            });
          },
        });
      } catch (error) {
        if (isMounted && !setupAborted) {
          console.error('[WakuProvider] Failed to set Waku node:', error);
          setNodeState({
            isHealty: false,
            isRecovering: false,
            node: null,
          });
        }
      }
    };

    initNode();

    return () => {
      isMounted = false;
      setupAborted = true;

      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
        listenerCleanupRef.current = null;
      }
    };
  }, []);

  useSerializedEffect(
    'waku-channel-manager',
    async (isMounted) => {
      const node = nodeState.node;

      if (!node) {
        // Clean up existing channel manager if node is lost
        if (channelManager) {
          const managerToCleanup = channelManager;

          if (isMounted()) {
            setChannelManager(null);
          }

          try {
            await managerToCleanup.destroy();
          } catch (err) {
            console.error('Error during channel manager cleanup:', err);
          }
        }

        return;
      }

      if (channelManager) {
        return;
      }

      try {
        const manager = new WakuChannelManager();
        manager.setNode(node);

        if (!isMounted()) {
          await manager.destroy();
          return;
        }

        setChannelManager(manager);
      } catch (error) {
        if (!isMounted()) {
          console.log('⏭️ Component unmounted, ignoring channel manager setup error');
          return;
        }

        console.error('❌ Failed to initialize channel manager:', error);
      }
    },
    async () => {
      if (channelManager) {
        const managerToCleanup = channelManager;
        setChannelManager(null);

        try {
          await managerToCleanup.destroy();
        } catch (err) {
          console.error('❌ Error during channel manager cleanup on unmount:', err);
        }
      }
    },
    [nodeState.node],
  );

  const contextValue: WakuContextState = {
    ...nodeState,
    channelManager,
  };

  return <WakuContext.Provider value={contextValue}>{children}</WakuContext.Provider>;
}

export function useWakuContext(): WakuContextState {
  const context = useContext(WakuContext);
  if (!context) {
    throw new Error('useWakuContext must be used within a WakuProvider');
  }
  return context;
}

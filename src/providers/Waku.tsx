import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { LightNode } from '@waku/sdk';

import { WakuNodeManager } from '../utils/waku/WakuNodeManager';

interface WakuContextState {
  isHealty: boolean;
  isRecovering: boolean;
  node: LightNode | null;
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

  const nodeManagerRef = useRef<WakuNodeManager | null>(null);

  useEffect(() => {
    let isMounted = true;

    const nodeManager = WakuNodeManager.getInstance();
    nodeManagerRef.current = nodeManager;

    const initNode = async () => {
      try {
        await nodeManager.setupWakuNode();

        if (!isMounted) return;

        nodeManager.addListener({
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
        if (isMounted) {
          console.error('[WakuProvider] Failed to set Waku node:', error);
        }
      }
    };

    initNode();

    return () => {
      isMounted = false;

      if (nodeManagerRef.current) {
        nodeManagerRef.current.cleanListeners();
      }
    };
  }, []);

  const contextValue: WakuContextState = nodeState;

  return <WakuContext.Provider value={contextValue}>{children}</WakuContext.Provider>;
}

export function useWakuContext(): WakuContextState {
  const context = useContext(WakuContext);
  if (!context) {
    throw new Error('useWakuContext must be used within a WakuProvider');
  }
  return context;
}

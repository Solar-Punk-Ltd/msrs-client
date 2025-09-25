import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { fetchGatewayNodes, NodeInfo } from '@/utils/node';
import { loadStampInfo as loadStampInfoFromContract, StampInfo } from '@/utils/stamp';

export interface StampWithInfo {
  stampId: string;
  stampInfo?: StampInfo;
  error?: string;
  nodeInfo: NodeInfo;
}

export interface StreamGroup {
  streamId: string;
  stamps: StampWithInfo[];
}

interface StampsState {
  pinnedStreams: StreamGroup[];
  privateStamps: StampWithInfo[];
  publicStamps: StampWithInfo[];
  isLoading: boolean;
  error: string | null;
}

export function useStamps(adminSecret: string | undefined, _provider: ethers.Provider | null) {
  const [state, setState] = useState<StampsState>({
    pinnedStreams: [],
    privateStamps: [],
    publicStamps: [],
    isLoading: true,
    error: null,
  });

  const loadStamps = useCallback(async () => {
    if (!adminSecret) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        pinnedStreams: [],
        privateStamps: [],
        publicStamps: [],
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const nodes = await fetchGatewayNodes({ adminSecret });

      const loadStampInfo = async (node: NodeInfo): Promise<StampWithInfo> => {
        try {
          const stampInfo = await loadStampInfoFromContract(node.hash);
          return {
            stampId: node.hash,
            stampInfo,
            nodeInfo: node,
          };
        } catch (error) {
          return {
            stampId: node.hash,
            nodeInfo: node,
            error: error instanceof Error ? error.message : 'Failed to load stamp info',
          };
        }
      };

      const [privateStampsWithInfo, publicStampsWithInfo] = await Promise.all([
        Promise.all(nodes.nodes.private_writers.map(loadStampInfo)),
        Promise.all(nodes.nodes.public_writers.map(loadStampInfo)),
      ]);

      const pinnedStamps = privateStampsWithInfo.filter((stamp) => stamp.nodeInfo.lock_info?.pinned);
      const unpinnedPrivateStamps = privateStampsWithInfo.filter((stamp) => !stamp.nodeInfo.lock_info?.pinned);

      const streamGroups = new Map<string, StampWithInfo[]>();
      pinnedStamps.forEach((stamp) => {
        const streamId = stamp.nodeInfo.lock_info?.stream_id;
        if (streamId) {
          if (!streamGroups.has(streamId)) {
            streamGroups.set(streamId, []);
          }
          streamGroups.get(streamId)!.push(stamp);
        }
      });

      const pinnedStreams: StreamGroup[] = Array.from(streamGroups.entries()).map(([streamId, stamps]) => ({
        streamId,
        stamps: stamps.sort((a, b) => {
          const typeA = a.nodeInfo.lock_info?.type || '';
          const typeB = b.nodeInfo.lock_info?.type || '';
          if (typeA === 'media' && typeB === 'chat') return -1;
          if (typeA === 'chat' && typeB === 'media') return 1;
          return 0;
        }),
      }));

      setState((prev) => ({
        ...prev,
        pinnedStreams,
        privateStamps: unpinnedPrivateStamps,
        publicStamps: publicStampsWithInfo,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch stamps',
        isLoading: false,
      }));
    }
  }, [adminSecret]);

  useEffect(() => {
    loadStamps();
  }, [loadStamps]);

  return {
    ...state,
    refresh: loadStamps,
  };
}

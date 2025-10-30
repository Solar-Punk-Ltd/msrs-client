import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { fetchGatewayNodes, NodeInfo } from '@/utils/node';
import { loadStampInfo as loadStampInfoFromContract, StampInfo } from '@/utils/stampInfo';

export interface StampWithInfo {
  stampId: string;
  stampInfo?: StampInfo;
  error?: string;
  nodeInfo: NodeInfo;
  isLoading?: boolean;
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

  const updateStampInState = useCallback((stampId: string, updates: Partial<StampWithInfo>) => {
    setState((prev) => {
      const updateStampInArray = (stamps: StampWithInfo[]) =>
        stamps.map((stamp) => (stamp.stampId === stampId ? { ...stamp, ...updates } : stamp));

      const updateStampInStreams = (streams: StreamGroup[]) =>
        streams.map((stream) => ({
          ...stream,
          stamps: updateStampInArray(stream.stamps),
        }));

      return {
        ...prev,
        pinnedStreams: updateStampInStreams(prev.pinnedStreams),
        privateStamps: updateStampInArray(prev.privateStamps),
        publicStamps: updateStampInArray(prev.publicStamps),
      };
    });
  }, []);

  const loadStamp = useCallback(
    async (stampId: string): Promise<void> => {
      if (!adminSecret) return;

      updateStampInState(stampId, { isLoading: true });

      try {
        const stampInfo = await loadStampInfoFromContract(stampId);
        updateStampInState(stampId, { stampInfo, error: undefined, isLoading: false });
      } catch (error) {
        updateStampInState(stampId, {
          error: error instanceof Error ? error.message : 'Failed to load stamp info',
          isLoading: false,
        });
      }
    },
    [adminSecret, updateStampInState],
  );

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

      const [privateResults, publicResults] = await Promise.all([
        Promise.allSettled(nodes.nodes.private_writers.map(loadStampInfo)),
        Promise.allSettled(nodes.nodes.public_writers.map(loadStampInfo)),
      ]);

      const privateStampsWithInfo = privateResults
        .filter((result): result is PromiseFulfilledResult<StampWithInfo> => {
          if (result.status === 'rejected') {
            console.error('Unexpected promise rejection loading private stamp:', result.reason);
          }
          return result.status === 'fulfilled';
        })
        .map((result) => result.value);

      const publicStampsWithInfo = publicResults
        .filter((result): result is PromiseFulfilledResult<StampWithInfo> => {
          if (result.status === 'rejected') {
            console.error('Unexpected promise rejection loading public stamp:', result.reason);
          }
          return result.status === 'fulfilled';
        })
        .map((result) => result.value);

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
    loadStamp,
    loadStamps,
    refresh: loadStamp,
    refreshAll: loadStamps,
  };
}

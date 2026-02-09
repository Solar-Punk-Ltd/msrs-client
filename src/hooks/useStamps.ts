import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { loadStampInfo as loadStampInfoFromContract, StampInfo as ContractStampInfo } from '@/utils/network/stampInfo';
import {
  CustomPrivateWriterNode,
  fetchGatewayNodes,
  NodeType,
  PrivateWriterNode,
  PublicWriterNode,
  StampInfo,
} from '@/utils/stream/node';

export interface StampWithInfo {
  stampId: string;
  stampInfo?: ContractStampInfo;
  error?: string;
  nodeInfo: StampInfo;
  port: string;
  isLoading?: boolean;
  tags?: string[];
}

export interface StreamGroup {
  streamId: string;
  stamps: StampWithInfo[];
}

interface StampsState {
  pinnedStreams: StreamGroup[];
  privateStamps: StampWithInfo[];
  publicStamps: StampWithInfo[];
  customPrivateStamps: StampWithInfo[];
  isLoading: boolean;
  error: string | null;
}

export function useStamps(adminSecret: string | undefined, _provider: ethers.Provider | null) {
  const [state, setState] = useState<StampsState>({
    pinnedStreams: [],
    privateStamps: [],
    publicStamps: [],
    customPrivateStamps: [],
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
        customPrivateStamps: updateStampInArray(prev.customPrivateStamps),
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
        customPrivateStamps: [],
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetchGatewayNodes({ adminSecret });

      const loadStampInfo = async (
        stampId: string,
        stampInfo: StampInfo,
        port: string,
        tags?: string[],
      ): Promise<StampWithInfo> => {
        try {
          const contractStampInfo = await loadStampInfoFromContract(stampId);
          return {
            stampId,
            stampInfo: contractStampInfo,
            nodeInfo: stampInfo,
            port,
            tags,
          };
        } catch (error) {
          return {
            stampId,
            nodeInfo: stampInfo,
            port,
            tags,
            error: error instanceof Error ? error.message : 'Failed to load stamp info',
          };
        }
      };

      // Flatten all private writer stamps (each port can have multiple stamps)
      const privateStampPromises = response.nodes.private_writers.flatMap((node: PrivateWriterNode) =>
        node.stamps.map((stampInfo) => loadStampInfo(stampInfo.stamp, stampInfo, node.port)),
      );

      // Public writers have one stamp per port
      const publicStampPromises = response.nodes.public_writers.map((node: PublicWriterNode) => {
        const stampInfo: StampInfo = { stamp: node.stamp, state: 'free' };
        return loadStampInfo(node.stamp, stampInfo, node.port);
      });

      // Custom private writers have stamps with tags
      const customPrivateStampPromises = response.nodes.custom_private_writers.flatMap(
        (node: CustomPrivateWriterNode) =>
          node.stamps.map((stampInfo) => loadStampInfo(stampInfo.stamp, stampInfo, node.port, stampInfo.tags)),
      );

      const [privateResults, publicResults, customPrivateResults] = await Promise.all([
        Promise.allSettled(privateStampPromises),
        Promise.allSettled(publicStampPromises),
        Promise.allSettled(customPrivateStampPromises),
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

      const customPrivateStampsWithInfo = customPrivateResults
        .filter((result): result is PromiseFulfilledResult<StampWithInfo> => {
          if (result.status === 'rejected') {
            console.error('Unexpected promise rejection loading custom private stamp:', result.reason);
          }
          return result.status === 'fulfilled';
        })
        .map((result) => result.value);

      const pinnedStamps = privateStampsWithInfo.filter((stamp) => stamp.nodeInfo.history?.pinned);
      const unpinnedPrivateStamps = privateStampsWithInfo.filter((stamp) => !stamp.nodeInfo.history?.pinned);

      const streamGroups = new Map<string, StampWithInfo[]>();
      pinnedStamps.forEach((stamp) => {
        const streamId = stamp.nodeInfo.history?.stream_id;
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
          const typeA = a.nodeInfo.history?.type || '';
          const typeB = b.nodeInfo.history?.type || '';
          if (typeA === NodeType.MEDIA && typeB === NodeType.CHAT) return -1;
          if (typeA === NodeType.CHAT && typeB === NodeType.MEDIA) return 1;
          return 0;
        }),
      }));

      setState((prev) => ({
        ...prev,
        pinnedStreams,
        privateStamps: unpinnedPrivateStamps,
        publicStamps: publicStampsWithInfo,
        customPrivateStamps: customPrivateStampsWithInfo,
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

import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { fetchGatewayNodes, NodeInfo } from '@/utils/node';
import { loadStampInfo as loadStampInfoFromContract, StampInfo } from '@/utils/stamp';

export interface StampWithInfo {
  stampId: string;
  stampInfo?: StampInfo;
  error?: string;
}

interface StampsState {
  privateStamps: StampWithInfo[];
  publicStamps: StampWithInfo[];
  isLoading: boolean;
  error: string | null;
}

export function useStamps(adminSecret: string | undefined, _provider: ethers.Provider | null) {
  const [state, setState] = useState<StampsState>({
    privateStamps: [],
    publicStamps: [],
    isLoading: true,
    error: null,
  });

  const loadStamps = useCallback(async () => {
    if (!adminSecret) {
      setState((prev) => ({ ...prev, isLoading: false, error: null, privateStamps: [], publicStamps: [] }));
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
          };
        } catch (error) {
          return {
            stampId: node.hash,
            error: error instanceof Error ? error.message : 'Failed to load stamp info',
          };
        }
      };

      const [privateStampsWithInfo, publicStampsWithInfo] = await Promise.all([
        Promise.all(nodes.nodes.private_writers.map(loadStampInfo)),
        Promise.all(nodes.nodes.public_writers.map(loadStampInfo)),
      ]);

      setState((prev) => ({
        ...prev,
        privateStamps: privateStampsWithInfo,
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

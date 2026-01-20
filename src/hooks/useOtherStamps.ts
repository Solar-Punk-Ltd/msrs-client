import { useCallback, useEffect, useState } from 'react';

import { loadStampInfo as loadStampInfoFromContract, StampInfo as ContractStampInfo } from '@/utils/network/stampInfo';

export interface OtherStampWithInfo {
  stampId: string;
  stampInfo?: ContractStampInfo;
  error?: string;
  isLoading?: boolean;
}

interface OtherStampsState {
  stamps: OtherStampWithInfo[];
  isLoading: boolean;
  error: string | null;
}

export function useOtherStamps(stampIds: string[]) {
  const [state, setState] = useState<OtherStampsState>({
    stamps: [],
    isLoading: true,
    error: null,
  });

  const updateStampInState = useCallback((stampId: string, updates: Partial<OtherStampWithInfo>) => {
    setState((prev) => ({
      ...prev,
      stamps: prev.stamps.map((stamp) => (stamp.stampId === stampId ? { ...stamp, ...updates } : stamp)),
    }));
  }, []);

  const loadStamp = useCallback(
    async (stampId: string): Promise<void> => {
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
    [updateStampInState],
  );

  const loadStamps = useCallback(async () => {
    if (stampIds.length === 0) {
      setState({
        stamps: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const loadStampInfo = async (stampId: string): Promise<OtherStampWithInfo> => {
        try {
          const contractStampInfo = await loadStampInfoFromContract(stampId);
          return {
            stampId,
            stampInfo: contractStampInfo,
          };
        } catch (error) {
          return {
            stampId,
            error: error instanceof Error ? error.message : 'Failed to load stamp info',
          };
        }
      };

      const stampPromises = stampIds.map((stampId) => loadStampInfo(stampId));
      const results = await Promise.allSettled(stampPromises);

      const stampsWithInfo = results
        .filter((result): result is PromiseFulfilledResult<OtherStampWithInfo> => {
          if (result.status === 'rejected') {
            console.error('Unexpected promise rejection loading other stamp:', result.reason);
          }
          return result.status === 'fulfilled';
        })
        .map((result) => result.value);

      setState({
        stamps: stampsWithInfo,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch stamps',
        isLoading: false,
      }));
    }
  }, [stampIds]);

  useEffect(() => {
    loadStamps();
  }, [loadStamps]);

  return {
    ...state,
    refresh: loadStamp,
    refreshAll: loadStamps,
  };
}

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { hasSufficientBalance } from '@/utils/network/contracts';
import { tryBatchTopUp } from '@/utils/network/eip5792';
import {
  BulkStampTopUpProgressCallback,
  BulkStampTopUpResult,
  calculateBulkStampTopUpPlan,
  extendBulkStampDuration,
  TOPUP_STATUS,
  TopUpStatus,
} from '@/utils/network/stampTopup';
import { getWalletService } from '@/utils/network/wallet';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';

export interface ProgressState {
  status: TopUpStatus;
  stampId?: string;
  index?: number;
  total?: number;
  error?: string;
}

interface UseBulkStampTopUpMutationOptions {
  onComplete?: () => void;
}

export function useBulkStampTopUpMutation(options?: UseBulkStampTopUpMutationOptions) {
  const queryClient = useQueryClient();
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      signer,
      stampIds,
      additionalDays,
    }: {
      signer: ethers.Signer;
      stampIds: string[];
      additionalDays: number;
    }) => {
      const progressCallback: BulkStampTopUpProgressCallback = (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      };

      const provider = signer.provider;
      if (!provider) throw new Error('No provider available');

      const userAddress = await signer.getAddress();
      const plan = await calculateBulkStampTopUpPlan(stampIds, additionalDays);

      if (plan.stampsNeedingTopUp.length === 0) {
        return { successful: [], failed: [] } as BulkStampTopUpResult;
      }

      const hasBalance = await hasSufficientBalance(provider, userAddress, plan.totalCostPlur);
      if (!hasBalance) {
        throw new Error(`Insufficient BZZ balance. Need ${plan.totalCostBzz.toDecimalString()} BZZ`);
      }

      const ethereum = getWalletService().getEthereum();
      if (ethereum) {
        const batchResult = await tryBatchTopUp(ethereum, userAddress, plan, progressCallback);
        if (batchResult) {
          return batchResult;
        }
      }

      return extendBulkStampDuration(signer, stampIds, additionalDays, progressCallback);
    },
    onSuccess: (result) => {
      if (result.failed.length === 0) {
        queryClient.invalidateQueries({ queryKey: ['bulk-stamp-expirations'] });
        queryClient.invalidateQueries({ queryKey: ['bulk-stamp-topup-plan'] });
        options?.onComplete?.();
      }
    },
    onError: (err) => {
      const message = getUserFriendlyErrorMessage(err);
      setProgressState({ status: TOPUP_STATUS.ERROR, error: message });
      setErrorModal(message);
    },
  });

  const execute = useCallback(
    (signer: ethers.Signer | null, stampIds: string[], additionalDays: number) => {
      if (!signer) {
        setErrorModal('Please connect your wallet first.');
        return;
      }
      setProgressState(null);
      mutation.mutate({ signer, stampIds, additionalDays });
    },
    [mutation],
  );

  return {
    execute,
    isExecuting: mutation.isPending,
    result: (mutation.data as BulkStampTopUpResult) ?? null,
    progressState,
    errorModal,
    clearErrorModal: () => setErrorModal(null),
  };
}

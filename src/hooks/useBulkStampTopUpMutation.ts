import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

import { hasSufficientBalance } from '@/utils/network/contracts';
import { tryBatchTopUp } from '@/utils/network/eip5792';
import {
  BulkStampTopUpProgressCallback,
  BulkStampTopUpResult,
  calculateBulkStampTopUpPlan,
  TOPUP_STATUS,
  TopUpStatus,
} from '@/utils/network/stampTopup';
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
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ stampIds, additionalDays }: { stampIds: string[]; additionalDays: number }) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('No wallet connected. Please connect your wallet and try again.');
      }

      const progressCallback: BulkStampTopUpProgressCallback = (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      };

      const plan = await calculateBulkStampTopUpPlan(stampIds, additionalDays);

      if (plan.stampsNeedingTopUp.length === 0) {
        return { successful: [], failed: [] } as BulkStampTopUpResult;
      }

      const hasBalance = await hasSufficientBalance(publicClient, address, plan.totalCostPlur);
      if (!hasBalance) {
        throw new Error(
          `Not enough BZZ to complete this top-up. Required: ${plan.totalCostBzz.toDecimalString()} BZZ. Please add more BZZ to your wallet.`,
        );
      }

      const batchResult = await tryBatchTopUp(address, plan, progressCallback);
      if (batchResult) {
        return batchResult;
      }

      throw new Error(
        'Your wallet does not support atomic batch transactions (EIP-5792). Please use a compatible wallet.',
      );
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
    (stampIds: string[], additionalDays: number) => {
      if (!walletClient || !publicClient) {
        setErrorModal('No wallet connected. Please connect your wallet and try again.');
        return;
      }
      setProgressState(null);
      mutation.mutate({ stampIds, additionalDays });
    },
    [mutation, walletClient, publicClient],
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

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Address } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

import { useWallet } from '@/providers/Wallet';
import { executeBatchTopUp } from '@/utils/network/batchTopUp';
import { hasSufficientBalance } from '@/utils/network/contracts';
import {
  BulkStampTopUpProgressCallback,
  calculateBulkStampTopUpPlan,
  TOPUP_STATUS,
  TopUpStatus,
} from '@/utils/network/stampTopup';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';

export interface ProgressState {
  status: TopUpStatus;
  total?: number;
  error?: string;
}

interface UseBulkStampTopUpMutationOptions {
  onComplete?: () => void;
}

export function useBulkStampTopUpMutation(options?: UseBulkStampTopUpMutationOptions) {
  const queryClient = useQueryClient();
  const { account } = useWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const address = account as Address | null;

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
          total: detail.total,
          error: detail.error,
        });
      };

      const plan = await calculateBulkStampTopUpPlan(stampIds, additionalDays);

      if (plan.stampsNeedingTopUp.length === 0) {
        return;
      }

      const hasBalance = await hasSufficientBalance(publicClient, address, plan.totalCostPlur);
      if (!hasBalance) {
        throw new Error(
          `Not enough BZZ to complete this top-up. Required: ${plan.totalCostBzz.toDecimalString()} BZZ. Please add more BZZ to your wallet.`,
        );
      }

      await executeBatchTopUp(walletClient, publicClient, plan, progressCallback);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-stamp-expirations'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-stamp-topup-plan'] });
      options?.onComplete?.();
    },
    onError: (err) => {
      const message = getUserFriendlyErrorMessage(err);
      setProgressState({ status: TOPUP_STATUS.ERROR, error: message });
      setErrorModal(message);
    },
  });

  const execute = useCallback(
    (stampIds: string[], additionalDays: number) => {
      if (!walletClient || !publicClient || !address) {
        setErrorModal('No wallet connected. Please connect your wallet and try again.');
        return;
      }
      setProgressState(null);
      mutation.mutate({ stampIds, additionalDays });
    },
    [mutation, walletClient, publicClient, address],
  );

  return {
    execute,
    isExecuting: mutation.isPending,
    progressState,
    errorModal,
    clearErrorModal: () => setErrorModal(null),
  };
}

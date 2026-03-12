import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { BulkStampTopUpResult, extendBulkStampDuration, TOPUP_STATUS, TopUpStatus } from '@/utils/network/stampTopup';
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
      return extendBulkStampDuration(signer, stampIds, additionalDays, (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      });
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

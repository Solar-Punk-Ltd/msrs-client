import { useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

import { extendStampDuration } from '@/utils/network/stampTopup';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';

interface UseStampTopUpReturn {
  isTopUpLoading: boolean;
  errorModalOpen: boolean;
  errorMessage: string;
  handleTopUp: (days: number) => Promise<void>;
  closeErrorModal: () => void;
}

export function useStampTopUp(
  stampId: string,
  onStampRefresh?: (stampId: string) => Promise<void>,
): UseStampTopUpReturn {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTopUp = async (days: number) => {
    if (!walletClient || !publicClient) {
      setErrorMessage('Please connect your wallet first');
      setErrorModalOpen(true);
      return;
    }

    setIsTopUpLoading(true);
    try {
      await extendStampDuration(walletClient, publicClient, stampId, days);
      console.log(`Successfully topped up stamp for ${days} days`);
      if (onStampRefresh) {
        await onStampRefresh(stampId);
      }
    } catch (error) {
      console.error('Top up failed:', error);
      const friendlyErrorMessage = getUserFriendlyErrorMessage(error);
      setErrorMessage(`Top up failed: ${friendlyErrorMessage}`);
      setErrorModalOpen(true);
    } finally {
      setIsTopUpLoading(false);
    }
  };

  return {
    isTopUpLoading,
    errorModalOpen,
    errorMessage,
    handleTopUp,
    closeErrorModal: () => setErrorModalOpen(false),
  };
}

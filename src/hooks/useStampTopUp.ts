import { useState } from 'react';
import { ethers } from 'ethers';

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
  signer: ethers.Signer | undefined,
  stampId: string,
  onStampRefresh?: (stampId: string) => Promise<void>,
): UseStampTopUpReturn {
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTopUp = async (days: number) => {
    if (!signer) {
      setErrorMessage('Please connect your wallet first');
      setErrorModalOpen(true);
      return;
    }

    setIsTopUpLoading(true);
    try {
      await extendStampDuration(signer, stampId, days);
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

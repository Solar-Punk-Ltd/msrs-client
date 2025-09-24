import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { WalletService } from '@/utils/wallet';

interface WalletState {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  connectionError: string | null;
  isConnecting: boolean;
}

const walletService = new WalletService();

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    account: null,
    connectionError: null,
    isConnecting: false,
  });

  const disconnect = useCallback(() => {
    walletService.disconnect();
    const publicProvider = walletService.getPublicProvider();

    setState({
      provider: publicProvider,
      signer: null,
      account: null,
      connectionError: null,
      isConnecting: false,
    });
  }, []);

  useEffect(() => {
    const publicProvider = walletService.getPublicProvider();
    setState((prev) => ({ ...prev, provider: publicProvider }));

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    walletService.onAccountsChanged(handleAccountsChanged);
    walletService.onChainChanged(handleChainChanged);

    return () => {
      // Cleanup listeners if wallet service supports it
    };
  }, [disconnect]);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, connectionError: null, isConnecting: true }));

    try {
      const { provider, signer, account } = await walletService.connect();
      setState((prev) => ({
        ...prev,
        provider,
        signer,
        account,
        isConnecting: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : 'Connection failed',
        isConnecting: false,
      }));
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    isConnected: !!state.account,
  };
}

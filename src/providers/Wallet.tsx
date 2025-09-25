import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { getWalletService } from '../utils/wallet';

interface IWalletContext {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
  chainError: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToGnosis: () => Promise<void>;
}

const WalletContext = createContext<IWalletContext | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState({
    account: null as string | null,
    provider: null as ethers.BrowserProvider | null,
    signer: null as ethers.Signer | null,
    isConnecting: false,
    isReconnecting: true,
    error: null as string | null,
    chainError: false,
  });

  const walletService = getWalletService();

  useEffect(() => {
    const checkConnection = async () => {
      setState((prev) => ({ ...prev, isReconnecting: true }));

      try {
        const connection = await walletService.checkAndReconnect();

        if (connection) {
          setState({
            account: connection.account,
            provider: connection.provider,
            signer: connection.signer,
            isConnecting: false,
            isReconnecting: false,
            error: null,
            chainError: false,
          });
        } else {
          setState((prev) => ({ ...prev, isReconnecting: false }));
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
        setState((prev) => ({
          ...prev,
          isReconnecting: false,
          error: error instanceof Error ? error.message : 'Failed to reconnect',
        }));
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    const handleAccountChanged = async (data: { oldAccount: string; newAccount: string }) => {
      console.log('Account changed from', data.oldAccount, 'to', data.newAccount);

      setState((prev) => ({
        ...prev,
        account: data.newAccount,
        signer: walletService.getSigner(),
        error: null,
        chainError: false,
      }));
    };

    const handleDisconnected = (data: { reason: string; error?: any }) => {
      console.log('Wallet disconnected:', data.reason);

      setState({
        account: null,
        provider: null,
        signer: null,
        isConnecting: false,
        isReconnecting: false,
        error: data.reason,
        chainError: false,
      });
    };

    const handleChainChanged = (data: { chainId: number; error?: Error }) => {
      console.log('Chain changed to', data.chainId);
      if (data.error) {
        console.error('Chain error:', data.error);
        setState((prev) => ({
          ...prev,
          chainError: true,
          error: data.error!.message,
        }));
      }
    };

    const handleError = (error: Error) => {
      console.error('Wallet error:', error);
      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
    };

    walletService.on('accountChanged', handleAccountChanged);
    walletService.on('disconnected', handleDisconnected);
    walletService.on('chainChanged', handleChainChanged);
    walletService.on('error', handleError);

    return () => {
      walletService.off('accountChanged', handleAccountChanged);
      walletService.off('disconnected', handleDisconnected);
      walletService.off('chainChanged', handleChainChanged);
      walletService.off('error', handleError);
    };
  }, [walletService]);

  const connect = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
      chainError: false,
    }));

    try {
      const connection = await walletService.connect();

      setState({
        account: connection.account,
        provider: connection.provider,
        signer: connection.signer,
        isConnecting: false,
        isReconnecting: false,
        error: null,
        chainError: false,
      });
    } catch (error) {
      console.error('Failed to connect:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [walletService]);

  const disconnect = useCallback(() => {
    walletService.disconnect();
    setState({
      account: null,
      provider: null,
      signer: null,
      isConnecting: false,
      isReconnecting: false,
      error: null,
      chainError: false,
    });
  }, [walletService]);

  const switchToGnosis = useCallback(async () => {
    if (!walletService.isConnected()) {
      setState((prev) => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    try {
      await walletService.ensureGnosisChain();
      setState((prev) => ({
        ...prev,
        chainError: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to switch network:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch network',
      }));
    }
  }, [walletService]);

  const value = {
    // State
    account: state.account,
    provider: state.provider,
    signer: state.signer,
    isConnected: walletService.isConnected(),
    isConnecting: state.isConnecting,
    isReconnecting: state.isReconnecting,
    error: state.error,
    chainError: state.chainError,

    // Actions
    connect,
    disconnect,
    switchToGnosis,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

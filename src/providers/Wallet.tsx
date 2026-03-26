import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useConnect, useConnection, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi';
import { gnosis } from 'wagmi/chains';

import { metaMaskConnector, wagmiConfig } from '@/config/wagmi';

const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';

export const WALLET_ERROR = {
  NOT_FOUND: 'MetaMask not found. Please install MetaMask to continue.',
  OUTDATED: 'MetaMask detected but outdated. Please update MetaMask to the latest version.',
} as const;

export { METAMASK_DOWNLOAD_URL };

interface IWalletContext {
  account: string | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
  chainError: boolean;
  connect: () => void;
  disconnect: () => void;
  switchToGnosis: () => void;
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

function mapConnectError(error: Error | null): string | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();
  if (msg.includes('connector not found') || msg.includes('provider not found')) {
    return WALLET_ERROR.NOT_FOUND;
  }
  return error.message;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected, isConnecting: wagmiIsConnecting, isReconnecting } = useConnection();
  const { mutate: wagmiConnect, error: connectError, isPending: isConnectPending } = useConnect();
  const { mutate: wagmiDisconnect } = useDisconnect();
  const { mutate: switchChainMutate } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const chainError = useMemo(() => {
    if (!isConnected || !walletClient) return false;
    return walletClient.chain.id !== gnosis.id;
  }, [isConnected, walletClient]);

  // Guard against stale reconnects: stays true after disconnect,
  // only cleared when wagmiConnect's onSuccess confirms a genuine connection.
  const [userDisconnected, setUserDisconnected] = useState(false);

  const connect = useCallback(() => {
    wagmiConnect({ connector: metaMaskConnector }, { onSuccess: () => setUserDisconnected(false) });
  }, [wagmiConnect]);

  const disconnect = useCallback(() => {
    setUserDisconnected(true);
    wagmiDisconnect(undefined, {
      onSuccess: async () => {
        // Clear wagmi storage to prevent auto reconnect with stale data
        wagmiConfig.storage?.removeItem('recentConnectorId');
        wagmiConfig.storage?.removeItem('connections');

        // Revoke MetaMask permissions so eth_accounts returns [] on next connect attempt
        try {
          const connector = wagmiConfig.connectors.find((c) => c.id === 'metaMaskSDK');
          if (connector) {
            const provider = await connector.getProvider();
            await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }],
            });
          }
        } catch {
          // Older MetaMask versions may not support wallet_revokePermissions
        }
      },
    });
  }, [wagmiDisconnect]);

  const switchToGnosis = useCallback(() => {
    switchChainMutate({ chainId: gnosis.id });
  }, [switchChainMutate]);

  const error = mapConnectError(connectError);

  const value: IWalletContext = {
    account: isConnected && !userDisconnected ? address ?? null : null,
    isConnecting: wagmiIsConnecting || isConnectPending,
    isReconnecting,
    error,
    chainError,
    connect,
    disconnect,
    switchToGnosis,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

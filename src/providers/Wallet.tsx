import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi';
import { gnosis } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

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
  const { address, isConnected, isConnecting: wagmiIsConnecting, isReconnecting } = useAccount();
  const { connect: wagmiConnect, error: connectError, isPending: isConnectPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const chainError = useMemo(() => {
    if (!isConnected || !walletClient) return false;
    return walletClient.chain.id !== gnosis.id;
  }, [isConnected, walletClient]);

  const connect = () => {
    wagmiConnect({ connector: metaMask() });
  };

  const disconnect = () => {
    wagmiDisconnect();
  };

  const switchToGnosis = () => {
    switchChain({ chainId: gnosis.id });
  };

  const error = mapConnectError(connectError);

  const value: IWalletContext = {
    account: address ?? null,
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

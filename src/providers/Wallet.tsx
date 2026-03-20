import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
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
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
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

  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | null>(null);
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);

  const chainError = useMemo(() => {
    if (!isConnected || !walletClient) return false;
    return walletClient.chain.id !== gnosis.id;
  }, [isConnected, walletClient]);

  // Build ethers shim from walletClient (temporary — removed in Phase 5)
  useEffect(() => {
    if (!walletClient) {
      setEthersProvider(null);
      setEthersSigner(null);
      return;
    }

    const provider = new ethers.BrowserProvider(walletClient.transport, {
      chainId: walletClient.chain.id,
      name: walletClient.chain.name,
    });

    provider
      .getSigner()
      .then((signer) => {
        setEthersProvider(provider);
        setEthersSigner(signer);
      })
      .catch((err) => {
        console.error('Failed to create ethers signer shim:', err);
        setEthersProvider(null);
        setEthersSigner(null);
      });
  }, [walletClient]);

  const connect = () => {
    wagmiConnect({ connector: metaMask() });
  };

  const disconnect = () => {
    wagmiDisconnect();
    setEthersProvider(null);
    setEthersSigner(null);
  };

  const switchToGnosis = () => {
    switchChain({ chainId: gnosis.id });
  };

  const error = mapConnectError(connectError);

  const value: IWalletContext = {
    account: address ?? null,
    provider: ethersProvider,
    signer: ethersSigner,
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

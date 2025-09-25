import { PrivateKey } from '@ethersphere/bee-js';
import { ethers, keccak256 } from 'ethers';

import type { EthereumProvider } from '@/types/global';

interface WalletConnection {
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  account: string;
}

interface SwitchError extends Error {
  code: number;
}

export function getSigner(input: string): PrivateKey {
  const normalized = input.trim().toLowerCase();

  const hash = keccak256(Buffer.from(normalized, 'utf-8'));

  const privateKeyHex = hash.slice(2);

  return new PrivateKey(privateKeyHex);
}

export function remove0x(hex: string): string {
  return (hex.startsWith('0x') ? hex.slice(2) : hex).toLowerCase();
}

const GNOSIS_CHAIN_ID = 100;
const GNOSIS_CHAIN_HEX = '0x64';
const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';
const GNOSIS_BLOCK_EXPLORER_URL = 'https://gnosisscan.io';

export class WalletService {
  private provider: ethers.BrowserProvider | null;
  private signer: ethers.Signer | null;
  private account: string | null;
  private ethereum: EthereumProvider | null;

  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.ethereum = null;
  }

  private getPreferredEthereum(): EthereumProvider {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask to continue.');
    }

    // If multiple providers are available, look for MetaMask in the providers array
    if (window.ethereum.providers && window.ethereum.providers.length > 0) {
      const metamask = window.ethereum.providers.find((provider) => provider.isMetaMask);
      if (metamask) {
        return metamask;
      }
    }

    if (window.ethereum.isMetaMask) {
      return window.ethereum;
    }

    // If we reach here, MetaMask is not available
    throw new Error(
      'MetaMask not found. Please install MetaMask or disable other wallet extensions that may interfere.',
    );
  }

  async connect(): Promise<WalletConnection> {
    this.ethereum = this.getPreferredEthereum();

    try {
      const accounts = (await this.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      this.provider = new ethers.BrowserProvider(this.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];

      await this.ensureGnosisChain();

      return {
        provider: this.provider,
        signer: this.signer,
        account: this.account!,
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async ensureGnosisChain(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const network = await this.provider.getNetwork();

    if (network.chainId !== BigInt(GNOSIS_CHAIN_ID)) {
      try {
        await this.ethereum!.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: GNOSIS_CHAIN_HEX }],
        });
      } catch (switchError: unknown) {
        // Chain not added, add it
        if ((switchError as SwitchError).code === 4902) {
          await this.addGnosisChain();
        } else {
          throw switchError;
        }
      }
    }
  }

  async addGnosisChain(): Promise<void> {
    await this.ethereum!.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: GNOSIS_CHAIN_HEX,
          chainName: 'Gnosis',
          nativeCurrency: {
            name: 'xDAI',
            symbol: 'xDAI',
            decimals: 18,
          },
          rpcUrls: [GNOSIS_RPC_URL],
          blockExplorerUrls: [GNOSIS_BLOCK_EXPLORER_URL],
        },
      ],
    });
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.account = null;
  }

  isConnected(): boolean {
    return this.account !== null;
  }

  getPublicProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(GNOSIS_RPC_URL);
  }

  onAccountsChanged(callback: (...args: unknown[]) => void): void {
    if (this.ethereum?.on) {
      this.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (...args: unknown[]) => void): void {
    if (this.ethereum?.on) {
      this.ethereum.on('chainChanged', callback);
    }
  }
}

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

export const GNOSIS_CHAIN_ID = 100;
export const GNOSIS_CHAIN_HEX = '0x64';
export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';
export const GNOSIS_BLOCK_EXPLORER_URL = 'https://gnosisscan.io';
const STORAGE_KEY = 'wallet_connected';

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private account: string | null = null;
  private ethereum: EthereumProvider | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private cleanupFunctions: Array<() => void> = [];

  constructor() {
    this.listeners.set('accountChanged', new Set());
    this.listeners.set('disconnected', new Set());
    this.listeners.set('chainChanged', new Set());
    this.listeners.set('error', new Set());
  }

  private getPreferredEthereum(): EthereumProvider {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask to continue.');
    }

    // If multiple providers are available, look for MetaMask
    if (window.ethereum.providers && window.ethereum.providers.length > 0) {
      const metamask = window.ethereum.providers.find((provider) => provider.isMetaMask);
      if (metamask) {
        return metamask;
      }
    }

    if (window.ethereum.isMetaMask) {
      return window.ethereum;
    }

    throw new Error(
      'MetaMask not found. Please install MetaMask or disable other wallet extensions that may interfere.',
    );
  }

  async checkAndReconnect(): Promise<WalletConnection | null> {
    const wasConnected = localStorage.getItem(STORAGE_KEY) === 'true';

    if (!wasConnected) {
      return null;
    }

    try {
      this.ethereum = this.getPreferredEthereum();

      // Check if we have permission already (eth_accounts doesn't prompt)
      const accounts = (await this.ethereum.request({
        method: 'eth_accounts',
      })) as string[];

      if (accounts.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // We have permission, connect silently
      this.provider = new ethers.BrowserProvider(this.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];

      // Check if we're on the right network
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(GNOSIS_CHAIN_ID)) {
        this.disconnect();
        this.emit('error', new Error('Please switch to Gnosis Chain'));
        return null;
      }

      this.setupEventListeners();

      return {
        provider: this.provider,
        signer: this.signer,
        account: this.account,
      };
    } catch (error) {
      console.error('Failed to reconnect wallet:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  async connect(): Promise<WalletConnection> {
    this.ethereum = this.getPreferredEthereum();

    try {
      const accounts = (await this.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      this.provider = new ethers.BrowserProvider(this.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];

      await this.ensureGnosisChain();

      localStorage.setItem(STORAGE_KEY, 'true');

      this.setupEventListeners();

      return {
        provider: this.provider,
        signer: this.signer,
        account: this.account!,
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      this.disconnect();
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.ethereum) return;

    this.cleanup();

    const accountsChangedHandler = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        // Wallet locked or permission revoked
        this.disconnect();
        this.emit('disconnected', { reason: 'Wallet locked or permission revoked' });
      } else if (accounts[0] !== this.account) {
        // Account switched
        const oldAccount = this.account;
        this.account = accounts[0];

        if (this.provider) {
          try {
            this.signer = await this.provider.getSigner();
            this.emit('accountChanged', {
              oldAccount,
              newAccount: this.account,
            });
          } catch (error) {
            console.error('Failed to update signer:', error);
            this.disconnect();
            this.emit('error', error);
          }
        }
      }
    };

    const chainChangedHandler = (...args: unknown[]) => {
      const chainId = args[0] as string;
      const chainIdNumber = parseInt(chainId, 16);

      if (chainIdNumber !== GNOSIS_CHAIN_ID) {
        // Wrong network, disconnect
        const error = new Error(`Wrong network. Please switch to Gnosis Chain (chainId: ${GNOSIS_CHAIN_ID})`);
        this.disconnect();
        this.emit('chainChanged', {
          chainId: chainIdNumber,
          error,
        });
        this.emit('disconnected', {
          reason: 'Network changed to unsupported chain',
        });
      } else {
        // Switched back to Gnosis, reconnect if we were disconnected
        if (!this.isConnected() && localStorage.getItem(STORAGE_KEY) === 'true') {
          this.checkAndReconnect();
        }
      }
    };

    const disconnectHandler = (...args: unknown[]) => {
      const error = args[0];
      console.error('Wallet disconnected:', error);
      this.disconnect();
      this.emit('disconnected', {
        reason: 'Wallet disconnected',
        error,
      });
    };

    if (this.ethereum?.on) {
      this.ethereum.on('accountsChanged', accountsChangedHandler);
      this.ethereum.on('chainChanged', chainChangedHandler);
      this.ethereum.on('disconnect', disconnectHandler);
    }

    this.cleanupFunctions.push(() => {
      if (this.ethereum?.removeListener) {
        this.ethereum.removeListener('accountsChanged', accountsChangedHandler);
        this.ethereum.removeListener('chainChanged', chainChangedHandler);
        this.ethereum.removeListener('disconnect', disconnectHandler);
      }
    });
  }

  private cleanup(): void {
    this.cleanupFunctions.forEach((fn) => fn());
    this.cleanupFunctions = [];
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

        // Wait a bit for the switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const newNetwork = await this.provider.getNetwork();
        if (newNetwork.chainId !== BigInt(GNOSIS_CHAIN_ID)) {
          throw new Error('Failed to switch to Gnosis Chain');
        }
      } catch (switchError: unknown) {
        if ((switchError as SwitchError).code === 4902) {
          await this.addGnosisChain();
          // After adding, try switching again
          await this.ethereum!.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: GNOSIS_CHAIN_HEX }],
          });
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
            name: 'XDAI',
            symbol: 'XDAI',
            decimals: 18,
          },
          rpcUrls: [GNOSIS_RPC_URL],
          blockExplorerUrls: [GNOSIS_BLOCK_EXPLORER_URL],
        },
      ],
    });
  }

  disconnect(): void {
    this.cleanup();
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.ethereum = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  isConnected(): boolean {
    return this.account !== null && this.provider !== null;
  }

  getAccount(): string | null {
    return this.account;
  }

  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getPublicProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(GNOSIS_RPC_URL);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  destroy(): void {
    this.cleanup();
    this.disconnect();
    this.listeners.clear();
  }
}

let walletServiceInstance: WalletService | null = null;

export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}

import { PrivateKey } from '@ethersphere/bee-js';
import { ethers, keccak256 } from 'ethers';

import type { EIP6963AnnounceProviderEvent, EIP6963ProviderDetail, EthereumProvider } from '@/types/global';
import { sleep } from '@/utils/shared/async';

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
export const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';

const STORAGE_KEY = 'wallet_connected';
const CHAIN_SWITCH_DELAY_MS = 1500;
const CHAIN_NOT_ADDED_ERROR_CODE = 4902;

const EIP6963 = {
  ANNOUNCE: 'eip6963:announceProvider',
  REQUEST: 'eip6963:requestProvider',
  METAMASK_RDNS: 'io.metamask',
} as const;

const RPC_METHOD = {
  ETH_ACCOUNTS: 'eth_accounts',
  ETH_REQUEST_ACCOUNTS: 'eth_requestAccounts',
  WALLET_SWITCH_CHAIN: 'wallet_switchEthereumChain',
  WALLET_ADD_CHAIN: 'wallet_addEthereumChain',
} as const;

const PROVIDER_EVENT = {
  ACCOUNTS_CHANGED: 'accountsChanged',
  CHAIN_CHANGED: 'chainChanged',
  DISCONNECT: 'disconnect',
} as const;

export const WALLET_EVENT = {
  ACCOUNT_CHANGED: 'accountChanged',
  DISCONNECTED: 'disconnected',
  CHAIN_CHANGED: 'chainChanged',
  ERROR: 'error',
} as const;

const GNOSIS_CHAIN_CONFIG = {
  chainId: GNOSIS_CHAIN_HEX,
  chainName: 'Gnosis',
  nativeCurrency: {
    name: 'XDAI',
    symbol: 'XDAI',
    decimals: 18,
  },
  rpcUrls: [GNOSIS_RPC_URL],
  blockExplorerUrls: [GNOSIS_BLOCK_EXPLORER_URL],
} as const;

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private account: string | null = null;
  private ethereum: EthereumProvider | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private cleanupFunctions: Array<() => void> = [];

  constructor() {
    this.listeners.set(WALLET_EVENT.ACCOUNT_CHANGED, new Set());
    this.listeners.set(WALLET_EVENT.DISCONNECTED, new Set());
    this.listeners.set(WALLET_EVENT.CHAIN_CHANGED, new Set());
    this.listeners.set(WALLET_EVENT.ERROR, new Set());
  }

  private getPreferredEthereum(): EthereumProvider {
    const providers: EIP6963ProviderDetail[] = [];

    const handler = (event: EIP6963AnnounceProviderEvent) => {
      providers.push(event.detail);
    };

    window.addEventListener(EIP6963.ANNOUNCE, handler);
    window.dispatchEvent(new Event(EIP6963.REQUEST));
    window.removeEventListener(EIP6963.ANNOUNCE, handler);

    const metamask = providers.find((p) => p.info.rdns === EIP6963.METAMASK_RDNS);
    if (metamask) {
      return metamask.provider;
    }

    if (window.ethereum?.isMetaMask) {
      throw new Error('MetaMask detected but outdated. Please update MetaMask to the latest version.');
    }

    throw new Error('MetaMask not found. Please install MetaMask to continue.');
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
        method: RPC_METHOD.ETH_ACCOUNTS,
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
        this.emit(WALLET_EVENT.ERROR, new Error('Please switch to Gnosis Chain'));
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
        method: RPC_METHOD.ETH_REQUEST_ACCOUNTS,
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
        this.emit(WALLET_EVENT.DISCONNECTED, { reason: 'Wallet locked or permission revoked' });
      } else if (accounts[0] !== this.account) {
        // Account switched
        const oldAccount = this.account;
        this.account = accounts[0];

        if (this.provider) {
          try {
            this.signer = await this.provider.getSigner();
            this.emit(WALLET_EVENT.ACCOUNT_CHANGED, {
              oldAccount,
              newAccount: this.account,
            });
          } catch (error) {
            console.error('Failed to update signer:', error);
            this.disconnect();
            this.emit(WALLET_EVENT.ERROR, error);
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
        this.emit(WALLET_EVENT.CHAIN_CHANGED, {
          chainId: chainIdNumber,
          error,
        });
        this.emit(WALLET_EVENT.DISCONNECTED, {
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
      this.emit(WALLET_EVENT.DISCONNECTED, {
        reason: 'Wallet disconnected',
        error,
      });
    };

    if (this.ethereum?.on) {
      this.ethereum.on(PROVIDER_EVENT.ACCOUNTS_CHANGED, accountsChangedHandler);
      this.ethereum.on(PROVIDER_EVENT.CHAIN_CHANGED, chainChangedHandler);
      this.ethereum.on(PROVIDER_EVENT.DISCONNECT, disconnectHandler);
    }

    this.cleanupFunctions.push(() => {
      if (this.ethereum?.removeListener) {
        this.ethereum.removeListener(PROVIDER_EVENT.ACCOUNTS_CHANGED, accountsChangedHandler);
        this.ethereum.removeListener(PROVIDER_EVENT.CHAIN_CHANGED, chainChangedHandler);
        this.ethereum.removeListener(PROVIDER_EVENT.DISCONNECT, disconnectHandler);
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
          method: RPC_METHOD.WALLET_SWITCH_CHAIN,
          params: [{ chainId: GNOSIS_CHAIN_HEX }],
        });

        // Wait a bit for the switch to complete
        await sleep(CHAIN_SWITCH_DELAY_MS);

        const newNetwork = await this.provider.getNetwork();
        if (newNetwork.chainId !== BigInt(GNOSIS_CHAIN_ID)) {
          throw new Error('Failed to switch to Gnosis Chain');
        }
      } catch (switchError: unknown) {
        if ((switchError as SwitchError).code === CHAIN_NOT_ADDED_ERROR_CODE) {
          await this.addGnosisChain();
          // After adding, try switching again
          await this.ethereum!.request({
            method: RPC_METHOD.WALLET_SWITCH_CHAIN,
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
      method: RPC_METHOD.WALLET_ADD_CHAIN,
      params: [GNOSIS_CHAIN_CONFIG],
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

  getEthereum(): EthereumProvider | null {
    return this.ethereum;
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

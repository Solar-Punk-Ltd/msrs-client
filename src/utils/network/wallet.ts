/**
 * @deprecated This file is a compatibility shim during the wagmi migration.
 * Constants will move to config/wagmi.ts, getWalletService will be removed
 * once the contract layer is migrated to viem (Phase 4).
 */
import { ethers } from 'ethers';

import type { EthereumProvider } from '@/types/global';

export const GNOSIS_CHAIN_ID = 100;
export const GNOSIS_CHAIN_HEX = '0x64';
export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';
export const GNOSIS_BLOCK_EXPLORER_URL = 'https://gnosisscan.io';

interface WalletServiceShim {
  isConnected(): boolean;
  getProvider(): ethers.BrowserProvider | null;
  getPublicProvider(): ethers.JsonRpcProvider;
  getEthereum(): EthereumProvider | null;
}

class LegacyWalletServiceShim implements WalletServiceShim {
  isConnected(): boolean {
    return false;
  }

  getProvider(): ethers.BrowserProvider | null {
    return null;
  }

  getPublicProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(GNOSIS_RPC_URL);
  }

  getEthereum(): EthereumProvider | null {
    return null;
  }
}

const shim = new LegacyWalletServiceShim();

/** @deprecated Use wagmi hooks instead. Kept for contract utils during migration. */
export function getWalletService(): WalletServiceShim {
  return shim;
}

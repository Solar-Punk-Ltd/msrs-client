import { ethers } from 'ethers';

import { padStampId } from './format';
import { getWalletService } from './wallet';

export const POSTAGE_STAMP_CONTRACT = '0x45a1502382541Cd610CC9068e88727426b696293';
export const GNOSIS_BLOCK_TIME = 5; // seconds
const MAX_UTILIZATION = 0.9;

const EFFECTIVE_SIZE_BREAKPOINTS: [number, number][] = [
  [17, 0.00004089],
  [18, 0.00609],
  [19, 0.10249],
  [20, 0.62891],
  [21, 2.38],
  [22, 7.07],
  [23, 18.24],
  [24, 43.04],
  [25, 96.5],
  [26, 208.52],
  [27, 435.98],
  [28, 908.81],
  [29, 1870],
  [30, 3810],
  [31, 7730],
  [32, 15610],
  [33, 31430],
  [34, 63150],
];

const POSTAGE_STAMP_ABI = [
  'function batches(bytes32) view returns (address owner, uint8 depth, uint8 bucketDepth, bool immutableFlag, uint256 normalisedBalance, uint256 lastUpdatedBlockNumber)',
  'function currentTotalOutPayment() view returns (uint256)',
  'function lastPrice() view returns (uint256)',
  'function topUp(bytes32 batchId, uint256 amount) payable',
];

interface PostageStampContract {
  batches(batchId: string): Promise<{
    owner: string;
    depth: number;
    bucketDepth: number;
    immutableFlag: boolean;
    normalisedBalance: bigint;
    lastUpdatedBlockNumber: bigint;
  }>;
  currentTotalOutPayment(): Promise<bigint>;
  lastPrice(): Promise<bigint>;
  topUp(batchId: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
  connect(signer: ethers.Signer): PostageStampContract;
}

export interface BatchData {
  owner: string;
  depth: number;
  bucketDepth: number;
  immutableFlag: boolean;
  normalisedBalance: bigint;
  lastUpdatedBlockNumber: bigint;
}

export interface ContractState {
  currentTotalOutPayment: bigint;
  lastPrice: bigint;
}

export interface FinancialStatus {
  isActive: boolean;
  remainingDays: number;
  expirationDate: Date | null;
}

export interface StampInfo {
  batchData: BatchData;
  contractState: ContractState;
  financialStatus: FinancialStatus;
  effectiveSizeGB: string;
  theoreticalSizeGB: string;
  remainingBalance: bigint;
  isValid: boolean;
}

export const createContract = (provider?: ethers.Provider): PostageStampContract => {
  if (!provider) {
    const walletService = getWalletService();

    if (walletService.isConnected()) {
      const walletProvider = walletService.getProvider();
      if (walletProvider) {
        provider = walletProvider;
      }
    }

    if (!provider) {
      provider = walletService.getPublicProvider();
    }
  }

  return new ethers.Contract(POSTAGE_STAMP_CONTRACT, POSTAGE_STAMP_ABI, provider) as unknown as PostageStampContract;
};

export const isValidStamp = (batchData: BatchData): boolean => {
  return batchData.owner !== '0x0000000000000000000000000000000000000000';
};

export const getStampTheoreticalBytes = (depth: number): number => {
  return 4096 * Math.pow(2, depth); // 4KB per chunk
};

export const getStampEffectiveBytes = (depth: number): number => {
  if (depth < 17) {
    return 0;
  }

  const breakpoint = EFFECTIVE_SIZE_BREAKPOINTS.find(([d]) => d === depth);

  if (breakpoint) {
    return breakpoint[1] * 1000 * 1000 * 1000; // Convert GB to bytes
  }

  // For depths above 34, use 90% of theoretical
  return Math.ceil(getStampTheoreticalBytes(depth) * MAX_UTILIZATION);
};

export const calculateFinancialStatus = (
  batchData: BatchData,
  contractState: ContractState,
  isValid: boolean,
): FinancialStatus => {
  if (!isValid) {
    return {
      isActive: false,
      remainingDays: 0,
      expirationDate: null,
    };
  }

  const remainingBalancePerChunk = batchData.normalisedBalance - contractState.currentTotalOutPayment;

  if (remainingBalancePerChunk <= 0n) {
    return {
      isActive: false,
      remainingDays: 0,
      expirationDate: null,
    };
  }

  const remainingBlocks = remainingBalancePerChunk / contractState.lastPrice;
  const expirationSeconds = Number(remainingBlocks) * GNOSIS_BLOCK_TIME;
  const expirationDate = new Date(Date.now() + expirationSeconds * 1000);
  const remainingDays = expirationSeconds / (24 * 60 * 60);

  return {
    isActive: true,
    remainingDays,
    expirationDate,
  };
};

export const fetchBatchData = async (contract: PostageStampContract, stampId: string): Promise<BatchData> => {
  const formattedId = padStampId(stampId);
  const batch = await contract.batches(formattedId);

  return {
    owner: batch.owner,
    depth: Number(batch.depth),
    bucketDepth: Number(batch.bucketDepth),
    immutableFlag: batch.immutableFlag,
    normalisedBalance: batch.normalisedBalance,
    lastUpdatedBlockNumber: batch.lastUpdatedBlockNumber,
  };
};

export const fetchContractState = async (contract: PostageStampContract): Promise<ContractState> => {
  const [currentTotalOutPayment, lastPrice] = await Promise.all([
    contract.currentTotalOutPayment(),
    contract.lastPrice(),
  ]);

  return {
    currentTotalOutPayment,
    lastPrice,
  };
};

export const loadStampInfo = async (stampId: string): Promise<StampInfo> => {
  const contract = createContract();

  const [batchData, contractState] = await Promise.all([
    fetchBatchData(contract, stampId),
    fetchContractState(contract),
  ]);

  const isValid = isValidStamp(batchData);
  const financialStatus = calculateFinancialStatus(batchData, contractState, isValid);

  const effectiveBytes = getStampEffectiveBytes(batchData.depth);
  const theoreticalBytes = getStampTheoreticalBytes(batchData.depth);

  const effectiveSizeGB = (effectiveBytes / (1024 * 1024 * 1024)).toFixed(2);
  const theoreticalSizeGB = (theoreticalBytes / (1024 * 1024 * 1024)).toFixed(2);

  const remainingBalance =
    batchData.normalisedBalance > contractState.currentTotalOutPayment
      ? batchData.normalisedBalance - contractState.currentTotalOutPayment
      : 0n;

  return {
    batchData,
    contractState,
    financialStatus,
    effectiveSizeGB,
    theoreticalSizeGB,
    remainingBalance,
    isValid,
  };
};

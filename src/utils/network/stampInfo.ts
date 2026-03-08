import { ethers } from 'ethers';

import { padStampId } from '../ui/format';

import {
  type BatchData,
  CONSISTENCY_THRESHOLD_DAYS,
  type ContractState,
  createContract,
  fetchBatchData,
  fetchContractState,
  GNOSIS_BLOCK_TIME,
  MULTICALL3_ABI,
  MULTICALL3_ADDRESS,
  POSTAGE_STAMP_ABI,
  POSTAGE_STAMP_CONTRACT,
} from './contracts';
import { getWalletService } from './wallet';

const MAX_UTILIZATION = 0.9;
const BYTES_PER_CHUNK = 4096;
const BYTES_PER_GIGABYTE = 1000 * 1000 * 1000;
const SECONDS_PER_DAY = 24 * 60 * 60;
const ALLOW_MULTICALL_FAILURE = false;
const POSTAGE_FN_BATCHES = 'batches';
const POSTAGE_FN_CURRENT_TOTAL_OUT_PAYMENT = 'currentTotalOutPayment';
const POSTAGE_FN_LAST_PRICE = 'lastPrice';

// https://docs.ethswarm.org/docs/concepts/incentives/postage-stamps/#effective-utilisation-tables
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

export interface StampExpirationEntry {
  stampId: string;
  batchData: BatchData;
  financialStatus: FinancialStatus;
  remainingBalancePerChunk: bigint;
  isValid: boolean;
}

export interface BulkStampExpirationResult {
  entries: StampExpirationEntry[];
  contractState: ContractState;
  soonestExpiry: StampExpirationEntry | null;
  maxDriftDays: number;
  isConsistent: boolean;
}

interface MulticallResult {
  success: boolean;
  returnData: string;
}

const parseUintValue = (value: unknown, fieldName: string): bigint => {
  if (typeof value !== 'bigint') {
    throw new Error(`Invalid ${fieldName} type from contract decode`);
  }

  return value;
};

const parseSafeUint = (value: unknown, fieldName: string): number => {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    if (!Number.isSafeInteger(asNumber)) {
      throw new Error(`Decoded ${fieldName} exceeds safe integer range`);
    }

    return asNumber;
  }

  if (typeof value === 'number') {
    return value;
  }

  throw new Error(`Invalid ${fieldName} type from contract decode`);
};

const decodeSingleUint = (iface: ethers.Interface, functionName: string, returnData: string): bigint => {
  const decoded = iface.decodeFunctionResult(functionName, returnData);
  return parseUintValue(decoded[0], functionName);
};

const decodeBatchData = (iface: ethers.Interface, returnData: string): BatchData => {
  const decoded = iface.decodeFunctionResult(POSTAGE_FN_BATCHES, returnData);

  const owner = decoded.owner;
  if (typeof owner !== 'string') {
    throw new Error('Invalid owner type from batches decode');
  }

  return {
    owner,
    depth: parseSafeUint(decoded.depth, 'depth'),
    bucketDepth: parseSafeUint(decoded.bucketDepth, 'bucketDepth'),
    immutableFlag: Boolean(decoded.immutableFlag),
    normalisedBalance: parseUintValue(decoded.normalisedBalance, 'normalisedBalance'),
    lastUpdatedBlockNumber: parseUintValue(decoded.lastUpdatedBlockNumber, 'lastUpdatedBlockNumber'),
  };
};

export const isValidStamp = (batchData: BatchData): boolean => {
  return batchData.owner !== '0x0000000000000000000000000000000000000000';
};

export const getRemainingBalancePerChunk = (batchData: BatchData, contractState: ContractState): bigint => {
  return batchData.normalisedBalance > contractState.currentTotalOutPayment
    ? batchData.normalisedBalance - contractState.currentTotalOutPayment
    : 0n;
};

export const getStampTheoreticalBytes = (depth: number): number => {
  return BYTES_PER_CHUNK * Math.pow(2, depth);
};

export const getStampEffectiveBytes = (depth: number): number => {
  if (depth < 17) {
    return 0;
  }

  const breakpoint = EFFECTIVE_SIZE_BREAKPOINTS.find(([d]) => d === depth);

  if (breakpoint) {
    return breakpoint[1] * BYTES_PER_GIGABYTE;
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
    return { isActive: false, remainingDays: 0, expirationDate: null };
  }

  const remainingBalancePerChunk = getRemainingBalancePerChunk(batchData, contractState);

  if (remainingBalancePerChunk === 0n || contractState.lastPrice === 0n) {
    return { isActive: false, remainingDays: 0, expirationDate: null };
  }

  const remainingBlocks = remainingBalancePerChunk / contractState.lastPrice;
  const expirationSeconds = Number(remainingBlocks) * GNOSIS_BLOCK_TIME;
  const expirationDate = new Date(Date.now() + expirationSeconds * 1000);
  const remainingDays = expirationSeconds / SECONDS_PER_DAY;

  return { isActive: true, remainingDays, expirationDate };
};

const buildBatchCalls = (stampIds: string[], iface: ethers.Interface) => ({
  batchCalls: stampIds.map((id) => ({
    target: POSTAGE_STAMP_CONTRACT,
    allowFailure: ALLOW_MULTICALL_FAILURE,
    callData: iface.encodeFunctionData(POSTAGE_FN_BATCHES, [padStampId(id)]),
  })),
  stateCalls: [
    {
      target: POSTAGE_STAMP_CONTRACT,
      allowFailure: ALLOW_MULTICALL_FAILURE,
      callData: iface.encodeFunctionData(POSTAGE_FN_CURRENT_TOTAL_OUT_PAYMENT),
    },
    {
      target: POSTAGE_STAMP_CONTRACT,
      allowFailure: ALLOW_MULTICALL_FAILURE,
      callData: iface.encodeFunctionData(POSTAGE_FN_LAST_PRICE),
    },
  ],
});

const decodeContractState = (iface: ethers.Interface, results: MulticallResult[], offset: number): ContractState => {
  const outPayment = results[offset];
  const price = results[offset + 1];

  if (!outPayment?.success || !price?.success) {
    throw new Error('Multicall contract state query failed');
  }

  return {
    currentTotalOutPayment: decodeSingleUint(iface, POSTAGE_FN_CURRENT_TOTAL_OUT_PAYMENT, outPayment.returnData),
    lastPrice: decodeSingleUint(iface, POSTAGE_FN_LAST_PRICE, price.returnData),
  };
};

const decodeStampEntries = (
  stampIds: string[],
  iface: ethers.Interface,
  results: MulticallResult[],
  contractState: ContractState,
): StampExpirationEntry[] => {
  return stampIds.map((stampId, i) => {
    const batchResult = results[i];
    if (!batchResult?.success) {
      throw new Error(`Multicall batch query failed for stamp ${stampId}`);
    }

    const batchData = decodeBatchData(iface, batchResult.returnData);
    const isValid = isValidStamp(batchData);
    const financialStatus = calculateFinancialStatus(batchData, contractState, isValid);
    const remainingBalancePerChunk = getRemainingBalancePerChunk(batchData, contractState);

    return { stampId, batchData, financialStatus, remainingBalancePerChunk, isValid };
  });
};

/**
 * Sorts entries by soonest expiry and computes drift metrics.
 *
 * Drift = difference in remaining days between the latest and soonest expiring
 * active stamps. A non zero drift means stamps will expire at different times.
 * `isConsistent` flags whether the drift is within a 1 hour tolerance
 * (CONSISTENCY_THRESHOLD_DAYS), which accounts for minor timing differences
 * caused by sequential on chain topUp transactions (~5s per stamp on Gnosis).
 */
const aggregateEntries = (
  entries: StampExpirationEntry[],
): Pick<BulkStampExpirationResult, 'entries' | 'soonestExpiry' | 'maxDriftDays' | 'isConsistent'> => {
  const sorted = [...entries].sort((a, b) => {
    const aDays = a.financialStatus.isActive ? a.financialStatus.remainingDays : -1;
    const bDays = b.financialStatus.isActive ? b.financialStatus.remainingDays : -1;
    return aDays - bDays;
  });

  const active = sorted.filter((e) => e.financialStatus.isActive);
  const soonestExpiry = active[0] ?? null;
  // Drift is the gap between the longest- and shortest lived active stamps
  const maxDriftDays =
    active.length >= 2
      ? active[active.length - 1].financialStatus.remainingDays - active[0].financialStatus.remainingDays
      : 0;

  return {
    entries: sorted,
    soonestExpiry,
    maxDriftDays,
    isConsistent: maxDriftDays < CONSISTENCY_THRESHOLD_DAYS,
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

  const effectiveSizeGB = (effectiveBytes / BYTES_PER_GIGABYTE).toFixed(2);
  const theoreticalSizeGB = (theoreticalBytes / BYTES_PER_GIGABYTE).toFixed(2);

  const remainingBalance = getRemainingBalancePerChunk(batchData, contractState);

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

export const loadBulkStampExpirations = async (stampIds: string[]): Promise<BulkStampExpirationResult> => {
  if (stampIds.length === 0) {
    return {
      entries: [],
      contractState: { currentTotalOutPayment: 0n, lastPrice: 0n },
      soonestExpiry: null,
      maxDriftDays: 0,
      isConsistent: true,
    };
  }

  const walletService = getWalletService();
  const provider = (walletService.isConnected() && walletService.getProvider()) || walletService.getPublicProvider();

  const postageIface = new ethers.Interface(POSTAGE_STAMP_ABI);
  const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

  const { batchCalls, stateCalls } = buildBatchCalls(stampIds, postageIface);
  const calls = [...batchCalls, ...stateCalls];

  const results: MulticallResult[] = await multicall.aggregate3(calls);

  if (results.length !== calls.length) {
    throw new Error(`Unexpected multicall result count: expected ${calls.length}, received ${results.length}`);
  }

  const contractState = decodeContractState(postageIface, results, stampIds.length);
  const entries = decodeStampEntries(stampIds, postageIface, results, contractState);

  return { contractState, ...aggregateEntries(entries) };
};

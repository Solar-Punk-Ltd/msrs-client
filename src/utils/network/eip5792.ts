import { ethers } from 'ethers';

import type { EthereumProvider } from '@/types/global';
import { padStampId } from '@/utils/ui/format';

import { BZZ_TOKEN_ABI, BZZ_TOKEN_ADDRESS, POSTAGE_STAMP_ABI, POSTAGE_STAMP_CONTRACT } from './contracts/constants';
import {
  type BulkStampTopUpPlan,
  type BulkStampTopUpProgressCallback,
  type BulkStampTopUpResult,
  TOPUP_STATUS,
} from './stampTopup';
import { GNOSIS_CHAIN_HEX, GNOSIS_RPC_URL } from './wallet';

interface WalletCapabilities {
  [chainIdHex: string]: {
    atomic?: { status: string };
    atomicBatch?: { supported: boolean };
  };
}

interface CallsStatusResponse {
  status: number;
  receipts?: Array<{
    logs: Array<{ address: string; data: string; topics: string[] }>;
    status: string; // "0x1" success
    blockHash: string;
    blockNumber: string;
    transactionHash: string;
  }>;
}

async function isAtomicBatchAvailable(ethereum: EthereumProvider, userAddress: string): Promise<boolean> {
  try {
    const capabilities = (await ethereum.request({
      method: 'wallet_getCapabilities',
      params: [userAddress],
    })) as WalletCapabilities;

    const chainCaps = capabilities?.[GNOSIS_CHAIN_HEX];
    const supported =
      chainCaps?.atomic?.status === 'supported' ||
      chainCaps?.atomic?.status === 'ready' ||
      chainCaps?.atomicBatch?.supported === true;
    return supported;
  } catch {
    return false;
  }
}

const bzzIface = new ethers.Interface(BZZ_TOKEN_ABI);
const stampIface = new ethers.Interface(POSTAGE_STAMP_ABI);

interface BatchCall {
  to: string;
  data: string;
  value: string;
}

async function buildBatchCalls(userAddress: string, plan: BulkStampTopUpPlan): Promise<BatchCall[]> {
  const calls: BatchCall[] = [];

  const publicProvider = new ethers.JsonRpcProvider(GNOSIS_RPC_URL);
  const bzzContract = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, publicProvider);
  const currentAllowance: bigint = await bzzContract.allowance(userAddress, POSTAGE_STAMP_CONTRACT);

  if (currentAllowance < plan.totalCostPlur) {
    calls.push({
      to: BZZ_TOKEN_ADDRESS,
      data: bzzIface.encodeFunctionData('approve', [POSTAGE_STAMP_CONTRACT, plan.totalCostPlur]),
      value: '0x0',
    });
  }

  for (const stamp of plan.stampsNeedingTopUp) {
    calls.push({
      to: POSTAGE_STAMP_CONTRACT,
      data: stampIface.encodeFunctionData('topUp', [padStampId(stamp.stampId), stamp.neededTopUpPerChunk]),
      value: '0x0',
    });
  }

  return calls;
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

const BATCH_CALL_STATUS = {
  PENDING: 100,
  CONFIRMED: 200,
  FAILED_THRESHOLD: 300,
} as const;

async function pollBatchStatus(
  ethereum: EthereumProvider,
  batchId: string,
  signal?: AbortSignal,
): Promise<CallsStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    if (signal?.aborted) {
      throw new DOMException('Batch polling aborted', 'AbortError');
    }

    const response = (await ethereum.request({
      method: 'wallet_getCallsStatus',
      params: [batchId],
    })) as CallsStatusResponse;

    if (response.status === BATCH_CALL_STATUS.CONFIRMED) {
      return response;
    }

    if (response.status >= BATCH_CALL_STATUS.FAILED_THRESHOLD) {
      throw new Error(`Batch transaction failed with status ${response.status}`);
    }

    await new Promise((resolve) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS);
      signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
    });
  }

  throw new Error('Batch transaction timed out after 5 minutes');
}

async function executeBatchTopUp(
  ethereum: EthereumProvider,
  userAddress: string,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
  signal?: AbortSignal,
): Promise<BulkStampTopUpResult> {
  onProgress?.(TOPUP_STATUS.APPROVING, { total: plan.stampsNeedingTopUp.length });

  const calls = await buildBatchCalls(userAddress, plan);

  const sendResult = await ethereum.request({
    method: 'wallet_sendCalls',
    params: [
      {
        version: '2.0.0',
        from: userAddress,
        chainId: GNOSIS_CHAIN_HEX,
        atomicRequired: true,
        calls,
      },
    ],
  });

  const batchId = typeof sendResult === 'string' ? sendResult : (sendResult as { id: string }).id;

  onProgress?.(TOPUP_STATUS.BATCH_PENDING, { total: plan.stampsNeedingTopUp.length });

  const statusResponse = await pollBatchStatus(ethereum, batchId, signal);

  const allReceipts = statusResponse.receipts ?? [];
  const batchSucceeded = allReceipts.length > 0 && allReceipts.every((r) => r.status === '0x1');

  if (batchSucceeded) {
    onProgress?.(TOPUP_STATUS.DONE, { total: plan.stampsNeedingTopUp.length });

    return {
      successful: plan.stampsNeedingTopUp.map((stamp) => ({
        stampId: stamp.stampId,
        receipt: null as unknown as ethers.ContractTransactionReceipt,
      })),
      failed: [],
    };
  }

  const errorMessage = 'Batch transaction reverted on-chain';
  onProgress?.(TOPUP_STATUS.ERROR, { error: errorMessage });

  return {
    successful: [],
    failed: plan.stampsNeedingTopUp.map((stamp) => ({
      stampId: stamp.stampId,
      error: errorMessage,
    })),
  };
}

/**
 * Attempts to execute the bulk top-up as a single EIP-5792 atomic batch.
 * Returns `null` if the wallet doesn't support batching or the batch submission fails,
 * signaling the caller to fall back to sequential execution.
 */
export async function tryBatchTopUp(
  ethereum: EthereumProvider,
  userAddress: string,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
  signal?: AbortSignal,
): Promise<BulkStampTopUpResult | null> {
  const batchAvailable = await isAtomicBatchAvailable(ethereum, userAddress);

  if (!batchAvailable) {
    return null;
  }

  try {
    return await executeBatchTopUp(ethereum, userAddress, plan, onProgress, signal);
  } catch (error) {
    console.warn('EIP-5792 batch execution failed, falling back to sequential:', error);
    return null;
  }
}

import { type Address } from 'viem';
import { gnosis } from 'viem/chains';
import { getCapabilities, sendCalls, waitForCallsStatus } from 'wagmi/actions';

import { wagmiConfig } from '@/config/wagmi';
import { padStampId } from '@/utils/ui/format';

import {
  ATOMIC_CAPABILITY_STATUS,
  BZZ_FN,
  BZZ_TOKEN_ABI,
  BZZ_TOKEN_ADDRESS,
  getDefaultPublicClient,
  POSTAGE_FN,
  POSTAGE_STAMP_ABI,
  POSTAGE_STAMP_CONTRACT,
  TX_STATUS,
} from './contracts';
import {
  type BulkStampTopUpPlan,
  type BulkStampTopUpProgressCallback,
  type BulkStampTopUpResult,
  TOPUP_STATUS,
} from './stampTopup';

interface AtomicCapability {
  status?: string;
}

interface ChainCapabilities {
  atomic?: AtomicCapability;
}

async function isAtomicBatchAvailable(): Promise<boolean> {
  try {
    // When chainId is passed, viem returns the capabilities for that chain
    // directly (not wrapped in a { [chainId]: ... } map)
    const chainCaps = (await getCapabilities(wagmiConfig, {
      chainId: gnosis.id,
    })) as ChainCapabilities | undefined;

    if (!chainCaps) return false;

    return (
      chainCaps.atomic?.status === ATOMIC_CAPABILITY_STATUS.SUPPORTED ||
      chainCaps.atomic?.status === ATOMIC_CAPABILITY_STATUS.READY
    );
  } catch {
    return false;
  }
}

async function buildBatchCalls(userAddress: Address, plan: BulkStampTopUpPlan) {
  const calls: Array<{
    to: Address;
    abi: typeof BZZ_TOKEN_ABI | typeof POSTAGE_STAMP_ABI;
    functionName: string;
    args: readonly unknown[];
  }> = [];

  const publicClient = getDefaultPublicClient();

  const currentAllowance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS,
    abi: BZZ_TOKEN_ABI,
    functionName: BZZ_FN.ALLOWANCE,
    args: [userAddress, POSTAGE_STAMP_CONTRACT],
  })) as bigint;

  if (currentAllowance < plan.totalCostPlur) {
    calls.push({
      to: BZZ_TOKEN_ADDRESS,
      abi: BZZ_TOKEN_ABI,
      functionName: BZZ_FN.APPROVE,
      args: [POSTAGE_STAMP_CONTRACT, plan.totalCostPlur],
    });
  }

  for (const stamp of plan.stampsNeedingTopUp) {
    calls.push({
      to: POSTAGE_STAMP_CONTRACT,
      abi: POSTAGE_STAMP_ABI,
      functionName: POSTAGE_FN.TOP_UP,
      args: [padStampId(stamp.stampId), stamp.neededTopUpPerChunk],
    });
  }

  return calls;
}

async function executeBatchTopUp(
  userAddress: Address,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
): Promise<BulkStampTopUpResult> {
  onProgress?.(TOPUP_STATUS.APPROVING, { total: plan.stampsNeedingTopUp.length });

  const calls = await buildBatchCalls(userAddress, plan);

  const { id: batchId } = await sendCalls(wagmiConfig, {
    chainId: gnosis.id,
    calls,
    forceAtomic: true,
  });

  onProgress?.(TOPUP_STATUS.BATCH_PENDING, { total: plan.stampsNeedingTopUp.length });

  const result = await waitForCallsStatus(wagmiConfig, {
    id: batchId,
  });

  if (result.status === TX_STATUS.SUCCESS) {
    onProgress?.(TOPUP_STATUS.DONE, { total: plan.stampsNeedingTopUp.length });

    return {
      successful: plan.stampsNeedingTopUp.map((stamp) => ({
        stampId: stamp.stampId,
      })),
      failed: [],
    };
  }

  const errorMessage = `Batch transaction ${result.status ?? 'failed'}`;
  onProgress?.(TOPUP_STATUS.ERROR, { error: errorMessage });

  return {
    successful: [],
    failed: plan.stampsNeedingTopUp.map((stamp) => ({
      stampId: stamp.stampId,
      error: errorMessage,
    })),
  };
}

export async function tryBatchTopUp(
  userAddress: Address,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
): Promise<BulkStampTopUpResult | null> {
  const batchAvailable = await isAtomicBatchAvailable();

  if (!batchAvailable) {
    return null;
  }

  // Batch IS supported — never fall back to sequential from here.
  // If executeBatchTopUp fails (timeout, user rejection, network error),
  // we must let the error propagate. Falling back to sequential after
  // sendCalls may have been submitted would risk double-spending.
  return executeBatchTopUp(userAddress, plan, onProgress);
}

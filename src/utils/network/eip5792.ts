import { type Address, createPublicClient, http } from 'viem';
import { gnosis } from 'viem/chains';
import { getCapabilities, sendCalls, waitForCallsStatus } from 'wagmi/actions';

import { wagmiConfig } from '@/config/wagmi';
import { padStampId } from '@/utils/ui/format';

import { BZZ_TOKEN_ABI, BZZ_TOKEN_ADDRESS, POSTAGE_STAMP_ABI, POSTAGE_STAMP_CONTRACT } from './contracts/constants';
import {
  type BulkStampTopUpPlan,
  type BulkStampTopUpProgressCallback,
  type BulkStampTopUpResult,
  TOPUP_STATUS,
} from './stampTopup';

const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

async function isAtomicBatchAvailable(): Promise<boolean> {
  try {
    const capabilities = await getCapabilities(wagmiConfig, {
      chainId: gnosis.id,
    });

    const chainCaps = capabilities?.[gnosis.id];
    if (!chainCaps) return false;

    const caps = chainCaps as Record<string, unknown>;
    const atomic = caps.atomic as { status?: string } | undefined;
    const atomicBatch = caps.atomicBatch as { supported?: boolean } | undefined;

    return atomic?.status === 'supported' || atomic?.status === 'ready' || atomicBatch?.supported === true;
  } catch {
    return false;
  }
}

async function buildBatchCalls(userAddress: string, plan: BulkStampTopUpPlan) {
  const calls: Array<{
    to: Address;
    abi: typeof BZZ_TOKEN_ABI | typeof POSTAGE_STAMP_ABI;
    functionName: string;
    args: readonly unknown[];
  }> = [];

  const publicClient = createPublicClient({
    chain: gnosis,
    transport: http(GNOSIS_RPC_URL),
  });

  const currentAllowance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS as Address,
    abi: BZZ_TOKEN_ABI,
    functionName: 'allowance',
    args: [userAddress as Address, POSTAGE_STAMP_CONTRACT as Address],
  })) as bigint;

  if (currentAllowance < plan.totalCostPlur) {
    calls.push({
      to: BZZ_TOKEN_ADDRESS as Address,
      abi: BZZ_TOKEN_ABI,
      functionName: 'approve',
      args: [POSTAGE_STAMP_CONTRACT as Address, plan.totalCostPlur],
    });
  }

  for (const stamp of plan.stampsNeedingTopUp) {
    calls.push({
      to: POSTAGE_STAMP_CONTRACT as Address,
      abi: POSTAGE_STAMP_ABI,
      functionName: 'topUp',
      args: [padStampId(stamp.stampId) as `0x${string}`, stamp.neededTopUpPerChunk],
    });
  }

  return calls;
}

async function executeBatchTopUp(
  userAddress: string,
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

  if (result.status === 'success') {
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
  userAddress: string,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
): Promise<BulkStampTopUpResult | null> {
  const batchAvailable = await isAtomicBatchAvailable();

  if (!batchAvailable) {
    return null;
  }

  try {
    return await executeBatchTopUp(userAddress, plan, onProgress);
  } catch (error) {
    console.warn('EIP-5792 batch execution failed, falling back to sequential:', error);
    return null;
  }
}

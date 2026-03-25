import { BZZ, Duration } from '@ethersphere/bee-js';
import { type Hex, type PublicClient, type WalletClient } from 'viem';

import {
  ensureBzzApproval,
  executeTopup,
  fetchBatchData,
  fetchContractState,
  GNOSIS_BLOCK_TIME,
  hasSufficientBalance,
} from './contracts';
import { getRemainingBalancePerChunk, loadBulkStampExpirations } from './stampInfo';

export interface ExtensionCalculation {
  duration: Duration;
  amountPerChunk: bigint;
  totalCostPlur: bigint;
  costBzz: BZZ;
}

export interface ExtensionDaysCalculation {
  cost: BZZ;
  costString: string;
}

export interface BulkStampTopUpDetail {
  stampId: string;
  depth: number;
  currentRemainingPerChunk: bigint;
  neededTopUpPerChunk: bigint;
  costPlur: bigint;
}

export interface BulkStampTopUpPlan {
  stamps: BulkStampTopUpDetail[];
  stampsNeedingTopUp: BulkStampTopUpDetail[];
  targetRemainingPerChunk: bigint;
  totalCostPlur: bigint;
  totalCostBzz: BZZ;
  additionalDays: number;
  preTopUpDrift: number;
}

export interface BulkStampTopUpResult {
  successful: { stampId: string; txHash?: Hex }[];
  failed: { stampId: string; error: string }[];
}

export const TOPUP_STATUS = {
  APPROVING: 'approving',
  BATCH_PENDING: 'batch_pending',
  DONE: 'done',
  ERROR: 'error',
} as const;

export type TopUpStatus = (typeof TOPUP_STATUS)[keyof typeof TOPUP_STATUS];

export type BulkStampTopUpProgressCallback = (
  status: TopUpStatus,
  detail: { stampId?: string; index?: number; total?: number; error?: string },
) => void;

function getAmountForDuration(duration: Duration, pricePerBlock: bigint): bigint {
  const blocks = BigInt(duration.toSeconds()) / BigInt(GNOSIS_BLOCK_TIME);
  return blocks * pricePerBlock + 1n;
}

function calculateExtensionCost(duration: Duration, depth: number, lastPrice: bigint): ExtensionCalculation {
  const amountPerChunk = getAmountForDuration(duration, lastPrice);
  const totalCostPlur = amountPerChunk * 2n ** BigInt(depth);
  const costBzz = BZZ.fromPLUR(totalCostPlur);

  return { duration, amountPerChunk, totalCostPlur, costBzz };
}

export async function extendStampDuration(
  walletClient: WalletClient,
  publicClient: PublicClient,
  stampId: string,
  additionalDays: number,
): Promise<Hex> {
  const userAddress = walletClient.account!.address;

  const [batchData, contractState] = await Promise.all([
    fetchBatchData(publicClient, stampId),
    fetchContractState(publicClient),
  ]);

  const duration = Duration.fromDays(additionalDays);
  const calculation = calculateExtensionCost(duration, batchData.depth, contractState.lastPrice);

  const hasBalance = await hasSufficientBalance(publicClient, userAddress, calculation.totalCostPlur);
  if (!hasBalance) {
    throw new Error(
      `Not enough BZZ to complete this top-up. Required: ${calculation.costBzz.toDecimalString()} BZZ. Please add more BZZ to your wallet.`,
    );
  }

  const approved = await ensureBzzApproval(walletClient, publicClient, calculation.totalCostPlur);
  if (!approved) {
    throw new Error('Failed to approve BZZ spending. Please try again and confirm the approval in your wallet.');
  }

  return executeTopup(walletClient, publicClient, stampId, calculation.amountPerChunk);
}

export async function calculateCostForDays(
  publicClient: PublicClient,
  stampId: string,
  additionalDays: number,
): Promise<ExtensionDaysCalculation> {
  const [batchData, contractState] = await Promise.all([
    fetchBatchData(publicClient, stampId),
    fetchContractState(publicClient),
  ]);

  const duration = Duration.fromDays(additionalDays);
  const calculation = calculateExtensionCost(duration, batchData.depth, contractState.lastPrice);

  return {
    cost: calculation.costBzz,
    costString: calculation.costBzz.toDecimalString(),
  };
}

/**
 * Calculates an equalizing bulk topUp plan that converges all stamps to the
 * same expiry date.
 *
 * Anchors the target to the latest expiring stamp + additionalDays. Behind
 * stamps receive a larger topUp to close the gap:
 *
 *   target = maxRemaining + additionalDays
 *   neededTopUp per stamp = max(target - current, additionalDays)
 *
 * Example with 30 additionalDays:
 *   Stamp A (2.0 days remaining) → needs 30.3 days of topUp → expires at 32.3
 *   Stamp B (2.3 days remaining) → needs 30.0 days of topUp → expires at 32.3
 *   Both converge to the same target. Existing drift is corrected.
 *
 * On retry after partial failure this is naturally idempotent: already toppedUp
 * stamps show a high current balance → small gap → minimum topUp or filtered
 * out by stampsNeedingTopUp.
 */
export async function calculateBulkStampTopUpPlan(
  stampIds: string[],
  additionalDays: number,
): Promise<BulkStampTopUpPlan> {
  const expirationResult = await loadBulkStampExpirations(stampIds);
  const { contractState } = expirationResult;

  // Anchor to the latest expiring stamp so every other stamp catches up to it
  let maxRemainingPerChunk = 0n;
  for (const entry of expirationResult.entries) {
    const remaining = getRemainingBalancePerChunk(entry.batchData, contractState);
    if (remaining > maxRemainingPerChunk) {
      maxRemainingPerChunk = remaining;
    }
  }

  // Target = latest stamp's balance + additionalDays, so all stamps land here
  // Sync only mode: only close the gap, no extra duration added
  const additionalPerChunk =
    additionalDays > 0 ? getAmountForDuration(Duration.fromDays(additionalDays), contractState.lastPrice) : 0n;
  const targetRemainingPerChunk = maxRemainingPerChunk + additionalPerChunk;

  const stamps: BulkStampTopUpDetail[] = expirationResult.entries.map((entry) => {
    const currentRemainingPerChunk = getRemainingBalancePerChunk(entry.batchData, contractState);
    const gap = targetRemainingPerChunk - currentRemainingPerChunk;
    // Behind stamps get the full gap, in topUp mode stamps near target get the flat minimum
    const neededTopUpPerChunk = additionalDays > 0 ? (gap > additionalPerChunk ? gap : additionalPerChunk) : gap;
    const costPlur = neededTopUpPerChunk * 2n ** BigInt(entry.batchData.depth);

    return {
      stampId: entry.stampId,
      depth: entry.batchData.depth,
      currentRemainingPerChunk,
      neededTopUpPerChunk,
      costPlur,
    };
  });

  const stampsNeedingTopUp = stamps.filter((s) => s.neededTopUpPerChunk > 0n);
  const totalCostPlur = stampsNeedingTopUp.reduce((sum, s) => sum + s.costPlur, 0n);

  return {
    stamps,
    stampsNeedingTopUp,
    targetRemainingPerChunk,
    totalCostPlur,
    totalCostBzz: BZZ.fromPLUR(totalCostPlur),
    additionalDays,
    preTopUpDrift: expirationResult.maxDriftDays,
  };
}

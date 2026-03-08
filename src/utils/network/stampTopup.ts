import { BZZ, Duration } from '@ethersphere/bee-js';
import { ethers } from 'ethers';

import {
  createContract,
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
  successful: { stampId: string; receipt: ethers.ContractTransactionReceipt }[];
  failed: { stampId: string; error: string }[];
}

export const TOPUP_STATUS = {
  APPROVING: 'approving',
  TOPUP: 'topup',
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
  signer: ethers.Signer,
  stampId: string,
  additionalDays: number,
): Promise<ethers.ContractTransactionReceipt> {
  const provider = signer.provider;
  if (!provider) throw new Error('No provider available');

  const contract = createContract(provider);
  const [batchData, contractState] = await Promise.all([
    fetchBatchData(contract, stampId),
    fetchContractState(contract),
  ]);

  const duration = Duration.fromDays(additionalDays);
  const calculation = calculateExtensionCost(duration, batchData.depth, contractState.lastPrice);

  const userAddress = await signer.getAddress();
  const hasBalance = await hasSufficientBalance(provider, userAddress, calculation.totalCostPlur);

  if (!hasBalance) {
    throw new Error(`Insufficient BZZ balance. Need ${calculation.costBzz.toDecimalString()} BZZ`);
  }

  const approved = await ensureBzzApproval(signer, calculation.totalCostPlur);
  if (!approved) {
    throw new Error('BZZ approval failed');
  }

  return executeTopup(signer, stampId, calculation.amountPerChunk);
}

export async function calculateCostForDays(
  provider: ethers.Provider,
  stampId: string,
  additionalDays: number,
): Promise<ExtensionDaysCalculation> {
  const contract = createContract(provider);

  const [batchData, contractState] = await Promise.all([
    fetchBatchData(contract, stampId),
    fetchContractState(contract),
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
  const duration = Duration.fromDays(additionalDays);
  const additionalPerChunk = getAmountForDuration(duration, contractState.lastPrice);
  const targetRemainingPerChunk = maxRemainingPerChunk + additionalPerChunk;

  const stamps: BulkStampTopUpDetail[] = expirationResult.entries.map((entry) => {
    const currentRemainingPerChunk = getRemainingBalancePerChunk(entry.batchData, contractState);
    const gap = targetRemainingPerChunk - currentRemainingPerChunk;
    // Behind stamps get the full gap; stamps already near target get the flat minimum
    const neededTopUpPerChunk = gap > additionalPerChunk ? gap : additionalPerChunk;
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
  const totalCostPlur = stamps.reduce((sum, s) => sum + s.costPlur, 0n);

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

export async function extendBulkStampDuration(
  signer: ethers.Signer,
  stampIds: string[],
  additionalDays: number,
  onProgress?: BulkStampTopUpProgressCallback,
): Promise<BulkStampTopUpResult> {
  const provider = signer.provider;
  if (!provider) throw new Error('No provider available');

  const plan = await calculateBulkStampTopUpPlan(stampIds, additionalDays);

  if (plan.stampsNeedingTopUp.length === 0) {
    onProgress?.(TOPUP_STATUS.DONE, { total: 0 });
    return { successful: [], failed: [] };
  }

  // Check total BZZ balance
  const userAddress = await signer.getAddress();
  const hasBalance = await hasSufficientBalance(provider, userAddress, plan.totalCostPlur);
  if (!hasBalance) {
    throw new Error(`Insufficient BZZ balance. Need ${plan.totalCostBzz.toDecimalString()} BZZ`);
  }

  // Single approval for total amount
  onProgress?.(TOPUP_STATUS.APPROVING, { total: plan.stampsNeedingTopUp.length });
  const approved = await ensureBzzApproval(signer, plan.totalCostPlur);
  if (!approved) {
    throw new Error('BZZ approval failed');
  }

  // Execute topUps sequentially, stop on first failure
  const result: BulkStampTopUpResult = { successful: [], failed: [] };

  for (let i = 0; i < plan.stampsNeedingTopUp.length; i++) {
    const stamp = plan.stampsNeedingTopUp[i];
    onProgress?.(TOPUP_STATUS.TOPUP, {
      stampId: stamp.stampId,
      index: i,
      total: plan.stampsNeedingTopUp.length,
    });

    try {
      const receipt = await executeTopup(signer, stamp.stampId, stamp.neededTopUpPerChunk);
      result.successful.push({ stampId: stamp.stampId, receipt });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TopUp failed';
      result.failed.push({ stampId: stamp.stampId, error: errorMessage });
      onProgress?.(TOPUP_STATUS.ERROR, {
        stampId: stamp.stampId,
        index: i,
        total: plan.stampsNeedingTopUp.length,
        error: errorMessage,
      });
      break;
    }
  }

  if (result.failed.length === 0) {
    onProgress?.(TOPUP_STATUS.DONE, { total: plan.stampsNeedingTopUp.length });
  }

  return result;
}

import { type Hex, type PublicClient, type WalletClient } from 'viem';

import { padStampId } from '@/utils/ui/format';

import { POSTAGE_BATCHER_ABI, POSTAGE_BATCHER_ADDRESS, POSTAGE_BATCHER_FN, TX_STATUS } from './contracts/constants';
import { ensureBzzApproval } from './contracts';
import { type BulkStampTopUpPlan, type BulkStampTopUpProgressCallback, TOPUP_STATUS } from './stampTopup';

export async function executeBatchTopUp(
  walletClient: WalletClient,
  publicClient: PublicClient,
  plan: BulkStampTopUpPlan,
  onProgress?: BulkStampTopUpProgressCallback,
): Promise<void> {
  const stamps = plan.stampsNeedingTopUp;

  onProgress?.(TOPUP_STATUS.APPROVING, { total: stamps.length });

  const approved = await ensureBzzApproval(walletClient, publicClient, plan.totalCostPlur, POSTAGE_BATCHER_ADDRESS);
  if (!approved) {
    throw new Error('Failed to approve BZZ spending. Please try again and confirm the approval in your wallet.');
  }

  onProgress?.(TOPUP_STATUS.BATCH_PENDING, { total: stamps.length });

  const batchIds = stamps.map((s) => padStampId(s.stampId)) as Hex[];
  const amounts = stamps.map((s) => s.neededTopUpPerChunk);

  const hash = await walletClient.writeContract({
    address: POSTAGE_BATCHER_ADDRESS,
    abi: POSTAGE_BATCHER_ABI,
    functionName: POSTAGE_BATCHER_FN.BATCH_TOP_UP,
    args: [batchIds, amounts],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === TX_STATUS.SUCCESS) {
    onProgress?.(TOPUP_STATUS.DONE, { total: stamps.length });
    return;
  }

  throw new Error('Batch top-up transaction was reverted. All stamps were left unchanged. Please try again.');
}

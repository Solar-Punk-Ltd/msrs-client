import { type Hex, type PublicClient, type WalletClient } from 'viem';

import { padStampId } from '../../ui/format';

import { POSTAGE_FN, POSTAGE_STAMP_ABI, POSTAGE_STAMP_CONTRACT, TX_STATUS } from './constants';

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

export const fetchBatchData = async (publicClient: PublicClient, stampId: string): Promise<BatchData> => {
  const result = await publicClient.readContract({
    address: POSTAGE_STAMP_CONTRACT,
    abi: POSTAGE_STAMP_ABI,
    functionName: POSTAGE_FN.BATCHES,
    args: [padStampId(stampId)],
  });

  const [owner, depth, bucketDepth, immutableFlag, normalisedBalance, lastUpdatedBlockNumber] = result as [
    string,
    number,
    number,
    boolean,
    bigint,
    bigint,
  ];

  return {
    owner,
    depth: Number(depth),
    bucketDepth: Number(bucketDepth),
    immutableFlag,
    normalisedBalance,
    lastUpdatedBlockNumber,
  };
};

export const fetchContractState = async (publicClient: PublicClient): Promise<ContractState> => {
  const [currentTotalOutPayment, lastPrice] = await Promise.all([
    publicClient.readContract({
      address: POSTAGE_STAMP_CONTRACT,
      abi: POSTAGE_STAMP_ABI,
      functionName: POSTAGE_FN.CURRENT_TOTAL_OUT_PAYMENT,
    }) as Promise<bigint>,
    publicClient.readContract({
      address: POSTAGE_STAMP_CONTRACT,
      abi: POSTAGE_STAMP_ABI,
      functionName: POSTAGE_FN.LAST_PRICE,
    }) as Promise<bigint>,
  ]);

  return { currentTotalOutPayment, lastPrice };
};

export async function executeTopup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  stampId: string,
  amountPerChunk: bigint,
): Promise<Hex> {
  const hash = await walletClient.writeContract({
    address: POSTAGE_STAMP_CONTRACT,
    abi: POSTAGE_STAMP_ABI,
    functionName: POSTAGE_FN.TOP_UP,
    args: [padStampId(stampId), amountPerChunk],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === TX_STATUS.REVERTED) {
    throw new Error('Stamp top-up transaction was reverted by the contract. The stamp may be expired or invalid.');
  }

  return hash;
}

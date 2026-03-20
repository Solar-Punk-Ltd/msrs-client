import { type Address, type PublicClient, type WalletClient } from 'viem';

import { padStampId } from '../../ui/format';

import { POSTAGE_STAMP_ABI, POSTAGE_STAMP_CONTRACT } from './constants';

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
  const formattedId = padStampId(stampId) as `0x${string}`;

  const result = await publicClient.readContract({
    address: POSTAGE_STAMP_CONTRACT as Address,
    abi: POSTAGE_STAMP_ABI,
    functionName: 'batches',
    args: [formattedId],
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
      address: POSTAGE_STAMP_CONTRACT as Address,
      abi: POSTAGE_STAMP_ABI,
      functionName: 'currentTotalOutPayment',
    }) as Promise<bigint>,
    publicClient.readContract({
      address: POSTAGE_STAMP_CONTRACT as Address,
      abi: POSTAGE_STAMP_ABI,
      functionName: 'lastPrice',
    }) as Promise<bigint>,
  ]);

  return { currentTotalOutPayment, lastPrice };
};

export async function executeTopup(
  walletClient: WalletClient,
  publicClient: PublicClient,
  stampId: string,
  amountPerChunk: bigint,
): Promise<`0x${string}`> {
  const batchId = padStampId(stampId) as `0x${string}`;

  const hash = await walletClient.writeContract({
    address: POSTAGE_STAMP_CONTRACT as Address,
    abi: POSTAGE_STAMP_ABI,
    functionName: 'topUp',
    args: [batchId, amountPerChunk],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'reverted') {
    throw new Error('TopUp transaction reverted');
  }

  return hash;
}

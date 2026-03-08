import { ethers } from 'ethers';

import { padStampId } from '../../ui/format';
import { getWalletService } from '../wallet';

import { POSTAGE_STAMP_ABI, POSTAGE_STAMP_CONTRACT } from './constants';

export interface PostageStampContract {
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

export async function executeTopup(
  signer: ethers.Signer,
  stampId: string,
  amountPerChunk: bigint,
): Promise<ethers.ContractTransactionReceipt> {
  const provider = signer.provider;
  if (!provider) throw new Error('No provider available');

  const contract = createContract(provider);
  const contractWithSigner = contract.connect(signer);
  const batchId = padStampId(stampId);

  console.log('Executing topup transaction...');
  const tx = await contractWithSigner.topUp(batchId, amountPerChunk);
  const receipt = await tx.wait();

  if (!receipt) throw new Error('Transaction failed');
  console.log('Topup transaction confirmed');

  return receipt;
}

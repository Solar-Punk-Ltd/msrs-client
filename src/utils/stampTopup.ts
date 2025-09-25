import { BZZ, Duration } from '@ethersphere/bee-js';
import { ethers } from 'ethers';

import { padStampId } from './format';
import {
  createContract,
  fetchBatchData,
  fetchContractState,
  GNOSIS_BLOCK_TIME,
  POSTAGE_STAMP_CONTRACT,
} from './stampInfo';

const BZZ_TOKEN_ADDRESS = '0xdBF3Ea6F5beE45c02255B2c26a16F300502F68da';

const BZZ_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

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

function getAmountForDuration(duration: Duration, pricePerBlock: bigint): bigint {
  const blocks = BigInt(duration.toSeconds()) / BigInt(GNOSIS_BLOCK_TIME);
  return blocks * pricePerBlock + 1n;
}

function calculateExtensionCost(duration: Duration, depth: number, lastPrice: bigint): ExtensionCalculation {
  const amountPerChunk = getAmountForDuration(duration, lastPrice);
  const totalCostPlur = amountPerChunk * 2n ** BigInt(depth);
  const costBzz = BZZ.fromPLUR(totalCostPlur);

  return {
    duration,
    amountPerChunk,
    totalCostPlur,
    costBzz,
  };
}

async function hasSufficientBalance(
  provider: ethers.Provider,
  userAddress: string,
  amountPlur: bigint,
): Promise<boolean> {
  const bzzContract = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, provider);
  const balance: bigint = await bzzContract.balanceOf(userAddress);
  return balance >= amountPlur;
}

async function ensureBzzApproval(signer: ethers.Signer, amountPlur: bigint): Promise<boolean> {
  const bzzContract = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, signer);
  const userAddress = await signer.getAddress();

  const currentAllowance: bigint = await bzzContract.allowance(userAddress, POSTAGE_STAMP_CONTRACT);

  if (currentAllowance >= amountPlur) {
    console.log('BZZ approval already sufficient');
    return true;
  }

  console.log('Approving BZZ tokens for PostageStamp contract...');
  // Approve max uint256 for convenience (user won't need to approve again)
  const maxApproval = ethers.MaxUint256;
  const approveTx = await bzzContract.approve(POSTAGE_STAMP_CONTRACT, maxApproval);
  const receipt = await approveTx.wait();

  console.log('BZZ approval confirmed');
  return receipt !== null;
}

async function executeTopup(
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

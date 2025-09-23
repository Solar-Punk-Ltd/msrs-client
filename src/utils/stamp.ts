import { ethers } from 'ethers';

// Types
interface BatchData {
  owner: string;
  depth: number;
  bucketDepth: number;
  immutableFlag: boolean;
  normalisedBalance: bigint;
  lastUpdatedBlockNumber: bigint;
}

export interface StampData {
  owner: string;
  depth: number;
  bucketDepth: number;
  immutable: boolean;
  remainingBalance: string;
  remainingDays: number;
  effectiveGB: string;
  isExpired: boolean;
  normalisedBalance: string;
  lastPrice: string;
}

export interface ExtensionCost {
  totalCost: string;
  costPerChunk: string;
}

// Contract ABIs
const POSTAGE_STAMP_ABI = [
  'function batches(bytes32) view returns (address owner, uint8 depth, uint8 bucketDepth, bool immutableFlag, uint256 normalisedBalance, uint256 lastUpdatedBlockNumber)',
  'function remainingBalance(bytes32) view returns (uint256)',
  'function currentTotalOutPayment() view returns (uint256)',
  'function lastPrice() view returns (uint64)',
  'function topUp(bytes32 batchId, uint256 topupAmountPerChunk)',
];

const BZZ_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Constants
export const POSTAGE_STAMP_ADDRESS = '0x621e455C4a139f5C4e4A8122Ce55Dc21630769E4';
export const BZZ_TOKEN_ADDRESS = '0xdBF3Ea6F5beE45c02255B2c26a16F300502F68da';
export const BLOCKS_PER_DAY = 17280;
export const BZZ_DECIMALS = 16;

export class StampService {
  private provider: ethers.Provider;
  private postageStamp: ethers.Contract;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.postageStamp = new ethers.Contract(POSTAGE_STAMP_ADDRESS, POSTAGE_STAMP_ABI, provider);
  }

  async getStampData(stampId: string): Promise<StampData> {
    try {
      const [batch, remainingBalance, currentTotalOutPayment, lastPrice] = await Promise.all([
        this.postageStamp.batches(stampId) as Promise<BatchData>,
        this.postageStamp.remainingBalance(stampId),
        this.postageStamp.currentTotalOutPayment(),
        this.postageStamp.lastPrice(),
      ]);

      // Calculate remaining days
      const remainingBlocks = remainingBalance / lastPrice;
      const remainingDays = Number(remainingBlocks) / BLOCKS_PER_DAY;

      // Calculate effective size
      const depth = Number(batch.depth);
      const theoreticalBytes = 4096 * Math.pow(2, depth);
      const effectiveGB = (theoreticalBytes * 0.9) / (1024 * 1024 * 1024);

      // Check if expired
      const isExpired = batch.normalisedBalance <= currentTotalOutPayment;

      return {
        owner: batch.owner,
        depth: Number(batch.depth),
        bucketDepth: Number(batch.bucketDepth),
        immutable: batch.immutableFlag,
        remainingBalance: remainingBalance.toString(),
        remainingDays: isExpired ? 0 : remainingDays,
        effectiveGB: effectiveGB.toFixed(2),
        isExpired,
        normalisedBalance: batch.normalisedBalance.toString(),
        lastPrice: lastPrice.toString(),
      };
    } catch (error) {
      console.error('Error fetching stamp data:', error);
      throw error;
    }
  }

  calculateExtensionCost(stampData: StampData, days: number): ExtensionCost {
    if (!stampData) return { totalCost: '0', costPerChunk: '0' };

    const additionalBlocks = Math.floor(days * BLOCKS_PER_DAY);
    const costPerChunk = BigInt(stampData.lastPrice) * BigInt(additionalBlocks);
    const numChunks = BigInt(2 ** stampData.depth);
    const totalCost = costPerChunk * numChunks;

    return {
      totalCost: totalCost.toString(),
      costPerChunk: costPerChunk.toString(),
    };
  }

  async extendStamp(
    signer: ethers.Signer,
    stampId: string,
    extensionDays: number,
    stampData: StampData,
  ): Promise<ethers.ContractTransaction> {
    const cost = this.calculateExtensionCost(stampData, extensionDays);
    const postageStamp = new ethers.Contract(POSTAGE_STAMP_ADDRESS, POSTAGE_STAMP_ABI, signer);
    const bzzToken = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, signer);

    // Check and approve if needed
    const signerAddress = await signer.getAddress();
    const currentAllowance = await bzzToken.allowance(signerAddress, POSTAGE_STAMP_ADDRESS);

    if (BigInt(currentAllowance) < BigInt(cost.totalCost)) {
      console.log('Approving BZZ tokens...');
      const approveTx = await bzzToken.approve(POSTAGE_STAMP_ADDRESS, cost.totalCost);
      await approveTx.wait();
      console.log('Approval confirmed');
    }

    // Execute topUp
    console.log('Extending batch...');
    const topUpTx = await postageStamp.topUp(stampId, cost.costPerChunk);
    const receipt = await topUpTx.wait();

    return receipt;
  }
}

// Utility functions
export function formatBZZ(value: bigint | string): string {
  const inWei = BigInt(value);
  const bzzValue = inWei / BigInt(10 ** (18 - BZZ_DECIMALS));
  return (Number(bzzValue) / 10 ** BZZ_DECIMALS).toFixed(4);
}

export function parseBZZ(bzzAmount: string): bigint {
  const numericAmount = parseFloat(bzzAmount);
  return BigInt(Math.floor(numericAmount * 10 ** BZZ_DECIMALS)) * BigInt(10 ** (18 - BZZ_DECIMALS));
}

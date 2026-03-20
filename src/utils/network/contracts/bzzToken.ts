import { type Address, type PublicClient, type WalletClient } from 'viem';

import { BZZ_TOKEN_ABI, BZZ_TOKEN_ADDRESS, POSTAGE_STAMP_CONTRACT } from './constants';

export async function hasSufficientBalance(
  publicClient: PublicClient,
  userAddress: string,
  amountPlur: bigint,
): Promise<boolean> {
  const balance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS as Address,
    abi: BZZ_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [userAddress as Address],
  })) as bigint;

  return balance >= amountPlur;
}

export async function ensureBzzApproval(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amountPlur: bigint,
): Promise<boolean> {
  const userAddress = walletClient.account!.address;

  const currentAllowance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS as Address,
    abi: BZZ_TOKEN_ABI,
    functionName: 'allowance',
    args: [userAddress, POSTAGE_STAMP_CONTRACT as Address],
  })) as bigint;

  if (currentAllowance >= amountPlur) {
    return true;
  }

  const hash = await walletClient.writeContract({
    address: BZZ_TOKEN_ADDRESS as Address,
    abi: BZZ_TOKEN_ABI,
    functionName: 'approve',
    args: [POSTAGE_STAMP_CONTRACT as Address, amountPlur],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.status === 'success';
}

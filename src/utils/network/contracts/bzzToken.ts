import { type Address, type PublicClient, type WalletClient } from 'viem';

import { BZZ_FN, BZZ_TOKEN_ABI, BZZ_TOKEN_ADDRESS, POSTAGE_STAMP_CONTRACT, TX_STATUS } from './constants';

export async function hasSufficientBalance(
  publicClient: PublicClient,
  userAddress: string,
  amountPlur: bigint,
): Promise<boolean> {
  const balance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS,
    abi: BZZ_TOKEN_ABI,
    functionName: BZZ_FN.BALANCE_OF,
    args: [userAddress as Address],
  })) as bigint;

  return balance >= amountPlur;
}

export async function ensureBzzApproval(
  walletClient: WalletClient,
  publicClient: PublicClient,
  amountPlur: bigint,
  spender: Address = POSTAGE_STAMP_CONTRACT,
): Promise<boolean> {
  const userAddress = walletClient.account!.address;

  const currentAllowance = (await publicClient.readContract({
    address: BZZ_TOKEN_ADDRESS,
    abi: BZZ_TOKEN_ABI,
    functionName: BZZ_FN.ALLOWANCE,
    args: [userAddress, spender],
  })) as bigint;

  if (currentAllowance >= amountPlur) {
    return true;
  }

  const hash = await walletClient.writeContract({
    address: BZZ_TOKEN_ADDRESS,
    abi: BZZ_TOKEN_ABI,
    functionName: BZZ_FN.APPROVE,
    args: [spender, amountPlur],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.status === TX_STATUS.SUCCESS;
}

import { ethers } from 'ethers';

import { BZZ_TOKEN_ABI, BZZ_TOKEN_ADDRESS, POSTAGE_STAMP_CONTRACT } from './constants';

export async function hasSufficientBalance(
  provider: ethers.Provider,
  userAddress: string,
  amountPlur: bigint,
): Promise<boolean> {
  const bzzContract = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, provider);
  const balance: bigint = await bzzContract.balanceOf(userAddress);
  return balance >= amountPlur;
}

export async function ensureBzzApproval(signer: ethers.Signer, amountPlur: bigint): Promise<boolean> {
  const bzzContract = new ethers.Contract(BZZ_TOKEN_ADDRESS, BZZ_TOKEN_ABI, signer);
  const userAddress = await signer.getAddress();

  const currentAllowance: bigint = await bzzContract.allowance(userAddress, POSTAGE_STAMP_CONTRACT);

  if (currentAllowance >= amountPlur) {
    console.log('BZZ approval already sufficient');
    return true;
  }

  console.log('Approving BZZ tokens for PostageStamp contract...');

  // I leave this here for future reference
  // Approve max uint256 for convenience (user won't need to approve again)
  // const maxApproval = ethers.MaxUint256;
  // const approveTx = await bzzContract.approve(POSTAGE_STAMP_CONTRACT, maxApproval);

  // For now only approve the needed amount
  const approveTx = await bzzContract.approve(POSTAGE_STAMP_CONTRACT, amountPlur);
  const receipt = await approveTx.wait();

  console.log('BZZ approval confirmed');
  return receipt !== null;
}

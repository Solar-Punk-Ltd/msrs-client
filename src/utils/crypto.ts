import { PrivateKey } from '@ethersphere/bee-js';
import { keccak256, toBytes } from 'viem';

export function getSigner(input: string): PrivateKey {
  const normalized = input.trim().toLowerCase();
  const hash = keccak256(toBytes(normalized));
  const privateKeyHex = hash.slice(2);
  return new PrivateKey(privateKeyHex);
}

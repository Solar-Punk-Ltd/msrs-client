import { PrivateKey } from '@ethersphere/bee-js';
import { keccak256 } from 'ethers';

export function getSigner(input: string): PrivateKey {
  const normalized = input.trim().toLowerCase();

  const hash = keccak256(Buffer.from(normalized, 'utf-8'));

  const privateKeyHex = hash.slice(2);

  return new PrivateKey(privateKeyHex);
}

export function remove0x(hex: string) {
  return (hex.startsWith('0x') ? hex.slice(2) : hex).toLowerCase();
}

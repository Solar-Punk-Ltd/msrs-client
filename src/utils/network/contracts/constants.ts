import { type Address, createPublicClient, http, type PublicClient } from 'viem';
import { gnosis } from 'viem/chains';

// ── Network ──────────────────────────────────────────────────────────────────

export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';
export const GNOSIS_BLOCK_TIME = 5; // seconds

// ── Contract addresses ───────────────────────────────────────────────────────

export const POSTAGE_STAMP_CONTRACT: Address = '0x45a1502382541Cd610CC9068e88727426b696293';
export const CONSISTENCY_THRESHOLD_DAYS = 1 / 24; // 1 hour

export const MULTICALL3_ADDRESS: Address = '0xcA11bde05977b3631167028862bE2a173976CA11';
export const MULTICALL3_ABI = [
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
] as const;

export const POSTAGE_STAMP_ABI = [
  {
    name: 'batches',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'batchId', type: 'bytes32' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'depth', type: 'uint8' },
      { name: 'bucketDepth', type: 'uint8' },
      { name: 'immutableFlag', type: 'bool' },
      { name: 'normalisedBalance', type: 'uint256' },
      { name: 'lastUpdatedBlockNumber', type: 'uint256' },
    ],
  },
  {
    name: 'currentTotalOutPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'topUp',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'batchId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const BZZ_TOKEN_ADDRESS: Address = '0xdBF3Ea6F5beE45c02255B2c26a16F300502F68da';
export const BZZ_TOKEN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ── Transaction status ───────────────────────────────────────────────────────

export const TX_STATUS = {
  SUCCESS: 'success',
  REVERTED: 'reverted',
} as const;

// ── EIP-5792 capability status ───────────────────────────────────────────────

export const ATOMIC_CAPABILITY_STATUS = {
  SUPPORTED: 'supported',
  READY: 'ready',
} as const;

// ── Default public client ────────────────────────────────────────────────────

export function getDefaultPublicClient(): PublicClient {
  return createPublicClient({
    chain: gnosis,
    transport: http(GNOSIS_RPC_URL),
  });
}

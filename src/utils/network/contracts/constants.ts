import { type Address, createPublicClient, http, type PublicClient } from 'viem';
import { gnosis } from 'viem/chains';

export const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';
export const GNOSIS_BLOCK_TIME = 5; // seconds

export const POSTAGE_STAMP_CONTRACT: Address = '0x45a1502382541Cd610CC9068e88727426b696293';
// https://github.com/Solar-Punk-Ltd/postage-batcher
export const POSTAGE_BATCHER_ADDRESS: Address = '0xf9E92Fa33e697Ba3059Bc25ba1448Cd899b16e51';
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

export const POSTAGE_FN = {
  BATCHES: 'batches',
  CURRENT_TOTAL_OUT_PAYMENT: 'currentTotalOutPayment',
  LAST_PRICE: 'lastPrice',
  TOP_UP: 'topUp',
} as const;

export const BZZ_FN = {
  APPROVE: 'approve',
  ALLOWANCE: 'allowance',
  BALANCE_OF: 'balanceOf',
} as const;

export const POSTAGE_BATCHER_ABI = [
  {
    name: 'batchTopUp',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_batchIds', type: 'bytes32[]' },
      { name: '_topupAmountsPerChunk', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'batchTopUpFixed',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_batchIds', type: 'bytes32[]' },
      { name: '_topupAmountPerChunk', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const POSTAGE_BATCHER_FN = {
  BATCH_TOP_UP: 'batchTopUp',
  BATCH_TOP_UP_FIXED: 'batchTopUpFixed',
} as const;

export const TX_STATUS = {
  SUCCESS: 'success',
  REVERTED: 'reverted',
} as const;

export function getDefaultPublicClient(): PublicClient {
  return createPublicClient({
    chain: gnosis,
    transport: http(GNOSIS_RPC_URL),
  });
}

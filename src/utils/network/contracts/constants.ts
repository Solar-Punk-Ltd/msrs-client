export const POSTAGE_STAMP_CONTRACT = '0x45a1502382541Cd610CC9068e88727426b696293';
export const GNOSIS_BLOCK_TIME = 5; // seconds
export const CONSISTENCY_THRESHOLD_DAYS = 1 / 24; // 1 hour

export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
export const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])',
];

export const POSTAGE_STAMP_ABI = [
  'function batches(bytes32) view returns (address owner, uint8 depth, uint8 bucketDepth, bool immutableFlag, uint256 normalisedBalance, uint256 lastUpdatedBlockNumber)',
  'function currentTotalOutPayment() view returns (uint256)',
  'function lastPrice() view returns (uint256)',
  'function topUp(bytes32 batchId, uint256 amount) payable',
];

export const BZZ_TOKEN_ADDRESS = '0xdBF3Ea6F5beE45c02255B2c26a16F300502F68da';
export const BZZ_TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

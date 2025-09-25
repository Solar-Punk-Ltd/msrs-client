export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function formatStampId(stampId: string): string {
  return `${stampId.slice(0, 10)}...${stampId.slice(-8)}`;
}

export function formatDays(days: number): string {
  return `${days.toFixed(1)} days`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const padStampId = (stampId: string): string => {
  return stampId.startsWith('0x') ? stampId : `0x${stampId}`;
};

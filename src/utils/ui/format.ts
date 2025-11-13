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

export const formatStampExpirationDate = (date: Date) => date.toISOString().slice(0, 10);

export const formatBzzAmount = (costString: string): string => {
  const numericValue = parseFloat(costString);
  return numericValue.toFixed(3).replace(/\.?0+$/, '');
};

export const createUniqueUsername = (name: string, publicKey: string): string => {
  const trimmedName = name.trim();
  const cleanPubKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

  const keyIdentifier = cleanPubKey.slice(-6).toLowerCase();

  const part1 = keyIdentifier.slice(0, 3);
  const part2 = keyIdentifier.slice(3, 6);

  return `${trimmedName} ${part1}:${part2}`;
};

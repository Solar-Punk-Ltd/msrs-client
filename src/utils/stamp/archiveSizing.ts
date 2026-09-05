import { Size, Utils } from '@ethersphere/bee-js';

import type { BatchInfo } from '@/utils/network/uploaderService';

/** Effective capacity is a probabilistic bound, so plan with room to spare. */
const HEADROOM = 1.2;
const SECONDS_PER_DAY = 86_400;

export interface DiluteAdvice {
  /** Depth the batch must grow to for everything to fit. */
  depth: number;
  /** Each extra depth step halves the days left on the batch until it is topped up. */
  steps: number;
}

export function fitsInBatch(bytes: number, batch: BatchInfo): boolean {
  return bytes * HEADROOM <= batch.freeBytes;
}

/** Null when the bytes fit, otherwise the dilute the batch needs first. */
export function diluteAdvice(bytes: number, batch: BatchInfo): DiluteAdvice | null {
  if (fitsInBatch(bytes, batch)) return null;
  const depth = Utils.getDepthForSize(Size.fromBytes((batch.bytesStamped + bytes) * HEADROOM));
  return { depth, steps: Math.max(1, depth - batch.depth) };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatDays(seconds: number): string {
  const days = seconds / SECONDS_PER_DAY;
  return days >= 10 ? `${Math.floor(days)} days` : `${days.toFixed(1)} days`;
}

/** Share of a stream already on the batch, when its size is known. */
export function archivedShare(chunksOnBatch: number, chunks: number | undefined): number | null {
  if (!chunks) return null;
  return Math.min(1, chunksOnBatch / chunks);
}

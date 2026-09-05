import type { BatchInfo, JobProgress } from '@/utils/network/uploaderService';

/** Effective capacity is a probabilistic bound, so plan with room to spare. */
const HEADROOM = 1.2;
const SECONDS_PER_DAY = 86_400;

export function fitsInBatch(bytes: number, batch: BatchInfo): boolean {
  return bytes * HEADROOM <= batch.freeBytes;
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

export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** Percent of a copy done, capped below 100 until the job reports completion. */
export function copyPercent(progress: JobProgress | null, expectedChunks: number | null): number | null {
  if (!progress || !expectedChunks) return null;
  return Math.min(99, Math.round(((progress.copied + progress.skipped) / expectedChunks) * 100));
}

import { describe, expect, it } from 'vitest';

import type { BatchInfo } from '@/utils/network/uploaderService';

import { copyPercent, fitsInBatch, formatBytes, formatDays, formatDuration } from './archiveSizing';

const batch: BatchInfo = {
  batchId: 'a'.repeat(64),
  label: 'archive',
  depth: 23,
  immutable: true,
  usable: true,
  utilization: 3,
  ttlSeconds: 29.9 * 86_400,
  chunksStamped: 450_000,
  bytesStamped: 450_000 * 4096,
  effectiveBytes: 18.2e9,
  freeBytes: 18.2e9 - 450_000 * 4096,
};

describe('archive sizing', () => {
  it('accepts a stream that fits with headroom and refuses one that does not', () => {
    expect(fitsInBatch(3e9, batch)).toBe(true);
    expect(fitsInBatch(30e9, batch)).toBe(false);
  });

  it('formats sizes, days and durations for people', () => {
    expect(formatBytes(19_498_796)).toBe('19.5 MB');
    expect(formatBytes(3.03e9)).toBe('3.03 GB');
    expect(formatDays(29.9 * 86_400)).toBe('29 days');
    expect(formatDays(1.8 * 86_400)).toBe('1.8 days');
    expect(formatDuration(3_000)).toBe('3s');
    expect(formatDuration(18 * 60_000 + 7_000)).toBe('18m 7s');
    expect(formatDuration(65 * 60_000)).toBe('1h 5m');
  });

  it('reports copy progress as a capped percentage', () => {
    const progress = { copied: 400_000, skipped: 80_000, bytes: 0, parity: 0, failed: 0, segments: 0, chatUpdates: 0 };
    expect(copyPercent(progress, 764_000)).toBe(63);
    expect(copyPercent({ ...progress, copied: 900_000 }, 764_000)).toBe(99);
    expect(copyPercent(progress, null)).toBeNull();
    expect(copyPercent(null, 764_000)).toBeNull();
  });
});

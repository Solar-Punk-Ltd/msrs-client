import { describe, expect, it } from 'vitest';

import type { BatchInfo } from '@/utils/network/uploaderService';

import { archivedShare, diluteAdvice, fitsInBatch, formatBytes, formatDays } from './archiveSizing';

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
  it('accepts a stream that fits with headroom', () => {
    expect(fitsInBatch(3e9, batch)).toBe(true);
    expect(diluteAdvice(3e9, batch)).toBeNull();
  });

  it('asks for a deeper batch when the selection does not fit', () => {
    const advice = diluteAdvice(30e9, batch);
    expect(advice).not.toBeNull();
    expect(advice!.depth).toBeGreaterThan(batch.depth);
    expect(advice!.steps).toBe(advice!.depth - batch.depth);
  });

  it('formats sizes and days for people', () => {
    expect(formatBytes(19_498_796)).toBe('19.5 MB');
    expect(formatBytes(3.03e9)).toBe('3.03 GB');
    expect(formatDays(29.9 * 86_400)).toBe('29 days');
    expect(formatDays(1.8 * 86_400)).toBe('1.8 days');
  });

  it('reports how much of a stream is archived', () => {
    expect(archivedShare(5257, 5257)).toBe(1);
    expect(archivedShare(0, 4814)).toBe(0);
    expect(archivedShare(10, undefined)).toBeNull();
  });
});

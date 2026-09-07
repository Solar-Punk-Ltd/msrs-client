import { describe, expect, it } from 'vitest';

import type { UploaderJob } from '@/utils/network/uploaderService';

import { describeJob } from './JobsPanel';

const job = (over: Partial<UploaderJob>): UploaderJob => ({
  id: 'j',
  type: 'restamp',
  status: 'done',
  title: 'X',
  topic: 't',
  createdAt: 0,
  startedAt: 0,
  finishedAt: 0,
  durationMs: 18 * 60_000,
  phase: null,
  progress: null,
  expectedChunks: null,
  error: null,
  result: null,
  ...over,
});

describe('describeJob', () => {
  it('describes a running archive with its percentage', () => {
    const j = job({
      status: 'running',
      phase: 'media',
      expectedChunks: 764000,
      progress: { copied: 480000, skipped: 0, bytes: 2e9, parity: 0, failed: 0, segments: 0, chatUpdates: 0 },
    });
    expect(describeJob(j)).toBe('media · 63% · 480,000 of ~764,000 chunks · 2.00 GB');
  });

  it('describes a finished archive with time, chunks and bytes', () => {
    const j = job({
      result: {
        copied: 764002,
        skipped: 0,
        bytes: 3.1e9,
        parity: 62398,
        failed: 0,
        segments: 1596,
        chatUpdates: 9,
        alreadyArchived: false,
      },
    });
    expect(describeJob(j)).toBe('done in 18m 0s · 764,002 chunks (62,398 parity) · 3.10 GB');
  });

  it('says plainly when there was nothing to copy', () => {
    const j = job({
      result: {
        copied: 0,
        skipped: 5258,
        bytes: 0,
        parity: 430,
        failed: 0,
        segments: 14,
        chatUpdates: 0,
        alreadyArchived: true,
      },
    });
    expect(describeJob(j)).toBe('already on the stamp (5,258 chunks), nothing to copy');
  });

  it('describes restores end to end', () => {
    expect(describeJob(job({ type: 'restore', status: 'running', phase: 'confirming' }))).toBe(
      'sent, waiting for the list to show it',
    );
    expect(
      describeJob(
        job({ type: 'restore', result: { sent: true, listed: true, external: true, watchPath: '/watch/video/o/t' } }),
      ),
    ).toBe('back on the list as external');
    expect(
      describeJob(
        job({ type: 'restore', result: { sent: true, listed: false, external: true, watchPath: '/watch/video/o/t' } }),
      ),
    ).toBe('sent, but the list never showed it. Try again.');
    expect(describeJob(job({ status: 'failed', error: 'boom' }))).toBe('boom');
    expect(describeJob(job({ status: 'queued' }))).toBe('waiting for the previous job to finish');
  });
});

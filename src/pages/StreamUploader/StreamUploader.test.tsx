import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StreamUploader } from './StreamUploader';

vi.mock('@/providers/User', () => ({
  useUserContext: () => ({ session: { serverKeys: { nginx: 'token' } } }),
}));

vi.mock('@/hooks/useStreamUploader', () => ({
  useStreamUploader: () => ({
    streams: [
      {
        owner: '6F27',
        topic: 'b347b89b',
        title: 'Viktor Trón and Mina Spiler at Zk Av Club',
        state: 'vod',
        index: 1704,
        scheduledStartTime: '2026-06-17T13:38:00.000Z',
        listed: false,
        size: { segments: 1596, bytes: 3.03e9, chunks: 747784 },
        chunksOnBatch: 747784,
      },
      {
        owner: '6F27',
        topic: 'b882a334',
        title: 'Swarm Community Call — August 2026',
        state: 'vod',
        listed: true,
        size: null,
        chunksOnBatch: 0,
      },
    ],
    batches: {
      archive: {
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
      },
      chat: null,
    },
    jobs: [
      {
        id: 'j1',
        type: 'restamp',
        status: 'done',
        title: 'Berlin June 15 2026',
        topic: '491b',
        createdAt: 1,
        startedAt: 1,
        finishedAt: 2,
        progress: { copied: 1, skipped: 5257, bytes: 360, parity: 430, failed: 0, segments: 14, chatUpdates: 0 },
        events: [{ at: 1, type: 'phase', phase: 'chat' }],
        error: null,
        result: null,
      },
    ],
    isLoading: false,
    error: null,
    measure: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('StreamUploader', () => {
  it('shows the archive stamp, the sources and the jobs', () => {
    render(<StreamUploader />);

    expect(screen.getByText('Archive stamp')).toBeInTheDocument();
    expect(screen.getByText('Viktor Trón and Mina Spiler at Zk Av Club')).toBeInTheDocument();
    expect(screen.getByText('evicted')).toBeInTheDocument();
    expect(screen.getByText('complete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Measure' })).toBeInTheDocument();
    expect(screen.getByText('Berlin June 15 2026')).toBeInTheDocument();
  });
});

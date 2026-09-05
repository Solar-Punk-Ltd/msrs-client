import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UploaderJob, UploaderStream } from '@/utils/network/uploaderService';

import { StreamUploader } from './StreamUploader';

vi.mock('@/providers/User', () => ({
  useUserContext: () => ({ session: { serverKeys: { nginx: 'token' } } }),
}));

const streams: UploaderStream[] = [
  {
    owner: '6F27',
    topic: 'b347b89b',
    title: 'Viktor Trón and Mina Spiler at Zk Av Club',
    state: 'vod',
    index: 1704,
    scheduledStartTime: '2026-06-17T13:38:00.000Z',
    listed: false,
    size: { segments: 1596, bytes: 3.03e9, chunks: 747784 },
    sizeState: 'measured',
    chunksOnBatch: 764002,
    archived: 'complete',
    activeJob: null,
  },
  {
    owner: '6F27',
    topic: 'b882a334',
    title: 'Swarm Community Call — August 2026',
    state: 'vod',
    listed: true,
    size: null,
    sizeState: 'measuring',
    chunksOnBatch: 0,
    archived: 'none',
    activeJob: null,
  },
];

const jobs: UploaderJob[] = [
  {
    id: 'j1',
    type: 'restamp',
    status: 'done',
    title: 'Berlin June 15 2026',
    topic: '491b',
    createdAt: 1,
    startedAt: 1,
    finishedAt: 3000,
    durationMs: 2999,
    phase: 'chat',
    progress: null,
    expectedChunks: null,
    error: null,
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
  },
];

vi.mock('@/hooks/useStreamUploader', () => ({
  useStreamUploader: () => ({
    streams,
    jobs,
    batches: {
      archive: {
        batchId: 'a'.repeat(64),
        label: 'archive',
        depth: 23,
        immutable: true,
        usable: true,
        utilization: 80,
        ttlSeconds: 29.9 * 86_400,
        chunksStamped: 2_815_421,
        bytesStamped: 2_815_421 * 4096,
        effectiveBytes: 18.2e9,
        freeBytes: 18.2e9 - 2_815_421 * 4096,
      },
      chat: null,
      chatError: 'not a batch id',
    },
    isLoading: false,
    error: null,
    notice: null,
    pending: new Set<string>(),
    archive: vi.fn(),
    restore: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('StreamUploader', () => {
  it('shows the stamps, the sources with their status, and the jobs', () => {
    render(
      <MemoryRouter>
        <StreamUploader />
      </MemoryRouter>,
    );

    expect(screen.getByText('Archive stamp')).toBeInTheDocument();
    expect(screen.getByText('not a batch id')).toBeInTheDocument();
    expect(screen.getByText('Viktor Trón and Mina Spiler at Zk Av Club')).toBeInTheDocument();
    expect(screen.getByText('evicted')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('Not archived')).toBeInTheDocument();
    expect(screen.getByText('measuring…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(1);
    expect(screen.getByText('already on the stamp (5,258 chunks), nothing to copy')).toBeInTheDocument();
  });
});

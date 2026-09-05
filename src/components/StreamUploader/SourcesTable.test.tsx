import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BatchInfo, UploaderStream } from '@/utils/network/uploaderService';

import { rowStatus, SourcesTable } from './SourcesTable';

const batch: BatchInfo = {
  batchId: 'a'.repeat(64),
  label: 'archive',
  depth: 23,
  immutable: true,
  usable: true,
  utilization: 80,
  ttlSeconds: 29 * 86_400,
  chunksStamped: 0,
  bytesStamped: 0,
  effectiveBytes: 18.2e9,
  freeBytes: 1e9,
};

const base: UploaderStream = {
  owner: '6F27',
  topic: 't1',
  title: 'DappCon',
  state: 'vod',
  index: 150,
  listed: false,
  size: { segments: 149, bytes: 0.28e9, chunks: 68353 },
  sizeState: 'measured',
  chunksOnBatch: 0,
  archived: 'none',
  activeJob: null,
};

describe('SourcesTable statuses', () => {
  it('names each state a row can be in', () => {
    expect(rowStatus(base, false).label).toBe('Not archived');
    expect(rowStatus({ ...base, archived: 'complete', chunksOnBatch: 70000 }, false).label).toBe('Archived');
    expect(rowStatus({ ...base, archived: 'partial', chunksOnBatch: 1200 }, false).label).toBe(
      'Partly archived · 1,200 chunks',
    );
    expect(rowStatus(base, true).label).toBe('Queued…');
    const running = {
      id: 'j',
      type: 'restamp' as const,
      status: 'running' as const,
      phase: 'media',
      expectedChunks: 74000,
      progress: { copied: 37000, skipped: 0, bytes: 1, parity: 0, failed: 0, segments: 149, chatUpdates: 0 },
    };
    expect(rowStatus({ ...base, activeJob: running }, false).label).toBe('Archiving 50%');
    expect(rowStatus({ ...base, activeJob: { ...running, type: 'restore', phase: 'confirming' } }, false).label).toBe(
      'Restoring, waiting for the list',
    );
  });
});

describe('SourcesTable actions', () => {
  it('hides Archive once complete, offers Restore only for evicted rows', () => {
    render(
      <SourcesTable
        streams={[
          { ...base, archived: 'complete' },
          { ...base, topic: 't2', title: 'Listed one', listed: true },
        ]}
        archiveBatch={batch}
        pending={new Set()}
        restoreAsExternal
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Restore' })).toHaveLength(1);
  });

  it('asks before restoring and then restores', () => {
    const onRestore = vi.fn();
    render(
      <SourcesTable
        streams={[base]}
        archiveBatch={batch}
        pending={new Set()}
        restoreAsExternal
        onArchive={vi.fn()}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByText('Restore to the list')).toBeInTheDocument();
    expect(onRestore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Restore now' }));
    expect(onRestore).toHaveBeenCalledWith('t1');
  });

  it('blocks Archive when the stream does not fit the stamp and says why', () => {
    render(
      <SourcesTable
        streams={[{ ...base, size: { segments: 900, bytes: 3e9, chunks: 700000 } }]}
        archiveBatch={batch}
        pending={new Set()}
        restoreAsExternal
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: 'Archive' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringContaining('Dilute the archive stamp first'));
  });

  it('shows no buttons while a job is working on the row', () => {
    render(
      <SourcesTable
        streams={[base]}
        archiveBatch={batch}
        pending={new Set(['t1'])}
        restoreAsExternal
        onArchive={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.getByText('Queued…')).toBeInTheDocument();
  });
});

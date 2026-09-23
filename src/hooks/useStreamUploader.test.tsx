import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStreamUploader } from './useStreamUploader';

const { service } = vi.hoisted(() => ({
  service: {
    streams: vi.fn(),
    batch: vi.fn(),
    jobs: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    moveToArchivePart: vi.fn(),
  },
}));

vi.mock('@/utils/network/uploaderService', () => ({ uploaderService: service }));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const job = { id: 'j1', type: 'restamp', status: 'queued', title: 'Berlin', topic: 't1' } as never;
const stream = (topic: string, activeJob: unknown = null) =>
  ({ owner: 'o', topic, title: topic, listed: true, archived: 'none', activeJob } as never);

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useStreamUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.batch.mockResolvedValue(null);
    service.jobs.mockResolvedValue([]);
    service.archive.mockResolvedValue(job);
  });

  it('asks the service to move a recording into the archive part and says so', async () => {
    service.streams.mockResolvedValue([stream('t1')]);
    service.moveToArchivePart.mockResolvedValue({ ...(job as object), type: 'move' });
    const { result } = renderHook(() => useStreamUploader('secret'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.moveToArchivePart('t1');
    });

    expect(service.moveToArchivePart).toHaveBeenCalledWith('secret', 't1');
    expect(result.current.notice).toBe('Move to the archive part queued for Berlin');
  });

  it('shows an error that every call repeats only once', async () => {
    const noService = new Error('this instance has no uploader service');
    service.streams.mockRejectedValue(noService);
    service.batch.mockRejectedValue(noService);
    service.jobs.mockRejectedValue(noService);

    const { result } = renderHook(() => useStreamUploader('secret'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('this instance has no uploader service');
  });

  it('keeps a clicked stream pending until a refresh started after the click reports on it', async () => {
    service.streams.mockResolvedValue([stream('t1')]);
    const { result } = renderHook(() => useStreamUploader('secret'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const afterClick = deferred<unknown[]>();
    service.streams.mockReturnValueOnce(afterClick.promise);

    let clicked!: Promise<void>;
    act(() => {
      clicked = result.current.archive('t1');
    });
    await settle();
    expect(result.current.pending.has('t1')).toBe(true);
    expect(result.current.notice).toContain('Archive queued');

    afterClick.resolve([stream('t1', { id: 'j1', type: 'restamp', status: 'queued' })]);
    await act(async () => {
      await clicked;
    });
    expect(result.current.pending.has('t1')).toBe(false);
    expect((result.current.streams[0] as { activeJob: unknown }).activeJob).toBeTruthy();
  });

  it('does not let a refresh that started before the click clear the pending mark', async () => {
    service.streams.mockResolvedValue([stream('t1')]);
    const { result } = renderHook(() => useStreamUploader('secret'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const stale = deferred<unknown[]>();
    service.streams.mockReturnValueOnce(stale.promise);
    let earlyRefresh!: Promise<void>;
    act(() => {
      earlyRefresh = result.current.refresh();
    });

    let clicked!: Promise<void>;
    act(() => {
      clicked = result.current.archive('t1');
    });
    await settle();
    expect(result.current.pending.has('t1')).toBe(true);

    const fresh = deferred<unknown[]>();
    service.streams.mockReturnValueOnce(fresh.promise);
    stale.resolve([stream('t1')]);
    await act(async () => {
      await earlyRefresh;
    });
    expect(result.current.pending.has('t1')).toBe(true);

    fresh.resolve([stream('t1', { id: 'j1', type: 'restamp', status: 'running' })]);
    await act(async () => {
      await clicked;
    });
    expect(result.current.pending.has('t1')).toBe(false);
  });

  it('runs one refresh at a time', async () => {
    service.streams.mockResolvedValue([]);
    const { result } = renderHook(() => useStreamUploader('secret'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const calls = service.streams.mock.calls.length;

    const slow = deferred<unknown[]>();
    service.streams.mockReturnValueOnce(slow.promise);
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.refresh();
      second = result.current.refresh();
    });
    expect(service.streams.mock.calls.length).toBe(calls + 1);

    slow.resolve([]);
    await act(async () => {
      await Promise.all([first, second]);
    });
  });
});

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type BatchOverview,
  type UploaderJob,
  uploaderService,
  type UploaderStream,
} from '@/utils/network/uploaderService';

const JOB_POLL_MS = 2000;
const NOTICE_MS = 6000;

export interface StreamUploaderState {
  streams: UploaderStream[];
  batches: BatchOverview | null;
  jobs: UploaderJob[];
  isLoading: boolean;
  error: string | null;
  /** One-line feedback on the last action, cleared on its own. */
  notice: string | null;
  /** Streams whose action was clicked and not yet reflected by the service. */
  pending: Set<string>;
  archive: (topic: string) => Promise<void>;
  restore: (topic: string, external: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const isActive = (job: UploaderJob) => job.status === 'queued' || job.status === 'running';
const describeError = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'Could not reach the uploader service';

/** Talks to the uploader job service: sources, batch capacity, and the jobs that move streams onto it. */
export function useStreamUploader(adminSecret: string | undefined): StreamUploaderState {
  const [streams, setStreams] = useState<UploaderStream[]>([]);
  const [batches, setBatches] = useState<BatchOverview | null>(null);
  const [jobs, setJobs] = useState<UploaderJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!adminSecret) return;
    // Each call stands on its own: a failing batch lookup must not hide the sources or the jobs.
    const [streamsResult, batchesResult, jobsResult] = await Promise.allSettled([
      uploaderService.streams(adminSecret),
      uploaderService.batch(adminSecret),
      uploaderService.jobs(adminSecret),
    ]);
    if (streamsResult.status === 'fulfilled') setStreams(streamsResult.value);
    if (batchesResult.status === 'fulfilled') setBatches(batchesResult.value);
    if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value);
    const failures = [streamsResult, batchesResult, jobsResult].filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    setError(failures.length ? failures.map((f) => describeError(f.reason)).join(' · ') : null);
    setPending(new Set());
    setIsLoading(false);
  }, [adminSecret]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasActiveJobs = useMemo(() => jobs.some(isActive), [jobs]);
  const anyMeasuring = useMemo(
    () => streams.some((s) => s.sizeState === 'measuring' || s.sizeState === 'pending'),
    [streams],
  );

  useEffect(() => {
    if (!adminSecret || (!hasActiveJobs && !anyMeasuring)) return;
    const id = setInterval(() => void refresh(), JOB_POLL_MS);
    return () => clearInterval(id);
  }, [adminSecret, hasActiveJobs, anyMeasuring, refresh]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const start = useCallback(
    async (topic: string, verb: string, action: (secret: string) => Promise<UploaderJob>) => {
      if (!adminSecret) return;
      setPending((prev) => new Set(prev).add(topic));
      try {
        const job = await action(adminSecret);
        setNotice(
          job.deduplicated
            ? `${verb} is already running for ${job.title?.trim()}`
            : `${verb} queued for ${job.title?.trim()}`,
        );
        setError(null);
      } catch (err) {
        setError(describeError(err));
      }
      await refresh();
    },
    [adminSecret, refresh],
  );

  return {
    streams,
    batches,
    jobs,
    isLoading,
    error,
    notice,
    pending,
    refresh,
    archive: (topic) => start(topic, 'Archive', (secret) => uploaderService.archive(secret, topic)),
    restore: (topic, external) => start(topic, 'Restore', (secret) => uploaderService.restore(secret, topic, external)),
  };
}

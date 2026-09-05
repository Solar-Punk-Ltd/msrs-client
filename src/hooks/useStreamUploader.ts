import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type BatchOverview,
  type UploaderJob,
  uploaderService,
  type UploaderStream,
} from '@/utils/network/uploaderService';

const JOB_POLL_MS = 3000;

export interface StreamUploaderState {
  streams: UploaderStream[];
  batches: BatchOverview | null;
  jobs: UploaderJob[];
  isLoading: boolean;
  error: string | null;
  measure: (topic: string) => Promise<void>;
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
    setIsLoading(false);
  }, [adminSecret]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasActiveJobs = useMemo(() => jobs.some(isActive), [jobs]);

  useEffect(() => {
    if (!adminSecret || !hasActiveJobs) return;
    const id = setInterval(async () => {
      try {
        const nextJobs = await uploaderService.jobs(adminSecret);
        setJobs(nextJobs);
        if (!nextJobs.some(isActive)) void refresh();
      } catch (err) {
        setError(describeError(err));
      }
    }, JOB_POLL_MS);
    return () => clearInterval(id);
  }, [adminSecret, hasActiveJobs, refresh]);

  const withService = useCallback(
    async (action: (secret: string) => Promise<unknown>) => {
      if (!adminSecret) return;
      try {
        await action(adminSecret);
        setError(null);
        await refresh();
      } catch (err) {
        setError(describeError(err));
      }
    },
    [adminSecret, refresh],
  );

  return {
    streams,
    batches,
    jobs,
    isLoading,
    error,
    refresh,
    measure: (topic) => withService((secret) => uploaderService.measure(secret, topic)),
    archive: (topic) => withService((secret) => uploaderService.archive(secret, topic)),
    restore: (topic, external) => withService((secret) => uploaderService.restore(secret, topic, external)),
  };
}

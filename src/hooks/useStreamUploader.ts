import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  // A refresh takes the service several seconds (it looks the feed up), so refreshes started later can
  // finish earlier. Every refresh gets a ticket; only the newest one is allowed to update the page, and
  // a click marks its stream pending with the ticket of the refresh that will first reflect it.
  const refreshTicket = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const pendingSince = useRef(new Map<string, number>());

  const refresh = useCallback(async () => {
    if (!adminSecret) return;
    if (inFlight.current) return inFlight.current;
    const ticket = ++refreshTicket.current;
    const run = (async () => {
      // Each call stands on its own: a failing batch lookup must not hide the sources or the jobs.
      const [streamsResult, batchesResult, jobsResult] = await Promise.allSettled([
        uploaderService.streams(adminSecret),
        uploaderService.batch(adminSecret),
        uploaderService.jobs(adminSecret),
      ]);
      if (ticket !== refreshTicket.current) return;
      if (streamsResult.status === 'fulfilled') setStreams(streamsResult.value);
      if (batchesResult.status === 'fulfilled') setBatches(batchesResult.value);
      if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value);
      const failures = [streamsResult, batchesResult, jobsResult].filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      setError(failures.length ? failures.map((f) => describeError(f.reason)).join(' · ') : null);
      if (streamsResult.status === 'fulfilled') {
        // A stream stops being pending once a refresh started after its click has reported on it.
        for (const [topic, since] of pendingSince.current) {
          if (since < ticket) pendingSince.current.delete(topic);
        }
        setPending(new Set(pendingSince.current.keys()));
      }
      setIsLoading(false);
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      if (inFlight.current === run) inFlight.current = null;
    }
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
    // Poll again only after the previous poll came back, so slow answers never pile up.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await refresh();
      if (!cancelled) timer = setTimeout(() => void tick(), JOB_POLL_MS);
    };
    timer = setTimeout(() => void tick(), JOB_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [adminSecret, hasActiveJobs, anyMeasuring, refresh]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const start = useCallback(
    async (topic: string, verb: string, action: (secret: string) => Promise<UploaderJob>) => {
      if (!adminSecret) return;
      // Pending until a refresh that starts after this click has come back.
      pendingSince.current.set(topic, refreshTicket.current);
      setPending(new Set(pendingSince.current.keys()));
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
        pendingSince.current.delete(topic);
        setPending(new Set(pendingSince.current.keys()));
      }
      // Wait for any refresh already running, then run one that postdates the click.
      await inFlight.current;
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

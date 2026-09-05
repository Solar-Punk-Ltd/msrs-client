import { config } from '@/utils/shared/config';
import { createNodeHeaders } from '@/utils/stream/node';

export type SizeState = 'measured' | 'measuring' | 'pending' | 'unavailable';
export type ArchivedState = 'complete' | 'partial' | 'none';
export type UploaderJobType = 'restamp' | 'restore';
export type UploaderJobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface StreamSize {
  segments: number;
  bytes: number;
  chunks: number;
}

export interface JobProgress {
  copied: number;
  skipped: number;
  bytes: number;
  parity: number;
  failed: number;
  segments: number;
  chatUpdates: number;
}

/** What a row needs to know about the job currently working on it. */
export interface ActiveJob {
  id: string;
  type: UploaderJobType;
  status: UploaderJobStatus;
  phase: string | null;
  progress: JobProgress | null;
  expectedChunks: number | null;
}

/** A stream as the uploader service reports it: the list record plus what the archive knows about it. */
export interface UploaderStream {
  owner: string;
  topic: string;
  title: string;
  state: string;
  mediaType?: string;
  index?: number;
  duration?: number;
  scheduledStartTime?: string | null;
  createdAt?: number;
  isExternal?: boolean;
  thumbnail?: string;
  /** Present on the aggregator's list right now, as opposed to a saved record of an evicted stream. */
  listed: boolean;
  size: StreamSize | null;
  sizeState: SizeState;
  /** Chunks the service has already copied onto the archive batch for this stream. */
  chunksOnBatch: number;
  archived: ArchivedState;
  activeJob: ActiveJob | null;
}

export interface BatchInfo {
  batchId: string;
  label: string;
  depth: number;
  immutable: boolean;
  usable: boolean;
  utilization: number;
  ttlSeconds: number;
  chunksStamped: number;
  bytesStamped: number;
  effectiveBytes: number;
  freeBytes: number;
}

export interface BatchOverview {
  archive: BatchInfo;
  chat: BatchInfo | null;
  chatError?: string | null;
}

export interface ArchiveResult extends JobProgress {
  alreadyArchived: boolean;
}

export interface RestoreResult {
  sent: boolean;
  listed: boolean;
  external: boolean;
  watchPath: string;
  reason?: string;
}

export interface UploaderJob {
  id: string;
  type: UploaderJobType;
  status: UploaderJobStatus;
  title?: string;
  topic?: string;
  owner?: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  durationMs: number | null;
  phase: string | null;
  progress: JobProgress | null;
  expectedChunks: number | null;
  error: string | null;
  result: ArchiveResult | RestoreResult | null;
  /** Set on the answer to a job request that matched a job already running for that stream. */
  deduplicated?: boolean;
}

const SERVICE_PATH = '/admin/uploader';

async function request<T>(adminSecret: string, path: string, init?: RequestInit): Promise<T> {
  const origin = new URL(config.readerBeeUrl).origin;
  const response = await fetch(`${origin}${SERVICE_PATH}${path}`, {
    ...init,
    headers: { ...createNodeHeaders(adminSecret), ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Uploader service answered ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const uploaderService = {
  streams: (adminSecret: string) => request<UploaderStream[]>(adminSecret, '/streams'),
  batch: (adminSecret: string) => request<BatchOverview>(adminSecret, '/batch'),
  jobs: (adminSecret: string) => request<UploaderJob[]>(adminSecret, '/jobs'),
  archive: (adminSecret: string, topic: string) =>
    request<UploaderJob>(adminSecret, '/jobs', { method: 'POST', body: JSON.stringify({ type: 'restamp', topic }) }),
  restore: (adminSecret: string, topic: string, external: boolean) =>
    request<UploaderJob>(adminSecret, '/jobs', {
      method: 'POST',
      body: JSON.stringify({ type: 'restore', topic, external }),
    }),
};

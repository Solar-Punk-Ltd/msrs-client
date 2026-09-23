import { Link } from 'react-router-dom';

import type {
  ArchivePartOutcome,
  ArchiveResult,
  MoveResult,
  RestoreResult,
  UploaderJob,
  UploaderJobType,
} from '@/utils/network/uploaderService';
import { copyPercent, formatBytes, formatCount, formatDuration } from '@/utils/stamp/archiveSizing';

import './JobsPanel.scss';

interface JobsPanelProps {
  jobs: UploaderJob[];
}

const MAX_SHOWN = 12;

const JOB_LABELS: Record<UploaderJobType, string> = { restamp: 'Archive', move: 'Move', restore: 'Restore' };

type JobResult = ArchiveResult | MoveResult | RestoreResult;
const isRestoreResult = (r: JobResult): r is RestoreResult => 'watchPath' in r;
const isArchiveResult = (r: JobResult): r is ArchiveResult => 'copied' in r;
const isMoveResult = (r: JobResult): r is MoveResult => 'archivePart' in r && !isArchiveResult(r);

function describeArchivePart(outcome: ArchivePartOutcome): string {
  if (outcome.moved) return 'moved into the archive part';
  if (outcome.alreadyThere) return 'already in the archive part';
  return `stays in its place: ${outcome.reason ?? 'no reason given'}`;
}

export function describeJob(job: UploaderJob): string {
  if (job.status === 'failed') return job.error ?? 'failed';
  if (job.status === 'queued') return 'waiting for the previous job to finish';

  if (job.type === 'restore') {
    if (job.status === 'running')
      return job.phase === 'confirming' ? 'sent, waiting for the list to show it' : 'sending the entry to the list';
    const r = job.result;
    if (!r || !isRestoreResult(r)) return 'done';
    if (r.listed) return `back on the list${r.external ? ' as external' : ''}`;
    return r.sent ? 'sent, but the list never showed it. Try again.' : `not sent: ${r.reason ?? 'unknown reason'}`;
  }

  if (job.type === 'move') {
    if (job.status === 'running')
      return job.phase === 'confirming'
        ? 'sent, waiting for the list to show it in the archive part'
        : 'sending the move to the list';
    const r = job.result;
    return r && isMoveResult(r) ? describeArchivePart(r.archivePart) : 'done';
  }

  if (job.status === 'running') {
    if (job.phase === 'moving' || job.phase === 'confirming') return 'copied, moving it into the archive part';
    const p = job.progress;
    if (!p) return `${job.phase ?? 'starting'}…`;
    const percent = copyPercent(p, job.expectedChunks);
    const of = job.expectedChunks ? ` of ~${formatCount(job.expectedChunks)}` : '';
    return `${job.phase ?? 'copying'}${percent === null ? '' : ` · ${percent}%`} · ${formatCount(
      p.copied + p.skipped,
    )}${of} chunks · ${formatBytes(p.bytes)}`;
  }

  const r = job.result;
  if (!r || !isArchiveResult(r)) return 'done';
  const where = r.archivePart ? ` · ${describeArchivePart(r.archivePart)}` : '';
  // Read from the counts, because services before v1.0.9 flag a repeat run alreadyArchived even when chunks failed.
  const copiedNothingNew = r.copied === 0 && r.skipped > 0;
  if (copiedNothingNew && r.failed) {
    return `nothing new copied, ${formatCount(r.failed)} ${r.failed === 1 ? 'chunk' : 'chunks'} still failing${where}`;
  }
  if (copiedNothingNew) return `already on the stamp (${formatCount(r.skipped)} chunks), nothing to copy${where}`;
  const took = job.durationMs !== null ? `done in ${formatDuration(job.durationMs)} · ` : '';
  const rebuilt = r.rebuilt ? ` · ${formatCount(r.rebuilt)} lost ${r.rebuilt === 1 ? 'chunk' : 'chunks'} rebuilt` : '';
  return `${took}${formatCount(r.copied)} chunks (${formatCount(r.parity)} parity) · ${formatBytes(r.bytes)}${rebuilt}${
    r.failed ? ` · ${r.failed} failed` : ''
  }${where}`;
}

export function JobsPanel({ jobs }: JobsPanelProps) {
  if (jobs.length === 0) return null;
  const recent = [...jobs].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SHOWN);

  return (
    <section className="jobs-panel">
      <h3 className="jobs-panel-title">Jobs</h3>
      <ul className="jobs-panel-list">
        {recent.map((job) => {
          const percent =
            job.type === 'restamp' && job.status === 'running' ? copyPercent(job.progress, job.expectedChunks) : null;
          const restore = job.result && isRestoreResult(job.result) ? job.result : null;
          return (
            <li key={job.id} className={`jobs-panel-item jobs-panel-item--${job.status}`}>
              <span className="jobs-panel-type">{JOB_LABELS[job.type]}</span>
              <span className="jobs-panel-name">{job.title?.trim()}</span>
              <span className="jobs-panel-status">{job.status}</span>
              <span className="jobs-panel-detail">
                {describeJob(job)}
                {restore?.listed && (
                  <>
                    {' · '}
                    <Link to={restore.watchPath} className="jobs-panel-link">
                      Open
                    </Link>
                  </>
                )}
              </span>
              {percent !== null && (
                <div
                  className="jobs-panel-bar"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="jobs-panel-bar-fill" style={{ width: `${percent}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

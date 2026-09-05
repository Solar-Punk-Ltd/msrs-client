import { Link } from 'react-router-dom';

import type { ArchiveResult, RestoreResult, UploaderJob } from '@/utils/network/uploaderService';
import { copyPercent, formatBytes, formatCount, formatDuration } from '@/utils/stamp/archiveSizing';

import './JobsPanel.scss';

interface JobsPanelProps {
  jobs: UploaderJob[];
}

const MAX_SHOWN = 12;

const isRestoreResult = (r: ArchiveResult | RestoreResult): r is RestoreResult => 'watchPath' in r;

export function describeJob(job: UploaderJob): string {
  if (job.status === 'failed') return job.error ?? 'failed';
  if (job.status === 'queued') return 'waiting for the previous job to finish';

  if (job.type === 'restore') {
    if (job.status === 'running')
      return job.phase === 'confirming' ? 'sent, waiting for the list to show it' : 'sending the entry to the list';
    const r = job.result;
    if (!r || !isRestoreResult(r)) return 'done';
    if (r.listed) return `back on the list${r.external ? ' as external' : ''}`;
    return r.sent ? 'sent, not on the list yet, check again in a minute' : `not sent: ${r.reason ?? 'unknown reason'}`;
  }

  if (job.status === 'running') {
    const p = job.progress;
    if (!p) return `${job.phase ?? 'starting'}…`;
    const percent = copyPercent(p, job.expectedChunks);
    const of = job.expectedChunks ? ` of ~${formatCount(job.expectedChunks)}` : '';
    return `${job.phase ?? 'copying'}${percent === null ? '' : ` · ${percent}%`} · ${formatCount(
      p.copied + p.skipped,
    )}${of} chunks · ${formatBytes(p.bytes)}`;
  }

  const r = job.result;
  if (!r || isRestoreResult(r)) return 'done';
  if (r.alreadyArchived) return `already on the stamp (${formatCount(r.skipped)} chunks), nothing to copy`;
  const took = job.durationMs !== null ? `done in ${formatDuration(job.durationMs)} · ` : '';
  return `${took}${formatCount(r.copied)} chunks (${formatCount(r.parity)} parity) · ${formatBytes(r.bytes)}${
    r.failed ? ` · ${r.failed} failed` : ''
  }`;
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
              <span className="jobs-panel-type">{job.type === 'restamp' ? 'Archive' : 'Restore'}</span>
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

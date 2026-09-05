import type { UploaderJob } from '@/utils/network/uploaderService';
import { formatBytes } from '@/utils/stamp/archiveSizing';

import './JobsPanel.scss';

interface JobsPanelProps {
  jobs: UploaderJob[];
}

function currentPhase(job: UploaderJob): string | null {
  const phases = job.events.filter((e) => e.type === 'phase');
  return phases.length ? phases[phases.length - 1].phase ?? null : null;
}

function describe(job: UploaderJob): string {
  if (job.status === 'failed') return job.error ?? 'failed';
  if (job.type === 'restore') return job.status === 'done' ? 'entry sent to the list' : 'sending entry to the list';
  const p = job.progress;
  if (!p) return job.status === 'queued' ? 'waiting' : 'starting';
  const phase = currentPhase(job);
  return `${phase ? `${phase}: ` : ''}${p.copied} copied, ${p.skipped} already there, ${formatBytes(p.bytes)}${
    p.failed ? `, ${p.failed} failed` : ''
  }`;
}

export function JobsPanel({ jobs }: JobsPanelProps) {
  if (jobs.length === 0) return null;
  const recent = [...jobs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);

  return (
    <section className="jobs-panel">
      <h3 className="jobs-panel-title">Jobs</h3>
      <ul className="jobs-panel-list">
        {recent.map((job) => (
          <li key={job.id} className={`jobs-panel-item jobs-panel-item--${job.status}`}>
            <span className="jobs-panel-type">{job.type === 'restamp' ? 'Archive' : 'Restore'}</span>
            <span className="jobs-panel-name">{job.title?.trim()}</span>
            <span className="jobs-panel-status">{job.status}</span>
            <span className="jobs-panel-detail">{describe(job)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

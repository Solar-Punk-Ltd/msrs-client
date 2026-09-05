import type { BatchInfo } from '@/utils/network/uploaderService';
import { formatBytes, formatDays } from '@/utils/stamp/archiveSizing';

import './BatchCard.scss';

interface BatchCardProps {
  title: string;
  batch: BatchInfo | null;
  /** Shown instead of the facts when the batch could not be read. */
  note?: string | null;
}

export function BatchCard({ title, batch, note = null }: BatchCardProps) {
  if (!batch) {
    return (
      <section className="batch-card">
        <header className="batch-card-header">
          <h3 className="batch-card-title">{title}</h3>
        </header>
        <p className="batch-card-note">{note ?? 'Not configured.'}</p>
      </section>
    );
  }

  const usedShare = Math.min(1, batch.bytesStamped / batch.effectiveBytes);

  return (
    <section className="batch-card">
      <header className="batch-card-header">
        <h3 className="batch-card-title">{title}</h3>
        <span className="batch-card-id">{batch.batchId.slice(0, 8)}…</span>
      </header>
      <dl className="batch-card-facts">
        <dt>Depth</dt>
        <dd>
          {batch.depth}
          {batch.immutable && <span className="batch-card-tag">immutable</span>}
        </dd>
        <dt>Used</dt>
        <dd>
          {formatBytes(batch.bytesStamped)} of {formatBytes(batch.effectiveBytes)}
        </dd>
        <dt>Free</dt>
        <dd>{formatBytes(batch.freeBytes)}</dd>
        <dt>Time left</dt>
        <dd>{formatDays(batch.ttlSeconds)}</dd>
      </dl>
      <div
        className="batch-card-meter"
        role="progressbar"
        aria-label={`${title} used`}
        aria-valuenow={Math.round(usedShare * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="batch-card-meter-fill" style={{ width: `${usedShare * 100}%` }} />
      </div>
    </section>
  );
}

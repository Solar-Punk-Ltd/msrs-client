import type { BatchInfo } from '@/utils/network/uploaderService';
import { type DiluteAdvice, formatBytes, formatDays } from '@/utils/stamp/archiveSizing';

import './BatchCard.scss';

interface BatchCardProps {
  title: string;
  batch: BatchInfo;
  /** Bytes the operator has selected to put on this batch, for the fit check. */
  selectedBytes?: number;
  advice?: DiluteAdvice | null;
}

export function BatchCard({ title, batch, selectedBytes = 0, advice = null }: BatchCardProps) {
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
        aria-valuenow={Math.round(usedShare * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="batch-card-meter-fill" style={{ width: `${usedShare * 100}%` }} />
      </div>
      {selectedBytes > 0 && (
        <p className={`batch-card-fit ${advice ? 'batch-card-fit--over' : ''}`}>
          Selected {formatBytes(selectedBytes)}.{' '}
          {advice
            ? `Does not fit. Dilute to depth ${advice.depth} first (${advice.steps} step${
                advice.steps > 1 ? 's' : ''
              }, each halves the days left), then top up.`
            : 'Fits.'}
        </p>
      )}
    </section>
  );
}

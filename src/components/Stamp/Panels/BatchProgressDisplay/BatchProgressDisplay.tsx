import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { type BatchTopUpResult, TOPUP_STATUS, type TopUpStatus } from '@/utils/network/stampTopup';
import { formatStampId } from '@/utils/ui/format';

import './BatchProgressDisplay.scss';

interface BatchProgressDisplayProps {
  status: TopUpStatus | null;
  currentStampId?: string;
  currentIndex?: number;
  totalStamps: number;
  result: BatchTopUpResult | null;
  error?: string;
}

export function BatchProgressDisplay({
  status,
  currentStampId,
  currentIndex,
  totalStamps,
  result,
  error,
}: BatchProgressDisplayProps) {
  if (!status) return null;

  const isProcessing = status === TOPUP_STATUS.APPROVING || status === TOPUP_STATUS.TOPUP;
  const isDone = status === TOPUP_STATUS.DONE;
  const isError = status === TOPUP_STATUS.ERROR;

  const progressPercent =
    totalStamps > 0 && currentIndex !== undefined ? Math.round(((currentIndex + 1) / totalStamps) * 100) : 0;

  return (
    <div className="batch-progress">
      <div className="batch-progress-status">
        {isProcessing && <CircleLoader size="small" />}
        <span className={`batch-progress-text ${isError ? 'batch-progress-text--error' : ''}`}>
          {status === TOPUP_STATUS.APPROVING && 'Approving BZZ...'}
          {status === TOPUP_STATUS.TOPUP &&
            currentStampId &&
            `Processing stamp ${(currentIndex ?? 0) + 1} of ${totalStamps}...`}
          {isDone && 'Done'}
          {isError && error}
        </span>
      </div>

      {(status === TOPUP_STATUS.TOPUP || isDone || isError) && totalStamps > 0 && (
        <div className="batch-progress-bar-container">
          <div className="batch-progress-bar" style={{ width: `${isDone ? 100 : progressPercent}%` }} />
        </div>
      )}

      {(isDone || isError) && result && (
        <div className="batch-progress-result">
          {result.successful.length > 0 && (
            <span className="batch-progress-success">{result.successful.length} stamps topped up successfully</span>
          )}
          {result.failed.length > 0 && (
            <div className="batch-progress-failures">
              <span className="batch-progress-fail-count">{result.failed.length} failed:</span>
              <ul className="batch-progress-fail-list">
                {result.failed.map((f) => (
                  <li key={f.stampId}>
                    {formatStampId(f.stampId)} &mdash; {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

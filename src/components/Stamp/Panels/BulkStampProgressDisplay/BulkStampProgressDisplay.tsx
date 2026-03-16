import { useState } from 'react';

import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { type BulkStampTopUpResult, TOPUP_STATUS, type TopUpStatus } from '@/utils/network/stampTopup';
import { formatStampId } from '@/utils/ui/format';

import './BulkStampProgressDisplay.scss';

interface BulkStampProgressDisplayProps {
  status: TopUpStatus | null;
  currentStampId?: string;
  currentIndex?: number;
  totalStamps: number;
  result: BulkStampTopUpResult | null;
  error?: string;
}

export function BulkStampProgressDisplay({
  status,
  currentStampId,
  currentIndex,
  totalStamps,
  result,
  error,
}: BulkStampProgressDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!status) return null;

  const isProcessing = status === TOPUP_STATUS.APPROVING || status === TOPUP_STATUS.TOPUP;
  const isDone = status === TOPUP_STATUS.DONE;
  const isError = status === TOPUP_STATUS.ERROR;

  const progressPercent =
    totalStamps > 0 && currentIndex !== undefined ? Math.round(((currentIndex + 1) / totalStamps) * 100) : 0;

  const handleReload = () => window.location.reload();

  return (
    <div className="bulk-stamp-progress">
      <div className="bulk-stamp-progress-status">
        {isProcessing && <CircleLoader size="small" />}
        <span className={`bulk-stamp-progress-text ${isError ? 'bulk-stamp-progress-text--error' : ''}`}>
          {status === TOPUP_STATUS.APPROVING && 'Approving BZZ...'}
          {status === TOPUP_STATUS.TOPUP &&
            currentStampId &&
            `Processing stamp ${(currentIndex ?? 0) + 1} of ${totalStamps}...`}
          {isDone && 'Done'}
          {isError && 'Top up failed. Please try again.'}
        </span>
      </div>

      {(status === TOPUP_STATUS.TOPUP || isDone || isError) && totalStamps > 0 && (
        <div className="bulk-stamp-progress-bar-container">
          <div className="bulk-stamp-progress-bar" style={{ width: `${isDone ? 100 : progressPercent}%` }} />
        </div>
      )}

      {(isDone || isError) && result && (
        <div className="bulk-stamp-progress-result">
          {result.successful.length > 0 && (
            <span className="bulk-stamp-progress-success">
              {result.successful.length} stamps topped up successfully
            </span>
          )}
          {result.failed.length > 0 && (
            <div className="bulk-stamp-progress-failures">
              <span className="bulk-stamp-progress-fail-count">{result.failed.length} failed</span>
              <button
                className="bulk-stamp-progress-details-toggle"
                onClick={() => setShowDetails(!showDetails)}
                type="button"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <ul className="bulk-stamp-progress-fail-list">
                  {result.failed.map((f) => (
                    <li key={f.stampId}>
                      {formatStampId(f.stampId)} &mdash; {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {isError && error && !result && (
        <div className="bulk-stamp-progress-failures">
          <span className="bulk-stamp-progress-fail-count">{error}</span>
        </div>
      )}

      {isError && (
        <button className="bulk-stamp-progress-reload" onClick={handleReload} type="button">
          Reload page
        </button>
      )}
    </div>
  );
}

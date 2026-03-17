import { useState } from 'react';

import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { type BulkStampTopUpResult, TOPUP_STATUS, type TopUpStatus } from '@/utils/network/stampTopup';
import { formatStampId } from '@/utils/ui/format';

import './BulkStampProgressDisplay.scss';

interface BulkStampProgressDisplayProps {
  status: TopUpStatus | null;
  currentIndex?: number;
  totalStamps: number;
  result: BulkStampTopUpResult | null;
  error?: string;
}

interface FailureDetailsProps {
  failed: BulkStampTopUpResult['failed'];
}

function getStatusMessage(status: TopUpStatus, currentIndex: number, totalStamps: number): string {
  switch (status) {
    case TOPUP_STATUS.APPROVING:
      return 'Approving BZZ...';
    case TOPUP_STATUS.BATCH_PENDING:
      return 'Confirming batch transaction...';
    case TOPUP_STATUS.TOPUP:
      return `Processing stamp ${currentIndex + 1} of ${totalStamps}...`;
    case TOPUP_STATUS.DONE:
      return 'Done';
    case TOPUP_STATUS.ERROR:
      return 'Top up failed. Please try again.';
    default:
      return '';
  }
}

function getProgressWidth(status: TopUpStatus, progressPercent: number): number {
  if (status === TOPUP_STATUS.DONE || status === TOPUP_STATUS.BATCH_PENDING) return 100;
  return progressPercent;
}

function getProgressBarClass(status: TopUpStatus): string {
  const base = 'bulk-stamp-progress-bar';
  if (status === TOPUP_STATUS.BATCH_PENDING) return `${base} ${base}--indeterminate`;
  return base;
}

function FailureDetails({ failed }: FailureDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bulk-stamp-progress-failures">
      <span className="bulk-stamp-progress-fail-count">{failed.length} failed</span>
      <button
        className="bulk-stamp-progress-details-toggle"
        onClick={() => setShowDetails((prev) => !prev)}
        type="button"
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>
      {showDetails && (
        <ul className="bulk-stamp-progress-fail-list">
          {failed.map((f) => (
            <li key={f.stampId}>
              {formatStampId(f.stampId)} &mdash; {f.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultSummary({ result }: { result: BulkStampTopUpResult }) {
  return (
    <div className="bulk-stamp-progress-result">
      {result.successful.length > 0 && (
        <span className="bulk-stamp-progress-success">{result.successful.length} stamps topped up successfully</span>
      )}
      {result.failed.length > 0 && <FailureDetails failed={result.failed} />}
    </div>
  );
}

export function BulkStampProgressDisplay({
  status,
  currentIndex = 0,
  totalStamps,
  result,
  error,
}: BulkStampProgressDisplayProps) {
  if (!status) return null;

  const isProcessing =
    status === TOPUP_STATUS.APPROVING || status === TOPUP_STATUS.TOPUP || status === TOPUP_STATUS.BATCH_PENDING;
  const isDone = status === TOPUP_STATUS.DONE;
  const isError = status === TOPUP_STATUS.ERROR;

  const progressPercent = totalStamps > 0 ? Math.round(((currentIndex + 1) / totalStamps) * 100) : 0;
  const showProgressBar = status !== TOPUP_STATUS.APPROVING && totalStamps > 0;
  const showResult = (isDone || isError) && result;
  const showStandaloneError = isError && error && !result;

  return (
    <div className="bulk-stamp-progress">
      <div className="bulk-stamp-progress-status">
        {isProcessing && <CircleLoader size="small" />}
        <span className={`bulk-stamp-progress-text ${isError ? 'bulk-stamp-progress-text--error' : ''}`}>
          {getStatusMessage(status, currentIndex, totalStamps)}
        </span>
      </div>

      {showProgressBar && (
        <div className="bulk-stamp-progress-bar-container">
          <div
            className={getProgressBarClass(status)}
            style={{ width: `${getProgressWidth(status, progressPercent)}%` }}
          />
        </div>
      )}

      {showResult && <ResultSummary result={result} />}

      {showStandaloneError && (
        <div className="bulk-stamp-progress-failures">
          <span className="bulk-stamp-progress-fail-count">{error}</span>
        </div>
      )}

      {isError && (
        <button className="bulk-stamp-progress-reload" onClick={() => window.location.reload()} type="button">
          Reload page
        </button>
      )}
    </div>
  );
}

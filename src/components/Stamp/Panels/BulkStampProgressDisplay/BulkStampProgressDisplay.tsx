import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { TOPUP_STATUS, type TopUpStatus } from '@/utils/network/stampTopup';

import './BulkStampProgressDisplay.scss';

interface BulkStampProgressDisplayProps {
  status: TopUpStatus | null;
  totalStamps: number;
  error?: string;
}

function getStatusMessage(status: TopUpStatus): string {
  switch (status) {
    case TOPUP_STATUS.APPROVING:
      return 'Approving BZZ...';
    case TOPUP_STATUS.BATCH_PENDING:
      return 'Confirming batch transaction...';
    case TOPUP_STATUS.DONE:
      return 'All stamps topped up successfully';
    case TOPUP_STATUS.ERROR:
      return 'Top-up failed. Please try again or check your wallet for details.';
    default:
      return '';
  }
}

export function BulkStampProgressDisplay({ status, totalStamps, error }: BulkStampProgressDisplayProps) {
  if (!status) return null;

  const handleReload = () => window.location.reload();

  const isProcessing = status === TOPUP_STATUS.APPROVING || status === TOPUP_STATUS.BATCH_PENDING;
  const isError = status === TOPUP_STATUS.ERROR;
  const showProgressBar = status === TOPUP_STATUS.BATCH_PENDING && totalStamps > 0;

  return (
    <div className="bulk-stamp-progress">
      <div className="bulk-stamp-progress-status">
        {isProcessing && <CircleLoader size="small" />}
        <span className={`bulk-stamp-progress-text ${isError ? 'bulk-stamp-progress-text--error' : ''}`}>
          {error && isError ? error : getStatusMessage(status)}
        </span>
      </div>

      {showProgressBar && (
        <div className="bulk-stamp-progress-bar-container">
          <div className="bulk-stamp-progress-bar bulk-stamp-progress-bar--indeterminate" style={{ width: '100%' }} />
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

import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { BatchExpirationResult } from '@/utils/network/stampInfo';
import { formatDays, formatStampExpirationDate } from '@/utils/ui/format';

import './BatchSummaryCard.scss';

interface BatchSummaryCardProps {
  expirationData: BatchExpirationResult | null;
  isLoading: boolean;
}

export function BatchSummaryCard({ expirationData, isLoading }: BatchSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="batch-summary-card batch-summary-card--loading">
        <CircleLoader size="small" />
        <span>Loading batch info...</span>
      </div>
    );
  }

  if (!expirationData) {
    return null;
  }

  const totalCount = expirationData.entries.length;
  const activeCount = expirationData.entries.filter((e) => e.financialStatus.isActive).length;
  const expiredCount = totalCount - activeCount;

  return (
    <div className="batch-summary-card">
      <div className="batch-summary-header">
        <h3 className="batch-summary-title">Batch Overview</h3>
        <div className="batch-summary-counts">
          <span className="batch-count">{totalCount} stamps</span>
          {activeCount > 0 && <span className="batch-count batch-count--active">{activeCount} active</span>}
          {expiredCount > 0 && <span className="batch-count batch-count--expired">{expiredCount} expired</span>}
        </div>
      </div>

      {expirationData.soonestExpiry && (
        <div className="batch-summary-expiry">
          <span className="batch-summary-label">Soonest expiry</span>
          <span className="batch-summary-value">
            {formatDays(expirationData.soonestExpiry.financialStatus.remainingDays)}
            {expirationData.soonestExpiry.financialStatus.expirationDate && (
              <span className="batch-summary-date">
                ({formatStampExpirationDate(expirationData.soonestExpiry.financialStatus.expirationDate)})
              </span>
            )}
          </span>
        </div>
      )}

      {!expirationData.isConsistent && (
        <div className="batch-summary-drift">
          Stamps are out of sync by {formatDays(expirationData.maxDriftDays)}. Batch top up will realign them.
        </div>
      )}
    </div>
  );
}

import { CircleLoader } from '@/components/CircleLoader/CircleLoader';
import { BulkStampExpirationResult } from '@/utils/network/stampInfo';
import { formatDays, formatStampExpirationDate } from '@/utils/ui/format';

import './BulkStampSummaryCard.scss';

interface BulkStampSummaryCardProps {
  expirationData: BulkStampExpirationResult | null;
  isLoading: boolean;
}

export function BulkStampSummaryCard({ expirationData, isLoading }: BulkStampSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bulk-stamp-summary-card bulk-stamp-summary-card--loading">
        <CircleLoader size="small" />
        <span>Loading stamp info...</span>
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
    <div className="bulk-stamp-summary-card">
      <div className="bulk-stamp-summary-header">
        <h3 className="bulk-stamp-summary-title">Bulk Overview</h3>
        <div className="bulk-stamp-summary-counts">
          <span className="bulk-stamp-count">{totalCount} stamps</span>
          {activeCount > 0 && <span className="bulk-stamp-count bulk-stamp-count--active">{activeCount} active</span>}
          {expiredCount > 0 && (
            <span className="bulk-stamp-count bulk-stamp-count--expired">{expiredCount} expired</span>
          )}
        </div>
      </div>

      {expirationData.soonestExpiry && (
        <div className="bulk-stamp-summary-expiry">
          <span className="bulk-stamp-summary-label">Soonest expiry</span>
          <span className="bulk-stamp-summary-value">
            {formatDays(expirationData.soonestExpiry.financialStatus.remainingDays)}
            {expirationData.soonestExpiry.financialStatus.expirationDate && (
              <span className="bulk-stamp-summary-date">
                ({formatStampExpirationDate(expirationData.soonestExpiry.financialStatus.expirationDate)})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

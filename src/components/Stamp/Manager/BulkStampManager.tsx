import { useCallback, useMemo } from 'react';

import { useBulkStampExpiration } from '@/hooks/useBulkStampExpiration';
import { StampsData } from '@/types/stamp';

import { BulkStampSummaryCard } from '../Cards/BulkStampSummaryCard/BulkStampSummaryCard';
import { BulkStampSyncControls } from '../Controls/BulkStampSyncControls/BulkStampSyncControls';
import { BulkStampTopUpControls } from '../Controls/BulkStampTopUpControls/BulkStampTopUpControls';
import { EmptyState, ErrorState, LoadingState } from '../StateDisplay/StateDisplay';

import './BulkStampManager.scss';

interface BulkStampManagerProps {
  stamps: StampsData;
}

export function BulkStampManager({ stamps }: BulkStampManagerProps) {
  const allStampIds = useMemo(() => {
    const ids: string[] = [];

    stamps.pinnedStreams.forEach((stream) => {
      stream.stamps.forEach((s) => ids.push(s.stampId));
    });
    stamps.privateStamps.forEach((s) => ids.push(s.stampId));
    stamps.publicStamps.forEach((s) => ids.push(s.stampId));
    stamps.customPrivateStamps.forEach((s) => ids.push(s.stampId));

    return ids;
  }, [stamps.pinnedStreams, stamps.privateStamps, stamps.publicStamps, stamps.customPrivateStamps]);

  const bulkStampExpiration = useBulkStampExpiration(allStampIds);

  const handleComplete = useCallback(() => {
    stamps.refreshAll();
  }, [stamps]);

  if (stamps.isLoading) {
    return <LoadingState message="Loading stamps..." />;
  }

  if (stamps.error) {
    return <ErrorState message={stamps.error} onRetry={stamps.refreshAll} />;
  }

  if (allStampIds.length === 0) {
    return <EmptyState message="No stamps available." />;
  }

  return (
    <div className="bulk-stamp-manager">
      <BulkStampSummaryCard expirationData={bulkStampExpiration.data} isLoading={bulkStampExpiration.isLoading} />

      {bulkStampExpiration.data && !bulkStampExpiration.data.isConsistent ? (
        <BulkStampSyncControls
          stampIds={allStampIds}
          maxDriftDays={bulkStampExpiration.data.maxDriftDays}
          onComplete={handleComplete}
        />
      ) : (
        <BulkStampTopUpControls stampIds={allStampIds} onComplete={handleComplete} />
      )}
    </div>
  );
}

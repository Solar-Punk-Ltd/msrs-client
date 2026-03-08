import { useCallback, useMemo } from 'react';
import { ethers } from 'ethers';

import { useBatchExpiration } from '@/hooks/useBatchExpiration';

import { BatchSummaryCard } from '../Cards/BatchSummaryCard/BatchSummaryCard';
import { BatchTopUpControls } from '../Controls/BatchTopUpControls/BatchTopUpControls';
import { EmptyState, ErrorState, LoadingState } from '../StateDisplay/StateDisplay';
import { StampsData } from '../types';

import './BatchManager.scss';

interface BatchManagerProps {
  stamps: StampsData;
  signer: ethers.Signer | null;
}

export function BatchManager({ stamps, signer }: BatchManagerProps) {
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

  const batchExpiration = useBatchExpiration(allStampIds);

  const handleComplete = useCallback(() => {
    batchExpiration.refresh();
    stamps.refreshAll();
  }, [batchExpiration, stamps]);

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
    <div className="batch-manager">
      <BatchSummaryCard expirationData={batchExpiration.data} isLoading={batchExpiration.isLoading} />
      <BatchTopUpControls stampIds={allStampIds} signer={signer} onComplete={handleComplete} />
    </div>
  );
}

import { StampsData } from '@/types/stamp';

import { PinnedStreamGrid } from '../Grids/PinnedStampGrid/PinnedStampGrid';
import { StampGrid } from '../Grids/StampGrid/StampGrid';
import { EmptyState, ErrorState, LoadingState } from '../StateDisplay/StateDisplay';

import './StampManager.scss';

interface StampManagerProps {
  stamps: StampsData;
}

export function StampManager({ stamps }: StampManagerProps) {
  const hasContent =
    stamps.pinnedStreams.length > 0 ||
    stamps.privateStamps.length > 0 ||
    stamps.publicStamps.length > 0 ||
    stamps.customPrivateStamps.length > 0;

  return (
    <div className="stamp-manager-container">
      {stamps.error ? (
        <ErrorState message={stamps.error} onRetry={stamps.refreshAll} />
      ) : stamps.isLoading ? (
        <LoadingState message="Loading stamps..." />
      ) : hasContent ? (
        <>
          {stamps.pinnedStreams.length > 0 && (
            <PinnedStreamGrid streams={stamps.pinnedStreams} onStampRefresh={stamps.refresh} />
          )}
          {stamps.privateStamps.length > 0 && (
            <StampGrid title="Private Stamps" stamps={stamps.privateStamps} onStampRefresh={stamps.refresh} />
          )}
          {stamps.publicStamps.length > 0 && (
            <StampGrid title="Public Stamps" stamps={stamps.publicStamps} onStampRefresh={stamps.refresh} />
          )}
          {stamps.customPrivateStamps.length > 0 && (
            <StampGrid title="External" stamps={stamps.customPrivateStamps} onStampRefresh={stamps.refresh} />
          )}
        </>
      ) : (
        <EmptyState message="No stamps available." />
      )}
    </div>
  );
}

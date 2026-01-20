import { useState } from 'react';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useOtherStamps } from '@/hooks/useOtherStamps';
import { useStamps } from '@/hooks/useStamps';
import { useUserContext } from '@/providers/User';
import { useWallet } from '@/providers/Wallet';

import { OtherStampGrid } from '../Grids/OtherStampGrid/OtherStampGrid';
import { PinnedStreamGrid } from '../Grids/PinnedStampGrid/PinnedStampGrid';
import { StampGrid } from '../Grids/StampGrid/StampGrid';
import { StampInfoPanel } from '../Panels/StampInfoPanel/StampInfoPanel';

import { StampManagerHeader } from './StampManagerHeader';

import './StampManager.scss';

const OTHER_STAMPS = [
  '72b52e3217fd8ffcaa276a841da5dab8d41affbd3d8afc5a0d0040e2c25a0b07',
  'bac4824f5a2fb4f553c6adc8d4283f17d4984289991495abc5f29fb2c1acc9d7',
  '7aea39df42c6b7fc1cb7e96a7dc5887f4fea69b65b07dd70e7ed9aa23eb98ea9',
];

export function StampManager() {
  const { provider, signer } = useWallet();
  const { session } = useUserContext();
  const stamps = useStamps(session?.serverKeys.nginx, provider);
  const otherStamps = useOtherStamps(OTHER_STAMPS);

  const [showInfo, setShowInfo] = useState(false);

  const hasContent =
    stamps.pinnedStreams.length > 0 ||
    stamps.privateStamps.length > 0 ||
    stamps.publicStamps.length > 0 ||
    otherStamps.stamps.length > 0;

  return (
    <div className="stamp-manager">
      <StampManagerHeader showInfo={showInfo} onToggleInfo={() => setShowInfo(!showInfo)} />

      {showInfo && <StampInfoPanel />}

      <div className="stamp-manager-container">
        {stamps.error ? (
          <ErrorState message={stamps.error} onRetry={stamps.refreshAll} />
        ) : stamps.isLoading ? (
          <LoadingState message="Loading stamps..." />
        ) : hasContent ? (
          <>
            {stamps.pinnedStreams.length > 0 && (
              <PinnedStreamGrid streams={stamps.pinnedStreams} signer={signer} onStampRefresh={stamps.refresh} />
            )}
            {stamps.privateStamps.length > 0 && (
              <StampGrid
                title="Private Stamps"
                stamps={stamps.privateStamps}
                signer={signer}
                onStampRefresh={stamps.refresh}
              />
            )}
            {stamps.publicStamps.length > 0 && (
              <StampGrid
                title="Public Stamps"
                stamps={stamps.publicStamps}
                signer={signer}
                onStampRefresh={stamps.refresh}
              />
            )}
            {otherStamps.stamps.length > 0 && (
              <OtherStampGrid
                title="Others"
                stamps={otherStamps.stamps}
                signer={signer}
                onStampRefresh={otherStamps.refresh}
              />
            )}
          </>
        ) : (
          <EmptyState message="No stamps available." />
        )}
      </div>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <InputLoading />
      <p>{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <p className="error-message">Error: {message}</p>
      {onRetry && (
        <button className="btn btn-retry" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}

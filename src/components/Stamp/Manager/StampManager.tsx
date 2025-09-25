import { useState } from 'react';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useStamps } from '@/hooks/useStamps';
import { useWallet } from '@/hooks/useWallet';
import { useUserContext } from '@/providers/User';

import { PinnedStreamGrid } from '../Grids/PinnedStampGrid/PinnedStampGrid';
import { StampGrid } from '../Grids/StampGrid/StampGrid';
import { StampInfoPanel } from '../Panels/StampInfoPanel/StampInfoPanel';

import { StampManagerHeader } from './StampManagerHeader';

import './StampManager.scss';

export function StampManager() {
  const wallet = useWallet();

  const { session } = useUserContext();

  const stamps = useStamps(session?.serverKeys.nginx, wallet.provider);

  const [showInfo, setShowInfo] = useState(false);

  const hasContent =
    stamps.pinnedStreams.length > 0 || stamps.privateStamps.length > 0 || stamps.publicStamps.length > 0;

  return (
    <div className="stamp-manager">
      <StampManagerHeader wallet={wallet} showInfo={showInfo} onToggleInfo={() => setShowInfo(!showInfo)} />

      {showInfo && <StampInfoPanel />}

      <div className="stamp-manager-container">
        {stamps.error ? (
          <ErrorState message={stamps.error} onRetry={stamps.refreshAll} />
        ) : stamps.isLoading ? (
          <LoadingState message="Loading stamps..." />
        ) : hasContent ? (
          <>
            {stamps.pinnedStreams.length > 0 && (
              <PinnedStreamGrid streams={stamps.pinnedStreams} signer={wallet.signer} onStampRefresh={stamps.refresh} />
            )}
            {stamps.privateStamps.length > 0 && (
              <StampGrid
                title="Private Stamps"
                stamps={stamps.privateStamps}
                signer={wallet.signer}
                onStampRefresh={stamps.refresh}
              />
            )}
            {stamps.publicStamps.length > 0 && (
              <StampGrid
                title="Public Stamps"
                stamps={stamps.publicStamps}
                signer={wallet.signer}
                onStampRefresh={stamps.refresh}
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

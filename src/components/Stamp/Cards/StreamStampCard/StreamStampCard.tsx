import { useState } from 'react';
import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StampWithInfo } from '@/hooks/useStamps';
import { extendStampDuration } from '@/utils/network/stampTopup';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';
import { formatDays, formatStampExpirationDate, formatStampId } from '@/utils/ui/format';

import { StampActions } from '../Shared/StampActions';

import './StreamStampCard.scss';

interface StreamStampCardProps {
  stamp: StampWithInfo;
  signer?: ethers.Signer;
  sharedExpanded?: boolean;
  onToggleExpanded?: () => void;
  onStampRefresh?: (stampId: string) => Promise<void>;
}

export function StreamStampCard({
  stamp,
  signer,
  sharedExpanded,
  onToggleExpanded,
  onStampRefresh,
}: StreamStampCardProps) {
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { stampInfo, error, nodeInfo } = stamp;
  const stampType = nodeInfo.history?.type || 'unknown';

  const handleTopUp = async (days: number) => {
    if (!signer) {
      setErrorMessage('Please connect your wallet first');
      setErrorModalOpen(true);
      return;
    }

    setIsTopUpLoading(true);
    try {
      await extendStampDuration(signer, stamp.stampId, days);
      console.log(`Successfully topped up stamp for ${days} days`);
      if (onStampRefresh) {
        await onStampRefresh(stamp.stampId);
      }
    } catch (error) {
      console.error('Top-up failed:', error);
      const friendlyErrorMessage = getUserFriendlyErrorMessage(error);
      setErrorMessage(`Top-up failed: ${friendlyErrorMessage}`);
      setErrorModalOpen(true);
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (stamp.isLoading) {
    return (
      <div className="stream-stamp-card stream-stamp-loading">
        <div className="stream-stamp-loading-indicator">
          <div className="spinner"></div>
          <p>Loading stamp info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stream-stamp-card stream-stamp-error">
        <p className="stream-stamp-error-message">{error}</p>
      </div>
    );
  }

  if (!stampInfo) {
    return (
      <div className="stream-stamp-card stream-stamp-error">
        <div className="stream-stamp-type-badge">{stampType}</div>
        <p className="stream-stamp-error-message">No stamp data available</p>
      </div>
    );
  }

  const isActive = stampInfo.isValid && stampInfo.financialStatus.isActive;
  const { financialStatus } = stampInfo;

  return (
    <div
      className={`stream-stamp-card ${
        isActive ? 'stream-stamp-active' : 'stream-stamp-expired'
      } stream-stamp-type-${stampType}`}
    >
      <div className="stream-stamp-header">
        <div>
          <div className="stream-stamp-type-badge">{stampType}</div>

          <h4 className="stream-stamp-id" title={stamp.stampId}>
            {formatStampId(stamp.stampId)}
          </h4>
        </div>

        <span className={`stream-stamp-status ${isActive ? 'active' : 'expired'}`}>
          {isActive ? 'ACTIVE' : 'EXPIRED'}
        </span>
      </div>

      <div className="stream-stamp-details">
        <div className="stream-stamp-row">
          <span className="stream-stamp-label">TTL:</span>
          <span className="stream-stamp-value">
            {financialStatus.isActive ? formatDays(financialStatus.remainingDays) : 'Expired'}
            {financialStatus.expirationDate && (
              <span className="stream-stamp-subtitle">
                ({formatStampExpirationDate(financialStatus.expirationDate)})
              </span>
            )}
          </span>
        </div>
      </div>

      {signer && isActive && (
        <StampActions
          stampId={stamp.stampId}
          signer={signer}
          onTopUp={handleTopUp}
          isLoading={isTopUpLoading}
          variant="stream"
          externalExpanded={sharedExpanded}
          onToggleExpanded={onToggleExpanded}
        />
      )}

      <SimpleModal isOpen={errorModalOpen} title="Error" onClose={() => setErrorModalOpen(false)} closeText="OK">
        <p>{errorMessage}</p>
      </SimpleModal>
    </div>
  );
}

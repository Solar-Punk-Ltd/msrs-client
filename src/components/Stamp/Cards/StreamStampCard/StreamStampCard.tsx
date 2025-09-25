import { useState } from 'react';
import { ethers } from 'ethers';

import { StampWithInfo } from '@/hooks/useStamps';
import { formatDays, formatStampExpirationDate, formatStampId } from '@/utils/format';
import { extendStampDuration } from '@/utils/stampTopup';

import { StampActions } from '../Shared/StampActions';

import './StreamStampCard.scss';

interface StreamStampCardProps {
  stamp: StampWithInfo;
  signer?: ethers.Signer;
}

export function StreamStampCard({ stamp, signer }: StreamStampCardProps) {
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const { stampInfo, error, nodeInfo } = stamp;
  const stampType = nodeInfo.lock_info?.type || 'unknown';

  const handleTopUp = async (days: number) => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    setIsTopUpLoading(true);
    try {
      await extendStampDuration(signer, stamp.stampId, days);
      console.log(`Successfully topped up stamp for ${days} days`);
      // You might want to refresh the stamp info here
    } catch (error) {
      console.error('Top-up failed:', error);
      alert(`Top-up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (error) {
    return (
      <div className="stream-stamp-card stream-stamp-error">
        <div className="stream-stamp-type-badge">{stampType}</div>
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
        />
      )}
    </div>
  );
}

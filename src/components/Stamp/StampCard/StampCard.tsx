import { useState } from 'react';
import { ethers } from 'ethers';

import { formatDays, formatStampId } from '@/utils/format';
import { StampInfo } from '@/utils/stamp';

import './StampCard.scss';

interface StampCardProps {
  stampId: string;
  stampInfo?: StampInfo;
  error?: string;
  signer?: ethers.Signer;
}

export function StampCard({ stampId, stampInfo, error, signer }: StampCardProps) {
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  const handleTopUp = async () => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    setIsTopUpLoading(true);
    try {
      // TODO: Implement top-up functionality
      console.log('Top-up functionality to be implemented');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (error) {
    return (
      <div className="stamp-card stamp-error">
        <h3 className="stamp-title">Error Loading Stamp</h3>
        <p className="stamp-error-message">{error}</p>
      </div>
    );
  }

  if (!stampInfo) {
    return (
      <div className="stamp-card stamp-error">
        <h3 className="stamp-title">No Data</h3>
        <p className="stamp-error-message">No stamp data available</p>
      </div>
    );
  }

  const isActive = stampInfo.isValid && stampInfo.financialStatus.isActive;
  const { financialStatus } = stampInfo;

  return (
    <div className={`stamp-card ${isActive ? 'stamp-active' : 'stamp-expired'}`}>
      <StampHeader stampId={stampId} isActive={isActive} />
      <StampDetails financialStatus={financialStatus} />
      {signer && isActive && <StampActions onTopUp={handleTopUp} isLoading={isTopUpLoading} />}
    </div>
  );
}

function StampHeader({ stampId, isActive }: { stampId: string; isActive: boolean }) {
  return (
    <div className="stamp-header">
      <h3 className="stamp-id" title={stampId}>
        {formatStampId(stampId)}
      </h3>
      <span className={`stamp-status ${isActive ? 'active' : 'expired'}`}>{isActive ? 'ACTIVE' : 'EXPIRED'}</span>
    </div>
  );
}

function StampDetails({ financialStatus }: { financialStatus: StampInfo['financialStatus'] }) {
  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  return (
    <div className="stamp-details">
      <div className="stamp-row">
        <span className="stamp-label">TTL:</span>
        <span className="stamp-value">
          {financialStatus.isActive ? formatDays(financialStatus.remainingDays) : 'Expired'}
          {financialStatus.expirationDate && (
            <span className="stamp-subtitle">({formatDate(financialStatus.expirationDate)})</span>
          )}
        </span>
      </div>
    </div>
  );
}

function StampActions({ onTopUp, isLoading }: { onTopUp: () => void; isLoading: boolean }) {
  return (
    <div className="stamp-actions">
      <button className="stamp-button" onClick={onTopUp} disabled={isLoading} type="button">
        {isLoading ? 'Processing...' : 'Top Up'}
      </button>
    </div>
  );
}

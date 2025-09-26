import { useState } from 'react';
import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StampWithInfo } from '@/hooks/useStamps';
import { getUserFriendlyErrorMessage } from '@/utils/errorHandling';
import { formatDays, formatStampExpirationDate, formatStampId } from '@/utils/format';
import { StampInfo } from '@/utils/stampInfo';
import { extendStampDuration } from '@/utils/stampTopup';

import { StampActions } from '../Shared/StampActions';

import './StampCard.scss';

interface StampCardProps {
  stamp: StampWithInfo;
  signer?: ethers.Signer;
  onStampRefresh?: (stampId: string) => Promise<void>;
}

export function StampCard({ stamp, signer, onStampRefresh }: StampCardProps) {
  const { stampId, stampInfo, error } = stamp;
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTopUp = async (days: number) => {
    if (!signer) {
      setErrorMessage('Please connect your wallet first');
      setErrorModalOpen(true);
      return;
    }

    setIsTopUpLoading(true);
    try {
      await extendStampDuration(signer, stampId, days);
      console.log(`Successfully topped up stamp for ${days} days`);
      if (onStampRefresh) {
        await onStampRefresh(stampId);
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
      <div className="stamp-card stamp-loading">
        <div className="stamp-loading-indicator">
          <div className="spinner"></div>
          <p>Loading stamp info...</p>
        </div>
      </div>
    );
  }

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
      {signer && isActive && (
        <StampActions stampId={stampId} signer={signer} onTopUp={handleTopUp} isLoading={isTopUpLoading} />
      )}

      <SimpleModal isOpen={errorModalOpen} title="Error" onClose={() => setErrorModalOpen(false)} closeText="OK">
        <p>{errorMessage}</p>
      </SimpleModal>
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
  return (
    <div className="stamp-details">
      <div className="stamp-row">
        <span className="stamp-label">TTL:</span>
        <span className="stamp-value">
          {financialStatus.isActive ? formatDays(financialStatus.remainingDays) : 'Expired'}
          {financialStatus.expirationDate && (
            <span className="stamp-subtitle">({formatStampExpirationDate(financialStatus.expirationDate)})</span>
          )}
        </span>
      </div>
    </div>
  );
}

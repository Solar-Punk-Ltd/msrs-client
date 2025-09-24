import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { StampInfo, StampService } from '@/utils/stamp';

import './StampCard.scss';

interface StampCardProps {
  stampId: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

export function StampCard({ stampId, provider, signer }: StampCardProps) {
  const [stampInfo, setStampInfo] = useState<StampInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stampService] = useState(() => new StampService(provider));

  const loadStampData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const info = await stampService.loadStampInfo(stampId);
      setStampInfo(info);
    } catch (err) {
      console.error('Error loading stamp data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stamp data');
    } finally {
      setLoading(false);
    }
  }, [stampId, stampService]);

  useEffect(() => {
    loadStampData();
  }, [loadStampData]);

  const handleTopUp = async () => {
    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }
    // TODO: Implement top-up amount UI
    console.log('Top-up functionality to be implemented');
    // Example: await stampService.topUpStamp(stampId, amount, signer);
  };

  if (loading) {
    return (
      <div className="stamp-card stamp-loading">
        <div className="stamp-loader">Loading stamp data...</div>
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

  const { financialStatus, isValid } = stampInfo;
  const isActive = isValid && financialStatus.isActive;

  return (
    <div className="stamp-card">
      <div className="stamp-header">
        <h3 className="stamp-id" title={stampId}>
          {stampId.slice(0, 10)}...{stampId.slice(-8)}
        </h3>
        <span className="stamp-status">{isActive ? 'ACTIVE' : 'EXPIRED'}</span>
      </div>

      <div className="stamp-details">
        <div className="stamp-row">
          <span className="stamp-label">TTL:</span>
          <span className="stamp-value">
            {financialStatus.isActive ? `${financialStatus.remainingDays.toFixed(1)} days` : 'Expired'}
            {financialStatus.expirationDate && (
              <span className="stamp-subtitle"> ({financialStatus.expirationDate.toISOString().slice(0, 10)})</span>
            )}
          </span>
        </div>
      </div>

      {signer && isActive && (
        <div className="stamp-actions">
          <button className="stamp-button" onClick={handleTopUp}>
            Top Up
          </button>
        </div>
      )}
    </div>
  );
}

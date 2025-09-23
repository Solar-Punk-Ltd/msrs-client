import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

import { ExtensionCost, formatBZZ, StampData, StampService } from '@/utils/stamp';

import './StampCard.scss';

interface StampCardProps {
  stampId: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

export function StampCard({ stampId, provider, signer }: StampCardProps) {
  const [stampData, setStampData] = useState<StampData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [extending, setExtending] = useState<boolean>(false);
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const stampService = useMemo(() => new StampService(provider), [provider]);

  const loadStampData = useCallback(async (): Promise<void> => {
    if (!provider || !stampId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await stampService.getStampData(stampId);
      setStampData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [stampId, provider, stampService]);

  useEffect(() => {
    loadStampData();
  }, [loadStampData]);

  const handleExtend = async (): Promise<void> => {
    if (!signer || !stampData) return;

    setExtending(true);
    setError(null);

    try {
      await stampService.extendStamp(signer, stampId, extensionDays, stampData);
      await loadStampData(); // Reload data after extension
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="stamp-card stamp-card-loading">
        <div className="spinner"></div>
        <span>Loading stamp data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stamp-card stamp-card-error">
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!stampData) {
    return (
      <div className="stamp-card stamp-card-empty">
        <p>No data available</p>
      </div>
    );
  }

  const extensionCost: ExtensionCost = stampService.calculateExtensionCost(stampData, extensionDays);

  return (
    <div className={`stamp-card ${stampData.isExpired ? 'stamp-card-expired' : ''}`}>
      <div className="stamp-card-header">
        <h3 className="stamp-card-id" title={stampId}>
          {stampId.slice(0, 10)}...{stampId.slice(-6)}
        </h3>
        <span className={`stamp-card-status stamp-card-status-${stampData.isExpired ? 'expired' : 'active'}`}>
          {stampData.isExpired ? '❌ Expired' : '✅ Active'}
        </span>
      </div>

      <div className="stamp-card-details">
        <div className="stamp-card-detail">
          <span className="stamp-card-label">Owner:</span>
          <span className="stamp-card-value" title={stampData.owner}>
            {stampData.owner.slice(0, 6)}...{stampData.owner.slice(-4)}
          </span>
        </div>

        <div className="stamp-card-detail">
          <span className="stamp-card-label">Remaining Days:</span>
          <span className="stamp-card-value stamp-card-value-highlight">{stampData.remainingDays.toFixed(2)}</span>
        </div>

        <div className="stamp-card-detail">
          <span className="stamp-card-label">Effective Size:</span>
          <span className="stamp-card-value">{stampData.effectiveGB} GB</span>
        </div>

        <div className="stamp-card-detail">
          <span className="stamp-card-label">Depth:</span>
          <span className="stamp-card-value">{stampData.depth}</span>
        </div>

        <div className="stamp-card-detail">
          <span className="stamp-card-label">Immutable:</span>
          <span className="stamp-card-value">{stampData.immutable ? 'Yes' : 'No'}</span>
        </div>

        <div className="stamp-card-detail">
          <span className="stamp-card-label">Balance:</span>
          <span className="stamp-card-value">{formatBZZ(stampData.remainingBalance)} BZZ</span>
        </div>
      </div>

      {!stampData.isExpired && signer && (
        <div className="stamp-card-extension">
          <h4>Extend Duration</h4>

          <div className="stamp-card-extension-input">
            <input
              type="number"
              value={extensionDays}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtensionDays(Number(e.target.value))}
              min="1"
              max="365"
            />
            <span>days</span>
          </div>

          <div className="stamp-card-extension-cost">
            Cost: <strong>{formatBZZ(extensionCost.totalCost)} BZZ</strong>
          </div>

          <button className="stamp-card-extension-btn" onClick={handleExtend} disabled={extending}>
            {extending ? 'Extending...' : 'Extend Duration'}
          </button>
        </div>
      )}
    </div>
  );
}

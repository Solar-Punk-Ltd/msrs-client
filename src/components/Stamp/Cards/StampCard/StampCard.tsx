import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StampWithInfo } from '@/hooks/useStamps';
import { useStampTopUp } from '@/hooks/useStampTopUp';
import { formatStampId } from '@/utils/ui/format';

import { isStampActive } from '../../types';
import { StampActions } from '../Shared/StampActions';
import { TTLDisplay } from '../Shared/TTLDisplay';

import './StampCard.scss';

interface StampCardProps {
  stamp: StampWithInfo;
  signer?: ethers.Signer;
  onStampRefresh?: (stampId: string) => Promise<void>;
}

export function StampCard({ stamp, signer, onStampRefresh }: StampCardProps) {
  const { stampId, stampInfo, error, tags } = stamp;
  const { isTopUpLoading, errorModalOpen, errorMessage, handleTopUp, closeErrorModal } = useStampTopUp(
    signer,
    stampId,
    onStampRefresh,
  );

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

  const active = isStampActive(stampInfo);
  const { financialStatus } = stampInfo;

  return (
    <div className={`stamp-card ${active ? 'stamp-active' : 'stamp-expired'}`}>
      <StampHeader stampId={stampId} isActive={active} tags={tags} />
      <div className="stamp-details">
        <TTLDisplay financialStatus={financialStatus} classPrefix="stamp" />
      </div>
      {signer && active && (
        <StampActions stampId={stampId} signer={signer} onTopUp={handleTopUp} isLoading={isTopUpLoading} />
      )}

      <SimpleModal isOpen={errorModalOpen} title="Error" onClose={closeErrorModal} closeText="OK">
        <p>{errorMessage}</p>
      </SimpleModal>
    </div>
  );
}

function StampHeader({ stampId, isActive, tags }: { stampId: string; isActive: boolean; tags?: string[] }) {
  return (
    <div className="stamp-header">
      <div className="stamp-header-top">
        <h3 className="stamp-id" title={stampId}>
          {formatStampId(stampId)}
        </h3>
        <span className={`stamp-status ${isActive ? 'active' : 'expired'}`}>{isActive ? 'ACTIVE' : 'EXPIRED'}</span>
      </div>
      {tags && tags.length > 0 && (
        <div className="stamp-tags">
          {tags.map((tag) => (
            <span key={tag} className="stamp-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

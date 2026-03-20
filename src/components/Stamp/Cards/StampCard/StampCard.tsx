import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StampWithInfo } from '@/hooks/useStamps';
import { useStampTopUp } from '@/hooks/useStampTopUp';
import { useWallet } from '@/providers/Wallet';
import { isStampActive } from '@/utils/network/stampInfo';
import { formatStampId } from '@/utils/ui/format';

import { StampActions } from '../Shared/StampActions';
import { TTLDisplay } from '../Shared/TTLDisplay';

import './StampCard.scss';

interface StampCardProps {
  stamp: StampWithInfo;
  onStampRefresh?: (stampId: string) => Promise<void>;
}

export function StampCard({ stamp, onStampRefresh }: StampCardProps) {
  const { stampId, stampInfo, error, tags } = stamp;
  const { account } = useWallet();
  const { isTopUpLoading, errorModalOpen, errorMessage, handleTopUp, closeErrorModal } = useStampTopUp(
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

  const isActive = isStampActive(stampInfo);
  const { financialStatus } = stampInfo;

  return (
    <div className={`stamp-card ${isActive ? 'stamp-active' : 'stamp-expired'}`}>
      <StampHeader stampId={stampId} isActive={isActive} tags={tags} />
      <div className="stamp-details">
        <TTLDisplay financialStatus={financialStatus} classPrefix="stamp" />
      </div>
      {account && isActive && <StampActions stampId={stampId} onTopUp={handleTopUp} isLoading={isTopUpLoading} />}

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

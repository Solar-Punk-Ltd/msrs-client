import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StampWithInfo } from '@/hooks/useStamps';
import { useStampTopUp } from '@/hooks/useStampTopUp';
import { formatStampId } from '@/utils/ui/format';

import { isStampActive } from '../../types';
import { StampActions } from '../Shared/StampActions';
import { TTLDisplay } from '../Shared/TTLDisplay';

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
  const { isTopUpLoading, errorModalOpen, errorMessage, handleTopUp, closeErrorModal } = useStampTopUp(
    signer,
    stamp.stampId,
    onStampRefresh,
  );
  const { stampInfo, error, nodeInfo } = stamp;
  const stampType = nodeInfo.history?.type || 'unknown';

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

  const active = isStampActive(stampInfo);
  const { financialStatus } = stampInfo;

  return (
    <div
      className={`stream-stamp-card ${
        active ? 'stream-stamp-active' : 'stream-stamp-expired'
      } stream-stamp-type-${stampType}`}
    >
      <div className="stream-stamp-header">
        <div>
          <div className="stream-stamp-type-badge">{stampType}</div>

          <h4 className="stream-stamp-id" title={stamp.stampId}>
            {formatStampId(stamp.stampId)}
          </h4>
        </div>

        <span className={`stream-stamp-status ${active ? 'active' : 'expired'}`}>{active ? 'ACTIVE' : 'EXPIRED'}</span>
      </div>

      <div className="stream-stamp-details">
        <TTLDisplay financialStatus={financialStatus} classPrefix="stream-stamp" />
      </div>

      {signer && active && (
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

      <SimpleModal isOpen={errorModalOpen} title="Error" onClose={closeErrorModal} closeText="OK">
        <p>{errorMessage}</p>
      </SimpleModal>
    </div>
  );
}

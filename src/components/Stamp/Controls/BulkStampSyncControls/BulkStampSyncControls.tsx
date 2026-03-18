import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { useBulkStampTopUpMutation } from '@/hooks/useBulkStampTopUpMutation';
import { useBulkStampTopUpPlan } from '@/hooks/useBulkStampTopUpPlan';
import { formatBzzAmount, formatDays } from '@/utils/ui/format';

import { BulkStampProgressDisplay } from '../../Panels/BulkStampProgressDisplay/BulkStampProgressDisplay';

import './BulkStampSyncControls.scss';

interface BulkStampSyncControlsProps {
  stampIds: string[];
  signer: ethers.Signer | null;
  maxDriftDays: number;
  onComplete: () => void;
}

export function BulkStampSyncControls({ stampIds, signer, maxDriftDays, onComplete }: BulkStampSyncControlsProps) {
  const { plan: syncPlan, isPlanLoading } = useBulkStampTopUpPlan(stampIds, 0);
  const { execute, isExecuting, result, progressState, errorModal, clearErrorModal } = useBulkStampTopUpMutation({
    onComplete,
  });

  const costDisplay = syncPlan ? formatBzzAmount(syncPlan.totalCostBzz.toDecimalString()) : null;
  const stampsToSync = syncPlan?.stampsNeedingTopUp.length ?? 0;

  return (
    <div className="bulk-stamp-sync-controls">
      <div className="bulk-stamp-sync-info">
        <span className="bulk-stamp-sync-title">Stamps out of sync</span>
        <p className="bulk-stamp-sync-description">
          Your stamps have a {formatDays(maxDriftDays)} expiration gap. Some stamps will expire before others, which can
          cause data loss and unexpected behaviour. Sync now to extend the behind stamps.
        </p>
      </div>

      <div className="bulk-stamp-sync-cost-display">
        {isPlanLoading ? (
          <span className="calculating">Calculating sync cost...</span>
        ) : syncPlan ? (
          <span className="cost">
            Sync cost: <strong>{costDisplay} BZZ</strong> for {stampsToSync} stamp{stampsToSync !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="cost-error">Error calculating sync cost</span>
        )}
      </div>

      {!isExecuting && !progressState && (
        <button
          className="bulk-stamp-sync-button"
          onClick={() => execute(signer, stampIds, 0)}
          disabled={isPlanLoading || !syncPlan || stampIds.length === 0}
          type="button"
        >
          Sync All Stamps
        </button>
      )}

      <BulkStampProgressDisplay
        status={progressState?.status ?? null}
        currentIndex={progressState?.index}
        totalStamps={progressState?.total ?? stampIds.length}
        result={result}
        error={progressState?.error}
      />

      <SimpleModal isOpen={!!errorModal} title="Sync Error" onClose={clearErrorModal}>
        <p>{errorModal}</p>
      </SimpleModal>
    </div>
  );
}

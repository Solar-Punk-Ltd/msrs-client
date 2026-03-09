import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import {
  BulkStampTopUpPlan,
  BulkStampTopUpResult,
  calculateBulkStampTopUpPlan,
  extendBulkStampDuration,
  TOPUP_STATUS,
  TopUpStatus,
} from '@/utils/network/stampTopup';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';
import { formatBzzAmount, formatDays } from '@/utils/ui/format';

import { BulkStampProgressDisplay } from '../../Panels/BulkStampProgressDisplay/BulkStampProgressDisplay';

import './BulkStampSyncControls.scss';

interface BulkStampSyncControlsProps {
  stampIds: string[];
  signer: ethers.Signer | null;
  maxDriftDays: number;
  onComplete: () => void;
}

interface ProgressState {
  status: TopUpStatus;
  stampId?: string;
  index?: number;
  total?: number;
  error?: string;
}

export function BulkStampSyncControls({ stampIds, signer, maxDriftDays, onComplete }: BulkStampSyncControlsProps) {
  const [syncPlan, setSyncPlan] = useState<BulkStampTopUpPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<BulkStampTopUpResult | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const planFetchRef = useRef(0);

  useEffect(() => {
    if (stampIds.length === 0) return;

    const fetchId = ++planFetchRef.current;
    setIsPlanLoading(true);

    calculateBulkStampTopUpPlan(stampIds, 0)
      .then((plan) => {
        if (fetchId === planFetchRef.current) {
          setSyncPlan(plan);
        }
      })
      .catch((err) => {
        if (fetchId === planFetchRef.current) {
          setSyncPlan(null);
          console.error('Failed to calculate sync plan:', err);
        }
      })
      .finally(() => {
        if (fetchId === planFetchRef.current) {
          setIsPlanLoading(false);
        }
      });
  }, [stampIds]);

  const handleSync = useCallback(async () => {
    if (!signer) {
      setErrorModal('Please connect your wallet first.');
      return;
    }

    setIsExecuting(true);
    setResult(null);
    setProgressState(null);

    try {
      const syncResult = await extendBulkStampDuration(signer, stampIds, 0, (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      });

      setResult(syncResult);

      if (syncResult.failed.length === 0) {
        onComplete();
      }
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err);
      setProgressState({ status: TOPUP_STATUS.ERROR, error: message });
      setErrorModal(message);
    } finally {
      setIsExecuting(false);
    }
  }, [signer, stampIds, onComplete]);

  const costDisplay = syncPlan ? formatBzzAmount(syncPlan.totalCostBzz.toDecimalString()) : null;
  const stampsToSync = syncPlan?.stampsNeedingTopUp.length ?? 0;

  return (
    <div className="bulk-stamp-sync-controls">
      <div className="bulk-stamp-sync-info">
        <span className="bulk-stamp-sync-title">Stamps out of sync</span>
        <p className="bulk-stamp-sync-description">
          Your stamps have a {formatDays(maxDriftDays)} expiration gap. Some stamps will expire before others, which can
          cause data loss if an expired stamp stops serving its content. Sync now to extend the behind stamps so all
          stamps expire at the same time.
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
          onClick={handleSync}
          disabled={isPlanLoading || !syncPlan || stampIds.length === 0}
          type="button"
        >
          Sync All Stamps
        </button>
      )}

      <BulkStampProgressDisplay
        status={progressState?.status ?? null}
        currentStampId={progressState?.stampId}
        currentIndex={progressState?.index}
        totalStamps={progressState?.total ?? stampIds.length}
        result={result}
        error={progressState?.error}
      />

      <SimpleModal isOpen={!!errorModal} title="Sync Error" onClose={() => setErrorModal(null)}>
        <p>{errorModal}</p>
      </SimpleModal>
    </div>
  );
}

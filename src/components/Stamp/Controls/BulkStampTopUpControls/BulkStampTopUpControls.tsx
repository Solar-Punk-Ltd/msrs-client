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
import { DaysSlider } from '../DaysSlider/DaysSlider';

import './BulkStampTopUpControls.scss';

interface BulkStampTopUpControlsProps {
  stampIds: string[];
  signer: ethers.Signer | null;
  onComplete: () => void;
}

interface ProgressState {
  status: TopUpStatus;
  stampId?: string;
  index?: number;
  total?: number;
  error?: string;
}

export function BulkStampTopUpControls({ stampIds, signer, onComplete }: BulkStampTopUpControlsProps) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [plan, setPlan] = useState<BulkStampTopUpPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<BulkStampTopUpResult | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planFetchRef = useRef(0);

  // Debounced plan calculation when selectedDays changes
  useEffect(() => {
    if (stampIds.length === 0) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const fetchId = ++planFetchRef.current;
      setIsPlanLoading(true);

      try {
        const newPlan = await calculateBulkStampTopUpPlan(stampIds, selectedDays);
        if (fetchId === planFetchRef.current) {
          setPlan(newPlan);
        }
      } catch (err) {
        if (fetchId === planFetchRef.current) {
          setPlan(null);
          console.error('Failed to calculate bulk stamp plan:', err);
        }
      } finally {
        if (fetchId === planFetchRef.current) {
          setIsPlanLoading(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [stampIds, selectedDays]);

  const handleExecute = useCallback(async () => {
    if (!signer) {
      setErrorModal('Please connect your wallet first.');
      return;
    }

    setIsExecuting(true);
    setResult(null);
    setProgressState(null);

    try {
      const bulkResult = await extendBulkStampDuration(signer, stampIds, selectedDays, (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      });

      setResult(bulkResult);

      if (bulkResult.failed.length === 0) {
        onComplete();
      }
    } catch (err) {
      const message = getUserFriendlyErrorMessage(err);
      setProgressState({ status: TOPUP_STATUS.ERROR, error: message });
      setErrorModal(message);
    } finally {
      setIsExecuting(false);
    }
  }, [signer, stampIds, selectedDays, onComplete]);

  const costDisplay = plan ? formatBzzAmount(plan.totalCostBzz.toDecimalString()) : null;

  return (
    <div className="bulk-stamp-topup-controls">
      <DaysSlider value={selectedDays} onChange={setSelectedDays} min={1} max={365} variant="bulk-stamp" />

      <div className="bulk-stamp-topup-cost-display">
        {isPlanLoading ? (
          <span className="calculating">Calculating cost...</span>
        ) : plan ? (
          <>
            <span className="cost">
              Cost: <strong>{costDisplay} BZZ</strong> for {plan.stampsNeedingTopUp.length} stamps &times;{' '}
              {selectedDays} days
            </span>
            {plan.preTopUpDrift > 0 && (
              <span className="drift-info">
                Includes drift correction of {formatDays(plan.preTopUpDrift)} to realign stamps
              </span>
            )}
          </>
        ) : (
          <span className="cost-error">Error calculating cost</span>
        )}
      </div>

      {!isExecuting && !progressState && (
        <button
          className="bulk-stamp-topup-button"
          onClick={handleExecute}
          disabled={isPlanLoading || !plan || stampIds.length === 0}
          type="button"
        >
          {`Top Up All (${selectedDays} Days)`}
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

      <SimpleModal isOpen={!!errorModal} title="Top Up Error" onClose={() => setErrorModal(null)}>
        <p>{errorModal}</p>
      </SimpleModal>
    </div>
  );
}

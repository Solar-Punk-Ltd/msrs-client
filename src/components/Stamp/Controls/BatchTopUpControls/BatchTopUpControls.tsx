import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import {
  BatchTopUpPlan,
  BatchTopUpResult,
  calculateBatchTopUpPlan,
  extendBatchStampDuration,
  TOPUP_STATUS,
  TopUpStatus,
} from '@/utils/network/stampTopup';
import { getUserFriendlyErrorMessage } from '@/utils/shared/errorHandling';
import { formatBzzAmount, formatDays } from '@/utils/ui/format';

import { BatchProgressDisplay } from '../../Panels/BatchProgressDisplay/BatchProgressDisplay';
import { DaysSlider } from '../DaysSlider/DaysSlider';

import './BatchTopUpControls.scss';

interface BatchTopUpControlsProps {
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

export function BatchTopUpControls({ stampIds, signer, onComplete }: BatchTopUpControlsProps) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [plan, setPlan] = useState<BatchTopUpPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<BatchTopUpResult | null>(null);
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
        const newPlan = await calculateBatchTopUpPlan(stampIds, selectedDays);
        if (fetchId === planFetchRef.current) {
          setPlan(newPlan);
        }
      } catch (err) {
        if (fetchId === planFetchRef.current) {
          setPlan(null);
          console.error('Failed to calculate batch plan:', err);
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
      const batchResult = await extendBatchStampDuration(signer, stampIds, selectedDays, (status, detail) => {
        setProgressState({
          status,
          stampId: detail.stampId,
          index: detail.index,
          total: detail.total,
          error: detail.error,
        });
      });

      setResult(batchResult);

      if (batchResult.failed.length === 0) {
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
    <div className="batch-topup-controls">
      <DaysSlider value={selectedDays} onChange={setSelectedDays} min={1} max={365} variant="batch" />

      <div className="batch-topup-cost-display">
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
          className="batch-topup-button"
          onClick={handleExecute}
          disabled={isPlanLoading || !plan || stampIds.length === 0}
          type="button"
        >
          {`Top Up All (${selectedDays} Days)`}
        </button>
      )}

      <BatchProgressDisplay
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

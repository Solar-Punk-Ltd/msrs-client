import { useState } from 'react';
import { ethers } from 'ethers';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { useBulkStampTopUpMutation } from '@/hooks/useBulkStampTopUpMutation';
import { useBulkStampTopUpPlan } from '@/hooks/useBulkStampTopUpPlan';
import { formatBzzAmount } from '@/utils/ui/format';

import { BulkStampProgressDisplay } from '../../Panels/BulkStampProgressDisplay/BulkStampProgressDisplay';
import { DaysSlider } from '../DaysSlider/DaysSlider';

import './BulkStampTopUpControls.scss';

interface BulkStampTopUpControlsProps {
  stampIds: string[];
  signer: ethers.Signer | null;
  onComplete: () => void;
}

export function BulkStampTopUpControls({ stampIds, signer, onComplete }: BulkStampTopUpControlsProps) {
  const [selectedDays, setSelectedDays] = useState(30);

  const { plan, isPlanLoading } = useBulkStampTopUpPlan(stampIds, selectedDays);
  const { execute, isExecuting, result, progressState, errorModal, clearErrorModal } = useBulkStampTopUpMutation({
    onComplete,
  });

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
              Cost: <strong>{costDisplay} BZZ</strong> for {plan.stampsNeedingTopUp.length} stamps
            </span>
            <span className="drift-info">Adds {selectedDays} days to all stamps</span>
          </>
        ) : (
          <span className="cost-error">Error calculating cost</span>
        )}
      </div>

      {!isExecuting && !progressState && (
        <button
          className="bulk-stamp-topup-button"
          onClick={() => execute(signer, stampIds, selectedDays)}
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

      <SimpleModal isOpen={!!errorModal} title="Top Up Error" onClose={clearErrorModal}>
        <p>{errorModal}</p>
      </SimpleModal>
    </div>
  );
}

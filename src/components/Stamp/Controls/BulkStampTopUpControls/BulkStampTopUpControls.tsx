import { useState } from 'react';

import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { useBulkStampTopUpMutation } from '@/hooks/useBulkStampTopUpMutation';
import { useBulkStampTopUpPlan } from '@/hooks/useBulkStampTopUpPlan';
import { formatBzzAmount } from '@/utils/ui/format';

import { BulkStampProgressDisplay } from '../../Panels/BulkStampProgressDisplay/BulkStampProgressDisplay';
import { DaysSlider } from '../DaysSlider/DaysSlider';

import './BulkStampTopUpControls.scss';

interface BulkStampTopUpControlsProps {
  stampIds: string[];
  onComplete: () => void;
}

export function BulkStampTopUpControls({ stampIds, onComplete }: BulkStampTopUpControlsProps) {
  const [selectedDays, setSelectedDays] = useState(30);

  const { plan, isPlanLoading } = useBulkStampTopUpPlan(stampIds, selectedDays);
  const { execute, isExecuting, progressState, errorModal, clearErrorModal } = useBulkStampTopUpMutation({
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
          onClick={() => execute(stampIds, selectedDays)}
          disabled={isPlanLoading || !plan || stampIds.length === 0}
          type="button"
        >
          {`Top Up All (${selectedDays} Days)`}
        </button>
      )}

      <BulkStampProgressDisplay
        status={progressState?.status ?? null}
        totalStamps={progressState?.total ?? stampIds.length}
        error={progressState?.error}
      />

      <SimpleModal isOpen={!!errorModal} title="Top Up Error" onClose={clearErrorModal}>
        <p>{errorModal}</p>
      </SimpleModal>
    </div>
  );
}

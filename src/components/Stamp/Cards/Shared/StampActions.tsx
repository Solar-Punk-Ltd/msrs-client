import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { calculateCostForDays, ExtensionDaysCalculation } from '@/utils/network/stampTopup';
import { formatBzzAmount } from '@/utils/ui/format';

import { DaysSlider } from '../../Controls/DaysSlider/DaysSlider';

import './StampActions.scss';

interface StampActionsProps {
  stampId: string;
  signer: ethers.Signer;
  onTopUp: (days: number) => Promise<void>;
  isLoading: boolean;
  variant?: 'default' | 'stream';
  externalExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function StampActions({
  stampId,
  signer,
  onTopUp,
  isLoading,
  variant = 'default',
  externalExpanded,
  onToggleExpanded,
}: StampActionsProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [selectedDays, setSelectedDays] = useState(1);

  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggleExpanded) {
      onToggleExpanded();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };
  const [costCalculation, setCostCalculation] = useState<ExtensionDaysCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (isExpanded && signer.provider) {
      setIsCalculating(true);
      calculateCostForDays(signer.provider, stampId, selectedDays)
        .then(setCostCalculation)
        .catch(console.error)
        .finally(() => setIsCalculating(false));
    }
  }, [isExpanded, selectedDays, stampId, signer.provider]);

  const handleTopUpClick = async () => {
    try {
      await onTopUp(selectedDays);
      // Close the expansion after successful topUp
      if (onToggleExpanded && isExpanded) {
        onToggleExpanded();
      } else if (!onToggleExpanded && internalExpanded) {
        setInternalExpanded(false);
      }
    } catch (error) {
      console.error('Error topping up stamp:', error);
    }
  };

  const classPrefix = variant === 'stream' ? 'stream-stamp' : 'stamp';

  return (
    <div className={`${classPrefix}-actions`}>
      <button className={`${classPrefix}-toggle-link`} onClick={handleToggle} type="button">
        {isExpanded ? 'Cancel top up' : 'Top up'}
      </button>

      {isExpanded && (
        <div className={`${classPrefix}-topup-section`}>
          <DaysSlider value={selectedDays} onChange={setSelectedDays} min={1} max={365} variant={variant} />

          <div className={`${classPrefix}-cost-display`}>
            {isCalculating ? (
              <span className="calculating">Calculating cost...</span>
            ) : costCalculation ? (
              <span className="cost">
                Cost: <strong>{formatBzzAmount(costCalculation.costString)} BZZ</strong> for {selectedDays} days
              </span>
            ) : (
              <span className="cost-error">Error calculating cost</span>
            )}
          </div>

          <button
            className={`${classPrefix}-button`}
            onClick={handleTopUpClick}
            disabled={isLoading || isCalculating || !costCalculation}
            type="button"
          >
            {isLoading ? 'Processing...' : `Top Up ${selectedDays} Days`}
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { formatBzzAmount } from '@/utils/format';
import { calculateCostForDays, ExtensionDaysCalculation } from '@/utils/stampTopup';

import './StampActions.scss';

interface StampActionsProps {
  stampId: string;
  signer: ethers.Signer;
  onTopUp: (days: number) => Promise<void>;
  isLoading: boolean;
  variant?: 'default' | 'stream';
}

export function StampActions({ stampId, signer, onTopUp, isLoading, variant = 'default' }: StampActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDays, setSelectedDays] = useState(10);
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
    await onTopUp(selectedDays);
    setIsExpanded(false);
  };

  const classPrefix = variant === 'stream' ? 'stream-stamp' : 'stamp';

  return (
    <div className={`${classPrefix}-actions`}>
      <button className={`${classPrefix}-toggle-link`} onClick={() => setIsExpanded(!isExpanded)} type="button">
        {isExpanded ? 'Cancel top-up' : 'Top-up'}
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

interface DaysSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  variant: 'default' | 'stream';
}

function DaysSlider({ value, onChange, min, max, variant }: DaysSliderProps) {
  const classPrefix = variant === 'stream' ? 'stream-days' : 'days';

  return (
    <div className={`${classPrefix}-slider`}>
      <label className="slider-label">
        Extension: <strong>{value} days</strong>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input"
      />
      <div className="slider-range">
        <span>
          {min} day{min !== 1 ? 's' : ''}
        </span>
        <span>{max} days</span>
      </div>
    </div>
  );
}

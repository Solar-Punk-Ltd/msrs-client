import './DaysSlider.scss';

export type DaysSliderVariant = 'default' | 'stream' | 'batch';

interface DaysSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  variant?: DaysSliderVariant;
}

export function DaysSlider({ value, onChange, min = 1, max = 365, variant = 'default' }: DaysSliderProps) {
  const variantPrefix: Record<DaysSliderVariant, string> = {
    default: 'days',
    stream: 'stream-days',
    batch: 'batch-days',
  };
  const classPrefix = variantPrefix[variant];

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

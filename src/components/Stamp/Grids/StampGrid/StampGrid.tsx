import { StampWithInfo } from '@/hooks/useStamps';

import { StampCard } from '../../Cards/StampCard/StampCard';

import './StampGrid.scss';

interface StampGridProps {
  title: string;
  stamps: StampWithInfo[];
  onStampRefresh?: (stampId: string) => Promise<void>;
}

export function StampGrid({ title, stamps, onStampRefresh }: StampGridProps) {
  return (
    <div className="stamp-category">
      <h3 className="stamp-category-title">{title}</h3>
      <div className="stamp-manager-grid">
        {stamps.map((stamp) => (
          <div key={stamp.stampId} className="stamp-wrapper">
            <StampCard stamp={stamp} onStampRefresh={onStampRefresh} />
          </div>
        ))}
      </div>
    </div>
  );
}

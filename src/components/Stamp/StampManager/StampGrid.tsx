import { ethers } from 'ethers';

import { StampWithInfo } from '@/hooks/useStamps';

import { StampCard } from '../StampCard/StampCard';

import './StampGrid.scss';

interface StampGridProps {
  title: string;
  stamps: StampWithInfo[];
  signer: ethers.Signer | null;
}

export function StampGrid({ title, stamps, signer }: StampGridProps) {
  return (
    <div className="stamp-category">
      <h3 className="stamp-category-title">{title}</h3>
      <div className="stamp-manager-grid">
        {stamps.map((stamp) => (
          <div key={stamp.stampId} className="stamp-wrapper">
            <StampCard
              stampId={stamp.stampId}
              stampInfo={stamp.stampInfo}
              error={stamp.error}
              signer={signer || undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

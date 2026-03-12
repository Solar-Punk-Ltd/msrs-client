import { WalletConnection } from '../../WalletConnection/WalletConnection';

import './StampManagerHeader.scss';

interface StampManagerHeaderProps {
  showInfo: boolean;
  onToggleInfo: () => void;
  showInfoButton: boolean;
}

export function StampManagerHeader({ showInfo, onToggleInfo, showInfoButton }: StampManagerHeaderProps) {
  return (
    <div className="stamp-manager-header">
      <div className="stamp-manager-title-section">
        <h2 className="stamp-manager-title">Swarm Stamp Manager</h2>
        {showInfoButton && (
          <button
            className="info-button"
            onClick={onToggleInfo}
            title="Learn more about stamps"
            aria-label="Toggle stamp information"
            aria-expanded={showInfo}
          >
            ℹ️
          </button>
        )}
      </div>
      <WalletConnection />
    </div>
  );
}

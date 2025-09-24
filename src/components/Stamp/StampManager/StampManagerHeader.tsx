import { WalletConnection } from '../../WalletConnection/WalletConnection';

import './StampManagerHeader.scss';

interface StampManagerHeaderProps {
  wallet: {
    account: string | null;
    connectionError: string | null;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
  };
  showInfo: boolean;
  onToggleInfo: () => void;
}

export function StampManagerHeader({ wallet, showInfo, onToggleInfo }: StampManagerHeaderProps) {
  return (
    <div className="stamp-manager-header">
      <div className="stamp-manager-title-section">
        <h2 className="stamp-manager-title">Swarm Stamp Manager</h2>
        <button
          className="info-button"
          onClick={onToggleInfo}
          title="Learn more about stamps"
          aria-label="Toggle stamp information"
          aria-expanded={showInfo}
        >
          ℹ️
        </button>
      </div>
      <WalletConnection {...wallet} />
    </div>
  );
}

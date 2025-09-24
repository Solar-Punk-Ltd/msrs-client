import { formatAddress } from '@/utils/format';

import './WalletConnection.scss';

interface WalletConnectionProps {
  account: string | null;
  connectionError: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function WalletConnection({
  account,
  connectionError,
  isConnecting,
  connect,
  disconnect,
}: WalletConnectionProps) {
  return (
    <div className="wallet-connection">
      {account ? (
        <div className="wallet-info">
          <span className="wallet-address">{formatAddress(account)}</span>
          <button className="btn btn-disconnect" onClick={disconnect} type="button">
            Disconnect
          </button>
        </div>
      ) : (
        <button className="btn btn-connect" onClick={connect} disabled={isConnecting} type="button">
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      )}
      {connectionError && (
        <div className="error-message" role="alert">
          {connectionError}
        </div>
      )}
    </div>
  );
}

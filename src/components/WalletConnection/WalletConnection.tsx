import { useWallet } from '@/providers/Wallet';
import { formatAddress } from '@/utils/format';

import './WalletConnection.scss';

export function WalletConnection() {
  const { account, isConnecting, isReconnecting, error, chainError, connect, disconnect, switchToGnosis } = useWallet();

  if (isReconnecting) {
    return (
      <div className="wallet-connection">
        <div className="wallet-status">
          <span className="status-text">Reconnecting...</span>
        </div>
      </div>
    );
  }

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

      {chainError && (
        <div className="network-error">
          <span className="error-text">Wrong network!</span>
          <button className="btn btn-switch" onClick={switchToGnosis} type="button">
            Switch to Gnosis
          </button>
        </div>
      )}

      {error && !chainError && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

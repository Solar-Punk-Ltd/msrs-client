import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

import { WalletService } from '@/utils/wallet';

import { StampCard } from '../StampCard/StampCard';

import './StampManager.scss';

const walletService = new WalletService();

export function StampManager() {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [stampIds, setStampIds] = useState<string[]>([
    '0xee4b3e6dafab78984af1fdfcf1009931688926c8d3018c7f3f8602bf4bc7d3c8',
  ]);
  const [newStampId, setNewStampId] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const publicProvider = walletService.getPublicProvider();
    setProvider(publicProvider);

    walletService.onAccountsChanged((...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAccount(accounts[0]);
      }
    });

    walletService.onChainChanged(() => {
      window.location.reload();
    });
  }, []);

  const handleConnect = async (): Promise<void> => {
    setConnectionError(null);
    try {
      const { provider, signer, account } = await walletService.connect();
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
    } catch (error: unknown) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handleDisconnect = (): void => {
    walletService.disconnect();
    setSigner(null);
    setAccount(null);

    const publicProvider = walletService.getPublicProvider();
    setProvider(publicProvider);
  };

  const addStampId = (): void => {
    const cleanId = newStampId.trim();

    if (!cleanId.startsWith('0x') || cleanId.length !== 66) {
      alert('Invalid stamp ID format. Must be 0x followed by 64 hex characters.');
      return;
    }

    if (stampIds.includes(cleanId)) {
      alert('This stamp ID is already in the list.');
      return;
    }

    setStampIds([...stampIds, cleanId]);
    setNewStampId('');
  };

  const removeStampId = (idToRemove: string): void => {
    setStampIds(stampIds.filter((id) => id !== idToRemove));
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addStampId();
    }
  };

  return (
    <div className="stamp-manager">
      <header className="stamp-manager-header">
        <div className="stamp-manager-title">
          <h1>Swarm Stamp Manager</h1>
          <p>Monitor and extend your Swarm storage stamps</p>
        </div>

        <div className="stamp-manager-wallet">
          {account ? (
            <div className="wallet-info">
              <span className="wallet-info-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <button className="btn btn-disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="btn btn-connect" onClick={handleConnect}>
              Connect MetaMask
            </button>
          )}
          {connectionError && <div className="error-message">{connectionError}</div>}
        </div>
      </header>

      <section className="stamp-manager-add-section">
        <div className="add-stamp">
          <input
            type="text"
            className="add-stamp-input"
            placeholder="Enter stamp ID (0x...)"
            value={newStampId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStampId(e.target.value)}
            onKeyPress={handleInputKeyPress}
          />
          <button className="btn btn-add" onClick={addStampId} disabled={!newStampId}>
            Add Stamp
          </button>
        </div>
      </section>

      {stampIds.length === 0 ? (
        <div className="stamp-manager-empty">
          <p>No stamps added yet. Add a stamp ID to get started.</p>
        </div>
      ) : (
        <section className="stamp-manager-grid">
          {stampIds.map((id) => (
            <div key={id} className="stamp-wrapper">
              {provider && <StampCard stampId={id} provider={provider} signer={signer || undefined} />}
              <button className="stamp-wrapper-remove" onClick={() => removeStampId(id)} title="Remove stamp">
                ×
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

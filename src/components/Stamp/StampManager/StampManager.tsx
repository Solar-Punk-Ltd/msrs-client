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
  const [stampIds] = useState<string[]>(['0xee4b3e6dafab78984af1fdfcf1009931688926c8d3018c7f3f8602bf4bc7d3c8']);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showInfoDropdown, setShowInfoDropdown] = useState<boolean>(false);

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

  return (
    <div className="stamp-manager">
      <div className="stamp-manager-header">
        <div className="stamp-manager-title-section">
          <h2 className="stamp-manager-title">Swarm Stamp Manager</h2>
          <button
            className="info-button"
            onClick={() => setShowInfoDropdown(!showInfoDropdown)}
            title="Learn more about stamps"
          >
            ℹ️
          </button>
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
      </div>

      {showInfoDropdown && (
        <div className="stamp-info-dropdown">
          <div className="stamp-info-content">
            <h3>Understanding MSRS Stamps</h3>
            <p>
              Stamps are required to keep data alive on the Swarm network. Within MSRS, stamps are managed through our
              Swarm gateway, but it is important to understand how they are used.
            </p>
            <p>
              The system relies on two categories of stamps. First, there are three public stamps that power the core
              application itself. These are responsible for feeds, notifications, and other essential features that
              allow MSRS to function properly.
            </p>
            <p>
              In addition, there are ten private stamps dedicated to streams. Each stream operates with two stamps: one
              manages the storage and distribution of media, while the other ensures that chat messages remain
              available.
            </p>
            <p>
              Whenever you want to make sure your creations stay visible and accessible on Swarm, you should top up the
              corresponding stamps. Keeping these stamps funded guarantees that both the application features and your
              streams continue to run without interruption.
            </p>
          </div>
        </div>
      )}

      <div className="stamp-manager-container">
        {stampIds.length === 0 ? (
          <div className="stamp-manager-grid empty">
            <p>No stamps added yet. Add a stamp ID to get started.</p>
          </div>
        ) : (
          <div className="stamp-manager-grid">
            {stampIds.map((id) => (
              <div key={id} className="stamp-wrapper">
                {provider && <StampCard stampId={id} provider={provider} signer={signer || undefined} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

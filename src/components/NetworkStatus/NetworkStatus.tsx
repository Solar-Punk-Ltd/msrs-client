import React from 'react';

import './NetworkStatus.scss';

interface NetworkStatusProps {
  isOnline: boolean;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ isOnline }) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className="network-status">
      <div className="network-status__content">
        <span className="network-status__message">
          Network connection lost. Please check your internet connection and try refreshing the page.
        </span>
      </div>
    </div>
  );
};

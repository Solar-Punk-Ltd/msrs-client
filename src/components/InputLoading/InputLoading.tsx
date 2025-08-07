import React from 'react';

import './InputLoading.scss';

export const InputLoading: React.FC = () => {
  return (
    <span id="chat-input-loading">
      <div className="chat-input-loading-square"></div>
      <div className="chat-input-loading-square"></div>
      <div className="chat-input-loading-square"></div>
    </span>
  );
};

import React from 'react';

import { CircleLoader } from '../CircleLoader/CircleLoader';

import './PageLoading.scss';

export const PageLoading: React.FC = () => {
  return (
    <div className="page-loading" data-testid="page-loading">
      <div className="page-loading-content">
        <CircleLoader size="large" />
      </div>
    </div>
  );
};

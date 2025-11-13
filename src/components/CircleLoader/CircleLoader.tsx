import React from 'react';

import './CircleLoader.scss';

interface CircleLoaderProps {
  size?: 'small' | 'medium' | 'large';
}

export const CircleLoader: React.FC<CircleLoaderProps> = ({ size = 'medium' }) => {
  return <div className={`circle-loader circle-loader--${size}`} data-testid="circle-loader" />;
};

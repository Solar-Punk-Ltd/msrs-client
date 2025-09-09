import React from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/routes';

import './NotFound.scss';

export function NotFound(): React.ReactElement {
  return (
    <div className="not-found">
      <div className="not-found__content">
        <h1 className="not-found__title">404</h1>
        <h2 className="not-found__subtitle">Page Not Found</h2>
        <p className="not-found__message">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link to={ROUTES.STREAM_BROWSER} className="not-found__link">
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

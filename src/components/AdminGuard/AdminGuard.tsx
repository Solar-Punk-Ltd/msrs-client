import React from 'react';

import { useUserContext } from '@/providers/User';

import './AdminGuard.scss';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { isAdmin, isLoading } = useUserContext();

  if (isLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <>
        {fallback || (
          <div className="unauthorized-warning">
            <h2>Unauthorized Access</h2>
            <p>You do not have permission to access this page</p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

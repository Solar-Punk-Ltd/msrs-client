import React from 'react';

import { useUserContext } from '@/providers/User';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback = null }: AdminGuardProps) {
  const { isAdmin } = useUserContext();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

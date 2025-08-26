import { useUserContext } from '@/providers/User';

export function useRequireAdmin() {
  const { isAdmin } = useUserContext();

  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}

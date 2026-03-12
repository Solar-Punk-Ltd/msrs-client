import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { BulkStampExpirationResult, loadBulkStampExpirations } from '@/utils/network/stampInfo';

interface UseBulkStampExpirationReturn {
  data: BulkStampExpirationResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBulkStampExpiration(stampIds: string[]): UseBulkStampExpirationReturn {
  const queryClient = useQueryClient();

  const serializedIds = JSON.stringify(stampIds);
  const stableStampIds: string[] = useMemo(() => stampIds, [serializedIds]);

  const query = useQuery({
    queryKey: ['bulk-stamp-expirations', serializedIds],
    queryFn: () => loadBulkStampExpirations(stableStampIds),
    enabled: stableStampIds.length > 0,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bulk-stamp-expirations'] });
  };

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Failed to load bulk stamp expirations'
      : null,
    refresh,
  };
}

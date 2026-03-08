import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BulkStampExpirationResult, loadBulkStampExpirations } from '@/utils/network/stampInfo';

interface UseBulkStampExpirationReturn {
  data: BulkStampExpirationResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBulkStampExpiration(stampIds: string[]): UseBulkStampExpirationReturn {
  const [data, setData] = useState<BulkStampExpirationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize stampIds by value to avoid infinite refetch
  const serialized = JSON.stringify(stampIds);
  const stableStampIds = useMemo(() => stampIds, [serialized]);

  const fetchRef = useRef(0);

  const load = useCallback(async () => {
    if (stableStampIds.length === 0) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchId = ++fetchRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadBulkStampExpirations(stableStampIds);
      if (fetchId === fetchRef.current) {
        setData(result);
      }
    } catch (err) {
      if (fetchId === fetchRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load bulk stamp expirations');
      }
    } finally {
      if (fetchId === fetchRef.current) {
        setIsLoading(false);
      }
    }
  }, [stableStampIds]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}

import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { BulkStampTopUpPlan, calculateBulkStampTopUpPlan } from '@/utils/network/stampTopup';

import { useDebouncedValue } from './useDebouncedValue';

interface UseBulkStampTopUpPlanReturn {
  plan: BulkStampTopUpPlan | null;
  isPlanLoading: boolean;
}

export function useBulkStampTopUpPlan(stampIds: string[], selectedDays: number): UseBulkStampTopUpPlanReturn {
  const serializedIds = JSON.stringify(stampIds);
  const stableStampIds: string[] = useMemo(() => stampIds, [serializedIds]);

  const debouncedDays = useDebouncedValue(selectedDays, 300);

  const query = useQuery({
    queryKey: ['bulk-stamp-topup-plan', serializedIds, debouncedDays],
    queryFn: () => calculateBulkStampTopUpPlan(stableStampIds, debouncedDays),
    enabled: stableStampIds.length > 0,
    placeholderData: keepPreviousData,
  });

  return {
    plan: query.data ?? null,
    isPlanLoading: query.isFetching,
  };
}

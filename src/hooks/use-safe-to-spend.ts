'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSafeToSpend } from '@/lib/api';

export const SAFE_TO_SPEND_QUERY_KEY = ['safe-to-spend'] as const;

export function getTodayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useSafeToSpend(referenceDate?: string) {
  const effectiveDate = referenceDate ?? getTodayLocalIsoDate();

  return useQuery({
    queryKey: [...SAFE_TO_SPEND_QUERY_KEY, effectiveDate],
    queryFn: () => fetchSafeToSpend(effectiveDate),
  });
}

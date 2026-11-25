'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AUTH_ME_QUERY_KEY } from '@/hooks/use-auth';
import { getTodayLocalIsoDate } from '@/hooks/use-safe-to-spend';
import {
  createReserveDeposit,
  createReserveWithdrawal,
  fetchReserve,
  updateReserveConfig,
} from '@/lib/api';
import {
  ACCOUNTS_QUERY_KEY,
  INVESTMENTS_QUERY_KEY,
  RESERVE_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';

export { RESERVE_QUERY_KEY };

export function useReserve(referenceDate?: string) {
  const effectiveDate = referenceDate ?? getTodayLocalIsoDate();

  return useQuery({
    queryKey: [...RESERVE_QUERY_KEY, effectiveDate],
    queryFn: () => fetchReserve(effectiveDate),
  });
}

export function useUpdateReserveConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReserveConfig,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

export function useCreateReserveDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReserveDeposit,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
      ]);
    },
  });
}

export function useCreateReserveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReserveWithdrawal,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
      ]);
    },
  });
}

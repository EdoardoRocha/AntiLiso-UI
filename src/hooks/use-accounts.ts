'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAccount, createTransfer, fetchAccounts, updateAccount } from '@/lib/api';
import {
  ACCOUNTS_QUERY_KEY,
  AUTH_ME_QUERY_KEY,
  RESERVE_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';

export { ACCOUNTS_QUERY_KEY };

export function useAccounts(includeInactive = false) {
  return useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, { includeInactive }],
    queryFn: () => fetchAccounts(includeInactive),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { nome?: string; ehContaPadrao?: boolean; ativa?: boolean };
    }) => updateAccount(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransfer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
      ]);
    },
  });
}

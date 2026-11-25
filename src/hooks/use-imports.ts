'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CATEGORIES_QUERY_KEY, LEARNING_RULES_QUERY_KEY } from '@/hooks/use-categories';
import { commitImport, previewImport } from '@/lib/api';
import {
  ACCOUNTS_QUERY_KEY,
  CREDIT_CARDS_QUERY_KEY,
  RESERVE_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';

export function usePreviewImport() {
  return useMutation({
    mutationFn: previewImport,
  });
}

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commitImport,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY }),
      ]);
    },
  });
}

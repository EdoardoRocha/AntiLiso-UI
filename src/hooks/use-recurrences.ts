'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecurrence,
  deleteRecurrence,
  fetchRecurrenceChecklist,
  fetchRecurrences,
  generateMonthlyRecurrences,
  updateRecurrence,
} from '@/lib/api';
import {
  CREDIT_CARDS_QUERY_KEY,
  RECURRENCES_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';

export { RECURRENCES_QUERY_KEY };

export function useRecurrences(includeInactive = true) {
  return useQuery({
    queryKey: [...RECURRENCES_QUERY_KEY, 'list', { includeInactive }],
    queryFn: () => fetchRecurrences(includeInactive),
  });
}

export function useRecurrenceChecklist(month: string) {
  return useQuery({
    queryKey: [...RECURRENCES_QUERY_KEY, 'checklist', month],
    queryFn: () => fetchRecurrenceChecklist(month),
  });
}

export function useCreateRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRecurrence,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

export function useUpdateRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        descricao?: string;
        valorEstimado?: number;
        diaVencimento?: number;
        categoriaId?: string;
        contaId?: string;
        cartaoId?: string;
        ativa?: boolean;
      };
    }) => updateRecurrence(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

export function useDeleteRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRecurrence,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

export function useGenerateRecurrences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateMonthlyRecurrences,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

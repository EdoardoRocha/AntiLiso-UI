'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayLocalIsoDate } from '@/hooks/use-safe-to-spend';
import {
  createCreditCard,
  deleteCreditCard,
  fetchCreditCardInvoice,
  fetchCreditCards,
  payCreditCardInvoice,
  updateCreditCard,
} from '@/lib/api';
import {
  ACCOUNTS_QUERY_KEY,
  CREDIT_CARDS_QUERY_KEY,
  RECURRENCES_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';

export { CREDIT_CARDS_QUERY_KEY };

export function useCreditCards(referenceDate?: string) {
  const effectiveDate = referenceDate ?? getTodayLocalIsoDate();

  return useQuery({
    queryKey: [...CREDIT_CARDS_QUERY_KEY, 'list', effectiveDate],
    queryFn: () => fetchCreditCards(effectiveDate),
  });
}

export function useCreditCardInvoice(
  cardId: string | null,
  month?: string,
  referenceDate?: string,
) {
  const effectiveDate = referenceDate ?? getTodayLocalIsoDate();

  return useQuery({
    queryKey: [...CREDIT_CARDS_QUERY_KEY, 'invoice', cardId, month ?? 'open', effectiveDate],
    queryFn: () => fetchCreditCardInvoice(cardId!, month, effectiveDate),
    enabled: Boolean(cardId),
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCreditCard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY });
    },
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        nome?: string;
        contaPagamentoId?: string;
        limiteTotal?: number;
        tetoMensalAlerta?: number;
        diaFechamento?: number;
        diaVencimento?: number;
      };
    }) => updateCreditCard(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY });
    },
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCreditCard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY });
    },
  });
}

export function usePayCreditCardInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      month,
      payload,
    }: {
      cardId: string;
      month: string;
      payload?: {
        contaPagamentoId?: string;
        dataPagamento?: string;
      };
    }) => payCreditCardInvoice(cardId, month, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

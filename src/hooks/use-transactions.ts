'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LEARNING_RULES_QUERY_KEY } from '@/hooks/use-categories';
import {
  ACCOUNTS_QUERY_KEY,
  CREDIT_CARDS_QUERY_KEY,
  RECURRENCES_QUERY_KEY,
  RESERVE_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';
import {
  ApiError,
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  quickAddTransaction,
  updateTransaction,
} from '@/lib/api';
import { enqueueOfflineTransaction } from '@/lib/offline-sync';
import { parseQuickAddTextClient } from '@/lib/quick-add-parser';
import type {
  CardCeilingAlert,
  ReserveSplitSuggestion,
  TransactionStatus,
  TransactionType,
} from '@/types/api';

export function getTodayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentLocalMonth(): string {
  return getTodayLocalIsoDate().slice(0, 7);
}

export interface TransactionFilters {
  month?: string;
  tipo?: TransactionType;
  status?: TransactionStatus;
  contaId?: string;
  cartaoId?: string;
  categoriaId?: string;
  search?: string;
  limit?: number;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, filters ?? {}],
    queryFn: () => fetchTransactions(filters),
  });
}

export type SmartTransactionInput =
  | {
      mode: 'quick';
      texto: string;
      tipo?: 'REC' | 'DESP';
      contaId?: string | null;
      cartaoId?: string | null;
      categoriaId?: string | null;
      dataCompetencia?: string;
      status?: TransactionStatus;
    }
  | {
      mode: 'manual';
      tipo: 'REC' | 'DESP';
      valor: number;
      descricao: string;
      contaId?: string | null;
      cartaoId?: string | null;
      categoriaId?: string | null;
      dataCompetencia?: string;
      status?: TransactionStatus;
    };

export function useSmartCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: SmartTransactionInput,
    ): Promise<{
      queuedOffline: boolean;
      categoriaNome?: string | null;
      cardAlert?: CardCeilingAlert | null;
      reserveSplitSuggestion?: ReserveSplitSuggestion | null;
    }> => {
      const clientRequestId = crypto.randomUUID();
      const dataCompetencia = input.dataCompetencia ?? getTodayLocalIsoDate();
      const statusPagamento = input.cartaoId ? 'PENDENTE' : (input.status ?? 'PAGO');

      const buildOfflinePayload = () => {
        if (input.mode === 'manual') {
          return {
            clientRequestId,
            tipo: input.tipo,
            valor: input.valor,
            descricao: input.descricao,
            categoriaId: input.categoriaId ?? null,
            contaId: input.cartaoId ? null : (input.contaId ?? null),
            cartaoId: input.cartaoId ?? null,
            dataCompetencia,
            statusPagamento,
          };
        }

        const parsed = parseQuickAddTextClient(input.texto);
        if (!parsed) {
          throw new Error('Não foi possível identificar um valor válido maior que zero no texto.');
        }

        return {
          clientRequestId,
          tipo: input.tipo ?? parsed.tipo,
          valor: parsed.valor,
          descricao: parsed.descricao,
          categoriaId: input.categoriaId ?? null,
          contaId: input.cartaoId ? null : (input.contaId ?? null),
          cartaoId: input.cartaoId ?? null,
          dataCompetencia,
          statusPagamento,
        };
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueOfflineTransaction(buildOfflinePayload());
        return { queuedOffline: true };
      }

      try {
        if (input.mode === 'quick') {
          const response = await quickAddTransaction({
            texto: input.texto,
            tipo: input.tipo,
            contaId: input.cartaoId ? null : input.contaId,
            cartaoId: input.cartaoId,
            categoriaId: input.categoriaId,
            dataCompetencia,
            status: input.cartaoId ? undefined : statusPagamento,
            clientRequestId,
          });
          return {
            queuedOffline: false,
            categoriaNome: response.transaction.categoriaNome,
            cardAlert: response.cardAlert ?? null,
            reserveSplitSuggestion: response.reserveSplitSuggestion ?? null,
          };
        } else {
          const response = await createTransaction({
            tipo: input.tipo,
            valor: input.valor,
            descricao: input.descricao,
            contaId: input.cartaoId ? null : input.contaId,
            cartaoId: input.cartaoId,
            categoriaId: input.categoriaId,
            dataCompetencia,
            status: input.cartaoId ? undefined : statusPagamento,
            clientRequestId,
          });
          return {
            queuedOffline: false,
            categoriaNome: response.transaction.categoriaNome,
            cardAlert: response.cardAlert ?? null,
            reserveSplitSuggestion: response.reserveSplitSuggestion ?? null,
          };
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        await enqueueOfflineTransaction(buildOfflinePayload());
        return { queuedOffline: true };
      }
    },
    onSuccess: async (result) => {
      if (!result.queuedOffline) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        ]);
      }
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        tipo?: 'REC' | 'DESP';
        valor?: number;
        descricao?: string;
        contaId?: string;
        cartaoId?: string;
        categoriaId?: string | null;
        dataCompetencia?: string;
        status?: TransactionStatus;
      };
    }) => updateTransaction(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RECURRENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
      ]);
    },
  });
}

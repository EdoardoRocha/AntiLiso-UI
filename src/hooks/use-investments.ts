'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPortfolioAssetContribution,
  calculateRebalance,
  createPortfolioAsset,
  deletePortfolioAsset,
  fetchInvestmentsOverview,
  simulateCompoundInterest,
  updatePortfolioAsset,
  updateTargetAllocations,
} from '@/lib/api';
import { INVESTMENTS_QUERY_KEY } from '@/lib/query-keys';
import type { AssetClass } from '@/types/api';

export function useInvestmentsOverview(valorAporte?: number) {
  return useQuery({
    queryKey: [...INVESTMENTS_QUERY_KEY, { valorAporte: valorAporte ?? null }],
    queryFn: () => fetchInvestmentsOverview(valorAporte),
  });
}

export function useUpdateTargetAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTargetAllocations,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
    },
  });
}

export function useCreatePortfolioAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPortfolioAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
    },
  });
}

export function useUpdatePortfolioAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        classeAtivo?: AssetClass;
        tickerOuNome?: string;
        quantidade?: number;
        valorInvestido?: number;
        saldoAtualMercado?: number;
      };
    }) => updatePortfolioAsset(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
    },
  });
}

export function useAddAssetContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        valorAporte: number;
        quantidadeAdicional?: number;
        saldoMercadoAdicional?: number;
      };
    }) => addPortfolioAssetContribution(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
    },
  });
}

export function useDeletePortfolioAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePortfolioAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVESTMENTS_QUERY_KEY });
    },
  });
}

export function useCalculateRebalance() {
  return useMutation({
    mutationFn: calculateRebalance,
  });
}

export function useSimulateCompoundInterest() {
  return useMutation({
    mutationFn: simulateCompoundInterest,
  });
}

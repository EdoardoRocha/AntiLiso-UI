'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  createLearningRule,
  deleteCategory,
  deleteLearningRule,
  fetchCategories,
  fetchCategorySuggestion,
  fetchLearningRules,
  updateCategory,
} from '@/lib/api';
import type { CategoryType } from '@/types/api';

export const CATEGORIES_QUERY_KEY = ['categories'] as const;
export const LEARNING_RULES_QUERY_KEY = ['categories', 'rules'] as const;

export function useCategories(tipo?: CategoryType) {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, { tipo: tipo ?? 'ALL' }],
    queryFn: () => fetchCategories(tipo ? { tipo } : undefined),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { nome?: string; ehEssencial?: boolean; orcamentoMensal?: number | null };
    }) => updateCategory(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY }),
      ]);
    },
  });
}

export function useCategorySuggestion(descricao: string, tipo: 'REC' | 'DESP', enabled: boolean) {
  const trimmed = descricao.trim();

  return useQuery({
    queryKey: ['categories', 'suggest', { descricao: trimmed, tipo }],
    queryFn: () => fetchCategorySuggestion(trimmed, tipo),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 10_000,
  });
}

export function useLearningRules() {
  return useQuery({
    queryKey: LEARNING_RULES_QUERY_KEY,
    queryFn: fetchLearningRules,
  });
}

export function useCreateLearningRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLearningRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY });
    },
  });
}

export function useDeleteLearningRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLearningRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LEARNING_RULES_QUERY_KEY });
    },
  });
}

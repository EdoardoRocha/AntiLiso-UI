'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayLocalIsoDate } from '@/hooks/use-safe-to-spend';
import { deleteAlert, fetchAlerts, markAlertRead, markAllAlertsRead, syncAlerts } from '@/lib/api';
import { ALERTS_QUERY_KEY } from '@/lib/query-keys';
import type { AlertType } from '@/types/api';

export function useAlerts(params?: {
  date?: string;
  unreadOnly?: boolean;
  tipo?: AlertType;
  autoSync?: boolean;
  enabled?: boolean;
}) {
  const effectiveDate = params?.date ?? getTodayLocalIsoDate();

  return useQuery({
    queryKey: [
      ...ALERTS_QUERY_KEY,
      {
        date: effectiveDate,
        unreadOnly: params?.unreadOnly ?? false,
        tipo: params?.tipo ?? 'ALL',
        autoSync: params?.autoSync ?? true,
      },
    ],
    queryFn: () =>
      fetchAlerts({
        date: effectiveDate,
        unreadOnly: params?.unreadOnly,
        tipo: params?.tipo,
        autoSync: params?.autoSync,
      }),
    enabled: params?.enabled ?? true,
  });
}

export function useSyncAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncAlerts,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lido }: { id: string; lido: boolean }) => markAlertRead(id, lido),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAlert,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
  });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ACCOUNTS_QUERY_KEY,
  CREDIT_CARDS_QUERY_KEY,
  RESERVE_QUERY_KEY,
  SAFE_TO_SPEND_QUERY_KEY,
  TRANSACTIONS_QUERY_KEY,
} from '@/lib/query-keys';
import type { PendingTransactionRecord } from '@/lib/offline-db';
import {
  OFFLINE_QUEUE_EVENT,
  discardPendingTransaction,
  listPendingTransactions,
  retryPendingTransaction,
  syncPendingTransactions,
} from '@/lib/offline-sync';

export { TRANSACTIONS_QUERY_KEY };

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingTransactionRecord[]>([]);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await listPendingTransactions();
      setPendingItems(items);
    } catch {
      setPendingItems([]);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await syncPendingTransactions();
      await refreshQueue();
      if (result.syncedCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
        ]);
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, refreshQueue]);

  const discardItem = useCallback(
    async (localId: number) => {
      await discardPendingTransaction(localId);
      await refreshQueue();
    },
    [refreshQueue],
  );

  const retryItem = useCallback(
    async (localId: number) => {
      setIsSyncing(true);
      try {
        const result = await retryPendingTransaction(localId);
        await refreshQueue();
        if (result.syncedCount > 0) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: RESERVE_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: SAFE_TO_SPEND_QUERY_KEY }),
          ]);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient, refreshQueue],
  );

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void refreshQueue();
    if (navigator.onLine) {
      void triggerSync();
    }

    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void triggerSync();
      }
    };

    const handleQueueChanged = () => {
      void refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChanged);
    };
  }, [refreshQueue, triggerSync]);

  const pendingCount = pendingItems.filter((item) => item.status === 'PENDING').length;
  const failedCount = pendingItems.filter((item) => item.status === 'FAILED').length;

  return {
    isOnline,
    isSyncing,
    pendingItems,
    pendingCount,
    failedCount,
    triggerSync,
    discardItem,
    retryItem,
  };
}

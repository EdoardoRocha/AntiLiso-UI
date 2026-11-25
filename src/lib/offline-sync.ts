import { ApiError, createTransaction } from '@/lib/api';
import { offlineDb, type PendingTransactionRecord } from '@/lib/offline-db';

export const OFFLINE_QUEUE_EVENT = 'antiliso-offline-queue-changed';

export function emitOfflineQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
  }
}

export async function enqueueOfflineTransaction(input: {
  clientRequestId: string;
  tipo: 'REC' | 'DESP';
  valor: number;
  descricao: string;
  categoriaId?: string | null;
  contaId?: string | null;
  cartaoId?: string | null;
  dataCompetencia: string;
  statusPagamento?: 'PAGO' | 'PENDENTE';
}): Promise<PendingTransactionRecord> {
  const existing = await offlineDb.pendingTransactions
    .where('clientRequestId')
    .equals(input.clientRequestId)
    .first();

  if (existing) {
    return existing;
  }

  const record: PendingTransactionRecord = {
    clientRequestId: input.clientRequestId,
    tipo: input.tipo,
    valor: input.valor,
    descricao: input.descricao,
    categoriaId: input.categoriaId ?? null,
    contaId: input.contaId ?? null,
    cartaoId: input.cartaoId ?? null,
    dataCompetencia: input.dataCompetencia,
    statusPagamento: input.statusPagamento ?? 'PAGO',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    lastError: null,
    retryCount: 0,
  };

  const localId = await offlineDb.pendingTransactions.add(record);
  emitOfflineQueueChanged();
  return { ...record, localId };
}

export async function listPendingTransactions(): Promise<PendingTransactionRecord[]> {
  return offlineDb.pendingTransactions.orderBy('createdAt').toArray();
}

export async function discardPendingTransaction(localId: number): Promise<void> {
  await offlineDb.pendingTransactions.delete(localId);
  emitOfflineQueueChanged();
}

let activeSyncPromise: Promise<{ syncedCount: number; failedCount: number }> | null = null;

export async function syncPendingTransactions(): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0 };
    }

    const pendingItems = await offlineDb.pendingTransactions
      .where('status')
      .equals('PENDING')
      .sortBy('createdAt');

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      if (item.localId === undefined) {
        continue;
      }

      try {
        await createTransaction({
          tipo: item.tipo,
          valor: item.valor,
          descricao: item.descricao,
          categoriaId: item.categoriaId,
          contaId: item.contaId,
          cartaoId: item.cartaoId ?? null,
          dataCompetencia: item.dataCompetencia,
          status: item.statusPagamento,
          clientRequestId: item.clientRequestId,
        });

        await offlineDb.pendingTransactions.delete(item.localId);
        syncedCount += 1;
        emitOfflineQueueChanged();
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401 || error.status >= 500) {
            break;
          }

          await offlineDb.pendingTransactions.update(item.localId, {
            status: 'FAILED',
            lastError: error.message,
            retryCount: item.retryCount + 1,
          });
          failedCount += 1;
          emitOfflineQueueChanged();
          continue;
        }

        break;
      }
    }

    return { syncedCount, failedCount };
  })().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

export async function retryPendingTransaction(localId: number): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  await offlineDb.pendingTransactions.update(localId, {
    status: 'PENDING',
    lastError: null,
  });
  emitOfflineQueueChanged();
  return syncPendingTransactions();
}

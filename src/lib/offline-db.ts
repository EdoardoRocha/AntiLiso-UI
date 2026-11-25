import Dexie, { type EntityTable } from 'dexie';

export type OfflineQueueStatus = 'PENDING' | 'FAILED';

export interface PendingTransactionRecord {
  localId?: number;
  clientRequestId: string;
  tipo: 'REC' | 'DESP';
  valor: number;
  descricao: string;
  categoriaId: string | null;
  contaId: string | null;
  cartaoId?: string | null;
  dataCompetencia: string;
  statusPagamento: 'PAGO' | 'PENDENTE';
  createdAt: string;
  status: OfflineQueueStatus;
  lastError: string | null;
  retryCount: number;
}

class AntiLisoOfflineDB extends Dexie {
  pendingTransactions!: EntityTable<PendingTransactionRecord, 'localId'>;

  constructor() {
    super('antiliso_offline_db');
    this.version(1).stores({
      pendingTransactions: '++localId, clientRequestId, createdAt, synced',
    });
    this.version(2)
      .stores({
        pendingTransactions: '++localId, &clientRequestId, createdAt, status',
      })
      .upgrade(async (tx) => {
        await tx.table('pendingTransactions').clear();
      });
  }
}

export const offlineDb = new AntiLisoOfflineDB();

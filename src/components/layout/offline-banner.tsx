'use client';

import { RefreshCw, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/use-offline-sync';

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, failedCount, triggerSync } = useOfflineSync();

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
        <div>
          {!isOnline ? (
            <span className="font-medium">
              Modo offline ativo — novos lançamentos ficam salvos no dispositivo
              {pendingCount > 0 ? ` (${pendingCount} na fila)` : ''}.
            </span>
          ) : (
            <span className="font-medium">
              {pendingCount > 0 && `${pendingCount} lançamento(s) aguardando sincronização. `}
              {failedCount > 0 && `${failedCount} lançamento(s) com falha na fila.`}
            </span>
          )}
        </div>
      </div>

      {isOnline && (pendingCount > 0 || failedCount > 0) && (
        <button
          type="button"
          onClick={() => void triggerSync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      )}
    </div>
  );
}

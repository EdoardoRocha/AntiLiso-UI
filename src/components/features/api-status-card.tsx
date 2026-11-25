'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { fetchHealth } from '@/lib/api';

export function ApiStatusCard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['api-health'],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-medium text-zinc-200">Status da API</h2>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Verificar
        </button>
      </div>

      <div className="mt-3 text-sm">
        {isLoading ? (
          <p className="text-zinc-400">Consultando /health...</p>
        ) : isError || !data ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium">Backend offline ou inacessível</p>
              <p className="mt-0.5 text-xs text-amber-300/80">
                Inicie o servidor em Backend (`npm run dev`) para validar o endpoint `/health`.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <p className="font-medium">
                API: {data.status.toUpperCase()} • Banco: {data.database.toUpperCase()}
              </p>
              <p className="mt-0.5 font-mono text-xs text-emerald-300/80">{data.timestamp}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

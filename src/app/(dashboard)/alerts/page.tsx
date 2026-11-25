'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Clock, Flame, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import {
  useAlerts,
  useDeleteAlert,
  useMarkAlertRead,
  useMarkAllAlertsRead,
  useSyncAlerts,
} from '@/hooks/use-alerts';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { AlertChannel, AlertType } from '@/types/api';

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) {
    return isoDate;
  }
  return `${d}/${m}/${y}`;
}

function formatDateTimeBr(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return isoDateTime;
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const ALERT_TYPE_UI: Record<AlertType, { label: string; badgeClass: string; Icon: typeof Clock }> =
  {
    VENC: {
      label: 'Vencimento 48h',
      badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      Icon: Clock,
    },
    ORCAM: {
      label: 'Orçamento ≥ 80%',
      badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
      Icon: Flame,
    },
    RESUMO: {
      label: 'Resumo Semanal',
      badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      Icon: Sparkles,
    },
  };

export default function AlertsPage() {
  const [tipoFilter, setTipoFilter] = useState<AlertType | undefined>(undefined);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [canalSync, setCanalSync] = useState<AlertChannel>('PUSH');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useAlerts({
    tipo: tipoFilter,
    unreadOnly,
    autoSync: true,
  });

  const syncMutation = useSyncAlerts();
  const markReadMutation = useMarkAlertRead();
  const markAllMutation = useMarkAllAlertsRead();
  const deleteMutation = useDeleteAlert();

  async function handleSyncNow() {
    setFeedback(null);
    try {
      const res = await syncMutation.mutateAsync({ canal: canalSync });
      setFeedback(
        res.createdCount > 0
          ? `${res.createdCount} novo(s) alerta(s) proativo(s) registrado(s) no canal ${canalSync}.`
          : 'Nenhum novo alerta pendente no momento.',
      );
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao sincronizar alertas.');
    }
  }

  async function handleToggleRead(id: string, current: boolean) {
    setFeedback(null);
    try {
      await markReadMutation.mutateAsync({ id, lido: !current });
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao atualizar leitura.');
    }
  }

  async function handleReadAll() {
    setFeedback(null);
    try {
      const res = await markAllMutation.mutateAsync();
      setFeedback(`${res.updatedCount} alerta(s) marcado(s) como lido(s).`);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao marcar alertas.');
    }
  }

  async function handleDelete(id: string) {
    setFeedback(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao remover alerta.');
    }
  }

  const digest = data?.weeklyDigest;
  const alerts = data?.alerts ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">
            Alertas Proativos &amp; Resumo Semanal
          </h1>
          <p className="text-sm text-zinc-400">
            Contas vencendo em 48h, consumo acima de 80% do orçamento e balanço consolidado dos
            últimos 7 dias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Canal de notificação"
            value={canalSync}
            onChange={(e) => setCanalSync(e.target.value as AlertChannel)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="PUSH">Canal: Push</option>
            <option value="EMAIL">Canal: E-mail</option>
            <option value="WHATS">Canal: WhatsApp</option>
          </select>

          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => void handleSyncNow()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Verificar Agora
          </button>
        </div>
      </header>

      {feedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Resumo Semanal Consolidado */}
      {digest && (
        <section className="space-y-4 rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/30 via-zinc-900/85 to-zinc-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Resumo Semanal ({digest.isoWeek}) • {formatDateBr(digest.periodStart)} a{' '}
              {formatDateBr(digest.periodEnd)}
            </div>
            <Link href="/" className="text-xs font-medium text-emerald-400 hover:underline">
              Ver Safe-to-Spend →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
              <p className="text-[11px] text-zinc-400">Entrou na semana (7d)</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400 tabular-nums">
                {formatCurrency(digest.receitas7d)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
              <p className="text-[11px] text-zinc-400">Saiu na semana (7d)</p>
              <p className="mt-1 text-lg font-semibold text-rose-400 tabular-nums">
                {formatCurrency(digest.despesas7d)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
              <p className="text-[11px] text-zinc-400">Maior categoria (7d)</p>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-100">
                {digest.maiorCategoriaSemana
                  ? `${digest.maiorCategoriaSemana.nome} (${formatCurrency(digest.maiorCategoriaSemana.valor)})`
                  : 'Sem gastos categorizados'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
              <p className="text-[11px] text-zinc-400">Safe-to-Spend hoje</p>
              <p className="mt-1 text-lg font-semibold text-zinc-50 tabular-nums">
                {formatCurrency(digest.quantoPossoGastarHoje)}
              </p>
              <p className="text-[11px] text-zinc-500">
                {digest.contasVencendo48hCount} vencimento(s) em 48h
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Filtros & Ações */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: undefined, label: 'Todos' },
              { key: 'VENC', label: 'Vencimentos 48h' },
              { key: 'ORCAM', label: 'Orçamentos ≥ 80%' },
              { key: 'RESUMO', label: 'Resumos' },
            ] as const
          ).map((tab) => {
            const active = tipoFilter === tab.key;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setTipoFilter(tab.key)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly((prev) => !prev)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              unreadOnly
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Não lidos ({unreadCount})
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markAllMutation.isPending}
              onClick={() => void handleReadAll()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todos como lidos
            </button>
          )}
        </div>
      </section>

      {/* Fila de Notificações */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        {isLoading ? (
          <div className="p-6 text-sm text-zinc-400">Avaliando alertas proativos...</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Bell className="h-8 w-8 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">
              Nenhum alerta encontrado neste filtro.
            </p>
            <p className="text-xs text-zinc-500">Suas contas e orçamentos estão sob controle!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {alerts.map((alert) => {
              const ui = ALERT_TYPE_UI[alert.tipoAlerta];
              const Icon = ui.Icon;
              return (
                <div
                  key={alert.id}
                  className={`flex flex-wrap items-start justify-between gap-3 p-4 transition ${
                    alert.lido ? 'bg-zinc-950/50 opacity-70' : 'bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${ui.badgeClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ui.badgeClass}`}
                        >
                          {ui.label}
                        </span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                          {alert.canal}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {formatDateTimeBr(alert.enviadoEm)}
                        </span>
                        {!alert.lido && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400" title="Não lido" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-100">
                        {alert.mensagem.replace(/^\[(?:VENC|ORCAM|RESUMO)[^\]]*\]\s*/, '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={alert.lido ? 'Marcar como não lido' : 'Marcar como lido'}
                      onClick={() => void handleToggleRead(alert.id, alert.lido)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {alert.lido ? 'Reabrir' : 'Lido'}
                    </button>
                    <button
                      type="button"
                      title="Excluir alerta"
                      onClick={() => void handleDelete(alert.id)}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-rose-300 hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { formatCurrency } from '@/lib/format';
import type { SafeToSpendStatus } from '@/types/api';

const STATUS_UI: Record<
  SafeToSpendStatus,
  {
    badge: string;
    containerClass: string;
    badgeClass: string;
    valueClass: string;
  }
> = {
  SAUDAVEL: {
    badge: 'Ritmo saudável',
    containerClass:
      'border-emerald-900/60 bg-gradient-to-br from-emerald-950/35 via-zinc-900/80 to-zinc-900',
    badgeClass: 'border-emerald-800/70 bg-emerald-950/70 text-emerald-300',
    valueClass: 'text-emerald-400',
  },
  ATENCAO: {
    badge: 'Ritmo apertado',
    containerClass:
      'border-amber-900/60 bg-gradient-to-br from-amber-950/30 via-zinc-900/80 to-zinc-900',
    badgeClass: 'border-amber-800/70 bg-amber-950/70 text-amber-300',
    valueClass: 'text-amber-300',
  },
  ESGOTADO: {
    badge: 'Limite do ciclo atingido',
    containerClass:
      'border-rose-900/60 bg-gradient-to-br from-rose-950/30 via-zinc-900/80 to-zinc-900',
    badgeClass: 'border-rose-800/70 bg-rose-950/70 text-rose-300',
    valueClass: 'text-zinc-100',
  },
  SEM_RECEITA: {
    badge: 'Aguardando receita',
    containerClass: 'border-zinc-800 bg-zinc-900/70',
    badgeClass: 'border-zinc-700 bg-zinc-800 text-zinc-300',
    valueClass: 'text-zinc-200',
  },
};

function normalizeBarWidths(
  values: [number, number, number, number],
  totalBase: number,
): [number, number, number, number] {
  const sum = values[0] + values[1] + values[2] + values[3];
  const denominator = Math.max(totalBase, sum);
  if (denominator <= 0) {
    return [0, 0, 0, 0];
  }
  return [
    Math.min(100, (values[0] / denominator) * 100),
    Math.min(100, (values[1] / denominator) * 100),
    Math.min(100, (values[2] / denominator) * 100),
    Math.min(100, (values[3] / denominator) * 100),
  ];
}

export function SafeToSpendCard() {
  const { data, isLoading, isError, refetch } = useSafeToSpend();
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <section className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="h-4 w-44 rounded bg-zinc-800" />
        <div className="mt-4 h-10 w-56 rounded bg-zinc-800" />
        <div className="mt-4 h-3 w-full rounded bg-zinc-800" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex items-center gap-2.5 text-sm text-zinc-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Não foi possível calcular o limite diário Base Zero agora.
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      </section>
    );
  }

  const ui = STATUS_UI[data.status];
  const { breakdown, partition } = data;

  const [fixasWidth, reservaWidth, variaveisWidth, livreWidth] = normalizeBarWidths(
    [
      partition.fixas.valor,
      partition.reserva.valor,
      partition.variaveis.valor,
      partition.livre.valor,
    ],
    breakdown.receitasMes,
  );

  const diasLabel =
    data.diasRestantes === 1 ? 'último dia do ciclo' : `faltam ${data.diasRestantes} dias`;

  return (
    <section className={`rounded-2xl border p-6 transition-colors ${ui.containerClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Quanto posso gastar hoje
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Ciclo {data.month} &middot; {diasLabel}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${ui.badgeClass}`}
        >
          {data.status === 'SAUDAVEL' && <ShieldCheck className="h-3.5 w-3.5" />}
          {data.status === 'ATENCAO' && <AlertTriangle className="h-3.5 w-3.5" />}
          {(data.status === 'ESGOTADO' || data.status === 'SEM_RECEITA') && (
            <Info className="h-3.5 w-3.5" />
          )}
          {ui.badge}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span
          className={`text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${ui.valueClass}`}
        >
          {formatCurrency(data.quantoPossoGastarHoje)}
        </span>
        <span className="text-sm text-zinc-400">/ dia</span>
      </div>

      {data.status === 'ESGOTADO' && (
        <p className="mt-2 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
          Sua margem livre deste mês foi consumida ({formatCurrency(data.saldoDiarioReal)}/dia
          real). Sem culpa: no próximo ciclo o indicador recomeça zerado, sem carregar saldo
          negativo.
        </p>
      )}

      {data.status === 'SEM_RECEITA' && (
        <p className="mt-2 text-xs text-zinc-400">
          Registre uma receita no mês (ex.: salário ou renda extra) para liberar a partição Base
          Zero.
        </p>
      )}

      {(data.status === 'SAUDAVEL' || data.status === 'ATENCAO') && (
        <p className="mt-2 text-xs text-zinc-400">
          Saldo livre restante no mês:{' '}
          <strong className="font-medium text-zinc-200 tabular-nums">
            {formatCurrency(data.saldoLivreMes)}
          </strong>{' '}
          dividido por {data.diasRestantes}{' '}
          {data.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}.
        </p>
      )}

      {/* Partição Base Zero */}
      <div className="mt-5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          {fixasWidth > 0 && (
            <div
              className="bg-sky-500 transition-all"
              style={{ width: `${fixasWidth}%` }}
              title={`Fixas: ${formatCurrency(partition.fixas.valor)}`}
            />
          )}
          {reservaWidth > 0 && (
            <div
              className="bg-indigo-500 transition-all"
              style={{ width: `${reservaWidth}%` }}
              title={`Reserva: ${formatCurrency(partition.reserva.valor)}`}
            />
          )}
          {variaveisWidth > 0 && (
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${variaveisWidth}%` }}
              title={`Variáveis: ${formatCurrency(partition.variaveis.valor)}`}
            />
          )}
          {livreWidth > 0 && (
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${livreWidth}%` }}
              title={`Livre: ${formatCurrency(partition.livre.valor)}`}
            />
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Fixas
            </div>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(partition.fixas.valor)}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {partition.fixas.percentualReceita.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Reserva
            </div>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(partition.reserva.valor)}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {partition.reserva.percentualReceita.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Variáveis
            </div>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(partition.variaveis.valor)}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {partition.variaveis.percentualReceita.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Livre
            </div>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(partition.livre.valor)}
            </p>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {partition.livre.percentualReceita.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-800/70 pt-3">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100"
        >
          {showDetails ? (
            <>
              Ocultar memória de cálculo
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ver memória de cálculo
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>

        {showDetails && (
          <dl className="mt-3 space-y-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 text-xs">
            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <dt>
                (+) Receitas do mês
                {breakdown.receitasPendentes > 0 && (
                  <span className="ml-1 text-zinc-500">
                    (pendentes: {formatCurrency(breakdown.receitasPendentes)})
                  </span>
                )}
              </dt>
              <dd className="font-medium text-emerald-400 tabular-nums">
                {formatCurrency(breakdown.receitasMes)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <dt>
                (-) Contas fixas do mês{' '}
                <span className="text-zinc-500">
                  (pagas: {formatCurrency(breakdown.contasFixasPagas)} &middot; pendentes:{' '}
                  {formatCurrency(breakdown.contasFixasPendentes)})
                </span>
              </dt>
              <dd className="font-medium text-zinc-200 tabular-nums">
                {formatCurrency(breakdown.contasFixasTotal)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <dt>
                (-) Pague-se Primeiro ({breakdown.pctPaguePrimeiro}%)
                {breakdown.aportesLiquidosReservaMes > breakdown.metaReservaPlanejada && (
                  <span className="ml-1 text-zinc-500">
                    (aportes líquidos: {formatCurrency(breakdown.aportesLiquidosReservaMes)})
                  </span>
                )}
              </dt>
              <dd className="font-medium text-zinc-200 tabular-nums">
                {formatCurrency(breakdown.reservaComprometidaMes)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <dt>(-) Gastos variáveis realizados</dt>
              <dd className="font-medium text-zinc-200 tabular-nums">
                {formatCurrency(breakdown.gastosVariaveisRealizados)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-1.5 font-medium text-zinc-100">
              <dt>
                (=) Saldo livre no mês (&divide; {data.diasRestantes}{' '}
                {data.diasRestantes === 1 ? 'dia' : 'dias'})
              </dt>
              <dd
                className={`tabular-nums ${
                  data.saldoLivreMes >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(data.saldoLivreMes)}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}

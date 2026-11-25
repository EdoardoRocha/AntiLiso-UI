'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useCreateReserveDeposit,
  useCreateReserveWithdrawal,
  useReserve,
  useUpdateReserveConfig,
} from '@/hooks/use-reserve';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

function formatMonthLabel(monthIso: string): string {
  const [yearStr, monthStr] = monthIso.split('-');
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 15));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateTimeBr(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function parseMoneyInput(raw: string): number {
  const normalized = raw.trim().includes(',')
    ? raw.trim().replace(/\./g, '').replace(',', '.')
    : raw.trim();
  return Number(Number(normalized).toFixed(2));
}

export default function ReservePage() {
  const { data: overview, isLoading } = useReserve();
  const { data: accounts = [] } = useAccounts();

  const updateConfigMutation = useUpdateReserveConfig();
  const depositMutation = useCreateReserveDeposit();
  const withdrawalMutation = useCreateReserveWithdrawal();

  const liquidAccounts = accounts.filter((a) => a.ativa && !a.ehCofreReserva && a.tipo !== 'COFRE');
  const defaultLiquidAccountId =
    liquidAccounts.find((a) => a.ehContaPadrao)?.id ?? liquidAccounts[0]?.id ?? '';

  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositValorStr, setDepositValorStr] = useState('');
  const [depositDescricao, setDepositDescricao] = useState('');

  const [withdrawAccountId, setWithdrawAccountId] = useState('');
  const [withdrawValorStr, setWithdrawValorStr] = useState('');
  const [step1Confirmed, setStep1Confirmed] = useState(false);
  const [justificativaResgate, setJustificativaResgate] = useState('');

  const [custoOverride, setCustoOverride] = useState<string | null>(null);
  const [mesesOverride, setMesesOverride] = useState<number | null>(null);
  const [pctOverride, setPctOverride] = useState<string | null>(null);
  const [gatilhoOverride, setGatilhoOverride] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="h-44 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/70" />
      </div>
    );
  }

  const { thermometer, monthlyPriority, calculatorSuggestion } = overview;

  const custoStr = custoOverride ?? String(overview.custoVidaMensal);
  const mesesAlvo = mesesOverride ?? overview.mesesReservaAlvo;
  const pctStr = pctOverride ?? String(overview.pctPaguePrimeiro);
  const gatilhoStr = gatilhoOverride ?? String(overview.gatilhoInvestPct);

  const parsedCusto = parseMoneyInput(custoStr);
  const previewMeta =
    Number.isFinite(parsedCusto) && parsedCusto >= 0 ? parsedCusto * mesesAlvo : 0;

  const parsedWithdraw = parseMoneyInput(withdrawValorStr);
  const hasValidWithdrawAmount =
    Number.isFinite(parsedWithdraw) &&
    parsedWithdraw > 0 &&
    parsedWithdraw <= overview.saldoAcumulado;

  const simSaldoDepois = hasValidWithdrawAmount
    ? Math.max(0, Number((overview.saldoAcumulado - parsedWithdraw).toFixed(2)))
    : overview.saldoAcumulado;
  const simPctDepois =
    overview.valorMetaCalculado > 0
      ? Number(((simSaldoDepois / overview.valorMetaCalculado) * 100).toFixed(2))
      : 0;
  const simMesesAntes =
    overview.custoVidaMensal > 0
      ? Number((overview.saldoAcumulado / overview.custoVidaMensal).toFixed(2))
      : 0;
  const simMesesDepois =
    overview.custoVidaMensal > 0
      ? Number((simSaldoDepois / overview.custoVidaMensal).toFixed(2))
      : 0;
  const simMesesPerdidos = Number(Math.max(0, simMesesAntes - simMesesDepois).toFixed(2));
  const simRequiredTriggerAmount = Number(
    (overview.valorMetaCalculado * (overview.gatilhoInvestPct / 100)).toFixed(2),
  );
  const simPerderaGatilho =
    overview.statusGatilho === 'LIBERADO' &&
    (overview.valorMetaCalculado <= 0 || simSaldoDepois < simRequiredTriggerAmount);

  const trimmedJustificativa = justificativaResgate.trim();

  async function handleQuickDeposit(valor: number, descricao?: string) {
    setFeedback(null);
    try {
      await depositMutation.mutateAsync({
        contaOrigemId: depositAccountId || defaultLiquidAccountId || undefined,
        valor,
        descricao,
      });
      setDepositValorStr('');
      setDepositDescricao('');
      setFeedback({
        kind: 'ok',
        text: `Aporte de ${formatCurrency(valor)} blindado no Cofre com sucesso!`,
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao registrar aporte na reserva.',
      });
    }
  }

  async function handleDepositSubmit(event: FormEvent) {
    event.preventDefault();
    const valor = parseMoneyInput(depositValorStr);
    if (!Number.isFinite(valor) || valor <= 0) {
      setFeedback({ kind: 'err', text: 'Informe um valor de aporte maior que zero.' });
      return;
    }
    await handleQuickDeposit(valor, depositDescricao.trim() || undefined);
  }

  async function handleWithdrawalSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!hasValidWithdrawAmount) {
      setFeedback({
        kind: 'err',
        text: 'Informe um valor de resgate válido dentro do saldo acumulado no Cofre.',
      });
      return;
    }
    if (!step1Confirmed || trimmedJustificativa.length < 15) {
      setFeedback({
        kind: 'err',
        text: 'Complete a confirmação em duas etapas e informe justificativa com ao menos 15 caracteres.',
      });
      return;
    }

    try {
      const result = await withdrawalMutation.mutateAsync({
        contaDestinoId: withdrawAccountId || defaultLiquidAccountId || undefined,
        valor: parsedWithdraw,
        justificativaResgate: trimmedJustificativa,
        confirmacaoDuasEtapas: true,
      });
      setWithdrawValorStr('');
      setStep1Confirmed(false);
      setJustificativaResgate('');
      setFeedback({
        kind: 'ok',
        text: result.impact.perdeuGatilhoInvestimentos
          ? `Resgate de ${formatCurrency(parsedWithdraw)} registrado e auditado. Atenção: o gatilho de investimentos voltou para BLOQUEADO.`
          : `Resgate de ${formatCurrency(parsedWithdraw)} transferido para sua conta líquida e registrado para auditoria.`,
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Não foi possível concluir o resgate.',
      });
    }
  }

  async function handleSaveConfig(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const custo = parseMoneyInput(custoStr);
    const pct = parseMoneyInput(pctStr);
    const gatilho = parseMoneyInput(gatilhoStr);

    if (
      !Number.isFinite(custo) ||
      custo < 0 ||
      !Number.isFinite(pct) ||
      pct < 0 ||
      pct > 100 ||
      !Number.isFinite(gatilho) ||
      gatilho < 0 ||
      gatilho > 100
    ) {
      setFeedback({ kind: 'err', text: 'Verifique os valores numéricos da calculadora.' });
      return;
    }

    try {
      await updateConfigMutation.mutateAsync({
        custoVidaMensal: custo,
        mesesReservaAlvo: mesesAlvo,
        pctPaguePrimeiro: pct,
        gatilhoInvestPct: gatilho,
      });
      setCustoOverride(null);
      setMesesOverride(null);
      setPctOverride(null);
      setGatilhoOverride(null);
      setFeedback({
        kind: 'ok',
        text: 'Calculadora atualizada e meta/gatilho da reserva recalculados!',
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar parâmetros da reserva.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Reserva de Emergência &amp; Cofre</h1>
          <p className="text-sm text-zinc-400">
            Blindagem comportamental e prioridade absoluta enquanto a meta não for atingida.
          </p>
        </div>

        <Link
          href="/investments"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
            overview.statusGatilho === 'LIBERADO'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
          }`}
        >
          {overview.statusGatilho === 'LIBERADO' ? (
            <Unlock className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          Investimentos: {overview.statusGatilho}
        </Link>
      </header>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Termômetro Visual */}
      <section className="rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/30 via-zinc-900/80 to-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Termômetro de Segurança
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-50 tabular-nums">
                {formatCurrency(overview.saldoAcumulado)}
              </span>
              <span className="text-sm text-zinc-400 tabular-nums">
                de {formatCurrency(overview.valorMetaCalculado)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">
              {thermometer.percentualConcluido.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-400 tabular-nums">
              {thermometer.mesesSegurancaCobertos.toFixed(1)} de {thermometer.mesesAlvo} meses
              cobertos
            </p>
          </div>
        </div>

        <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, thermometer.percentualConcluido)}%` }}
          />
          {overview.gatilhoInvestPct > 0 && overview.gatilhoInvestPct < 100 && (
            <div
              className="absolute inset-y-0 w-0.5 bg-amber-300"
              style={{ left: `${overview.gatilhoInvestPct}%` }}
              title={`Gatilho investimentos: ${overview.gatilhoInvestPct}%`}
            />
          )}
        </div>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3">
            <p className="text-zinc-400">Falta para completar 100%</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(thermometer.valorFaltante)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3">
            <p className="text-zinc-400">
              Ritmo líquido ({thermometer.mesesJanelaMedia || 0}{' '}
              {thermometer.mesesJanelaMedia === 1 ? 'mês' : 'meses'})
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 tabular-nums">
              {formatCurrency(thermometer.mediaAportesMensal)} / mês
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3">
            <p className="text-zinc-400">Conclusão estimada</p>
            <p className="mt-0.5 text-sm font-semibold capitalize text-emerald-300">
              {thermometer.metaConcluida
                ? 'Meta atingida!'
                : thermometer.mesEstimadoConclusao
                  ? `${formatMonthLabel(thermometer.mesEstimadoConclusao)} (${thermometer.mesesRestantesEstimados}m)`
                  : 'Aguardando aportes'}
            </p>
          </div>
        </div>
      </section>

      {/* Prioridade no mês */}
      {monthlyPriority.prioridadeTopoAtiva && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Prioridade #1 do Mês — Pague-se Primeiro ({monthlyPriority.pctPaguePrimeiro}%)
              </p>
              <p className="mt-0.5 text-xs text-zinc-300">
                {monthlyPriority.receitasMes <= 0
                  ? 'A meta da reserva ainda não foi concluída. Assim que registrar receitas neste ciclo, separe seu percentual prioritário.'
                  : monthlyPriority.acaoPendenteMes
                    ? `Meta mensal: ${formatCurrency(monthlyPriority.metaAporteMes)} • Aportado: ${formatCurrency(monthlyPriority.aportesLiquidosMes)} • Pendente: ${formatCurrency(monthlyPriority.valorPendenteMes)}`
                    : `Meta mensal de ${formatCurrency(monthlyPriority.metaAporteMes)} já protegida neste ciclo (${formatCurrency(monthlyPriority.aportesLiquidosMes)} aportados).`}
              </p>
            </div>
          </div>

          {monthlyPriority.acaoPendenteMes && (
            <button
              type="button"
              disabled={depositMutation.isPending}
              onClick={() =>
                void handleQuickDeposit(
                  monthlyPriority.valorPendenteMes,
                  'Aporte prioritário Pague-se Primeiro',
                )
              }
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
            >
              Aportar {formatCurrency(monthlyPriority.valorPendenteMes)} agora
            </button>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aporte Pague-se Primeiro */}
        <form
          onSubmit={(e) => void handleDepositSubmit(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Aportar no Cofre (Pague-se Primeiro)
            </h2>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Conta de origem</label>
            <select
              value={depositAccountId || defaultLiquidAccountId}
              onChange={(e) => setDepositAccountId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {liquidAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nome} ({formatCurrency(acc.saldoAtual)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Valor (R$)</label>
              <input
                type="text"
                required
                inputMode="decimal"
                value={depositValorStr}
                onChange={(e) => setDepositValorStr(e.target.value)}
                placeholder="500.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={depositDescricao}
                onChange={(e) => setDepositDescricao(e.target.value)}
                placeholder="Aporte salário novembro"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={depositMutation.isPending || liquidAccounts.length === 0}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {depositMutation.isPending ? 'Transferindo para o Cofre...' : 'Confirmar Aporte'}
          </button>
        </form>

        {/* Trava Psicológica de Resgate em 2 Etapas */}
        <form
          onSubmit={(e) => void handleWithdrawalSubmit(e)}
          className="space-y-4 rounded-2xl border border-rose-900/50 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                Resgate com Trava (Modo Cofre)
              </h2>
            </div>
            <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-medium text-rose-300">
              2 Etapas + Justificativa
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Conta de destino
              </label>
              <select
                value={withdrawAccountId || defaultLiquidAccountId}
                onChange={(e) => setWithdrawAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {liquidAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Valor do resgate (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={withdrawValorStr}
                onChange={(e) => {
                  setWithdrawValorStr(e.target.value);
                  setStep1Confirmed(false);
                }}
                placeholder="0.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {hasValidWithdrawAmount && (
            <div className="space-y-2 rounded-xl border border-rose-500/35 bg-rose-950/20 p-3 text-xs">
              <p className="font-semibold text-rose-200">Etapa 1 — Impacto do resgate:</p>
              <p className="text-zinc-300 tabular-nums">
                Cofre: {formatCurrency(overview.saldoAcumulado)} &rarr;{' '}
                <strong>{formatCurrency(simSaldoDepois)}</strong> ({simPctDepois.toFixed(1)}% da
                meta)
              </p>
              {overview.custoVidaMensal > 0 && (
                <p className="text-zinc-300 tabular-nums">
                  Cobertura: {simMesesAntes.toFixed(1)} &rarr; {simMesesDepois.toFixed(1)} meses ( -
                  {simMesesPerdidos.toFixed(1)} meses de segurança)
                </p>
              )}
              {simPerderaGatilho && (
                <p className="flex items-center gap-1.5 font-medium text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Atenção: este resgate bloqueará novamente o módulo de investimentos.
                </p>
              )}
              <label className="flex items-center gap-2 pt-1 text-zinc-200">
                <input
                  type="checkbox"
                  checked={step1Confirmed}
                  onChange={(e) => setStep1Confirmed(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950"
                />
                Etapa 1 confirmada: entendi o impacto na minha segurança financeira
              </label>
            </div>
          )}

          {step1Confirmed && hasValidWithdrawAmount && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-zinc-300">
                  Etapa 2 — Justificativa auditável obrigatória
                </label>
                <span
                  className={
                    trimmedJustificativa.length >= 15 ? 'text-emerald-400' : 'text-amber-300'
                  }
                >
                  {trimmedJustificativa.length}/15 mín.
                </span>
              </div>
              <textarea
                rows={2}
                required
                value={justificativaResgate}
                onChange={(e) => setJustificativaResgate(e.target.value)}
                placeholder="Descreva a emergência real (mínimo 15 caracteres)..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              withdrawalMutation.isPending ||
              !hasValidWithdrawAmount ||
              !step1Confirmed ||
              trimmedJustificativa.length < 15
            }
            className="w-full rounded-xl border border-rose-500/50 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-40"
          >
            {withdrawalMutation.isPending ? 'Processando resgate...' : 'Executar Resgate Auditado'}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calculadora Guiada */}
        <form
          onSubmit={(e) => void handleSaveConfig(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                Calculadora Guiada da Reserva
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-400 tabular-nums">
              Meta: {formatCurrency(previewMeta)}
            </span>
          </div>

          {calculatorSuggestion.custoEssencialSugerido > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs">
              <div className="text-zinc-300">
                Custo essencial detectado:{' '}
                <strong className="text-zinc-100 tabular-nums">
                  {formatCurrency(calculatorSuggestion.custoEssencialSugerido)}
                </strong>
                <span className="block text-[11px] text-zinc-500">
                  Fixas essenciais: {formatCurrency(calculatorSuggestion.fixasEssenciaisAtivas)}{' '}
                  &middot; Gastos mês:{' '}
                  {formatCurrency(calculatorSuggestion.gastosEssenciaisMesAtual)}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCustoOverride(String(calculatorSuggestion.custoEssencialSugerido))
                }
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25"
              >
                Usar sugerido
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Custo essencial mensal (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={custoStr}
                onChange={(e) => setCustoOverride(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Meses alvo (3 a 12)
              </label>
              <input
                type="number"
                min={3}
                max={12}
                value={mesesAlvo}
                onChange={(e) => setMesesOverride(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Pague-se Primeiro (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={pctStr}
                onChange={(e) => setPctOverride(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Gatilho Investimentos (%)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={gatilhoStr}
                onChange={(e) => setGatilhoOverride(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updateConfigMutation.isPending}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {updateConfigMutation.isPending ? 'Salvando...' : 'Atualizar Calculadora & Meta'}
          </button>
        </form>

        {/* Histórico Auditável */}
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="text-base font-semibold text-zinc-100">
            Histórico Auditável do Cofre ({overview.movements.length})
          </h2>

          {overview.movements.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhuma movimentação registrada no Cofre ainda.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {overview.movements.map((mov) => (
                <div
                  key={mov.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {mov.tipo === 'APORTE' ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="text-xs font-semibold text-zinc-100">
                        {mov.tipo === 'APORTE' ? 'Aporte no Cofre' : 'Resgate Auditado'}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        mov.tipo === 'APORTE' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {mov.tipo === 'APORTE' ? '+' : '-'} {formatCurrency(mov.valor)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {formatDateTimeBr(mov.dataMovimento)}
                  </p>
                  {mov.justificativaResgate && (
                    <p className="mt-1.5 rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-1.5 text-xs italic text-rose-200">
                      &ldquo;{mov.justificativaResgate}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

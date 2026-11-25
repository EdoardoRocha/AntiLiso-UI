'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Lock,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Unlock,
  X,
} from 'lucide-react';
import {
  useAddAssetContribution,
  useCalculateRebalance,
  useCreatePortfolioAsset,
  useDeletePortfolioAsset,
  useInvestmentsOverview,
  useSimulateCompoundInterest,
  useUpdatePortfolioAsset,
  useUpdateTargetAllocations,
} from '@/hooks/use-investments';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type {
  AssetClass,
  CompoundSimulationResponse,
  PortfolioAsset,
  RebalancePlan,
} from '@/types/api';

const CLASS_ORDER: readonly AssetClass[] = ['RF', 'FII', 'ACOES', 'INT', 'CRIPTO'];

function parseDecimalInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return NaN;
  }
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  return Number(normalized);
}

function formatQty(qty: number): string {
  return qty.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
}

export default function InvestmentsPage() {
  const { data: overview, isLoading } = useInvestmentsOverview();
  const updateAllocationsMutation = useUpdateTargetAllocations();
  const createAssetMutation = useCreatePortfolioAsset();
  const updateAssetMutation = useUpdatePortfolioAsset();
  const addContributionMutation = useAddAssetContribution();
  const deleteAssetMutation = useDeletePortfolioAsset();
  const rebalanceMutation = useCalculateRebalance();
  const simulateMutation = useSimulateCompoundInterest();

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Alocação-alvo
  const [allocDraft, setAllocDraft] = useState<Partial<Record<AssetClass, string>>>({});
  const [aporteRebalanceStr, setAporteRebalanceStr] = useState('1000');
  const [rebalanceResult, setRebalanceResult] = useState<RebalancePlan | null>(null);

  // Cadastro / Edição de Ativo
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClass>('RF');
  const [tickerOuNome, setTickerOuNome] = useState('');
  const [quantidadeStr, setQuantidadeStr] = useState('1');
  const [valorInvestidoStr, setValorInvestidoStr] = useState('');
  const [saldoMercadoStr, setSaldoMercadoStr] = useState('');

  // Aporte rápido em ativo existente
  const [contributingAsset, setContributingAsset] = useState<PortfolioAsset | null>(null);
  const [contribValorStr, setContribValorStr] = useState('');
  const [contribQtyStr, setContribQtyStr] = useState('0');

  // Simulador de Juros Compostos
  const [simSaldoInicialStr, setSimSaldoInicialStr] = useState('0');
  const [simAporteMensalStr, setSimAporteMensalStr] = useState('800');
  const [simTaxaAnualStr, setSimTaxaAnualStr] = useState('8');
  const [simMetaStr, setSimMetaStr] = useState('500000');
  const [simulationResult, setSimulationResult] = useState<CompoundSimulationResponse | null>(null);

  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-zinc-900" />
        <div className="h-44 animate-pulse rounded-2xl bg-zinc-900" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-zinc-900" />
          <div className="h-56 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  const isLocked = overview.trigger.statusGatilho === 'BLOQUEADO';

  const effectiveAllocStrings: Record<AssetClass, string> = {
    RF:
      allocDraft.RF ??
      String(overview.classes.find((c) => c.classeAtivo === 'RF')?.percentualIdeal ?? 40),
    FII:
      allocDraft.FII ??
      String(overview.classes.find((c) => c.classeAtivo === 'FII')?.percentualIdeal ?? 20),
    ACOES:
      allocDraft.ACOES ??
      String(overview.classes.find((c) => c.classeAtivo === 'ACOES')?.percentualIdeal ?? 20),
    INT:
      allocDraft.INT ??
      String(overview.classes.find((c) => c.classeAtivo === 'INT')?.percentualIdeal ?? 15),
    CRIPTO:
      allocDraft.CRIPTO ??
      String(overview.classes.find((c) => c.classeAtivo === 'CRIPTO')?.percentualIdeal ?? 5),
  };

  const allocSum = CLASS_ORDER.reduce((acc, cls) => {
    const val = parseDecimalInput(effectiveAllocStrings[cls]);
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);
  const isAllocSumValid = Math.abs(Math.round(allocSum * 100) / 100 - 100) <= 0.001;

  function resetAssetForm() {
    setEditingAsset(null);
    setAssetClass('RF');
    setTickerOuNome('');
    setQuantidadeStr('1');
    setValorInvestidoStr('');
    setSaldoMercadoStr('');
  }

  function startEditAsset(asset: PortfolioAsset) {
    setFeedback(null);
    setEditingAsset(asset);
    setAssetClass(asset.classeAtivo);
    setTickerOuNome(asset.tickerOuNome);
    setQuantidadeStr(String(asset.quantidade));
    setValorInvestidoStr(String(asset.valorInvestido));
    setSaldoMercadoStr(String(asset.saldoAtualMercado));
  }

  async function handleSaveAsset(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const quantidade = parseDecimalInput(quantidadeStr);
    const valorInvestido = parseDecimalInput(valorInvestidoStr);
    const saldoAtualMercado = saldoMercadoStr.trim()
      ? parseDecimalInput(saldoMercadoStr)
      : valorInvestido;

    if (!tickerOuNome.trim()) {
      setFeedback({ kind: 'err', text: 'Informe o ticker ou nome do ativo.' });
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      setFeedback({ kind: 'err', text: 'Quantidade inválida.' });
      return;
    }
    if (!Number.isFinite(valorInvestido) || valorInvestido < 0) {
      setFeedback({ kind: 'err', text: 'Valor investido inválido.' });
      return;
    }
    if (!Number.isFinite(saldoAtualMercado) || saldoAtualMercado < 0) {
      setFeedback({ kind: 'err', text: 'Saldo atual de mercado inválido.' });
      return;
    }

    try {
      if (editingAsset) {
        await updateAssetMutation.mutateAsync({
          id: editingAsset.id,
          payload: {
            classeAtivo: assetClass,
            tickerOuNome: tickerOuNome.trim(),
            quantidade: Number(quantidade.toFixed(6)),
            valorInvestido: Number(valorInvestido.toFixed(2)),
            saldoAtualMercado: Number(saldoAtualMercado.toFixed(2)),
          },
        });
        setFeedback({ kind: 'ok', text: `Ativo "${tickerOuNome.trim()}" atualizado!` });
      } else {
        await createAssetMutation.mutateAsync({
          classeAtivo: assetClass,
          tickerOuNome: tickerOuNome.trim(),
          quantidade: Number(quantidade.toFixed(6)),
          valorInvestido: Number(valorInvestido.toFixed(2)),
          saldoAtualMercado: Number(saldoAtualMercado.toFixed(2)),
        });
        setFeedback({ kind: 'ok', text: `Ativo "${tickerOuNome.trim()}" adicionado à carteira!` });
      }
      resetAssetForm();
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao salvar ativo na carteira.',
      });
    }
  }

  async function handleSubmitContribution(event: FormEvent) {
    event.preventDefault();
    if (!contributingAsset) {
      return;
    }
    setFeedback(null);

    const valorAporte = parseDecimalInput(contribValorStr);
    const quantidadeAdicional = contribQtyStr.trim() ? parseDecimalInput(contribQtyStr) : 0;

    if (!Number.isFinite(valorAporte) || valorAporte <= 0) {
      setFeedback({ kind: 'err', text: 'Informe um valor de aporte maior que zero.' });
      return;
    }
    if (!Number.isFinite(quantidadeAdicional) || quantidadeAdicional < 0) {
      setFeedback({ kind: 'err', text: 'Quantidade adicional inválida.' });
      return;
    }

    try {
      await addContributionMutation.mutateAsync({
        id: contributingAsset.id,
        payload: {
          valorAporte: Number(valorAporte.toFixed(2)),
          quantidadeAdicional: Number(quantidadeAdicional.toFixed(6)),
        },
      });
      setFeedback({
        kind: 'ok',
        text: `Aporte de ${formatCurrency(valorAporte)} registrado em ${contributingAsset.tickerOuNome}!`,
      });
      setContributingAsset(null);
      setContribValorStr('');
      setContribQtyStr('0');
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Não foi possível registrar o aporte.',
      });
    }
  }

  async function handleDeleteAsset(asset: PortfolioAsset) {
    setFeedback(null);
    try {
      await deleteAssetMutation.mutateAsync(asset.id);
      if (editingAsset?.id === asset.id) {
        resetAssetForm();
      }
      setFeedback({ kind: 'ok', text: `Ativo "${asset.tickerOuNome}" removido da carteira.` });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao remover ativo.',
      });
    }
  }

  async function handleSaveAllocations(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const parsed = CLASS_ORDER.map((classeAtivo) => ({
      classeAtivo,
      percentualIdeal: Number(parseDecimalInput(effectiveAllocStrings[classeAtivo]).toFixed(2)),
    }));

    if (
      parsed.some(
        (item) =>
          !Number.isFinite(item.percentualIdeal) ||
          item.percentualIdeal < 0 ||
          item.percentualIdeal > 100,
      )
    ) {
      setFeedback({ kind: 'err', text: 'Todos os percentuais devem estar entre 0% e 100%.' });
      return;
    }

    if (!isAllocSumValid) {
      setFeedback({ kind: 'err', text: 'A soma das 5 classes deve totalizar exatamente 100%.' });
      return;
    }

    try {
      await updateAllocationsMutation.mutateAsync(parsed);
      setAllocDraft({});
      setFeedback({ kind: 'ok', text: 'Alocação-alvo atualizada com sucesso!' });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar alocação-alvo.',
      });
    }
  }

  async function handleCalculateRebalance(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    const valorAporte = parseDecimalInput(aporteRebalanceStr);

    if (!Number.isFinite(valorAporte) || valorAporte <= 0) {
      setFeedback({ kind: 'err', text: 'Informe um valor de aporte válido para simular.' });
      return;
    }

    try {
      const plan = await rebalanceMutation.mutateAsync(Number(valorAporte.toFixed(2)));
      setRebalanceResult(plan);
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao calcular rebalanceamento.',
      });
    }
  }

  async function handleSimulateCompound(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const saldoInicial = parseDecimalInput(simSaldoInicialStr);
    const aporteMensal = parseDecimalInput(simAporteMensalStr);
    const taxaAnualRealPct = parseDecimalInput(simTaxaAnualStr);
    const metaPatrimonio = simMetaStr.trim() ? parseDecimalInput(simMetaStr) : null;

    if (!Number.isFinite(saldoInicial) || saldoInicial < 0) {
      setFeedback({ kind: 'err', text: 'Saldo inicial inválido no simulador.' });
      return;
    }
    if (!Number.isFinite(aporteMensal) || aporteMensal < 0) {
      setFeedback({ kind: 'err', text: 'Aporte mensal inválido no simulador.' });
      return;
    }
    if (!Number.isFinite(taxaAnualRealPct) || taxaAnualRealPct < 0 || taxaAnualRealPct > 100) {
      setFeedback({ kind: 'err', text: 'Informe uma taxa real anual entre 0% e 100%.' });
      return;
    }
    if (metaPatrimonio !== null && (!Number.isFinite(metaPatrimonio) || metaPatrimonio <= 0)) {
      setFeedback({ kind: 'err', text: 'Meta patrimonial deve ser maior que zero.' });
      return;
    }

    try {
      const result = await simulateMutation.mutateAsync({
        saldoInicial: Number(saldoInicial.toFixed(2)),
        aporteMensal: Number(aporteMensal.toFixed(2)),
        taxaAnualRealPct,
        metaPatrimonio: metaPatrimonio ? Number(metaPatrimonio.toFixed(2)) : null,
      });
      setSimulationResult(result);
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao executar simulação.',
      });
    }
  }

  const progressGatilhoPct =
    overview.trigger.valorGatilhoRequerido > 0
      ? Math.min(
          100,
          (overview.trigger.saldoReservaAtual / overview.trigger.valorGatilhoRequerido) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Investimentos &amp; Patrimônio</h1>
          <p className="text-sm text-zinc-400">
            Transição guiada, consolidador por classes, rebalanceamento por aporte e simulador de
            juros compostos.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            isLocked
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          {isLocked ? 'Modo Educativo' : 'Carteira Liberada'}
        </span>
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

      {/* Gatilho de Transição */}
      {isLocked && (
        <section className="space-y-4 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/35 via-zinc-900/90 to-zinc-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <BookOpen className="h-4 w-4" />
                Modo Educativo Ativo — Proteção da Reserva
              </div>
              <h2 className="text-base font-semibold text-zinc-100">
                Ativos de risco (FIIs, Ações, Internacional e Cripto) bloqueados até atingir{' '}
                {overview.trigger.gatilhoInvestPct}% da Reserva
              </h2>
              <p className="text-xs text-zinc-300">
                {overview.trigger.valorMetaReserva > 0
                  ? `Você possui ${formatCurrency(overview.trigger.saldoReservaAtual)} no Cofre de ${formatCurrency(overview.trigger.valorGatilhoRequerido)} necessários. Faltam ${formatCurrency(overview.trigger.faltaParaDesbloquear)} para liberar investimentos de risco.`
                  : 'Configure seu custo de vida mensal na tela de Reserva para ativar sua meta de desbloqueio.'}{' '}
                Enquanto isso, você pode registrar Renda Fixa/Liquidez (RF) e usar o Simulador de
                Juros Compostos.
              </p>
            </div>

            <Link
              href="/reserve"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              <ShieldCheck className="h-4 w-4" />
              Aportar na Reserva
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Progresso para desbloquear investimentos de risco</span>
              <span className="tabular-nums text-amber-300">{progressGatilhoPct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${progressGatilhoPct}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* KPIs Patrimoniais */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Patrimônio na Carteira</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(overview.patrimonioCarteira)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Soma do valor de mercado</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Capital Investido</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(overview.valorInvestidoCarteira)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Custo de aquisição acumulado</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Resultado / Rentabilidade</p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${
              overview.lucroPrejuizoCarteira >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {overview.lucroPrejuizoCarteira >= 0 ? '+' : ''}
            {formatCurrency(overview.lucroPrejuizoCarteira)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
            Rentabilidade: {overview.rentabilidadeCarteiraPct >= 0 ? '+' : ''}
            {overview.rentabilidadeCarteiraPct.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Patrimônio Total Global</p>
          <p className="mt-1 text-xl font-semibold text-zinc-50 tabular-nums">
            {formatCurrency(overview.patrimonioTotalGlobal)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Contas ({formatCurrency(overview.saldoContasLiquidas)}) + Cofre (
            {formatCurrency(overview.saldoReservaEmergencia)})
          </p>
        </div>
      </section>

      {/* Formulário Ativo + Consolidador por Classes */}
      <section className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={(e) => void handleSaveAsset(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 lg:col-span-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Plus className="h-4 w-4 text-emerald-400" />
              {editingAsset ? `Editar ${editingAsset.tickerOuNome}` : 'Cadastrar Ativo'}
            </h2>
            {editingAsset && (
              <button
                type="button"
                onClick={resetAssetForm}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-class" className="text-xs text-zinc-400">
              Classe de Ativo
            </label>
            <select
              id="asset-class"
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as AssetClass)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            >
              {overview.classes.map((cls) => (
                <option
                  key={cls.classeAtivo}
                  value={cls.classeAtivo}
                  disabled={!editingAsset && cls.bloqueadaPorGatilho}
                >
                  {cls.nomeClasse}
                  {cls.bloqueadaPorGatilho ? ' (Bloqueado)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-ticker" className="text-xs text-zinc-400">
              Ticker ou Nome
            </label>
            <input
              id="asset-ticker"
              type="text"
              value={tickerOuNome}
              onChange={(e) => setTickerOuNome(e.target.value)}
              placeholder="Ex: Tesouro Selic 2029, HGLG11, WEGE3"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label htmlFor="asset-qty" className="text-[11px] text-zinc-400">
                Qtd.
              </label>
              <input
                id="asset-qty"
                type="text"
                value={quantidadeStr}
                onChange={(e) => setQuantidadeStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="asset-invested" className="text-[11px] text-zinc-400">
                Investido (R$)
              </label>
              <input
                id="asset-invested"
                type="text"
                value={valorInvestidoStr}
                onChange={(e) => setValorInvestidoStr(e.target.value)}
                placeholder="1000,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="asset-market" className="text-[11px] text-zinc-400">
                Atual (R$)
              </label>
              <input
                id="asset-market"
                type="text"
                value={saldoMercadoStr}
                onChange={(e) => setSaldoMercadoStr(e.target.value)}
                placeholder="1050,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {editingAsset ? 'Salvar Alterações' : 'Adicionar Ativo'}
          </button>

          {contributingAsset && (
            <div className="space-y-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-200">
                  Novo Aporte em {contributingAsset.tickerOuNome}
                </p>
                <button
                  type="button"
                  onClick={() => setContributingAsset(null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={contribValorStr}
                  onChange={(e) => setContribValorStr(e.target.value)}
                  placeholder="Valor (R$)"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  value={contribQtyStr}
                  onChange={(e) => setContribQtyStr(e.target.value)}
                  placeholder="+ Qtd"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
                />
              </div>
              <button
                type="button"
                disabled={addContributionMutation.isPending}
                onClick={(e) => void handleSubmitContribution(e)}
                className="w-full rounded-lg bg-emerald-400 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
              >
                Confirmar Aporte
              </button>
            </div>
          )}
        </form>

        <div className="space-y-3 lg:col-span-8">
          {overview.classes.map((cls) => (
            <div
              key={cls.classeAtivo}
              className={`rounded-2xl border p-4 ${
                cls.bloqueadaPorGatilho
                  ? 'border-zinc-800/80 bg-zinc-950/60'
                  : 'border-zinc-800 bg-zinc-900/70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100">{cls.nomeClasse}</h3>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                      {cls.classeAtivo}
                    </span>
                    {cls.bloqueadaPorGatilho && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                        <Lock className="h-2.5 w-2.5" />
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">{cls.resumoEducativo}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                    {formatCurrency(cls.saldoAtualMercado)}
                  </p>
                  <p className="text-[11px] text-zinc-400 tabular-nums">
                    Atual {cls.percentualAtual.toFixed(1)}% / Alvo {cls.percentualIdeal.toFixed(1)}%
                    {cls.valorInvestido > 0 && (
                      <span
                        className={`ml-2 ${
                          cls.rentabilidadePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        ({cls.rentabilidadePct >= 0 ? '+' : ''}
                        {cls.rentabilidadePct.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {cls.ativos.length > 0 && (
                <div className="mt-3 divide-y divide-zinc-800/70 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                  {cls.ativos.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">{asset.tickerOuNome}</p>
                        <p className="text-[11px] text-zinc-500 tabular-nums">
                          {formatQty(asset.quantidade)} un. • PM: {formatCurrency(asset.precoMedio)}{' '}
                          • Investido: {formatCurrency(asset.valorInvestido)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-zinc-100 tabular-nums">
                            {formatCurrency(asset.saldoAtualMercado)}
                          </p>
                          <p
                            className={`text-[11px] tabular-nums ${
                              asset.lucroPrejuizo >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {asset.lucroPrejuizo >= 0 ? '+' : ''}
                            {formatCurrency(asset.lucroPrejuizo)} (
                            {asset.rentabilidadePct.toFixed(1)}%)
                          </p>
                        </div>

                        {!cls.bloqueadaPorGatilho && (
                          <button
                            type="button"
                            title="Registrar novo aporte"
                            onClick={() => {
                              setContributingAsset(asset);
                              setContribValorStr('');
                              setContribQtyStr('0');
                            }}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Editar / atualizar cotação"
                          onClick={() => startEditAsset(asset)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Excluir ativo"
                          onClick={() => void handleDeleteAsset(asset)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-rose-300 hover:bg-zinc-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Alocação-Alvo e Rebalanceamento Guiado por Aporte */}
      <section className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={(e) => void handleSaveAllocations(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 lg:col-span-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Scale className="h-4 w-4 text-emerald-400" />
              Metas de Alocação
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                isAllocSumValid
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              Total: {allocSum.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-2.5">
            {overview.classes.map((cls) => (
              <div key={cls.classeAtivo} className="flex items-center justify-between gap-3">
                <label htmlFor={`alloc-${cls.classeAtivo}`} className="text-xs text-zinc-300">
                  {cls.nomeClasse}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`alloc-${cls.classeAtivo}`}
                    type="text"
                    value={effectiveAllocStrings[cls.classeAtivo]}
                    onChange={(e) =>
                      setAllocDraft((prev) => ({ ...prev, [cls.classeAtivo]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-right text-xs text-zinc-100 tabular-nums outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!isAllocSumValid || updateAllocationsMutation.isPending}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar Alocação-Alvo (100%)
          </button>
        </form>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Onde Aportar Este Mês?
              </h2>
              <p className="text-xs text-zinc-400">
                Indica exatamente onde investir o dinheiro novo sem precisar vender posições.
              </p>
            </div>

            <form
              onSubmit={(e) => void handleCalculateRebalance(e)}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="Valor do novo aporte"
                value={aporteRebalanceStr}
                onChange={(e) => setAporteRebalanceStr(e.target.value)}
                placeholder="1000,00"
                className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={rebalanceMutation.isPending}
                className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Calcular
              </button>
            </form>
          </div>

          {rebalanceResult ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                {rebalanceResult.orientacaoResumo}
              </div>

              {rebalanceResult.valorSugeridoReserva > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <span>Reserva de Emergência (Prioridade)</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(rebalanceResult.valorSugeridoReserva)}
                  </span>
                </div>
              )}

              <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/60">
                {rebalanceResult.itens.map((item) => (
                  <div
                    key={item.classeAtivo}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">
                        {item.nomeClasse}
                        {rebalanceResult.classePrioritaria === item.classeAtivo && (
                          <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                            Prioridade
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-zinc-500 tabular-nums">
                        {item.percentualAntes.toFixed(1)}% → {item.percentualDepois.toFixed(1)}%
                        (Alvo {item.percentualIdeal.toFixed(0)}%)
                      </p>
                    </div>
                    <span
                      className={`font-semibold tabular-nums ${
                        item.valorSugeridoAporte > 0 ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      Aportar {formatCurrency(item.valorSugeridoAporte)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-xs text-zinc-400">
              Informe quanto pretende investir este mês e clique em <strong>Calcular</strong> para
              receber a divisão exata por classe.
            </p>
          )}
        </div>
      </section>

      {/* Simulador de Juros Compostos e Metas */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
              <Calculator className="h-4 w-4 text-emerald-400" />
              Simulador de Juros Compostos e Metas
            </h2>
            <p className="text-xs text-zinc-400">
              Projeção real do patrimônio em 1, 5, 10 e 20 anos acima da inflação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimSaldoInicialStr(String(overview.patrimonioCarteira))}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Usar saldo da carteira ({formatCurrency(overview.patrimonioCarteira)})
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSimulateCompound(e)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1">
            <label htmlFor="sim-initial" className="text-xs text-zinc-400">
              Saldo Inicial (R$)
            </label>
            <input
              id="sim-initial"
              type="text"
              value={simSaldoInicialStr}
              onChange={(e) => setSimSaldoInicialStr(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-monthly" className="text-xs text-zinc-400">
              Aporte Mensal (R$)
            </label>
            <input
              id="sim-monthly"
              type="text"
              value={simAporteMensalStr}
              onChange={(e) => setSimAporteMensalStr(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-rate" className="text-xs text-zinc-400">
              Taxa Real (% a.a.)
            </label>
            <input
              id="sim-rate"
              type="text"
              value={simTaxaAnualStr}
              onChange={(e) => setSimTaxaAnualStr(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-goal" className="text-xs text-zinc-400">
              Meta Patrimonial (R$)
            </label>
            <input
              id="sim-goal"
              type="text"
              value={simMetaStr}
              onChange={(e) => setSimMetaStr(e.target.value)}
              placeholder="500000"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={simulateMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4" />
              Projetar Evolução
            </button>
          </div>
        </form>

        {simulationResult && (
          <div className="space-y-4">
            {simulationResult.metaPatrimonio !== null && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">
                {simulationResult.mesesParaMeta !== null
                  ? `Meta de ${formatCurrency(simulationResult.metaPatrimonio)} estimada em ${simulationResult.mesesParaMeta} meses (${simulationResult.anosParaMeta?.toFixed(1)} anos) a ${simulationResult.taxaAnualRealPct}% a.a. reais.`
                  : `Com os parâmetros atuais, a meta de ${formatCurrency(simulationResult.metaPatrimonio)} ultrapassa 100 anos.`}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {simulationResult.horizons.map((h) => {
                const maxTotal = simulationResult.horizons[3]?.patrimonioFinal || 1;
                const totalWidthPct = Math.min(100, (h.patrimonioFinal / maxTotal) * 100);
                const principalSharePct =
                  h.patrimonioFinal > 0 ? (h.totalAportado / h.patrimonioFinal) * 100 : 100;

                return (
                  <div
                    key={h.anos}
                    className="space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        {h.anos} {h.anos === 1 ? 'ano' : 'anos'}
                      </span>
                      <span className="text-[11px] text-emerald-300 tabular-nums">
                        {h.multiplicadorPatrimonio.toFixed(2)}x
                      </span>
                    </div>

                    <p className="text-lg font-bold text-zinc-50 tabular-nums">
                      {formatCurrency(h.patrimonioFinal)}
                    </p>

                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="flex h-full overflow-hidden rounded-full"
                        style={{ width: `${totalWidthPct}%` }}
                      >
                        <div
                          className="h-full bg-zinc-500"
                          style={{ width: `${principalSharePct}%` }}
                          title="Total aportado"
                        />
                        <div
                          className="h-full flex-1 bg-emerald-400"
                          title="Juros compostos acumulados"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5 text-[11px] text-zinc-400 tabular-nums">
                      <p>Aportado: {formatCurrency(h.totalAportado)}</p>
                      <p className="text-emerald-400">
                        Juros: +{formatCurrency(h.jurosAcumulados)}
                      </p>
                      <p className="text-zinc-300">
                        Renda estimada: {formatCurrency(h.rendaPassivaMensalEstimada)}/mês
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

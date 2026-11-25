'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Clock,
  CreditCard,
  Landmark,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { ApiStatusCard } from '@/components/features/api-status-card';
import { QuickAddCard } from '@/components/features/quick-add-card';
import { SafeToSpendCard } from '@/components/features/safe-to-spend-card';
import { useAccounts } from '@/hooks/use-accounts';
import { useAlerts } from '@/hooks/use-alerts';
import { useMe } from '@/hooks/use-auth';
import { useCreditCards } from '@/hooks/use-credit-cards';
import { useInvestmentsOverview } from '@/hooks/use-investments';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { useRecurrenceChecklist } from '@/hooks/use-recurrences';
import { useReserve } from '@/hooks/use-reserve';
import { getCurrentLocalMonth, useTransactions } from '@/hooks/use-transactions';
import { ACCOUNT_TYPE_LABELS, formatCurrency } from '@/lib/format';

export default function DashboardHomePage() {
  const { data: user } = useMe();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: cards = [] } = useCreditCards();
  const { data: reserve } = useReserve();
  const { data: investments } = useInvestmentsOverview();
  const { data: alertsData } = useAlerts({ autoSync: true });
  const { pendingItems } = useOfflineSync();
  const currentMonth = getCurrentLocalMonth();
  const { data: checklistData } = useRecurrenceChecklist(currentMonth);
  const { data: txData, isLoading: txLoading } = useTransactions({
    month: currentMonth,
    limit: 5,
  });

  const saldoLiquido = accounts
    .filter((account) => account.tipo === 'CORRENTE' || account.tipo === 'CARTEIRA')
    .reduce((acc, account) => acc + account.saldoAtual, 0);

  const saldoCofre = accounts
    .filter((account) => account.tipo === 'COFRE')
    .reduce((acc, account) => acc + account.saldoAtual, 0);

  const totalFaturasAbertas = cards.reduce((acc, card) => acc + card.totalFaturaAberta, 0);
  const totalLimiteDisponivel = cards.reduce((acc, card) => acc + card.limiteDisponivel, 0);
  const ceilingAlerts = cards.filter(
    (card) => card.alertaTetoStatus === 'ATINGIDO' || card.alertaTetoStatus === 'PROXIMO',
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Visão Geral</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-50">
            Olá, {user?.nome ?? 'usuário'}
          </h1>
        </div>
        <Link
          href="/reserve"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Meta Reserva: {formatCurrency(user?.reserva.valorMetaCalculado ?? 0)}
        </Link>
      </header>

      {(alertsData?.unreadCount ?? 0) > 0 && (
        <Link
          href="/alerts"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 transition hover:border-rose-400"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-200">
                {alertsData?.unreadCount} alerta(s) proativo(s) não lido(s)
              </p>
              <p className="text-xs text-zinc-300">
                Confira vencimentos em 48h, consumo acima de 80% do orçamento e o resumo semanal.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300">
            Abrir Alertas
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {reserve?.monthlyPriority.acaoPendenteMes && (
        <Link
          href="/reserve"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 transition hover:border-amber-400"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Prioridade #1 do Mês — Aportar na Reserva
              </p>
              <p className="text-xs text-zinc-300">
                Faltam {formatCurrency(reserve.monthlyPriority.valorPendenteMes)} para cumprir seu{' '}
                Pague-se Primeiro ({reserve.monthlyPriority.pctPaguePrimeiro}%) deste ciclo.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
            Aportar agora
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      <SafeToSpendCard />

      <QuickAddCard />

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-xs font-medium text-zinc-400">Saldo Líquido Disponível</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {accountsLoading ? '...' : formatCurrency(saldoLiquido)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Soma das contas correntes e carteiras</p>
        </div>

        <Link
          href="/reserve"
          className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-emerald-500/40"
        >
          <p className="text-xs font-medium text-zinc-400">Reserva no Cofre</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {accountsLoading ? '...' : formatCurrency(saldoCofre)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {reserve
              ? `${reserve.thermometer.percentualConcluido.toFixed(0)}% da meta (${reserve.thermometer.mesesSegurancaCobertos.toFixed(1)} meses) • `
              : 'Status do módulo de risco: '}
            <span
              className={`font-medium ${
                (reserve?.statusGatilho ?? user?.reserva.statusGatilho) === 'LIBERADO'
                  ? 'text-emerald-400'
                  : 'text-amber-300'
              }`}
            >
              {reserve?.statusGatilho ?? user?.reserva.statusGatilho ?? 'BLOQUEADO'}
            </span>
          </p>
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/recurrences"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-emerald-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Contas Fixas do Mês</p>
              <p className="text-xs text-zinc-400">
                {checklistData
                  ? `${checklistData.summary.countPagas} de ${checklistData.summary.countTotal} pagas • Pendente: ${formatCurrency(checklistData.summary.totalPendenteDespesas)}`
                  : 'Carregando checklist mensal...'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            Checklist
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/cards"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition ${
            ceilingAlerts.some((c) => c.alertaTetoStatus === 'ATINGIDO')
              ? 'border-rose-500/45 bg-rose-500/10 hover:border-rose-400'
              : 'border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                ceilingAlerts.length > 0
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-sky-500/15 text-sky-300'
              }`}
            >
              {ceilingAlerts.length > 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Cartões &amp; Faturas Abertas</p>
              <p className="text-xs text-zinc-400">
                {cards.length === 0
                  ? 'Nenhum cartão cadastrado'
                  : ceilingAlerts.length > 0
                    ? `Alerta de teto em ${ceilingAlerts.map((c) => c.nome).join(', ')}`
                    : `Faturas: ${formatCurrency(totalFaturasAbertas)} • Livre: ${formatCurrency(totalLimiteDisponivel)}`}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            Faturas
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>

      <Link
        href="/investments"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-emerald-500/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Carteira &amp; Patrimônio</p>
            <p className="text-xs text-zinc-400">
              {investments
                ? investments.trigger.modoEducativoAtivo
                  ? `Modo Educativo ativo • Faltam ${formatCurrency(investments.trigger.faltaParaDesbloquear)} na Reserva para liberar ativos de risco`
                  : `Carteira: ${formatCurrency(investments.patrimonioCarteira)} • Patrimônio Global: ${formatCurrency(investments.patrimonioTotalGlobal)}`
                : 'Consolidado de ativos, rebalanceamento por aporte e juros compostos.'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
          {investments?.trigger.modoEducativoAtivo ? 'Simulador / RF' : 'Ver Carteira'}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Últimos lançamentos</h2>
          <Link
            href="/transactions"
            className="text-xs font-medium text-emerald-400 hover:underline"
          >
            Ver extrato completo →
          </Link>
        </div>

        {pendingItems.length === 0 && txLoading ? (
          <p className="text-sm text-zinc-400">Carregando lançamentos...</p>
        ) : pendingItems.length === 0 && (txData?.transactions.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-400">
            Nenhum lançamento neste mês ainda. Use o Quick-Add acima!
          </p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {pendingItems.map((item) => (
              <div
                key={item.clientRequestId}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{item.descricao}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <Clock className="h-3 w-3" />
                      {item.status === 'FAILED' ? 'Falhou' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{item.dataCompetencia}</p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    item.tipo === 'REC' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.tipo === 'REC' ? '+' : '-'} {formatCurrency(item.valor)}
                </p>
              </div>
            ))}

            {(txData?.transactions ?? []).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{tx.descricao}</span>
                    {tx.categoriaNome && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                        {tx.categoriaNome}
                      </span>
                    )}
                    {tx.status === 'PENDENTE' && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {tx.dataCompetencia} •{' '}
                    {tx.tipo === 'TRANSF'
                      ? tx.contaDestinoNome
                        ? `${tx.contaNome ?? 'Origem'} → ${tx.contaDestinoNome}`
                        : `${tx.contaNome ?? 'Conta'} • Pagamento fatura`
                      : tx.cartaoId
                        ? `Cartão ${tx.cartaoNome ?? 'Crédito'}`
                        : (tx.contaNome ?? 'Conta')}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    tx.tipo === 'REC'
                      ? 'text-emerald-400'
                      : tx.tipo === 'DESP'
                        ? 'text-rose-400'
                        : 'text-zinc-300'
                  }`}
                >
                  {tx.tipo === 'REC' ? '+' : tx.tipo === 'DESP' ? '-' : '⇄'}{' '}
                  {formatCurrency(tx.valor)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/accounts"
          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-emerald-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Contas & Transferências</p>
              <p className="text-xs text-zinc-400">Gerir contas e transferir sem distorcer mês</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-500" />
        </Link>

        <Link
          href="/categories"
          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-emerald-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Categorias (Entrou / Saiu)</p>
              <p className="text-xs text-zinc-400">Marcar essenciais e limites mensais</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-500" />
        </Link>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Suas Contas</h2>
          <Link href="/accounts" className="text-xs font-medium text-emerald-400 hover:underline">
            Gerenciar
          </Link>
        </div>

        {accountsLoading ? (
          <p className="text-sm text-zinc-400">Carregando contas...</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhuma conta ativa.</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-100">{account.nome}</p>
                    {account.ehContaPadrao && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Padrão
                      </span>
                    )}
                    {account.ehCofreReserva && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Cofre
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{ACCOUNT_TYPE_LABELS[account.tipo]}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  {formatCurrency(account.saldoAtual)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <ApiStatusCard />
    </div>
  );
}

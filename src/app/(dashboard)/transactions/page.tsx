'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileUp,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCategories } from '@/hooks/use-categories';
import { useCreditCards } from '@/hooks/use-credit-cards';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import {
  getCurrentLocalMonth,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/use-transactions';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { TransactionStatus, TransactionType } from '@/types/api';

function shiftMonth(monthIso: string, delta: number): string {
  const [yearStr, monthStr] = monthIso.split('-');
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function formatMonthLabel(monthIso: string): string {
  const [yearStr, monthStr] = monthIso.split('-');
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 15));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) {
    return isoDate;
  }
  return `${d}/${m}/${y}`;
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(getCurrentLocalMonth);
  const [tipo, setTipo] = useState<TransactionType | undefined>(undefined);
  const [status, setStatus] = useState<TransactionStatus | undefined>(undefined);
  const [cartaoId, setCartaoId] = useState('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useCreditCards();
  const { pendingItems, retryItem, discardItem, isSyncing } = useOfflineSync();
  const { data, isLoading, isError, error } = useTransactions({
    month,
    tipo,
    status,
    cartaoId: cartaoId || undefined,
    search: search.trim() || undefined,
    limit: 100,
  });

  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  async function handleChangeCategory(id: string, nextCategoryId: string) {
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({
        id,
        payload: { categoriaId: nextCategoryId || null },
      });
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao atualizar categoria.');
    }
  }

  async function handleToggleStatus(id: string, current: TransactionStatus) {
    setFeedback(null);
    try {
      await updateMutation.mutateAsync({
        id,
        payload: { status: current === 'PAGO' ? 'PENDENTE' : 'PAGO' },
      });
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao atualizar status.');
    }
  }

  async function handleDelete(id: string) {
    setFeedback(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao excluir lançamento.');
    }
  }

  const summary = data?.summary ?? {
    totalReceitas: 0,
    totalDespesas: 0,
    saldoPeriodo: 0,
    totalCount: 0,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Extrato</h1>
          <p className="text-sm text-zinc-400">
            Entradas, saídas e transferências neutras do mês selecionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/imports"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
          >
            <FileUp className="h-3.5 w-3.5" />
            Importar OFX/CSV
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
              className="rounded-lg p-1.5 text-zinc-300 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-xs font-medium capitalize text-zinc-100">
              {formatMonthLabel(month)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
              className="rounded-lg p-1.5 text-zinc-300 hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Entrou no período</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {formatCurrency(summary.totalReceitas)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Saiu no período</p>
          <p className="mt-1 text-xl font-semibold text-rose-400">
            {formatCurrency(summary.totalDespesas)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Saldo do mês</p>
          <p
            className={`mt-1 text-xl font-semibold ${
              summary.saldoPeriodo >= 0 ? 'text-zinc-50' : 'text-rose-300'
            }`}
          >
            {formatCurrency(summary.saldoPeriodo)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Transferências não alteram o saldo</p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1.5">
          {(
            [
              { label: 'Todos', value: undefined },
              { label: 'Saiu', value: 'DESP' },
              { label: 'Entrou', value: 'REC' },
              { label: 'Transf', value: 'TRANSF' },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setTipo(item.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                tipo === item.value
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          value={status ?? ''}
          onChange={(e) =>
            setStatus((e.target.value || undefined) as TransactionStatus | undefined)
          }
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Todos status</option>
          <option value="PAGO">Pago</option>
          <option value="PENDENTE">Pendente</option>
        </select>

        {cards.length > 0 && (
          <select
            aria-label="Filtrar por cartão"
            value={cartaoId}
            onChange={(e) => setCartaoId(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Todos cartões</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.nome}
              </option>
            ))}
          </select>
        )}

        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descrição..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </section>

      {(feedback || isError) && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {feedback ??
            (error instanceof ApiError ? error.message : 'Erro ao carregar lançamentos.')}
        </p>
      )}

      {pendingItems.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Fila Offline ({pendingItems.length})
          </h2>
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.clientRequestId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-zinc-950/70 px-3.5 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">{item.descricao}</p>
                  <p className="text-xs text-zinc-400">
                    {formatDateBr(item.dataCompetencia)} •{' '}
                    {item.status === 'FAILED'
                      ? `Falhou: ${item.lastError ?? 'Erro de validação'}`
                      : 'Aguardando sincronização'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      item.tipo === 'REC' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.tipo === 'REC' ? '+' : '-'} {formatCurrency(item.valor)}
                  </span>
                  {item.localId !== undefined && (
                    <>
                      <button
                        type="button"
                        onClick={() => void retryItem(item.localId!)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={() => void discardItem(item.localId!)}
                        className="rounded-lg border border-zinc-800 p-1 text-zinc-400 hover:text-rose-300"
                        aria-label="Descartar item offline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2.5">
        {isLoading ? (
          <p className="text-sm text-zinc-400">Carregando extrato...</p>
        ) : (data?.transactions.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
            Nenhum lançamento encontrado para os filtros atuais.
          </div>
        ) : (
          (data?.transactions ?? []).map((tx) => (
            <article
              key={tx.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100">{tx.descricao}</span>
                  {tx.tipo === 'TRANSF' && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                      Transf. Neutra
                    </span>
                  )}
                  {tx.tipo !== 'TRANSF' && (
                    <select
                      aria-label={`Categoria de ${tx.descricao}`}
                      value={tx.categoriaId ?? ''}
                      onChange={(e) => void handleChangeCategory(tx.id, e.target.value)}
                      disabled={updateMutation.isPending}
                      className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Sem categoria</option>
                      {categories
                        .filter((cat) =>
                          tx.tipo === 'REC' ? cat.tipo === 'RECEITA' : cat.tipo === 'DESPESA',
                        )
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nome}
                          </option>
                        ))}
                    </select>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      tx.status === 'PAGO'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {tx.status === 'PAGO' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {tx.status === 'PAGO' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateBr(tx.dataCompetencia)} •{' '}
                  {tx.tipo === 'TRANSF'
                    ? tx.contaDestinoNome
                      ? `${tx.contaNome ?? 'Origem'} → ${tx.contaDestinoNome}`
                      : `${tx.contaNome ?? 'Conta'} • Pagamento de fatura`
                    : tx.cartaoId
                      ? `Cartão ${tx.cartaoNome ?? 'Crédito'}`
                      : (tx.contaNome ?? 'Conta')}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span
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
                </span>

                {tx.tipo !== 'TRANSF' && !tx.cartaoId && (
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(tx.id, tx.status)}
                    disabled={updateMutation.isPending}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                  >
                    {tx.status === 'PAGO' ? 'Marcar pendente' : 'Marcar pago'}
                  </button>
                )}

                {tx.cartaoId && (
                  <Link
                    href="/cards"
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700"
                  >
                    Via fatura
                  </Link>
                )}

                {!(tx.cartaoId && tx.status === 'PAGO') &&
                  !(tx.tipo === 'TRANSF' && !tx.contaDestinoId) && (
                    <button
                      type="button"
                      aria-label={`Excluir ${tx.descricao}`}
                      onClick={() => void handleDelete(tx.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

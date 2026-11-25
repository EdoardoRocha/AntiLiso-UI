'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PauseCircle,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useCreditCards } from '@/hooks/use-credit-cards';
import { useReserve } from '@/hooks/use-reserve';
import {
  useCreateRecurrence,
  useDeleteRecurrence,
  useRecurrenceChecklist,
  useRecurrences,
  useUpdateRecurrence,
} from '@/hooks/use-recurrences';
import {
  getCurrentLocalMonth,
  getTodayLocalIsoDate,
  useUpdateTransaction,
} from '@/hooks/use-transactions';
import { ApiError } from '@/lib/api';
import { CATEGORY_TYPE_LABELS, formatCurrency } from '@/lib/format';
import type { RecurrenceChecklistItem } from '@/types/api';

type RecurrenceTab = 'checklist' | 'models';

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

export default function RecurrencesPage() {
  const [tab, setTab] = useState<RecurrenceTab>('checklist');
  const [month, setMonth] = useState(getCurrentLocalMonth);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const { data: reserve } = useReserve();
  const { data: checklist, isLoading: checklistLoading } = useRecurrenceChecklist(month);
  const { data: recurrences = [], isLoading: modelsLoading } = useRecurrences(true);

  const updateTxMutation = useUpdateTransaction();
  const createRecMutation = useCreateRecurrence();
  const updateRecMutation = useUpdateRecurrence();
  const deleteRecMutation = useDeleteRecurrence();

  const [descricao, setDescricao] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [cartaoId, setCartaoId] = useState('');

  const todayIso = getTodayLocalIsoDate();

  async function handleToggleChecklistStatus(item: RecurrenceChecklistItem) {
    setFeedback(null);
    const rawValue = editedValues[item.id];
    let nextValue: number | undefined;

    if (item.status === 'PENDENTE' && rawValue !== undefined && rawValue.trim() !== '') {
      const normalized = rawValue.trim().includes(',')
        ? rawValue.trim().replace(/\./g, '').replace(',', '.')
        : rawValue.trim();
      const parsed = Number(Number(normalized).toFixed(2));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setFeedback('Informe um valor real maior que zero.');
        return;
      }
      if (parsed !== item.valor) {
        nextValue = parsed;
      }
    }

    try {
      await updateTxMutation.mutateAsync({
        id: item.id,
        payload: {
          status: item.status === 'PAGO' ? 'PENDENTE' : 'PAGO',
          ...(nextValue !== undefined ? { valor: nextValue } : {}),
        },
      });
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao atualizar conta fixa.');
    }
  }

  async function handleCreateModel(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const normalized = valorEstimado.trim().includes(',')
      ? valorEstimado.trim().replace(/\./g, '').replace(',', '.')
      : valorEstimado.trim();
    const parsedValor = Number(Number(normalized).toFixed(2));
    const parsedDay = Number(diaVencimento);

    if (!Number.isFinite(parsedValor) || parsedValor <= 0) {
      setFeedback('Informe um valor estimado maior que zero.');
      return;
    }

    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setFeedback('Informe um dia de vencimento entre 1 e 31.');
      return;
    }

    const effectiveCategory =
      categoriaId ||
      categories.find((c) => c.nome === 'Contas Fixas')?.id ||
      categories.find((c) => c.tipo === 'DESPESA')?.id ||
      categories[0]?.id ||
      '';

    if (!effectiveCategory) {
      setFeedback('Cadastre ao menos uma categoria antes de criar uma recorrência.');
      return;
    }

    try {
      const selectedCat = categories.find((c) => c.id === effectiveCategory);
      const effectiveCartaoId = cartaoId && selectedCat?.tipo !== 'RECEITA' ? cartaoId : null;

      await createRecMutation.mutateAsync({
        descricao: descricao.trim(),
        valorEstimado: parsedValor,
        diaVencimento: parsedDay,
        categoriaId: effectiveCategory,
        contaId: effectiveCartaoId ? null : contaId || null,
        cartaoId: effectiveCartaoId,
      });
      setDescricao('');
      setValorEstimado('');
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao criar conta fixa.');
    }
  }

  async function handleToggleModelActive(id: string, current: boolean) {
    setFeedback(null);
    try {
      await updateRecMutation.mutateAsync({ id, payload: { ativa: !current } });
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao atualizar recorrência.');
    }
  }

  async function handleDeleteModel(id: string) {
    setFeedback(null);
    try {
      await deleteRecMutation.mutateAsync(id);
    } catch (err) {
      setFeedback(err instanceof ApiError ? err.message : 'Erro ao excluir recorrência.');
    }
  }

  const summary = checklist?.summary ?? {
    totalFixasDespesas: 0,
    totalPagoDespesas: 0,
    totalPendenteDespesas: 0,
    totalFixasReceitas: 0,
    countTotal: 0,
    countPagas: 0,
    countPendentes: 0,
  };

  const progressPct =
    summary.countTotal > 0 ? Math.round((summary.countPagas / summary.countTotal) * 100) : 0;

  const defaultCategoryId =
    categoriaId ||
    categories.find((c) => c.nome === 'Contas Fixas')?.id ||
    categories.find((c) => c.tipo === 'DESPESA')?.id ||
    categories[0]?.id ||
    '';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Contas Fixas & Recorrências</h1>
          <p className="text-sm text-zinc-400">
            Checklist mensal automático com controle Pago / Pendente sem duplicidade.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('checklist')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              tab === 'checklist'
                ? 'bg-emerald-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Checklist do Mês
          </button>
          <button
            type="button"
            onClick={() => setTab('models')}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              tab === 'models'
                ? 'bg-emerald-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Modelos ({recurrences.length})
          </button>
        </div>
      </header>

      {feedback && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          {feedback}
        </p>
      )}

      {tab === 'checklist' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
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

            <button
              type="button"
              onClick={() => setTab('models')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Conta Fixa
            </button>
          </div>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Total Fixas (Saiu)</p>
              <p className="mt-1 text-xl font-semibold text-zinc-100">
                {formatCurrency(summary.totalFixasDespesas)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Já Pago</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">
                {formatCurrency(summary.totalPagoDespesas)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Falta Pagar</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">
                {formatCurrency(summary.totalPendenteDespesas)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">
                Progresso do mês: {summary.countPagas} de {summary.countTotal} quitadas
              </span>
              <span className="font-semibold text-emerald-400">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </section>

          <section className="space-y-2.5">
            {reserve?.monthlyPriority.prioridadeTopoAtiva && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      Prioridade #1: Reserva Pague-se Primeiro (
                      {reserve.monthlyPriority.pctPaguePrimeiro}%)
                    </p>
                    <p className="text-xs text-zinc-300">
                      {reserve.monthlyPriority.acaoPendenteMes
                        ? `Pendente aportar este mês: ${formatCurrency(reserve.monthlyPriority.valorPendenteMes)} (de ${formatCurrency(reserve.monthlyPriority.metaAporteMes)})`
                        : 'A meta de Reserva ainda não atingiu 100%; este item ocupa o topo da lista até concluir o alvo.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/reserve"
                  className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300"
                >
                  Ir para Reserva &rarr;
                </Link>
              </div>
            )}

            {checklistLoading ? (
              <p className="text-sm text-zinc-400">Gerando e carregando checklist...</p>
            ) : (checklist?.items.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
                <CalendarClock className="mx-auto h-7 w-7 text-zinc-500" />
                <p className="mt-2 text-sm text-zinc-300">
                  Nenhuma conta fixa gerada para este mês.
                </p>
                <button
                  type="button"
                  onClick={() => setTab('models')}
                  className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  Cadastrar primeira conta fixa
                </button>
              </div>
            ) : (
              (checklist?.items ?? []).map((item) => {
                const isOverdue = item.status === 'PENDENTE' && item.dataCompetencia < todayIso;
                const valueInput = editedValues[item.id] ?? String(item.valor);

                return (
                  <article
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                      item.status === 'PAGO'
                        ? 'border-zinc-800/70 bg-zinc-900/40'
                        : isOverdue
                          ? 'border-rose-500/35 bg-rose-500/5'
                          : 'border-zinc-800 bg-zinc-900/70'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            item.status === 'PAGO' ? 'text-zinc-400 line-through' : 'text-zinc-100'
                          }`}
                        >
                          {item.descricao}
                        </span>
                        {item.categoriaNome && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                            {item.categoriaNome}
                          </span>
                        )}
                        {item.ehEssencial && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                            Essencial
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            Atrasada
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.status === 'PAGO'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {item.status === 'PAGO' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {item.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Vence em {formatDateBr(item.dataCompetencia)} •{' '}
                        {item.cartaoId
                          ? `Na fatura: ${item.cartaoNome ?? 'Cartão'}`
                          : (item.contaNome ?? 'Conta')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.cartaoId ? (
                        <>
                          <span className="text-sm font-semibold text-zinc-200">
                            {formatCurrency(item.valor)}
                          </span>
                          <Link
                            href="/cards"
                            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                          >
                            {item.status === 'PAGO' ? 'Fatura paga' : 'Via fatura →'}
                          </Link>
                        </>
                      ) : (
                        <>
                          {item.status === 'PENDENTE' ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Valor real de ${item.descricao}`}
                              value={valueInput}
                              onChange={(e) =>
                                setEditedValues((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-right text-xs font-semibold text-zinc-100 focus:border-emerald-500 focus:outline-none"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-emerald-400">
                              {formatCurrency(item.valor)}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleToggleChecklistStatus(item)}
                            disabled={updateTxMutation.isPending}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              item.status === 'PAGO'
                                ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                            }`}
                          >
                            {item.status === 'PAGO' ? 'Reabrir' : 'Pagar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2.5 lg:col-span-2">
            {modelsLoading ? (
              <p className="text-sm text-zinc-400">Carregando modelos...</p>
            ) : recurrences.length === 0 ? (
              <p className="text-sm text-zinc-400">Nenhuma conta fixa cadastrada ainda.</p>
            ) : (
              recurrences.map((rec) => (
                <article
                  key={rec.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                    rec.ativa
                      ? 'border-zinc-800 bg-zinc-900/70'
                      : 'border-zinc-800/50 bg-zinc-900/30 opacity-65'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{rec.descricao}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                        {rec.categoriaNome} ({CATEGORY_TYPE_LABELS[rec.categoriaTipo]})
                      </span>
                      {!rec.ativa && (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                          Pausada
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Todo dia {rec.diaVencimento} •{' '}
                      {rec.cartaoId
                        ? `Cartão ${rec.cartaoNome ?? 'Crédito'}`
                        : (rec.contaNome ?? 'Conta padrão')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      {formatCurrency(rec.valorEstimado)}
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleToggleModelActive(rec.id, rec.ativa)}
                      disabled={updateRecMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                    >
                      {rec.ativa ? (
                        <>
                          <PauseCircle className="h-3.5 w-3.5 text-amber-300" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                          Reativar
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label={`Excluir ${rec.descricao}`}
                      onClick={() => void handleDeleteModel(rec.id)}
                      disabled={deleteRecMutation.isPending}
                      className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => void handleCreateModel(e)}
            className="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-zinc-100">Nova Conta Fixa</h2>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Descrição</label>
              <input
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Aluguel, Internet, Academia"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Valor estimado
                </label>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(e.target.value)}
                  placeholder="150.00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Dia vencimento
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={31}
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Categoria</label>
              <select
                value={defaultCategoryId}
                onChange={(e) => {
                  const nextCatId = e.target.value;
                  setCategoriaId(nextCatId);
                  const nextCat = categories.find((c) => c.id === nextCatId);
                  if (nextCat?.tipo === 'RECEITA') {
                    setCartaoId('');
                  }
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome} ({CATEGORY_TYPE_LABELS[cat.tipo]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Conta ou Cartão
              </label>
              <select
                value={cartaoId ? `card:${cartaoId}` : contaId ? `account:${contaId}` : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setContaId('');
                    setCartaoId('');
                  } else if (value.startsWith('card:')) {
                    setContaId('');
                    setCartaoId(value.slice(5));
                  } else if (value.startsWith('account:')) {
                    setCartaoId('');
                    setContaId(value.slice(8));
                  }
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Conta padrão</option>
                <optgroup label="Contas">
                  {accounts.map((account) => (
                    <option key={account.id} value={`account:${account.id}`}>
                      {account.nome}
                    </option>
                  ))}
                </optgroup>
                {categories.find((c) => c.id === defaultCategoryId)?.tipo !== 'RECEITA' &&
                  cards.length > 0 && (
                    <optgroup label="Cartões de Crédito (Assinaturas)">
                      {cards.map((card) => (
                        <option key={card.id} value={`card:${card.id}`}>
                          Cartão {card.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
              </select>
            </div>

            <button
              type="submit"
              disabled={createRecMutation.isPending}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {createRecMutation.isPending ? 'Salvando...' : 'Criar Conta Fixa'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

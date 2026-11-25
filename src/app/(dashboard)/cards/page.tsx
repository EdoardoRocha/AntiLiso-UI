'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  FileUp,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useCreateCreditCard,
  useCreditCardInvoice,
  useCreditCards,
  useDeleteCreditCard,
  usePayCreditCardInvoice,
  useUpdateCreditCard,
} from '@/hooks/use-credit-cards';
import { getTodayLocalIsoDate } from '@/hooks/use-safe-to-spend';
import { getCurrentLocalMonth } from '@/hooks/use-transactions';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { CeilingAlertStatus, CreditCard, InvoiceStatus } from '@/types/api';

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

function parseMoneyInput(raw: string): number {
  const normalized = raw.trim().includes(',')
    ? raw.trim().replace(/\./g, '').replace(',', '.')
    : raw.trim();
  return Number(Number(normalized).toFixed(2));
}

const INVOICE_STATUS_UI: Record<InvoiceStatus, { label: string; className: string }> = {
  ABERTA: {
    label: 'Aberta',
    className: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  FECHADA: {
    label: 'Fechada',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  VENCIDA: {
    label: 'Vencida',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  PAGA: {
    label: 'Paga',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  VAZIA: {
    label: 'Sem compras',
    className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
};

const CEILING_STATUS_UI: Record<CeilingAlertStatus, { label: string; className: string }> = {
  OK: {
    label: 'Dentro do teto',
    className: 'bg-emerald-500/15 text-emerald-300',
  },
  PROXIMO: {
    label: 'Próximo do teto',
    className: 'bg-amber-500/15 text-amber-300',
  },
  ATINGIDO: {
    label: 'Teto atingido',
    className: 'bg-rose-500/20 text-rose-300',
  },
  SEM_TETO: {
    label: 'Sem teto',
    className: 'bg-zinc-800 text-zinc-400',
  },
};

export default function CardsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [], isLoading: cardsLoading } = useCreditCards();

  const createCardMutation = useCreateCreditCard();
  const updateCardMutation = useUpdateCreditCard();
  const deleteCardMutation = useDeleteCreditCard();
  const payInvoiceMutation = usePayCreditCardInvoice();

  const payableAccounts = accounts.filter((account) => account.tipo !== 'COFRE');
  const defaultPayAccountId =
    payableAccounts.find((account) => account.ehContaPadrao)?.id ?? payableAccounts[0]?.id ?? '';

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [invoiceMonthOverride, setInvoiceMonthOverride] = useState<string | null>(null);
  const [payAccountOverride, setPayAccountOverride] = useState<string | null>(null);
  const [payDate, setPayDate] = useState<string>(getTodayLocalIsoDate);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [contaPagamentoId, setContaPagamentoId] = useState('');
  const [limiteTotalStr, setLimiteTotalStr] = useState('');
  const [tetoMensalStr, setTetoMensalStr] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('25');
  const [diaVencimento, setDiaVencimento] = useState('5');

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const activeCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const invoiceMonth =
    invoiceMonthOverride ?? activeCard?.faturaAbertaMonth ?? getCurrentLocalMonth();
  const payAccountId = payAccountOverride ?? activeCard?.contaPagamentoId ?? '';

  const { data: invoice, isLoading: invoiceLoading } = useCreditCardInvoice(
    activeCard?.id ?? null,
    invoiceMonth,
  );

  const consolidatedLimiteTotal = cards.reduce((sum, c) => sum + c.limiteTotal, 0);
  const consolidatedLimiteUtilizado = cards.reduce((sum, c) => sum + c.limiteUtilizado, 0);
  const consolidatedLimiteDisponivel = cards.reduce((sum, c) => sum + c.limiteDisponivel, 0);

  function resetForm() {
    setEditingCardId(null);
    setNome('');
    setContaPagamentoId('');
    setLimiteTotalStr('');
    setTetoMensalStr('');
    setDiaFechamento('25');
    setDiaVencimento('5');
  }

  function startEditCard(card: CreditCard) {
    setFeedback(null);
    setEditingCardId(card.id);
    setNome(card.nome);
    setContaPagamentoId(card.contaPagamentoId);
    setLimiteTotalStr(String(card.limiteTotal));
    setTetoMensalStr(String(card.tetoMensalAlerta));
    setDiaFechamento(String(card.diaFechamento));
    setDiaVencimento(String(card.diaVencimento));
  }

  async function handleSubmitCard(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const limiteTotal = parseMoneyInput(limiteTotalStr);
    const tetoMensalAlerta = tetoMensalStr.trim() ? parseMoneyInput(tetoMensalStr) : 0;
    const fechamento = Number(diaFechamento);
    const vencimento = Number(diaVencimento);
    const effectiveContaPagamentoId = contaPagamentoId || defaultPayAccountId;

    if (!effectiveContaPagamentoId) {
      setFeedback({
        kind: 'err',
        text: 'Cadastre ou reative uma conta corrente/carteira antes de criar um cartão.',
      });
      return;
    }

    if (!Number.isFinite(limiteTotal) || limiteTotal <= 0) {
      setFeedback({ kind: 'err', text: 'Informe um limite total maior que zero.' });
      return;
    }

    if (!Number.isFinite(tetoMensalAlerta) || tetoMensalAlerta < 0) {
      setFeedback({ kind: 'err', text: 'Informe um teto mensal de alerta válido (ou 0).' });
      return;
    }

    if (tetoMensalAlerta > limiteTotal) {
      setFeedback({
        kind: 'err',
        text: 'O teto mensal de alerta não pode ser maior que o limite total do cartão.',
      });
      return;
    }

    try {
      if (editingCardId) {
        await updateCardMutation.mutateAsync({
          id: editingCardId,
          payload: {
            nome: nome.trim(),
            contaPagamentoId: effectiveContaPagamentoId,
            limiteTotal,
            tetoMensalAlerta,
            diaFechamento: fechamento,
            diaVencimento: vencimento,
          },
        });
        setFeedback({ kind: 'ok', text: 'Cartão atualizado com sucesso!' });
      } else {
        const created = await createCardMutation.mutateAsync({
          nome: nome.trim(),
          contaPagamentoId: effectiveContaPagamentoId,
          limiteTotal,
          tetoMensalAlerta,
          diaFechamento: fechamento,
          diaVencimento: vencimento,
        });
        setSelectedCardId(created.id);
        setInvoiceMonthOverride(created.faturaAbertaMonth);
        setPayAccountOverride(created.contaPagamentoId);
        setFeedback({ kind: 'ok', text: `Cartão "${created.nome}" cadastrado!` });
      }

      resetForm();
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Não foi possível salvar o cartão.',
      });
    }
  }

  async function handleDeleteCard(card: CreditCard) {
    setFeedback(null);
    try {
      await deleteCardMutation.mutateAsync(card.id);
      if (selectedCardId === card.id) {
        setSelectedCardId(null);
        setInvoiceMonthOverride(null);
        setPayAccountOverride(null);
      }
      if (editingCardId === card.id) {
        resetForm();
      }
      setFeedback({ kind: 'ok', text: `Cartão "${card.nome}" removido.` });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao remover cartão.',
      });
    }
  }

  async function handlePayInvoice() {
    if (!activeCard || !invoice) {
      return;
    }
    setFeedback(null);

    try {
      const result = await payInvoiceMutation.mutateAsync({
        cardId: activeCard.id,
        month: invoice.month,
        payload: {
          contaPagamentoId: payAccountId || activeCard.contaPagamentoId,
          dataPagamento: payDate,
        },
      });
      setFeedback({
        kind: 'ok',
        text: `Fatura ${result.month} paga (${formatCurrency(result.valorPago)})! Limite liberado e transferência neutra registrada.`,
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Não foi possível pagar a fatura.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Cartões &amp; Faturas</h1>
          <p className="text-sm text-zinc-400">
            Separe o limite do cartão do saldo em conta e monitore o teto mensal por competência.
          </p>
        </div>

        <Link
          href={
            activeCard
              ? `/imports?targetType=CARTAO&cartaoId=${activeCard.id}`
              : '/imports?targetType=CARTAO'
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <FileUp className="h-3.5 w-3.5" />
          Importar Fatura OFX/CSV
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Limite Total Consolidado</p>
          <p className="mt-1 text-xl font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(consolidatedLimiteTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Limite Utilizado (Em Aberto)</p>
          <p className="mt-1 text-xl font-semibold text-amber-300 tabular-nums">
            {formatCurrency(consolidatedLimiteUtilizado)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-400">Limite Disponível</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(consolidatedLimiteDisponivel)}
          </p>
        </div>
      </section>

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cardsLoading ? (
            <p className="text-sm text-zinc-400">Carregando cartões...</p>
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
              <CreditCardIcon className="mx-auto h-8 w-8 text-zinc-500" />
              <p className="mt-2 text-sm text-zinc-300">Nenhum cartão cadastrado ainda.</p>
              <p className="mt-1 text-xs text-zinc-500">
                Cadastre seu primeiro cartão ao lado para controlar faturas por competência e teto
                de gastos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => {
                const selected = activeCard?.id === card.id;
                const limitPct =
                  card.limiteTotal > 0
                    ? Math.min(100, Math.round((card.limiteUtilizado / card.limiteTotal) * 100))
                    : 0;
                const ceilingUi = CEILING_STATUS_UI[card.alertaTetoStatus];

                return (
                  <article
                    key={card.id}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      setInvoiceMonthOverride(card.faturaAbertaMonth);
                      setPayAccountOverride(card.contaPagamentoId);
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      selected
                        ? 'border-emerald-500/60 bg-zinc-900'
                        : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-zinc-100">{card.nome}</h2>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ceilingUi.className}`}
                          >
                            {ceilingUi.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Conta pagadora: {card.contaPagamentoNome} &middot; Fecha dia{' '}
                          {card.diaFechamento} &middot; Vence dia {card.diaVencimento}
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => startEditCard(card)}
                          aria-label={`Editar ${card.nome}`}
                          className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCard(card)}
                          disabled={deleteCardMutation.isPending}
                          aria-label={`Excluir ${card.nome}`}
                          className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-zinc-400">
                            Limite usado:{' '}
                            <strong className="text-zinc-200 tabular-nums">
                              {formatCurrency(card.limiteUtilizado)}
                            </strong>{' '}
                            / {formatCurrency(card.limiteTotal)}
                          </span>
                          <span className="font-medium text-emerald-400 tabular-nums">
                            Disponível: {formatCurrency(card.limiteDisponivel)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              limitPct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${limitPct}%` }}
                          />
                        </div>
                      </div>

                      {card.tetoMensalAlerta > 0 && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-zinc-400">
                              Fatura aberta ({card.faturaAbertaMonth}):{' '}
                              <strong className="text-zinc-100 tabular-nums">
                                {formatCurrency(card.totalFaturaAberta)}
                              </strong>{' '}
                              / Teto {formatCurrency(card.tetoMensalAlerta)}
                            </span>
                            <span
                              className={`font-semibold tabular-nums ${
                                card.alertaTetoStatus === 'ATINGIDO'
                                  ? 'text-rose-400'
                                  : card.alertaTetoStatus === 'PROXIMO'
                                    ? 'text-amber-300'
                                    : 'text-zinc-300'
                              }`}
                            >
                              {card.percentualTeto.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={`h-full rounded-full transition-all ${
                                card.alertaTetoStatus === 'ATINGIDO'
                                  ? 'bg-rose-500'
                                  : card.alertaTetoStatus === 'PROXIMO'
                                    ? 'bg-amber-400'
                                    : 'bg-sky-500'
                              }`}
                              style={{ width: `${Math.min(100, card.percentualTeto)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {card.alertaTetoStatus === 'ATINGIDO' && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                          <span>
                            Alerta de teto: a fatura aberta atingiu o teto mensal de{' '}
                            {formatCurrency(card.tetoMensalAlerta)}.
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeCard && (
            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Fatura — {activeCard.nome}
                    </h2>
                    {invoice && (
                      <p className="text-[11px] text-zinc-400">
                        Ciclo {formatDateBr(invoice.periodStart)} até{' '}
                        {formatDateBr(invoice.closingDate)} &middot; Vencimento{' '}
                        {formatDateBr(invoice.dueDate)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {invoice && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        INVOICE_STATUS_UI[invoice.statusFatura].className
                      }`}
                    >
                      {INVOICE_STATUS_UI[invoice.statusFatura].label}
                    </span>
                  )}
                  <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                    <button
                      type="button"
                      aria-label="Fatura anterior"
                      onClick={() => setInvoiceMonthOverride(shiftMonth(invoiceMonth, -1))}
                      className="rounded-lg p-1 text-zinc-300 hover:bg-zinc-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-32 text-center text-xs font-medium capitalize text-zinc-100">
                      {formatMonthLabel(invoiceMonth)}
                    </span>
                    <button
                      type="button"
                      aria-label="Próxima fatura"
                      onClick={() => setInvoiceMonthOverride(shiftMonth(invoiceMonth, 1))}
                      className="rounded-lg p-1 text-zinc-300 hover:bg-zinc-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {invoiceLoading ? (
                <p className="text-xs text-zinc-400">Carregando fatura...</p>
              ) : invoice ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[11px] text-zinc-400">Total da Fatura</p>
                      <p className="mt-0.5 text-lg font-semibold text-zinc-100 tabular-nums">
                        {formatCurrency(invoice.totalFatura)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[11px] text-zinc-400">Em Aberto (Pendente)</p>
                      <p className="mt-0.5 text-lg font-semibold text-amber-300 tabular-nums">
                        {formatCurrency(invoice.totalPendente)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[11px] text-zinc-400">Já Quitado</p>
                      <p className="mt-0.5 text-lg font-semibold text-emerald-400 tabular-nums">
                        {formatCurrency(invoice.totalPago)}
                      </p>
                    </div>
                  </div>

                  {invoice.totalPendente > 0 && (
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                      <div className="grid flex-1 gap-2.5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] text-zinc-300">
                            Debitar da conta
                          </label>
                          <select
                            value={payAccountId || activeCard.contaPagamentoId}
                            onChange={(e) => setPayAccountOverride(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          >
                            {payableAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.nome} ({formatCurrency(acc.saldoAtual)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-zinc-300">
                            Data do pagamento
                          </label>
                          <input
                            type="date"
                            value={payDate}
                            onChange={(e) => setPayDate(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handlePayInvoice()}
                        disabled={payInvoiceMutation.isPending}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {payInvoiceMutation.isPending
                          ? 'Quitando...'
                          : `Pagar Fatura (${formatCurrency(invoice.totalPendente)})`}
                      </button>
                    </div>
                  )}

                  {invoice.items.length === 0 ? (
                    <p className="text-xs text-zinc-400">
                      Nenhum lançamento nesta janela de fatura.
                    </p>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {invoice.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-zinc-100">
                                {item.descricao}
                              </span>
                              {item.categoriaNome && (
                                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                                  {item.categoriaNome}
                                </span>
                              )}
                              {item.recorrenciaId && (
                                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-300">
                                  Assinatura Fixa
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                                  item.status === 'PAGO'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {item.status === 'PAGO' && <CheckCircle2 className="h-3 w-3" />}
                                {item.status === 'PAGO' ? 'Quitada' : 'Na fatura'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">
                              Compra em {formatDateBr(item.dataCompetencia)}
                            </p>
                          </div>

                          <span className="text-sm font-semibold text-rose-400 tabular-nums">
                            {formatCurrency(item.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </section>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmitCard(e)}
          className="h-fit space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                {editingCardId ? 'Editar Cartão' : 'Novo Cartão'}
              </h2>
            </div>
            {editingCardId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Nome do cartão</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank, Inter Black"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Conta pagadora da fatura
            </label>
            <select
              value={contaPagamentoId || defaultPayAccountId}
              onChange={(e) => setContaPagamentoId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {payableAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Limite total</label>
              <input
                type="text"
                required
                inputMode="decimal"
                value={limiteTotalStr}
                onChange={(e) => setLimiteTotalStr(e.target.value)}
                placeholder="3000.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Teto de alerta</label>
              <input
                type="text"
                inputMode="decimal"
                value={tetoMensalStr}
                onChange={(e) => setTetoMensalStr(e.target.value)}
                placeholder="1000.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Dia fechamento</label>
              <input
                type="number"
                required
                min={1}
                max={31}
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Dia vencimento</label>
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

          <button
            type="submit"
            disabled={createCardMutation.isPending || updateCardMutation.isPending}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {createCardMutation.isPending || updateCardMutation.isPending
              ? 'Salvando...'
              : editingCardId
                ? 'Salvar Alterações'
                : 'Cadastrar Cartão'}
          </button>
        </form>
      </div>
    </div>
  );
}

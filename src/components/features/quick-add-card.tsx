'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories, useCategorySuggestion } from '@/hooks/use-categories';
import { useCreditCards } from '@/hooks/use-credit-cards';
import { useCreateReserveDeposit } from '@/hooks/use-reserve';
import { getTodayLocalIsoDate, useSmartCreateTransaction } from '@/hooks/use-transactions';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { parseQuickAddTextClient } from '@/lib/quick-add-parser';
import type { CardCeilingAlert, ReserveSplitSuggestion } from '@/types/api';

type QuickAddMode = 'text' | 'clicks';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function formatCardAlertSuffix(cardAlert?: CardCeilingAlert | null): string {
  if (!cardAlert) {
    return '';
  }
  const verb = cardAlert.status === 'ATINGIDO' ? 'atingiu o teto' : 'está próximo do teto';
  return ` Alerta de teto: fatura ${cardAlert.month} de ${cardAlert.cardNome} ${verb} (${formatCurrency(cardAlert.totalFatura)} / ${formatCurrency(cardAlert.tetoMensalAlerta)}).`;
}

export function QuickAddCard() {
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const createMutation = useSmartCreateTransaction();
  const depositReserveMutation = useCreateReserveDeposit();

  const liquidAccounts = accounts.filter((a) => !a.ehCofreReserva && a.tipo !== 'COFRE');

  const [mode, setMode] = useState<QuickAddMode>('text');
  const [texto, setTexto] = useState('');
  const [textCategoryOverride, setTextCategoryOverride] = useState<string | null | undefined>(
    undefined,
  );

  const [tipo, setTipo] = useState<'DESP' | 'REC'>('DESP');
  const [valorStr, setValorStr] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [contaId, setContaId] = useState<string>('');
  const [cartaoId, setCartaoId] = useState<string>('');
  const [dataCompetencia, setDataCompetencia] = useState(getTodayLocalIsoDate);
  const [isPendente, setIsPendente] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [feedback, setFeedback] = useState<{
    kind: 'ok' | 'offline' | 'err' | 'alert';
    text: string;
  } | null>(null);
  const [pendingSplit, setPendingSplit] = useState<ReserveSplitSuggestion | null>(null);

  const defaultAccount =
    liquidAccounts.find((account) => account.ehContaPadrao) ?? liquidAccounts[0];
  const parsedPreview = mode === 'text' ? parseQuickAddTextClient(texto) : null;

  const debouncedTextDesc = useDebouncedValue(parsedPreview?.descricao ?? '', 200);
  const { data: textSuggestion } = useCategorySuggestion(
    debouncedTextDesc,
    parsedPreview?.tipo ?? 'DESP',
    mode === 'text' && Boolean(parsedPreview),
  );

  const debouncedManualDesc = useDebouncedValue(descricao, 200);
  const { data: manualSuggestion } = useCategorySuggestion(
    debouncedManualDesc,
    tipo,
    mode === 'clicks' &&
      showAdvanced &&
      categoriaId === null &&
      debouncedManualDesc.trim().length >= 2,
  );

  const activeModeTipo = mode === 'text' ? (parsedPreview?.tipo ?? 'DESP') : tipo;
  const filteredCategories = categories.filter((category) =>
    activeModeTipo === 'REC' ? category.tipo === 'RECEITA' : category.tipo === 'DESPESA',
  );

  const effectiveTextCategory =
    textCategoryOverride === undefined
      ? textSuggestion
        ? {
            id: textSuggestion.categoriaId,
            nome: textSuggestion.categoriaNome,
            source: textSuggestion.source,
            hitsConfianca: textSuggestion.hitsConfianca,
          }
        : null
      : textCategoryOverride === null
        ? null
        : (() => {
            const found = filteredCategories.find((c) => c.id === textCategoryOverride);
            return found
              ? { id: found.id, nome: found.nome, source: 'MANUAL' as const, hitsConfianca: null }
              : null;
          })();

  function handleSelectCategory(id: string, nome: string) {
    setCategoriaId((prev) => (prev === id ? null : id));
    if (!descricao.trim()) {
      setDescricao(nome);
    }
  }

  async function handleApplyReserveSplit() {
    if (!pendingSplit) {
      return;
    }
    setFeedback(null);
    try {
      await depositReserveMutation.mutateAsync({
        contaOrigemId: pendingSplit.contaOrigemId,
        valor: pendingSplit.valorSugerido,
        descricao: 'Split automático Pague-se Primeiro',
      });
      const valorAplicado = pendingSplit.valorSugerido;
      setPendingSplit(null);
      setFeedback({
        kind: 'ok',
        text: `Aporte de ${formatCurrency(valorAplicado)} aplicado na Reserva de Emergência!`,
      });
    } catch (error) {
      setFeedback({
        kind: 'err',
        text: error instanceof ApiError ? error.message : 'Erro ao aplicar aporte na reserva.',
      });
    }
  }

  async function handleTextSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setPendingSplit(null);

    if (!texto.trim()) {
      setFeedback({ kind: 'err', text: 'Digite o gasto ou receita (ex: Almoço 35 pix).' });
      return;
    }

    try {
      const effectiveCartaoId = parsedPreview?.tipo !== 'REC' && cartaoId ? cartaoId : null;
      const result = await createMutation.mutateAsync({
        mode: 'quick',
        texto: texto.trim(),
        contaId: effectiveCartaoId ? null : contaId || null,
        cartaoId: effectiveCartaoId,
        categoriaId: textCategoryOverride !== undefined ? textCategoryOverride : undefined,
        dataCompetencia: showAdvanced ? dataCompetencia : getTodayLocalIsoDate(),
        status: showAdvanced && isPendente ? 'PENDENTE' : 'PAGO',
      });

      setTexto('');
      setTextCategoryOverride(undefined);
      setPendingSplit(
        !result.queuedOffline && result.reserveSplitSuggestion
          ? result.reserveSplitSuggestion
          : null,
      );
      const baseText = result.categoriaNome
        ? `Lançamento registrado em ${result.categoriaNome}!`
        : 'Lançamento registrado em 1 passo!';
      setFeedback(
        result.queuedOffline
          ? { kind: 'offline', text: 'Salvo offline — será sincronizado ao reconectar.' }
          : result.cardAlert
            ? {
                kind: 'alert',
                text: `${baseText}${formatCardAlertSuffix(result.cardAlert)}`,
              }
            : {
                kind: 'ok',
                text: baseText,
              },
      );
    } catch (error) {
      setFeedback({
        kind: 'err',
        text:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Não foi possível registrar o lançamento.',
      });
    }
  }

  async function handleClicksSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    setPendingSplit(null);

    const normalized = valorStr.trim().includes(',')
      ? valorStr.trim().replace(/\./g, '').replace(',', '.')
      : valorStr.trim();
    const valor = Number(Number(normalized).toFixed(2));

    if (!Number.isFinite(valor) || valor <= 0) {
      setFeedback({ kind: 'err', text: 'Informe um valor maior que zero.' });
      return;
    }

    const selectedCategory = filteredCategories.find((c) => c.id === categoriaId);
    const effectiveDescription =
      descricao.trim() ||
      selectedCategory?.nome ||
      (tipo === 'REC' ? 'Receita rápida' : 'Gasto rápido');

    try {
      const effectiveCartaoId = tipo === 'DESP' && cartaoId ? cartaoId : null;
      const result = await createMutation.mutateAsync({
        mode: 'manual',
        tipo,
        valor,
        descricao: effectiveDescription,
        categoriaId,
        contaId: effectiveCartaoId ? null : contaId || null,
        cartaoId: effectiveCartaoId,
        dataCompetencia: showAdvanced ? dataCompetencia : getTodayLocalIsoDate(),
        status: showAdvanced && isPendente ? 'PENDENTE' : 'PAGO',
      });

      setValorStr('');
      setDescricao('');
      setCategoriaId(null);
      setPendingSplit(
        !result.queuedOffline && result.reserveSplitSuggestion
          ? result.reserveSplitSuggestion
          : null,
      );
      setFeedback(
        result.queuedOffline
          ? { kind: 'offline', text: 'Salvo offline — será sincronizado ao reconectar.' }
          : result.cardAlert
            ? {
                kind: 'alert',
                text: `Lançamento registrado!${formatCardAlertSuffix(result.cardAlert)}`,
              }
            : { kind: 'ok', text: 'Lançamento registrado!' },
      );
    } catch (error) {
      setFeedback({
        kind: 'err',
        text:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Não foi possível registrar o lançamento.',
      });
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-zinc-900/90 to-zinc-900/60 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-50">Lançamento Rápido (Quick-Add)</h2>
            <p className="text-xs text-zinc-400">
              Conta padrão:{' '}
              <span className="text-zinc-200">{defaultAccount?.nome ?? 'Carregando...'}</span>
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('text');
              setFeedback(null);
            }}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              mode === 'text' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Texto rápido
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('clicks');
              setTextCategoryOverride(undefined);
              setFeedback(null);
            }}
            className={`rounded-lg px-3 py-1 font-medium transition ${
              mode === 'clicks'
                ? 'bg-emerald-500 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            2 Cliques
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <form onSubmit={(e) => void handleTextSubmit(e)} className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setTextCategoryOverride(undefined);
              }}
              placeholder="Ex: Almoço 35 pix, Uber 24,90 ou +500 freela"
              aria-label="Lançamento em texto natural"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando...' : 'Lançar'}
            </button>
          </div>

          {parsedPreview && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    parsedPreview.tipo === 'REC'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {parsedPreview.tipo === 'REC' ? 'Entrou' : 'Saiu'}
                </span>
                <span className="font-semibold text-zinc-100">
                  {formatCurrency(parsedPreview.valor)}
                </span>
                <span className="text-zinc-300">• {parsedPreview.descricao}</span>
                {effectiveTextCategory && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                    {effectiveTextCategory.nome}
                    {effectiveTextCategory.source === 'RULE' && effectiveTextCategory.hitsConfianca
                      ? ` • ${effectiveTextCategory.hitsConfianca}x`
                      : ''}
                  </span>
                )}
                <span className="text-zinc-500">
                  •{' '}
                  {(() => {
                    const explicitCard =
                      parsedPreview.tipo === 'DESP' && cartaoId
                        ? cards.find((c) => c.id === cartaoId)
                        : undefined;
                    const autoCard =
                      !explicitCard &&
                      !contaId &&
                      parsedPreview.tipo === 'DESP' &&
                      (parsedPreview.metodoDetectado === 'credito' ||
                        parsedPreview.metodoDetectado === 'cartao')
                        ? cards[0]
                        : undefined;
                    const resolvedCard = explicitCard ?? autoCard;
                    if (resolvedCard) {
                      return `Cartão ${resolvedCard.nome}`;
                    }
                    const chosenAcc = contaId ? accounts.find((a) => a.id === contaId) : undefined;
                    return chosenAcc?.nome ?? defaultAccount?.nome ?? 'Conta padrão';
                  })()}{' '}
                  • Hoje
                </span>
              </div>

              <select
                aria-label="Trocar categoria sugerida"
                value={effectiveTextCategory?.id ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setTextCategoryOverride(value ? value : null);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Sem categoria</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={(e) => void handleClicksSubmit(e)} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => {
                setTipo('DESP');
                setCategoriaId(null);
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                tipo === 'DESP'
                  ? 'border-rose-500/50 bg-rose-500/20 text-rose-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Saiu (Despesa)
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo('REC');
                setCategoriaId(null);
                setCartaoId('');
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                tipo === 'REC'
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entrou (Receita)
            </button>
            <input
              type="text"
              inputMode="decimal"
              required
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              placeholder="Valor (R$)"
              className="col-span-2 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {filteredCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filteredCategories.map((category) => {
                const selected = categoriaId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectCategory(category.id, category.nome)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {category.nome}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Registrando...' : 'Confirmar Lançamento'}
          </button>
        </form>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Mais opções (conta, data ou pendente)
        </button>

        {showAdvanced && (
          <div className="mt-2.5 grid gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:grid-cols-3">
            {mode === 'clicks' && (
              <div className="space-y-1.5 sm:col-span-3">
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição opcional"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                {manualSuggestion && (
                  <button
                    type="button"
                    onClick={() => setCategoriaId(manualSuggestion.categoriaId)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <Sparkles className="h-3 w-3" />
                    Aplicar sugestão: {manualSuggestion.categoriaNome}
                  </button>
                )}
              </div>
            )}

            <select
              aria-label="Conta ou cartão"
              value={
                activeModeTipo === 'DESP' && cartaoId
                  ? `card:${cartaoId}`
                  : contaId
                    ? `account:${contaId}`
                    : ''
              }
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
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Automático ({defaultAccount?.nome ?? 'Principal'})</option>
              <optgroup label="Contas líquidas">
                {liquidAccounts.map((account) => (
                  <option key={account.id} value={`account:${account.id}`}>
                    {account.nome}
                  </option>
                ))}
              </optgroup>
              {activeModeTipo === 'DESP' && cards.length > 0 && (
                <optgroup label="Cartões de Crédito">
                  {cards.map((card) => (
                    <option key={card.id} value={`card:${card.id}`}>
                      Cartão {card.nome}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <input
              type="date"
              value={dataCompetencia}
              onChange={(e) => setDataCompetencia(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />

            {activeModeTipo === 'DESP' && cartaoId ? (
              <span className="flex items-center text-[11px] text-amber-300">
                Cartão entra pendente na fatura
              </span>
            ) : (
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={isPendente}
                  onChange={(e) => setIsPendente(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900"
                />
                Marcar como pendente
              </label>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : feedback.kind === 'offline' || feedback.kind === 'alert'
                ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
        >
          {feedback.kind === 'offline' && <WifiOff className="h-3.5 w-3.5 shrink-0" />}
          {feedback.kind === 'alert' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {pendingSplit && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-100">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Pague-se Primeiro:</strong> separar {pendingSplit.pctPaguePrimeiro}% (
              <strong>{formatCurrency(pendingSplit.valorSugerido)}</strong>) desta receita na
              Reserva?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={depositReserveMutation.isPending}
              onClick={() => void handleApplyReserveSplit()}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {depositReserveMutation.isPending
                ? 'Aportando...'
                : `Aportar ${formatCurrency(pendingSplit.valorSugerido)}`}
            </button>
            <button
              type="button"
              onClick={() => setPendingSplit(null)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

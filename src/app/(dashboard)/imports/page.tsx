'use client';

import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileUp,
  Landmark,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useCreditCards } from '@/hooks/use-credit-cards';
import { useCommitImport, usePreviewImport } from '@/hooks/use-imports';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type {
  CommitImportResponse,
  ImportPreviewItem,
  ImportPreviewResponse,
  ImportPreviewStatus,
  ImportTargetType,
} from '@/types/api';

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) {
    return isoDate;
  }
  return `${d}/${m}/${y}`;
}

async function decodeStatementFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

const STATUS_BADGE_UI: Record<ImportPreviewStatus, { label: string; className: string }> = {
  NOVO: {
    label: 'Novo',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  },
  DUPLICADO_HASH: {
    label: 'Já importado',
    className: 'border-zinc-700 bg-zinc-800 text-zinc-400',
  },
  POSSIVEL_DUPLICATA_MANUAL: {
    label: 'Possível duplicata',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  IGNORADO_CREDITO_CARTAO: {
    label: 'Pgto/Crédito ignorado',
    className: 'border-zinc-700 bg-zinc-800/80 text-zinc-400',
  },
  IGNORADO_VALOR_ZERO: {
    label: 'Valor zero',
    className: 'border-zinc-700 bg-zinc-800/80 text-zinc-400',
  },
};

export default function ImportsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();

  const previewMutation = usePreviewImport();
  const commitMutation = useCommitImport();

  const liquidAccounts = accounts.filter((account) => account.tipo !== 'COFRE');
  const defaultAccountId =
    liquidAccounts.find((account) => account.ehContaPadrao)?.id ?? liquidAccounts[0]?.id ?? '';

  const [targetType, setTargetType] = useState<ImportTargetType>('CONTA');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');

  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [commitResult, setCommitResult] = useState<CommitImportResponse | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTarget = params.get('targetType');
    const paramCardId = params.get('cartaoId');
    const paramAccountId = params.get('contaId');

    if (paramTarget === 'CARTAO') {
      setTargetType('CARTAO');
    } else if (paramTarget === 'CONTA') {
      setTargetType('CONTA');
    }

    if (paramCardId) {
      setSelectedCardId(paramCardId);
    }
    if (paramAccountId) {
      setSelectedAccountId(paramAccountId);
    }
  }, []);

  const effectiveAccountId = selectedAccountId || defaultAccountId;
  const effectiveCardId = selectedCardId || cards[0]?.id || '';

  const receitaCategories = categories.filter((c) => c.tipo === 'RECEITA');
  const despesaCategories = categories.filter((c) => c.tipo === 'DESPESA');

  async function runPreview(nextFileName: string, nextContent: string) {
    setFeedbackError(null);
    setCommitResult(null);

    if (!nextContent.trim()) {
      setFeedbackError('O arquivo ou conteúdo informado está vazio.');
      return;
    }

    if (targetType === 'CONTA' && !effectiveAccountId) {
      setFeedbackError('Cadastre ou ative uma conta líquida antes de importar extratos.');
      return;
    }

    if (targetType === 'CARTAO' && !effectiveCardId) {
      setFeedbackError('Cadastre um cartão de crédito antes de importar faturas.');
      return;
    }

    try {
      const data = await previewMutation.mutateAsync({
        fileName: nextFileName.trim() || 'extrato.csv',
        content: nextContent,
        targetType,
        contaId: targetType === 'CONTA' ? effectiveAccountId : null,
        cartaoId: targetType === 'CARTAO' ? effectiveCardId : null,
      });

      const initialSelected: Record<number, boolean> = {};
      const initialCategories: Record<number, string> = {};
      for (const item of data.items) {
        if (item.canImport) {
          initialSelected[item.rowIndex] = item.selectedByDefault;
          initialCategories[item.rowIndex] = item.categoriaSugeridaId ?? '';
        }
      }

      setPreview(data);
      setSelectedRows(initialSelected);
      setCategoryOverrides(initialCategories);
    } catch (err) {
      setPreview(null);
      setFeedbackError(
        err instanceof ApiError ? err.message : 'Não foi possível analisar o arquivo enviado.',
      );
    }
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    setFeedbackError(null);
    try {
      const decoded = await decodeStatementFile(file);
      setFileName(file.name);
      setFileContent(decoded);
      await runPreview(file.name, decoded);
    } catch {
      setFeedbackError('Falha ao ler o arquivo selecionado no navegador.');
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    void handleFileSelected(file);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    void handleFileSelected(file);
  }

  function handleToggleTargetType(nextType: ImportTargetType) {
    setTargetType(nextType);
    setPreview(null);
    setCommitResult(null);
    setFeedbackError(null);
  }

  function handleSelectOnlyNew() {
    if (!preview) {
      return;
    }
    const next: Record<number, boolean> = {};
    for (const item of preview.items) {
      if (item.canImport) {
        next[item.rowIndex] = item.status === 'NOVO';
      }
    }
    setSelectedRows(next);
  }

  function handleClearSelection() {
    if (!preview) {
      return;
    }
    const next: Record<number, boolean> = {};
    for (const item of preview.items) {
      if (item.canImport) {
        next[item.rowIndex] = false;
      }
    }
    setSelectedRows(next);
  }

  const chosenItems: ImportPreviewItem[] = preview
    ? preview.items.filter(
        (item) => item.canImport && item.hashDedup && selectedRows[item.rowIndex] === true,
      )
    : [];

  const chosenReceitas = chosenItems
    .filter((item) => item.tipo === 'REC')
    .reduce((acc, item) => acc + item.valor, 0);
  const chosenDespesas = chosenItems
    .filter((item) => item.tipo === 'DESP')
    .reduce((acc, item) => acc + item.valor, 0);
  const chosenNetImpact =
    preview?.targetType === 'CONTA' ? chosenReceitas - chosenDespesas : chosenDespesas;

  async function handleCommitImport() {
    if (!preview || chosenItems.length === 0) {
      return;
    }
    setFeedbackError(null);

    try {
      const result = await commitMutation.mutateAsync({
        targetType: preview.targetType,
        contaId: preview.targetType === 'CONTA' ? preview.targetId : null,
        cartaoId: preview.targetType === 'CARTAO' ? preview.targetId : null,
        items: chosenItems.map((item) => ({
          dataCompetencia: item.dataCompetencia,
          descricao: item.descricao,
          valor: item.valor,
          tipo: item.tipo,
          categoriaId: categoryOverrides[item.rowIndex] || null,
          hashDedup: item.hashDedup!,
        })),
      });

      setCommitResult(result);
      setPreview(null);
      setSelectedRows({});
      setCategoryOverrides({});
    } catch (err) {
      setFeedbackError(
        err instanceof ApiError ? err.message : 'Erro ao efetivar a importação no banco de dados.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Importar Extratos &amp; Faturas</h1>
          <p className="text-sm text-zinc-400">
            Envie arquivos <span className="font-medium text-zinc-200">.OFX</span> ou{' '}
            <span className="font-medium text-zinc-200">.CSV</span> com deduplicação automática e
            pré-categorização inteligente.
          </p>
        </div>

        <Link
          href={targetType === 'CARTAO' ? '/cards' : '/transactions'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
        >
          {targetType === 'CARTAO' ? 'Voltar para Cartões' : 'Ver Extrato'}
        </Link>
      </header>

      {feedbackError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{feedbackError}</p>
        </div>
      )}

      {commitResult && (
        <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-200">
                Importação concluída: {commitResult.importedCount} lançamento(s) gravado(s)
                {commitResult.skippedDuplicateCount > 0
                  ? ` (${commitResult.skippedDuplicateCount} duplicata(s) ignorada(s))`
                  : ''}
                .
              </p>
              <p className="text-xs text-emerald-300/90">
                {commitResult.targetType === 'CONTA'
                  ? `Impacto líquido na conta: ${formatCurrency(commitResult.netBalanceDelta)} (Receitas: ${formatCurrency(commitResult.totalReceitasImportadas)} | Despesas: ${formatCurrency(commitResult.totalDespesasImportadas)}).`
                  : `Total lançado na fatura do cartão: ${formatCurrency(commitResult.totalDespesasImportadas)} (saldo bancário intacto).`}
              </p>
            </div>
          </div>

          {commitResult.cardAlert && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                commitResult.cardAlert.status === 'ATINGIDO'
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Alerta de teto no cartão <strong>{commitResult.cardAlert.cardNome}</strong> (fatura{' '}
                {commitResult.cardAlert.month}): acumulado em{' '}
                <strong>{formatCurrency(commitResult.cardAlert.totalFatura)}</strong> de{' '}
                {formatCurrency(commitResult.cardAlert.tetoMensalAlerta)} (
                {commitResult.cardAlert.percentualTeto.toFixed(0)}%).
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={commitResult.targetType === 'CARTAO' ? '/cards' : '/transactions'}
              className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              {commitResult.targetType === 'CARTAO' ? 'Conferir Fatura' : 'Conferir no Extrato'}
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-emerald-500/30 bg-zinc-900/60 px-3.5 py-2 text-xs font-medium text-emerald-200 transition hover:bg-zinc-900"
            >
              Ver Safe-to-Spend
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              1. Onde deseja importar?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleTargetType('CONTA')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  targetType === 'CONTA'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Landmark className="h-4 w-4" />
                Conta Bancária
              </button>
              <button
                type="button"
                onClick={() => handleToggleTargetType('CARTAO')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  targetType === 'CARTAO'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Cartão de Crédito
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="import-target-select"
              className="text-xs font-medium uppercase tracking-wide text-zinc-400"
            >
              {targetType === 'CONTA' ? '2. Selecione a conta líquida' : '2. Selecione o cartão'}
            </label>
            {targetType === 'CONTA' ? (
              <select
                id="import-target-select"
                value={effectiveAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              >
                {liquidAccounts.length === 0 ? (
                  <option value="">Nenhuma conta disponível</option>
                ) : (
                  liquidAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nome} ({formatCurrency(account.saldoAtual)})
                    </option>
                  ))
                )}
              </select>
            ) : (
              <select
                id="import-target-select"
                value={effectiveCardId}
                onChange={(e) => {
                  setSelectedCardId(e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              >
                {cards.length === 0 ? (
                  <option value="">Nenhum cartão cadastrado</option>
                ) : (
                  cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.nome} (Limite disp.: {formatCurrency(card.limiteDisponivel)})
                    </option>
                  ))
                )}
              </select>
            )}
            <p className="text-[11px] text-zinc-500">
              {targetType === 'CONTA'
                ? 'Contas do tipo Cofre são protegidas e não aceitam importação direta.'
                : 'Pagamentos de fatura presentes no arquivo são ignorados para evitar duplicidade no extrato.'}
            </p>
          </div>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-zinc-700 bg-zinc-950/60 hover:border-zinc-500'
          }`}
        >
          <input
            type="file"
            accept=".ofx,.csv,text/csv,application/x-ofx"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <UploadCloud className="mb-2.5 h-8 w-8 text-emerald-400" />
          <p className="text-sm font-medium text-zinc-100">
            {fileName
              ? `Arquivo carregado: ${fileName}`
              : 'Clique para escolher ou arraste seu arquivo .OFX / .CSV'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Compatível com extratos bancários (Itaú, Nubank, Inter, BB, Bradesco, C6) e faturas
            CSV/OFX.
          </p>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowPasteBox((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {showPasteBox ? 'Ocultar área de texto' : 'Ou colar conteúdo OFX/CSV manualmente'}
          </button>

          {fileContent && (
            <button
              type="button"
              disabled={previewMutation.isPending}
              onClick={() => void runPreview(fileName || 'extrato.csv', fileContent)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="h-3.5 w-3.5" />
              )}
              {previewMutation.isPending ? 'Analisando...' : 'Reanalisar Arquivo'}
            </button>
          )}
        </div>

        {showPasteBox && (
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Nome do arquivo (ex: extrato.ofx ou fatura.csv)"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                disabled={previewMutation.isPending || !fileContent.trim()}
                onClick={() => void runPreview(fileName || 'colado.csv', fileContent)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {previewMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Analisar Texto
              </button>
            </div>
            <textarea
              rows={6}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="Cole aqui as linhas do CSV (Data;Descrição;Valor) ou o XML/SGML do arquivo OFX..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
            />
          </div>
        )}
      </section>

      {preview && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Prontos / Selecionados</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400 tabular-nums">
                {chosenItems.length}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  de {preview.summary.totalRows} linhas ({preview.format})
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Já Importados (Hash)</p>
              <p className="mt-1 text-xl font-semibold text-zinc-300 tabular-nums">
                {preview.summary.exactDuplicateCount}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Bloqueados contra duplicidade</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">Possíveis Duplicatas (±1 dia)</p>
              <p className="mt-1 text-xl font-semibold text-amber-300 tabular-nums">
                {preview.summary.fuzzyDuplicateCount}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Desmarcados por segurança ({preview.summary.ignoredCount} ignorado(s))
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs text-zinc-400">
                {preview.targetType === 'CONTA'
                  ? `Impacto em ${preview.targetNome}`
                  : `Total em ${preview.targetNome}`}
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${
                  preview.targetType === 'CONTA'
                    ? chosenNetImpact >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {formatCurrency(chosenNetImpact)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                +{formatCurrency(chosenReceitas)} / -{formatCurrency(chosenDespesas)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  Revisão antes de gravar — {preview.targetNome}
                </h2>
                <p className="text-xs text-zinc-400">
                  Ajuste as categorias sugeridas para ensinar novas regras automaticamente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectOnlyNew}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Marcar apenas novos
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Desmarcar todos
                </button>
                <button
                  type="button"
                  disabled={chosenItems.length === 0 || commitMutation.isPending}
                  onClick={() => void handleCommitImport()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commitMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirmar Importação ({chosenItems.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {preview.items.map((item) => {
                const badge = STATUS_BADGE_UI[item.status];
                const isChecked = item.canImport && selectedRows[item.rowIndex] === true;
                const availableCats = item.tipo === 'REC' ? receitaCategories : despesaCategories;

                return (
                  <div
                    key={`${item.rowIndex}-${item.lineNumber}`}
                    className={`flex flex-col gap-3 px-4 py-3.5 transition md:flex-row md:items-center md:justify-between ${
                      item.canImport
                        ? isChecked
                          ? 'bg-zinc-900/40'
                          : 'bg-zinc-950/40 opacity-75'
                        : 'bg-zinc-950/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        disabled={!item.canImport}
                        checked={isChecked}
                        onChange={(e) =>
                          setSelectedRows((prev) => ({
                            ...prev,
                            [item.rowIndex]: e.target.checked,
                          }))
                        }
                        aria-label={`Selecionar ${item.descricao}`}
                        className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-500 disabled:cursor-not-allowed"
                      />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">
                            {formatDateBr(item.dataCompetencia)}
                          </span>
                          <span className="text-sm font-medium text-zinc-100">
                            {item.descricao}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {item.suggestionSource && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                              <Sparkles className="h-3 w-3" />
                              {item.suggestionSource === 'RULE'
                                ? 'Regra aprendida'
                                : 'Nome categoria'}
                            </span>
                          )}
                        </div>

                        {item.statusReason && (
                          <p className="text-xs text-zinc-400">{item.statusReason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pl-7 md:justify-end md:pl-0">
                      {item.canImport && (
                        <select
                          aria-label={`Categoria para ${item.descricao}`}
                          value={categoryOverrides[item.rowIndex] ?? ''}
                          onChange={(e) =>
                            setCategoryOverrides((prev) => ({
                              ...prev,
                              [item.rowIndex]: e.target.value,
                            }))
                          }
                          className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50"
                        >
                          <option value="">Sem categoria</option>
                          {availableCats.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome}
                            </option>
                          ))}
                        </select>
                      )}

                      <span
                        className={`min-w-24 text-right text-sm font-semibold tabular-nums ${
                          item.status.startsWith('IGNORADO')
                            ? 'text-zinc-500 line-through'
                            : item.tipo === 'REC'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {item.tipo === 'REC' ? '+' : '-'} {formatCurrency(item.valor)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

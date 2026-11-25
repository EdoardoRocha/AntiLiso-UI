'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeftRight, Plus, Star } from 'lucide-react';
import {
  useAccounts,
  useCreateAccount,
  useCreateTransfer,
  useUpdateAccount,
} from '@/hooks/use-accounts';
import { ApiError } from '@/lib/api';
import { ACCOUNT_TYPE_LABELS, formatCurrency } from '@/lib/format';
import type { AccountType } from '@/types/api';

export default function AccountsPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts(includeInactive);
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const transferMutation = useCreateTransfer();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AccountType>('CORRENTE');
  const [saldoAtual, setSaldoAtual] = useState('0');
  const [ehContaPadrao, setEhContaPadrao] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);

  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [transferValor, setTransferValor] = useState('');
  const [transferDescricao, setTransferDescricao] = useState('Transferência entre contas');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  const activeAccounts = accounts.filter((account) => account.ativa);
  const transferSourceAccounts = activeAccounts.filter(
    (account) => !account.ehCofreReserva && account.tipo !== 'COFRE',
  );

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault();
    setAccountFeedback(null);

    const parsedSaldo = Number(saldoAtual.replace(',', '.'));
    if (Number.isNaN(parsedSaldo)) {
      setAccountFeedback('Informe um saldo inicial numérico válido.');
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        nome,
        tipo,
        saldoAtual: Number(parsedSaldo.toFixed(2)),
        ehContaPadrao,
      });
      setNome('');
      setSaldoAtual('0');
      setEhContaPadrao(false);
    } catch (error) {
      setAccountFeedback(error instanceof ApiError ? error.message : 'Erro ao criar conta.');
    }
  }

  async function handleSetDefault(id: string) {
    setAccountFeedback(null);
    try {
      await updateAccountMutation.mutateAsync({ id, payload: { ehContaPadrao: true } });
    } catch (error) {
      setAccountFeedback(
        error instanceof ApiError ? error.message : 'Erro ao definir conta padrão.',
      );
    }
  }

  async function handleToggleActive(id: string, ativa: boolean) {
    setAccountFeedback(null);
    try {
      await updateAccountMutation.mutateAsync({ id, payload: { ativa: !ativa } });
    } catch (error) {
      setAccountFeedback(
        error instanceof ApiError ? error.message : 'Erro ao atualizar status da conta.',
      );
    }
  }

  async function handleTransfer(event: FormEvent) {
    event.preventDefault();
    setTransferFeedback(null);

    const parsedValor = Number(transferValor.replace(',', '.'));
    if (Number.isNaN(parsedValor) || parsedValor <= 0) {
      setTransferFeedback('Informe um valor maior que zero.');
      return;
    }

    const effectiveOrigin = origemId || transferSourceAccounts[0]?.id || '';
    const effectiveDest =
      destinoId || activeAccounts.find((a) => a.id !== effectiveOrigin)?.id || '';

    if (!effectiveOrigin || !effectiveDest) {
      setTransferFeedback('Selecione conta de origem e destino.');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        contaOrigemId: effectiveOrigin,
        contaDestinoId: effectiveDest,
        valor: Number(parsedValor.toFixed(2)),
        descricao: transferDescricao.trim() || 'Transferência entre contas',
      });
      setTransferValor('');
      setTransferFeedback('Transferência interna registrada com neutralidade.');
    } catch (error) {
      setTransferFeedback(
        error instanceof ApiError ? error.message : 'Erro ao registrar transferência.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Contas & Transferências</h1>
          <p className="text-sm text-zinc-400">
            Configure sua conta padrão do Quick-Add e movimente saldos entre contas próprias.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900"
          />
          Mostrar inativas
        </label>
      </header>

      {accountFeedback && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
          {accountFeedback}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-zinc-400">Carregando contas...</p>
        ) : (
          accounts.map((account) => (
            <article
              key={account.id}
              className={`rounded-2xl border p-4 ${
                account.ativa
                  ? 'border-zinc-800 bg-zinc-900/70'
                  : 'border-zinc-800/60 bg-zinc-900/30 opacity-65'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">{account.nome}</h2>
                  <p className="text-xs text-zinc-400">{ACCOUNT_TYPE_LABELS[account.tipo]}</p>
                </div>
                <p className="text-base font-semibold text-emerald-400">
                  {formatCurrency(account.saldoAtual)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {account.ehContaPadrao && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                    Padrão Quick-Add
                  </span>
                )}
                {account.ehCofreReserva && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                    Cofre Reserva
                  </span>
                )}
                {!account.ativa && (
                  <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-400">
                    Inativa
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {account.ativa && !account.ehContaPadrao && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(account.id)}
                    disabled={updateAccountMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    <Star className="h-3.5 w-3.5 text-emerald-400" />
                    Tornar padrão
                  </button>
                )}

                {!account.ehContaPadrao && !account.ehCofreReserva && (
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(account.id, account.ativa)}
                    disabled={updateAccountMutation.isPending}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    {account.ativa ? 'Desativar' : 'Reativar'}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => void handleCreateAccount(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Nova Conta</h2>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">Nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank, Carteira Física"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as AccountType)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="CORRENTE">Conta Corrente</option>
                <option value="CARTEIRA">Carteira</option>
                <option value="COFRE">Cofre</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Saldo Inicial</label>
              <input
                type="text"
                inputMode="decimal"
                value={saldoAtual}
                onChange={(e) => setSaldoAtual(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={ehContaPadrao}
              onChange={(e) => setEhContaPadrao(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-950"
            />
            Definir como conta padrão do Quick-Add
          </label>

          <button
            type="submit"
            disabled={createAccountMutation.isPending}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {createAccountMutation.isPending ? 'Salvando...' : 'Criar Conta'}
          </button>
        </form>

        <form
          onSubmit={(e) => void handleTransfer(e)}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">Transferência Interna</h2>
          </div>

          <p className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
            Transferências entre contas próprias são neutras e não alteram receitas nem despesas.
            Resgates da conta Cofre exigem confirmação em 2 etapas na aba{' '}
            <strong className="text-zinc-200">Reserva</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Origem</label>
              <select
                value={origemId || transferSourceAccounts[0]?.id || ''}
                onChange={(e) => setOrigemId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {transferSourceAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Destino</label>
              <select
                value={
                  destinoId ||
                  activeAccounts.find((a) => a.id !== (origemId || transferSourceAccounts[0]?.id))
                    ?.id ||
                  ''
                }
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Valor (R$)</label>
              <input
                type="text"
                required
                inputMode="decimal"
                value={transferValor}
                onChange={(e) => setTransferValor(e.target.value)}
                placeholder="150.00"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">Descrição</label>
              <input
                type="text"
                value={transferDescricao}
                onChange={(e) => setTransferDescricao(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {transferFeedback && (
            <p className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
              {transferFeedback}
            </p>
          )}

          <button
            type="submit"
            disabled={transferMutation.isPending || activeAccounts.length < 2}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {transferMutation.isPending ? 'Transferindo...' : 'Transferir'}
          </button>
        </form>
      </div>
    </div>
  );
}

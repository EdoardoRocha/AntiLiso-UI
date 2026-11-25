'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Download, FileJson, FileSpreadsheet, Lock, Save, ShieldCheck } from 'lucide-react';
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useMe,
  useSetupTwoFactor,
  useUpdateMe,
} from '@/hooks/use-auth';
import { ApiError, downloadLgpdExport } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { TwoFactorSetupResponse } from '@/types/api';

export default function SettingsPage() {
  const { data: user } = useMe();
  const updateMutation = useUpdateMe();
  const setup2faMutation = useSetupTwoFactor();
  const enable2faMutation = useEnableTwoFactor();
  const disable2faMutation = useDisableTwoFactor();

  const [nome, setNome] = useState('');
  const [custoVidaMensal, setCustoVidaMensal] = useState('0');
  const [mesesReservaAlvo, setMesesReservaAlvo] = useState(6);
  const [pctPaguePrimeiro, setPctPaguePrimeiro] = useState('15');
  const [gatilhoInvestPct, setGatilhoInvestPct] = useState('50');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [securityFeedback, setSecurityFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setCustoVidaMensal(String(user.custoVidaMensal));
      setMesesReservaAlvo(user.mesesReservaAlvo);
      setPctPaguePrimeiro(String(user.pctPaguePrimeiro));
      setGatilhoInvestPct(String(user.gatilhoInvestPct));
    }
  }, [user]);

  const parsedCusto = Number(custoVidaMensal.replace(',', '.'));
  const previewMeta = Number.isNaN(parsedCusto) ? 0 : Math.max(0, parsedCusto) * mesesReservaAlvo;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const custo = Number(custoVidaMensal.replace(',', '.'));
    const pctReserva = Number(pctPaguePrimeiro.replace(',', '.'));
    const gatilho = Number(gatilhoInvestPct.replace(',', '.'));

    if (Number.isNaN(custo) || Number.isNaN(pctReserva) || Number.isNaN(gatilho)) {
      setFeedback({ type: 'err', text: 'Preencha valores numéricos válidos.' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        nome,
        custoVidaMensal: Number(custo.toFixed(2)),
        mesesReservaAlvo,
        pctPaguePrimeiro: Number(pctReserva.toFixed(2)),
        gatilhoInvestPct: Number(gatilho.toFixed(2)),
      });
      setFeedback({
        type: 'ok',
        text: 'Parâmetros salvos e meta da reserva recalculada.',
      });
    } catch (error) {
      setFeedback({
        type: 'err',
        text: error instanceof ApiError ? error.message : 'Erro ao atualizar parâmetros.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-50">Perfil & Parâmetros</h1>
        <p className="text-sm text-zinc-400">
          Ajuste seu custo de vida essencial e regras de blindagem da Reserva de Emergência.
        </p>
      </header>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
          Prévia da Reserva Ideal ({mesesReservaAlvo} meses)
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-50">{formatCurrency(previewMeta)}</p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">Nome</label>
          <input
            type="text"
            required
            minLength={2}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Custo de vida mensal essencial (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={custoVidaMensal}
              onChange={(e) => setCustoVidaMensal(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Meses da reserva alvo (3 a 12)
            </label>
            <input
              type="number"
              min={3}
              max={12}
              value={mesesReservaAlvo}
              onChange={(e) => setMesesReservaAlvo(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Percentual &ldquo;Pague-se Primeiro&rdquo; (%)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={pctPaguePrimeiro}
              onChange={(e) => setPctPaguePrimeiro(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Gatilho para Investimentos (% da reserva)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={gatilhoInvestPct}
              onChange={(e) => setGatilhoInvestPct(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {feedback && (
          <p
            className={`rounded-xl border px-3.5 py-2 text-xs ${
              feedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'Salvando...' : 'Salvar Parâmetros'}
        </button>
      </form>

      {/* Segurança & 2FA Opcional */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Segurança — Autenticação em 2 Etapas (2FA TOTP)
            </h2>
            <p className="text-xs text-zinc-400">
              Camada opcional compatível com Google Authenticator, Authy e 1Password.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              user?.twoFactorEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}
          >
            {user?.twoFactorEnabled ? '2FA Ativo' : '2FA Inativo'}
          </span>
        </div>

        {securityFeedback && (
          <p
            className={`rounded-xl border px-3.5 py-2 text-xs ${
              securityFeedback.type === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {securityFeedback.text}
          </p>
        )}

        {!user?.twoFactorEnabled ? (
          <div className="space-y-4">
            {!twoFactorSetup ? (
              <button
                type="button"
                disabled={setup2faMutation.isPending}
                onClick={async () => {
                  setSecurityFeedback(null);
                  try {
                    const data = await setup2faMutation.mutateAsync();
                    setTwoFactorSetup(data);
                  } catch (err) {
                    setSecurityFeedback({
                      type: 'err',
                      text: err instanceof ApiError ? err.message : 'Erro ao iniciar 2FA.',
                    });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                Configurar 2FA Agora
              </button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSecurityFeedback(null);
                  try {
                    await enable2faMutation.mutateAsync(totpCodeInput);
                    setTwoFactorSetup(null);
                    setTotpCodeInput('');
                    setSecurityFeedback({
                      type: 'ok',
                      text: 'Autenticação em 2 etapas ativada na sua conta!',
                    });
                  } catch (err) {
                    setSecurityFeedback({
                      type: 'err',
                      text: err instanceof ApiError ? err.message : 'Código 2FA inválido.',
                    });
                  }
                }}
                className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
              >
                <p className="text-xs text-zinc-300">
                  1. Adicione a chave abaixo no seu aplicativo autenticador e digite o código de 6
                  dígitos gerado:
                </p>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs text-emerald-300 break-all">
                  Chave Base32: {twoFactorSetup.secret}
                </div>
                <p className="truncate font-mono text-[11px] text-zinc-500">
                  {twoFactorSetup.otpauthUrl}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={totpCodeInput}
                    onChange={(e) =>
                      setTotpCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="Código 6 dígitos"
                    className="w-40 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm tracking-widest text-zinc-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={enable2faMutation.isPending}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    Confirmar e Ativar 2FA
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwoFactorSetup(null)}
                    className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSecurityFeedback(null);
              try {
                await disable2faMutation.mutateAsync(disablePasswordInput);
                setDisablePasswordInput('');
                setSecurityFeedback({
                  type: 'ok',
                  text: '2FA desativado com sucesso.',
                });
              } catch (err) {
                setSecurityFeedback({
                  type: 'err',
                  text: err instanceof ApiError ? err.message : 'Erro ao desativar 2FA.',
                });
              }
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="password"
              required
              value={disablePasswordInput}
              onChange={(e) => setDisablePasswordInput(e.target.value)}
              placeholder="Digite sua senha atual para desativar"
              className="min-w-64 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={disable2faMutation.isPending}
              className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
            >
              Desativar 2FA
            </button>
          </form>
        )}
      </section>

      {/* Privacidade & Exportação Integral LGPD */}
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
            <Download className="h-4 w-4 text-emerald-400" />
            Privacidade &amp; Exportação Integral de Dados (LGPD)
          </h2>
          <p className="text-xs text-zinc-400">
            Baixe todos os seus dados pessoais e financeiros cadastrados no sistema a qualquer
            momento, com proteção contra fórmulas CSV maliciosas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={async () => {
              setExportingFormat('json');
              setSecurityFeedback(null);
              try {
                await downloadLgpdExport('json');
              } catch (err) {
                setSecurityFeedback({
                  type: 'err',
                  text: err instanceof ApiError ? err.message : 'Erro ao exportar JSON.',
                });
              } finally {
                setExportingFormat(null);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <FileJson className="h-4 w-4 text-emerald-400" />
            {exportingFormat === 'json' ? 'Gerando JSON...' : 'Exportar Tudo em JSON'}
          </button>

          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={async () => {
              setExportingFormat('csv');
              setSecurityFeedback(null);
              try {
                await downloadLgpdExport('csv');
              } catch (err) {
                setSecurityFeedback({
                  type: 'err',
                  text: err instanceof ApiError ? err.message : 'Erro ao exportar CSV.',
                });
              } finally {
                setExportingFormat(null);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingFormat === 'csv' ? 'Gerando CSV...' : 'Exportar Tudo em CSV (Excel)'}
          </button>
        </div>
      </section>
    </div>
  );
}

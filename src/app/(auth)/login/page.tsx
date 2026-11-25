'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigoTotp, setCodigoTotp] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await loginMutation.mutateAsync({
        email,
        senha,
        ...(requiresTwoFactor && codigoTotp.trim() ? { codigoTotp: codigoTotp.trim() } : {}),
      });
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'TWO_FACTOR_REQUIRED') {
        setRequiresTwoFactor(true);
        setErrorMessage('Autenticação em duas etapas ativa. Informe o código de 6 dígitos.');
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : 'Não foi possível entrar agora.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Entrar no AntiLiso</h1>
          <p className="text-xs text-zinc-400">Controle financeiro sem fricção cognitiva</p>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
      >
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-300">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="senha" className="mb-1.5 block text-xs font-medium text-zinc-300">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {requiresTwoFactor && (
          <div>
            <label
              htmlFor="codigoTotp"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-300"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Código 2FA (6 dígitos)
            </label>
            <input
              id="codigoTotp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={codigoTotp}
              onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-emerald-500/40 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm tracking-widest text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        )}

        {errorMessage && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-400">
        Ainda não tem conta?{' '}
        <Link href="/register" className="font-medium text-emerald-400 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </main>
  );
}

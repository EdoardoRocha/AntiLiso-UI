'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarClock,
  CreditCard,
  FileUp,
  Home,
  Landmark,
  LogOut,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { useAlerts } from '@/hooks/use-alerts';
import { useLogout, useMe } from '@/hooks/use-auth';

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/transactions', label: 'Extrato', icon: ReceiptText },
  { href: '/imports', label: 'Importar', icon: FileUp },
  { href: '/recurrences', label: 'Fixas', icon: CalendarClock },
  { href: '/cards', label: 'Cartões', icon: CreditCard },
  { href: '/reserve', label: 'Reserva', icon: ShieldCheck },
  { href: '/investments', label: 'Carteira', icon: TrendingUp },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/accounts', label: 'Contas', icon: Landmark },
  { href: '/categories', label: 'Categorias', icon: Tags },
  { href: '/settings', label: 'Perfil', icon: SlidersHorizontal },
] as const;

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) =>
    item.href !== '/imports' &&
    item.href !== '/investments' &&
    item.href !== '/alerts' &&
    item.href !== '/accounts' &&
    item.href !== '/categories' &&
    item.href !== '/settings',
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();
  const logoutMutation = useLogout();
  const { data: alertsData } = useAlerts({ enabled: Boolean(user) });
  const unreadAlerts = alertsData?.unreadCount ?? 0;

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace('/login');
    }
  }, [isLoading, isError, user, router]);

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    router.replace('/login');
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
          <p className="text-sm text-zinc-400">Carregando sua sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col md:border-r md:border-zinc-800 md:bg-zinc-900/50">
        <div className="flex h-16 items-center gap-2.5 border-b border-zinc-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-50">AntiLiso</p>
            <p className="text-[11px] text-zinc-400">Controle Pessoal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.href === '/alerts' && unreadAlerts > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
                    {unreadAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-xs font-medium text-zinc-200">{user.nome}</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutMutation.isPending}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-zinc-50">AntiLiso</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Link
            href="/alerts"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/alerts'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadAlerts > 0 && (
              <span className="rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {unreadAlerts}
              </span>
            )}
          </Link>
          <Link
            href="/investments"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/investments'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Carteira
          </Link>
          <Link
            href="/imports"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/imports'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <FileUp className="h-3.5 w-3.5" />
            Import.
          </Link>
          <Link
            href="/accounts"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/accounts'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            Contas
          </Link>
          <Link
            href="/categories"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/categories'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Tags className="h-3.5 w-3.5" />
            Categ.
          </Link>
          <Link
            href="/settings"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
              pathname === '/settings'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Perfil
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:pl-68 md:pr-8 md:pb-10">
        <OfflineBanner />
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-zinc-800 bg-zinc-950/95 px-1 py-1.5 backdrop-blur md:hidden">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium ${
                active ? 'text-emerald-400' : 'text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

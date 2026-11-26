import type {
  Account,
  AccountType,
  AlertChannel,
  AlertItem,
  AlertsListResponse,
  AlertType,
  Category,
  CategorySuggestion,
  CategoryType,
  CreateTransactionResponse,
  CreditCard,
  CreditCardInvoice,
  HealthResponse,
  LearningRule,
  PayInvoiceResponse,
  QuickAddResponse,
  Recurrence,
  RecurrenceChecklistResponse,
  GenerateRecurrencesResponse,
  ReserveMutationResponse,
  ReserveOverview,
  ReserveWithdrawalResponse,
  CommitImportItemPayload,
  CommitImportResponse,
  ImportFormat,
  ImportPreviewResponse,
  ImportTargetType,
  AssetClass,
  CompoundSimulationResponse,
  InvestmentsOverview,
  PortfolioAssetMutationResponse,
  RebalancePlan,
  SafeToSpendResponse,
  SyncAlertsResponse,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransactionsListResponse,
  TransferResponse,
  TwoFactorSetupResponse,
  UserProfile,
} from '@/types/api';

export const API_PROXY_PREFIX = '/api-backend';

function resolveClientApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_DIRECT_API === 'true' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  return API_PROXY_PREFIX;
}

const API_BASE_URL = resolveClientApiBaseUrl();

const AUTH_BYPASS_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/health',
]);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const cleanPath = path.split('?')[0] ?? path;
  if (response.status === 401 && !AUTH_BYPASS_REFRESH_PATHS.has(cleanPath)) {
    if (!retried) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return apiFetch<T>(path, init, true);
      }
    }
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let errorMessage = `Erro na requisição (${response.status})`;
    let errorCode: string | undefined;

    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      if (payload.message) {
        errorMessage = payload.message;
      }
      if (payload.error) {
        errorCode = payload.error;
      }
    } catch {
      // Ignora falha ao ler payload JSON de erro
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { cache: 'no-store' });
}

export async function register(payload: {
  nome: string;
  email: string;
  senha: string;
}): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function login(payload: {
  email: string;
  senha: string;
  codigoTotp?: string;
}): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  return apiFetch<TwoFactorSetupResponse>('/auth/2fa/setup', {
    method: 'POST',
  });
}

export async function enableTwoFactor(codigoTotp: string): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/auth/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ codigoTotp }),
  });
  return data.user;
}

export async function disableTwoFactor(senhaAtual: string): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ senhaAtual }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/me', { cache: 'no-store' });
  return data.user;
}

export async function updateMe(payload: {
  nome?: string;
  custoVidaMensal?: number;
  mesesReservaAlvo?: number;
  pctPaguePrimeiro?: number;
  gatilhoInvestPct?: number;
}): Promise<UserProfile> {
  const data = await apiFetch<{ user: UserProfile }>('/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function fetchAccounts(includeInactive = false): Promise<Account[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  const data = await apiFetch<{ accounts: Account[] }>(`/accounts${query}`);
  return data.accounts;
}

export async function createAccount(payload: {
  nome: string;
  tipo: AccountType;
  saldoAtual: number;
  ehContaPadrao: boolean;
}): Promise<Account> {
  const data = await apiFetch<{ account: Account }>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.account;
}

export async function updateAccount(
  id: string,
  payload: {
    nome?: string;
    ehContaPadrao?: boolean;
    ativa?: boolean;
  },
): Promise<Account> {
  const data = await apiFetch<{ account: Account }>(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.account;
}

export async function createTransfer(payload: {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  descricao?: string;
  dataCompetencia?: string;
}): Promise<TransferResponse> {
  return apiFetch<TransferResponse>('/accounts/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCategories(params?: {
  tipo?: CategoryType;
  ehEssencial?: boolean;
}): Promise<Category[]> {
  const search = new URLSearchParams();
  if (params?.tipo) {
    search.set('tipo', params.tipo);
  }
  if (params?.ehEssencial !== undefined) {
    search.set('ehEssencial', String(params.ehEssencial));
  }
  const suffix = search.toString() ? `?${search.toString()}` : '';
  const data = await apiFetch<{ categories: Category[] }>(`/categories${suffix}`);
  return data.categories;
}

export async function createCategory(payload: {
  nome: string;
  tipo: CategoryType;
  ehEssencial: boolean;
  orcamentoMensal?: number | null;
}): Promise<Category> {
  const data = await apiFetch<{ category: Category }>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.category;
}

export async function updateCategory(
  id: string,
  payload: {
    nome?: string;
    ehEssencial?: boolean;
    orcamentoMensal?: number | null;
  },
): Promise<Category> {
  const data = await apiFetch<{ category: Category }>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}

export async function fetchCategorySuggestion(
  descricao: string,
  tipo: 'REC' | 'DESP',
): Promise<CategorySuggestion | null> {
  const search = new URLSearchParams({ descricao, tipo });
  const data = await apiFetch<{ suggestion: CategorySuggestion | null }>(
    `/categories/suggest?${search.toString()}`,
  );
  return data.suggestion;
}

export async function fetchLearningRules(): Promise<LearningRule[]> {
  const data = await apiFetch<{ rules: LearningRule[] }>('/categories/rules');
  return data.rules;
}

export async function createLearningRule(payload: {
  termoChave: string;
  categoriaId: string;
}): Promise<LearningRule> {
  const data = await apiFetch<{ rule: LearningRule }>('/categories/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.rule;
}

export async function deleteLearningRule(id: string): Promise<void> {
  await apiFetch<void>(`/categories/rules/${id}`, { method: 'DELETE' });
}

export async function fetchTransactions(params?: {
  month?: string;
  tipo?: TransactionType;
  status?: TransactionStatus;
  contaId?: string;
  cartaoId?: string;
  categoriaId?: string;
  search?: string;
  limit?: number;
}): Promise<TransactionsListResponse> {
  const search = new URLSearchParams();
  if (params?.month) {
    search.set('month', params.month);
  }
  if (params?.tipo) {
    search.set('tipo', params.tipo);
  }
  if (params?.status) {
    search.set('status', params.status);
  }
  if (params?.contaId) {
    search.set('contaId', params.contaId);
  }
  if (params?.cartaoId) {
    search.set('cartaoId', params.cartaoId);
  }
  if (params?.categoriaId) {
    search.set('categoriaId', params.categoriaId);
  }
  if (params?.search) {
    search.set('search', params.search);
  }
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiFetch<TransactionsListResponse>(`/transactions${suffix}`);
}

export async function createTransaction(payload: {
  tipo: 'REC' | 'DESP';
  valor: number;
  descricao: string;
  contaId?: string | null;
  cartaoId?: string | null;
  categoriaId?: string | null;
  dataCompetencia?: string;
  status?: TransactionStatus;
  clientRequestId?: string;
}): Promise<CreateTransactionResponse> {
  return apiFetch<CreateTransactionResponse>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function quickAddTransaction(payload: {
  texto: string;
  tipo?: 'REC' | 'DESP';
  contaId?: string | null;
  cartaoId?: string | null;
  categoriaId?: string | null;
  dataCompetencia?: string;
  status?: TransactionStatus;
  clientRequestId?: string;
}): Promise<QuickAddResponse> {
  return apiFetch<QuickAddResponse>('/transactions/quick-add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTransaction(
  id: string,
  payload: {
    tipo?: 'REC' | 'DESP';
    valor?: number;
    descricao?: string;
    contaId?: string;
    cartaoId?: string;
    categoriaId?: string | null;
    dataCompetencia?: string;
    status?: TransactionStatus;
  },
): Promise<Transaction> {
  const data = await apiFetch<{ transaction: Transaction }>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' });
}

export async function fetchRecurrences(includeInactive = false): Promise<Recurrence[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  const data = await apiFetch<{ recurrences: Recurrence[] }>(`/recurrences${query}`);
  return data.recurrences;
}

export async function createRecurrence(payload: {
  descricao: string;
  valorEstimado: number;
  diaVencimento: number;
  categoriaId: string;
  contaId?: string | null;
  cartaoId?: string | null;
  ativa?: boolean;
}): Promise<Recurrence> {
  const data = await apiFetch<{ recurrence: Recurrence }>('/recurrences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.recurrence;
}

export async function updateRecurrence(
  id: string,
  payload: {
    descricao?: string;
    valorEstimado?: number;
    diaVencimento?: number;
    categoriaId?: string;
    contaId?: string;
    cartaoId?: string;
    ativa?: boolean;
  },
): Promise<Recurrence> {
  const data = await apiFetch<{ recurrence: Recurrence }>(`/recurrences/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.recurrence;
}

export async function deleteRecurrence(id: string): Promise<void> {
  await apiFetch<void>(`/recurrences/${id}`, { method: 'DELETE' });
}

export async function generateMonthlyRecurrences(
  month?: string,
): Promise<GenerateRecurrencesResponse> {
  return apiFetch<GenerateRecurrencesResponse>('/recurrences/generate', {
    method: 'POST',
    body: JSON.stringify(month ? { month } : {}),
  });
}

export async function fetchRecurrenceChecklist(
  month?: string,
): Promise<RecurrenceChecklistResponse> {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiFetch<RecurrenceChecklistResponse>(`/recurrences/checklist${suffix}`);
}

export async function fetchSafeToSpend(date?: string): Promise<SafeToSpendResponse> {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<SafeToSpendResponse>(`/safe-to-spend${suffix}`);
}

export async function fetchCreditCards(date?: string): Promise<CreditCard[]> {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  const data = await apiFetch<{ cards: CreditCard[] }>(`/credit-cards${suffix}`);
  return data.cards;
}

export async function createCreditCard(payload: {
  nome: string;
  contaPagamentoId: string;
  limiteTotal: number;
  tetoMensalAlerta: number;
  diaFechamento: number;
  diaVencimento: number;
}): Promise<CreditCard> {
  const data = await apiFetch<{ card: CreditCard }>('/credit-cards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.card;
}

export async function updateCreditCard(
  id: string,
  payload: {
    nome?: string;
    contaPagamentoId?: string;
    limiteTotal?: number;
    tetoMensalAlerta?: number;
    diaFechamento?: number;
    diaVencimento?: number;
  },
): Promise<CreditCard> {
  const data = await apiFetch<{ card: CreditCard }>(`/credit-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.card;
}

export async function deleteCreditCard(id: string): Promise<void> {
  await apiFetch<void>(`/credit-cards/${id}`, { method: 'DELETE' });
}

export async function fetchCreditCardInvoice(
  cardId: string,
  month?: string,
  date?: string,
): Promise<CreditCardInvoice> {
  const search = new URLSearchParams();
  if (month) {
    search.set('month', month);
  }
  if (date) {
    search.set('date', date);
  }
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiFetch<CreditCardInvoice>(`/credit-cards/${cardId}/invoice${suffix}`);
}

export async function payCreditCardInvoice(
  cardId: string,
  month: string,
  payload?: {
    contaPagamentoId?: string;
    dataPagamento?: string;
  },
): Promise<PayInvoiceResponse> {
  return apiFetch<PayInvoiceResponse>(`/credit-cards/${cardId}/invoices/${month}/pay`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchReserve(date?: string): Promise<ReserveOverview> {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<ReserveOverview>(`/reserve${suffix}`);
}

export async function updateReserveConfig(payload: {
  custoVidaMensal?: number;
  mesesReservaAlvo?: number;
  pctPaguePrimeiro?: number;
  gatilhoInvestPct?: number;
  travaResgateAtiva?: boolean;
}): Promise<ReserveOverview> {
  return apiFetch<ReserveOverview>('/reserve/config', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createReserveDeposit(payload: {
  contaOrigemId?: string;
  valor: number;
  descricao?: string;
  dataMovimento?: string;
}): Promise<ReserveMutationResponse> {
  return apiFetch<ReserveMutationResponse>('/reserve/deposits', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createReserveWithdrawal(payload: {
  contaDestinoId?: string;
  valor: number;
  justificativaResgate: string;
  confirmacaoDuasEtapas: true;
  dataMovimento?: string;
}): Promise<ReserveWithdrawalResponse> {
  return apiFetch<ReserveWithdrawalResponse>('/reserve/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function previewImport(payload: {
  fileName: string;
  content: string;
  format?: ImportFormat;
  targetType: ImportTargetType;
  contaId?: string | null;
  cartaoId?: string | null;
}): Promise<ImportPreviewResponse> {
  return apiFetch<ImportPreviewResponse>('/imports/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function commitImport(payload: {
  targetType: ImportTargetType;
  contaId?: string | null;
  cartaoId?: string | null;
  items: CommitImportItemPayload[];
}): Promise<CommitImportResponse> {
  return apiFetch<CommitImportResponse>('/imports/commit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchInvestmentsOverview(valorAporte?: number): Promise<InvestmentsOverview> {
  const suffix =
    valorAporte !== undefined && valorAporte > 0
      ? `?valorAporte=${encodeURIComponent(String(valorAporte))}`
      : '';
  return apiFetch<InvestmentsOverview>(`/investments${suffix}`);
}

export async function updateTargetAllocations(
  allocations: Array<{ classeAtivo: AssetClass; percentualIdeal: number }>,
): Promise<InvestmentsOverview> {
  return apiFetch<InvestmentsOverview>('/investments/allocations', {
    method: 'PUT',
    body: JSON.stringify({ allocations }),
  });
}

export async function createPortfolioAsset(payload: {
  classeAtivo: AssetClass;
  tickerOuNome: string;
  quantidade: number;
  valorInvestido: number;
  saldoAtualMercado: number;
}): Promise<PortfolioAssetMutationResponse> {
  return apiFetch<PortfolioAssetMutationResponse>('/investments/assets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePortfolioAsset(
  id: string,
  payload: {
    classeAtivo?: AssetClass;
    tickerOuNome?: string;
    quantidade?: number;
    valorInvestido?: number;
    saldoAtualMercado?: number;
  },
): Promise<PortfolioAssetMutationResponse> {
  return apiFetch<PortfolioAssetMutationResponse>(`/investments/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addPortfolioAssetContribution(
  id: string,
  payload: {
    valorAporte: number;
    quantidadeAdicional?: number;
    saldoMercadoAdicional?: number;
  },
): Promise<PortfolioAssetMutationResponse> {
  return apiFetch<PortfolioAssetMutationResponse>(`/investments/assets/${id}/contributions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deletePortfolioAsset(id: string): Promise<void> {
  await apiFetch<void>(`/investments/assets/${id}`, { method: 'DELETE' });
}

export async function calculateRebalance(valorAporte: number): Promise<RebalancePlan> {
  return apiFetch<RebalancePlan>('/investments/rebalance', {
    method: 'POST',
    body: JSON.stringify({ valorAporte }),
  });
}

export async function simulateCompoundInterest(payload: {
  saldoInicial: number;
  aporteMensal: number;
  taxaAnualRealPct: number;
  metaPatrimonio?: number | null;
}): Promise<CompoundSimulationResponse> {
  return apiFetch<CompoundSimulationResponse>('/investments/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAlerts(params?: {
  date?: string;
  unreadOnly?: boolean;
  tipo?: AlertType;
  autoSync?: boolean;
}): Promise<AlertsListResponse> {
  const search = new URLSearchParams();
  if (params?.date) {
    search.set('date', params.date);
  }
  if (params?.unreadOnly !== undefined) {
    search.set('unreadOnly', String(params.unreadOnly));
  }
  if (params?.tipo) {
    search.set('tipo', params.tipo);
  }
  if (params?.autoSync !== undefined) {
    search.set('autoSync', String(params.autoSync));
  }
  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiFetch<AlertsListResponse>(`/alerts${suffix}`);
}

export async function syncAlerts(payload?: {
  date?: string;
  canal?: AlertChannel;
}): Promise<SyncAlertsResponse> {
  return apiFetch<SyncAlertsResponse>('/alerts/sync', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}

export async function markAlertRead(id: string, lido = true): Promise<AlertItem> {
  const data = await apiFetch<{ alert: AlertItem }>(`/alerts/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ lido }),
  });
  return data.alert;
}

export async function markAllAlertsRead(): Promise<{ updatedCount: number }> {
  return apiFetch<{ updatedCount: number }>('/alerts/read-all', {
    method: 'POST',
  });
}

export async function deleteAlert(id: string): Promise<void> {
  await apiFetch<void>(`/alerts/${id}`, { method: 'DELETE' });
}

export async function downloadLgpdExport(format: 'json' | 'csv'): Promise<void> {
  const performFetch = () =>
    fetch(`${API_BASE_URL}/export?format=${format}`, {
      method: 'GET',
      credentials: 'include',
    });

  let response = await performFetch();
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await performFetch();
    } else {
      unauthorizedHandler?.();
    }
  }

  if (!response.ok) {
    throw new ApiError('Não foi possível exportar seus dados LGPD.', response.status);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const todayIso = new Date().toISOString().slice(0, 10);
  anchor.href = objectUrl;
  anchor.download = `antiliso-lgpd-${todayIso}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

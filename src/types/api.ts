export type AccountType = 'CORRENTE' | 'CARTEIRA' | 'COFRE';
export type CategoryType = 'RECEITA' | 'DESPESA';
export type TriggerStatus = 'BLOQUEADO' | 'LIBERADO';
export type TransactionType = 'REC' | 'DESP' | 'TRANSF';
export type TransactionStatus = 'PAGO' | 'PENDENTE';

export interface EmergencyReserveSummary {
  id: string;
  contaCofreId: string;
  valorMetaCalculado: number;
  saldoAcumulado: number;
  travaResgateAtiva: boolean;
  statusGatilho: TriggerStatus;
}

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  twoFactorEnabled: boolean;
  custoVidaMensal: number;
  mesesReservaAlvo: number;
  pctPaguePrimeiro: number;
  gatilhoInvestPct: number;
  criadoEm: string;
  reserva: EmergencyReserveSummary;
}

export interface Account {
  id: string;
  nome: string;
  tipo: AccountType;
  saldoAtual: number;
  ehContaPadrao: boolean;
  ativa: boolean;
  ehCofreReserva: boolean;
}

export interface Category {
  id: string;
  nome: string;
  tipo: CategoryType;
  ehEssencial: boolean;
  orcamentoMensal: number | null;
}

export interface LearningRule {
  id: string;
  termoChave: string;
  hitsConfianca: number;
  categoriaId: string;
  categoriaNome: string;
  categoriaTipo: CategoryType;
}

export interface CategorySuggestion {
  categoriaId: string;
  categoriaNome: string;
  source: 'RULE' | 'CATEGORY_NAME';
  termoChave: string | null;
  hitsConfianca: number | null;
}

export interface Transfer {
  id: string;
  tipo: 'TRANSF';
  contaId: string;
  contaDestinoId: string;
  valor: number;
  descricao: string;
  dataCompetencia: string;
  status: TransactionStatus;
}

export interface TransferResponse {
  transfer: Transfer;
  contaOrigem: Account;
  contaDestino: Account;
}

export interface Transaction {
  id: string;
  tipo: TransactionType;
  valor: number;
  descricao: string;
  dataCompetencia: string;
  status: TransactionStatus;
  contaId: string | null;
  contaNome: string | null;
  contaDestinoId: string | null;
  contaDestinoNome: string | null;
  cartaoId: string | null;
  cartaoNome: string | null;
  categoriaId: string | null;
  categoriaNome: string | null;
  criadoEm: string;
}

export interface TransactionsSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldoPeriodo: number;
  totalCount: number;
}

export interface TransactionsListResponse {
  transactions: Transaction[];
  summary: TransactionsSummary;
}

export interface CardCeilingAlert {
  cardId: string;
  cardNome: string;
  month: string;
  totalFatura: number;
  tetoMensalAlerta: number;
  percentualTeto: number;
  status: 'PROXIMO' | 'ATINGIDO';
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  idempotent: boolean;
  cardAlert?: CardCeilingAlert | null;
  reserveSplitSuggestion?: ReserveSplitSuggestion | null;
}

export interface QuickAddResponse {
  transaction: Transaction;
  idempotent: boolean;
  cardAlert?: CardCeilingAlert | null;
  reserveSplitSuggestion?: ReserveSplitSuggestion | null;
  parsed: {
    tipo: 'REC' | 'DESP';
    valor: number;
    descricao: string;
    metodoDetectado: string | null;
  };
  suggestedCategory?: CategorySuggestion | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

export interface Recurrence {
  id: string;
  descricao: string;
  valorEstimado: number;
  diaVencimento: number;
  ativa: boolean;
  categoriaId: string;
  categoriaNome: string;
  categoriaTipo: CategoryType;
  ehEssencial: boolean;
  contaId: string | null;
  contaNome: string | null;
  cartaoId: string | null;
  cartaoNome: string | null;
}

export interface RecurrenceChecklistItem {
  id: string;
  recorrenciaId: string;
  descricao: string;
  tipo: 'REC' | 'DESP';
  valor: number;
  valorEstimado: number;
  dataCompetencia: string;
  diaVencimento: number;
  status: TransactionStatus;
  contaId: string | null;
  contaNome: string | null;
  cartaoId: string | null;
  cartaoNome: string | null;
  categoriaId: string | null;
  categoriaNome: string | null;
  ehEssencial: boolean;
}

export interface RecurrenceChecklistSummary {
  totalFixasDespesas: number;
  totalPagoDespesas: number;
  totalPendenteDespesas: number;
  totalFixasReceitas: number;
  countTotal: number;
  countPagas: number;
  countPendentes: number;
}

export interface RecurrenceChecklistResponse {
  month: string;
  items: RecurrenceChecklistItem[];
  summary: RecurrenceChecklistSummary;
}

export interface GenerateRecurrencesResponse {
  month: string;
  generatedCount: number;
  existingCount: number;
}

export type SafeToSpendStatus = 'SAUDAVEL' | 'ATENCAO' | 'ESGOTADO' | 'SEM_RECEITA';

export interface SafeToSpendBreakdown {
  receitasMes: number;
  receitasPagas: number;
  receitasPendentes: number;
  contasFixasTotal: number;
  contasFixasPagas: number;
  contasFixasPendentes: number;
  pctPaguePrimeiro: number;
  metaReservaPlanejada: number;
  aportesReservaMes: number;
  resgatesReservaMes: number;
  aportesLiquidosReservaMes: number;
  reservaComprometidaMes: number;
  gastosVariaveisRealizados: number;
  totalComprometidoMes: number;
}

export interface SafeToSpendPartitionItem {
  valor: number;
  percentualReceita: number;
}

export interface SafeToSpendPartition {
  fixas: SafeToSpendPartitionItem;
  reserva: SafeToSpendPartitionItem;
  variaveis: SafeToSpendPartitionItem;
  livre: SafeToSpendPartitionItem;
}

export interface SafeToSpendResponse {
  referenceDate: string;
  month: string;
  daysInMonth: number;
  diasRestantes: number;
  status: SafeToSpendStatus;
  quantoPossoGastarHoje: number;
  saldoLivreMes: number;
  saldoDiarioReal: number;
  breakdown: SafeToSpendBreakdown;
  partition: SafeToSpendPartition;
}

export type CeilingAlertStatus = 'OK' | 'PROXIMO' | 'ATINGIDO' | 'SEM_TETO';
export type InvoiceStatus = 'VAZIA' | 'ABERTA' | 'FECHADA' | 'VENCIDA' | 'PAGA';

export interface CreditCard {
  id: string;
  nome: string;
  contaPagamentoId: string;
  contaPagamentoNome: string;
  limiteTotal: number;
  limiteUtilizado: number;
  limiteDisponivel: number;
  tetoMensalAlerta: number;
  diaFechamento: number;
  diaVencimento: number;
  faturaAbertaMonth: string;
  fechamentoFaturaAberta: string;
  vencimentoFaturaAberta: string;
  totalFaturaAberta: number;
  percentualTeto: number;
  alertaTetoAtivo: boolean;
  alertaTetoStatus: CeilingAlertStatus;
}

export interface CreditCardInvoiceItem {
  id: string;
  descricao: string;
  valor: number;
  dataCompetencia: string;
  status: TransactionStatus;
  categoriaId: string | null;
  categoriaNome: string | null;
  recorrenciaId: string | null;
}

export interface CreditCardInvoice {
  cardId: string;
  cardNome: string;
  contaPagamentoId: string;
  contaPagamentoNome: string;
  month: string;
  periodStart: string;
  closingDate: string;
  dueDate: string;
  statusFatura: InvoiceStatus;
  limiteTotal: number;
  limiteUtilizado: number;
  limiteDisponivel: number;
  tetoMensalAlerta: number;
  totalFatura: number;
  totalPendente: number;
  totalPago: number;
  percentualTeto: number;
  alertaTetoAtivo: boolean;
  alertaTetoStatus: CeilingAlertStatus;
  items: CreditCardInvoiceItem[];
}

export interface PayInvoiceResponse {
  month: string;
  cardId: string;
  contaPagamentoId: string;
  valorPago: number;
  settledCount: number;
  transferTransactionId: string;
}

export interface ReserveSplitSuggestion {
  pctPaguePrimeiro: number;
  valorReceita: number;
  valorSugerido: number;
  contaOrigemId: string;
  valorMetaCalculado: number;
  saldoAcumulado: number;
  faltaParaMeta: number;
  metaConcluida: boolean;
}

export interface ReserveCalculatorSuggestion {
  fixasEssenciaisAtivas: number;
  gastosEssenciaisMesAtual: number;
  orcamentoCategoriasEssenciais: number;
  custoEssencialSugerido: number;
}

export interface ReserveThermometer {
  valorMetaCalculado: number;
  saldoAcumulado: number;
  valorFaltante: number;
  percentualConcluido: number;
  mesesSegurancaCobertos: number;
  mesesAlvo: number;
  mediaAportesMensal: number;
  mesesJanelaMedia: number;
  mesesRestantesEstimados: number | null;
  mesEstimadoConclusao: string | null;
  metaConcluida: boolean;
  statusGatilho: TriggerStatus;
}

export interface ReserveMonthlyPriority {
  abaixoDaMeta: boolean;
  prioridadeTopoAtiva: boolean;
  acaoPendenteMes: boolean;
  receitasMes: number;
  pctPaguePrimeiro: number;
  metaAporteMes: number;
  aportesLiquidosMes: number;
  valorPendenteMes: number;
}

export interface ReserveMovement {
  id: string;
  tipo: 'APORTE' | 'RESGATE';
  valor: number;
  justificativaResgate: string | null;
  dataMovimento: string;
  transacaoOrigemId: string | null;
}

export interface ReserveOverview {
  reservaId: string;
  contaCofreId: string;
  contaCofreNome: string;
  referenceDate: string;
  month: string;
  custoVidaMensal: number;
  mesesReservaAlvo: number;
  pctPaguePrimeiro: number;
  gatilhoInvestPct: number;
  valorMetaCalculado: number;
  saldoAcumulado: number;
  travaResgateAtiva: boolean;
  statusGatilho: TriggerStatus;
  calculatorSuggestion: ReserveCalculatorSuggestion;
  thermometer: ReserveThermometer;
  monthlyPriority: ReserveMonthlyPriority;
  movements: ReserveMovement[];
}

export interface ReserveWithdrawalImpact {
  valorResgate: number;
  saldoAntes: number;
  saldoDepois: number;
  percentualAntes: number;
  percentualDepois: number;
  mesesCobertosAntes: number;
  mesesCobertosDepois: number;
  mesesPerdidos: number;
  statusGatilhoAntes: TriggerStatus;
  statusGatilhoDepois: TriggerStatus;
  perdeuGatilhoInvestimentos: boolean;
}

export interface ReserveMutationResponse {
  movement: ReserveMovement;
  overview: ReserveOverview;
}

export interface ReserveWithdrawalResponse extends ReserveMutationResponse {
  impact: ReserveWithdrawalImpact;
}

export type ImportTargetType = 'CONTA' | 'CARTAO';
export type ImportFormat = 'OFX' | 'CSV';
export type ImportPreviewStatus =
  | 'NOVO'
  | 'DUPLICADO_HASH'
  | 'POSSIVEL_DUPLICATA_MANUAL'
  | 'IGNORADO_CREDITO_CARTAO'
  | 'IGNORADO_VALOR_ZERO';

export interface ImportPreviewItem {
  rowIndex: number;
  lineNumber: number;
  status: ImportPreviewStatus;
  selectedByDefault: boolean;
  canImport: boolean;
  statusReason: string | null;
  dataCompetencia: string;
  descricao: string;
  valor: number;
  tipo: 'REC' | 'DESP';
  hashDedup: string | null;
  categoriaSugeridaId: string | null;
  categoriaSugeridaNome: string | null;
  suggestionSource: 'RULE' | 'CATEGORY_NAME' | null;
  matchedManualTransaction: {
    id: string;
    descricao: string;
    dataCompetencia: string;
    valor: number;
  } | null;
}

export interface ImportPreviewSummary {
  totalRows: number;
  readyCount: number;
  exactDuplicateCount: number;
  fuzzyDuplicateCount: number;
  ignoredCount: number;
  estimatedReceitas: number;
  estimatedDespesas: number;
  estimatedNetImpact: number;
}

export interface ImportPreviewResponse {
  format: ImportFormat;
  targetType: ImportTargetType;
  targetId: string;
  targetNome: string;
  summary: ImportPreviewSummary;
  items: ImportPreviewItem[];
}

export interface CommitImportItemPayload {
  dataCompetencia: string;
  descricao: string;
  valor: number;
  tipo: 'REC' | 'DESP';
  categoriaId?: string | null;
  hashDedup: string;
}

export interface CommitImportResponse {
  targetType: ImportTargetType;
  targetId: string;
  importedCount: number;
  skippedDuplicateCount: number;
  totalReceitasImportadas: number;
  totalDespesasImportadas: number;
  netBalanceDelta: number;
  cardAlert: CardCeilingAlert | null;
}

export type AssetClass = 'RF' | 'FII' | 'ACOES' | 'INT' | 'CRIPTO';

export interface PortfolioAsset {
  id: string;
  alocacaoId: string;
  classeAtivo: AssetClass;
  tickerOuNome: string;
  quantidade: number;
  valorInvestido: number;
  saldoAtualMercado: number;
  precoMedio: number;
  cotacaoAtual: number;
  lucroPrejuizo: number;
  rentabilidadePct: number;
  participacaoCarteiraPct: number;
}

export interface PortfolioClassSummary {
  alocacaoId: string;
  classeAtivo: AssetClass;
  nomeClasse: string;
  nivelRisco: 'CONSERVADOR' | 'MODERADO' | 'ARROJADO';
  isRisco: boolean;
  bloqueadaPorGatilho: boolean;
  resumoEducativo: string;
  percentualIdeal: number;
  percentualAtual: number;
  desvioPct: number;
  valorInvestido: number;
  saldoAtualMercado: number;
  lucroPrejuizo: number;
  rentabilidadePct: number;
  quantidadeAtivos: number;
  ativos: PortfolioAsset[];
}

export interface InvestmentTriggerState {
  statusGatilho: TriggerStatus;
  modoEducativoAtivo: boolean;
  gatilhoInvestPct: number;
  valorMetaReserva: number;
  saldoReservaAtual: number;
  percentualReservaAtual: number;
  valorGatilhoRequerido: number;
  faltaParaDesbloquear: number;
}

export interface RebalanceItem {
  classeAtivo: AssetClass;
  nomeClasse: string;
  percentualIdeal: number;
  percentualAntes: number;
  percentualDepois: number;
  saldoAntes: number;
  deficitAntes: number;
  valorSugeridoAporte: number;
  saldoProjetado: number;
  bloqueadaPorGatilho: boolean;
}

export interface RebalancePlan {
  valorAporte: number;
  modo: 'PRIORIZAR_RESERVA' | 'REBALANCEAMENTO_CARTEIRA';
  orientacaoResumo: string;
  valorSugeridoReserva: number;
  classePrioritaria: AssetClass | null;
  itens: RebalanceItem[];
}

export interface InvestmentsOverview {
  trigger: InvestmentTriggerState;
  valorInvestidoCarteira: number;
  patrimonioCarteira: number;
  lucroPrejuizoCarteira: number;
  rentabilidadeCarteiraPct: number;
  saldoContasLiquidas: number;
  saldoReservaEmergencia: number;
  patrimonioTotalGlobal: number;
  classes: PortfolioClassSummary[];
  rebalanceSugerido: RebalancePlan | null;
}

export interface PortfolioAssetMutationResponse {
  asset: {
    id: string;
    alocacaoId: string;
    classeAtivo: AssetClass;
    tickerOuNome: string;
    quantidade: number;
    valorInvestido: number;
    saldoAtualMercado: number;
  };
  overview: InvestmentsOverview;
}

export interface CompoundHorizonPoint {
  anos: number;
  meses: number;
  totalAportado: number;
  jurosAcumulados: number;
  patrimonioFinal: number;
  rendaPassivaMensalEstimada: number;
  multiplicadorPatrimonio: number;
}

export interface CompoundSimulationResponse {
  saldoInicial: number;
  aporteMensal: number;
  taxaAnualRealPct: number;
  taxaMensalEquivalentePct: number;
  metaPatrimonio: number | null;
  mesesParaMeta: number | null;
  anosParaMeta: number | null;
  horizons: CompoundHorizonPoint[];
}

export type AlertType = 'VENC' | 'ORCAM' | 'RESUMO';
export type AlertChannel = 'PUSH' | 'EMAIL' | 'WHATS';

export interface AlertItem {
  id: string;
  tipoAlerta: AlertType;
  mensagem: string;
  canal: AlertChannel;
  lido: boolean;
  enviadoEm: string;
}

export interface WeeklyDigest {
  isoWeek: string;
  periodStart: string;
  periodEnd: string;
  receitas7d: number;
  despesas7d: number;
  saldoSemana: number;
  maiorCategoriaSemana: { nome: string; valor: number } | null;
  quantoPossoGastarHoje: number;
  contasVencendo48hCount: number;
}

export interface AlertsListResponse {
  unreadCount: number;
  createdCount: number;
  weeklyDigest: WeeklyDigest;
  alerts: AlertItem[];
}

export interface SyncAlertsResponse {
  createdCount: number;
  unreadCount: number;
  weeklyDigest: WeeklyDigest;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  twoFactorEnabled: boolean;
}

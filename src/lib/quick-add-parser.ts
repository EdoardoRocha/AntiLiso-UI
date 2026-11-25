export interface ParsedQuickAddClient {
  tipo: 'REC' | 'DESP';
  valor: number;
  descricao: string;
  metodoDetectado: string | null;
}

const MAX_AMOUNT = 9_999_999_999.99;

const AMOUNT_REGEX =
  /(?:^|\s)([+-])?\s*(?:[Rr]\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+,\d{1,2}|\d+\.\d{1,2}|\d+)(?=\s|$)/;

const INCOME_KEYWORDS = new Set([
  'recebi',
  'recebido',
  'ganhei',
  'entrou',
  'entrada',
  'salario',
  'freela',
  'freelance',
  'reembolso',
  'dividendo',
  'dividendos',
  'rendimento',
  'venda',
  'bonus',
]);

const PAYMENT_METHODS = new Set([
  'pix',
  'debito',
  'dinheiro',
  'especie',
  'boleto',
  'ted',
  'doc',
  'transferencia',
  'credito',
  'cartao',
]);

const EDGE_PREPOSITIONS = new Set([
  'no',
  'na',
  'via',
  'em',
  'de',
  'do',
  'da',
  'com',
  'por',
  'pelo',
  'pela',
  'a',
  'o',
]);

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stripTokenPunctuation(token: string): string {
  return normalizeSearchText(token).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function parseBrazilianAmount(raw: string): number {
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(Number(normalized).toFixed(2));
}

export function parseQuickAddTextClient(rawInput: string): ParsedQuickAddClient | null {
  const collapsed = rawInput.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return null;
  }

  const amountMatch = AMOUNT_REGEX.exec(collapsed);
  if (!amountMatch || amountMatch.index === undefined || !amountMatch[2]) {
    return null;
  }

  const sign = amountMatch[1];
  const valor = parseBrazilianAmount(amountMatch[2]);
  if (!Number.isFinite(valor) || valor <= 0 || valor > MAX_AMOUNT) {
    return null;
  }

  const normalizedWords = collapsed
    .split(' ')
    .map(stripTokenPunctuation)
    .filter((word) => word.length > 0);

  const isIncome =
    sign === '+' ||
    collapsed.startsWith('+') ||
    normalizedWords.some((word) => INCOME_KEYWORDS.has(word));

  const tipo: 'REC' | 'DESP' = isIncome ? 'REC' : 'DESP';

  const beforeAmount = collapsed.slice(0, amountMatch.index);
  const afterAmount = collapsed.slice(amountMatch.index + amountMatch[0].length);
  const withoutAmount = `${beforeAmount} ${afterAmount}`.trim().replace(/\s+/g, ' ');

  let metodoDetectado: string | null = null;
  const remainingTokens: string[] = [];

  for (const token of withoutAmount.split(' ').filter(Boolean)) {
    const clean = stripTokenPunctuation(token);
    if (clean && PAYMENT_METHODS.has(clean)) {
      if (!metodoDetectado) {
        metodoDetectado = clean;
      }
      continue;
    }
    remainingTokens.push(token);
  }

  while (
    remainingTokens.length > 0 &&
    EDGE_PREPOSITIONS.has(stripTokenPunctuation(remainingTokens[0]!))
  ) {
    remainingTokens.shift();
  }

  while (
    remainingTokens.length > 0 &&
    EDGE_PREPOSITIONS.has(stripTokenPunctuation(remainingTokens[remainingTokens.length - 1]!))
  ) {
    remainingTokens.pop();
  }

  let descricao = remainingTokens.join(' ').trim();
  if (!descricao) {
    descricao = tipo === 'REC' ? 'Receita rápida' : 'Gasto rápido';
  } else if (descricao === descricao.toLowerCase()) {
    descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1);
  }

  return {
    tipo,
    valor,
    descricao: descricao.slice(0, 200),
    metodoDetectado,
  };
}

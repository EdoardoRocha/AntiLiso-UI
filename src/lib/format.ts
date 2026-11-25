import type { AccountType, CategoryType } from '@/types/api';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  RECEITA: 'Entrou',
  DESPESA: 'Saiu',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CORRENTE: 'Conta Corrente',
  CARTEIRA: 'Carteira',
  COFRE: 'Cofre',
};

/**
 * Utilitários e regras centrais do Módulo Financeiro
 * Menta Negócios Imobiliários
 */

export function isTransferencia(lancamento: any): boolean {
  if (!lancamento) return false;
  
  const tipo = String(lancamento.tipo || '').toLowerCase().trim();
  const origem = String(lancamento.origem || '').toLowerCase().trim();
  const categoria = String(lancamento.categoria || '').toLowerCase().trim();
  
  return (
    tipo === 'transferência' ||
    tipo === 'transferencia' ||
    origem === 'transferencia' ||
    categoria === 'transferência entre contas' ||
    categoria === 'transferencia entre contas' ||
    categoria.includes('transferência interna') ||
    categoria.includes('transferencia interna')
  );
}

export function filterOperationalTransactions(lancamentos: any[]): any[] {
  if (!Array.isArray(lancamentos)) return [];
  return lancamentos.filter(lancamento => !isTransferencia(lancamento));
}

export function getAccountTypeLabel(tipo: string): string {
  const map: Record<string, string> = {
    caixa: 'Caixa / Gaveta',
    banco: 'Conta Bancária',
    carteira: 'Carteira / Dinheiro',
    digital: 'Conta Digital',
    investimento: 'Investimento / Reserva',
    outros: 'Outra Conta'
  };
  return map[tipo] || 'Conta Financeira';
}

export function getAccountTypeBadgeColor(tipo: string): string {
  switch (tipo) {
    case 'caixa':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'banco':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'digital':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'carteira':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'investimento':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

export function parseCurrencyToNumber(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const clean = String(value)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function maskCurrency(value: string | number): string {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'number' ? value : parseCurrencyToNumber(value);
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export const BANK_PRESETS = [
  { nome: 'Caixa', tipo: 'caixa', banco: 'Caixa Físico', saldoInicial: 10000, cor: '#d97706' },
  { nome: 'Banco Itaú', tipo: 'banco', banco: 'Itaú Unibanco (341)', saldoInicial: 20000, cor: '#ea580c' },
  { nome: 'Nubank', tipo: 'digital', banco: 'Nu Pagamentos (260)', saldoInicial: 5000, cor: '#9333ea' },
  { nome: 'Banco Santander', tipo: 'banco', banco: 'Santander (033)', saldoInicial: 0, cor: '#e11d48' },
  { nome: 'Banco do Brasil', tipo: 'banco', banco: 'Banco do Brasil (001)', saldoInicial: 0, cor: '#2563eb' },
  { nome: 'Mercado Pago', tipo: 'digital', banco: 'Mercado Pago (323)', saldoInicial: 0, cor: '#0284c7' },
  { nome: 'Carteira / Dinheiro', tipo: 'carteira', banco: 'Interno', saldoInicial: 0, cor: '#059669' },
  { nome: 'Conta Investimento', tipo: 'investimento', banco: 'Renda Fixa / CDB', saldoInicial: 0, cor: '#4f46e5' }
];


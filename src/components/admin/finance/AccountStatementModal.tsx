import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Filter, 
  FileDown, 
  Printer, 
  Building2, 
  ShieldCheck,
  Search
} from 'lucide-react';
import { FinancialAccount, FinancialTransfer } from '../../../types';
import { formatCurrency, getAccountTypeLabel } from '../../../lib/financeUtils';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  transfers: FinancialTransfer[];
  onOpenNewTransferWithOrigin?: (accountId: string) => void;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  isOpen,
  onClose,
  account,
  transfers,
  onOpenNewTransferWithOrigin
}) => {
  const [periodo, setPeriodo] = useState<string>('todos');
  const [search, setSearch] = useState<string>('');

  const accountTransfers = useMemo(() => {
    if (!account) return [];
    
    return transfers.filter(t => {
      const isPart = t.contaOrigemId === account.id || t.contaDestinoId === account.id;
      if (!isPart) return false;

      if (search) {
        const query = search.toLowerCase();
        const matchesDesc = (t.descricao || '').toLowerCase().includes(query);
        const matchesOrigem = (t.contaOrigemNome || '').toLowerCase().includes(query);
        const matchesDestino = (t.contaDestinoNome || '').toLowerCase().includes(query);
        const matchesImovel = (t.codigoImovel || '').toLowerCase().includes(query);
        if (!matchesDesc && !matchesOrigem && !matchesDestino && !matchesImovel) return false;
      }

      if (periodo === 'este_mes') {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return (t.dataTransferencia || '').startsWith(currentMonth);
      }

      return true;
    }).sort((a, b) => (b.dataTransferencia || '').localeCompare(a.dataTransferencia || ''));
  }, [account, transfers, periodo, search]);

  const summary = useMemo(() => {
    let totalEnviado = 0;
    let totalRecebido = 0;

    accountTransfers.forEach(t => {
      if (t.status === 'Estornada') return; // Do not count cancelled/estornada transfers

      if (t.contaOrigemId === account?.id) {
        totalEnviado += t.valor || 0;
      }
      if (t.contaDestinoId === account?.id) {
        totalRecebido += t.valor || 0;
      }
    });

    return {
      totalEnviado,
      totalRecebido,
      impactoPeriodo: totalRecebido - totalEnviado
    };
  }, [accountTransfers, account]);

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-primary-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white max-w-4xl w-full rounded-[2.5rem] shadow-2xl relative z-10 my-auto overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-8 bg-primary-black text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center text-gold">
                <Wallet size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold font-display tracking-tight text-white">
                    {account.nome}
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full text-gold">
                    {getAccountTypeLabel(account.tipo)}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  {account.banco ? `${account.banco} | ` : ''} Agência: {account.agencia || '---'} | Conta: {account.conta || '---'}
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>

          {/* Saldo Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                Saldo Atual Disponível
              </span>
              <div className="text-2xl font-bold font-display text-white">
                {formatCurrency(account.saldoAtual)}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1 flex items-center gap-1">
                <ArrowDownLeft size={12} /> Transferências Recebidas
              </span>
              <div className="text-xl font-bold font-display text-emerald-400">
                + {formatCurrency(summary.totalRecebido)}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-1 flex items-center gap-1">
                <ArrowUpRight size={12} /> Transferências Enviadas
              </span>
              <div className="text-xl font-bold font-display text-red-400">
                - {formatCurrency(summary.totalEnviado)}
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar movimentação neste extrato..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-700 outline-none"
            >
              <option value="todos">Todo o histórico</option>
              <option value="este_mes">Apenas este mês</option>
            </select>
          </div>

          {onOpenNewTransferWithOrigin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewTransferWithOrigin(account.id!);
              }}
              className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !text-xs font-bold !py-2.5 !px-4 !rounded-xl"
            >
              + Transferir deste {account.nome}
            </button>
          )}
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider pb-2">
                <th className="pb-3">Data</th>
                <th className="pb-3">Tipo / Operação</th>
                <th className="pb-3">Contraparte</th>
                <th className="pb-3">Descrição</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accountTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nenhuma transferência registrada para esta conta.
                  </td>
                </tr>
              ) : (
                accountTransfers.map((t) => {
                  const isOrigin = t.contaOrigemId === account.id;
                  const isEstornada = t.estornada || t.status === 'Estornada';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 font-medium text-gray-500 whitespace-nowrap">
                        {new Date(t.dataTransferencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isOrigin 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isOrigin ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {isOrigin ? 'Transferência Enviada' : 'Transferência Recebida'}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-gray-800">
                        {isOrigin ? `Para: ${t.contaDestinoNome}` : `De: ${t.contaOrigemNome}`}
                      </td>
                      <td className="py-3.5 text-gray-600 max-w-[200px] truncate">
                        {t.descricao}
                        {t.codigoImovel && (
                          <span className="block text-[10px] text-gold uppercase font-bold">Imóvel: {t.codigoImovel}</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isEstornada 
                            ? 'bg-red-100 text-red-800' 
                            : t.status === 'Concluída' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={
                          isEstornada 
                            ? 'text-gray-400 line-through' 
                            : isOrigin 
                              ? 'text-red-600' 
                              : 'text-emerald-600'
                        }>
                          {isOrigin ? '- ' : '+ '}{formatCurrency(t.valor)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
          <span>* Extrato individual de movimentações internas da conta.</span>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-xs font-bold text-gray-600 hover:text-primary-black"
          >
            Fechar Extrato
          </button>
        </div>
      </motion.div>
    </div>
  );
};

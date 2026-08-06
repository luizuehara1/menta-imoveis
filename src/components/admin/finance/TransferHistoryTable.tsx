import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRightLeft, 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  RotateCcw, 
  ExternalLink, 
  Building2, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Firestore } from 'firebase/firestore';
import { FinancialTransfer, FinancialAccount, Property } from '../../../types';
import { formatCurrency } from '../../../lib/financeUtils';
import { TransferDetailsModal } from './TransferDetailsModal';

interface TransferHistoryTableProps {
  db: Firestore;
  transfers: FinancialTransfer[];
  accounts: FinancialAccount[];
  properties: Property[];
  currentUser?: { uid?: string; email?: string } | null;
  onOpenTransferModal: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const TransferHistoryTable: React.FC<TransferHistoryTableProps> = ({
  db,
  transfers,
  accounts,
  properties,
  currentUser,
  onOpenTransferModal,
  onToast
}) => {
  const [search, setSearch] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterImovel, setFilterImovel] = useState('');

  const [selectedTransfer, setSelectedTransfer] = useState<FinancialTransfer | null>(null);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      // Text search
      if (search) {
        const query = search.toLowerCase();
        const matchesDesc = (t.descricao || '').toLowerCase().includes(query);
        const matchesOrigem = (t.contaOrigemNome || '').toLowerCase().includes(query);
        const matchesDestino = (t.contaDestinoNome || '').toLowerCase().includes(query);
        const matchesImovel = (t.codigoImovel || '').toLowerCase().includes(query);
        const matchesCorretor = (t.corretorNome || '').toLowerCase().includes(query);
        const matchesObs = (t.observacoes || '').toLowerCase().includes(query);
        const matchesTags = (t.tags || []).some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesDesc && !matchesOrigem && !matchesDestino && !matchesImovel && !matchesCorretor && !matchesObs && !matchesTags) {
          return false;
        }
      }

      if (filterOrigem && t.contaOrigemId !== filterOrigem) return false;
      if (filterDestino && t.contaDestinoId !== filterDestino) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (startDate && (t.dataTransferencia || '') < startDate) return false;
      if (endDate && (t.dataTransferencia || '') > endDate) return false;
      if (filterImovel && t.imovelId !== filterImovel && t.codigoImovel !== filterImovel) return false;

      return true;
    }).sort((a, b) => (b.dataTransferencia || '').localeCompare(a.dataTransferencia || ''));
  }, [transfers, search, filterOrigem, filterDestino, filterStatus, startDate, endDate, filterImovel]);

  const totalMovimentado = useMemo(() => {
    return filteredTransfers
      .filter(t => t.status !== 'Estornada')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  }, [filteredTransfers]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterOrigem('');
    setFilterDestino('');
    setFilterStatus('');
    setStartDate('');
    setEndDate('');
    setFilterImovel('');
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Busca Geral */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Busca Rápida
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input 
                type="text"
                placeholder="Descrição, conta, responsável, tag..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-transparent rounded-xl py-2.5 pl-10 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Conta de Origem */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Conta Origem
            </label>
            <select
              value={filterOrigem}
              onChange={e => setFilterOrigem(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-xl py-2.5 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">Todas as origens</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.nome}</option>
              ))}
            </select>
          </div>

          {/* Conta de Destino */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Conta Destino
            </label>
            <select
              value={filterDestino}
              onChange={e => setFilterDestino(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-xl py-2.5 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">Todos os destinos</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.nome}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 border border-transparent rounded-xl py-2.5 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">Todos os status</option>
              <option value="Concluída">Concluída</option>
              <option value="Estornada">Estornada</option>
              <option value="Pendente">Pendente</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          {/* Limpar */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-semibold text-[11px]">Período:</span>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-medium outline-none"
            />
            <span className="text-gray-400">até</span>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-medium outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Volume movimentado no filtro:</span>
            <span className="font-bold text-gray-900 font-mono text-sm">{formatCurrency(totalMovimentado)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 pl-6">Data</th>
                <th className="py-4 px-4">Origem ➔ Destino</th>
                <th className="py-4 px-4">Descrição & Vínculos</th>
                <th className="py-4 px-4">Forma</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 font-mono">Valor</th>
                <th className="py-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <ArrowRightLeft size={36} className="text-gray-300 opacity-60" />
                      <p className="font-medium text-sm text-gray-600">Nenhuma transferência encontrada</p>
                      <button
                        type="button"
                        onClick={onOpenTransferModal}
                        className="mt-1 text-xs font-bold text-gold hover:underline"
                      >
                        + Criar primeira transferência
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => {
                  const isEstornada = t.estornada || t.status === 'Estornada';

                  return (
                    <tr 
                      key={t.id} 
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTransfer(t)}
                    >
                      <td className="py-4 pl-6 whitespace-nowrap font-bold text-gray-600">
                        {new Date(t.dataTransferencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            {t.contaOrigemNome}
                          </span>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {t.contaDestinoNome}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-[240px]">
                        <span className="font-bold text-gray-900 block truncate">{t.descricao}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {t.codigoImovel && (
                            <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.2 rounded uppercase">
                              {t.codigoImovel}
                            </span>
                          )}
                          {t.corretorNome && (
                            <span className="text-[10px] text-gray-400">
                              Resp: {t.corretorNome}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-gray-500 font-medium">
                        {t.formaTransferencia}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isEstornada 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : t.status === 'Concluída'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-sm whitespace-nowrap">
                        <span className={isEstornada ? 'line-through text-gray-400' : 'text-gray-900'}>
                          {formatCurrency(t.valor)}
                        </span>
                      </td>

                      <td className="py-4 pr-6 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {t.comprovanteUrl && (
                            <a
                              href={t.comprovanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver Comprovante"
                              className="p-2 text-gray-400 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedTransfer(t)}
                            title="Ver Detalhes e Ações"
                            className="p-2 text-gray-400 hover:text-primary-black hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details / Reversal Modal */}
      {selectedTransfer && (
        <TransferDetailsModal
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          transfer={selectedTransfer}
          db={db}
          currentUser={currentUser}
          onActionSuccess={(msg) => onToast(msg, 'success')}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, 
  Plus, 
  ArrowRightLeft, 
  FileText, 
  Edit3, 
  ShieldCheck, 
  Building, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { Firestore } from 'firebase/firestore';
import { FinancialAccount, FinancialTransfer } from '../../../types';
import { formatCurrency, getAccountTypeLabel, getAccountTypeBadgeColor } from '../../../lib/financeUtils';
import { deleteFinancialAccount } from '../../../services/financialTransferService';
import { AccountStatementModal } from './AccountStatementModal';
import { AccountFormModal } from './AccountFormModal';

interface AccountsManagerProps {
  db: Firestore;
  accounts: FinancialAccount[];
  transfers: FinancialTransfer[];
  onOpenTransferModal: (originAccountId?: string) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({
  db,
  accounts,
  transfers,
  onOpenTransferModal,
  onToast
}) => {
  const [selectedAccountForStatement, setSelectedAccountForStatement] = useState<FinancialAccount | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeAccounts = accounts.filter(a => a.ativo !== false);
  const totalConsolidado = activeAccounts.reduce((acc, curr) => acc + (curr.saldoAtual || 0), 0);

  const handleOpenEdit = (acc: FinancialAccount) => {
    setAccountToEdit(acc);
    setIsFormModalOpen(true);
  };

  const handleOpenCreate = () => {
    setAccountToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (acc: FinancialAccount) => {
    if (!acc.id) return;
    if (!confirm(`Deseja realmente remover/inativar a conta "${acc.nome}"?`)) return;

    setDeletingId(acc.id);
    try {
      const res = await deleteFinancialAccount(db, acc.id);
      onToast(res.message, 'success');
    } catch (err: any) {
      console.error('Erro ao excluir conta:', err);
      onToast(err.message || 'Erro ao excluir conta.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Consolidated Balances Header */}
      <div className="bg-gradient-to-r from-primary-black via-gray-900 to-primary-black text-white p-6 md:p-8 rounded-[2rem] border border-gold/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gold flex items-center gap-1.5">
            <ShieldCheck size={14} /> Patrimônio Líquido em Contas
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white">
            {formatCurrency(totalConsolidado)}
          </h2>
          <p className="text-gray-400 text-xs">
            Saldo acumulado em {activeAccounts.length} contas bancárias, caixas e carteiras ativas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Cadastrar Nova Conta
          </button>
          <button
            type="button"
            onClick={() => onOpenTransferModal()}
            className="btn-gold !bg-gold !text-primary-black hover:!bg-white !text-xs font-black uppercase tracking-wider !py-3 !px-6 !rounded-xl flex items-center gap-2 shadow-lg"
          >
            <ArrowRightLeft size={16} /> Nova Transferência
          </button>
        </div>
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {accounts.map((acc) => {
          const isNegative = acc.saldoAtual < 0;
          const badgeClass = getAccountTypeBadgeColor(acc.tipo);
          const isInactive = acc.ativo === false;

          return (
            <motion.div
              key={acc.id}
              whileHover={{ y: -4 }}
              className={`bg-white p-6 rounded-[2rem] border ${isInactive ? 'border-gray-200 opacity-60 bg-gray-50/50' : 'border-gray-100'} shadow-sm flex flex-col justify-between space-y-4 relative group`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                      {getAccountTypeLabel(acc.tipo)}
                    </span>
                    {isInactive && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-gray-200 text-gray-600">
                        Inativa
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(acc)}
                      title="Editar Conta"
                      className="p-1.5 text-gray-400 hover:text-primary-black hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(acc)}
                      title="Excluir / Inativar Conta"
                      disabled={deletingId === acc.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                  {acc.nome}
                </h3>
                
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {acc.banco ? `${acc.banco}` : 'Conta Interna'}
                  {acc.agencia ? ` • Ag: ${acc.agencia}` : ''}
                  {acc.conta ? ` • C/C: ${acc.conta}` : ''}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                  Saldo Disponível
                </span>
                <div className={`text-2xl font-bold font-display tracking-tight ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(acc.saldoAtual)}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountForStatement(acc)}
                    className="w-full py-2 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} /> Extrato
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTransferModal(acc.id)}
                    disabled={isInactive}
                    className={`w-full py-2 px-2 ${isInactive ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-black hover:bg-gold hover:text-primary-black text-white'} text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs`}
                  >
                    <ArrowRightLeft size={13} /> Transferir
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Extrato Modal */}
      {selectedAccountForStatement && (
        <AccountStatementModal
          isOpen={!!selectedAccountForStatement}
          onClose={() => setSelectedAccountForStatement(null)}
          account={selectedAccountForStatement}
          transfers={transfers}
          onOpenNewTransferWithOrigin={onOpenTransferModal}
        />
      )}

      {/* Account Form Modal */}
      {isFormModalOpen && (
        <AccountFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          db={db}
          accountToEdit={accountToEdit}
          onSuccess={(msg) => onToast(msg, 'success')}
        />
      )}
    </div>
  );
};

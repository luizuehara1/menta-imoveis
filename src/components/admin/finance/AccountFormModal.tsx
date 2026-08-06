import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Wallet, 
  Building2, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Firestore } from 'firebase/firestore';
import { FinancialAccount, FinancialAccountType } from '../../../types';
import { saveFinancialAccount } from '../../../services/financialTransferService';
import { BANK_PRESETS, formatCurrency, maskCurrency, parseCurrencyToNumber } from '../../../lib/financeUtils';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: Firestore;
  accountToEdit?: FinancialAccount | null;
  onSuccess: (message: string, accountId?: string) => void;
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  db,
  accountToEdit,
  onSuccess
}) => {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<FinancialAccountType>('banco');
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [saldoInicialStr, setSaldoInicialStr] = useState('0,00');
  const [saldoAtualStr, setSaldoAtualStr] = useState('0,00');
  const [permiteSaldoNegativo, setPermiteSaldoNegativo] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setLoading(false);
      if (accountToEdit) {
        setNome(accountToEdit.nome || '');
        setTipo((accountToEdit.tipo as FinancialAccountType) || 'banco');
        setBanco(accountToEdit.banco || '');
        setAgencia(accountToEdit.agencia || '');
        setConta(accountToEdit.conta || '');
        setSaldoInicialStr(maskCurrency(accountToEdit.saldoInicial ?? 0));
        setSaldoAtualStr(maskCurrency(accountToEdit.saldoAtual ?? 0));
        setPermiteSaldoNegativo(!!accountToEdit.permiteSaldoNegativo);
        setAtivo(accountToEdit.ativo !== false);
        setDescricao(accountToEdit.descricao || '');
      } else {
        setNome('');
        setTipo('banco');
        setBanco('');
        setAgencia('');
        setConta('');
        setSaldoInicialStr('0,00');
        setSaldoAtualStr('0,00');
        setPermiteSaldoNegativo(false);
        setAtivo(true);
        setDescricao('');
      }
    }
  }, [isOpen, accountToEdit]);

  const handleSelectPreset = (preset: typeof BANK_PRESETS[0]) => {
    setNome(preset.nome);
    setTipo(preset.tipo as FinancialAccountType);
    setBanco(preset.banco);
    if (!accountToEdit && preset.saldoInicial) {
      setSaldoInicialStr(maskCurrency(preset.saldoInicial));
      setSaldoAtualStr(maskCurrency(preset.saldoInicial));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMsg('Informe o nome da conta.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const numSaldoInicial = parseCurrencyToNumber(saldoInicialStr);
      const numSaldoAtual = parseCurrencyToNumber(saldoAtualStr);

      const savedId = await saveFinancialAccount(
        db,
        {
          nome: nome.trim(),
          tipo,
          banco: banco.trim(),
          agencia: agencia.trim(),
          conta: conta.trim(),
          saldoInicial: numSaldoInicial,
          saldoAtual: accountToEdit ? numSaldoAtual : numSaldoInicial,
          permiteSaldoNegativo,
          ativo,
          descricao: descricao.trim()
        },
        accountToEdit?.id
      );

      onSuccess(accountToEdit ? 'Conta atualizada com sucesso.' : 'Conta financeira criada com sucesso.', savedId);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar conta:', err);
      setErrorMsg(err.message || 'Erro ao salvar conta financeira.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-primary-black/70 backdrop-blur-md"
        onClick={!loading ? onClose : undefined}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white max-w-xl w-full rounded-[2.5rem] shadow-2xl relative z-10 my-auto overflow-hidden border border-gray-100 flex flex-col"
      >
        {/* Header */}
        <div className="p-8 bg-primary-black text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display tracking-tight text-white">
                  {accountToEdit ? 'Editar Conta Financeira' : 'Nova Conta / Caixa Interno'}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Cadastre contas bancárias, caixas e carteiras da imobiliária
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Presets if new */}
        {!accountToEdit && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">
              Modelos Rápidos (Sugestões):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BANK_PRESETS.slice(0, 6).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 bg-white hover:bg-gold/10 hover:border-gold/30 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 transition-colors"
                >
                  + {preset.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Nome da Conta *
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: Banco Itaú, Caixa Geral"
                value={nome}
                onChange={e => setNome(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Tipo de Conta *
              </label>
              <div className="relative">
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as FinancialAccountType)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 appearance-none outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                >
                  <option value="caixa">Caixa / Dinheiro Físico</option>
                  <option value="banco">Conta Corrente / Bancária</option>
                  <option value="digital">Conta Digital / Fintech</option>
                  <option value="carteira">Carteira / Gaveta</option>
                  <option value="investimento">Investimento / Reserva</option>
                  <option value="outros">Outra Categoria</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Instituição / Banco
              </label>
              <input 
                type="text"
                placeholder="Ex: Itaú (341)"
                value={banco}
                onChange={e => setBanco(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Agência
              </label>
              <input 
                type="text"
                placeholder="Ex: 0001"
                value={agencia}
                onChange={e => setAgencia(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Número da Conta
              </label>
              <input 
                type="text"
                placeholder="Ex: 12345-6"
                value={conta}
                onChange={e => setConta(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                Saldo Inicial (R$)
              </label>
              <input 
                type="text"
                value={maskCurrency(saldoInicialStr)}
                onChange={e => setSaldoInicialStr(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
              />
            </div>

            {accountToEdit && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Saldo Atual (R$)
                </label>
                <input 
                  type="text"
                  value={maskCurrency(saldoAtualStr)}
                  onChange={e => setSaldoAtualStr(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-primary-black outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700">
              <input 
                type="checkbox"
                checked={permiteSaldoNegativo}
                onChange={e => setPermiteSaldoNegativo(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <span>Permitir saldo negativo nesta conta (ex: limite de cheque especial)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700">
              <input 
                type="checkbox"
                checked={ativo}
                onChange={e => setAtivo(e.target.checked)}
                className="w-4 h-4 rounded text-gold focus:ring-gold"
              />
              <span>Conta ativa para novas transferências</span>
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !text-xs font-bold !py-2.5 !px-6 !rounded-xl"
            >
              {loading ? 'Salvando...' : accountToEdit ? 'Salvar Alterações' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

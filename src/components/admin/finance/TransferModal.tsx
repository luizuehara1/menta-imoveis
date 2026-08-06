import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowRightLeft, 
  Wallet, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Link as LinkIcon, 
  FileCheck, 
  Tag, 
  UserCheck, 
  ChevronDown, 
  ChevronUp,
  Info,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { Firestore } from 'firebase/firestore';
import { FinancialAccount, Property, Lease } from '../../../types';
import { executeFinancialTransfer, TransferInput } from '../../../services/financialTransferService';
import { formatCurrency, maskCurrency, parseCurrencyToNumber } from '../../../lib/financeUtils';
import { AccountFormModal } from './AccountFormModal';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: Firestore;
  accounts: FinancialAccount[];
  properties: Property[];
  leases: Lease[];
  currentUser?: { uid?: string; email?: string } | null;
  onTransferSuccess: (message: string) => void;
  preselectedOriginId?: string;
}

const FORMAS_TRANSFERENCIA = [
  'Pix',
  'TED / DOC',
  'Transferência entre contas',
  'Depósito Bancário',
  'Dinheiro / Sangria',
  'Boleto Interno',
  'Outro'
];

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  db,
  accounts,
  properties,
  leases,
  currentUser,
  onTransferSuccess,
  preselectedOriginId
}) => {
  const activeAccounts = accounts.filter(a => a.ativo !== false);

  const [contaOrigemId, setContaOrigemId] = useState<string>(preselectedOriginId || '');
  const [contaDestinoId, setContaDestinoId] = useState<string>('');
  const [valorStr, setValorStr] = useState<string>('');
  const [dataTransferencia, setDataTransferencia] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [descricao, setDescricao] = useState<string>('');
  const [formaTransferencia, setFormaTransferencia] = useState<string>('Pix');
  const [status, setStatus] = useState<'Concluída' | 'Pendente'>('Concluída');

  // Optional fields
  const [showOptional, setShowOptional] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState<string>('');
  const [numeroComprovante, setNumeroComprovante] = useState<string>('');
  const [comprovanteUrl, setComprovanteUrl] = useState<string>('');
  const [imovelId, setImovelId] = useState<string>('');
  const [locacaoId, setLocacaoId] = useState<string>('');
  const [corretorNome, setCorretorNome] = useState<string>('');
  const [categoriaInterna, setCategoriaInterna] = useState<string>('Transferência entre contas');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Account creation integration
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [targetFieldForNewAccount, setTargetFieldForNewAccount] = useState<'origem' | 'destino'>('origem');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLoading(false);
      setValorStr('');
      setDescricao('');
      setObservacoes('');
      setNumeroComprovante('');
      setComprovanteUrl('');
      setImovelId('');
      setLocacaoId('');
      setCorretorNome('');
      setTags([]);
      setDataTransferencia(new Date().toISOString().split('T')[0]);

      if (preselectedOriginId) {
        setContaOrigemId(preselectedOriginId);
        const destination = activeAccounts.find(a => a.id !== preselectedOriginId);
        if (destination?.id) setContaDestinoId(destination.id);
      } else if (activeAccounts.length >= 2) {
        if (!contaOrigemId) setContaOrigemId(activeAccounts[0].id || '');
        if (!contaDestinoId) setContaDestinoId(activeAccounts[1].id || '');
      }
    }
  }, [isOpen, preselectedOriginId, activeAccounts.length]);

  const selectedOrigin = accounts.find(a => a.id === contaOrigemId);
  const selectedDestino = accounts.find(a => a.id === contaDestinoId);
  const numericValor = parseCurrencyToNumber(valorStr);

  const originBalanceAfter = (selectedOrigin?.saldoAtual ?? 0) - numericValor;
  const destinoBalanceAfter = (selectedDestino?.saldoAtual ?? 0) + numericValor;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMessage(null);

    // Validações
    if (!contaOrigemId || !contaDestinoId) {
      setErrorMessage('Selecione as contas de origem e destino.');
      return;
    }

    if (contaOrigemId === contaDestinoId) {
      setErrorMessage('Selecione contas diferentes.');
      return;
    }

    if (numericValor <= 0) {
      setErrorMessage('Informe um valor válido.');
      return;
    }

    if (!dataTransferencia) {
      setErrorMessage('Informe a data da transferência.');
      return;
    }

    if (!descricao.trim()) {
      setErrorMessage('Informe a descrição da transferência.');
      return;
    }

    if (selectedOrigin && (selectedOrigin.saldoAtual || 0) < numericValor && !selectedOrigin.permiteSaldoNegativo) {
      setErrorMessage('Saldo insuficiente na conta de origem.');
      return;
    }

    setLoading(true);

    try {
      const selectedProp = properties.find(p => p.id === imovelId);
      
      const payload: TransferInput = {
        contaOrigemId,
        contaDestinoId,
        valor: numericValor,
        dataTransferencia,
        descricao: descricao.trim(),
        formaTransferencia,
        status,
        observacoes: observacoes.trim(),
        numeroComprovante: numeroComprovante.trim(),
        comprovanteUrl: comprovanteUrl.trim(),
        imovelId: imovelId || '',
        codigoImovel: selectedProp?.code || (imovelId === 'imobiliaria' ? 'IMOBILIARIA' : ''),
        locacaoId: locacaoId || '',
        corretorNome: corretorNome.trim(),
        categoriaInterna: categoriaInterna.trim(),
        tags
      };

      const res = await executeFinancialTransfer(db, payload, currentUser);
      onTransferSuccess(res.message || 'Transferência realizada com sucesso.');
      onClose();
    } catch (err: any) {
      console.error('Erro na transferência:', err);
      setErrorMessage(err.message || 'Erro ao processar transferência.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
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
        className="bg-white max-w-3xl w-full rounded-[2.5rem] shadow-2xl relative z-10 my-auto overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-8 md:p-10 bg-primary-black text-white relative flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shadow-lg shadow-gold/10">
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
                  Nova Transferência Interna
                </h3>
                <p className="text-gold text-xs font-semibold tracking-wider mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Movimentação de saldo entre contas da empresa
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all text-gray-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-gray-300 flex items-center gap-2">
            <Info size={14} className="text-gold flex-shrink-0" />
            <span>
              <strong>Aviso contábil:</strong> Esta movimentação <u>não afeta</u> receitas, despesas, comissões ou lucro líquido consolidado.
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold"
            >
              <AlertCircle size={20} className="flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Origem e Destino Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Origem */}
            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Conta de Origem (Debitar)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFieldForNewAccount('origem');
                      setIsAccountModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-red-700 hover:text-red-900 bg-red-100/70 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus size={11} /> Cadastrar Conta
                  </button>
                  {selectedOrigin && (
                    <span className="text-[10px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-2xs">
                      Disponível: <strong className={selectedOrigin.saldoAtual < 0 ? 'text-red-500' : 'text-gray-900'}>{formatCurrency(selectedOrigin.saldoAtual)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <select 
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-primary-black appearance-none focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all cursor-pointer shadow-xs"
                  value={contaOrigemId}
                  onChange={e => {
                    if (e.target.value === '__NEW_ACCOUNT__') {
                      setTargetFieldForNewAccount('origem');
                      setIsAccountModalOpen(true);
                      return;
                    }
                    setContaOrigemId(e.target.value);
                  }}
                  disabled={loading}
                >
                  <option value="">Selecione a conta de origem</option>
                  <option value="__NEW_ACCOUNT__" className="text-amber-700 font-bold bg-amber-50">
                    + Cadastrar nova conta no financeiro...
                  </option>
                  {activeAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome} ({formatCurrency(acc.saldoAtual)})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {selectedOrigin && (
                <div className="text-[11px] text-gray-500 flex justify-between pt-1">
                  <span>Saldo pós-transferência:</span>
                  <span className={`font-mono font-bold ${originBalanceAfter < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatCurrency(originBalanceAfter)}
                  </span>
                </div>
              )}
            </div>

            {/* Destino */}
            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Conta de Destino (Creditar)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFieldForNewAccount('destino');
                      setIsAccountModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus size={11} /> Cadastrar Conta
                  </button>
                  {selectedDestino && (
                    <span className="text-[10px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-2xs">
                      Saldo atual: <strong className="text-gray-900">{formatCurrency(selectedDestino.saldoAtual)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <select 
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-primary-black appearance-none focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition-all cursor-pointer shadow-xs"
                  value={contaDestinoId}
                  onChange={e => {
                    if (e.target.value === '__NEW_ACCOUNT__') {
                      setTargetFieldForNewAccount('destino');
                      setIsAccountModalOpen(true);
                      return;
                    }
                    setContaDestinoId(e.target.value);
                  }}
                  disabled={loading}
                >
                  <option value="">Selecione a conta de destino</option>
                  <option value="__NEW_ACCOUNT__" className="text-amber-700 font-bold bg-amber-50">
                    + Cadastrar nova conta no financeiro...
                  </option>
                  {activeAccounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === contaOrigemId}>
                      {acc.nome} {acc.id === contaOrigemId ? '(mesma conta)' : `(${formatCurrency(acc.saldoAtual)})`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {selectedDestino && (
                <div className="text-[11px] text-gray-500 flex justify-between pt-1">
                  <span>Saldo pós-transferência:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(destinoBalanceAfter)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Valor, Data e Forma */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Valor */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Valor da Transferência *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gold">R$</span>
                <input 
                  type="text"
                  required
                  placeholder="0,00"
                  value={maskCurrency(valorStr)}
                  onChange={e => setValorStr(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-base font-bold text-primary-black focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Data da Transferência *
              </label>
              <div className="relative">
                <input 
                  type="date"
                  required
                  value={dataTransferencia}
                  onChange={e => setDataTransferencia(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold text-primary-black focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Forma de Transferência */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                Forma de Movimentação
              </label>
              <div className="relative">
                <select 
                  value={formaTransferencia}
                  onChange={e => setFormaTransferencia(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold text-primary-black appearance-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white outline-none transition-all shadow-xs"
                >
                  {FORMAS_TRANSFERENCIA.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
              Descrição / Finalidade *
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Sangria do Caixa para Itaú, Cobertura de folha de pagamento..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm font-bold text-primary-black focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white outline-none transition-all placeholder:text-gray-400 shadow-xs"
            />
          </div>

          {/* Toggle Campos Opcionais */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary-black transition-colors py-1"
            >
              {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{showOptional ? 'Ocultar campos opcionais e vínculos' : 'Mostrar campos opcionais (comprovante, imóvel, observações, tags)'}</span>
            </button>
          </div>

          {showOptional && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-5 pt-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Comprovante Número */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Nº do Comprovante / Autenticação
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: DOC 8847291 / Pix E182..."
                    value={numeroComprovante}
                    onChange={e => setNumeroComprovante(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                  />
                </div>

                {/* Comprovante URL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                    <LinkIcon size={12} /> Link do Comprovante / Anexo
                  </label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={comprovanteUrl}
                    onChange={e => setComprovanteUrl(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vincular Imóvel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Imóvel Vinculado (Apenas para organização interna)
                  </label>
                  <div className="relative">
                    <select
                      value={imovelId}
                      onChange={e => setImovelId(e.target.value)}
                      disabled={loading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black appearance-none focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                    >
                      <option value="">Nenhum</option>
                      <option value="imobiliaria">Imobiliária Geral</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Vincular Locação */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Locação Vinculada (Opcional)
                  </label>
                  <div className="relative">
                    <select
                      value={locacaoId}
                      onChange={e => setLocacaoId(e.target.value)}
                      disabled={loading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black appearance-none focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                    >
                      <option value="">Nenhuma</option>
                      {leases.map(l => (
                        <option key={l.id} value={l.id}>
                          {(l as any).propertyCode || (l as any).imovelCodigo || 'Locação'} - {(l as any).tenantName || (l as any).locatarioNome || 'Contrato'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Corretor / Responsável */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Corretor / Solicitante
                  </label>
                  <input 
                    type="text"
                    placeholder="Nome do responsável"
                    value={corretorNome}
                    onChange={e => setCorretorNome(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                  />
                </div>

                {/* Categoria Interna */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Categoria Interna / Centro de Custo
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Sangria, Aporte, Reserva de Emergência"
                    value={categoriaInterna}
                    onChange={e => setCategoriaInterna(e.target.value)}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Tags de Identificação
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Digite uma tag e clique em adicionar..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    disabled={loading}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-medium text-primary-black outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all"
                  >
                    + Tag
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t, idx) => (
                      <span key={idx} className="bg-gold/15 text-gold-darker text-[11px] font-bold px-3 py-1 rounded-full border border-gold/30 flex items-center gap-1.5">
                        <Tag size={10} /> {t}
                        <button type="button" onClick={() => handleRemoveTag(t)} className="text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Observações Internas
                </label>
                <textarea 
                  rows={2}
                  placeholder="Anotações de auditoria ou justificativa da movimentação..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-primary-black focus:ring-2 focus:ring-gold/30 focus:bg-white outline-none resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Footer Buttons */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="text-xs font-black uppercase text-gray-400 tracking-widest hover:text-primary-black transition-colors px-5 py-3"
            >
              Cancelar
            </button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !text-xs font-black uppercase tracking-widest !rounded-2xl !py-4 !px-8 shadow-xl shadow-primary-black/10 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Processando Transferência...</span>
              ) : (
                <>
                  <ArrowRightLeft size={16} className="text-gold group-hover:text-primary-black" />
                  <span>Confirmar Transferência</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Modal para Cadastrar Conta Diretamente */}
      {isAccountModalOpen && (
        <AccountFormModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          db={db}
          onSuccess={(msg, newAccountId) => {
            if (newAccountId) {
              if (targetFieldForNewAccount === 'origem') {
                setContaOrigemId(newAccountId);
              } else {
                setContaDestinoId(newAccountId);
              }
            }
            setIsAccountModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

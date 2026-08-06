import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  ArrowRightLeft, 
  RotateCcw, 
  Calendar, 
  ExternalLink, 
  Tag, 
  Building2, 
  User, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock
} from 'lucide-react';
import { Firestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FinancialTransfer } from '../../../types';
import { reverseFinancialTransfer } from '../../../services/financialTransferService';
import { formatCurrency } from '../../../lib/financeUtils';

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: FinancialTransfer | null;
  db: Firestore;
  currentUser?: { uid?: string; email?: string } | null;
  onActionSuccess: (message: string) => void;
}

export const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  isOpen,
  onClose,
  transfer,
  db,
  currentUser,
  onActionSuccess
}) => {
  const [showEstornoConfirm, setShowEstornoConfirm] = useState(false);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [loadingEstorno, setLoadingEstorno] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [newObservacoes, setNewObservacoes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !transfer) return null;

  const handleStartEditNotes = () => {
    setNewObservacoes(transfer.observacoes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!transfer.id) return;
    setSavingNotes(true);
    setErrorMsg(null);
    try {
      await updateDoc(doc(db, 'transferenciasFinanceiras', transfer.id), {
        observacoes: newObservacoes.trim(),
        updatedAt: serverTimestamp()
      });
      transfer.observacoes = newObservacoes.trim();
      setIsEditingNotes(false);
      onActionSuccess('Observações atualizadas com sucesso.');
    } catch (err: any) {
      console.error('Erro ao salvar observações:', err);
      setErrorMsg('Não foi possível salvar as observações.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEstornar = async () => {
    if (!transfer.id) return;
    setLoadingEstorno(true);
    setErrorMsg(null);
    try {
      const res = await reverseFinancialTransfer(
        db,
        transfer.id,
        motivoEstorno.trim() || 'Estorno solicitado pelo usuário',
        currentUser
      );
      onActionSuccess(res.message);
      setShowEstornoConfirm(false);
      onClose();
    } catch (err: any) {
      console.error('Erro no estorno da transferência:', err);
      setErrorMsg(err.message || 'Erro ao estornar transferência.');
    } finally {
      setLoadingEstorno(false);
    }
  };

  const isEstornada = transfer.estornada || transfer.status === 'Estornada';
  const isConcluida = transfer.status === 'Concluída' && !isEstornada;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-primary-black/70 backdrop-blur-md"
        onClick={!loadingEstorno ? onClose : undefined}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white max-w-2xl w-full rounded-[2.5rem] shadow-2xl relative z-10 my-auto overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-8 bg-primary-black text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display tracking-tight text-white">
                  Detalhes da Transferência
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  ID: {transfer.id || transfer.transferenciaId}
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isEstornada 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                  : transfer.status === 'Concluída' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {transfer.status}
              </span>
              <span className="text-xs text-gray-400">
                {transfer.formaTransferencia}
              </span>
            </div>

            <div className="text-xl font-bold font-display text-gold">
              {formatCurrency(transfer.valor)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Flow cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-1">
                Origem (Debitado)
              </span>
              <h4 className="text-sm font-bold text-gray-900">{transfer.contaOrigemNome}</h4>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">
                Destino (Creditado)
              </span>
              <h4 className="text-sm font-bold text-gray-900">{transfer.contaDestinoNome}</h4>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-400 font-medium">Descrição:</span>
              <span className="font-bold text-gray-900 text-right">{transfer.descricao}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-400 font-medium">Data da Movimentação:</span>
              <span className="font-bold text-gray-900">
                {new Date(transfer.dataTransferencia + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>

            {transfer.codigoImovel && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Imóvel Vinculado:</span>
                <span className="font-bold text-gold uppercase">{transfer.codigoImovel}</span>
              </div>
            )}

            {transfer.corretorNome && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Responsável / Solicitante:</span>
                <span className="font-bold text-gray-900">{transfer.corretorNome}</span>
              </div>
            )}

            {transfer.numeroComprovante && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Nº Comprovante / Doc:</span>
                <span className="font-mono font-bold text-gray-900">{transfer.numeroComprovante}</span>
              </div>
            )}

            {transfer.comprovanteUrl && (
              <div className="flex justify-between py-2 border-b border-gray-100 items-center">
                <span className="text-gray-400 font-medium">Comprovante / Anexo:</span>
                <a 
                  href={transfer.comprovanteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gold hover:underline font-bold flex items-center gap-1"
                >
                  Visualizar Anexo <ExternalLink size={12} />
                </a>
              </div>
            )}

            {transfer.tags && transfer.tags.length > 0 && (
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-400 font-medium block mb-1.5">Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {transfer.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="py-2 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 font-medium">Observações:</span>
                {!isEditingNotes && (
                  <button 
                    type="button" 
                    onClick={handleStartEditNotes} 
                    className="text-gold hover:underline text-[11px] font-bold"
                  >
                    Editar Observação
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-2 mt-2">
                  <textarea 
                    rows={2}
                    value={newObservacoes}
                    onChange={e => setNewObservacoes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-gold/30"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingNotes(false)} 
                      className="px-3 py-1 text-gray-500 hover:text-gray-700 text-xs"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveNotes} 
                      disabled={savingNotes}
                      className="px-4 py-1.5 bg-primary-black text-white font-bold rounded-lg text-xs hover:bg-gold hover:text-primary-black transition-colors"
                    >
                      {savingNotes ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 italic">{transfer.observacoes || 'Nenhuma observação informada.'}</p>
              )}
            </div>

            {/* Reversal Audit info if estornada */}
            {isEstornada && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-1">
                <div className="flex items-center gap-1.5 text-red-700 font-bold">
                  <AlertTriangle size={14} />
                  <span>Esta transferência foi estornada</span>
                </div>
                {transfer.motivoEstorno && (
                  <p className="text-xs text-red-600"><strong>Motivo:</strong> {transfer.motivoEstorno}</p>
                )}
                {transfer.estornadaPorEmail && (
                  <p className="text-[10px] text-red-500">Estornada por: {transfer.estornadaPorEmail}</p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Estorno Box */}
          {showEstornoConfirm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Confirmar Estorno de Saldo</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Ao estornar, o valor de <strong>{formatCurrency(transfer.valor)}</strong> será <u>subtraído</u> da conta de destino (<strong>{transfer.contaDestinoNome}</strong>) e <u>restituído</u> à conta de origem (<strong>{transfer.contaOrigemNome}</strong>).
              </p>
              
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase text-amber-900">Motivo do Estorno:</label>
                <input 
                  type="text"
                  placeholder="Ex: Transferência duplicada, valor incorreto..."
                  value={motivoEstorno}
                  onChange={e => setMotivoEstorno(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl py-2 px-3 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEstornoConfirm(false)}
                  disabled={loadingEstorno}
                  className="px-4 py-2 text-gray-500 hover:text-gray-800 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEstornar}
                  disabled={loadingEstorno}
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {loadingEstorno ? 'Processando estorno...' : 'Confirmar e Devolver Saldos'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button 
            type="button" 
            onClick={onClose} 
            className="text-xs font-bold text-gray-500 hover:text-gray-800"
          >
            Fechar
          </button>

          {isConcluida && !showEstornoConfirm && (
            <button
              type="button"
              onClick={() => setShowEstornoConfirm(true)}
              className="px-5 py-2.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Estornar Transferência</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

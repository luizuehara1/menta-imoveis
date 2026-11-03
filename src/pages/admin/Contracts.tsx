import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  MoreVertical, 
  FileCheck, 
  FileX, 
  Clock, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Archive,
  RotateCcw,
  Ban,
  User,
  Building2,
  DollarSign,
  Calendar,
  MapPin,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, ContractType, ContractStatus } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

export default function AdminContracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativos' | 'arquivados'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Details view state
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Status-based confirmation modals
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [cancelingContract, setCancelingContract] = useState<Contract | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [archivingContract, setArchivingContract] = useState<Contract | null>(null);
  const [restoringContract, setRestoringContract] = useState<Contract | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI helpers
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-actions-menu]')) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setDeletingContract(null);
        setCancelingContract(null);
        setArchivingContract(null);
        setRestoringContract(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'contratos'), orderBy('criadoEm', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contract[];
      setContracts(docs);

      // Keep selectedContract updated in real time if open
      if (selectedContract?.id) {
        const updated = docs.find(c => c.id === selectedContract.id);
        if (updated) {
          setSelectedContract(updated);
        }
      }

      setLoading(false);
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'contratos':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'contratos':", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedContract?.id]);

  // Support direct selection via URL ?id=...
  useEffect(() => {
    const urlContractId = searchParams.get('id');
    if (urlContractId && contracts.length > 0) {
      const found = contracts.find(c => c.id === urlContractId);
      if (found) {
        setSelectedContract(found);
      }
    }
  }, [searchParams, contracts]);

  // Tab counts
  const { activeCount, archivedCount } = useMemo(() => {
    let act = 0;
    let arq = 0;
    for (const c of contracts) {
      if ((c as any).excluido || (c as any).arquivado) {
        arq++;
      } else {
        act++;
      }
    }
    return { activeCount: act, archivedCount: arq };
  }, [contracts]);

  // 1. CONFIRM DELETE (Logical deletion for draft contracts)
  const handleConfirmDeleteDraft = async () => {
    if (!deletingContract?.id) return;
    try {
      setIsProcessing(true);
      const userRef = user?.email || user?.displayName || 'Administrador';
      await updateDoc(doc(db, 'contratos', deletingContract.id), {
        excluido: true,
        excluidoEm: serverTimestamp(),
        excluidoPor: userRef,
        statusAnterior: deletingContract.status || 'rascunho',
        atualizadoEm: serverTimestamp()
      });
      showToast('Contrato excluído com sucesso (preservado no histórico seguro).', 'success');
      if (selectedContract?.id === deletingContract.id) {
        setSelectedContract(null);
      }
      setDeletingContract(null);
    } catch (error: any) {
      console.error("Erro ao excluir contrato logicamente:", error);
      showToast(`Erro ao excluir contrato: ${error?.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. CONFIRM CANCEL (For contracts sent / pending / approved)
  const handleConfirmCancelContract = async () => {
    if (!cancelingContract?.id) return;
    if (!cancelReason.trim()) {
      showToast('Por favor, informe o motivo do cancelamento do contrato.', 'error');
      return;
    }
    try {
      setIsProcessing(true);
      const userRef = user?.email || user?.displayName || 'Administrador';
      await updateDoc(doc(db, 'contratos', cancelingContract.id), {
        status: 'cancelado',
        canceladoEm: serverTimestamp(),
        canceladoPor: userRef,
        motivoCancelamento: cancelReason.trim(),
        atualizadoEm: serverTimestamp()
      });
      showToast('Contrato cancelado com sucesso e registrado no histórico.', 'success');
      setCancelingContract(null);
      setCancelReason('');
    } catch (error: any) {
      console.error("Erro ao cancelar contrato:", error);
      showToast(`Erro ao cancelar contrato: ${error?.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. CONFIRM ARCHIVE (For signed / finalized contracts)
  const handleConfirmArchiveContract = async () => {
    if (!archivingContract?.id) return;
    try {
      setIsProcessing(true);
      const userRef = user?.email || user?.displayName || 'Administrador';
      await updateDoc(doc(db, 'contratos', archivingContract.id), {
        arquivado: true,
        arquivadoEm: serverTimestamp(),
        arquivadoPor: userRef,
        atualizadoEm: serverTimestamp()
      });
      showToast('Contrato arquivado com sucesso no repositório seguro.', 'success');
      if (selectedContract?.id === archivingContract.id) {
        setSelectedContract(null);
      }
      setArchivingContract(null);
    } catch (error: any) {
      console.error("Erro ao arquivar contrato:", error);
      showToast(`Erro ao arquivar contrato: ${error?.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. CONFIRM RESTORE (Restore from archive or trash)
  const handleConfirmRestoreContract = async () => {
    if (!restoringContract?.id) return;
    try {
      setIsProcessing(true);
      const userRef = user?.email || user?.displayName || 'Administrador';
      const statusRestaurado = (restoringContract as any).statusAnterior || 
        (restoringContract.status === 'cancelado' ? 'rascunho' : restoringContract.status) || 
        'rascunho';

      await updateDoc(doc(db, 'contratos', restoringContract.id), {
        excluido: false,
        arquivado: false,
        status: statusRestaurado,
        restauradoEm: serverTimestamp(),
        restauradoPor: userRef,
        atualizadoEm: serverTimestamp()
      });
      showToast('Contrato restaurado com sucesso para a listagem ativa!', 'success');
      setRestoringContract(null);
    } catch (error: any) {
      console.error("Erro ao restaurar contrato:", error);
      showToast(`Erro ao restaurar contrato: ${error?.message || error}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick contextual action trigger from table or details view
  const triggerContextualAction = (contract: Contract) => {
    const isExcluidoOuArquivado = (contract as any).excluido || (contract as any).arquivado;
    if (isExcluidoOuArquivado) {
      setRestoringContract(contract);
      return;
    }

    if (contract.status === 'rascunho') {
      setDeletingContract(contract);
    } else if (
      contract.status === 'aguardando_aprovacao' || 
      contract.status === 'aprovado' || 
      contract.status === 'enviado_assinatura'
    ) {
      setCancelReason('');
      setCancelingContract(contract);
    } else if (contract.status === 'assinado' || contract.status === 'finalizado') {
      setArchivingContract(contract);
    } else {
      // Cancelled or other status -> allow archive or logical delete
      setArchivingContract(contract);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ContractStatus) => {
    try {
      setUpdatingStatusId(id);
      await updateDoc(doc(db, 'contratos', id), {
        status: newStatus,
        atualizadoEm: serverTimestamp()
      });
      showToast(`Status atualizado para "${getStatusConfig(newStatus).label}"!`, 'success');
    } catch (error: any) {
      console.error("Error updating status:", error);
      showToast(`Erro ao atualizar status: ${error?.message || error}`, 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const isExcluidoOuArquivado = !!((contract as any).excluido || (contract as any).arquivado);
    if (activeTab === 'ativos' && isExcluidoOuArquivado) return false;
    if (activeTab === 'arquivados' && !isExcluidoOuArquivado) return false;

    const nome = String(
      contract.nomeCliente || 
      (contract as any).comprador?.nome || 
      (contract as any).proponenteNome ||
      (contract as any).dados?.proponente?.nome || 
      (contract as any).dados?.locatario?.nome || 
      (contract as any).locatarioNome ||
      ''
    ).toLowerCase();

    const endereco = String(
      contract.enderecoImovel || 
      (contract as any).imovelEndereco || 
      (contract as any).imovelTitulo ||
      (contract as any).dados?.imovel?.endereco || 
      (contract as any).dados?.imovel?.titulo ||
      ''
    ).toLowerCase();

    const codigo = String(
      (contract as any).imovelCodigo || 
      (contract as any).codigoImovel || 
      (contract as any).dados?.imovel?.codigo || 
      ''
    ).toLowerCase();

    const term = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !term || nome.includes(term) || endereco.includes(term) || codigo.includes(term);
    const matchesType = filterType === 'all' || contract.tipoContrato === filterType;
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusConfig = (status: ContractStatus | string) => {
    switch (status) {
      case 'rascunho':
        return { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 border border-gray-200', icon: Clock };
      case 'aguardando_aprovacao':
        return { label: 'Aguardando Aprovação', color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: Clock };
      case 'aprovado':
        return { label: 'Aprovado', color: 'bg-blue-100 text-blue-800 border border-blue-200', icon: CheckCircle };
      case 'reprovado':
        return { label: 'Reprovado', color: 'bg-rose-100 text-rose-800 border border-rose-200', icon: XCircle };
      case 'enviado_assinatura':
        return { label: 'Enviado p/ Assinatura', color: 'bg-purple-100 text-purple-800 border border-purple-200', icon: Send };
      case 'assinado':
        return { label: 'Assinado', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: FileCheck };
      case 'finalizado':
        return { label: 'Finalizado', color: 'bg-gold/20 text-primary-black border border-gold/40', icon: FileCheck };
      case 'cancelado':
        return { label: 'Cancelado', color: 'bg-red-100 text-red-800 border border-red-200', icon: FileX };
      default:
        return { label: status || 'Rascunho', color: 'bg-gray-100 text-gray-700 border border-gray-200', icon: Clock };
    }
  };

  const getTypeLabel = (type: ContractType | string) => {
    switch (type) {
      case 'proposta': return 'Proposta de Compra';
      case 'contraproposta': return 'Contraproposta';
      case 'aceite': return 'Aceite de Termos';
      case 'locacao_temporaria': return 'Locação Temporária';
      case 'administracao_temporaria': return 'Administração Temporária';
      case 'arras_confirmatorios': return 'Arras Confirmatórios';
      case 'compra_venda': return 'Compra e Venda';
      default: return type || 'Documento';
    }
  };

  const formatDateSafely = (criadoEm: any) => {
    if (!criadoEm) return 'Pendente';
    try {
      if (criadoEm.toDate && typeof criadoEm.toDate === 'function') {
        return format(criadoEm.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR });
      }
      if (criadoEm instanceof Date) {
        return format(criadoEm, "dd 'de' MMMM, yyyy", { locale: ptBR });
      }
      if (typeof criadoEm === 'string' || typeof criadoEm === 'number') {
        const d = new Date(criadoEm);
        if (!isNaN(d.getTime())) {
          return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
        }
      }
    } catch (e) {
      console.warn("Erro ao formatar data do contrato:", e);
    }
    return 'Recente';
  };

  // ==========================================
  // RENDER: CONTRACT DETAILS SCREEN
  // ==========================================
  if (selectedContract) {
    const statusCfg = getStatusConfig(selectedContract.status);
    const StatusIcon = statusCfg.icon;
    const isArchivedOrDeleted = (selectedContract as any).excluido || (selectedContract as any).arquivado;
    const isDraft = selectedContract.status === 'rascunho';
    const isPendingOrSent = selectedContract.status === 'aguardando_aprovacao' || selectedContract.status === 'aprovado' || selectedContract.status === 'enviado_assinatura';
    const isSignedOrFinal = selectedContract.status === 'assinado' || selectedContract.status === 'finalizado';

    // Extracted clean customer details
    const clienteNome = selectedContract.nomeCliente || 
      (selectedContract as any).comprador?.nome || 
      (selectedContract as any).dados?.proponente?.nome || 
      (selectedContract as any).dados?.locatario?.nome || 
      'Cliente não informado';

    const clienteCpf = selectedContract.dados?.proponente?.cpf || 
      (selectedContract as any).comprador?.cpf || 
      (selectedContract as any).comprador?.documento || 
      selectedContract.dados?.locatario?.cpf || 
      'Não informado';

    const clienteTelefone = selectedContract.dados?.proponente?.telefone || 
      selectedContract.dados?.proponente?.whatsapp || 
      (selectedContract as any).comprador?.telefone || 
      (selectedContract as any).comprador?.whatsapp || 
      selectedContract.dados?.locatario?.telefone || 
      selectedContract.dados?.locatario?.whatsapp || 
      'Não informado';

    const clienteEmail = selectedContract.dados?.proponente?.email || 
      (selectedContract as any).comprador?.email || 
      selectedContract.dados?.locatario?.email || 
      'Não informado';

    const clienteEndereco = selectedContract.dados?.proponente?.endereco || 
      (selectedContract as any).comprador?.endereco || 
      selectedContract.dados?.locatario?.endereco || 
      'Não informado';

    const conjugeNome = selectedContract.dados?.proponente?.conjugeNome || 
      selectedContract.dados?.proponente?.compradorConjugeNome || 
      (selectedContract as any).comprador?.conjugeNome || 
      null;

    // Property details
    const imovelTitulo = selectedContract.enderecoImovel || 
      (selectedContract as any).imovelTitulo || 
      (selectedContract as any).imovelEndereco || 
      selectedContract.dados?.imovel?.titulo || 
      'Imóvel Vinculado';

    const imovelCodigo = (selectedContract as any).imovelCodigo || 
      (selectedContract as any).codigoImovel || 
      selectedContract.dados?.imovel?.codigo || 
      (selectedContract.imovelId ? 'Ref. Sistema' : 'Manual');

    const imovelMatricula = (selectedContract as any).imovelMatricula || 
      selectedContract.dados?.imovel?.matricula || 
      'Não informada';

    const imovelCri = (selectedContract as any).imovelCri || 
      selectedContract.dados?.imovel?.cri || 
      'Não informado';

    // Financial details
    const formaPagamentoTexto = (selectedContract as any).condicoesPagamento || 
      (selectedContract as any).outrasCondicoes || 
      (selectedContract as any).detalhesPagamento || 
      selectedContract.dados?.termos?.outrasCondicoes || 
      selectedContract.dados?.pagamento?.outrasCondicoes || 
      selectedContract.dados?.pagamento?.condicoesPagamento || 
      'Conforme discriminado no contrato';

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top Back Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <button 
            type="button"
            onClick={() => setSelectedContract(null)}
            className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-primary-black transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-gold/20 group-hover:text-gold flex items-center justify-center transition-colors">
              <ArrowLeft size={16} />
            </div>
            <span>Voltar à Listagem de Contratos</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status:</span>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusCfg.color}`}>
              <StatusIcon size={14} />
              <span>{statusCfg.label}</span>
            </span>
            {isArchivedOrDeleted && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                {(selectedContract as any).excluido ? 'Excluído (Histórico)' : 'Arquivado'}
              </span>
            )}
          </div>
        </div>

        {/* Contract Title & Primary Action Buttons */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/15 text-primary-black font-bold text-xs uppercase tracking-wider rounded-lg">
              <FileText size={15} className="text-gold" />
              <span>{getTypeLabel(selectedContract.tipoContrato)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary-black tracking-tight">
              {clienteNome}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              ID do Documento: <span className="font-mono text-gray-600">{selectedContract.id}</span> • Criado em {formatDateSafely(selectedContract.criadoEm)}
            </p>
          </div>

          {/* Action Buttons Hub */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. VISUALIZAR */}
            <button
              type="button"
              onClick={() => navigate(`/admin/contratos/editar/${selectedContract.id}?preview=true`)}
              className="py-3 px-5 bg-gold/15 hover:bg-gold/25 text-primary-black font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-gold/30 active:scale-95"
              title="Abrir prévia completa do documento A4"
            >
              <Eye size={17} className="text-gold" />
              <span>Visualizar</span>
            </button>

            {/* 2. EDITAR */}
            <button
              type="button"
              onClick={() => navigate(`/admin/contratos/editar/${selectedContract.id}`)}
              className="py-3 px-5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-blue-200 active:scale-95"
              title="Abrir formulário de edição com dados preenchidos"
            >
              <Edit2 size={17} className="text-blue-600" />
              <span>Editar</span>
            </button>

            {/* 3. BAIXAR PDF */}
            <button
              type="button"
              onClick={() => navigate(`/admin/contratos/editar/${selectedContract.id}?preview=true&download=true`)}
              className="py-3 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-emerald-200 active:scale-95"
              title="Baixar ou imprimir documento em formato PDF"
            >
              <Download size={17} className="text-emerald-600" />
              <span>Baixar PDF</span>
            </button>

            {/* 4. EXCLUIR / CANCELAR / ARQUIVAR / RESTAURAR */}
            {isArchivedOrDeleted ? (
              <button
                type="button"
                onClick={() => setRestoringContract(selectedContract)}
                className="py-3 px-5 bg-gray-900 hover:bg-black text-gold font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-gray-800 active:scale-95"
                title="Restaurar contrato para a listagem normal"
              >
                <RotateCcw size={17} className="text-gold" />
                <span>Restaurar</span>
              </button>
            ) : isDraft ? (
              <button
                type="button"
                onClick={() => setDeletingContract(selectedContract)}
                className="py-3 px-5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-red-200 active:scale-95"
                title="Excluir este rascunho de contrato"
              >
                <Trash2 size={17} className="text-red-600" />
                <span>Excluir</span>
              </button>
            ) : isPendingOrSent ? (
              <button
                type="button"
                onClick={() => {
                  setCancelReason('');
                  setCancelingContract(selectedContract);
                }}
                className="py-3 px-5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-amber-200 active:scale-95"
                title="Cancelar contrato com justificativa"
              >
                <Ban size={17} className="text-amber-600" />
                <span>Cancelar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setArchivingContract(selectedContract)}
                className="py-3 px-5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center gap-2.5 transition-all cursor-pointer border border-purple-200 active:scale-95"
                title="Arquivar contrato preservando histórico jurídico"
              >
                <Archive size={17} className="text-purple-600" />
                <span>Arquivar</span>
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {selectedContract.status === 'cancelado' && (selectedContract as any).motivoCancelamento && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Ban size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-wider">Documento Cancelado</h4>
              <p className="text-xs text-red-800 leading-relaxed">
                <strong>Motivo registrado:</strong> "{(selectedContract as any).motivoCancelamento}"
              </p>
              <p className="text-[11px] text-red-600">
                Cancelado por {(selectedContract as any).canceladoPor || 'Administrador'} em {formatDateSafely((selectedContract as any).canceladoEm)}
              </p>
            </div>
          </div>
        )}

        {/* 4 Overview Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Identificação do Cliente */}
          <div className="bg-white p-7 rounded-3xl shadow-lg border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">Identificação do Cliente</h3>
                <p className="text-xs text-gray-400">Proponente, comprador ou locatário principal</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Nome Completo:</span>
                <span className="font-bold text-gray-900 text-right">{clienteNome}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">CPF / Documento:</span>
                <span className="font-semibold text-gray-700">{clienteCpf}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Telefone / WhatsApp:</span>
                <span className="font-semibold text-gray-700">{clienteTelefone}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">E-mail:</span>
                <span className="font-semibold text-gray-700 truncate max-w-[220px]">{clienteEmail}</span>
              </div>
              <div className="flex items-start justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">Endereço:</span>
                <span className="font-semibold text-gray-700 text-right">{clienteEndereco}</span>
              </div>
              {conjugeNome && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Cônjuge:</span>
                  <span className="font-bold text-gray-800">{conjugeNome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Imóvel Vinculado */}
          <div className="bg-white p-7 rounded-3xl shadow-lg border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">Imóvel Vinculado</h3>
                <p className="text-xs text-gray-400">Dados do imóvel objeto desta negociação</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">Título / Descrição:</span>
                <span className="font-bold text-gray-900 text-right max-w-[240px] truncate">{imovelTitulo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Código de Referência:</span>
                <span className="font-mono font-bold text-gold bg-gold/10 px-2 py-0.5 rounded text-[11px]">{imovelCodigo}</span>
              </div>
              <div className="flex items-start justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">Endereço Completo:</span>
                <span className="font-semibold text-gray-700 text-right">{imovelTitulo}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Matrícula:</span>
                <span className="font-semibold text-gray-700">{imovelMatricula}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">CRI (Cartório):</span>
                <span className="font-semibold text-gray-700">{imovelCri}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Valor da Negociação & Condições */}
          <div className="bg-white p-7 rounded-3xl shadow-lg border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">Condições Financeiras</h3>
                <p className="text-xs text-gray-400">Valores pactuados e forma de quitação</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Valor Total:</span>
                <span className="text-xl font-display font-bold text-primary-black">
                  {formatCurrency(selectedContract.valor || 0)}
                </span>
              </div>
              {(selectedContract as any).valorSinal > 0 && (
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Valor Sinal / Arras:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency((selectedContract as any).valorSinal)}
                  </span>
                </div>
              )}
              <div className="space-y-1.5 pt-1">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider block">Condições de Pagamento:</span>
                <p className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-gray-700 leading-relaxed text-[11px]">
                  {formaPagamentoTexto}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Auditoria & Histórico */}
          <div className="bg-white p-7 rounded-3xl shadow-lg border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display">Auditoria & Rastreabilidade</h3>
                <p className="text-xs text-gray-400">Registro cronológico do ciclo contratual</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Data de Criação:</span>
                <span className="font-semibold text-gray-800">{formatDateSafely(selectedContract.criadoEm)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Última Atualização:</span>
                <span className="font-semibold text-gray-800">{formatDateSafely((selectedContract as any).atualizadoEm || selectedContract.criadoEm)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Tipo de Instrumento:</span>
                <span className="font-bold text-primary-black">{getTypeLabel(selectedContract.tipoContrato)}</span>
              </div>
              {(selectedContract as any).excluido && (
                <div className="flex items-center justify-between border-b border-gray-50 pb-2 text-rose-700">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Excluído por:</span>
                  <span className="font-bold">{(selectedContract as any).excluidoPor || 'Administrador'}</span>
                </div>
              )}
              {(selectedContract as any).arquivado && (
                <div className="flex items-center justify-between border-b border-gray-50 pb-2 text-purple-700">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Arquivado por:</span>
                  <span className="font-bold">{(selectedContract as any).arquivadoPor || 'Administrador'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Footer Bar */}
        <div className="p-6 bg-gradient-to-r from-gray-900 via-primary-black to-gray-900 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-gold/20 text-gold flex items-center justify-center shrink-0">
              <FileCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight">Deseja revisar a minuta do contrato antes de imprimir?</h4>
              <p className="text-xs text-gray-300">Você pode editar cláusulas personalizadas ou gerar o PDF a qualquer momento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(`/admin/contratos/editar/${selectedContract.id}?preview=true`)}
              className="py-2.5 px-5 bg-gold text-primary-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gold/90 transition-all cursor-pointer shadow-md"
            >
              Abrir Prévia
            </button>
            <button
              type="button"
              onClick={() => setSelectedContract(null)}
              className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN CONTRACTS TABLE & LISTING
  // ==========================================
  return (
    <div className="space-y-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 right-8 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/30' 
                : 'bg-red-900/90 text-red-100 border-red-500/30'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-red-400" />}
            <span className="text-sm font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Modal: Exclusão Lógica de Rascunho */}
      {deletingContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 space-y-6"
          >
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={26} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Excluir este contrato?</h3>
                <p className="text-xs text-gray-500">Confirmação de exclusão do documento em rascunho.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-2.5 text-xs text-gray-700">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Tipo de Documento:</span>
                <span className="font-bold text-primary-black bg-gold/15 px-2.5 py-0.5 rounded-md text-[11px]">
                  {getTypeLabel(deletingContract.tipoContrato)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 shrink-0">Cliente / Proponente:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {deletingContract.nomeCliente || (deletingContract as any).comprador?.nome || (deletingContract as any).dados?.proponente?.nome || 'Cliente não informado'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 shrink-0">Imóvel:</span>
                <span className="font-semibold text-gray-900 text-right truncate max-w-[240px]">
                  {deletingContract.enderecoImovel || (deletingContract as any).imovelTitulo || 'Imóvel vinculado'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Valor Negociado:</span>
                <span className="font-display font-bold text-primary-black text-sm">
                  {formatCurrency(deletingContract.valor || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Status Atual:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusConfig(deletingContract.status).color}`}>
                  {getStatusConfig(deletingContract.status).label}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              O contrato será removido da listagem ativa e preservado com segurança na aba de histórico e auditoria, sem apagar cadastros de imóveis, clientes ou corretores.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setDeletingContract(null)}
                className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all text-center cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDeleteDraft}
                className="py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. Modal: Cancelamento de Contrato com Justificativa */}
      {cancelingContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 space-y-6"
          >
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Ban size={26} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Cancelar Contrato</h3>
                <p className="text-xs text-gray-500">Este contrato está em andamento ({getStatusConfig(cancelingContract.status).label}).</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 border border-amber-200/60 rounded-2xl text-xs text-amber-900 leading-relaxed">
              Para garantir conformidade jurídica e rastreabilidade, informe obrigatoriamente o motivo do cancelamento deste contrato.
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Motivo do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Desistência mútua entre as partes, vencimento do prazo da proposta, etc."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-medium text-gray-800 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setCancelingContract(null);
                  setCancelReason('');
                }}
                className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all text-center cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isProcessing || !cancelReason.trim()}
                onClick={handleConfirmCancelContract}
                className="py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <>
                    <Ban size={16} />
                    <span>Confirmar Cancelamento</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. Modal: Arquivar Contrato Assinado / Finalizado */}
      {archivingContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 space-y-6"
          >
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Archive size={26} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Arquivar Contrato</h3>
                <p className="text-xs text-gray-500">Preservação segura do instrumento contratual.</p>
              </div>
            </div>

            <div className="p-4 bg-purple-50/60 border border-purple-200/60 rounded-2xl text-xs text-purple-900 leading-relaxed">
              Como este contrato já possui status de <strong>{getStatusConfig(archivingContract.status).label}</strong>, ele será movido para o repositório de <strong>Contratos Arquivados</strong>. Todas as assinaturas, termos e geração de PDF continuarão 100% disponíveis para consulta a qualquer momento.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setArchivingContract(null)}
                className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all text-center cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmArchiveContract}
                className="py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Arquivando...</span>
                  </>
                ) : (
                  <>
                    <Archive size={16} />
                    <span>Confirmar Arquivamento</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. Modal: Restaurar Contrato */}
      {restoringContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 space-y-6"
          >
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <RotateCcw size={26} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-gray-900">Restaurar Contrato</h3>
                <p className="text-xs text-gray-500">Mover de volta para a listagem ativa de contratos.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Deseja restaurar este contrato para a listagem de contratos ativos? O status anterior será restabelecido e as ações de edição e visualização voltarão ao estado normal.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRestoringContract(null)}
                className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all text-center cursor-pointer disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRestoreContract}
                className="py-3.5 px-4 bg-primary-black hover:bg-gray-800 text-gold font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>Confirmar Restauração</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight mb-2">Contratos e Propostas</h1>
          <p className="text-gray-400 font-medium">Gestão centralizada de documentos jurídicos, propostas comerciais e locações.</p>
        </motion.div>

        <motion.div 
          variants={scaleIn} 
          initial="initial" 
          animate="animate"
          className="flex items-center gap-3"
        >
          <button 
            type="button"
            onClick={() => navigate('/admin/contratos/novo')}
            className="btn-gold !py-4 pr-8 pl-6 flex items-center gap-3 shadow-xl shadow-gold/20 active:scale-95 transition-all cursor-pointer"
          >
            <div className="bg-primary-black/10 p-1.5 rounded-lg">
              <Plus size={18} />
            </div>
            <span className="font-bold tracking-tight">Novo Contrato / Proposta</span>
          </button>
        </motion.div>
      </div>

      {/* Tab Switcher: Ativos vs Arquivados */}
      <div className="flex items-center gap-3 border-b border-gray-200/80 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('ativos')}
          className={`py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'ativos'
              ? 'bg-primary-black text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText size={16} className={activeTab === 'ativos' ? 'text-gold' : 'text-gray-400'} />
          <span>Contratos Ativos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'ativos' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('arquivados')}
          className={`py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
            activeTab === 'arquivados'
              ? 'bg-primary-black text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Archive size={16} className={activeTab === 'arquivados' ? 'text-gold' : 'text-gray-400'} />
          <span>Arquivados & Histórico</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'arquivados' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {archivedCount}
          </span>
        </button>
      </div>

      {/* Filters & Search */}
      <motion.div 
        variants={fadeIn} 
        initial="initial" 
        animate="animate"
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por cliente, endereço ou código do imóvel..." 
              className="w-full bg-gray-50 border-transparent rounded-2xl py-4 pl-12 pr-6 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:bg-white outline-none transition-all placeholder:text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select 
              className="w-full bg-gray-50 border-transparent rounded-2xl py-4 pl-12 pr-6 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos os Tipos</option>
              <option value="proposta">Proposta de Compra</option>
              <option value="contraproposta">Contraproposta</option>
              <option value="aceite">Aceite de Termos</option>
              <option value="locacao_temporaria">Locação Temporária</option>
              <option value="administracao_temporaria">Administração Temporária</option>
              <option value="arras_confirmatorios">Arras Confirmatórios</option>
              <option value="compra_venda">Compra e Venda</option>
            </select>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <div className="w-2 h-2 rounded-full bg-current" />
            </div>
            <select 
              className="w-full bg-gray-50 border-transparent rounded-2xl py-4 pl-12 pr-6 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="rascunho">Rascunho</option>
              <option value="aguardando_aprovacao">Aguardando Aprovação</option>
              <option value="aprovado">Aprovado</option>
              <option value="reprovado">Reprovado</option>
              <option value="enviado_assinatura">Enviado p/ Assinatura</option>
              <option value="assinado">Assinado</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Interactive Table with Direct Row Access */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Documento</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cliente</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Imóvel</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Valor</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Carregando contratos...</p>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText size={40} />
                    </div>
                    <p className="text-gray-400 font-bold mb-2">
                      {activeTab === 'arquivados' ? 'Nenhum contrato arquivado ou excluído' : 'Nenhum documento encontrado'}
                    </p>
                    <p className="text-gray-300 text-sm max-w-xs mx-auto">
                      {activeTab === 'arquivados' 
                        ? 'Contratos arquivados ou excluídos com histórico seguro aparecerão aqui.'
                        : 'Tente ajustar seus filtros ou crie um novo documento agora mesmo.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const status = getStatusConfig(contract.status);
                  const clienteNome = contract.nomeCliente || (contract as any).comprador?.nome || (contract as any).dados?.proponente?.nome || (contract as any).dados?.locatario?.nome || 'Cliente não informado';
                  const emailCliente = contract.dados?.email || contract.dados?.proponente?.email || contract.dados?.locatario?.email || (contract as any).comprador?.email || 'Sem e-mail';
                  const imovelTexto = contract.enderecoImovel || (contract as any).imovelTitulo || (contract as any).imovelEndereco || 'Imóvel Personalizado';
                  const imovelCodigo = (contract as any).imovelCodigo || (contract as any).codigoImovel || (contract.imovelId ? 'Ref. Sistema' : 'Manual');
                  const isArchivedOrDeleted = (contract as any).excluido || (contract as any).arquivado;
                  
                  return (
                    <motion.tr 
                      key={contract.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      onClick={() => setSelectedContract(contract)}
                      className="group hover:bg-gold/5 transition-colors cursor-pointer"
                      title="Clique para abrir os detalhes e ações completas deste contrato"
                    >
                      {/* Document Type & Date */}
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContract(contract);
                            }}
                            className="w-12 h-12 rounded-2xl bg-gold/10 text-gold group-hover:bg-gold group-hover:text-primary-black flex items-center justify-center shadow-sm transition-all shrink-0 cursor-pointer"
                            title="Ver detalhes do contrato"
                          >
                            <FileText size={24} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-primary-black tracking-tight group-hover:text-gold transition-colors">
                                {getTypeLabel(contract.tipoContrato)}
                              </p>
                              {isArchivedOrDeleted && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                                  {(contract as any).excluido ? 'Excluído' : 'Arquivado'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                              {formatDateSafely(contract.criadoEm)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-10 py-7">
                        <p className="text-sm font-bold text-gray-800">{clienteNome}</p>
                        <p className="text-xs text-gray-400 font-medium">{emailCliente}</p>
                      </td>

                      {/* Property */}
                      <td className="px-10 py-7">
                        <div className="max-w-[220px]">
                          <p className="text-sm font-bold text-gray-800 truncate">{imovelTexto}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cód: {imovelCodigo}</p>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-10 py-7">
                        <p className="text-base font-display font-bold text-primary-black">{formatCurrency(contract.valor || 0)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-10 py-7" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <select
                            disabled={updatingStatusId === contract.id || isArchivedOrDeleted}
                            value={contract.status || 'rascunho'}
                            onChange={(e) => handleStatusChange(contract.id!, e.target.value as ContractStatus)}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider outline-none appearance-none pr-6 ${status.color} transition-all hover:shadow-sm disabled:cursor-not-allowed`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 6px center'
                            }}
                          >
                            <option value="rascunho">Rascunho</option>
                            <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="reprovado">Reprovado</option>
                            <option value="enviado_assinatura">Enviado p/ Assinatura</option>
                            <option value="assinado">Assinado</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-10 py-7 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick: Visualizar */}
                          <button 
                            type="button"
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}?preview=true`)}
                            className="p-2.5 text-gray-400 hover:text-gold hover:bg-gold/10 rounded-xl transition-all cursor-pointer"
                            title="Visualizar Contrato Completo"
                          >
                            <Eye size={17} />
                          </button>

                          {/* Quick: Editar */}
                          <button 
                            type="button"
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}`)}
                            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                            title="Editar Contrato"
                          >
                            <Edit2 size={17} />
                          </button>

                          {/* 3-dots actions menu button */}
                          <div className="relative" data-actions-menu>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === contract.id ? null : contract.id!);
                              }}
                              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                                openMenuId === contract.id 
                                  ? 'bg-primary-black text-gold border-primary-black shadow-md' 
                                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 border-transparent'
                              }`}
                              title="Mais opções de ação"
                              aria-label="Ações do contrato"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuId === contract.id && (
                              <div 
                                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40 text-left animate-scaleIn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Ações do Documento</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedContract(contract);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-black transition-colors cursor-pointer text-left"
                                >
                                  <FileText size={16} className="text-gray-500 shrink-0" />
                                  <span>Ver detalhes completos</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/admin/contratos/editar/${contract.id}?preview=true`);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-gray-700 hover:bg-gold/10 hover:text-primary-black transition-colors cursor-pointer text-left"
                                >
                                  <Eye size={16} className="text-gold shrink-0" />
                                  <span>Visualizar contrato</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/admin/contratos/editar/${contract.id}`);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer text-left"
                                >
                                  <Edit2 size={16} className="text-blue-500 shrink-0" />
                                  <span>Editar contrato</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/admin/contratos/editar/${contract.id}?preview=true&download=true`);
                                  }}
                                  className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer text-left"
                                >
                                  <Download size={16} className="text-emerald-500 shrink-0" />
                                  <span>Baixar PDF</span>
                                </button>

                                <div className="my-1 border-t border-gray-100" />

                                {isArchivedOrDeleted ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setRestoringContract(contract);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer text-left"
                                  >
                                    <RotateCcw size={16} className="text-emerald-600 shrink-0" />
                                    <span>Restaurar contrato</span>
                                  </button>
                                ) : contract.status === 'rascunho' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setDeletingContract(contract);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
                                  >
                                    <Trash2 size={16} className="text-red-500 shrink-0" />
                                    <span>Excluir contrato</span>
                                  </button>
                                ) : contract.status === 'aguardando_aprovacao' || contract.status === 'aprovado' || contract.status === 'enviado_assinatura' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setCancelReason('');
                                      setCancelingContract(contract);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer text-left"
                                  >
                                    <Ban size={16} className="text-amber-600 shrink-0" />
                                    <span>Cancelar contrato</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setArchivingContract(contract);
                                    }}
                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer text-left"
                                  >
                                    <Archive size={16} className="text-purple-600 shrink-0" />
                                    <span>Arquivar contrato</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

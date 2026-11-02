import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  Edit2, 
  Trash2,
  ChevronRight,
  MoreHorizontal,
  FileCheck,
  FileX,
  Clock,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

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
  }, [user]);

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'contratos', deletingId));
      showToast('Documento excluído com sucesso!', 'success');
    } catch (error: any) {
      console.error("Error deleting contract:", error);
      showToast(`Erro ao excluir documento: ${error?.message || error}`, 'error');
    } finally {
      setDeletingId(null);
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-display font-bold text-gray-900">Excluir Documento?</h3>
              <p className="text-sm text-gray-500">
                Esta ação excluirá permanentemente este contrato/proposta. Os dados não poderão ser recuperados.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl text-sm transition-all text-center cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl text-sm shadow-md transition-all text-center cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div variants={slideUp} initial="initial" animate="animate">
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight mb-2">Contratos e Propostas</h1>
          <p className="text-gray-400 font-medium">Gestão centralizada de documentos jurídicos e propostas comerciais.</p>
        </motion.div>

        <motion.div 
          variants={scaleIn} 
          initial="initial" 
          animate="animate"
          className="flex items-center gap-3"
        >
          <button 
            onClick={() => navigate('/admin/contratos/novo')}
            className="btn-gold !py-4 pr-8 pl-6 flex items-center gap-3 shadow-xl shadow-gold/20 active:scale-95 transition-all"
          >
            <div className="bg-primary-black/10 p-1.5 rounded-lg">
              <Plus size={18} />
            </div>
            <span className="font-bold tracking-tight">Novo Contrato / Proposta</span>
          </button>
        </motion.div>
      </div>

      {/* Filters & Search */}
      <motion.div 
        variants={fadeIn} 
        initial="initial" 
        animate="animate"
        className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

      {/* Table */}
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
                    <p className="text-gray-400 font-bold mb-2">Nenhum documento encontrado</p>
                    <p className="text-gray-300 text-sm max-w-xs mx-auto">Tente ajustar seus filtros ou crie um novo documento agora mesmo.</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const status = getStatusConfig(contract.status);
                  const StatusIcon = status.icon;
                  const clienteNome = contract.nomeCliente || (contract as any).comprador?.nome || (contract as any).dados?.proponente?.nome || (contract as any).dados?.locatario?.nome || 'Cliente não informado';
                  const emailCliente = contract.dados?.email || contract.dados?.proponente?.email || contract.dados?.locatario?.email || (contract as any).comprador?.email || 'Sem e-mail';
                  const imovelTexto = contract.enderecoImovel || (contract as any).imovelTitulo || (contract as any).imovelEndereco || 'Imóvel Personalizado';
                  const imovelCodigo = (contract as any).imovelCodigo || (contract as any).codigoImovel || (contract.imovelId ? 'Ref. Sistema' : 'Manual');
                  
                  return (
                    <motion.tr 
                      key={contract.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold flex items-center justify-center shadow-sm">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary-black tracking-tight">{getTypeLabel(contract.tipoContrato)}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                              {formatDateSafely(contract.criadoEm)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-sm font-bold text-gray-700">{clienteNome}</p>
                        <p className="text-xs text-gray-400 font-medium">{emailCliente}</p>
                      </td>
                      <td className="px-10 py-7">
                        <div className="max-w-[220px]">
                          <p className="text-sm font-bold text-gray-700 truncate">{imovelTexto}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cód: {imovelCodigo}</p>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-base font-display font-bold text-primary-black">{formatCurrency(contract.valor || 0)}</p>
                      </td>
                      <td className="px-10 py-7">
                        <div className="relative inline-block">
                          <select
                            disabled={updatingStatusId === contract.id}
                            value={contract.status || 'rascunho'}
                            onChange={(e) => handleStatusChange(contract.id!, e.target.value as ContractStatus)}
                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider outline-none appearance-none pr-6 ${status.color} transition-all hover:shadow-sm`}
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
                      <td className="px-10 py-7 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}`)}
                            className="p-3 text-gray-400 hover:bg-white hover:text-gold hover:shadow-lg rounded-xl transition-all cursor-pointer"
                            title="Editar Dados"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setDeletingId(contract.id!)}
                            className="p-3 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-lg rounded-xl transition-all cursor-pointer"
                            title="Excluir Documento"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="w-px h-6 bg-gray-100 mx-1" />
                          <button 
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}?preview=true`)}
                            className="p-3 bg-primary-black text-gold hover:scale-110 active:scale-95 shadow-lg rounded-xl transition-all cursor-pointer"
                            title="Visualizar e Imprimir / PDF"
                          >
                            <Eye size={18} />
                          </button>
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

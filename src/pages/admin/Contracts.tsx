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
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  where 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Contract, ContractType, ContractStatus } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

export default function AdminContracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'contratos'), orderBy('criadoEm', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contract[];
      setContracts(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato?')) {
      try {
        await deleteDoc(doc(db, 'contratos', id));
      } catch (error) {
        console.error("Error deleting contract:", error);
        alert('Erro ao excluir contrato.');
      }
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         contract.enderecoImovel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || contract.tipoContrato === filterType;
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusConfig = (status: ContractStatus) => {
    switch (status) {
      case 'rascunho': return { label: 'Rascunho', color: 'bg-gray-100 text-gray-500', icon: Clock };
      case 'finalizado': return { label: 'Finalizado', color: 'bg-gold/20 text-primary-black', icon: FileCheck };
      case 'assinado': return { label: 'Assinado', color: 'bg-emerald-100 text-emerald-500', icon: FileCheck };
      case 'cancelado': return { label: 'Cancelado', color: 'bg-red-100 text-red-500', icon: FileX };
      default: return { label: status, color: 'bg-gray-100 text-gray-500', icon: Clock };
    }
  };

  const getTypeLabel = (type: ContractType) => {
    switch (type) {
      case 'proposta': return 'Proposta de Compra';
      case 'contraproposta': return 'Contraproposta';
      case 'aceite': return 'Aceite de Termos';
      case 'locacao_temporaria': return 'Locação Temporária';
      default: return type;
    }
  };

  return (
    <div className="space-y-10">
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
            <span className="font-bold tracking-tight">Novo Contrato</span>
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
              placeholder="Buscar por cliente ou imóvel..." 
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
              <option value="proposta">Proposta</option>
              <option value="contraproposta">Contraproposta</option>
              <option value="aceite">Aceite</option>
              <option value="locacao_temporaria">Locação Temporária</option>
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
              <option value="finalizado">Finalizado</option>
              <option value="assinado">Assinado</option>
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
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Imovél</th>
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
                    <p className="text-gray-400 font-bold mb-2">Nenhum contrato encontrado</p>
                    <p className="text-gray-300 text-sm max-w-xs mx-auto">Tente ajustar seus filtros ou crie um novo documento agora mesmo.</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, index) => {
                  const status = getStatusConfig(contract.status);
                  const StatusIcon = status.icon;
                  
                  return (
                    <motion.tr 
                      key={contract.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
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
                              {contract.criadoEm?.toDate ? format(contract.criadoEm.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Pendente'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-sm font-bold text-gray-700">{contract.nomeCliente}</p>
                        <p className="text-xs text-gray-400 font-medium">{contract.dados?.email || 'Sem e-mail'}</p>
                      </td>
                      <td className="px-10 py-7">
                        <div className="max-w-[200px]">
                          <p className="text-sm font-bold text-gray-700 truncate">{contract.enderecoImovel || 'Personalizado'}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Imóvel REF: {contract.imovelId ? 'DB' : 'Manual'}</p>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-base font-display font-bold text-primary-black">{formatCurrency(contract.valor)}</p>
                      </td>
                      <td className="px-10 py-7">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}`)}
                            className="p-3 text-gray-400 hover:bg-white hover:text-gold hover:shadow-lg rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(contract.id!)}
                            className="p-3 text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-lg rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="w-px h-6 bg-gray-100 mx-1" />
                          <button 
                            onClick={() => navigate(`/admin/contratos/editar/${contract.id}?preview=true`)}
                            className="p-3 bg-primary-black text-gold hover:scale-110 active:scale-95 shadow-lg rounded-xl transition-all"
                            title="Visualizar e Imprimir"
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

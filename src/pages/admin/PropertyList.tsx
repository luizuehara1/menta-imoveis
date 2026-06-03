import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  CheckCircle,
  XCircle,
  MapPin,
  ExternalLink,
  Home,
  RefreshCcw,
  MessageSquare,
  ClipboardList,
  EyeOff,
  X,
  Key,
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';
import { isValidPublicProperty } from '../../lib/utils';

function normalizeTipoNegocio(tipo: any): string {
  const value = String(tipo || "").toLowerCase();

  if (
    (value.includes("venda") && value.includes("loca")) ||
    value.includes("ambos")
  ) {
    return "Venda e Locação";
  }

  if (value.includes("compr") || value.includes("vend")) {
    return "Venda";
  }

  if (value.includes("loca") || value.includes("alug")) {
    return "Locação";
  }

  return "";
}

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50">
    <td className="p-8 pl-12">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gray-100 rounded-[1.75rem]" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-50 rounded w-32" />
        </div>
      </div>
    </td>
    <td className="p-8"><div className="h-4 bg-gray-100 rounded w-28" /></td>
    <td className="p-8"><div className="h-4 bg-gray-100 rounded w-24" /></td>
    <td className="p-8"><div className="h-6 bg-gray-50 rounded-xl w-24" /></td>
    <td className="p-8"><div className="h-6 bg-emerald-50/30 rounded-full w-20" /></td>
    <td className="p-8 pr-12"><div className="h-10 bg-gray-50 rounded-2xl w-24 ml-auto" /></td>
  </tr>
);

export default function AdminPropertyList() {
  const { user, isAdmin } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [migrating, setMigrating] = useState(false);

  const setImoveis = setProperties;

  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleMigrateOldProperties = async () => {
    if (migrating) return;
    setMigrating(true);
    try {
      console.log("Iniciando migração de imóveis antigos...");
      const snap = await getDocs(collection(db, 'imoveis'));
      let count = 0;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const hasPublicadoFields = 
          data.publicadoNoSite !== undefined &&
          data.publicado !== undefined;

        if (!hasPublicadoFields) {
          await updateDoc(doc(db, 'imoveis', docSnap.id), {
            publicadoNoSite: data.publicadoNoSite ?? true,
            publicado: data.publicado ?? true
          });
          count++;
        }
      }
      triggerToast(`Migração concluída! ${count} imóveis antigos foram atualizados na coleção 'imoveis'.`, 'success');
      fetchProperties();
    } catch (err: any) {
      console.error("Erro ao migrar imóveis:", err);
      triggerToast(`Erro na migração: ${err.message || err}`, 'error');
    } finally {
      setMigrating(false);
    }
  };

  const toastObj = {
    success: (msg: string) => triggerToast(msg, 'success'),
    error: (msg: string) => triggerToast(msg, 'error')
  };

  useEffect(() => {
    fetchProperties();
  }, [user, isAdmin]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      console.log("Usuário logado:", user?.email);
      console.log("É admin:", isAdmin);
      console.log("Buscando imóveis como:", isAdmin ? "ADMIN - TODOS" : "CORRETOR - FILTRADOS");

      // Don't use orderBy here to ensure ALL docs (even ghosts missing updatedAt) are fetched
      const q = query(collection(db, 'imoveis'));
      const snap = await getDocs(q);
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      console.log("Total de imóveis carregados:", data.length);
      if (isAdmin && data.length === 0) {
        console.error("ADMIN carregou 0 imóveis! Erro com o caminho de consulta Firestore da coleção 'imoveis'");
      }

      // Sort in memory safely: Incomplete properties first, then by date
      data.sort((a, b) => {
        const aValid = isValidPublicProperty(a);
        const bValid = isValidPublicProperty(b);
        
        if (!aValid && bValid) return -1;
        if (aValid && !bValid) return 1;

        const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setProperties(data);
    } catch (error) {
      console.error("Error fetching properties:", error);
      console.log("Erro ao carregar imóveis. Caminho query: imoveis");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  async function handleDeleteProperty(imovel: any) {
    if (!isAdmin) {
      toastObj.error("Você não tem permissão para excluir imóveis.");
      return;
    }

    if (!imovel?.id) {
      toastObj.error("Imóvel inválido.");
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir o imóvel ${imovel.code || imovel.codigo || imovel.title || imovel.titulo || imovel.id}?`
    );

    if (!confirmar) return;

    try {
      setDeletingId(imovel.id);

      console.log("Usuário logado:", user?.email);
      console.log("É admin:", isAdmin);
      console.log("Tentando excluir imóvel:", imovel.id);
      console.log("Caminho Firestore:", `imoveis/${imovel.id}`);
      console.log("Dados do imóvel:", imovel);

      await deleteDoc(doc(db, "imoveis", imovel.id));

      setProperties((prev) => prev.filter((item) => item.id !== imovel.id));

      toastObj.success("Imóvel excluído com sucesso.");
    } catch (error: any) {
      console.error("Erro real ao excluir imóvel:", error.code, error.message, error);
      toastObj.error(`Erro ao excluir imóvel: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  const toggleVisibility = async (property: any) => {
    try {
      const newVal = !property.publicado;
      await updateDoc(doc(db, 'imoveis', property.id), { 
        publicado: newVal,
        ativo: newVal,
        publicadoNoSite: newVal,
        updatedAt: new Date()
      });
      setProperties(properties.map(p => p.id === property.id ? { ...p, publicado: newVal, ativo: newVal, publicadoNoSite: newVal } : p));
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  const filtered = properties.filter(p => 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Link do imóvel copiado!");
  };

  const shareWhatsApp = (property: any) => {
    const codigoPublico = property.codigoImovel || property.codigo || property.code || property.id;
    const link = `${window.location.origin}/imovel/${codigoPublico}`;
    const message = `Olá! Segue o link deste imóvel incrível:\n\n*${property.title}*\n\n🏡 Confira os detalhes completos aqui:\n${link}\n\nCódigo: *${property.code}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white backdrop-blur-md shadow-2xl border"
            style={{
              backgroundColor: toast.type === 'success' ? '#14532d' : '#7f1d1d',
              borderColor: toast.type === 'success' ? '#16a34a' : '#b91c1c',
            }}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-300" /> : <X size={20} className="text-red-300" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-10"
      >
      <motion.div 
        variants={slideUp}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Asset Management</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Gestão de Portfólio</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Visualize, edite e controle todo o catálogo de imóveis exclusiva da Menta.</p>
        </div>
        <motion.div
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
        >
          <Link to="/admin/imoveis/novo" className="btn-gold !rounded-2xl !py-4 !px-8 shadow-xl shadow-gold/10">
            <Plus size={22} />
            <span className="uppercase text-xs font-black tracking-widest leading-none">Cadastrar Novo Imóvel</span>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={slideUp}
        className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden"
      >
        {/* Filters and Search */}
        <div className="p-10 border-b border-gray-50 flex flex-col xl:flex-row gap-6 bg-gray-50/30">
          <div className="relative flex-grow group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gold transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por código, título ou cidade..." 
              className="w-full pl-16 pr-8 py-5 bg-white border border-transparent rounded-2xl focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all shadow-sm font-medium text-sm placeholder:text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMigrateOldProperties}
                disabled={migrating}
                className="flex items-center gap-3 px-6 py-5 bg-amber-50 border border-amber-200 hover:border-amber-400 text-amber-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
                title="Migrar/Corrigir Imóveis Antigos para aparecerem no site público"
              >
                <Wrench size={18} className={migrating ? "animate-spin" : ""} />
                {migrating ? "Corrigindo..." : "Corrigir Antigos"}
              </motion.button>
            )}
            <motion.button 
              whileHover={{ rotate: 180 }}
              onClick={fetchProperties}
              className="p-5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gold transition-all shadow-sm"
              title="Atualizar Lista"
            >
              <RefreshCcw size={20} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 px-8 py-5 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-500 uppercase tracking-widest hover:border-gold/30 hover:text-primary-black transition-all shadow-sm"
            >
              <Filter size={18} className="text-gold" />
              Filtros
            </motion.button>
          </div>
        </div>

        {/* Table/List */}
        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {loading ? (
               <motion.table 
                 key="loading"
                 {...fadeIn}
                 className="w-full"
               >
                 <tbody>
                    {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                 </tbody>
               </motion.table>
            ) : filtered.length === 0 ? (
               <motion.div 
                 key="empty"
                 {...fadeIn}
                 className="p-32 text-center flex flex-col items-center"
               >
                  <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                    <Home size={40} className="text-gray-200" />
                  </div>
                  <p className="text-lg font-display font-medium text-gray-400">Nenhum registro encontrado para sua busca.</p>
               </motion.div>
            ) : (
              <motion.table 
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="w-full border-collapse"
              >
                <thead>
                  <tr className="bg-gray-50/50 text-left border-b border-gray-50">
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em] pl-12">Imóvel</th>
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em]">Localização</th>
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em]">Tipo & Negócio</th>
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em]">Status</th>
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em]">Visibilidade</th>
                    <th className="p-8 font-black text-[10px] text-gray-400 uppercase tracking-[0.3em] text-right pr-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((property) => (
                    <motion.tr 
                      key={property.id} 
                      variants={slideUp}
                      className="hover:bg-gray-50/40 transition-all group relative"
                    >
                      <td className="p-8 pl-12">
                        <div className="flex items-center gap-6">
                          <motion.div 
                            whileHover={{ scale: 1.1, rotate: -3 }}
                            className="w-20 h-20 rounded-[1.75rem] bg-gray-100 overflow-hidden shrink-0 border-4 border-white shadow-xl relative transition-all duration-700"
                          >
                            {property.mainImage ? (
                              <img src={property.mainImage} alt={property.code} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Home size={28} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-primary-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </motion.div>
                          <div>
                            <div className="flex items-center gap-3 mb-1.5">
                               <p className="text-lg font-display font-bold text-primary-black leading-none tracking-tight">{property.code}</p>
                               {property.destaque && (
                                 <motion.span 
                                   initial={{ opacity: 0, scale: 0.5 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   className="bg-gold/10 text-gold text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full whitespace-nowrap"
                                 >
                                   Destaque
                                 </motion.span>
                               )}
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px] font-medium leading-none">{property.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-3 text-gray-600 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-gold/5 flex items-center justify-center shrink-0">
                            <MapPin size={16} className="text-gold" />
                          </div>
                          <span className="text-sm font-bold text-primary-black">{property.city}</span>
                        </div>
                        <p className="text-[10px] font-black text-gray-300 uppercase ml-11 tracking-widest">{property.neighborhood}</p>
                      </td>
                      <td className="p-8">
                         <span className="text-sm font-bold text-primary-black block mb-2">{property.propertyType}</span>
                         <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${property.businessType === 'Venda' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gold/5 text-gold border-gold/20'}`}>
                           {property.businessType}
                         </span>
                      </td>
                      <td className="p-8">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors ${
                          property.status === 'Disponível' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          property.status === 'Vendido' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          property.status === 'Reservado' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                           {property.status}
                        </span>
                      </td>
                      <td className="p-8">
                        <button 
                          onClick={() => toggleVisibility(property)}
                          className="group/toggle"
                        >
                          {property.publicado ? (
                            <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-50/50 w-fit px-4 py-2 rounded-full border border-emerald-100/50 shadow-sm shadow-emerald-100/20 group-hover/toggle:bg-emerald-100 transition-colors">
                              <CheckCircle size={14} className="text-emerald-500 animate-pulse" /> Público
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] bg-gray-50/50 w-fit px-4 py-2 rounded-full border border-gray-100/50 group-hover/toggle:bg-gray-100 transition-colors">
                              <XCircle size={14} className="text-gray-300" /> Rascunho
                            </div>
                          )}
                        </button>
                        {!isValidPublicProperty(property) && (
                          <div className="mt-2 flex items-center gap-2 text-red-500 font-black text-[9px] uppercase tracking-widest bg-red-50 px-3 py-1 rounded-lg border border-red-100 animate-pulse">
                             DADOS INCOMPLETOS
                          </div>
                        )}
                      </td>
                      <td className="p-8 pr-12 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => {
                              const codigoPublico = property.codigoImovel || property.codigo || property.code || property.id;
                              copyToClipboard(`${window.location.origin}/imovel/${codigoPublico}`);
                            }}
                            className="p-3 bg-white text-gray-400 hover:text-gold hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Copiar Link"
                          >
                            <ClipboardList size={18} />
                          </button>
                          <button 
                            onClick={() => shareWhatsApp(property)}
                            className="p-3 bg-white text-gray-400 hover:text-emerald-500 hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare size={18} />
                          </button>
                          <Link 
                            to={`/imovel/${property.codigoImovel || property.codigo || property.code || property.id}`} 
                            target="_blank"
                            className="p-3 bg-white text-gray-400 hover:text-primary-black hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Ver no site"
                          >
                            <ExternalLink size={18} />
                          </Link>
                          {(normalizeTipoNegocio(property.businessType) === "Locação" || 
                            normalizeTipoNegocio(property.businessType) === "Venda e Locação" || 
                            normalizeTipoNegocio(property.tipoNegocio) === "Locação" || 
                            normalizeTipoNegocio(property.tipoNegocio) === "Venda e Locação") && (
                            <Link 
                              to={`/admin/locacoes?novo=true&imovelId=${property.id}`}
                              onClick={() => {
                                console.log("Imóvel selecionado para locação:", property);
                                console.log("Tipo negócio normalizado:", normalizeTipoNegocio(property.businessType || property.tipoNegocio));
                                console.log("Redirecionando para nova locação com imovelId:", property.id);
                              }}
                              className="p-3 bg-white text-gray-400 hover:text-gold hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                              title="Cadastrar locação para este imóvel"
                            >
                              <Key size={18} />
                            </Link>
                          )}
                          <Link 
                            to={`/admin/imoveis/editar/${property.id}`} 
                            className="p-3 bg-white text-gray-400 hover:text-gold hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </Link>
                          <button 
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteProperty(property);
                            }}
                            disabled={deletingId === property.id}
                            className="p-3 bg-white text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-2xl hover:scale-110 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-pointer disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </motion.table>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  </>
  );
}

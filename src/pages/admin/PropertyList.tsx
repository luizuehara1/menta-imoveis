import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  RefreshCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';

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
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'imoveis'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching properties:", error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o imóvel ${code}?`)) {
      try {
        await deleteDoc(doc(db, 'imoveis', id));
        setProperties(properties.filter(p => p.id !== id));
      } catch (error) {
        console.error("Error deleting property:", error);
      }
    }
  };

  const filtered = properties.filter(p => 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
                              <img src={property.mainImage} alt={property.code} className="w-full h-full object-cover" />
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
                               {property.isFeatured && (
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
                        {property.publicado ? (
                          <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] bg-emerald-50/50 w-fit px-4 py-2 rounded-full border border-emerald-100/50 shadow-sm shadow-emerald-100/20">
                            <CheckCircle size={14} className="text-emerald-500 animate-pulse" /> Público
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] bg-gray-50/50 w-fit px-4 py-2 rounded-full border border-gray-100/50">
                            <XCircle size={14} className="text-gray-300" /> Rascunho
                          </div>
                        )}
                      </td>
                      <td className="p-8 pr-12 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                          <Link 
                            to={`/imovel/${property.id}`} 
                            target="_blank"
                            className="p-3.5 bg-white text-gray-400 hover:text-primary-black hover:bg-white hover:shadow-2xl hover:scale-110 rounded-2xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Ver no site"
                          >
                            <ExternalLink size={20} />
                          </Link>
                          <Link 
                            to={`/admin/imoveis/editar/${property.id}`} 
                            className="p-3.5 bg-white text-gray-400 hover:text-gold hover:bg-white hover:shadow-2xl hover:scale-110 rounded-2xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={20} />
                          </Link>
                          <motion.button 
                            whileHover={{ color: '#ef4444' }}
                            onClick={() => handleDelete(property.id, property.code)}
                            className="p-3.5 bg-white text-gray-400 hover:bg-white hover:shadow-2xl hover:scale-110 rounded-2xl border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={20} />
                          </motion.button>
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
  );
}

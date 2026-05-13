import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, MapPin, Bed, Car, MessageCircle, Filter, X, Sparkles, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, useOptions } from '../../hooks/useSettings';
import PageWrapper from '../../components/PageWrapper';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';
import { GoldenParticles } from '../../components/three/GoldenParticles';
import { Canvas } from '@react-three/fiber';

const PropertyCard = ({ property, index }: any) => (
  <motion.div
    variants={slideUp}
    whileHover={{ y: -12 }}
    className="group bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] flex flex-col"
  >
    <Link to={`/imovel/${property.id}`} className="block relative h-72 overflow-hidden">
      <motion.img
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 1 }}
        src={property.mainImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800'}
        alt={property.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <span className="bg-primary-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-white/10">
          {property.businessType}
        </span>
        {property.destaque && (
          <motion.span 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gold text-primary-black text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-gold/20 shadow-lg"
          >
            Destaque
          </motion.span>
        )}
      </div>
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gold/10 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor de {property.businessType === 'Venda' ? 'Venda' : 'Locação'}</p>
           <p className="text-xl font-display font-bold text-primary-green">
             R$ {(property.businessType === 'Venda' ? property.priceVenda : property.priceLocacao)?.toLocaleString('pt-BR')}
           </p>
        </div>
      </div>
    </Link>
    
    <div className="p-8 flex-grow flex flex-col">
      <div className="flex items-center gap-2 text-[10px] font-bold text-gold uppercase tracking-[0.1em] mb-3">
        <MapPin size={14} className="shrink-0" />
        <span className="truncate">{property.neighborhood} • {property.city}</span>
      </div>
      
      <div className="mb-6">
        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">{property.code}</div>
        <h3 className="font-display text-2xl font-bold text-primary-black group-hover:text-gold transition-colors leading-tight line-clamp-2">
          {property.title}
        </h3>
      </div>
      
      <div className="grid grid-cols-4 gap-4 py-6 border-y border-gray-50 mb-8">
        <div className="flex flex-col items-center gap-1 group/icon">
          <Bed size={18} className="text-primary-black group-hover:text-gold transition-colors group-hover/icon:scale-110 duration-300" />
          <span className="text-[10px] font-black text-gray-400 uppercase">{property.bedrooms}</span>
        </div>
        <div className="flex flex-col items-center gap-1 group/icon">
          <Sparkles size={18} className="text-primary-black group-hover:text-gold transition-colors group-hover/icon:scale-110 duration-300" />
          <span className="text-[10px] font-black text-gray-400 uppercase">{property.suites}</span>
        </div>
        <div className="flex flex-col items-center gap-1 group/icon">
          <Car size={18} className="text-primary-black group-hover:text-gold transition-colors group-hover/icon:scale-110 duration-300" />
          <span className="text-[10px] font-black text-gray-400 uppercase">{property.garageSpaces}</span>
        </div>
        <div className="flex flex-col items-center gap-1 group/icon">
          <Layers size={18} className="text-primary-black group-hover:text-gold transition-colors group-hover/icon:scale-110 duration-300" />
          <span className="text-[10px] font-black text-gray-400 uppercase">{property.totalArea || property.usefulArea || property.area}m²</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-auto">
        <motion.div whileTap={{ scale: 0.95 }} className="flex-grow">
          <Link 
            to={`/imovel/${property.id}`} 
            className="w-full flex items-center justify-center btn-gold !rounded-xl !py-3 !text-xs !px-4 shadow-lg shadow-gold/10"
          >
            Detalhes
          </Link>
        </motion.div>
        <motion.a
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5547992914069'}?text=Olá, tenho interesse no imóvel código ${property.code}. Gostaria de mais informações.`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
        >
          <MessageCircle size={20} />
        </motion.a>
      </div>
    </div>
  </motion.div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 p-0 flex flex-col h-[500px] animate-pulse">
    <div className="h-72 bg-gray-100" />
    <div className="p-8 space-y-4">
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-8 bg-gray-100 rounded w-full" />
      <div className="h-20 bg-gray-50 rounded" />
      <div className="h-10 bg-gray-100 rounded" />
    </div>
  </div>
);

export default function PropertyList() {
  const location = useLocation();
  const { settings, loading: settingsLoading } = useSettings();
  const { options, loading: optionsLoading } = useOptions();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Search Filters
  const [searchFilters, setSearchFilters] = useState<any>({
    businessType: 'Venda',
    propertyType: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
  });

  useEffect(() => {
    // Parse URL params
    const params = new URLSearchParams(location.search);
    const initialFilters = {
      businessType: params.get('businessType') || 'Venda',
      propertyType: params.get('propertyType') || '',
      city: params.get('city') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      bedrooms: params.get('bedrooms') || '',
    };
    setSearchFilters(initialFilters);
    fetchProperties(initialFilters);
  }, [location.search]);

  const fetchProperties = async (filters: any) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'imoveis'), 
        where('publicado', '==', true),
        where('status', '==', 'disponivel'),
        where('businessType', '==', filters.businessType)
      );

      // Filtering in JS because we can't easily do many inequality filters in Firestore without index explosion
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      if (filters.propertyType) {
        data = data.filter((p: any) => p.propertyType === filters.propertyType);
      }
      if (filters.city) {
        data = data.filter((p: any) => p.city?.toLowerCase().includes(filters.city.toLowerCase()));
      }
      if (filters.minPrice) {
        const field = filters.businessType === 'Venda' ? 'priceVenda' : 'priceLocacao';
        data = data.filter((p: any) => (p[field] || 0) >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        const field = filters.businessType === 'Venda' ? 'priceVenda' : 'priceLocacao';
        data = data.filter((p: any) => (p[field] || 0) <= parseFloat(filters.maxPrice));
      }
      if (filters.bedrooms) {
        data = data.filter((p: any) => (p.bedrooms || 0) >= parseInt(filters.bedrooms));
      }

      setProperties(data);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="bg-gray-50 min-h-screen">
        {/* Search Header */}
        <div className="bg-primary-green pt-12 pb-24 text-white relative overflow-hidden">
          {/* Three.js Layer */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
            <Canvas camera={{ position: [0, 0, 5] }} gl={{ alpha: true }}>
              <GoldenParticles count={30} size={0.05} speed={0.2} />
            </Canvas>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center"
          />
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
            <motion.div variants={staggerContainer} initial="initial" animate="animate">
              <motion.h1 variants={slideUp} className="font-display text-4xl md:text-5xl font-bold mb-4">
                {settings.secoes.tituloDestaques.split(' ')[0]} <span className="text-gold">{settings.secoes.tituloDestaques.split(' ').slice(1).join(' ')}</span>
              </motion.h1>
              <motion.p variants={slideUp} className="text-emerald-100 font-medium opacity-80">
                {settings.secoes.subtituloDestaques}
              </motion.p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
          {/* Horizontal Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 mb-12 flex flex-wrap items-center gap-6"
          >
            <div className="flex-grow flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 group focus-within:border-gold/50 transition-colors">
              <Search size={20} className="text-gray-400 group-focus-within:text-gold" />
              <input 
                type="text" 
                placeholder="Digite a cidade ou bairro..." 
                className="bg-transparent border-none outline-none w-full text-sm font-medium"
                value={searchFilters.city}
                onChange={(e) => setSearchFilters({...searchFilters, city: e.target.value})}
              />
            </div>
            
            <div className="hidden lg:flex items-center gap-4">
               <select 
                 className="bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                 value={searchFilters.businessType}
                 onChange={(e) => setSearchFilters({...searchFilters, businessType: e.target.value})}
               >
                 {(options.tiposNegocio || []).filter(o => o.ativo).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).map(o => (
                   <option key={o.id} value={o.nome}>{o.nome}</option>
                 ))}
               </select>
               <select 
                 className="bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                 value={searchFilters.propertyType}
                 onChange={(e) => setSearchFilters({...searchFilters, propertyType: e.target.value})}
               >
                 <option value="">Tipo de Imóvel</option>
                 {(options.tiposImovel || []).filter(o => o.ativo).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).map(o => (
                   <option key={o.id} value={o.nome}>{o.nome}</option>
                 ))}
               </select>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchProperties(searchFilters)}
              className="btn-gold !py-4 !px-10 shadow-xl shadow-gold/20 !rounded-2xl"
            >
              Buscar
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilters(true)}
              className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-2xl text-primary-black hover:bg-primary-black hover:text-white transition-all shadow-sm"
            >
              <Filter size={20} />
            </motion.button>
          </motion.div>

          {/* Results Info */}
          <div className="mb-8 flex items-center justify-between">
             <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">
               Mostrando <span className="text-primary-black text-base ml-1">{properties.length}</span> resultados
             </p>
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ordernar:</span>
               <select className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer text-primary-black">
                 <option>Mais recentes</option>
                 <option>Menor preço</option>
                 <option>Maior preço</option>
               </select>
             </div>
          </div>

          {loading ? (
            <div className="py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <SkeletonCard key={n} />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center max-w-md mx-auto"
            >
               <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-gray-100 flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <Search size={40} className="text-gold" />
               </div>
               <h3 className="text-3xl font-display font-bold text-primary-black mb-3 tracking-tight">Nenhum imóvel encontrado</h3>
               <p className="text-gray-400 font-medium mb-10 leading-relaxed text-sm">Tente ajustar seus filtros para encontrar o que procura ou fale com um de nossos especialistas.</p>
               <button 
                  onClick={() => fetchProperties({ businessType: 'Venda', propertyType: '', city: '', minPrice: '', maxPrice: '', bedrooms: '' })} 
                  className="btn-outline-gold !rounded-2xl !py-4 !px-8 hover:!bg-gold hover:!text-primary-black transition-all"
                >
                  Limpar Todos os Filtros
                </button>
            </motion.div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-24"
            >
              <AnimatePresence mode="popLayout">
                {properties.map((property, idx) => (
                  <PropertyCard key={property.id} property={property} index={idx} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Advanced Filters Sider */}
        <AnimatePresence>
          {showFilters && (
            <div className="fixed inset-0 z-[100] overflow-hidden">
              <motion.div 
                {...fadeIn}
                onClick={() => setShowFilters(false)}
                className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ x: '100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col"
              >
                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-gold uppercase tracking-[0.3em] mb-1">Personalize sua busca</p>
                     <h3 className="text-3xl font-display font-bold text-primary-black tracking-tight">Filtros Avançados</h3>
                  </div>
                  <button 
                    onClick={() => setShowFilters(false)} 
                    className="w-14 h-14 flex items-center justify-center bg-gray-50 text-gray-400 rounded-2xl hover:bg-primary-black hover:text-white transition-all transform hover:rotate-90 duration-500"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto p-10 space-y-12">
                  <div className="space-y-5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo de Negócio</label>
                     <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                       {(options.tiposNegocio || []).filter(o => o.ativo).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).slice(0, 2).map(o => (
                         <button 
                           key={o.id}
                           onClick={() => setSearchFilters({...searchFilters, businessType: o.nome})}
                           className={`py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchFilters.businessType === o.nome ? 'bg-white text-primary-black shadow-xl' : 'text-gray-400 hover:text-primary-black'}`}
                         >
                           {o.nome === 'Venda' ? 'Comprar' : o.nome === 'Locação' ? 'Alugar' : o.nome}
                         </button>
                       ))}
                     </div>
                  </div>

                  <div className="space-y-5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Faixa de Preço (R$)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-gold">R$</span>
                        <input 
                          type="number" placeholder="Mínimo" className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-12 pr-6 text-sm font-bold focus:ring-2 focus:ring-gold/20 outline-none transition-all placeholder:text-gray-300"
                          value={searchFilters.minPrice}
                          onChange={(e) => setSearchFilters({...searchFilters, minPrice: e.target.value})}
                        />
                      </div>
                      <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-gold">R$</span>
                        <input 
                          type="number" placeholder="Máximo" className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-12 pr-6 text-sm font-bold focus:ring-2 focus:ring-gold/20 outline-none transition-all placeholder:text-gray-300"
                          value={searchFilters.maxPrice}
                          onChange={(e) => setSearchFilters({...searchFilters, maxPrice: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Dormitórios (Mínimo)</label>
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button 
                          key={n}
                          onClick={() => setSearchFilters({...searchFilters, bedrooms: n.toString()})}
                          className={`w-14 h-14 flex items-center justify-center rounded-2xl text-[11px] font-black transition-all border ${searchFilters.bedrooms === n.toString() ? 'bg-primary-black text-white border-primary-black shadow-xl ring-4 ring-primary-black/10' : 'bg-white border-gray-100 text-gray-400 hover:border-gold/50'}`}
                        >
                          {n}+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-gray-50 border-t border-gray-100 space-y-4">
                  <button 
                    onClick={() => {
                      setSearchFilters({ businessType: 'Venda', propertyType: '', city: '', minPrice: '', maxPrice: '', bedrooms: '' });
                    }}
                    className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Resetar Filtros
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      fetchProperties(searchFilters);
                      setShowFilters(false);
                    }}
                    className="w-full btn-gold !py-5 shadow-2xl shadow-gold/30 !text-[11px] font-black uppercase tracking-[0.2em] !rounded-2xl"
                  >
                    Visualizar Resultados
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

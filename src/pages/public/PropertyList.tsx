import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, MapPin, Bed, Car, MessageCircle, Filter, X, Sparkles, Layers, Bath, Maximize, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, useOptions } from '../../hooks/useSettings';
import PageWrapper from '../../components/PageWrapper';
import { SafeImage } from '../../components/ui/SafeImage';
import { formatCurrency, isValidPublicProperty, cleanPhoneForWhatsapp, getSafeImageUrl, isImovelAlugado } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';
import { GoldenParticles } from '../../components/three/GoldenParticles';
import { Canvas } from '@react-three/fiber';

const PropertyCard = ({ property, index, agencyWhatsApp }: any) => {
  const { settings } = useSettings();

  const mainImageUnwrapped = React.useMemo(() => {
    const imgs = property?.images || property?.imagens || [];
    const mainUrl = typeof property?.mainImage === 'string' ? property?.mainImage : property?.mainImage?.url;
    if (!mainUrl) return { url: '', aplicarMarcaDagua: false };
    const match = imgs.find((img: any) => (typeof img === 'string' ? img : img.url) === mainUrl);
    if (match) {
      const isString = typeof match === 'string';
      const aplicar = isString ? true : (match.aplicarMarcaDagua !== false);
      return { url: isString ? match : match.url, aplicarMarcaDagua: aplicar };
    }
    return { url: mainUrl, aplicarMarcaDagua: true };
  }, [property]);

  const getWhatsAppUrl = () => {
    const rawPhone = property.brokerWhatsapp || agencyWhatsApp;
    const cleanNumber = cleanPhoneForWhatsapp(rawPhone || '554188364069');
    // Prefix 55 if not already present
    const p = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = `Olá, tenho interesse neste imóvel: ${property.title} - Código: ${property.code}. Pode me passar mais informações?`;
    return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  };

  return (
    <motion.div
      variants={fadeIn}
      whileHover={{ y: -8 }}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full"
    >
      <Link to={`/imovel/:id`.replace(':id', property.id)} className="block relative h-64 overflow-hidden">
        <SafeImage
          src={getSafeImageUrl(property.mainImage)}
          alt={property.title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
        
        {mainImageUnwrapped.aplicarMarcaDagua && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 select-none">
            <img 
              src={settings?.empresa?.marcaDaguaUrl || settings?.empresa?.logoCabecalhoUrl || settings?.aparencia?.logoUrl || '/watermark.png'} 
              alt="Watermark" 
              className="w-[45%] max-w-[120px] opacity-[0.09] object-contain select-none pointer-events-none"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="flex flex-wrap gap-2">
            <span className="bg-primary-black/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
              {property.businessType}
            </span>
            {isImovelAlugado(property) && (
              <span className="bg-primary-black border border-gold text-gold text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg">
                JÁ ALUGADO
              </span>
            )}
            {property.destaque && (
              <span className="bg-gold text-primary-black text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg border border-gold/20">
                Destaque
              </span>
            )}
          </div>
        </div>

        {/* Property Type Badge */}
        <div className="absolute bottom-4 right-4 z-10">
          <span className="bg-white/90 backdrop-blur-md text-primary-black text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
            {property.propertyType}
          </span>
        </div>
      </Link>
      
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-gold">
            <MapPin size={14} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[180px]">
              {property.neighborhood}, {property.city}
            </span>
          </div>
          <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase">
            CÓD: {property.code}
          </span>
        </div>
        
        <Link to={`/imovel/${property.id}`}>
          <h3 className="font-display text-xl font-bold text-primary-black group-hover:text-gold transition-colors leading-tight line-clamp-2 mb-4 h-12">
            {property.title}
          </h3>
        </Link>
        
        <div className="mb-6 bg-gray-50/50 rounded-2xl p-4 border border-gray-50">
          {isImovelAlugado(property) ? (
            property.businessType === 'Venda e Locação' && property.priceVenda ? (
              <div>
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                  Disponível para Venda
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-primary-green">
                    {formatCurrency(property.priceVenda)}
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 mt-1 leading-tight">Imóvel alugado atualmente, disponível para venda</p>
              </div>
            ) : (
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Status
                </p>
                <span className="text-lg font-display font-black text-primary-black uppercase tracking-wide">
                  Já alugado
                </span>
              </div>
            )
          ) : (
            <>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                 Valor de {property.businessType === 'Locação' ? 'Locação' : 'Investimento'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display font-black text-primary-green">
                  {formatCurrency(property.businessType === 'Locação' ? property.priceLocacao : property.priceVenda)}
                </span>
                {property.businessType === 'Locação' && (
                  <span className="text-xs font-bold text-gray-400">/mês</span>
                )}
              </div>
              {(property.condoFee > 0 || property.iptu > 0) && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                   {property.condoFee > 0 && (
                     <p className="text-[9px] font-bold text-gray-400">Cond: {formatCurrency(property.condoFee)}</p>
                   )}
                   {property.iptu > 0 && (
                     <p className="text-[9px] font-bold text-gray-400">IPTU: {formatCurrency(property.iptu)}</p>
                   )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6 h-12">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all">
            <Bed size={14} className="text-primary-black mb-1" />
            <span className="text-[10px] font-black text-primary-black">{property.bedrooms || 0}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all">
            <Bath size={14} className="text-primary-black mb-1" />
            <span className="text-[10px] font-black text-primary-black">{property.bathrooms || 0}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all">
            <Car size={14} className="text-primary-black mb-1" />
            <span className="text-[10px] font-black text-primary-black">{property.garageSpaces || 0}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all">
            <Maximize size={14} className="text-primary-black mb-1" />
            <span className="text-[10px] font-black text-primary-black">{property.usefulArea || 0}m²</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to={`/imovel/${property.id}`} 
            className="flex-grow py-3 px-4 bg-primary-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold hover:text-primary-black transition-all text-center shadow-lg shadow-black/5"
          >
            Ver Detalhes
          </Link>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center group/wa"
          >
            <MessageCircle size={18} className="group-hover/wa:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 flex flex-col h-full animate-pulse shadow-sm">
    <div className="h-64 bg-gray-100" />
    <div className="p-8 space-y-4 flex-grow">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
        <div className="h-3 bg-gray-50 rounded-lg w-1/4" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl w-full" />
      <div className="h-20 bg-gray-50 rounded-2xl w-full" />
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-50 rounded-lg" />)}
      </div>
      <div className="h-12 bg-gray-100 rounded-xl w-full mt-4" />
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
  const [sortBy, setSortBy] = useState('recentes');

  // Search Filters
  const [searchFilters, setSearchFilters] = useState<any>({
    businessType: 'Venda',
    propertyType: '',
    city: '',
    neighborhood: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    garageSpaces: '',
    minArea: '',
    maxArea: '',
    destaque: false,
    leaseFilterStatus: 'disponiveis'
  });

  useEffect(() => {
    // Parse URL params
    const params = new URLSearchParams(location.search);
    const initialFilters = {
      businessType: params.get('businessType') || 'Venda',
      propertyType: params.get('propertyType') || '',
      city: params.get('city') || '',
      neighborhood: params.get('neighborhood') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      bedrooms: params.get('bedrooms') || '',
      bathrooms: params.get('bathrooms') || '',
      garageSpaces: params.get('garageSpaces') || '',
      minArea: params.get('minArea') || '',
      maxArea: params.get('maxArea') || '',
      destaque: params.get('destaque') === 'true',
      leaseFilterStatus: params.get('leaseFilterStatus') || 'disponiveis'
    };
    setSearchFilters(initialFilters);
    fetchProperties(initialFilters);
  }, [location.search]);

  const fetchProperties = async (filters: any) => {
    setLoading(true);
    try {
      // Normalization as requested
      const normalize = (v: string) => v?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
      const normalizedBType = normalize(filters.businessType);

      // Fetch a broader set of published properties to allow complex filtering in JS
      // This prevents "ghost properties" and ensures refresh consistency
      // Using a wider status list to catch any variant including lowercase and untyped
      // Note: "publicado" must be true for the query to pass rules for unauthenticated users
      const q = query(
        collection(db, 'imoveis'), 
        where('publicado', '==', true)
      );

      const snap = await getDocs(q);
      const rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // Debug as requested by user
      const validData = rawData.filter(isValidPublicProperty);
      const invalidData = rawData.filter(p => !isValidPublicProperty(p));

      // Extra check: if no properties are found but we have raw data, maybe status naming is mismatching
      if (validData.length === 0 && rawData.length > 0) {
        console.warn("ALERTA: Imóveis encontrados no DB, mas nenhum passou na validação pública.", {
          rawCount: rawData.length,
          statusExemplos: rawData.slice(0, 3).map(p => p.status),
          publicadoExemplos: rawData.slice(0, 3).map(p => p.publicado)
        });
      }

      console.group("DEBUG: Carregamento de Imóveis Público");
      console.log("Variáveis de ambiente:", {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
      });
      console.log("Recebidos do Firestore (Total):", rawData.length, rawData);
      console.log("Válidos (Exibindo):", validData.length, validData);
      console.log("Inválidos (Removidos pela validação):", invalidData.length, invalidData);
      console.groupEnd();

      let data = validData;

      // 2. Business Type Filter
      if (normalizedBType === 'venda' || normalizedBType === 'comprar') {
        data = data.filter((p: any) => p.businessType === 'Venda' || p.businessType === 'Venda e Locação');
      } else if (normalizedBType === 'locacao' || normalizedBType === 'alugar' || normalizedBType === 'aluguel') {
        data = data.filter((p: any) => p.businessType === 'Locação' || p.businessType === 'Venda e Locação');
      } else if (normalizedBType === 'venda_locacao' || normalizedBType === 'venda e locacao') {
        data = data.filter((p: any) => p.businessType === 'Venda e Locação');
      }

      // Filter by lease/rental status (Disponíveis, Alugados, Todos)
      const leaseFilter = filters.leaseFilterStatus || 'disponiveis';
      if (leaseFilter === 'alugados') {
        data = data.filter((p: any) => isImovelAlugado(p));
      } else if (leaseFilter === 'todos') {
        // Keep both
      } else {
        // default to "disponiveis"
        data = data.filter((p: any) => !isImovelAlugado(p));
      }

      // 3. Other Filters
      if (filters.propertyType) {
        data = data.filter((p: any) => p.propertyType === filters.propertyType);
      }
      if (filters.city) {
        data = data.filter((p: any) => p.city?.toLowerCase().includes(filters.city.toLowerCase()));
      }
      if (filters.neighborhood) {
        data = data.filter((p: any) => p.neighborhood?.toLowerCase() === filters.neighborhood.toLowerCase());
      }
      
      const priceField = (normalizedBType === 'locacao' || normalizedBType === 'alugar' || normalizedBType === 'aluguel') ? 'priceLocacao' : 'priceVenda';
      
      if (filters.minPrice) {
        data = data.filter((p: any) => (p[priceField] || 0) >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        data = data.filter((p: any) => (p[priceField] || 0) <= parseFloat(filters.maxPrice));
      }
      if (filters.bedrooms) {
        data = data.filter((p: any) => (p.bedrooms || 0) >= parseInt(filters.bedrooms));
      }
      if (filters.bathrooms) {
        data = data.filter((p: any) => (p.bathrooms || 0) >= parseInt(filters.bathrooms));
      }
      if (filters.garageSpaces) {
        data = data.filter((p: any) => (p.garageSpaces || 0) >= parseInt(filters.garageSpaces));
      }
      if (filters.minArea) {
        data = data.filter((p: any) => (p.usefulArea || p.totalArea || 0) >= parseFloat(filters.minArea));
      }
      if (filters.maxArea) {
        data = data.filter((p: any) => (p.usefulArea || p.totalArea || 0) <= parseFloat(filters.maxArea));
      }
      if (filters.destaque === true) {
        data = data.filter((p: any) => p.destaque === true);
      }

      setProperties(data);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    if (sortBy === 'recentes') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    if (sortBy === 'antigos') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    
    // Choose price field based on current business type search
    const isLocacao = searchFilters.businessType === 'Locação' || searchFilters.businessType === 'Alugar';
    const priceA = isLocacao ? (a.priceLocacao || 0) : (a.priceVenda || 0);
    const priceB = isLocacao ? (b.priceLocacao || 0) : (b.priceVenda || 0);
    
    if (sortBy === 'menor-preco') return priceA - priceB;
    if (sortBy === 'maior-preco') return priceB - priceA;
    if (sortBy === 'destaque') return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
    
    return 0;
  });

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
          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center md:text-left">
            <motion.div variants={staggerContainer} initial="initial" animate="animate">
              <span className="text-gold font-black uppercase text-[10px] tracking-[0.4em] mb-4 block">Nossas Oportunidades</span>
              <motion.h1 variants={slideUp} className="font-display text-4xl md:text-6xl font-black mb-6 leading-tight">
                {settings.secoes.imoveisDestaque.titulo?.split(' ')[0]} <span className="text-gold">{settings.secoes.imoveisDestaque.titulo?.split(' ').slice(1).join(' ')}</span>
              </motion.h1>
              <motion.p variants={slideUp} className="text-emerald-100 font-medium opacity-80 text-lg max-w-2xl mx-auto md:mx-0">
                {settings.secoes.imoveisDestaque.subtitulo}
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
            className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 mb-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* City & Neighborhood */}
              <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 group focus-within:border-gold/50 transition-colors">
                  <Search size={18} className="text-gray-400 group-focus-within:text-gold" />
                  <input 
                    type="text" 
                    placeholder="Cidade..." 
                    className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:text-gray-400"
                    value={searchFilters.city}
                    onChange={(e) => setSearchFilters({...searchFilters, city: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 group focus-within:border-gold/50 transition-colors">
                  <MapPin size={18} className="text-gray-400 group-focus-within:text-gold" />
                  <select 
                    className="bg-transparent border-none outline-none w-full text-sm font-bold cursor-pointer"
                    value={searchFilters.neighborhood}
                    onChange={(e) => setSearchFilters({...searchFilters, neighborhood: e.target.value})}
                  >
                    <option value="">Todos os Bairros</option>
                    {(options.bairros || [])
                      .filter((o: any) => !searchFilters.city || o.cidade?.toLowerCase() === searchFilters.city.toLowerCase())
                      .map((o: any) => (
                        <option key={o.id} value={o.nome}>{o.nome}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Business & Property type - visible on tablets/desktops */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                <select 
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                  value={searchFilters.businessType}
                  onChange={(e) => setSearchFilters({...searchFilters, businessType: e.target.value})}
                >
                   <option value="Venda">Comprar</option>
                   <option value="Locação">Locação</option>
                   <option value="Venda e Locação">Ambos</option>
                </select>
                <select 
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                  value={searchFilters.propertyType}
                  onChange={(e) => setSearchFilters({...searchFilters, propertyType: e.target.value})}
                >
                  <option value="">Tipo</option>
                  {(options.tiposImovel || []).filter(o => o.ativo).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).map(o => (
                    <option key={o.id} value={o.nome}>{o.nome}</option>
                  ))}
                </select>
              </div>

              {/* Price & Search Button */}
              <div className="lg:col-span-3 flex items-center gap-4">
                <div className="flex-grow hidden sm:flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-4 border border-gray-100 group focus-within:border-gold/50 transition-colors">
                  <span className="text-[10px] font-black text-gold">R$</span>
                  <input 
                    type="number" 
                    placeholder="Até..." 
                    className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:text-gray-400"
                    value={searchFilters.maxPrice}
                    onChange={(e) => setSearchFilters({...searchFilters, maxPrice: e.target.value})}
                  />
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchProperties(searchFilters)}
                  className="bg-primary-black text-white p-4 rounded-2xl shadow-xl hover:bg-gold hover:text-primary-black transition-all flex items-center justify-center min-w-[60px]"
                >
                  <Search size={22} strokeWidth={3} />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowFilters(true)}
                  className="w-14 h-14 flex items-center justify-center bg-gold/10 text-gold rounded-2xl hover:bg-gold hover:text-primary-black transition-all"
                >
                  <Filter size={20} />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Results Info */}
          <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-gold" />
               </div>
               <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] leading-none">
                 Mostrando <span className="text-primary-black text-lg ml-1 font-black">{sortedProperties.length}</span> imóveis ativos
               </p>
             </div>
             
             <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordenar:</span>
               <select 
                 className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer text-primary-black"
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value)}
               >
                 <option value="recentes">Mais recentes</option>
                 <option value="menor-preco">Menor preço</option>
                 <option value="maior-preco">Maior preço</option>
                 <option value="destaque">Destaques primeiro</option>
                 <option value="antigos">Mais antigos</option>
               </select>
             </div>
          </div>

          {loading ? (
            <div className="py-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <SkeletonCard key={n} />
              ))}
            </div>
          ) : sortedProperties.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center max-w-md mx-auto"
            >
               <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-gray-100 flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <Search size={40} className="text-gold" />
               </div>
               <h3 className="text-3xl font-display font-bold text-primary-black mb-3 tracking-tight">Nenhum imóvel disponível no momento</h3>
               <p className="text-gray-400 font-medium mb-10 leading-relaxed text-sm">Não encontramos nenhum imóvel publicado que atenda aos critérios. Tente ajustar sua busca ou volte mais tarde.</p>
               <button 
                  onClick={() => {
                    const defaultFilters = { businessType: 'Venda', propertyType: '', city: '', neighborhood: '', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', garageSpaces: '', minArea: '', maxArea: '', destaque: false, leaseFilterStatus: 'disponiveis' };
                    setSearchFilters(defaultFilters);
                    fetchProperties(defaultFilters);
                  }} 
                  className="btn-gold !rounded-2xl !py-4 !px-8 shadow-xl shadow-gold/20"
                >
                  Limpar Todos os Filtros
                </button>
            </motion.div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-24"
            >
              <AnimatePresence mode="popLayout">
                {sortedProperties.map((property, idx) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    index={idx} 
                    agencyWhatsApp={settings.empresa.whatsapp}
                  />
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
                       {[
                         { id: 'venda', nome: 'Venda', label: 'Comprar' },
                         { id: 'locacao', nome: 'Locação', label: 'Locação' },
                         { id: 'venda_locacao', nome: 'Venda e Locação', label: 'Venda e Locação' }
                       ].map((o) => {
                         return (
                           <button 
                             key={o.id}
                             onClick={() => setSearchFilters({...searchFilters, businessType: o.nome})}
                             className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${searchFilters.businessType === o.nome ? 'bg-white text-primary-black shadow-xl' : 'text-gray-400 hover:text-primary-black font-bold'}`}
                           >
                             {o.label}
                           </button>
                         );
                       })}
                     </div>
                  </div>

                  {searchFilters.businessType !== 'Venda' && (
                    <div className="space-y-5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Disponibilidade de Locação</label>
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        {[
                          { id: 'disponiveis', label: 'Disponíveis' },
                          { id: 'alugados', label: 'Alugados' },
                          { id: 'todos', label: 'Todos' }
                        ].map((o) => {
                          const isSelected = searchFilters.leaseFilterStatus === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setSearchFilters({...searchFilters, leaseFilterStatus: o.id})}
                              className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-white text-primary-black shadow-md border border-gray-100 font-black' : 'text-gray-400 hover:text-primary-black font-bold'}`}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estrutura do Imóvel</label>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="space-y-2">
                         <span className="text-[8px] font-bold text-gray-300 uppercase ml-1">Quartos</span>
                         <select 
                           className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 text-xs font-bold outline-none"
                           value={searchFilters.bedrooms}
                           onChange={(e) => setSearchFilters({...searchFilters, bedrooms: e.target.value})}
                         >
                           <option value="">Qualquer</option>
                           <option value="1">1+</option>
                           <option value="2">2+</option>
                           <option value="3">3+</option>
                           <option value="4">4+</option>
                         </select>
                       </div>
                       <div className="space-y-2">
                         <span className="text-[8px] font-bold text-gray-300 uppercase ml-1">Banheiros</span>
                         <select 
                           className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 text-xs font-bold outline-none"
                           value={searchFilters.bathrooms}
                           onChange={(e) => setSearchFilters({...searchFilters, bathrooms: e.target.value})}
                         >
                           <option value="">Qualquer</option>
                           <option value="1">1+</option>
                           <option value="2">2+</option>
                           <option value="3">3+</option>
                         </select>
                       </div>
                       <div className="space-y-2">
                         <span className="text-[8px] font-bold text-gray-300 uppercase ml-1">Vagas</span>
                         <select 
                           className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 text-xs font-bold outline-none"
                           value={searchFilters.garageSpaces}
                           onChange={(e) => setSearchFilters({...searchFilters, garageSpaces: e.target.value})}
                         >
                           <option value="">Qualquer</option>
                           <option value="1">1+</option>
                           <option value="2">2+</option>
                           <option value="3">3+</option>
                         </select>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Área Útil (m²)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="number" placeholder="Mínimo" className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold focus:ring-2 focus:ring-gold/20 outline-none transition-all placeholder:text-gray-300"
                          value={searchFilters.minArea}
                          onChange={(e) => setSearchFilters({...searchFilters, minArea: e.target.value})}
                        />
                        <input 
                          type="number" placeholder="Máximo" className="w-full bg-gray-50 border-none rounded-2xl py-5 px-6 text-sm font-bold focus:ring-2 focus:ring-gold/20 outline-none transition-all placeholder:text-gray-300"
                          value={searchFilters.maxArea}
                          onChange={(e) => setSearchFilters({...searchFilters, maxArea: e.target.value})}
                        />
                    </div>
                  </div>

                  <div className="space-y-5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Destaques</label>
                     <button 
                       onClick={() => setSearchFilters({...searchFilters, destaque: !searchFilters.destaque})}
                       className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${searchFilters.destaque ? 'bg-gold/10 border-gold text-primary-black' : 'bg-white border-gray-100 text-gray-400'}`}
                     >
                        <div className="flex items-center gap-3">
                           <Sparkles size={18} className={searchFilters.destaque ? 'text-gold' : 'text-gray-300'} />
                           <span className="text-xs font-bold uppercase tracking-widest font-black">Apenas Imóveis em Destaque</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${searchFilters.destaque ? 'border-primary-black bg-primary-black' : 'border-gray-200'}`}>
                           {searchFilters.destaque && <Check size={14} className="text-white" />}
                        </div>
                     </button>
                  </div>
                </div>

                <div className="p-10 bg-gray-50 border-t border-gray-100 space-y-4">
                  <button 
                    onClick={() => {
                      setSearchFilters({ 
                        businessType: 'Venda', 
                        propertyType: '', 
                        city: '', 
                        neighborhood: '',
                        minPrice: '', 
                        maxPrice: '', 
                        bedrooms: '',
                        bathrooms: '',
                        garageSpaces: '',
                        minArea: '',
                        maxArea: '',
                        destaque: false
                      });
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

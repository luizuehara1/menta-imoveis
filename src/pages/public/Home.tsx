import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Bed, Car, Check, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import PageWrapper from '../../components/PageWrapper';
import { staggerContainer, slideUp } from '../../constants/animations';
import { PremiumHeroBackground } from '../../components/three/PremiumHeroBackground';
import { LuxuryShapeCanvas } from '../../components/three/AbstractLuxuryShape';
import { useSettings, useOptions } from '../../hooks/useSettings';
import { DEFAULT_SITE_CONFIG } from '../../constants/defaultSettings';
import { formatCurrency, isValidPublicProperty, getSafeImageUrl, isImovelAlugado } from '../../lib/utils';

import { SafeImage } from '../../components/ui/SafeImage';

const Hero = ({ settings }: { settings: any }) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-full h-full"
        >
          <SafeImage
            src={getSafeImageUrl(settings.hero.imagemFundoUrl, "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=2000")}
            alt="Imóvel de Luxo"
            className="w-full h-full"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary-black/90 via-primary-black/40 to-primary-black" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-primary-black/60" />
      </div>

      {/* Three.js Layer (Overlay) - Only on Desktop for performance */}
      {settings.hero.ativarThreeJs && typeof window !== 'undefined' && window.innerWidth >= 1024 && (
        <PremiumHeroBackground />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full pt-20">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <motion.span 
            variants={slideUp}
            className="inline-block px-5 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold font-bold tracking-[0.3em] uppercase text-[10px] mb-8"
          >
            {settings.hero.heroBadge || "Luxo & Exclusividade em Santa Catarina"}
          </motion.span>
          
          <motion.h1 
            variants={slideUp}
            className="font-display text-6xl md:text-8xl font-bold text-white mb-8 leading-[0.9] tracking-tighter"
          >
            {settings.hero.tituloPrincipal}
          </motion.h1>
          
          <motion.p 
            variants={slideUp}
            className="text-gray-300 text-lg md:text-xl mb-12 leading-relaxed max-w-2xl mx-auto font-light"
          >
            {settings.hero.subtitulo}
          </motion.p>
          
          <motion.div 
            variants={slideUp}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(settings.hero.linkBotaoPrincipal)}
              className="btn-gold !px-10 !py-5 text-base group shadow-[0_20px_50px_rgba(229,188,83,0.3)]"
            >
              {settings.hero.textoBotaoPrincipal}
              <Search size={20} className="transition-transform group-hover:rotate-12" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,1)", color: "#000" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(settings.hero.linkBotaoSecundario)}
              className="btn-outline-gold !border-white/20 !text-white !px-10 !py-5 text-base"
            >
              {settings.hero.textoBotaoSecundario}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
      >
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1"
        >
          <div className="w-1 h-2 bg-gold rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

const SearchSection = ({ options }: { options: any }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    businessType: 'venda',
    propertyType: '',
    city: '',
    neighborhood: '',
    maxPrice: '',
  });

  const normalizeText = (value: any) => {
    return value
      ?.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const handleSearch = () => {
    const queryParams = new URLSearchParams();
    
    // Use normalization for businessType
    let bType = filters.businessType;
    const normalized = normalizeText(bType);
    
    if (normalized === 'alugar' || normalized === 'locacao' || normalized === 'aluguel') {
      bType = 'Locação';
    } else if (normalized === 'venda' || normalized === 'comprar') {
      bType = 'Venda';
    } else if (normalized === 'venda_locacao' || normalized === 'venda e locacao') {
      bType = 'Venda e Locação';
    }

    if (bType) queryParams.set('businessType', bType);
    if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);
    if (filters.city) queryParams.set('city', filters.city);
    if (filters.neighborhood) queryParams.set('neighborhood', filters.neighborhood);
    if (filters.maxPrice) queryParams.set('maxPrice', filters.maxPrice);
    
    navigate(`/imoveis?${queryParams.toString()}`);
  };

  const businessTypes = (options.tiposNegocio || []).filter((o: any) => o.ativo);
  const propertyTypes = (options.tiposImovel || []).filter((o: any) => o.ativo);
  const cities = (options.cidades || []).filter((o: any) => o.ativo);
  const neighborhoods = (options.bairros || []).filter((o: any) => o.ativo);
  
  // Filter price ranges based on selected business type
  const priceRanges = (options.faixasPreco || [])
    .filter((o: any) => o.ativo)
    .filter((o: any) => {
      if (o.valor === 0) return true; // Sem limite
      const normalizedBType = normalizeText(filters.businessType);
      if (normalizedBType === 'locacao' || normalizedBType === 'alugar') {
        return o.tipo === 'locacao';
      }
      return o.tipo === 'venda' || !o.tipo; // Default to venda if no type specified
    });

  return (
    <section className="relative z-30 -mt-24 max-w-6xl mx-auto px-6">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] p-10 border border-white/20">
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
           {['venda', 'locacao', 'venda_locacao'].map((val) => {
             const label = val === 'locacao' ? 'Locação' : 
                          val === 'venda' ? 'Comprar' : 
                          'Venda e Locação';
             
             // Check if this type exists in options or just use common ones
             return (
               <button
                 key={val}
                 onClick={() => setFilters({...filters, businessType: val, maxPrice: ''})}
                 className={`px-4 sm:px-8 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                   filters.businessType === val 
                   ? 'bg-primary-black text-white shadow-xl scale-105' 
                   : 'bg-gray-50 text-gray-400 hover:bg-gray-100 font-bold'
                 }`}
               >
                 {label}
               </button>
             );
           })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
              O que você busca?
            </label>
            <select 
              className="input-field !bg-gray-50/50"
              value={filters.propertyType}
              onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
            >
              <option value="">Tipo de Imóvel</option>
              {propertyTypes.map((t: any) => (
                <option key={t.id} value={t.valor}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
              Localização
            </label>
            <div className="relative">
              <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold" />
              <select 
                className="input-field !bg-gray-50/50 !pl-14"
                value={filters.city}
                onChange={(e) => setFilters({...filters, city: e.target.value})}
              >
                <option value="">Localização</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.valor}>{c.nome}</option>
                ))}
                {neighborhoods.map((n: any) => (
                  <option key={n.id} value={n.valor}>{n.nome} - {n.cidade}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
              Preço Máximo
            </label>
            <select 
              className="input-field !bg-gray-50/50"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
            >
              <option value="">Preço Máximo</option>
              {priceRanges.map((p: any) => (
                <option key={p.id} value={p.valor}>{p.nome}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSearch}
            className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !py-4 shadow-2xl transition-all"
          >
            <Search size={22} />
            <span className="uppercase text-sm tracking-widest">Buscar Agora</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  const { settings, loading: settingsLoading } = useSettings();
  const { options, loading: optionsLoading } = useOptions();
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [fetchingProperties, setFetchingProperties] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  // Safety timer to force clear initial loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsLoading && !optionsLoading) {
      setInitialLoading(false);
    }
  }, [settingsLoading, optionsLoading]);

  useEffect(() => {
    const fetchFeatured = async () => {
      setFetchingProperties(true);
      try {
        console.log("[Home] Buscando imóveis em destaque...");
        const q = query(
          collection(db, 'imoveis'), 
          where('publicado', '==', true),
          where('destaque', '==', true),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const filtered = data.filter(isValidPublicProperty).slice(0, 3);
        setFeaturedProperties(filtered);
      } catch (error) {
        console.error("[Home] Erro ao buscar imóveis em destaque:", error);
        setFeaturedProperties([]);
      } finally {
        setFetchingProperties(false);
      }
    };

    if (!initialLoading) {
      fetchFeatured();
    }
  }, [initialLoading]);

  // Use local fallback if settings is empty for some reason (rare but possible after timeout)
  const homeSettings = settings || DEFAULT_SITE_CONFIG;

  return (
    <PageWrapper>
      <div className="bg-white">
        <Hero settings={homeSettings} />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <SearchSection options={options} />
        </motion.div>
        
        <section className="py-24 max-w-7xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
          >
            <div>
              <span className="text-gold font-bold uppercase tracking-widest text-xs mb-2 block">Destaques da semana</span>
              <h2 className="section-title">
                {homeSettings.secoes.imoveisDestaque.titulo.split(' ')[0]} <span className="text-gold">{homeSettings.secoes.imoveisDestaque.titulo.split(' ').slice(1).join(' ')}</span>
              </h2>
              <p className="text-gray-500 max-w-lg mt-2">{homeSettings.secoes.imoveisDestaque.subtitulo}</p>
            </div>
            <button onClick={() => navigate('/imoveis')} className="text-primary-gray font-bold border-b-2 border-gold pb-1 hover:text-gold transition-colors">
              Ver catálogo completo
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {fetchingProperties ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-2xl" />
              ))
            ) : featuredProperties.length > 0 ? (
              featuredProperties.map((property, idx) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -12 }}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-500"
                >
                  <Link to={`/imovel/${property.id}`} className="block relative h-64 overflow-hidden">
                    <SafeImage
                      src={property.mainImage}
                      alt={property.title}
                      className="w-full h-full transition-transform duration-1000 group-hover:scale-110"
                    />
                    {(() => {
                      const imgs = property.images || property.imagens || [];
                      const mainUrl = typeof property.mainImage === 'string' ? property.mainImage : property.mainImage?.url;
                      if (!mainUrl) return null;
                      const match = imgs.find((img: any) => (typeof img === 'string' ? img : img.url) === mainUrl);
                      const unwrapped = match ? (typeof match === 'string' ? { url: match, aplicarMarcaDagua: true } : match) : { url: mainUrl, aplicarMarcaDagua: true };
                      if (unwrapped.aplicarMarcaDagua !== false) {
                        return (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 select-none">
                            <img 
                              src={homeSettings?.empresa?.marcaDaguaUrl || homeSettings?.empresa?.logoCabecalhoUrl || homeSettings?.aparencia?.logoUrl || '/watermark.png'} 
                              alt="Watermark" 
                              className="w-[45%] max-w-[120px] opacity-[0.09] object-contain select-none pointer-events-none"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      <div className="bg-primary-black/80 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full backdrop-blur-md self-start">
                        {property.businessType}
                      </div>
                      {isImovelAlugado(property) && (
                        <div className="bg-primary-black border border-gold text-gold text-[10px] font-black uppercase px-3 py-1 rounded-full backdrop-blur-sm shadow-xl self-start">
                          JÁ ALUGADO
                        </div>
                      )}
                      {!isImovelAlugado(property) && (property.valorMetroQuadrado > 0 || property.valorMetroQuadradoLocacao > 0) && (
                        <div className="bg-gold text-primary-black text-[9px] font-black uppercase px-3 py-1 rounded-full backdrop-blur-md shadow-lg border border-gold/20 self-start">
                          {property.businessType === 'Locação' 
                            ? `${formatCurrency(property.valorMetroQuadradoLocacao)}/m²`
                            : `${formatCurrency(property.valorMetroQuadrado)}/m²`
                          }
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/95 text-primary-black text-xs font-bold px-4 py-2.5 rounded-lg backdrop-blur-md shadow-lg border border-gold/20 z-10 max-w-[85%]">
                      {isImovelAlugado(property) ? (
                        property.businessType === 'Venda e Locação' && property.priceVenda ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 font-extrabold uppercase text-[9px] block">Venda: {formatCurrency(property.priceVenda)}</span>
                            <span className="text-gray-500 text-[8px] leading-tight block">Imóvel alugado atualmente, disponível para venda</span>
                          </div>
                        ) : (
                          <span className="text-primary-black font-extrabold uppercase tracking-wide text-[10px]">Já alugado</span>
                        )
                      ) : (
                        <div>
                          {formatCurrency(property.businessType === 'Locação' ? property.priceLocacao : property.priceVenda)}
                          {property.businessType === 'Locação' && ' / mês'}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      <MapPin size={12} className="text-gold" />
                      <span>{property.neighborhood}, {property.city}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-primary-black mb-4 group-hover:text-gold transition-colors leading-tight line-clamp-2">
                      {property.title}
                    </h3>
                    <div className="flex items-center justify-between py-4 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 transition-colors group-hover:text-gold">
                        <Bed size={16} />
                        <span className="text-xs font-bold uppercase tracking-tighter">{property.bedrooms} Dorms</span>
                      </div>
                      <div className="flex items-center gap-1.5 transition-colors group-hover:text-gold">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-tighter">{property.suites} Suítes</span>
                      </div>
                      <div className="flex items-center gap-1.5 transition-colors group-hover:text-gold">
                        <Car size={16} />
                        <span className="text-xs font-bold uppercase tracking-tighter">{property.garageSpaces} Vagas</span>
                      </div>
                    </div>
                    <Link to={`/imovel/${property.id}`} className="w-full mt-2 block text-center btn-gold !py-3 !text-xs !bg-transparent !text-primary-black !border !border-gold/30 hover:!bg-gold hover:!text-primary-black !rounded-xl">
                      Ver Detalhes
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400">
                Nenhum imóvel em destaque no momento.
              </div>
            )}
          </div>
        </section>

        <section className="bg-primary-green py-32 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gold/5 blur-[120px] rounded-full -translate-y-1/2" />
          
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-20 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -top-20 -left-20 opacity-20 pointer-events-none hidden lg:block">
                <LuxuryShapeCanvas size={1.2} color="#E5BC53" />
              </div>
              <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Institucional</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 leading-[1.1] tracking-tighter">
                {homeSettings.secoes.sobre.titulo.split(' ').slice(0, -1).join(' ')} <span className="text-gold font-light italic">{homeSettings.secoes.sobre.titulo.split(' ').slice(-1)}</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed font-light">
                {homeSettings.secoes.sobre.texto}
              </p>
              <div className="space-y-5">
                {[
                  'Consultoria especializada em investimentos imobiliários',
                  'Ampla carteira de imóveis de alto padrão',
                  'Assessoria jurídica completa para sua segurança',
                  'Atendimento focado em resultados e satisfação'
                ].map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <Check size={16} className="text-gold" />
                    </div>
                    <span className="font-medium text-gray-200">{item}</span>
                  </motion.div>
                ))}
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="mt-12 btn-gold !rounded-2xl shadow-xl shadow-gold/5"
              >
                Conheça nossa história
              </motion.button>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6 pt-12"
              >
                <div className="overflow-hidden rounded-[2rem] border border-white/10 h-80">
                   <SafeImage 
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600" 
                    className="w-full h-full" 
                    alt="Luxo" 
                  />
                </div>
                <div className="bg-white/5 p-10 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <h3 className="font-display text-5xl font-bold text-gold mb-2 tracking-tighter">+100</h3>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Imóveis Exclusivos</p>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: -40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="bg-white/5 p-10 rounded-[2rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <h3 className="font-display text-5xl font-bold text-gold mb-2 tracking-tighter">15</h3>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Anos de Experiência</p>
                </div>
                <div className="overflow-hidden rounded-[2rem] border border-white/10 h-80">
                   <SafeImage 
                    src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&q=80&w=600" 
                    className="w-full h-full" 
                    alt="Luxo" 
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

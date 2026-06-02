import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, MapPin, Bed, Car, MessageCircle, Filter, X, Sparkles, Layers, Bath, Maximize, Check, Armchair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, useOptions } from '../../hooks/useSettings';
import PageWrapper from '../../components/PageWrapper';
import { SafeImage } from '../../components/ui/SafeImage';
import { formatCurrency, isValidPublicProperty, isMockProperty, cleanPhoneForWhatsapp, getSafeImageUrl, isImovelAlugado, matchesQuickSearch, normalizeText, buildPropertyWhatsAppMessage, getIptuValue, getValorTotalMensal, getValorMensal, getCardStats } from '../../lib/utils';
import { PropertyPriceBadge } from '../../components/public/PropertyPriceBadge';
import { PropertyCardCosts } from '../../components/public/PropertyCardCosts';
import { useSEO } from '../../hooks/useSEO';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';
import { GoldenParticles } from '../../components/three/GoldenParticles';
import { Canvas } from '@react-three/fiber';

function isImovelPublico(imovel: any) {
  if (!imovel?.id) return false;
  if (isMockProperty(imovel)) return false;
  return (
    imovel?.excluido !== true &&
    (
      imovel?.publicadoNoSite === true ||
      imovel?.publicado === true ||
      imovel?.ativo === true
    )
  );
}

function normalizeTipoNegocio(tipo: any): "Venda" | "Locação" | "Venda e Locação" | "" {
  const value = String(tipo || "").toLowerCase();

  if (
    (value.includes("venda") && value.includes("loca")) ||
    value.includes("ambos") ||
    value.includes("venda_locacao")
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

function getImagemPrincipal(imovel: any): string {
  if (!imovel) return "/placeholder-imovel.png";
  if (imovel.imagemPrincipal) return imovel.imagemPrincipal;
  if (imovel.mainImage) return imovel.mainImage;

  const imagensList = imovel.imagens || imovel.images;
  if (Array.isArray(imagensList) && imagensList.length > 0) {
    const primeira = imagensList[0];

    if (typeof primeira === "string") return primeira;
    if (primeira?.url) return primeira.url;
  }

  return "/placeholder-imovel.png";
}

const PropertyCard = ({ property, index, agencyWhatsApp }: any) => {
  const { settings } = useSettings();
  const [resolvedPhone, setResolvedPhone] = useState<string>("");

  useEffect(() => {
    const fetchAndResolve = async () => {
      // 1. imovel.corretorResponsavel.whatsapp
      if (property.corretorResponsavel?.whatsapp) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.corretorResponsavel.whatsapp));
        return;
      }
      // 2. imovel.corretorResponsavel.telefone
      if (property.corretorResponsavel?.telefone) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.corretorResponsavel.telefone));
        return;
      }

      // 3. corretor em corretores/{id}
      const brokerId = property.brokerId || property.corretorId || property.corretorResponsavel?.id || property.broker?.id;
      if (brokerId) {
        try {
          const brokerRef = doc(db, 'corretores', brokerId);
          const brokerSnap = await getDoc(brokerRef);
          if (brokerSnap.exists()) {
            const brokerData = brokerSnap.data();
            if (brokerData) {
              const bPhone = brokerData.whatsapp || brokerData.phone || brokerData.telefone;
              if (bPhone) {
                setResolvedPhone(cleanPhoneForWhatsapp(bPhone));
                return;
              }
            }
          }
        } catch (e) {
          console.error("Error fetching broker from card:", e);
        }
      }

      // 4. imovel.corretorWhatsapp / brokerWhatsapp / etc.
      if (property.corretorWhatsapp) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.corretorWhatsapp));
        return;
      }
      if (property.corretorTelefone) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.corretorTelefone));
        return;
      }
      if (property.brokerWhatsapp) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.brokerWhatsapp));
        return;
      }
      if (property.brokerPhone) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.brokerPhone));
        return;
      }
      if (property.broker?.whatsapp) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.broker.whatsapp));
        return;
      }
      if (property.broker?.telefone) {
        setResolvedPhone(cleanPhoneForWhatsapp(property.broker.telefone));
        return;
      }

      // 5. WhatsApp da empresa nas configurações do site (or agencyWhatsApp if defined)
      const fallback = agencyWhatsApp || settings?.empresa?.whatsapp || "554188364069";
      setResolvedPhone(cleanPhoneForWhatsapp(fallback));
    };

    fetchAndResolve();
  }, [property, agencyWhatsApp, settings]);

  const mainImageUnwrapped = React.useMemo(() => {
    const imgs = property?.images || property?.imagens || [];
    const mainUrl = getImagemPrincipal(property);
    if (!mainUrl || mainUrl === '/placeholder-imovel.png') return { url: '/placeholder-imovel.png', aplicarMarcaDagua: false };
    const match = imgs.find((img: any) => (typeof img === 'string' ? img : img.url) === mainUrl);
    if (match) {
      const isString = typeof match === 'string';
      const aplicar = isString ? true : (match.aplicarMarcaDagua !== false);
      return { url: isString ? match : match.url, aplicarMarcaDagua: aplicar };
    }
    return { url: mainUrl, aplicarMarcaDagua: true };
  }, [property]);

  const getWhatsAppUrl = () => {
    const rawPhone = resolvedPhone || property.brokerWhatsapp || agencyWhatsApp || settings?.empresa?.whatsapp || "554188364069";
    const cleanNumber = cleanPhoneForWhatsapp(rawPhone);
    // Prefix 55 if not already present
    const p = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = buildPropertyWhatsAppMessage(property);
    return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  };

  const displayBairro = property.bairro || property.neighborhood || "";
  const displayCidade = property.cidade || property.city || "";
  const displayLocation = displayBairro && displayCidade ? `${displayBairro}, ${displayCidade}` : (displayBairro || displayCidade || "Localização não informada");
  const displayCode = property.codigo || property.code || property.codigoImovel || "---";
  const displayTitle = property.titulo || property.title || property.tituloAnuncio || property.nome || property.codigo || property.code || "Imóvel disponível";
  const bizTypeNorm = normalizeTipoNegocio(property.businessType || property.tipoNegocio);

  return (
    <motion.div
      variants={fadeIn}
      whileHover={{ y: -8 }}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full"
    >
      <Link to={`/imovel/:id`.replace(':id', property.id)} className="block relative h-64 overflow-hidden">
        <SafeImage
          src={getSafeImageUrl(getImagemPrincipal(property))}
          alt={displayTitle}
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
              {bizTypeNorm || property.businessType || "Imóvel"}
            </span>
            {isImovelAlugado(property) && (
              <span className="bg-primary-black border border-gold text-gold text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg">
                JÁ ALUGADO / INDISPONÍVEL
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
            {property.propertyType || "Imóvel"}
          </span>
        </div>

        <PropertyPriceBadge imovel={property} />
      </Link>
      
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-gold">
            <MapPin size={14} className="shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[180px]">
              {displayLocation}
            </span>
          </div>
          <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase">
            CÓD: {displayCode}
          </span>
        </div>
        
        <Link to={`/imovel/${property.id}`}>
          <h3 className="font-display text-xl font-bold text-primary-black group-hover:text-gold transition-colors leading-tight line-clamp-2 mb-4 h-12">
            {displayTitle}
          </h3>
        </Link>
        
        <div className="mb-6 bg-gray-50/50 rounded-2xl p-4 border border-gray-50">
          {isImovelAlugado(property) ? (
            bizTypeNorm === 'Venda e Locação' && (property.priceVenda || property.valorVenda || property.valor_venda) ? (
              <div>
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                  Disponível para Venda
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display font-black text-primary-green">
                    {formatCurrency(property.priceVenda || property.valorVenda || property.valor_venda)}
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
                  Já alugado / Indisponível
                </span>
              </div>
            )
          ) : (
            <>
              {bizTypeNorm === 'Venda' ? (
                <>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                     Valor de Venda (Investimento)
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-black text-primary-green">
                      {formatCurrency(property.priceVenda || property.valorVenda || property.valor_venda)}
                    </span>
                  </div>
                </>
              ) : bizTypeNorm === 'Locação' ? (
                <>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                     Valor de Locação
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-black text-primary-green">
                      {formatCurrency(getValorMensal(property))}
                    </span>
                    <span className="text-xs font-bold text-gray-400">/mês</span>
                  </div>
                </>
              ) : bizTypeNorm === 'Venda e Locação' ? (
                <div className="space-y-2">
                  {(property.priceVenda || property.valorVenda || property.valor_venda) && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">
                         Valor de Venda
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-display font-black text-primary-green">
                          {formatCurrency(property.priceVenda || property.valorVenda || property.valor_venda)}
                        </span>
                      </div>
                    </div>
                  )}
                  {(property.priceLocacao || property.valorAluguel || property.valor_aluguel || getValorMensal(property) > 0) && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">
                         Valor de Locação
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-display font-black text-primary-green">
                          {formatCurrency(getValorMensal(property))}
                        </span>
                        <span className="text-xs font-bold text-gray-400">/mês</span>
                      </div>
                    </div>
                  )}
                  {!(property.priceVenda || property.valorVenda || property.valor_venda) && !(property.priceLocacao || property.valorAluguel || property.valor_aluguel || getValorTotalMensal(property)) && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                         Valor
                      </p>
                      <span className="text-xl font-display font-black text-primary-green">
                        Sob consulta
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                     Valor
                  </p>
                  <span className="text-xl font-display font-black text-primary-green">
                    Sob consulta
                  </span>
                </div>
              )}
            </>
          )}
          <PropertyCardCosts imovel={property} />
        </div>

        {(() => {
          const stats = getCardStats(property);
          return (
            <div className="grid grid-cols-5 gap-1.5 mb-6 h-12">
              <div 
                className="flex flex-col items-center justify-center p-1 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all" 
                title={stats.dormitorios === 1 ? "1 Dormitório" : `${stats.dormitorios} Dormitórios`}
              >
                <Bed size={14} className="text-primary-black mb-1" />
                <span className="text-[10px] font-black text-primary-black">{stats.dormitorios}</span>
              </div>
              <div 
                className="flex flex-col items-center justify-center p-1 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all" 
                title={stats.banheiros === 1 ? "1 Banheiro" : `${stats.banheiros} Banheiros`}
              >
                <Bath size={14} className="text-primary-black mb-1" />
                <span className="text-[10px] font-black text-primary-black">{stats.banheiros}</span>
              </div>
              <div 
                className="flex flex-col items-center justify-center p-1 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all" 
                title={stats.salas === 1 ? "1 Sala" : `${stats.salas} Salas`}
              >
                <Armchair size={14} className="text-primary-black mb-1" />
                <span className="text-[10px] font-black text-primary-black">{stats.salas}</span>
              </div>
              <div 
                className="flex flex-col items-center justify-center p-1 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all" 
                title={stats.vagas === 1 ? "1 Vaga" : `${stats.vagas} Vagas`}
              >
                <Car size={14} className="text-primary-black mb-1" />
                <span className="text-[10px] font-black text-primary-black">{stats.vagas}</span>
              </div>
              <div 
                className="flex flex-col items-center justify-center p-1 rounded-xl bg-gray-50/50 border border-transparent hover:border-gold/20 transition-all" 
                title="Área Útil"
              >
                <Maximize size={14} className="text-primary-black mb-1" />
                <span className="text-[10px] font-black text-primary-black">{stats.area}m²</span>
              </div>
            </div>
          );
        })()}
        
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
  useSEO({
    title: "Imóveis à venda e locação em Balneário Camboriú | Menta Imóveis",
    description: "Veja apartamentos, casas e imóveis disponíveis para venda e locação em Balneário Camboriú. Consulte valores, localização e fale com um corretor."
  });

  const location = useLocation();
  const { settings, loading: settingsLoading } = useSettings();
  const { options, loading: optionsLoading } = useOptions();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recentes');

  // Search Filters
  const [searchFilters, setSearchFilters] = useState<any>({
    businessType: 'Todos',
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
    leaseFilterStatus: 'todos',
    busca: ''
  });

  useEffect(() => {
    console.log("Origem atual:", window.location.origin);
    console.log("URL atual:", window.location.href);
    console.log("Entrou em /imoveis");
    // Parse URL params
    const params = new URLSearchParams(location.search);
    const initialFilters = {
      businessType: params.get('businessType') || 'Todos',
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
      leaseFilterStatus: params.get('leaseFilterStatus') || 'todos',
      busca: params.get('busca') || ''
    };
    setSearchFilters(initialFilters);
    fetchProperties(initialFilters);
  }, [location.search]);

  const fetchProperties = async (filters: any) => {
    setLoading(true);
    try {
      let rawData: any[] = [];
      try {
        // Try getting the entire collection first (works if permission allows or for admin/local use)
        const snap = await getDocs(query(collection(db, 'imoveis')));
        rawData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      } catch (err) {
        console.log("Failed to fetch full collection, trying filtered queries in parallel...", err);
        // Falls back to parallel queries permitted by public rules
        const q1 = query(collection(db, 'imoveis'), where('publicado', '==', true));
        const q2 = query(collection(db, 'imoveis'), where('publicadoNoSite', '==', true));
        const q3 = query(collection(db, 'imoveis'), where('ativo', '==', true));
        
        const [snap1, snap2, snap3] = await Promise.all([
          getDocs(q1).catch(e => { console.error(e); return { docs: [] }; }),
          getDocs(q2).catch(e => { console.error(e); return { docs: [] }; }),
          getDocs(q3).catch(e => { console.error(e); return { docs: [] }; })
        ]);

        const map = new Map();
        [...snap1.docs, ...snap2.docs, ...snap3.docs].forEach(doc => {
          map.set(doc.id, { id: doc.id, ...doc.data() as any });
        });
        rawData = Array.from(map.values());
      }

      console.log("Buscando imóveis no Firestore...");
      const lista = rawData;
      const todosImoveis = rawData;
      console.log("Total bruto:", lista.length);
      console.log("Imóveis brutos:", lista);

      // Log those that are removed from being public
      todosImoveis.forEach(imovel => {
        if (!isImovelPublico(imovel)) {
          console.log("Imóvel removido do público (pode ser mock ou inativo/excluído):", imovel.id, {
            publicadoNoSite: imovel.publicadoNoSite,
            publicado: imovel.publicado,
            ativo: imovel.ativo,
            excluido: imovel.excluido,
            status: imovel.status,
            tipoNegocio: imovel.tipoNegocio || imovel.businessType
          });
        }
      });

      const publicos = todosImoveis.filter(isImovelPublico);
      const imoveisPublicos = publicos;
      console.log("Total públicos:", publicos.length);
      console.log("Imóveis públicos:", publicos);
      console.log("Filtros ativos:", filters);

      let data = imoveisPublicos;

      // 1. Quick Search Filter
      if (filters.busca) {
        data = data.filter((p: any) => matchesQuickSearch(p, filters.busca));
      }

      // 2. Business Type Filter
      const selectedBType = String(filters.businessType || 'Todos').trim();
      if (selectedBType !== 'Todos' && selectedBType !== '') {
        const normalizedSelected = normalizeTipoNegocio(selectedBType);
        
        data = data.filter((p: any) => {
          const pType = normalizeTipoNegocio(p.businessType || p.tipoNegocio);
          if (normalizedSelected === 'Venda') {
            return pType === 'Venda' || pType === 'Venda e Locação';
          }
          if (normalizedSelected === 'Locação') {
            return pType === 'Locação' || pType === 'Venda e Locação';
          }
          if (normalizedSelected === 'Venda e Locação') {
            return pType === 'Venda e Locação';
          }
          return true;
        });
      }

      // Filter by lease/rental status (Disponíveis, Alugados, Todos)
      const leaseFilter = filters.leaseFilterStatus || 'todos';
      if (leaseFilter === 'alugados') {
        data = data.filter((p: any) => isImovelAlugado(p));
      } else if (leaseFilter === 'todos') {
        // Keep both
      } else if (leaseFilter === 'disponiveis') {
        data = data.filter((p: any) => {
          const pType = normalizeTipoNegocio(p.businessType || p.tipoNegocio);
          if (pType === 'Venda') return true;
          if (pType === 'Venda e Locação') {
            const isRented = isImovelAlugado(p);
            if (normalizeTipoNegocio(selectedBType) === 'Locação') {
              return !isRented;
            }
            return true;
          }
          return !isImovelAlugado(p);
        });
      }

      // 3. Other Filters
      if (filters.propertyType) {
        data = data.filter((p: any) => p.propertyType === filters.propertyType);
      }
      if (filters.city) {
        data = data.filter((p: any) => p.city?.toLowerCase().includes(filters.city.toLowerCase()));
      }
      if (filters.neighborhood) {
        data = data.filter((p: any) => (p.neighborhood || p.bairro || "").toLowerCase() === filters.neighborhood.toLowerCase());
      }
      
      const normalizedBTypeForPrice = normalizeTipoNegocio(filters.businessType);
      const isRentalSearch = normalizedBTypeForPrice === 'Locação';
      
      if (filters.minPrice) {
        data = data.filter((p: any) => {
          const price = isRentalSearch 
            ? (getValorTotalMensal(p) || p.priceLocacao || p.valorAluguel || p.valor_aluguel || 0) 
            : (p.priceVenda || p.valorVenda || p.valor_venda || 0);
          return Number(price) >= parseFloat(filters.minPrice);
        });
      }
      if (filters.maxPrice) {
        data = data.filter((p: any) => {
          const price = isRentalSearch 
            ? (getValorTotalMensal(p) || p.priceLocacao || p.valorAluguel || p.valor_aluguel || 0) 
            : (p.priceVenda || p.valorVenda || p.valor_venda || 0);
          return Number(price) <= parseFloat(filters.maxPrice);
        });
      }
      if (filters.bedrooms) {
        data = data.filter((p: any) => (p.bedrooms || p.dormitorios || 0) >= parseInt(filters.bedrooms));
      }
      if (filters.bathrooms) {
        data = data.filter((p: any) => (p.bathrooms || p.banheiros || 0) >= parseInt(filters.bathrooms));
      }
      if (filters.garageSpaces) {
        data = data.filter((p: any) => (p.garageSpaces || p.vagas || p.vagasGaragem || 0) >= parseInt(filters.garageSpaces));
      }
      if (filters.minArea) {
        data = data.filter((p: any) => (p.usefulArea || p.areaUtil || p.totalArea || p.areaTotal || 0) >= parseFloat(filters.minArea));
      }
      if (filters.maxArea) {
        data = data.filter((p: any) => (p.usefulArea || p.areaUtil || p.totalArea || p.areaTotal || 0) <= parseFloat(filters.maxArea));
      }
      if (filters.destaque === true) {
        data = data.filter((p: any) => p.destaque === true);
      }

      console.log("Total depois dos filtros:", data.length);
      setProperties(data);
    } catch (error: any) {
      console.error("Erro ao carregar imóveis do catálogo:", error);
      console.error("Código:", error?.code);
      console.error("Mensagem:", error?.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    if (sortBy === 'recentes') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    if (sortBy === 'antigos') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    
    // Choose price field based on current business type search
    const isLocacao = normalizeTipoNegocio(searchFilters.businessType) === 'Locação';
    const priceA = isLocacao 
      ? (getValorTotalMensal(a) || a.priceLocacao || a.valorAluguel || a.valor_aluguel || 0) 
      : (a.priceVenda || a.valorVenda || a.valor_venda || 0);
    const priceB = isLocacao 
      ? (getValorTotalMensal(b) || b.priceLocacao || b.valorAluguel || b.valor_aluguel || 0) 
      : (b.priceVenda || b.valorVenda || b.valor_venda || 0);
    
    if (sortBy === 'menor-preco') return Number(priceA) - Number(priceB);
    if (sortBy === 'maior-preco') return Number(priceB) - Number(priceA);
    if (sortBy === 'destaque') return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
    
    return 0;
  });

  return (
    <PageWrapper>
      <div className="bg-gray-50 min-h-screen">
        {/* Search Header */}
        <div className="relative overflow-hidden bg-primary-green">
          {/* Fundo Overlay Escuro para Contraste de Leitura */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/80 via-[#000000]/52 to-[#000000]/78 z-[2] pointer-events-none" />

          {/* Three.js Layer */}
          <div className="absolute inset-0 z-[1] pointer-events-none opacity-40">
            <Canvas camera={{ position: [0, 0, 5] }} gl={{ alpha: true }}>
              <GoldenParticles count={35} size={0.06} speed={0.25} />
            </Canvas>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 1.25 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 2.2 }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center z-0"
          />

          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center md:text-left pt-[115px] pb-[60px] md:pt-[150px] md:pb-[85px]">
            <motion.div variants={staggerContainer} initial="initial" animate="animate">
              <span className="text-[#e8c14f] font-black uppercase text-[11px] tracking-[0.45em] mb-4.5 block">Nossas Oportunidades</span>
              <motion.h1 variants={slideUp} className="font-display text-[34px] md:text-[clamp(36px,5vw,72px)] leading-[1.05] font-black tracking-tighter text-white mb-6">
                {settings.secoes.imoveisDestaque.titulo?.split(' ')[0]} <span className="text-[#e8c14f]">{settings.secoes.imoveisDestaque.titulo?.split(' ').slice(1).join(' ')}</span>
              </motion.h1>
              <motion.p variants={slideUp} className="text-emerald-100 font-medium opacity-90 text-md md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed">
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
            {/* Campo de Pesquisa Rápida Inteligente */}
            <div className="mb-6 space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                Pesquisa Rápida Inteligente
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold z-10" />
                <input 
                  type="text"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-5 py-4 text-sm font-medium text-primary-black placeholder-gray-400 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  placeholder="Busque por apartamento 2 quartos, casa no centro..."
                  value={searchFilters.busca}
                  onChange={(e) => setSearchFilters({...searchFilters, busca: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchProperties(searchFilters);
                  }}
                />
              </div>
            </div>

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
                   <option value="Todos">Todos Negócios</option>
                   <option value="Venda">Venda</option>
                   <option value="Locação">Locação</option>
                   <option value="Venda e Locação">Venda e Locação</option>
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
               <div className="flex flex-col">
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] leading-none">
                   Mostrando <span className="text-primary-black text-lg ml-1 font-black">{sortedProperties.length}</span> imóveis ativos
                 </p>
                 {searchFilters.busca && (
                   <p className="text-gold font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
                     Resultado para: <span className="text-primary-black font-black italic">"{searchFilters.busca}"</span>
                   </p>
                 )}
               </div>
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
               <h3 className="text-3xl font-display font-bold text-primary-black mb-3 tracking-tight">
                 {searchFilters.busca ? "Nenhum imóvel encontrado para sua busca" : "Nenhum imóvel disponível no momento"}
               </h3>
               <p className="text-gray-400 font-medium mb-10 leading-relaxed text-sm">
                 {searchFilters.busca 
                   ? `Não encontramos nenhum imóvel publicado que atenda a "${searchFilters.busca}". Tente ajustar os termos da pesquisa rápida ou usar outros filtros.`
                   : "Não encontramos nenhum imóvel publicado que atenda aos critérios. Tente ajustar sua busca ou volte mais tarde."}
               </p>
               <button 
                  onClick={() => {
                    const defaultFilters = { businessType: 'Todos', propertyType: '', city: '', neighborhood: '', minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', garageSpaces: '', minArea: '', maxArea: '', destaque: false, leaseFilterStatus: 'todos', busca: '' };
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pesquisa Rápida Inteligente</label>
                    <div className="relative group focus-within:ring-2 focus-within:ring-gold/20 rounded-2xl transition-all">
                      <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold z-10" />
                      <input 
                        type="text" 
                        placeholder="Ex: apto 2 quartos no centro..." 
                        className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-14 pr-6 text-sm font-bold outline-none placeholder:text-gray-300"
                        value={searchFilters.busca}
                        onChange={(e) => setSearchFilters({...searchFilters, busca: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo de Negócio</label>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                       {[
                         { id: 'todos', nome: 'Todos', label: 'Todos' },
                         { id: 'venda', nome: 'Venda', label: 'Venda' },
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

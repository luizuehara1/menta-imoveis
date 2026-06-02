import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import VisitScheduler from '../../components/public/VisitScheduler';
import { useSettings } from '../../hooks/useSettings';
import { 
  MapPin, 
  Bed, 
  Car, 
  Check, 
  MessageCircle, 
  Maximize, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Info,
  Layers,
  Sparkles,
  ArrowLeft,
  Target,
  Bath,
  PawPrint,
  Armchair,
  ShieldCheck,
  FileText,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageWrapper from '../../components/PageWrapper';
import { SafeImage } from '../../components/ui/SafeImage';
import { 
  formatCurrency, 
  isValidPublicProperty, 
  isMockProperty,
  cleanPhoneForWhatsapp, 
  getSafeImageUrl, 
  isImovelAlugado, 
  normalizeTipoNegocio,
  formatOptionWithQuantity,
  pluralizeLabel,
  buildPropertyWhatsAppMessage,
  getIptuValue,
  getValorTotalMensal,
  getValorMensal,
  toNumber,
  getCardStats,
  getPropertyStats
} from '../../lib/utils';

const formatCharacteristic = (char: string, property: any) => {
  const allObjects = [
    ...(property?.ambientes || []),
    ...(property?.caracteristicasApartamento || []),
    ...(property?.lazer_objects || []),
    ...(property?.caracteristicasEmpreendimento || []),
    ...(property?.instalacoes_objects || []),
    ...(property?.acabamentos_objects || []),
    ...(property?.localizacao || [])
  ];

  const matched = allObjects.find(
    (o: any) => String(o.label || o.nome || '').trim().toLowerCase() === char.trim().toLowerCase()
  );

  if (matched && matched.quantidade !== undefined && matched.quantidade !== null) {
    const qty = Number(matched.quantidade);
    if (qty > 0) {
      return formatOptionWithQuantity(matched);
    }
  }

  // Fallback to direct field matching
  if (char === 'Dormitórios' && (property?.dormitorios || property?.bedrooms)) {
    const qty = Number(property.dormitorios || property.bedrooms);
    return formatOptionWithQuantity({ label: 'Dormitório', quantidade: qty });
  }
  if (char === 'Suítes' && property?.suites) {
    const qty = Number(property.suites);
    return formatOptionWithQuantity({ label: 'Suíte', quantidade: qty });
  }
  if (char === 'Número de salas' && property?.salas) {
    const qty = Number(property.salas);
    return formatOptionWithQuantity({ label: 'Sala', quantidade: qty });
  }
  if (char === 'Número de vagas' && (property?.vagas || property?.garageSpaces)) {
    const qty = Number(property.vagas || property.garageSpaces);
    return formatOptionWithQuantity({ label: 'Vaga', quantidade: qty });
  }
  if (char === 'Lavabo' && (property?.lavabos || property?.lavabo)) {
    const qty = Number(property.lavabos || property.lavabo);
    return formatOptionWithQuantity({ label: 'Lavabo', quantidade: qty });
  }
  if (char === 'WC social' && property?.bathrooms) {
    const qty = Number(property.bathrooms);
    return formatOptionWithQuantity({ label: 'WC social', quantidade: qty });
  }

  return char;
};

function getPropertyImages(imovel: any): string[] {
  const imagens: string[] = [];

  if (imovel?.imagemPrincipal) {
    if (typeof imovel.imagemPrincipal === "string") {
      imagens.push(imovel.imagemPrincipal);
    } else if (imovel.imagemPrincipal?.url) {
      imagens.push(imovel.imagemPrincipal.url);
    }
  }

  if (Array.isArray(imovel?.imagens)) {
    imovel.imagens.forEach((img: any) => {
      if (typeof img === "string") {
        imagens.push(img);
      } else if (img?.url) {
        imagens.push(img.url);
      }
    });
  }

  const uniqueImages = [...new Set(imagens.filter(Boolean))];

  return uniqueImages.length ? uniqueImages : ["/placeholder-imovel.png"];
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMobileSections, setActiveMobileSections] = useState<Record<string, boolean>>({
    caracteristicas: false,
    acabamentos: false,
    lazer: false,
    instalacoes: false
  });
  const [resolvedWhatsappPhone, setResolvedWhatsappPhone] = useState<string>('');

  if (property) {
    console.log("Imóvel carregado:", property);
    console.log("Stats calculadas:", getPropertyStats(property));
    console.log("Campos principais:", {
      dormitorios: property.dormitorios,
      quartos: property.quartos,
      suites: property.suites,
      banheiros: property.banheiros,
      salas: property.salas,
      vagas: property.vagas,
      areaUtil: property.areaUtil,
      areaTotal: property.areaTotal
    });
  }

  useEffect(() => {
    if (property && settings) {
      const fetchBrokerAndResolve = async () => {
        // 1. imovel.corretorResponsavel.whatsapp
        if (property.corretorResponsavel?.whatsapp) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.corretorResponsavel.whatsapp));
          return;
        }
        // 2. imovel.corretorResponsavel.telefone
        if (property.corretorResponsavel?.telefone) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.corretorResponsavel.telefone));
          return;
        }

        // 3. corretor vinculado em corretores/{id}
        const brokerId = property.brokerId || property.corretorId || property.corretorResponsavel?.id || property.broker?.id;
        if (brokerId) {
          try {
            const brokerRef = doc(db, 'corretores', brokerId);
            const brokerSnap = await getDoc(brokerRef);
            if (brokerSnap.exists()) {
              const brokerData = brokerSnap.data();
              if (brokerData) {
                const brokerPhone = brokerData.whatsapp || brokerData.phone || brokerData.telefone;
                if (brokerPhone) {
                  setResolvedWhatsappPhone(cleanPhoneForWhatsapp(brokerPhone));
                  return;
                }
              }
            }
          } catch (e) {
            console.error("Error fetching broker from corretores:", e);
          }
        }

        // 4. imovel.corretorWhatsapp / brokerWhatsapp / etc.
        if (property.corretorWhatsapp) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.corretorWhatsapp));
          return;
        }
        if (property.corretorTelefone) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.corretorTelefone));
          return;
        }
        if (property.brokerWhatsapp) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.brokerWhatsapp));
          return;
        }
        if (property.brokerPhone) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.brokerPhone));
          return;
        }
        if (property.broker?.whatsapp) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.broker.whatsapp));
          return;
        }
        if (property.broker?.telefone) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(property.broker.telefone));
          return;
        }

        // 5. WhatsApp da imobiliária nas configurações do site
        if (settings?.empresa?.whatsapp) {
          setResolvedWhatsappPhone(cleanPhoneForWhatsapp(settings.empresa.whatsapp));
        }
      };

      fetchBrokerAndResolve();
    }
  }, [property, settings]);

  const toggleMobileSection = (section: string) => {
    setActiveMobileSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const galleryImagesWithMeta = React.useMemo(() => {
    if (!property) return [];
    const urls = getPropertyImages(property);
    return urls.map(url => {
      let aplicarMarcaDagua = true;
      if (property) {
        const rawImages = [
          property.imagemPrincipal,
          ...(Array.isArray(property.imagens) ? property.imagens : []),
          ...(Array.isArray(property.images) ? property.images : [])
        ];
        const match = rawImages.find(
          (o: any) => o && typeof o !== "string" && (o.url === url || getSafeImageUrl(o.url) === url)
        );
        if (match && match.aplicarMarcaDagua === false) {
          aplicarMarcaDagua = false;
        }
      }
      return {
        url: getSafeImageUrl(url) || url,
        aplicarMarcaDagua
      };
    });
  }, [property]);

  const galleryImages = React.useMemo(() => {
    return galleryImagesWithMeta.map(item => item.url);
  }, [galleryImagesWithMeta]);

  // Infinite automated carousel: transitions automatically every 3 seconds unless paused on mouse hover
  useEffect(() => {
    if (galleryImages.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % galleryImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [galleryImages.length, isPaused]);

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setLoading(true);
        setNotFound(false);
        console.log("ID recebido da URL:", id);
        console.log("Buscando Firestore em:", `imoveis/${id}`);
        try {
          const docSnap = await getDoc(doc(db, 'imoveis', id));
          console.log("Documento existe:", docSnap.exists());
          if (docSnap.exists()) {
             console.log("Dados do imóvel:", docSnap.data());
          }

          let p: any = null;
          if (docSnap.exists()) {
            p = { id: docSnap.id, ...docSnap.data() };
          } else {
            console.log("Documento primário não encontrado via ID. Iniciando buscas de fallback...");
            
            // Try query by 'slug'
            const slugQuery = query(collection(db, 'imoveis'), where('slug', '==', id));
            const slugSnap = await getDocs(slugQuery);
            if (!slugSnap.empty) {
              const matchedDoc = slugSnap.docs[0];
              p = { id: matchedDoc.id, ...matchedDoc.data() };
              console.log("Encontrado por fallback (slug):", p);
            } else {
              // Try query by 'code'
              const codeQuery = query(collection(db, 'imoveis'), where('code', '==', id));
              const codeSnap = await getDocs(codeQuery);
              if (!codeSnap.empty) {
                const matchedDoc = codeSnap.docs[0];
                p = { id: matchedDoc.id, ...matchedDoc.data() };
                console.log("Encontrado por fallback (code):", p);
              } else {
                // Try query by 'codigo'
                const codigoQuery = query(collection(db, 'imoveis'), where('codigo', '==', id));
                const codigoSnap = await getDocs(codigoQuery);
                if (!codigoSnap.empty) {
                  const matchedDoc = codigoSnap.docs[0];
                  p = { id: matchedDoc.id, ...matchedDoc.data() };
                  console.log("Encontrado por fallback (codigo):", p);
                }
              }
            }
          }

          if (p) {
            // Rule 8: REGRAS DE VISIBILIDADE
            // O imóvel público deve abrir se publicadoNoSite === true || publicado === true || ativo === true e excluido !== true.
            // Se o admin estiver logado, pode abrir mesmo se não estiver publicado.
            const isPublic = p.excluido !== true && (p.publicadoNoSite === true || p.publicado === true || p.ativo === true);
            const isMock = isMockProperty(p);
            console.log("Verificação de visibilidade do imóvel:", { isPublic, isMock, isAdmin, excluido: p.excluido, publicadoNoSite: p.publicadoNoSite, publicado: p.publicado, ativo: p.ativo });

            if ((isPublic || isAdmin) && !isMock) {
              setProperty(p);
              setNotFound(false);
            } else {
              console.warn("Imóvel existe no banco de dados, mas não está público ou é mock e o usuário atual não é Administrador.");
              setNotFound(true);
            }
          } else {
            console.warn(`Nenhum imóvel correspondente foi localizado para o identificador: "${id}".`);
            setNotFound(true);
          }
        } catch (error: any) {
          console.error("Erro ao carregar imóvel público:", error?.code, error?.message, error);
          setNotFound(true);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, isAdmin, navigate]);

  const scrollToScheduler = () => {
    const element = document.getElementById('agendamento');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nextImage = () => {
    if (galleryImages.length === 0) return;
    setActiveImage((activeImage + 1) % galleryImages.length);
  };

  const prevImage = () => {
    if (galleryImages.length === 0) return;
    setActiveImage((activeImage - 1 + galleryImages.length) % galleryImages.length);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado para a área de transferência!');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-2 border-gold/20 border-t-gold rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consultando acervo exclusivo...</p>
    </div>
  );
  
  if (notFound || !property) {
    return (
      <PageWrapper>
        <div className="bg-[#FAF9F6] min-h-screen pt-[120px] pb-20 flex flex-col items-center justify-center font-sans px-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-gold/10">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Info size={32} />
            </div>
            <h1 className="text-2xl font-display font-black text-[#0F172A] mb-3">Imóvel Não Encontrado</h1>
            <p className="text-gray-500 leading-relaxed text-sm mb-6">
              Não encontramos o imóvel solicitado. Ele pode ter sido removido, vendido ou estar indisponível no momento.
            </p>
            <div className="space-y-3">
              <Link to="/imoveis" className="block w-full text-center bg-gold hover:bg-[#EEBF32] text-primary-black font-black uppercase tracking-wider py-3.5 rounded-xl text-xs transition-all shadow-md">
                Ver Outros Imóveis
              </Link>
              <Link to="/" className="block text-xs font-bold text-gray-500 hover:text-slate-800 transition-colors uppercase tracking-widest py-2">
                Ir Para a Home
              </Link>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const normBusiness = normalizeTipoNegocio(property.businessType || property.tipoNegocio || '');
  const isVendaOnly = normBusiness === 'Venda';
  const isLocacaoOnly = normBusiness === 'Locação';
  const isVendaAndLocacao = normBusiness === 'Venda e Locação';

  const condoFeeVal = toNumber(property.condoFee || property.valorCondominio || 0);
  const iptuVal = getIptuValue(property);
  const fireInsuranceVal = toNumber(property.fireInsurance || property.valorSeguroIncendio || 0);
  const taxaLixoVal = toNumber(property.valorTaxaLixo || property.taxaLixo || 0);
  const taxaGasVal = toNumber(property.valorTaxaGas || property.taxaGas || 0);
  const taxaAguaVal = toNumber(property.valorTaxaAgua || property.taxaAgua || 0);
  const taxaLuzVal = toNumber(property.valorTaxaLuz || property.taxaLuz || 0);
  const outrasTaxasVal = toNumber(property.valorOutrasTaxas || property.outrasTaxas || 0);

  const totalMensalVal = getValorMensal(property);

  const getWhatsAppUrl = () => {
    const rawPhone = resolvedWhatsappPhone || property.brokerWhatsapp || settings.empresa.whatsapp;
    const cleanNumber = cleanPhoneForWhatsapp(rawPhone);
    // Use 55 as prefix if not already present
    const p = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = buildPropertyWhatsAppMessage(property);
    return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  };

  const whatsappUrl = getWhatsAppUrl();

  return (
    <PageWrapper>
      <div className="bg-[#FAF9F6] min-h-screen pt-[100px] md:pt-[116px] pb-20 font-sans">
        {/* Navigation / Header */}
        <div className="bg-white border-b border-[#E2E8F0] py-4 shadow-sm mb-6 md:mb-10">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
            <Link 
              to="/imoveis" 
              className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-slate-700 hover:text-gold transition-colors"
                id="back-to-properties"
            >
              <ArrowLeft size={16} className="text-gold" /> Voltar para imóveis
            </Link>
            <div className="flex items-center gap-4">
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                title="Copiar link"
                id="btn-copy-link"
              >
                <Share2 size={18} />
              </button>
              <div className="h-4 w-px bg-slate-300" />
              <span className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-widest">Cod: {property.code}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Title & Location Header */}
          <div className="mb-6 lg:mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="bg-[#0F172A] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                {property.businessType}
              </span>
              <span className="bg-gold/10 text-gold-750 border border-gold/25 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                {property.propertyType}
              </span>
              {isImovelAlugado(property) && (
                normalizeTipoNegocio(property.businessType || property.tipoNegocio) === "Venda e Locação" ? (
                  <span className="bg-emerald-500 hover:bg-emerald-600 text-white border border-transparent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Alugado, disponível para venda
                  </span>
                ) : (
                  <span className="bg-amber-100 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Já alugado
                  </span>
                )
              )}
              {property.statusImovel && (
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-auto lg:ml-2">
                  {property.statusImovel}
                </span>
              )}
            </div>
            
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-tight mb-3">
              {property.title}
            </h1>
            
            <div className="flex items-center gap-2 text-slate-700 text-sm md:text-base bg-[#F1F5F9]/50 border border-[#E2E8F0]/40 px-3.5 py-1.5 rounded-xl w-fit">
              <MapPin size={16} className="text-gold shrink-0" />
              <span className="font-semibold text-slate-800">{property.neighborhood}, {property.city} - {property.state}</span>
            </div>
          </div>

          <div className="property-detail-hero">
            {/* 1. Gallery Section (Carousel & Thumbnails) */}
            <div className="property-gallery-section space-y-4">
                <div 
                  className="property-carousel-main group shadow-[0_20px_45px_rgba(15,23,42,0.06)] border border-[#E2E8F0]"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImage}
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="w-full h-full relative"
                    >
                      <SafeImage
                        src={galleryImages[activeImage]}
                        alt={`${property.title} - Imagem ${activeImage + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Interactive watermark overlay for public page */}
                      {galleryImagesWithMeta[activeImage]?.aplicarMarcaDagua && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 select-none">
                           <img 
                             src={settings?.empresa?.marcaDaguaUrl || settings?.empresa?.logoCabecalhoUrl || settings?.aparencia?.logoUrl || '/watermark.png'} 
                             alt="Watermark" 
                             className="w-[45%] max-w-[320px] opacity-[0.08] object-contain select-none pointer-events-none"
                             onError={(e) => { e.currentTarget.style.display = 'none'; }}
                           />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  
                  {galleryImages.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.preventDefault(); prevImage(); }}
                        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-white/75 hover:bg-white backdrop-blur-md rounded-full text-slate-800 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:text-gold shadow-lg z-30"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); nextImage(); }}
                        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-white/75 hover:bg-white backdrop-blur-md rounded-full text-slate-800 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:text-gold shadow-lg z-30"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  
                  {/* Image Counter Overlay */}
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-slate-900/75 backdrop-blur-md text-white text-[11px] font-black px-4 py-1.5 rounded-full border border-white/10 tracking-widest z-30 shadow-md">
                    {activeImage + 1} / {galleryImages.length}
                  </div>
                </div>

                {galleryImages.length > 1 && (
                  <div className="property-thumbnails no-scrollbar">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`property-thumbnail ${activeImage === idx ? 'active' : 'opacity-60 hover:opacity-100'}`}
                      >
                        <SafeImage src={img} className="w-full h-full object-cover animate-fadeIn" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="property-info-section space-y-6 md:space-y-8">
                {/* We completely hide the duplicate/overlapping mobile sections here */}
                <div className="hidden">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#F1F5F9] shadow-md space-y-5">
                    {isImovelAlugado(property) ? (
                      property.businessType === 'Venda e Locação' && property.priceVenda ? (
                        <div className="space-y-4">
                          <div>
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block mb-2">
                              Disponível para Compra
                            </span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">Valor de Aquisição</p>
                            <p className="text-3xl font-display font-black text-primary-black tracking-tight">
                              {formatCurrency(property.priceVenda)}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed">
                              Imóvel com contrato de locação ativo. Visitas e propostas aceitas exclusivamente para fins de aquisição/investimento patrimonial.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <a 
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-97 transition-all"
                            >
                              <MessageCircle size={18} /> Proposta de Venda
                            </a>
                            <button 
                              onClick={scrollToScheduler}
                              className="flex items-center justify-center gap-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-97 transition-all"
                            >
                              <Calendar size={18} /> Agendar Visita Compra
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Locação de Imóvel</span>
                            </div>
                            <span className="text-[15px] font-display font-black text-amber-900 uppercase">JÁ ALUGADO / INDISPONÍVEL</span>
                            <p className="text-xs text-amber-800/80 leading-relaxed font-semibold">Este imóvel encontra-se sob nossa administração e já está alugado. Valores de visita e locação suspensos temporariamente.</p>
                          </div>
                          <a 
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-97 transition-all w-full"
                          >
                            <MessageCircle size={18} /> Falar com Administradora
                          </a>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="space-y-3">
                           {/* Venda / Venda e Locação - Valor de Venda */}
                           {(isVendaOnly || isVendaAndLocacao) && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 mb-1 bg-slate-100/10 inline-block px-1.5 py-0.5 rounded leading-none">
                                 Valor de Investimento / Venda
                               </p>
                               <p className="text-3xl font-display font-black text-primary-green tracking-tight leading-none">
                                 {formatCurrency(property.priceVenda || property.valorVenda || 0)}
                               </p>
                             </div>
                           )}

                           {/* Locação / Venda e Locação - Valor de Aluguel */}
                           {(isLocacaoOnly || isVendaAndLocacao) && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 mb-1 bg-slate-100/10 inline-block px-1.5 py-0.5 rounded leading-none">
                                 {isVendaAndLocacao ? 'Valor Mensal' : 'Valor Mensal'}
                               </p>
                               <p className="text-3xl font-display font-black text-[#0F172A] tracking-tight leading-none">
                                 {formatCurrency(property.priceLocacao || property.valorAluguel || 0)}
                                 <span className="text-xs font-semibold text-gray-400"> / mês</span>
                               </p>
                             </div>
                           )}
                        </div>

                        {/* Package pricing (Locação) */}
                        {(isLocacaoOnly || isVendaAndLocacao) && totalMensalVal > 0 && (
                           <div className="p-3 bg-emerald-50/50 border border-emerald-100/55 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 mt-3">
                             <span>Pacote Comercial Mensal Total</span>
                             <span className="font-black text-emerald-600 text-sm">{formatCurrency(totalMensalVal || 0)}</span>
                           </div>
                        )}

                        {/* Breakdown on mobile */}
                        {(condoFeeVal > 0 || iptuVal > 0 || fireInsuranceVal > 0 || taxaLixoVal > 0 || taxaGasVal > 0 || taxaAguaVal > 0 || taxaLuzVal > 0 || outrasTaxasVal > 0) && (
                           <div className="bg-[#FAF9F6] p-4 rounded-xl border border-slate-100 space-y-2 text-[11px] text-slate-500 block mt-3">
                              {condoFeeVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Taxa Condominial</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(condoFeeVal)}</span>
                                </div>
                              )}
                              {iptuVal > 0 && (
                                <div className="flex justify-between">
                                  <span>IPTU Mensal</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(iptuVal)}/mês</span>
                                </div>
                              )}
                              {taxaLixoVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Taxa de Lixo</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(taxaLixoVal)}</span>
                                </div>
                              )}
                              {taxaGasVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Taxa de Gás</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(taxaGasVal)}</span>
                                </div>
                              )}
                              {taxaAguaVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Taxa de Água</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(taxaAguaVal)}</span>
                                </div>
                              )}
                              {taxaLuzVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Taxa de Luz</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(taxaLuzVal)}</span>
                                </div>
                              )}
                              {fireInsuranceVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Seguro Incêndio</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(fireInsuranceVal)}</span>
                                </div>
                              )}
                              {outrasTaxasVal > 0 && (
                                <div className="flex justify-between">
                                  <span>Outras Taxas</span>
                                  <span className="font-bold text-slate-700">{formatCurrency(outrasTaxasVal)}</span>
                                </div>
                        )}
                           </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <a 
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-97 transition-all"
                          >
                            <MessageCircle size={18} /> Chamar no WhatsApp
                          </a>
                          <button 
                            onClick={scrollToScheduler}
                            className="flex items-center justify-center gap-2.5 bg-gold hover:bg-[#EEBF32] text-primary-black py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-97 transition-all"
                          >
                            <Calendar size={16} /> Agendar Visita
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Broker Mobile Card Section - hidden to prevent duplicate/overlapping layout */}
                {false && property.brokerName && (
                  <div className="lg:hidden bg-white p-5 rounded-[2rem] border border-[#F1F5F9] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-gold flex items-center justify-center shadow-md shrink-0 overflow-hidden relative border border-slate-100">
                      {property.brokerPhoto ? (
                        <SafeImage 
                          src={property.brokerPhoto} 
                          alt={property.brokerName} 
                          className="w-full h-full object-cover"
                          fallbackSrc="/placeholder-broker.png" 
                        />
                      ) : (
                        <span className="font-display font-bold text-sm">{property.brokerName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[9px] font-bold text-gold uppercase tracking-wider mb-0.5">Atendimento Exclusivo</p>
                      <h4 className="font-display font-bold text-slate-800 leading-tight truncate">{property.brokerName}</h4>
                      {property.brokerCreci && <p className="text-[9px] text-gray-400 mt-0.5 leading-none font-medium">CRECI: {property.brokerCreci}</p>}
                    </div>
                    <a 
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <MessageCircle size={18} />
                    </a>
                  </div>
                )}
              </div>

              {/* Main Content Sections with beautiful modular spacing */}
              <div className="space-y-6 md:space-y-8">
                {/* Metric Cards Grid */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#F1F5F9] shadow-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
                     {(() => {
                       const stats = getPropertyStats(property);
                       return [
                         { icon: Maximize, value: stats.area ? `${stats.area}m²` : '-', label: 'Área' },
                         { icon: Bed, value: stats.dormitorios || '-', label: 'Dormitórios' },
                         { icon: Sparkles, value: stats.suites || '-', label: 'Suítes' },
                         { icon: Bath, value: stats.banheiros || '-', label: 'Banheiros' },
                         { icon: Armchair, value: stats.salas || '-', label: 'Salas' },
                         { icon: Car, value: stats.vagas || '-', label: 'Vagas' },
                         { 
                           icon: Layers, 
                           value: (() => {
                             if (stats.area <= 0) return "-";
                             const isVenda = property.businessType === 'Venda' || property.businessType === 'Venda e Locação';
                             const isLocacao = property.businessType === 'Locação';
                             
                             let baseValue = 0;
                             if (isVenda) {
                               baseValue = toNumber(property.priceVenda || property.valorVenda);
                             } else if (isLocacao) {
                               baseValue = toNumber(property.priceLocacao || property.valorAluguel || property.valorTotalMensal);
                             } else {
                               baseValue = toNumber(property.priceVenda || property.valorVenda || property.priceLocacao || property.valorAluguel || property.valorTotalMensal);
                             }

                             if (baseValue > 0) {
                               const valorPorM2 = baseValue / stats.area;
                               return `${formatCurrency(valorPorM2)}/m²`;
                             }
                             return "-";
                           })(), 
                           label: 'Valor por m²' 
                         },
                       ].map((item, i) => (
                         <div key={i} className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-[#FAF9F6]/50 border border-slate-100 hover:border-gold/30 hover:bg-white hover:shadow-md transition-all duration-300">
                           <item.icon size={22} className="text-gold mb-2.5 shrink-0" />
                           <span className="text-base font-display font-black text-[#1E293B] mb-0.5">{item.value}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none text-center">{item.label}</span>
                         </div>
                       ));
                     })()}
                  </div>
                </div>

                {/* Building / Condomínio Name */}
                {property.buildingName && (
                  <div className="bg-white p-5 rounded-[2rem] border border-[#F1F5F9] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/5 text-gold border border-gold/10 flex items-center justify-center shrink-0">
                      <Layers size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Edifício / Residencial</span>
                      <span className="font-display text-base md:text-lg font-bold text-slate-800 leading-tight">{property.buildingName}</span>
                    </div>
                  </div>
                )}

                {/* Rental Conditions (Garantia, Prazo etc.) */}
                {(property.businessType === 'Locação' || property.businessType === 'Venda e Locação') && (
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#F1F5F9] shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4.5 bg-gold rounded-full" />
                      <h3 className="font-display text-base font-bold text-[#0F172A] uppercase tracking-wider">Diretrizes de Locação</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                       <div className="p-4 bg-[#FAF9F6]/60 rounded-xl border border-slate-150/40 flex items-center gap-3">
                          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Garantia Exigida</span>
                             <span className="text-xs font-black text-slate-700 block truncate">{property.leaseWarrantyType || 'Fiador ou Seguro Fiança'}</span>
                          </div>
                       </div>
                       <div className="p-4 bg-[#FAF9F6]/60 rounded-xl border border-slate-150/40 flex items-center gap-3">
                          <FileText size={18} className="text-emerald-600 shrink-0" />
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Prazo Mínimo de Contrato</span>
                             <span className="text-xs font-black text-slate-700 block truncate">{property.minLeaseTerm || '12 meses'}</span>
                          </div>
                       </div>
                       <div className="p-4 bg-[#FAF9F6]/60 rounded-xl border border-slate-150/40 flex items-center gap-3">
                          <PawPrint size={18} className="text-emerald-600 shrink-0" />
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Política de Animais</span>
                             <span className="text-xs font-black text-slate-700 block truncate">{property.allowsPet ? 'Aceita animais' : 'Restrito / Sob Consulta'}</span>
                          </div>
                       </div>
                       <div className="p-4 bg-[#FAF9F6]/60 rounded-xl border border-slate-150/40 flex items-center gap-3">
                          <Armchair size={18} className="text-emerald-600 shrink-0" />
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Estado de Mobília</span>
                             <span className="text-xs font-black text-slate-700 block truncate">{property.furnishingStatus || 'Sem mobília'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* About / Description Section */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#F1F5F9] shadow-sm space-y-4">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-4.5 bg-gold rounded-full" />
                     <h2 className="font-display text-base font-bold text-[#0F172A] uppercase tracking-wider">
                       Sobre o Imóvel
                     </h2>
                   </div>
                   <p className="text-slate-600 leading-[1.75] whitespace-pre-line text-sm md:text-base font-light">
                     {property.fullDescription || property.shortDescription}
                   </p>
                </div>

                {/* Features Accordion Panels / Details List */}
                {(property.caracteristicas?.length > 0 || property.acabamentos?.length > 0 || property.lazer?.length > 0 || property.instalacoes?.length > 0) && (
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#F1F5F9] shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                       {/* Column 1: Características & Acabamentos */}
                       <div className="space-y-6 md:space-y-8">
                          {property.caracteristicas?.length > 0 && (
                            <div className="border-b border-gray-100 md:border-b-0 pb-4 md:pb-0">
                               <button 
                                  onClick={() => toggleMobileSection('caracteristicas')}
                                  className="flex items-center justify-between w-full text-left md:pointer-events-none md:cursor-default py-1 focus:outline-none"
                               >
                                  <h3 className="font-display text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                                     <Sparkles size={16} className="text-gold shrink-0" />
                                     Características
                                  </h3>
                                  <span className="md:hidden text-slate-400">
                                     {activeMobileSections.caracteristicas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </span>
                               </button>
                               <div className={`mt-3 ${activeMobileSections.caracteristicas ? 'block' : 'hidden md:block'}`}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 animate-fadeIn">
                                     {property.caracteristicas.map((char: string) => (
                                       <div key={char} className="flex items-start gap-2.5 text-xs text-slate-500 hover:text-slate-850 transition-colors">
                                          <Check size={14} className="text-gold shrink-0 mt-0.5" />
                                          <span className="leading-tight">{formatCharacteristic(char, property)}</span>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          )}

                          {property.acabamentos?.length > 0 && (
                            <div className="border-b border-gray-100 md:border-b-0 pb-4 md:pb-0">
                               <button 
                                  onClick={() => toggleMobileSection('acabamentos')}
                                  className="flex items-center justify-between w-full text-left md:pointer-events-none md:cursor-default py-1 focus:outline-none"
                               >
                                  <h3 className="font-display text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                                     <Target size={16} className="text-gold shrink-0" />
                                     Acabamentos
                                  </h3>
                                  <span className="md:hidden text-slate-400">
                                     {activeMobileSections.acabamentos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </span>
                               </button>
                               <div className={`mt-3 ${activeMobileSections.acabamentos ? 'block' : 'hidden md:block'}`}>
                                  <div className="flex flex-wrap gap-1.5 animate-fadeIn">
                                     {property.acabamentos.map((item: string) => {
                                       const qtyObj = (property.acabamentos_objects || []).find(
                                         (o: any) => (o.label || o.nome) === item
                                       );
                                       const qty = qtyObj?.quantidade;
                                       return (
                                         <span key={item} className="bg-slate-50 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-500 border border-slate-100 hover:border-gold hover:text-gold transition-all">
                                            {formatOptionWithQuantity(qtyObj || { label: item, quantidade: qty })}
                                         </span>
                                       );
                                     })}
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>

                       {/* Column 2: Lazer & Instalações */}
                       <div className="space-y-6 md:space-y-8">
                          {property.lazer?.length > 0 && (
                            <div className="border-b border-gray-100 md:border-b-0 pb-4 md:pb-0">
                               <button 
                                  onClick={() => toggleMobileSection('lazer')}
                                  className="flex items-center justify-between w-full text-left md:pointer-events-none md:cursor-default py-1 focus:outline-none"
                               >
                                  <h3 className="font-display text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                                     <Layers size={16} className="text-gold shrink-0" />
                                     Área de Lazer
                                  </h3>
                                  <span className="md:hidden text-slate-400">
                                     {activeMobileSections.lazer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </span>
                               </button>
                               <div className={`mt-3 ${activeMobileSections.lazer ? 'block' : 'hidden md:block'}`}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 animate-fadeIn">
                                     {property.lazer.map((item: string) => {
                                        const qtyObj = (property.lazer_objects || property.caracteristicasEmpreendimento || []).find(
                                          (o: any) => (o.label || o.nome) === item
                                        );
                                        const qty = qtyObj?.quantidade;
                                        return (
                                          <div key={item} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-850 transition-colors">
                                             <div className="w-1.5 h-1.5 rounded-full bg-gold/55 shrink-0" />
                                             <span>{formatOptionWithQuantity(qtyObj || { label: item, quantidade: qty })}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                               </div>
                            </div>
                          )}

                          {property.instalacoes?.length > 0 && (
                            <div className="pb-4 md:pb-0">
                               <button 
                                  onClick={() => toggleMobileSection('instalacoes')}
                                  className="flex items-center justify-between w-full text-left md:pointer-events-none md:cursor-default py-1 focus:outline-none"
                               >
                                  <h3 className="font-display text-sm font-bold flex items-center gap-2 text-slate-800 uppercase tracking-wider">
                                     <Info size={16} className="text-gold shrink-0" />
                                     Instalações
                                  </h3>
                                  <span className="md:hidden text-slate-400">
                                     {activeMobileSections.instalacoes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </span>
                               </button>
                               <div className={`mt-3 ${activeMobileSections.instalacoes ? 'block' : 'hidden md:block'}`}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 animate-fadeIn">
                                     {property.instalacoes.map((item: string) => {
                                        const qtyObj = (property.instalacoes_objects || []).find(
                                          (o: any) => (o.label || o.nome) === item
                                        );
                                        const qty = qtyObj?.quantidade;
                                        return (
                                          <div key={item} className="flex items-center gap-2 text-xs text-slate-500">
                                             <div className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                                             <span className="truncate">{formatOptionWithQuantity(qtyObj || { label: item, quantidade: qty })}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                )}

                {/* Mobile Extra VIP CTA Call */}
                <div className="lg:hidden">
                  <div className="p-6 rounded-[2rem] bg-gold text-primary-black relative overflow-hidden group shadow-md space-y-3">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <h4 className="font-display font-black text-lg mb-1 relative z-10 block tracking-tight">VIP Curadoria Exclusiva</h4>
                    <p className="text-primary-black/75 text-xs mb-4 relative z-10 leading-relaxed font-semibold">Assine nossa curadoria VIP e receba portfólios seletos antes que cheguem a público.</p>
                    <Link to="/contato" className="bg-primary-black text-gold px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider inline-block relative z-10 active:scale-95 transition-transform shadow">
                      Consultoria Prime
                    </Link>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Sidebar Sticky / Mobile-Flex */}
              <aside className="property-sidebar">
              <div className="bg-white rounded-[2.5rem] border border-[#F1F5F9] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.06)] p-8 md:p-9 space-y-8 overflow-hidden relative">
                {/* Subtle Background Aura */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[55px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="relative z-10 space-y-6">
                    {isImovelAlugado(property) ? (
                      (isVendaAndLocacao || normBusiness === "Venda e Locação") && (property.priceVenda || property.valorVenda) ? (
                        <div className="space-y-6">
                           <div>
                              <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block mb-3.5">
                                 Alugado atualmente
                              </span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 mb-1">
                                 Venda
                              </p>
                              <h2 className="text-4xl font-display font-black text-[#0F172A] tracking-tight flex items-baseline">
                                <span className="text-xl font-bold text-gold mr-1">R$</span>
                                {formatCurrency(property.priceVenda || property.valorVenda || 0).replace('R$', '').trim()}
                              </h2>
                              <p className="text-xs text-slate-500 mt-3 leading-relaxed font-semibold">
                                Este imóvel encontra-se alugado atualmente, porém permanece disponível para aquisição.
                              </p>
                           </div>

                           {/* CTA button cluster */}
                           <div className="space-y-3">
                              <motion.a 
                                whileHover={{ scale: 1.01, y: -1 }}
                                whileTap={{ scale: 0.99 }}
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2.5 bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-2xl shadow-md hover:bg-emerald-600 transition-all w-full"
                              >
                                <MessageCircle size={20} />
                                Proposta de Compra
                              </motion.a>
                              <motion.a 
                                whileHover={{ scale: 1.01, y: -1 }}
                                whileTap={{ scale: 0.99 }}
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2.5 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-2xl shadow-md hover:bg-slate-800 transition-all w-full"
                              >
                                <MessageCircle size={20} className="text-gold" />
                                Falar no WhatsApp
                              </motion.a>
                           </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 space-y-2.5">
                              <div className="flex items-center gap-1.5">
                                 <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                 <span className="text-[9px] font-black text-amber-850 uppercase tracking-wider">Locação Prime</span>
                              </div>
                              <span className="text-base font-display font-black text-amber-900 uppercase tracking-tight block">ALUGADO / INDISPONÍVEL</span>
                              <p className="text-xs text-amber-800/80 leading-relaxed font-medium">Este imóvel já se encontra alugado e sob nosso portfólio de administração ativa. Valores de visitas e cotações de aluguel estão suspensos.</p>
                           </div>

                           <motion.a 
                             whileHover={{ scale: 1.01, y: -1 }}
                             whileTap={{ scale: 0.99 }}
                             href={whatsappUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-center gap-2.5 bg-emerald-505 bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-2xl shadow-md hover:bg-emerald-600 transition-all w-full"
                           >
                              <MessageCircle size={20} />
                              Falar na Administração
                            </motion.a>
                         </div>
                       )
                     ) : (
                       <div className="space-y-6">
                        {/* Standard pricing presentation */}
                        <div className="space-y-3">
                           {/* Venda / Venda e Locação - Valor de Venda */}
                           {(isVendaOnly || isVendaAndLocacao) && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 mb-1 bg-slate-100/10 inline-block px-1.5 py-0.5 rounded leading-none">
                                 Valor de Investimento / Venda
                               </p>
                               <h2 className="text-3xl font-display font-black text-primary-green tracking-tight flex items-baseline leading-none pt-1">
                                 <span className="text-lg font-bold text-gold mr-1">R$</span>
                                 {formatCurrency(property.priceVenda || property.valorVenda || 0).replace('R$', '').trim()}
                               </h2>
                             </div>
                           )}

                           {/* Locação / Venda e Locação - Valor de Aluguel */}
                           {(isLocacaoOnly || isVendaAndLocacao) && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 mb-1 bg-slate-100/10 inline-block px-1.5 py-0.5 rounded leading-none">
                                 {isVendaAndLocacao ? 'Valor Mensal' : 'Valor Mensal'}
                               </p>
                               <h2 className="text-3xl font-display font-black text-[#0F172A] tracking-tight flex items-baseline leading-none pt-1">
                                 <span className="text-lg font-bold text-gold mr-1">R$</span>
                                 {formatCurrency(totalMensalVal).replace('R$', '').trim()}
                                 <span className="text-xs font-semibold text-slate-400 ml-1"> / mês</span>
                               </h2>
                             </div>
                           )}
                        </div>
                        
                        {/* Package pricing (Locação) */}
                        {(isLocacaoOnly || isVendaAndLocacao) && totalMensalVal > 0 && (
                          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                             <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Pacote Comercial Mensal Total:</span>
                             <span className="text-sm font-display font-black text-emerald-600 leading-none">
                                {formatCurrency(totalMensalVal || 0)}
                             </span>
                          </div>
                        )}

                        {/* Cost breakdowns list */}
                        {(condoFeeVal > 0 || iptuVal > 0 || fireInsuranceVal > 0 || taxaLixoVal > 0 || taxaGasVal > 0 || taxaAguaVal > 0 || taxaLuzVal > 0 || outrasTaxasVal > 0) && (
                          <div className="bg-slate-50/50 rounded-2xl p-4.5 space-y-3 border border-slate-100 text-xs text-slate-500 font-medium animate-none">
                             {condoFeeVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Taxa de Condomínio</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(condoFeeVal)}</span>
                               </div>
                             )}
                             {iptuVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>IPTU Mensal</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(iptuVal)}</span>
                               </div>
                             )}
                             {taxaLixoVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Taxa de Lixo</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(taxaLixoVal)}</span>
                               </div>
                             )}
                             {taxaGasVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Taxa de Gás</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(taxaGasVal)}</span>
                               </div>
                             )}
                             {taxaAguaVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Taxa de Água</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(taxaAguaVal)}</span>
                               </div>
                             )}
                             {taxaLuzVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Taxa de Luz</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(taxaLuzVal)}</span>
                               </div>
                             )}
                             {fireInsuranceVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Seguro de Incêndio</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(fireInsuranceVal)}</span>
                               </div>
                             )}
                             {outrasTaxasVal > 0 && (
                               <div className="flex justify-between text-slate-500 font-medium animate-none">
                                  <span>Outras Taxas</span>
                                  <span className="font-extrabold text-slate-700">{formatCurrency(outrasTaxasVal)}</span>
                               </div>
                             )}
                          </div>

                        )}
                        {/* CTA button cluster */}
                        <div className="space-y-3">
                           <motion.a 
                             whileHover={{ scale: 1.01, y: -1 }}
                             whileTap={{ scale: 0.99 }}
                             href={whatsappUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center justify-center gap-2.5 bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-2xl shadow-md hover:bg-emerald-600 transition-all w-full"
                           >
                             <MessageCircle size={20} />
                             Falar no WhatsApp
                           </motion.a>
                           <motion.button 
                             whileHover={{ scale: 1.01, y: -1 }}
                             whileTap={{ scale: 0.99 }}
                             onClick={scrollToScheduler}
                             className="flex items-center justify-center gap-2.5 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider py-4.5 rounded-2xl shadow-md hover:bg-[#1E293B] transition-all w-full"
                           >
                             <Calendar size={18} className="text-gold" />
                             Agendar Visita
                           </motion.button>
                        </div>
                      </div>
                    )}

                    {/* Broker details section */}
                    {property.brokerName && (
                       <div className="pt-5 border-t border-slate-100 flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-gold border border-slate-100 flex items-center justify-center shadow-sm shrink-0 overflow-hidden relative">
                             {property.brokerPhoto ? (
                               <SafeImage src={property.brokerPhoto} alt={property.brokerName} className="w-full h-full object-cover" fallbackSrc="/placeholder-broker.png" />
                             ) : (
                               <span className="font-display font-black text-sm">{property.brokerName.charAt(0)}</span>
                             )}
                          </div>
                          <div className="min-w-0">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Especialista Responsável</span>
                             <p className="font-display font-bold text-slate-800 leading-tight text-sm truncate max-w-[170px]">{property.brokerName}</p>
                             {property.brokerCreci && <p className="text-[9px] text-gray-400 mt-0.5 leading-none">CRECI: {property.brokerCreci}</p>}
                          </div>
                       </div>
                    )}

                    {/* Exclusivity details */}
                    <div className="pt-5 border-t border-slate-100 flex items-center gap-4">
                       <div className="w-11 h-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0 p-1 overflow-hidden">
                          <SafeImage src={getSafeImageUrl(settings.aparencia.logoUrl)} alt="Logo" className="h-6 w-auto object-contain" fallbackSrc="/logo.png" />
                       </div>
                       <div className="min-w-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Intermediação</span>
                          <p className="font-display font-semibold text-slate-800 text-sm leading-tight truncate max-w-[170px]">{settings.empresa.nome}</p>
                       </div>
                    </div>

                    <p className="text-[9px] text-[#94A3B8] text-center font-medium leading-relaxed italic pt-2">
                       *Os preços e informações podem sofrer alterações sem prévio aviso.
                    </p>
                </div>
              </div>

              {/* Related/VIP Offer Box */}
              <motion.div 
                whileHover={{ y: -3 }}
                className="mt-6 p-8 rounded-[2.5rem] bg-gold text-primary-black relative overflow-hidden group shadow-lg"
              >
                 <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 blur-[35px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                 <h4 className="font-display font-bold text-lg mb-2 relative z-10">Buscando o Melhor?</h4>
                 <p className="text-primary-black/75 text-xs mb-6 relative z-10 leading-relaxed font-semibold">Assine nossa curadoria VIP e receba portfólios exclusivos antes de serem anunciados.</p>
                 <Link to="/contato" className="bg-primary-black text-gold px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider inline-block hover:scale-[1.03] active:scale-97 transition-all relative z-10 shadow-sm">
                   Consultoria Premium
                 </Link>
              </motion.div>
            </aside>
          </div>
        </div>

        {/* Visit Scheduler Section */}
        {(!isImovelAlugado(property) || (property.businessType === 'Venda e Locação' && property.priceVenda)) ? (
          <section id="agendamento" className="max-w-4xl mx-auto px-4 md:px-8 mt-16 md:mt-24">
             <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-[#F1F5F9] shadow-xl mb-12">
               <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
                 <h2 className="font-display text-2xl md:text-4xl font-black text-primary-black mb-3 tracking-tight">Agende sua Experiência VIP</h2>
                 <p className="text-slate-500 leading-relaxed text-sm font-medium">Selecione uma data e horário de sua preferência para realizar uma visita dirigida conduzida por um corretor especialista.</p>
                 {isImovelAlugado(property) && (
                   <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs font-semibold leading-relaxed">
                     Nota: Imóvel com locação em vigor. Visita programada será realizada exclusivamente para fins imobiliários direcionados à aquisição (venda).
                   </div>
                 )}
               </div>
               <VisitScheduler 
                 property={{
                   ...property,
                   brokerWhatsapp: resolvedWhatsappPhone || property.brokerWhatsapp || settings.empresa.whatsapp
                 }} 
               />
             </div>
          </section>
        ) : null}
      </div>
    </PageWrapper>
  );
}

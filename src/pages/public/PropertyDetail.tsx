import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
import { formatCurrency, isValidPublicProperty, cleanPhoneForWhatsapp } from '../../lib/utils';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const galleryImages = React.useMemo(() => {
    if (!property) return [];
    const images = [...(property.images || [])];
    const mainImg = property.mainImage;
    if (mainImg) {
      const index = images.indexOf(mainImg);
      if (index > -1) {
        images.splice(index, 1);
      }
      images.unshift(mainImg);
    }
    return images.filter(Boolean);
  }, [property]);

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const docSnap = await getDoc(doc(db, 'imoveis', id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Strict Validation (Block ghosts and unpublished)
            const p = { id: docSnap.id, ...data };
            if (isValidPublicProperty(p)) {
              setProperty(p);
            } else {
              console.warn("Property exists but is not valid for public view or is incomplete.");
              navigate('/imoveis');
            }
          } else {
            navigate('/imoveis');
          }
        } catch (error) {
          console.error("Error fetching detail:", error);
          navigate('/imoveis');
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, navigate]);

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
  
  if (!property) return null;

  const getWhatsAppUrl = () => {
    const rawPhone = property.brokerWhatsapp || settings.empresa.whatsapp;
    const cleanNumber = cleanPhoneForWhatsapp(rawPhone);
    // Use 55 as prefix if not already present
    const p = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const message = `Olá, tenho interesse neste imóvel: ${property.title || property.titulo || "Imóvel"} - Código: ${property.code || property.codigo || ""}. Pode me passar mais informações?`;
    return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  };

  const whatsappUrl = getWhatsAppUrl();

  return (
    <PageWrapper>
      <div className="bg-[#fcfcff] min-h-screen pb-20">
        {/* Navigation / Header */}
        <div className="bg-white border-b border-gray-100 py-4 mb-8">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
            <Link 
              to="/imoveis" 
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gold transition-colors"
            >
              <ArrowLeft size={16} /> Voltar para imóveis
            </Link>
            <div className="flex items-center gap-4">
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-all"
                title="Copiar link"
              >
                <Share2 size={18} />
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cod: {property.code}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Title & Location Header */}
          <div className="mb-6 lg:mb-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-primary-black text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                {property.businessType}
              </span>
              <span className="bg-gold/10 text-gold px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                {property.propertyType}
              </span>
              {property.statusImovel && (
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-auto lg:ml-2">
                  {property.statusImovel}
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-primary-black tracking-tight mb-4">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm md:text-base">
              <MapPin size={18} className="text-gold shrink-0" />
              <span>{property.neighborhood}, {property.city} - {property.state}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* LEFT COLUMN: Gallery & Details (65%) */}
            <div className="lg:col-span-8 space-y-10">
              {/* Gallery Section */}
              <div className="space-y-4">
                <div className="relative aspect-[16/10] md:aspect-video lg:h-[500px] rounded-[2.5rem] overflow-hidden bg-gray-100 group shadow-2xl border border-gray-100">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImage}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-full h-full"
                    >
                      <SafeImage
                        src={galleryImages[activeImage]}
                        alt={`${property.title} - Imagem ${activeImage + 1}`}
                        className="w-full h-full"
                      />
                    </motion.div>
                  </AnimatePresence>
                  
                  {galleryImages.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.preventDefault(); prevImage(); }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-gold hover:text-primary-black shadow-lg"
                      >
                        <ChevronLeft size={28} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); nextImage(); }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-gold hover:text-primary-black shadow-lg"
                      >
                        <ChevronRight size={28} />
                      </button>
                    </>
                  )}
                  
                  {/* Image Counter Overlay */}
                  <div className="absolute bottom-6 right-6 bg-primary-black/60 backdrop-blur-md text-white text-[10px] font-bold px-4 py-2 rounded-full border border-white/10">
                    {activeImage + 1} / {galleryImages.length}
                  </div>
                </div>

                {galleryImages.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`relative shrink-0 w-28 md:w-32 aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-300 ${activeImage === idx ? 'border-gold scale-105 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100'}`}
                      >
                        <SafeImage src={img} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

               {/* Mobile CTA (Hidden on Desktop) */}
              <div className="lg:hidden space-y-4">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-6">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Investimento</p>
                      <p className="text-4xl font-display font-bold text-primary-black tracking-tight">
                        {formatCurrency(property.businessType === 'Locação' ? property.priceLocacao : property.priceVenda)}
                        {property.businessType === 'Locação' && <span className="text-sm font-medium"> / mês</span>}
                      </p>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <a 
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 bg-emerald-500 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                     >
                       <MessageCircle size={20} /> Chamar no WhatsApp
                     </a>
                     <button 
                      onClick={scrollToScheduler}
                      className="flex items-center justify-center gap-3 bg-gold text-primary-black py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-gold/20 active:scale-95 transition-all"
                     >
                       <Calendar size={18} /> Agendar Visita
                     </button>
                   </div>
                </div>

                {/* Broker Mobile Card */}
                {property.brokerName && (
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-black text-gold flex items-center justify-center font-display font-bold text-xl shadow-md shrink-0 overflow-hidden">
                      {property.brokerPhoto ? <img src={property.brokerPhoto} alt={property.brokerName} className="w-full h-full object-cover" /> : property.brokerName.charAt(0)}
                    </div>
                    <div className="flex-grow">
                      <p className="text-[8px] font-black text-gold uppercase tracking-widest mb-0.5">Atendimento Exclusivo</p>
                      <h4 className="font-display font-bold text-primary-black leading-tight">{property.brokerName}</h4>
                      {property.brokerCreci && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{property.brokerCreci}</p>}
                    </div>
                    <a 
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-50 text-emerald-500 rounded-xl hover:bg-emerald-50 transition-colors"
                    >
                      <MessageCircle size={20} />
                    </a>
                  </div>
                )}
              </div>

              {/* Main Content Card */}
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm space-y-16">
                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                     {[
                       { icon: Maximize, value: `${property.usefulArea || 0}m²`, label: 'Área Útil' },
                       { icon: Grid, value: `${property.areaConstruida || 0}m²`, label: 'Área Construída' },
                       { icon: Bed, value: property.bedrooms, label: 'Dormitórios' },
                       { icon: Bath, value: property.bathrooms || property.suites || '-', label: 'Banheiros' },
                       { icon: Car, value: property.garageSpaces, label: 'Vagas' },
                       { 
                         icon: Layers, 
                         value: property.businessType === 'Locação' 
                           ? (property.valorMetroQuadradoLocacao > 0 ? `${formatCurrency(property.valorMetroQuadradoLocacao)}/m²` : '-')
                           : (property.valorMetroQuadrado > 0 ? `${formatCurrency(property.valorMetroQuadrado)}/m²` : '-'), 
                         label: 'Valor p/ m²' 
                       },
                     ].map((item, i) => (
                       <div key={i} className="flex flex-col items-center text-center p-6 rounded-3xl bg-gray-50/50 border border-transparent hover:border-gold/10 hover:bg-white hover:shadow-xl transition-all duration-300">
                         <item.icon size={28} className="text-gold mb-4" />
                         <span className="text-xl font-display font-bold text-primary-black mb-1">{item.value}</span>
                         <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none">{item.label}</span>
                       </div>
                     ))}
                  </div>

                 {/* Building Name */}
                 {property.buildingName && (
                   <div className="flex items-center gap-5 p-6 bg-primary-black/5 rounded-[1.5rem]">
                     <div className="w-14 h-14 rounded-2xl bg-primary-black text-gold flex items-center justify-center shrink-0 shadow-lg">
                       <Layers size={24} />
                     </div>
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Edifício / Condomínio</span>
                       <span className="font-display text-xl font-bold text-primary-black leading-tight">{property.buildingName}</span>
                     </div>
                   </div>
                 )}

                 {/* Rental Details */}
                 {property.businessType === 'Locação' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-emerald-50/20 rounded-[2rem] border border-emerald-100/30">
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 shrink-0">
                         <ShieldCheck size={20} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Garantia</span>
                         <span className="font-bold text-primary-black text-sm">{property.leaseWarrantyType || 'A consultar'}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 shrink-0">
                         <FileText size={20} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prazo Mínimo</span>
                         <span className="font-bold text-primary-black text-sm">{property.minLeaseTerm || '12 meses'}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 shrink-0">
                         <PawPrint size={20} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pets</span>
                         <span className="font-bold text-primary-black text-sm">{property.allowsPet ? 'Aceita animais' : 'Não aceita'}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50 shrink-0">
                         <Armchair size={20} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobília</span>
                         <span className="font-bold text-primary-black text-sm">{property.furnishingStatus || 'Sem mobília'}</span>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Description Section */}
                 <div className="space-y-6">
                    <h2 className="font-display text-3xl font-bold text-primary-black flex items-center gap-4">
                      <div className="w-1.5 h-8 bg-gold rounded-full" />
                      Sobre o Imóvel
                    </h2>
                    <p className="text-gray-500 leading-[1.8] whitespace-pre-line text-lg font-light">
                      {property.fullDescription || property.shortDescription}
                    </p>
                 </div>

                 {/* Details Sections */}
                 <div className="space-y-12">
                    {/* Features & Finishings Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                       {property.caracteristicas?.length > 0 && (
                         <div className="space-y-6">
                           <h3 className="font-display text-xl font-bold flex items-center gap-3 text-primary-black">
                             <Sparkles size={22} className="text-gold" />
                             Características
                           </h3>
                           <div className="grid grid-cols-1 gap-4">
                             {property.caracteristicas.map((char: string) => (
                               <div key={char} className="flex items-start gap-4 text-sm text-gray-500 group">
                                 <Check size={18} className="text-gold shrink-0 mt-0.5" />
                                 <span className="group-hover:text-primary-black transition-colors">{char}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {property.acabamentos?.length > 0 && (
                         <div className="space-y-6">
                           <h3 className="font-display text-xl font-bold flex items-center gap-3 text-primary-black">
                             <Target size={22} className="text-gold" />
                             Acabamentos
                           </h3>
                           <div className="flex flex-wrap gap-2">
                             {property.acabamentos.map((item: string) => (
                               <span key={item} className="bg-gray-50 px-4 py-2 rounded-xl text-[11px] font-bold text-gray-400 border border-gray-100 hover:border-gold hover:text-gold transition-all">
                                 {item}
                               </span>
                             ))}
                           </div>
                         </div>
                       )}
                    </div>

                    {/* Leisure & Facilities Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                       {property.lazer?.length > 0 && (
                         <div className="space-y-6">
                           <h3 className="font-display text-xl font-bold flex items-center gap-3 text-primary-black">
                             <Layers size={22} className="text-gold" />
                             Área de Lazer
                           </h3>
                           <div className="grid grid-cols-1 gap-4">
                             {property.lazer.map((item: string) => (
                               <div key={item} className="flex items-center gap-4 text-sm text-gray-500 group">
                                 <div className="w-2 h-2 rounded-full bg-gold/30 group-hover:bg-gold transition-all shrink-0" />
                                 <span className="group-hover:text-primary-black transition-colors">{item}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {property.instalacoes?.length > 0 && (
                         <div className="space-y-6">
                           <h3 className="font-display text-xl font-bold flex items-center gap-3 text-primary-black">
                             <Info size={22} className="text-gold" />
                             Instalações
                           </h3>
                           <div className="grid grid-cols-1 gap-3">
                             {property.instalacoes.map((item: string) => (
                               <div key={item} className="flex items-center gap-3 text-sm text-gray-500">
                                 <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                 {item}
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Desktop Sidebar Sticky (35%) */}
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-28">
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.08)] p-10 space-y-10 overflow-hidden relative">
                {/* Subtle Background Decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 space-y-12">
                   {/* Main Pricing */}
                   <div>
                      <p className="text-[10px] font-black text-gray-400 opacity-60 uppercase tracking-[0.4em] mb-3 pl-1">
                        Valor de {property.businessType}
                      </p>
                      <h2 className="text-5xl font-display font-bold text-primary-black tracking-tighter flex items-start gap-1">
                        <span className="text-2xl mt-1.5 font-bold text-gold">R$</span>
                        {formatCurrency(property.businessType === 'Locação' ? property.priceLocacao : property.priceVenda).replace('R$', '').trim()}
                        {property.businessType === 'Locação' && <span className="text-sm font-medium self-end mb-2 ml-1 text-gray-400">/ mês</span>}
                      </h2>
                      {property.businessType === 'Locação' && property.totalMonthlyPrice && (
                        <div className="mt-6 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none">Pacote Mensal Total</span>
                          </div>
                          <p className="text-2xl font-display font-bold text-emerald-600 leading-none">
                            {formatCurrency(property.totalMonthlyPrice)}
                          </p>
                        </div>
                      )}
                      {property.businessType === 'Venda' && property.priceLocacao && (
                        <div className="mt-4 flex items-center justify-between text-gray-400 border-t border-gray-50 pt-4">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Valor Locação:</span>
                          <span className="font-bold text-primary-black">{formatCurrency(property.priceLocacao)}</span>
                        </div>
                      )}
                   </div>

                   {/* Secondary Costs Card */}
                   {(property.condoFee || property.iptu || property.fireInsurance) && (
                     <div className="bg-gray-50/50 rounded-2xl p-6 space-y-4 border border-gray-100">
                        {property.condoFee && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condomínio</span>
                            <span className="font-bold text-primary-black text-sm">{formatCurrency(property.condoFee)}</span>
                          </div>
                        )}
                        {property.iptu && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{property.businessType === 'Locação' ? 'IPTU (Mensal)' : 'IPTU (Anual)'}</span>
                            <span className="font-bold text-primary-black text-sm">{formatCurrency(property.iptu)}</span>
                          </div>
                        )}
                        {property.fireInsurance && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seguro Incêndio</span>
                            <span className="font-bold text-primary-black text-sm">{formatCurrency(property.fireInsurance)}</span>
                          </div>
                        )}
                     </div>
                   )}

                   {/* CTA Actions */}
                   <div className="space-y-5">
                      <motion.a 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-4 bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest py-6 rounded-2xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all w-full"
                      >
                        <MessageCircle size={22} />
                        Chamar no WhatsApp
                      </motion.a>
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={scrollToScheduler}
                        className="flex items-center justify-center gap-4 bg-primary-black text-white font-black text-[11px] uppercase tracking-widest py-6 rounded-2xl shadow-xl shadow-black/10 hover:bg-black/90 transition-all w-full"
                      >
                        <Calendar size={20} className="text-gold" />
                        Agendar Visita
                      </motion.button>
                   </div>

                   {/* Broker Desktop Card */}
                   {property.brokerName && (
                     <div className="pt-8 border-t border-gray-50 space-y-4">
                        <p className="text-[9px] font-black text-gray-400 opacity-60 uppercase tracking-[0.4em] mb-2 pl-1">
                          Especialista Responsável
                        </p>
                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50/50 border border-gray-100 group hover:border-gold/30 hover:bg-white transition-all duration-300">
                          <div className="w-14 h-14 rounded-2xl bg-primary-black text-gold flex items-center justify-center font-display font-bold text-xl shadow-md shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            {property.brokerPhoto ? <img src={property.brokerPhoto} alt={property.brokerName} className="w-full h-full object-cover" /> : property.brokerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display font-bold text-primary-black text-lg leading-tight truncate">{property.brokerName}</h4>
                            {property.brokerCreci && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{property.brokerCreci}</p>}
                          </div>
                        </div>
                     </div>
                   )}

                   {/* Agency Info */}
                   <div className="pt-8 border-t border-gray-100 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                        <img 
                          src={settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
                          alt="Agency Logo" 
                          className="h-7 w-auto grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Exclusividade</p>
                        <p className="font-display font-bold text-primary-black text-lg leading-tight">{settings.empresa.nome}</p>
                      </div>
                   </div>

                   <p className="text-[9px] text-gray-400 text-center font-medium leading-relaxed italic opacity-70">
                     *As informações estão sujeitas a alterações. Consulte um de nossos especialistas para confirmações atualizadas.
                   </p>
                </div>
              </div>

              {/* Related/VIP Offer Box */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="mt-8 p-10 rounded-[3rem] bg-gold text-primary-black relative overflow-hidden group shadow-2xl shadow-gold/20"
              >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                 <h4 className="font-display font-bold text-2xl mb-3 relative z-10">Buscando o Melhor?</h4>
                 <p className="text-primary-black/70 text-sm mb-8 relative z-10 leading-relaxed">Assine nossa curadoria VIP e receba imóveis exclusivos antes mesmo de chegarem ao portal.</p>
                 <Link to="/contato" className="bg-primary-black text-gold px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] inline-block hover:scale-105 active:scale-95 transition-all relative z-10">
                   Consultoria Black
                 </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Visit Scheduler Section */}
        <section id="agendamento" className="max-w-4xl mx-auto px-4 md:px-8 mt-32">
           <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-gray-100 shadow-2xl mb-12">
             <div className="text-center max-w-2xl mx-auto mb-12">
               <h2 className="font-display text-4xl font-bold text-primary-black mb-4 tracking-tight">Agende sua Experiência</h2>
               <p className="text-gray-400 leading-relaxed font-medium">Selecione uma data e horário que melhor atendam sua agenda para uma visita guiada e exclusiva.</p>
             </div>
             <VisitScheduler 
               property={{
                 ...property,
                 brokerWhatsapp: property.brokerWhatsapp || settings.empresa.whatsapp
               }} 
             />
           </div>
        </section>
      </div>
    </PageWrapper>
  );
}

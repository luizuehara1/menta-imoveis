import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import VisitScheduler from '../../components/public/VisitScheduler';
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
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageWrapper from '../../components/PageWrapper';
import { staggerContainer, slideUp, fadeIn } from '../../constants/animations';
import { GoldenParticles } from '../../components/three/GoldenParticles';
import { Canvas } from '@react-three/fiber';
import { LuxuryShapeCanvas } from '../../components/three/AbstractLuxuryShape';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const scrollToScheduler = () => {
    const element = document.getElementById('agendamento');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const docSnap = await getDoc(doc(db, 'imoveis', id));
          if (docSnap.exists()) {
            setProperty({ id: docSnap.id, ...docSnap.data() });
          } else {
            navigate('/imoveis');
          }
        } catch (error) {
          console.error("Error fetching detail:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, navigate]);

  const nextImage = () => {
    if (!property?.images) return;
    setActiveImage((activeImage + 1) % property.images.length);
  };

  const prevImage = () => {
    if (!property?.images) return;
    setActiveImage((activeImage - 1 + property.images.length) % property.images.length);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">Consultando acervo exclusivo...</p>
    </div>
  );
  
  if (!property) return null;

  return (
    <PageWrapper>
      <div className="bg-white">
        {/* Navigation Bar */}
        <div className="bg-gray-50 py-4 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
             <motion.button 
               whileHover={{ x: -5 }}
               onClick={() => navigate('/imoveis')}
               className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-black transition-colors"
             >
               <ArrowLeft size={16} /> Voltar para lista
             </motion.button>
             <div className="flex items-center gap-6">
               <motion.button whileHover={{ scale: 1.1, rotate: 10 }} className="p-2 hover:bg-gray-200 rounded-xl transition-all"><Share2 size={18} /></motion.button>
               <div className="h-4 w-px bg-gray-200" />
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">COD: {property.code}</span>
             </div>
          </div>
        </div>

        {/* Hero Image Gallery */}
        <section className="relative h-[70vh] md:h-[85vh] bg-primary-black overflow-hidden group">
           <div className="h-full w-full relative">
              {/* Three.js Subtle Layer */}
              <div className="absolute inset-0 z-10 pointer-events-none opacity-40">
                <Canvas camera={{ position: [0, 0, 5] }} gl={{ alpha: true }}>
                  <GoldenParticles count={40} size={0.04} speed={0.1} />
                </Canvas>
              </div>

              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                  src={property.images?.[activeImage] || property.mainImage} 
                  alt={property.title} 
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              
              {/* Gradient Overlays */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-primary-black/90 via-primary-black/40 to-transparent pointer-events-none" />

              {/* Gallery Navigation */}
              <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none">
                 <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevImage} className="pointer-events-auto w-20 h-20 rounded-full bg-white/5 backdrop-blur-2xl text-white flex items-center justify-center hover:bg-gold hover:text-primary-black transition-all border border-white/10 group/btn -translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-700 ease-out"
                 >
                    <ChevronLeft size={32} className="transition-transform group-hover/btn:-translate-x-1" />
                 </motion.button>
                 <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextImage} className="pointer-events-auto w-20 h-20 rounded-full bg-white/5 backdrop-blur-2xl text-white flex items-center justify-center hover:bg-gold hover:text-primary-black transition-all border border-white/10 group/btn translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 duration-700 ease-out"
                 >
                    <ChevronRight size={32} className="transition-transform group-hover/btn:translate-x-1" />
                 </motion.button>
              </div>
              
              {/* Info Floating */}
              <div className="absolute bottom-16 left-8 right-8 md:left-16 md:right-16 flex flex-col md:flex-row md:items-end justify-between gap-10">
                 <div className="max-w-4xl">
                    <motion.div 
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="flex items-center gap-3 mb-8"
                    >
                      <motion.span variants={slideUp} className="bg-gold text-primary-black px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-2xl">
                        {property.businessType}
                      </motion.span>
                      <motion.span variants={slideUp} className="bg-white/10 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-xl border border-white/10">
                        {property.propertyType}
                      </motion.span>
                    </motion.div>
                    <motion.h1 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="font-display text-5xl md:text-8xl font-bold text-white tracking-tighter leading-[0.85]"
                    >
                      {property.title}
                    </motion.h1>
                 </div>
                 
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.8, type: "spring", damping: 20 }}
                   className="shrink-0"
                 >
                    <div className="bg-white p-10 rounded-[3rem] border border-gold/20 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)] relative overflow-hidden group/price">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-2xl rounded-full" />
                       <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 pl-1">Preço de Oportunidade</p>
                       <p className="text-5xl font-display font-bold text-primary-green tracking-tighter group-hover/price:scale-105 transition-transform duration-500">
                         <span className="text-2xl mr-1 font-black opacity-30 text-primary-black">R$</span>
                         {(property.businessType === 'Venda' ? property.priceVenda : property.priceLocacao)?.toLocaleString('pt-BR')}
                       </p>
                    </div>
                 </motion.div>
              </div>

              {/* Counter */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                 {property.images?.map((_: any, idx: number) => (
                   <button 
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`h-1.5 rounded-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeImage === idx ? 'w-12 bg-gold shadow-[0_0_15px_rgba(229,188,83,0.8)]' : 'w-3 bg-white/20 hover:bg-white/40'}`} 
                   />
                 ))}
              </div>
           </div>
        </section>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-32">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
              {/* Left Column: Details */}
              <div className="lg:col-span-2 space-y-24">
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                 >
                    <div className="flex items-center gap-3 text-gold font-black text-[11px] uppercase tracking-[0.4em] mb-8 pl-1">
                       <MapPin size={22} className="animate-bounce" />
                       <span>{property.neighborhood}, {property.city} • {property.state}</span>
                    </div>
                    <p className="text-gray-400 text-3xl font-light leading-relaxed tracking-tight italic">
                      "{property.shortDescription}"
                    </p>
                 </motion.div>

                 {/* Stats Grid */}
                 <motion.div 
                   variants={staggerContainer}
                   initial="initial"
                   whileInView="animate"
                   viewport={{ once: true }}
                   className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-gray-100"
                 >
                    {[
                      { icon: Bed, value: property.bedrooms, label: 'Dormitórios' },
                      { icon: Check, value: property.suites, label: 'Suítes' },
                      { icon: Car, value: property.garageSpaces, label: 'Vagas' },
                      { icon: Maximize, value: property.usefulArea, label: 'm² Úteis' },
                    ].map((stat, idx) => (
                      <motion.div key={idx} variants={slideUp} className="flex flex-col items-center text-center p-6 bg-gray-50/50 rounded-3xl border border-transparent hover:border-gold/10 hover:bg-white hover:shadow-xl transition-all group">
                         <stat.icon size={36} className="text-gold mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                         <span className="text-3xl font-display font-bold text-primary-black mb-1">{stat.value}</span>
                         <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stat.label}</span>
                      </motion.div>
                    ))}
                 </motion.div>

                 {/* Description */}
                 <motion.div 
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   className="space-y-8 relative"
                 >
                   <div className="absolute -top-10 -right-20 opacity-10 pointer-events-none hidden xl:block">
                     <LuxuryShapeCanvas size={0.8} color="#003030" />
                   </div>
                    <h3 className="text-3xl font-display font-bold text-primary-black flex items-center gap-4 tracking-tight">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><Info size={24} className="text-gold" /></div>
                      Descrição do Imóvel
                    </h3>
                    <div className="text-gray-500 leading-[1.8] whitespace-pre-line space-y-4 text-lg font-light pr-12">
                       {property.fullDescription}
                    </div>
                 </motion.div>

                 {/* Features - Checklist */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {property.caracteristicas?.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                      >
                        <h4 className="font-display text-xl font-bold flex items-center gap-3 tracking-tighter">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0"><Sparkles size={18} className="text-gold" /></div>
                          Características
                        </h4>
                        <div className="grid grid-cols-1 gap-4 pl-1">
                          {property.caracteristicas.map((feat: string) => (
                            <div key={feat} className="flex items-center gap-4 text-sm text-gray-500 group/feat">
                               <div className="w-2 h-2 rounded-full bg-gold/30 group-hover/feat:bg-gold transition-colors shrink-0" />
                               <span className="group-hover/feat:text-primary-black transition-colors">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {property.lazer?.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-8"
                      >
                        <h4 className="font-display text-xl font-bold flex items-center gap-3 tracking-tighter">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0"><Layers size={18} className="text-gold" /></div>
                          Lazer & Condomínio
                        </h4>
                        <div className="grid grid-cols-1 gap-4 pl-1">
                          {property.lazer.map((feat: string) => (
                            <div key={feat} className="flex items-center gap-4 text-sm text-gray-500 group/feat">
                               <div className="w-2 h-2 rounded-full bg-gold/30 group-hover/feat:bg-gold transition-colors shrink-0" />
                               <span className="group-hover/feat:text-primary-black transition-colors">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                 </div>
              </div>

              {/* Right Column: Pricing & Contact */}
              <div className="relative">
                 <motion.div 
                   initial={{ opacity: 0, x: 40 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="lg:sticky lg:top-32 space-y-10"
                 >
                    <div className="bg-primary-black text-white p-10 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden relative border border-white/5">
                       {/* Decorative Gradient */}
                       <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                       
                       <div className="relative z-10 space-y-10">
                          <div>
                             <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-3">Valor de {property.businessType}</span>
                             <h2 className="text-5xl font-display font-bold text-gold tracking-tighter">
                               <span className="text-2xl mr-1 font-black opacity-30 text-white">R$</span>
                               {(property.businessType === 'Venda' ? property.priceVenda : property.priceLocacao)?.toLocaleString('pt-BR')}
                             </h2>
                          </div>

                          <div className="space-y-4 pt-10 border-t border-white/10">
                             {property.condoFee && (
                               <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                  <span className="text-gray-500">Condomínio</span>
                                  <span className="text-white">R$ {property.condoFee.toLocaleString('pt-BR')}</span>
                               </div>
                             )}
                             {property.iptu && (
                               <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                  <span className="text-gray-500">IPTU Anual</span>
                                  <span className="text-white">R$ {property.iptu.toLocaleString('pt-BR')}</span>
                               </div>
                             )}
                          </div>

                          <div className="pt-6 space-y-5">
                             <motion.button 
                               whileHover={{ scale: 1.03, y: -2 }}
                               whileTap={{ scale: 0.98 }}
                               onClick={scrollToScheduler}
                               className="w-full btn-gold !py-5 shadow-2xl shadow-gold/20 !rounded-2xl !text-[11px] font-black uppercase tracking-widest"
                             >
                               <Calendar size={20} />
                               Agendar Visita
                             </motion.button>
                             <motion.a 
                               whileHover={{ scale: 1.03, y: -2 }}
                               whileTap={{ scale: 0.98 }}
                               href={`https://wa.me/5547992914069?text=Olá, tenho interesse no imóvel código ${property.code}. Gostaria de mais informações.`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="w-full border-2 border-emerald-500/30 text-emerald-500 font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-xl shadow-emerald-500/5 group"
                             >
                               <MessageCircle size={22} className="group-hover:animate-bounce" />
                               WhatsApp Oficial
                             </motion.a>
                          </div>
                          
                          <p className="text-[10px] text-gray-500 text-center font-medium opacity-60">
                            *Valores sujeitos a alteração sem aviso prévio.
                          </p>
                       </div>
                    </div>

                    {/* Broker Card Small */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex items-center gap-6 group cursor-pointer"
                    >
                       <div className="w-20 h-20 rounded-[1.5rem] bg-primary-black text-gold flex items-center justify-center font-display font-bold text-3xl shrink-0 group-hover:rotate-6 transition-transform shadow-xl">
                          M
                       </div>
                       <div>
                          <h4 className="font-display font-bold text-xl text-primary-black leading-none mb-1">Menta Negócios</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Imobiliária Responsável</p>
                          <div className="h-0.5 w-8 bg-gold mt-3 group-hover:w-full transition-all duration-500" />
                       </div>
                    </motion.div>
                 </motion.div>
              </div>
           </div>
        </div>

        {/* Visit Scheduler Section */}
        <VisitScheduler property={property} />

      </div>
    </PageWrapper>
  );
}

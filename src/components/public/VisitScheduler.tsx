import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isBefore, 
  startOfToday, 
  getDay, 
  addDays, 
  isAfter,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  runTransaction,
  doc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { cleanPhoneForWhatsapp } from '../../lib/utils';

interface VisitSchedulerProps {
  property: {
    id: string;
    code: string;
    title: string;
    city: string;
    neighborhood: string;
    state?: string;
    businessType?: string;
    address?: string;
    brokerWhatsapp?: string;
    slug?: string;
  };
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function VisitScheduler({ property }: VisitSchedulerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); 
  
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === 2026) {
      setCurrentMonth(today);
    } else if (today.getFullYear() < 2026) {
      setCurrentMonth(new Date(2026, 0, 1));
    } else {
      setCurrentMonth(today);
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [bookedHours, setBookedHours] = useState<string[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nomeCliente: '',
    telefone: '',
    email: '',
    mensagem: ''
  });

  useEffect(() => {
    if (selectedDate) {
      fetchBookedHours(selectedDate);
    }
  }, [selectedDate, property.id]);

  const fetchBookedHours = async (date: Date) => {
    setLoadingHours(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const q = query(
        collection(db, 'visitas'),
        where('imovelId', '==', property.id),
        where('data', '==', dateStr)
      );
      const snap = await getDocs(q);
      const booked = snap.docs
        .filter(doc => doc.data().status !== 'cancelada')
        .map(doc => doc.data().horario);
      setBookedHours(booked);
    } catch (err) {
      console.error("Error fetching booked hours:", err);
    } finally {
      setLoadingHours(false);
    }
  };

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (prev.getFullYear() >= 2026 || (new Date()).getFullYear() >= 2026) {
        setCurrentMonth(prev);
    }
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (next.getFullYear() <= 2026) {
        setCurrentMonth(next);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const startDay = getDay(days[0]);
  const blanks = Array(startDay).fill(null);

  const isDayDisabled = (day: Date) => {
    const today = startOfToday();
    return isBefore(day, today) || day.getFullYear() !== 2026;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 8. FORM VALIDATION
    if (!formData.nomeCliente || !formData.nomeCliente.trim()) {
      setError("Por favor, preencha o seu nome.");
      return;
    }
    if (!formData.telefone || !formData.telefone.trim()) {
      setError("Por favor, preencha o seu telefone.");
      return;
    }
    if (!selectedDate) {
      setError("Por favor, selecione uma data.");
      return;
    }
    if (!selectedHour) {
      setError("Por favor, selecione um horário.");
      return;
    }
    if (!property || !property.id) {
      setError("Erro interno: ID do imóvel é obrigatório.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // 5. IMÓVEL LINK
    const linkImovel = `${window.location.origin}/imovel/${property.id}`;
    const brokerId = (property as any).brokerId || (property as any).corretorId || (property as any).corretorResponsavel?.id || (property as any).broker?.id || "";
    const brokerName = (property as any).brokerName || (property as any).corretorResponsavel?.nome || (property as any).corretorNome || "";

    // 4. VISIT DATA
    const visitData: any = {
      // Standard local fields
      nomeCliente: formData.nomeCliente.trim(),
      telefone: formData.telefone.trim(),
      email: formData.email?.trim() || "",
      imovelId: property.id,
      codigoImovel: property.code || (property as any).codigo || "",
      tituloImovel: property.title || (property as any).nome || "Imóvel",
      cidade: property.city || "",
      bairro: property.neighborhood || "",
      data: dateStr,
      horario: selectedHour,
      mensagem: formData.mensagem?.trim() || "",
      status: "Pendente",
      createdAt: serverTimestamp(),

      // Explicitly requested simple fields
      imovelTitulo: property.title || (property as any).nome || "Imóvel",
      imovelCodigo: property.code || (property as any).codigo || "",
      linkImovel: linkImovel,
      corretorId: brokerId,
      corretorNome: brokerName,
      clienteNome: formData.nomeCliente.trim(),
      clienteTelefone: formData.telefone.trim(),
      clienteEmail: formData.email?.trim() || "",
      dataVisita: dateStr,
      horarioVisita: selectedHour,
      observacao: formData.mensagem?.trim() || "",
      origem: "site",
      criadoEm: serverTimestamp()
    };

    if (property.address) {
      visitData.endereco = property.address;
    }

    try {
      // Check if already booked (wrapped in try/catch to gracefully handle limited public read permissions)
      let isAlreadyBooked = false;
      try {
        const q = query(
          collection(db, 'visitas'),
          where('imovelId', '==', property.id),
          where('data', '==', dateStr),
          where('horario', '==', selectedHour)
        );
        const existingDocs = await getDocs(q);
        isAlreadyBooked = existingDocs.docs.some(doc => doc.data().status !== 'cancelada');
      } catch (readErr) {
        console.warn("Could not check duplicate bookings due to restricted read permissions. Proceeding anyway.", readErr);
      }
      
      if (isAlreadyBooked) {
        throw new Error("Esse horário acabou de ser reservado. Escolha outro horário.");
      }

      // 9. LOG ATTEMPT TO SAVE
      console.log("Tentando salvar visita:", visitData);

      await addDoc(collection(db, 'visitas'), visitData);

      setSuccess(true);
      
      // 6. WHATSAPP REDIRECT AFTER SAVING SUCCESS
      const brokerPhone = property.brokerWhatsapp || "";
      const cleanPhone = cleanPhoneForWhatsapp(brokerPhone);
      const p = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      
      if (cleanPhone) {
        const message = `Olá! Solicitei uma visita para este imóvel:

Imóvel: ${property.title || "Imóvel"}
Código: ${property.code || "Não informado"}
Data: ${dateStr}
Horário: ${selectedHour}

Link do imóvel:
${linkImovel}

Meus dados:
Nome: ${formData.nomeCliente.trim()}
Telefone: ${formData.telefone.trim()}
E-mail: ${formData.email?.trim() || "Não informado"}`;

        const whatsappUrl = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
        
        // Brief delay to show success state before redirecting
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 1500);
      }

      setFormData({ nomeCliente: '', telefone: '', email: '', mensagem: '' });
      setSelectedDate(null);
      setSelectedHour(null);
    } catch (err: any) {
      // 9. CLEAR ERRORS IN THE CONSOLE
      console.error("Erro ao salvar visita:", err);
      if (err && typeof err === 'object') {
        console.error("Código:", err.code);
        console.error("Mensagem:", err.message);
      }
      setError("Erro ao solicitar visita. Tente novamente ou chame no WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="py-32 px-4 bg-gray-50 flex items-center justify-center">
        <motion.div 
          {...scaleIn}
          className="bg-white rounded-[3rem] p-16 text-center shadow-[0_60px_100px_-20px_rgba(0,0,0,0.1)] border border-gold/10 max-w-2xl mx-auto relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, delay: 0.2 }}
            className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200"
          >
             <Check size={48} />
          </motion.div>
          <h3 className="text-4xl font-display font-bold text-primary-black mb-6 tracking-tighter">Visita solicitada com sucesso!</h3>
          <p className="text-gray-400 text-lg font-light mb-12 leading-relaxed">Sua solicitação foi recebida. Um de nossos especialistas entrará em contato em breve para confirmar o agendamento.</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSuccess(false)}
            className="btn-gold !rounded-2xl !py-5 !px-12 !text-xs font-black uppercase tracking-widest shadow-xl shadow-gold/20"
          >
            Agendar outra visita
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <section id="agendamento" className="py-32 bg-gray-50 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-gold font-black tracking-[0.5em] uppercase text-[10px] mb-4 block animate-pulse">Experiência VIP</span>
          <h2 className="text-5xl font-display font-bold text-primary-black tracking-tight">Agende seu horário exclusivo</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 md:grid-cols-2"
        >
          {/* Calendar & Hours Column */}
          <div className="p-10 md:p-14 bg-primary-black text-white border-r border-white/5 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <h4 className="font-display text-xl font-bold flex items-center gap-3 tracking-tight">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><CalendarIcon size={22} className="text-gold" /></div>
                  1. Selecione a Data
                </h4>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handlePrevMonth} className="p-3 hover:bg-white/10 rounded-xl transition-all border border-white/5"><ChevronLeft size={20} /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNextMonth} className="p-3 hover:bg-white/10 rounded-xl transition-all border border-white/5"><ChevronRight size={20} /></motion.button>
                </div>
              </div>

              <div className="mb-10">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentMonth.toISOString()}
                    {...fadeIn}
                    className="text-center mb-6 font-display font-bold text-gold uppercase tracking-[0.2em] text-sm"
                  >
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </motion.div>
                </AnimatePresence>
                
                <div className="grid grid-cols-7 gap-2 text-center mb-4">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                    <div key={d} className="text-[9px] font-black text-gray-600 tracking-widest">{d}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {blanks.map((_, i) => <div key={`b-${i}`} />)}
                  {days.map((day, idx) => {
                    const disabled = isDayDisabled(day);
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <motion.button
                        key={day.toISOString()}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(day);
                          setSelectedHour(null);
                          setError(null);
                        }}
                        className={`
                          aspect-square flex items-center justify-center text-xs rounded-xl transition-all font-bold
                          ${disabled ? 'text-gray-800 cursor-not-allowed opacity-30 italic' : 'hover:bg-gold hover:text-primary-black hover:scale-110'}
                          ${selected ? 'bg-gold text-primary-black scale-110 shadow-2xl shadow-gold/30 ring-4 ring-gold/10' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedDate && (
                  <motion.div 
                    {...slideUp}
                    className="space-y-8 pt-10 border-t border-white/5"
                  >
                    <h4 className="font-display text-xl font-bold flex items-center gap-3 tracking-tight">
                      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><Clock size={22} className="text-gold" /></div>
                      2. Horário
                    </h4>
                    
                    {loadingHours ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 size={32} className="animate-spin text-gold" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Verificando Agenda...</span>
                      </div>
                    ) : (
                      <motion.div 
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-3 gap-3"
                      >
                        {HOURS.map(hour => {
                          const isBooked = bookedHours.includes(hour);
                          const selected = selectedHour === hour;
                          return (
                            <motion.button
                              key={hour}
                              variants={slideUp}
                              disabled={isBooked}
                              onClick={() => {
                                setSelectedHour(hour);
                                setError(null);
                              }}
                              className={`
                                py-4 px-2 rounded-2xl text-[11px] font-black transition-all border tracking-widest
                                ${isBooked 
                                  ? 'bg-gray-900/50 border-white/5 text-gray-700 cursor-not-allowed' 
                                  : selected 
                                    ? 'bg-gold border-gold text-primary-black shadow-2xl shadow-gold/20 scale-105' 
                                    : 'bg-white/5 border-white/10 text-white hover:border-gold/50 hover:bg-white/10'
                                }
                              `}
                            >
                              {hour}
                              {isBooked && <span className="block text-[8px] mt-1 opacity-40">INDISPONÍVEL</span>}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Form Column */}
          <div className="p-10 md:p-14 flex flex-col">
            <h4 className="font-display text-xl font-bold text-primary-black mb-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0"><Sparkles size={22} className="text-gold" /></div>
              3. Seus Dados de Contato
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Nome Completo</label>
                <input 
                  type="text" required 
                  className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                  value={formData.nomeCliente} onChange={e => setFormData({...formData, nomeCliente: e.target.value})}
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">WhatsApp</label>
                  <input 
                    type="tel" required 
                    className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                    value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">E-mail</label>
                  <input 
                    type="email" required 
                    className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="voce@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Alguma observação?</label>
                <textarea 
                  className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-medium focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none h-32 resize-none transition-all placeholder:text-gray-300"
                  value={formData.mensagem} onChange={e => setFormData({...formData, mensagem: e.target.value})}
                  placeholder="Como podemos tornar sua visita ainda mais produtiva?"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    {...fadeIn}
                    className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-600 text-xs font-bold"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6 mt-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting || !selectedDate || !selectedHour}
                  className={`
                    w-full py-6 rounded-[2rem] font-bold flex items-center justify-center gap-4 transition-all shadow-2xl text-xs uppercase tracking-[0.2em]
                    ${(submitting || !selectedDate || !selectedHour) 
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                      : 'bg-primary-black text-white hover:bg-primary-black/90 shadow-black/20'
                    }
                  `}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      RESERVANDO...
                    </>
                  ) : (
                    <>
                      Solicitar Agendamento
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

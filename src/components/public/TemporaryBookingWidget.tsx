import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  MessageCircle, 
  ShieldCheck, 
  Info,
  CalendarCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../../types';
import { 
  formatCurrency, 
  formatarDataBR, 
  cleanPhoneForWhatsapp 
} from '../../lib/utils';
import { 
  fetchPublicOccupiedDates, 
  checkPublicAvailability, 
  calculateNights, 
  submitReservationRequest, 
  buildPublicTemporaryRentalWhatsAppUrl,
  doIntervalsOverlap 
} from '../../services/temporaryRentalService';

interface TemporaryBookingWidgetProps {
  property: Property;
  settings?: any;
  onSuccess?: () => void;
}

export default function TemporaryBookingWidget({
  property,
  settings,
  onSuccess
}: TemporaryBookingWidgetProps) {
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [occupiedIntervals, setOccupiedIntervals] = useState<Array<{ dataEntrada: string; dataSaida: string; tipo: string }>>([]);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // Selection state
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState<number>(2);

  // Form state
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    codigo: string;
    whatsAppUrl: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    total: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const maxGuests = Number(property.capacidadeHospedes || property.maxHospedes || property.maxGuests || 4);
  const dailyRate = Number(property.valorDiaria || property.priceDiaria || property.precoDiaria || property.diaria || 0);
  const cleaningFee = Number(property.taxaLimpeza || property.taxaLimpezaTemporada || 0);

  // Load public occupied dates
  useEffect(() => {
    let isMounted = true;
    async function loadOccupancy() {
      if (!property?.id) return;
      setLoadingOccupancy(true);
      try {
        const dates = await fetchPublicOccupiedDates(property.id);
        if (isMounted) {
          setOccupiedIntervals(dates);
        }
      } catch (err) {
        console.error('Erro ao carregar datas ocupadas:', err);
      } finally {
        if (isMounted) setLoadingOccupancy(false);
      }
    }
    loadOccupancy();
    return () => {
      isMounted = false;
    };
  }, [property?.id]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Format YYYY-MM-DD
  const formatDayKey = (dayNum: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Calendar metrics
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Check if night is occupied: an interval [dataEntrada, dataSaida) occupies night D where dataEntrada <= D < dataSaida
  const isNightOccupied = (dayKey: string): boolean => {
    return occupiedIntervals.some(item => item.dataEntrada <= dayKey && dayKey < item.dataSaida);
  };

  // Handle day click
  const handleDayClick = (dayKey: string) => {
    setErrorMessage(null);

    // If day is past, do nothing
    if (dayKey < todayStr) return;

    if (!checkIn || (checkIn && checkOut)) {
      // Starting new selection
      if (isNightOccupied(dayKey)) {
        setErrorMessage('Esta data não está disponível para check-in.');
        return;
      }
      setCheckIn(dayKey);
      setCheckOut(null);
    } else {
      // CheckIn already selected, choosing checkOut
      if (dayKey <= checkIn) {
        // User clicked same or earlier date: reset checkIn to this date if available
        if (isNightOccupied(dayKey)) {
          setErrorMessage('Esta data não está disponível para check-in.');
          return;
        }
        setCheckIn(dayKey);
        setCheckOut(null);
      } else {
        // Validate if any night in interval is occupied
        const nights = calculateNights(checkIn, dayKey);
        let hasConflict = false;

        for (let i = 0; i < nights; i++) {
          const d = new Date(checkIn + 'T00:00:00');
          d.setDate(d.getDate() + i);
          const curKey = d.toISOString().split('T')[0];
          if (isNightOccupied(curKey)) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          setErrorMessage('O intervalo selecionado contém datas já ocupadas. Escolha um período disponível.');
          setCheckIn(dayKey);
          setCheckOut(null);
        } else {
          setCheckOut(dayKey);
        }
      }
    }
  };

  // Calculations
  const calculatedNights = useMemo(() => {
    if (checkIn && checkOut) {
      return calculateNights(checkIn, checkOut);
    }
    return 0;
  }, [checkIn, checkOut]);

  const subtotal = calculatedNights * dailyRate;
  const estimatedTotal = subtotal > 0 ? subtotal + cleaningFee : 0;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!checkIn || !checkOut) {
      setErrorMessage('Por favor, selecione as datas de entrada e saída no calendário.');
      return;
    }
    if (!nomeCliente.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }
    const cleanTel = telefone.replace(/\D/g, '');
    if (cleanTel.length < 10) {
      setErrorMessage('Informe um número de telefone/WhatsApp válido com DDD.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Submit request to Firestore
      const destinationPhone = settings?.empresa?.whatsapp || property.brokerWhatsapp || '47999999999';
      
      const res = await submitReservationRequest({
        imovelId: property.id,
        imovelCodigo: property.code || property.codigo || '',
        imovelTitulo: property.title || property.titulo || 'Imóvel de Temporada',
        imovelEndereco: `${property.neighborhood || ''}, ${property.city || 'Balneário Camboriú'} - ${property.state || 'SC'}`,
        nomeCliente: nomeCliente.trim(),
        telefone: cleanTel,
        whatsapp: cleanTel,
        email: email.trim(),
        dataEntrada: checkIn,
        dataSaida: checkOut,
        quantidadeDiarias: calculatedNights,
        quantidadeHospedes: guests,
        valorDiaria: dailyRate,
        taxaLimpeza: cleaningFee,
        valorTotalEstimado: estimatedTotal,
        observacoes: observacoes.trim()
      });

      // 2. Build WhatsApp URL
      const whatsUrl = buildPublicTemporaryRentalWhatsAppUrl({
        imovelTitulo: property.title,
        imovelCodigo: property.code,
        imovelEndereco: `${property.neighborhood || ''}, ${property.city || 'Balneário Camboriú'}`,
        imovelLink: window.location.href,
        dataEntrada: checkIn,
        dataSaida: checkOut,
        quantidadeDiarias: calculatedNights,
        quantidadeHospedes: guests,
        valorDiaria: dailyRate,
        valorTotalEstimado: estimatedTotal,
        nomeCliente: nomeCliente.trim(),
        telefone: cleanTel,
        whatsapp: cleanTel,
        email: email.trim(),
        observacoes: observacoes.trim()
      }, destinationPhone);

      setSubmittedData({
        codigo: res.codigo,
        whatsAppUrl: whatsUrl,
        checkIn,
        checkOut,
        nights: calculatedNights,
        total: estimatedTotal
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Erro ao enviar solicitação:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-[#E2E8F0] shadow-xl overflow-hidden text-slate-800">
      
      {/* Header Badge & Price */}
      <div className="p-6 md:p-7 border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/50 to-amber-50/30">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold/15 text-gold-750 border border-gold/30">
            <Sparkles size={12} className="text-gold" /> Locação Temporária
          </span>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> Reserva Direta
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">A partir de</span>
          <span className="text-3xl font-display font-black text-slate-900 tracking-tight">
            R$ {formatCurrency(dailyRate).replace('R$', '').trim()}
          </span>
          <span className="text-xs font-semibold text-slate-500">/ noite</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          Capacidade para até <strong>{maxGuests} hóspedes</strong> • Mínimo de 1 diária
        </p>
      </div>

      <div className="p-6 md:p-7 space-y-6">

        {/* If already submitted successfully */}
        {submittedData ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4 space-y-5"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
                Solicitação Registrada
              </span>
              <h3 className="text-xl font-display font-black text-slate-900">
                Protocolo: {submittedData.codigo}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Sua solicitação para o período de <strong>{formatarDataBR(submittedData.checkIn)}</strong> a <strong>{formatarDataBR(submittedData.checkOut)}</strong> ({submittedData.nights} diárias) foi recebida pela nossa equipe!
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Check-in:</span>
                <span className="font-bold text-slate-800">{formatarDataBR(submittedData.checkIn)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Check-out:</span>
                <span className="font-bold text-slate-800">{formatarDataBR(submittedData.checkOut)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Estimado:</span>
                <span className="font-bold text-emerald-700">R$ {formatCurrency(submittedData.total)}</span>
              </div>
            </div>

            {/* Prompt Requirement: WhatsApp Button formatted according to prompt */}
            <div className="space-y-3 pt-2">
              <a 
                href={submittedData.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-97 transition-all"
              >
                <MessageCircle size={18} />
                Enviar solicitação pelo WhatsApp
              </a>

              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null);
                  setCheckIn(null);
                  setCheckOut(null);
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Fazer outra consulta ou alterar datas
              </button>
            </div>
          </motion.div>
        ) : (
          /* Booking / Inquiry Flow */
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Date Pickers Summary Box */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50">
                <div 
                  onClick={() => { setCheckOut(null); }}
                  className={`p-3 cursor-pointer transition-colors ${
                    !checkIn ? 'bg-amber-50/60 text-gold-750' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Entrada (Check-in)
                  </label>
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {checkIn ? formatarDataBR(checkIn) : 'Selecionar data'}
                  </span>
                </div>

                <div 
                  className={`p-3 cursor-pointer transition-colors ${
                    checkIn && !checkOut ? 'bg-amber-50/60 text-gold-750' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Saída (Check-out)
                  </label>
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {checkOut ? formatarDataBR(checkOut) : 'Selecionar data'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Availability Calendar */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {monthNames[month]} {year}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
                <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayKey = formatDayKey(dayNum);
                  const isPast = dayKey < todayStr;
                  const isOccupied = isNightOccupied(dayKey);
                  const isDisabled = isPast || (isOccupied && !checkIn);

                  const isStart = checkIn === dayKey;
                  const isEnd = checkOut === dayKey;
                  const isInRange = checkIn && checkOut && dayKey >= checkIn && dayKey <= checkOut;

                  let cellStyle = 'hover:bg-slate-100 text-slate-700 font-semibold';
                  if (isDisabled || (isOccupied && !isInRange)) {
                    cellStyle = 'bg-slate-100/60 text-slate-300 cursor-not-allowed line-through';
                  } else if (isStart || isEnd) {
                    cellStyle = 'bg-primary-black text-white font-black shadow-md';
                  } else if (isInRange) {
                    cellStyle = 'bg-gold/20 text-slate-900 font-bold';
                  }

                  return (
                    <button
                      type="button"
                      key={dayKey}
                      disabled={isPast || (isOccupied && !checkIn)}
                      onClick={() => handleDayClick(dayKey)}
                      className={`h-8 rounded-lg text-xs flex items-center justify-center transition-all ${cellStyle}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Disponível
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Indisponível
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn(null);
                    setCheckOut(null);
                    setErrorMessage(null);
                  }}
                  className="text-gold font-bold hover:underline"
                >
                  Limpar datas
                </button>
              </div>
            </div>

            {/* Guests selector */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Hóspedes
                </label>
                <span className="text-xs font-bold text-slate-800">
                  {guests} {guests === 1 ? 'hóspede' : 'hóspedes'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={guests <= 1}
                  onClick={() => setGuests(g => Math.max(1, g - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold">{guests}</span>
                <button
                  type="button"
                  disabled={guests >= maxGuests}
                  onClick={() => setGuests(g => Math.min(maxGuests, g + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Financial Breakdown (shows when dates selected) */}
            {calculatedNights > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-2.5 text-xs"
              >
                <div className="flex justify-between text-slate-600">
                  <span>R$ {formatCurrency(dailyRate)} x {calculatedNights} {calculatedNights === 1 ? 'diária' : 'diárias'}</span>
                  <span className="font-bold text-slate-800">R$ {formatCurrency(subtotal)}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Taxa de limpeza</span>
                    <span className="font-bold text-slate-800">R$ {formatCurrency(cleaningFee)}</span>
                  </div>
                )}
                <div className="border-t border-amber-200 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">Total Estimado</span>
                  <span className="text-lg font-display font-black text-slate-900">
                    R$ {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Client Contact Fields */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(47) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  E-mail <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Observações <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Horário estimado de chegada, dúvidas ou solicitações especiais"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold resize-none"
                />
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gold hover:bg-[#EEBF32] text-primary-black font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-97 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Clock size={16} className="animate-spin" /> Processando Solicitação...
                </>
              ) : (
                <>
                  <CalendarCheck size={16} /> Solicitar Reserva
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Você não será cobrado agora. Ao enviar a solicitação, nossa equipe verificará a disponibilidade e responderá pelo WhatsApp.
            </p>
          </form>
        )}

      </div>
    </div>
  );
}

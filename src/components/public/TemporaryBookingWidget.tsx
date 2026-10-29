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
  CalendarCheck,
  Car,
  UserPlus,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property, TemporaryGuestCompanion, TemporaryVehicle, TemporarySeasonalPrice } from '../../types';
import { 
  formatCurrency, 
  formatCurrencyRaw,
  formatarDataBR, 
  cleanPhoneForWhatsapp 
} from '../../lib/utils';
import { 
  fetchPublicOccupiedDates, 
  checkPublicAvailability, 
  calculateNights, 
  fetchSeasonalPrices,
  calculateReservationBreakdown,
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
  const [seasonalPrices, setSeasonalPrices] = useState<TemporarySeasonalPrice[]>([]);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // Selection state
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  // Principal Guest Form state
  const [nomeCliente, setNomeCliente] = useState('');
  const [cpfCliente, setCpfCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Companions state
  const [acompanhantes, setAcompanhantes] = useState<TemporaryGuestCompanion[]>([]);

  // Vehicle state
  const [possuiVeiculo, setPossuiVeiculo] = useState<boolean>(false);
  const [veiculos, setVeiculos] = useState<TemporaryVehicle[]>([
    { tipo: 'Carro', marca: '', modelo: '', cor: '', placa: '' }
  ]);
  
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

  // Load public occupied dates & seasonal price rules
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!property?.id) return;
      setLoadingOccupancy(true);
      try {
        const [dates, prices] = await Promise.all([
          fetchPublicOccupiedDates(property.id),
          fetchSeasonalPrices(property.id)
        ]);
        if (isMounted) {
          setOccupiedIntervals(dates);
          setSeasonalPrices(prices);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do imóvel:', err);
      } finally {
        if (isMounted) setLoadingOccupancy(false);
      }
    }
    loadData();
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

  // Companions and guests count
  const totalGuests = 1 + acompanhantes.length;
  const isExceedingCapacity = totalGuests > maxGuests;

  const handleAddCompanion = () => {
    setAcompanhantes(prev => [...prev, { nomeCompleto: '', parentesco: '', documento: '', faixaEtaria: 'adulto' }]);
  };

  const handleRemoveCompanion = (index: number) => {
    setAcompanhantes(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations with deterministic seasonal prices priority
  const breakdown = useMemo(() => {
    return calculateReservationBreakdown(property, checkIn || '', checkOut || '', seasonalPrices);
  }, [property, checkIn, checkOut, seasonalPrices]);

  const calculatedNights = breakdown.nights;
  const subtotal = breakdown.subtotalDiarias;
  const estimatedTotal = breakdown.valorTotal;

  // Add vehicle
  const handleAddVehicle = () => {
    setVeiculos(prev => [...prev, { tipo: 'Carro', marca: '', modelo: '', cor: '', placa: '' }]);
  };

  // Remove vehicle
  const handleRemoveVehicle = (index: number) => {
    setVeiculos(prev => prev.filter((_, i) => i !== index));
  };

  // Update vehicle
  const handleUpdateVehicle = (index: number, field: keyof TemporaryVehicle, val: string) => {
    setVeiculos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Update companion
  const handleUpdateCompanion = (index: number, field: keyof TemporaryGuestCompanion, val: string) => {
    setAcompanhantes(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

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

    if (isExceedingCapacity) {
      setErrorMessage(`A capacidade máxima deste imóvel é de ${maxGuests} hóspedes. Atualmente você cadastrou ${totalGuests} pessoas. Remova acompanhantes para continuar.`);
      return;
    }

    if (acompanhantes.some(a => !a.nomeCompleto.trim())) {
      setErrorMessage('Por favor, informe o nome completo de todos os acompanhantes adicionados ou remova os campos não preenchidos.');
      return;
    }

    if (possuiVeiculo) {
      if (veiculos.length === 0) {
        setErrorMessage('Por favor, adicione os dados do veículo ou desmarque a opção de vaga de garagem.');
        return;
      }
      const hasInvalidVehicle = veiculos.some(v => !v.placa?.trim() || !v.modelo?.trim());
      if (hasInvalidVehicle) {
        setErrorMessage('Por favor, informe ao menos o modelo e a placa de cada veículo para cadastro na portaria.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const cleanVeiculosList = possuiVeiculo
        ? veiculos
            .filter(v => (v.placa?.trim() || v.modelo?.trim()))
            .map(v => ({
              tipo: (v.tipo || 'Carro').trim(),
              marca: (v.marca || '').trim(),
              modelo: (v.modelo || '').trim(),
              cor: (v.cor || '').trim(),
              placa: (v.placa || '').trim().toUpperCase()
            }))
        : [];

      const cleanAcompanhantesList = acompanhantes
        .filter(a => a && a.nomeCompleto?.trim())
        .map(a => ({
          nomeCompleto: a.nomeCompleto.trim(),
          documento: (a.documento || '').trim(),
          parentesco: (a.parentesco || '').trim(),
          faixaEtaria: (a.faixaEtaria === 'crianca' ? 'crianca' : 'adulto') as 'adulto' | 'crianca'
        }));

      // 1. Submit request to Firestore
      const destinationPhone = settings?.empresa?.whatsapp || property.brokerWhatsapp || '47999999999';
      
      const res = await submitReservationRequest({
        imovelId: property.id,
        imovelCodigo: property.code || property.codigo || '',
        imovelTitulo: property.title || property.titulo || 'Imóvel de Temporada',
        imovelEndereco: `${property.neighborhood || ''}, ${property.city || 'Balneário Camboriú'} - ${property.state || 'SC'}`,
        nomeCliente: nomeCliente.trim(),
        hospedeCpf: cpfCliente.trim(),
        telefone: cleanTel,
        whatsapp: cleanTel,
        email: email.trim(),
        dataEntrada: checkIn,
        dataSaida: checkOut,
        quantidadeDiarias: calculatedNights,
        quantidadeHospedes: totalGuests,
        valorDiaria: breakdown.averageDailyRate,
        taxaLimpeza: cleaningFee,
        valorTotalEstimado: estimatedTotal,
        detalhamentoDiarias: breakdown.dailyRates,
        possuiVeiculo: Boolean(possuiVeiculo && cleanVeiculosList.length > 0),
        veiculos: cleanVeiculosList,
        acompanhantes: cleanAcompanhantesList,
        observacoes: observacoes.trim()
      });

      // 2. Build WhatsApp URL
      const whatsUrl = buildPublicTemporaryRentalWhatsAppUrl({
        codigoSolicitacao: res.codigo,
        imovelTitulo: property.title,
        imovelCodigo: property.code,
        imovelEndereco: `${property.neighborhood || ''}, ${property.city || 'Balneário Camboriú'}`,
        imovelLink: window.location.href,
        dataEntrada: checkIn,
        dataSaida: checkOut,
        quantidadeDiarias: calculatedNights,
        quantidadeHospedes: totalGuests,
        valorDiaria: breakdown.averageDailyRate,
        taxaLimpeza: cleaningFee,
        valorTotalEstimado: estimatedTotal,
        nomeCliente: nomeCliente.trim(),
        telefone: cleanTel,
        whatsapp: cleanTel,
        email: email.trim(),
        possuiVeiculo: Boolean(possuiVeiculo && cleanVeiculosList.length > 0),
        veiculos: cleanVeiculosList,
        acompanhantes: cleanAcompanhantesList,
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
          <span className="text-3xl font-display font-black text-slate-900 tracking-tight flex items-baseline">
            <span className="text-gold font-sans font-bold text-xl mr-1">R$</span>
            {formatCurrencyRaw(dailyRate)}
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
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full inline-block mb-2">
                Solicitação Recebida com Sucesso
              </span>
              <h3 className="text-xl font-display font-black text-slate-900">
                Protocolo: {submittedData.codigo}
              </h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Sua solicitação de reserva para o período de <strong>{formatarDataBR(submittedData.checkIn)}</strong> a <strong>{formatarDataBR(submittedData.checkOut)}</strong> ({submittedData.nights} diárias) foi gravada com sucesso em nosso sistema!
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Check-in:</span>
                <span className="font-bold text-slate-800">{formatarDataBR(submittedData.checkIn)} a partir das 16:00</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Check-out:</span>
                <span className="font-bold text-slate-800">{formatarDataBR(submittedData.checkOut)} até 11:00</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Estimado:</span>
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(submittedData.total)}</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-left text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide text-amber-800">
                <Clock size={14} className="text-amber-600" />
                Status: Aguardando Confirmação da Equipe
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Nossa equipe irá verificar a disponibilidade e entrar em contato com você pelo WhatsApp para confirmar sua reserva.
              </p>
            </div>

            {/* Optional Actions */}
            <div className="space-y-3 pt-1">
              <a 
                href={submittedData.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs py-3 rounded-xl transition-all"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                Dúvidas urgentes? Fale com a equipe no WhatsApp
              </a>

              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null);
                  setCheckIn(null);
                  setCheckOut(null);
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline transition-colors block mx-auto pt-1"
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

            {/* Capacidade e Hóspedes Totais */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Capacidade Máxima do Imóvel
                </label>
                <span className="text-xs font-bold text-slate-800">
                  Até {maxGuests} hóspedes
                </span>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                  isExceedingCapacity 
                    ? 'bg-red-100 text-red-700 border border-red-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  <Users size={12} />
                  {totalGuests} {totalGuests === 1 ? 'hóspede (titular)' : 'hóspedes'}
                </span>
              </div>
            </div>

            {/* Aviso de Capacidade Excedida */}
            {isExceedingCapacity && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>
                  <strong>Capacidade excedida:</strong> Este imóvel acomoda no máximo {maxGuests} hóspedes. Remova acompanhantes para enviar a solicitação.
                </span>
              </div>
            )}

            {/* Financial Breakdown (shows when dates selected) */}
            {calculatedNights > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-gold" /> Detalhamento das Diárias
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">
                    {calculatedNights} {calculatedNights === 1 ? 'noite' : 'noites'}
                  </span>
                </div>

                {/* Day by Day List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-amber-200/40">
                  {breakdown.dailyRates.map((d, dIdx) => (
                    <div key={dIdx} className="flex justify-between items-center text-[11px] pt-1.5 text-slate-700">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-800">{d.dataFmt}</span>
                        {d.isSpecialPrice ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase tracking-wider">
                            {d.descricao || 'Tarifa Especial'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium">Diária Padrão</span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(d.valor)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-amber-200/60 pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal das diárias:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Taxa de limpeza (taxa única):</span>
                      <span className="font-bold text-slate-800">{formatCurrency(cleaningFee)}</span>
                    </div>
                  )}
                  <div className="border-t border-amber-300 pt-2 flex justify-between items-baseline">
                    <span className="font-black text-slate-900 uppercase tracking-wide text-xs">Total Estimado</span>
                    <span className="text-lg font-display font-black text-slate-900">
                      {formatCurrency(estimatedTotal)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Client Contact Fields */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <Users size={14} className="text-gold" /> Dados do Hóspede Titular
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Nome Completo do Titular *
                </label>
                <input
                  type="text"
                  required
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Nome completo do responsável pela reserva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    CPF do Titular <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={cpfCliente}
                    onChange={(e) => setCpfCliente(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
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

              {/* Companions Section */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserPlus size={14} className="text-gold" /> Acompanhantes ({acompanhantes.length})
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Cadastre os acompanhantes que estarão no imóvel
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCompanion}
                    disabled={isExceedingCapacity}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-gold-750 border border-gold/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Plus size={14} /> Adicionar acompanhante
                  </button>
                </div>

                {acompanhantes.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-1">
                    Nenhum acompanhante adicionado. Clique no botão acima para incluir membros da família ou amigos.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {acompanhantes.map((acomp, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs space-y-2.5 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                            Acompanhante {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCompanion(idx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-semibold transition-colors"
                            title="Remover acompanhante"
                          >
                            <Trash2 size={13} /> Remover
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Nome Completo *</label>
                            <input
                              type="text"
                              required
                              placeholder="Nome do acompanhante"
                              value={acomp.nomeCompleto}
                              onChange={(e) => handleUpdateCompanion(idx, 'nomeCompleto', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Documento (CPF ou RG)</label>
                            <input
                              type="text"
                              placeholder="000.000.000-00 ou RG"
                              value={acomp.documento || ''}
                              onChange={(e) => handleUpdateCompanion(idx, 'documento', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Parentesco / Relação</label>
                            <input
                              type="text"
                              placeholder="Ex: Cônjuge, Filho(a), Amigo(a)"
                              value={acomp.parentesco || ''}
                              onChange={(e) => handleUpdateCompanion(idx, 'parentesco', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-gold"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Faixa Etária</label>
                            <select
                              value={acomp.faixaEtaria || 'adulto'}
                              onChange={(e) => handleUpdateCompanion(idx, 'faixaEtaria', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-gold"
                            >
                              <option value="adulto">Adulto</option>
                              <option value="crianca">Criança (até 12 anos)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Section */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Car size={14} className="text-gold" /> Veículo na Garagem
                  </span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="possuiVeiculo"
                      checked={!possuiVeiculo}
                      onChange={() => setPossuiVeiculo(false)}
                      className="text-gold focus:ring-gold"
                    />
                    <span>Não possui veículo</span>
                  </label>
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="possuiVeiculo"
                      checked={possuiVeiculo}
                      onChange={() => setPossuiVeiculo(true)}
                      className="text-gold focus:ring-gold"
                    />
                    <span>Sim, utilizará vaga de garagem</span>
                  </label>
                </div>

                {possuiVeiculo && (
                  <div className="space-y-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/60">
                    <p className="text-[11px] text-slate-600">
                      Informe os dados do veículo para pré-autorização junto à portaria do edifício:
                    </p>
                    {veiculos.map((v, vIdx) => (
                      <div key={vIdx} className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Veículo {vIdx + 1}
                          </span>
                          {veiculos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(vIdx)}
                              className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Remover
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Tipo</label>
                            <select
                              value={v.tipo}
                              onChange={(e) => handleUpdateVehicle(vIdx, 'tipo', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="Carro">Carro</option>
                              <option value="SUV">SUV</option>
                              <option value="Camionete">Camionete</option>
                              <option value="Moto">Moto</option>
                              <option value="Van">Van</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Marca/Modelo *</label>
                            <input
                              type="text"
                              placeholder="Ex: Corolla"
                              value={v.modelo}
                              onChange={(e) => handleUpdateVehicle(vIdx, 'modelo', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Cor</label>
                            <input
                              type="text"
                              placeholder="Ex: Prata"
                              value={v.cor}
                              onChange={(e) => handleUpdateVehicle(vIdx, 'cor', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Placa *</label>
                            <input
                              type="text"
                              placeholder="ABC-1234"
                              value={v.placa}
                              onChange={(e) => handleUpdateVehicle(vIdx, 'placa', e.target.value.toUpperCase())}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddVehicle}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:text-amber-600 transition-colors"
                    >
                      <Plus size={14} /> Adicionar outro veículo
                    </button>
                  </div>
                )}
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
              disabled={submitting || isExceedingCapacity}
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

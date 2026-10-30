import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Building2, 
  Lock, 
  Unlock, 
  Plus, 
  Eye, 
  Info, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Share2
} from 'lucide-react';
import { 
  Property, 
  TemporaryReservation, 
  TemporaryBlock,
  TemporaryReservationStatus 
} from '../../types';
import { 
  formatCurrency, 
  formatarDataBR 
} from '../../lib/utils';
import { 
  calculateNights, 
  doIntervalsOverlap, 
  buildTemporaryRentalWhatsAppUrl 
} from '../../services/temporaryRentalService';

interface TemporaryCalendarProps {
  properties: Property[];
  selectedPropertyId: string;
  onSelectPropertyId: (id: string) => void;
  reservations: TemporaryReservation[];
  blocks: TemporaryBlock[];
  onOpenNewReservation: (initialDates: { checkIn: string; checkOut: string; propertyId: string }) => void;
  onOpenNewBlock: (initialDates: { checkIn: string; checkOut: string; propertyId: string }) => void;
  onSelectReservation: (reserva: TemporaryReservation) => void;
  onRemoveBlock: (blockId: string) => void;
}

export const TemporaryCalendar: React.FC<TemporaryCalendarProps> = ({
  properties,
  selectedPropertyId,
  onSelectPropertyId,
  reservations,
  blocks,
  onOpenNewReservation,
  onOpenNewBlock,
  onSelectReservation,
  onRemoveBlock
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter reservations and blocks for the selected property
  const propertyReservations = useMemo(() => {
    if (!selectedProperty?.id) return [];
    return reservations.filter(r => r.imovelId === selectedProperty.id && r.status !== 'cancelada');
  }, [reservations, selectedProperty]);

  const propertyBlocks = useMemo(() => {
    if (!selectedProperty?.id) return [];
    return blocks.filter(b => b.imovelId === selectedProperty.id);
  }, [blocks, selectedProperty]);

  // Days in month calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper: Format date string YYYY-MM-DD
  const formatDayKey = (dayNum: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  /**
   * Determine status for a specific night/day:
   * Remember in temporary rental, the night occupied is [dataEntrada, dataSaida).
   * A day D is occupied by reservation R if R.dataEntrada <= D and D < R.dataSaida.
   * Day D is check-in if D === R.dataEntrada.
   * Day D is check-out if D === R.dataSaida.
   */
  const getDayInfo = (dayKey: string) => {
    // 1. Check reservation
    const activeRes = propertyReservations.find(r => r.dataEntrada <= dayKey && dayKey < r.dataSaida);
    const isCheckin = propertyReservations.some(r => r.dataEntrada === dayKey);
    const isCheckout = propertyReservations.some(r => r.dataSaida === dayKey);

    // 2. Check block
    const activeBlock = propertyBlocks.find(b => b.dataInicio <= dayKey && dayKey < b.dataFim);

    let status: 'disponivel' | 'pre_reserva' | 'reservado' | 'bloqueado' | 'manutencao' = 'disponivel';
    if (activeBlock) {
      status = activeBlock.motivo === 'manutencao' ? 'manutencao' : 'bloqueado';
    } else if (activeRes) {
      status = activeRes.status === 'pre_reserva' ? 'pre_reserva' : 'reservado';
    }

    return {
      status,
      activeRes,
      activeBlock,
      isCheckin,
      isCheckout
    };
  };

  // Date range selection click handler
  const handleDayClick = (dayKey: string) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dayKey);
      setRangeEnd(null);
    } else {
      if (dayKey < rangeStart) {
        setRangeStart(dayKey);
        setRangeEnd(null);
      } else if (dayKey === rangeStart) {
        // Deselect
        setRangeStart(null);
        setRangeEnd(null);
      } else {
        // Validate if any night in between is blocked or reserved
        const nights = calculateNights(rangeStart, dayKey);
        let hasConflict = false;

        for (let i = 0; i < nights; i++) {
          const d = new Date(rangeStart + 'T00:00:00');
          d.setDate(d.getDate() + i);
          const curKey = d.toISOString().split('T')[0];
          const info = getDayInfo(curKey);
          if (info.status !== 'disponivel') {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          alert('O período selecionado contém datas já ocupadas ou bloqueadas. Por favor, escolha um intervalo disponível.');
          setRangeStart(dayKey);
          setRangeEnd(null);
        } else {
          setRangeEnd(dayKey);
        }
      }
    }
  };

  const selectedNights = useMemo(() => {
    if (rangeStart && rangeEnd) {
      return calculateNights(rangeStart, rangeEnd);
    }
    return 0;
  }, [rangeStart, rangeEnd]);

  const dailyRate = Number(selectedProperty?.valorDiaria || selectedProperty?.priceDiaria || 350);
  const cleaningFee = Number(selectedProperty?.taxaLimpeza || 150);
  const estimatedTotal = selectedNights > 0 ? (selectedNights * dailyRate) + cleaningFee : 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-gray-100 space-y-8">
      {/* Top Header & Property Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-gold mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Disponibilidade</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-primary-black">Calendário Visual de Temporada</h2>
          <p className="text-sm text-gray-400">Controle reservas, datas bloqueadas e selecione períodos para novas estadias.</p>
        </div>

        {/* Property Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1 min-w-[280px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selecione o Imóvel</label>
            <div className="relative">
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  onSelectPropertyId(e.target.value);
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className="input-field !py-3 font-bold text-sm bg-gray-50 border-gray-200"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} • {p.title || p.nomeEdificio || 'Imóvel'} (R$ {formatCurrency(p.valorDiaria || p.priceDiaria || 0)}/noite)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Property Highlights */}
      {selectedProperty && (
        <div className="p-4 sm:p-6 rounded-2xl bg-gold/5 border border-gold/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-black text-gold rounded-xl flex items-center justify-center font-bold text-sm shadow-md shrink-0">
              {selectedProperty.code}
            </div>
            <div>
              <h4 className="font-bold text-primary-black text-sm">{selectedProperty.title}</h4>
              <p className="text-xs text-gray-500">
                {selectedProperty.address || ''} {selectedProperty.neighborhood ? `• ${selectedProperty.neighborhood}` : ''} • Balneário Camboriú/SC
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Diária Padrão</span>
              <span className="font-extrabold text-primary-black text-sm">
                R$ {formatCurrency(selectedProperty.valorDiaria || selectedProperty.priceDiaria || 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Capacidade</span>
              <span className="font-extrabold text-primary-black text-sm">
                Até {selectedProperty.maxHospedes || 4} hóspedes
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Taxa de Limpeza</span>
              <span className="font-extrabold text-primary-black text-sm">
                R$ {formatCurrency(selectedProperty.taxaLimpeza || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Controls & Month Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-display font-black text-primary-black">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gold/20 hover:text-primary-black transition-colors"
          >
            Mês Atual
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gold/20 text-gray-700 flex items-center justify-center transition-colors border border-gray-200"
            title="Mês Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gold/20 text-gray-700 flex items-center justify-center transition-colors border border-gray-200"
            title="Próximo Mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-50 border border-emerald-300" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300" />
          <span>Pré-Reserva</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-blue-100 border border-blue-400" />
          <span>Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-gray-200 border border-gray-400" />
          <span>Bloqueado Manualmente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-orange-100 border border-orange-300" />
          <span>Em Manutenção</span>
        </div>
      </div>

      {/* Airbnb-style Calendar Grid */}
      <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200 text-center py-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-28 sm:h-32 bg-gray-50/30 p-2 opacity-30" />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayKey = formatDayKey(dayNum);
            const info = getDayInfo(dayKey);

            const isSelectedStart = rangeStart === dayKey;
            const isSelectedEnd = rangeEnd === dayKey;
            const isInSelectedRange = rangeStart && rangeEnd && dayKey >= rangeStart && dayKey <= rangeEnd;

            // Background styles based on status
            let cellBg = 'bg-white hover:bg-emerald-50/30';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let label = 'Disponível';

            if (info.status === 'reservado') {
              cellBg = 'bg-blue-50/60 hover:bg-blue-100/50';
              badgeBg = 'bg-blue-100 text-blue-800 border-blue-300';
              label = 'Reservado';
            } else if (info.status === 'pre_reserva') {
              cellBg = 'bg-amber-50/60 hover:bg-amber-100/50';
              badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
              label = 'Pré-Reserva';
            } else if (info.status === 'manutencao') {
              cellBg = 'bg-orange-50/60 hover:bg-orange-100/50';
              badgeBg = 'bg-orange-100 text-orange-800 border-orange-300';
              label = 'Manutenção';
            } else if (info.status === 'bloqueado') {
              cellBg = 'bg-gray-100/70 hover:bg-gray-200/50';
              badgeBg = 'bg-gray-200 text-gray-700 border-gray-300';
              label = 'Bloqueado';
            }

            if (isInSelectedRange) {
              cellBg = 'bg-gold/20 hover:bg-gold/30 border-gold/40';
            }
            if (isSelectedStart || isSelectedEnd) {
              cellBg = 'bg-primary-black text-white hover:bg-black';
            }

            return (
              <div
                key={dayKey}
                onClick={() => handleDayClick(dayKey)}
                className={`h-28 sm:h-32 p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer relative group ${cellBg}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold rounded-lg px-2 py-0.5 ${
                    isSelectedStart || isSelectedEnd 
                      ? 'bg-gold text-primary-black font-black' 
                      : 'text-gray-800'
                  }`}>
                    {dayNum}
                  </span>
                  
                  {/* Daily Rate indication */}
                  {info.status === 'disponivel' && (
                    <span className="text-[10px] font-semibold text-emerald-600 hidden sm:inline">
                      R${dailyRate}
                    </span>
                  )}
                </div>

                {/* Day Status Badges & Booking Details */}
                <div className="space-y-1">
                  {info.activeRes && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (info.activeRes) onSelectReservation(info.activeRes);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg bg-blue-100/90 text-blue-900 border border-blue-200 hover:border-blue-400 transition-colors shadow-xs"
                      title={`Reserva ${info.activeRes.codigoReserva}: ${info.activeRes.hospedeNome}`}
                    >
                      <p className="text-[10px] font-bold truncate leading-tight">
                        {info.activeRes.hospedeNome.split(' ')[0]}
                      </p>
                      <p className="text-[8px] text-blue-700 truncate">
                        {info.activeRes.codigoReserva}
                      </p>
                    </div>
                  )}

                  {info.activeBlock && (
                    <div className="p-1 rounded-lg bg-gray-200/90 text-gray-800 border border-gray-300 flex items-center justify-between">
                      <span className="text-[9px] font-bold truncate">
                        {info.activeBlock.motivo === 'manutencao' ? 'Manutenção' : 'Bloqueio'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (info.activeBlock?.id && window.confirm('Deseja desbloquear esta data?')) {
                            onRemoveBlock(info.activeBlock.id);
                          }
                        }}
                        className="text-gray-500 hover:text-red-600 p-0.5"
                        title="Desbloquear"
                      >
                        <Unlock size={10} />
                      </button>
                    </div>
                  )}

                  {/* Half-day checkin/checkout badges */}
                  <div className="flex items-center gap-1">
                    {info.isCheckin && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-emerald-600 text-white" title="Check-in neste dia">
                        In
                      </span>
                    )}
                    {info.isCheckout && (
                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-600 text-white" title="Check-out neste dia">
                        Out
                      </span>
                    )}
                  </div>
                </div>

                {/* Range Selection Status Marker */}
                <div className="text-[9px] font-bold text-center">
                  {isSelectedStart && <span className="text-gold">Entrada</span>}
                  {isSelectedEnd && <span className="text-gold">Saída</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating or Bottom Selection Action Bar */}
      {rangeStart && (
        <div className="p-6 rounded-3xl bg-primary-black text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-gold">
              <CalendarIcon size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Período Selecionado</span>
            </div>
            <p className="text-lg font-bold">
              {formatarDataBR(rangeStart)} {rangeEnd ? `até ${formatarDataBR(rangeEnd)}` : '(selecione a data de saída)'}
            </p>
            {rangeEnd && (
              <p className="text-xs text-gray-300">
                <strong>{selectedNights} diárias</strong> • Valor estimado estadia: <strong className="text-gold">R$ {formatCurrency(estimatedTotal)}</strong> (diárias + limpeza)
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
            >
              Limpar Seleção
            </button>

            {rangeEnd && selectedProperty && (
              <>
                <button
                  onClick={() => {
                    const whatsUrl = buildTemporaryRentalWhatsAppUrl('consulta', {
                      imovelTitulo: selectedProperty.title,
                      imovelCodigo: selectedProperty.code,
                      dataEntrada: rangeStart,
                      dataSaida: rangeEnd,
                      quantidadeDiarias: selectedNights,
                      quantidadeHospedes: selectedProperty.maxHospedes || 2,
                      valorTotal: estimatedTotal
                    });
                    window.open(whatsUrl, '_blank');
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg"
                >
                  <Share2 size={16} />
                  <span>Consultar WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    onOpenNewBlock({
                      checkIn: rangeStart,
                      checkOut: rangeEnd,
                      propertyId: selectedProperty.id || ''
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-colors border border-gray-700"
                >
                  <Lock size={16} />
                  <span>Bloquear Datas</span>
                </button>

                <button
                  onClick={() => {
                    onOpenNewReservation({
                      checkIn: rangeStart,
                      checkOut: rangeEnd,
                      propertyId: selectedProperty.id || ''
                    });
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl btn-gold text-xs font-black shadow-xl"
                >
                  <Plus size={16} />
                  <span>Criar Nova Reserva</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

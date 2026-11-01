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
  Share2,
  Tag,
  Layers,
  Sparkles,
  Check,
  X,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  DollarSign,
  CalendarDays
} from 'lucide-react';
import { 
  Property, 
  TemporaryReservation, 
  TemporaryBlock,
  TemporarySeasonalPrice,
  TemporaryReservationStatus 
} from '../../types';
import { 
  formatCurrency, 
  formatCurrencyRaw,
  formatarDataBR 
} from '../../lib/utils';
import { 
  calculateNights, 
  doIntervalsOverlap, 
  addDays,
  buildTemporaryRentalWhatsAppUrl,
  saveSingleDatePrice,
  removeSingleDatePrice,
  saveBulkSeasonalPrices,
  removeBulkSeasonalPrices,
  addBlock,
  removeBlock
} from '../../services/temporaryRentalService';
import { useAuth } from '../../contexts/AuthContext';

interface TemporaryCalendarProps {
  properties: Property[];
  selectedPropertyId: string;
  onSelectPropertyId: (id: string) => void;
  reservations: TemporaryReservation[];
  blocks: TemporaryBlock[];
  seasonalPrices?: TemporarySeasonalPrice[];
  onOpenNewReservation: (initialDates: { checkIn: string; checkOut: string; propertyId: string }) => void;
  onOpenNewBlock: (initialDates: { checkIn: string; checkOut: string; propertyId: string }) => void;
  onOpenNewSeasonalPrice?: (initialDates: { checkIn: string; checkOut: string; propertyId: string }) => void;
  onSelectReservation: (reserva: TemporaryReservation) => void;
  onSelectSeasonalPrice?: (rule: TemporarySeasonalPrice) => void;
  onRemoveBlock: (blockId: string) => void;
  onReloadData?: () => Promise<void> | void;
}

interface SingleDayModalState {
  date: string;
  currentPrice: number;
  isCustom: boolean;
  customDesc?: string;
  customRuleId?: string;
  status: 'disponivel' | 'pre_reserva' | 'reservado' | 'bloqueado' | 'manutencao';
  activeBlock?: TemporaryBlock;
  activeRes?: TemporaryReservation;
}

export const TemporaryCalendar: React.FC<TemporaryCalendarProps> = ({
  properties,
  selectedPropertyId,
  onSelectPropertyId,
  reservations,
  blocks,
  seasonalPrices = [],
  onOpenNewReservation,
  onOpenNewBlock,
  onOpenNewSeasonalPrice,
  onSelectReservation,
  onSelectSeasonalPrice,
  onRemoveBlock,
  onReloadData
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TemporaryBlock | null>(null);

  // Bulk Mode States
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedBulkDates, setSelectedBulkDates] = useState<Set<string>>(new Set());
  const [bulkPriceInput, setBulkPriceInput] = useState<string>('');
  const [bulkDescInput, setBulkDescInput] = useState<string>('');
  const [isBulkConfirmModalOpen, setIsBulkConfirmModalOpen] = useState<boolean>(false);
  const [bulkActionType, setBulkActionType] = useState<'apply' | 'remove'>('apply');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState<boolean>(false);
  const [intervalStart, setIntervalStart] = useState<string>('');
  const [intervalEnd, setIntervalEnd] = useState<string>('');

  // Single Day Modal States
  const [singleDayModal, setSingleDayModal] = useState<SingleDayModalState | null>(null);
  const [singlePriceInput, setSinglePriceInput] = useState<string>('');
  const [singleDescInput, setSingleDescInput] = useState<string>('');
  const [singleBlockReason, setSingleBlockReason] = useState<string>('bloqueio_manual');
  const [singleBlockObs, setSingleBlockObs] = useState<string>('');
  const [isSavingSingle, setIsSavingSingle] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

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

  // Filter reservations, blocks and seasonal prices for the selected property
  const propertyReservations = useMemo(() => {
    if (!selectedProperty?.id) return [];
    return reservations.filter(r => r.imovelId === selectedProperty.id && r.status !== 'cancelada');
  }, [reservations, selectedProperty]);

  const propertyBlocks = useMemo(() => {
    if (!selectedProperty?.id) return [];
    return blocks.filter(b => b.imovelId === selectedProperty.id);
  }, [blocks, selectedProperty]);

  const propertySeasonalPrices = useMemo(() => {
    if (!selectedProperty?.id) return [];
    return seasonalPrices.filter(p => p.imovelId === selectedProperty.id);
  }, [seasonalPrices, selectedProperty]);

  // Days in month calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper: Format date string YYYY-MM-DD
  const formatDayKey = (dayNum: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const defaultDailyRate = Number(
    selectedProperty?.valorDiaria || 
    selectedProperty?.priceDiaria || 
    selectedProperty?.precoDiaria || 
    selectedProperty?.diaria || 
    350
  );

  /**
   * Determine status and effective price for a specific date:
   * Prioritization mirrors calculateReservationBreakdown:
   * 1. Specific single-day or smaller-range rules take precedence over wider ranges.
   * 2. Newest rule breaks ties.
   */
  const getDayInfo = (dayKey: string) => {
    // 1. Check reservation
    const activeRes = propertyReservations.find(r => r.dataEntrada <= dayKey && dayKey < r.dataSaida);
    const isCheckin = propertyReservations.some(r => r.dataEntrada === dayKey);
    const isCheckout = propertyReservations.some(r => r.dataSaida === dayKey);

    // 2. Check block (respecting single-day and period blocks)
    const activeBlock = propertyBlocks.find(b => {
      const end = b.dataFimEfetivo || (b.dataFim === b.dataInicio ? addDays(b.dataFim, 1) : addDays(b.dataFim, 1));
      return b.dataInicio <= dayKey && dayKey < end;
    });

    // 3. Check seasonal / special price rule with deterministic priority
    const matchingRules = propertySeasonalPrices.filter(p => 
      p.dataInicio <= dayKey && 
      dayKey <= p.dataFim && 
      Number(p.valorDiaria) > 0
    );

    let activeSeasonalPrice: TemporarySeasonalPrice | undefined = undefined;
    if (matchingRules.length > 0) {
      matchingRules.sort((a, b) => {
        const spanA = calculateNights(a.dataInicio, a.dataFim);
        const spanB = calculateNights(b.dataInicio, b.dataFim);
        if (spanA !== spanB) return spanA - spanB;
        const timeA = a.atualizadoEm?.seconds || a.criadoEm?.seconds || 0;
        const timeB = b.atualizadoEm?.seconds || b.criadoEm?.seconds || 0;
        return timeB - timeA;
      });
      activeSeasonalPrice = matchingRules[0];
    }

    let status: 'disponivel' | 'pre_reserva' | 'reservado' | 'bloqueado' | 'manutencao' = 'disponivel';
    if (activeBlock) {
      status = activeBlock.motivo === 'manutencao' ? 'manutencao' : 'bloqueado';
    } else if (activeRes) {
      status = activeRes.status === 'pre_reserva' ? 'pre_reserva' : 'reservado';
    }

    const effectiveRate = activeSeasonalPrice ? Number(activeSeasonalPrice.valorDiaria) : defaultDailyRate;

    return {
      status,
      activeRes,
      activeBlock,
      activeSeasonalPrice,
      effectiveRate,
      isCustomPrice: Boolean(activeSeasonalPrice),
      isCheckin,
      isCheckout
    };
  };

  // Open single day modal for quick pricing or block management
  const handleOpenSingleDayModal = (dayKey: string) => {
    const info = getDayInfo(dayKey);
    setSingleDayModal({
      date: dayKey,
      currentPrice: info.effectiveRate,
      isCustom: info.isCustomPrice,
      customDesc: info.activeSeasonalPrice?.descricao || '',
      customRuleId: info.activeSeasonalPrice?.id,
      status: info.status,
      activeBlock: info.activeBlock,
      activeRes: info.activeRes
    });
    setSinglePriceInput(info.effectiveRate.toString());
    setSingleDescInput(info.activeSeasonalPrice?.descricao || '');
    setSingleBlockReason(info.activeBlock?.motivo || 'bloqueio_manual');
    setSingleBlockObs(info.activeBlock?.observacoes || '');
  };

  // Bulk Selection Helpers
  const handleToggleBulkDate = (dayKey: string) => {
    const info = getDayInfo(dayKey);
    if (info.status === 'reservado') {
      showNotification(`A data ${formatarDataBR(dayKey)} possui uma reserva confirmada e não pode ser alterada em massa.`, 'error');
      return;
    }

    const next = new Set(selectedBulkDates);
    if (next.has(dayKey)) {
      next.delete(dayKey);
    } else {
      next.add(dayKey);
    }
    setSelectedBulkDates(next);
  };

  const handleSelectFullMonth = () => {
    const next = new Set(selectedBulkDates);
    let reservedSkipped = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayKey = formatDayKey(d);
      const info = getDayInfo(dayKey);
      if (info.status === 'reservado') {
        reservedSkipped++;
      } else {
        next.add(dayKey);
      }
    }
    setSelectedBulkDates(next);
    if (reservedSkipped > 0) {
      showNotification(`${reservedSkipped} datas com reservas ativas foram preservadas e desconsideradas.`, 'success');
    }
  };

  const handleSelectWeekends = () => {
    const next = new Set(selectedBulkDates);
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayKey = formatDayKey(d);
      const dayOfWeek = new Date(year, month, d).getDay(); // 0 Dom, 5 Sex, 6 Sáb
      if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
        const info = getDayInfo(dayKey);
        if (info.status !== 'reservado') {
          next.add(dayKey);
          count++;
        }
      }
    }
    setSelectedBulkDates(next);
    showNotification(`${count} datas de finais de semana (Sex/Sáb/Dom) selecionadas.`, 'success');
  };

  const handleApplyIntervalSelection = () => {
    if (!intervalStart || !intervalEnd) {
      alert('Informe a data de início e de término do intervalo.');
      return;
    }
    if (intervalStart > intervalEnd) {
      alert('A data de término deve ser igual ou posterior à data de início.');
      return;
    }

    const nights = calculateNights(intervalStart, intervalEnd) + 1; // inclusive
    const next = new Set(selectedBulkDates);
    let count = 0;
    let skipped = 0;

    for (let i = 0; i < nights; i++) {
      const cur = addDays(intervalStart, i);
      const info = getDayInfo(cur);
      if (info.status === 'reservado') {
        skipped++;
      } else {
        next.add(cur);
        count++;
      }
    }

    setSelectedBulkDates(next);
    setShowIntervalPicker(false);
    showNotification(`${count} datas adicionadas à seleção em massa.${skipped > 0 ? ` (${skipped} com reserva preservadas)` : ''}`, 'success');
  };

  const handleClearBulkSelection = () => {
    setSelectedBulkDates(new Set());
  };

  // Execute Bulk Save in Firestore
  const handleExecuteBulkPriceSave = async () => {
    if (!selectedProperty?.id) return;
    const rate = Number(bulkPriceInput.replace(/\D/g, '')) || Number(bulkPriceInput);
    if (!rate || rate <= 0) {
      alert('Por favor, informe um valor de diária válido.');
      return;
    }

    setIsProcessingBulk(true);
    try {
      const datesArr = Array.from(selectedBulkDates);
      await saveBulkSeasonalPrices(
        selectedProperty.id,
        datesArr,
        rate,
        bulkDescInput.trim() || 'Tarifa em Massa',
        user?.uid
      );

      showNotification(`Valor de ${formatCurrency(rate)} aplicado com sucesso a ${datesArr.length} diárias!`, 'success');
      setIsBulkConfirmModalOpen(false);
      setSelectedBulkDates(new Set());
      setBulkPriceInput('');
      setBulkDescInput('');
      setIsBulkMode(false);
      if (onReloadData) await onReloadData();
    } catch (err: any) {
      console.error('[TemporaryCalendar] Erro ao aplicar valores em massa:', err);
      alert(err.message || 'Erro ao aplicar alteração em massa.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Execute Bulk Removal in Firestore (Restoring Standard Rate)
  const handleExecuteBulkPriceRemoval = async () => {
    if (!selectedProperty?.id) return;
    setIsProcessingBulk(true);
    try {
      const datesArr = Array.from(selectedBulkDates);
      await removeBulkSeasonalPrices(selectedProperty.id, datesArr);

      showNotification(`Preços personalizados removidos de ${datesArr.length} diárias! Valor padrão restaurado.`, 'success');
      setIsBulkConfirmModalOpen(false);
      setSelectedBulkDates(new Set());
      setIsBulkMode(false);
      if (onReloadData) await onReloadData();
    } catch (err: any) {
      console.error('[TemporaryCalendar] Erro ao remover valores em massa:', err);
      alert(err.message || 'Erro ao remover preços personalizados.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Single Day Actions
  const handleSaveSinglePrice = async () => {
    if (!selectedProperty?.id || !singleDayModal) return;
    const rate = Number(singlePriceInput.replace(/\D/g, '')) || Number(singlePriceInput);
    if (!rate || rate <= 0) {
      alert('Por favor, informe um valor de diária válido.');
      return;
    }

    setIsSavingSingle(true);
    try {
      await saveSingleDatePrice(
        selectedProperty.id,
        singleDayModal.date,
        rate,
        singleDescInput.trim() || 'Tarifa Personalizada',
        user?.uid
      );

      showNotification(`Diária do dia ${formatarDataBR(singleDayModal.date)} atualizada para ${formatCurrency(rate)}!`, 'success');
      setSingleDayModal(null);
      if (onReloadData) await onReloadData();
    } catch (err: any) {
      console.error('[TemporaryCalendar] Erro ao salvar preço do dia:', err);
      alert(err.message || 'Erro ao salvar valor da diária.');
    } finally {
      setIsSavingSingle(false);
    }
  };

  const handleRemoveSinglePrice = async () => {
    if (!selectedProperty?.id || !singleDayModal) return;
    setIsSavingSingle(true);
    try {
      await removeSingleDatePrice(selectedProperty.id, singleDayModal.date);
      showNotification(`Preço personalizado removido! O dia ${formatarDataBR(singleDayModal.date)} voltou ao valor padrão (${formatCurrency(defaultDailyRate)}).`, 'success');
      setSingleDayModal(null);
      if (onReloadData) await onReloadData();
    } catch (err: any) {
      console.error('[TemporaryCalendar] Erro ao restaurar preço padrão:', err);
      alert(err.message || 'Erro ao restaurar valor padrão.');
    } finally {
      setIsSavingSingle(false);
    }
  };

  const handleToggleSingleBlock = async () => {
    if (!selectedProperty?.id || !singleDayModal) return;
    setIsSavingSingle(true);
    try {
      if (singleDayModal.activeBlock?.id) {
        // Unblock
        await removeBlock(singleDayModal.activeBlock.id);
        showNotification(`A data ${formatarDataBR(singleDayModal.date)} foi desbloqueada com sucesso!`, 'success');
      } else {
        // Block
        await addBlock({
          imovelId: selectedProperty.id,
          imovelCodigo: selectedProperty.code || '',
          imovelTitulo: selectedProperty.title || '',
          dataInicio: singleDayModal.date,
          dataFim: singleDayModal.date,
          motivo: singleBlockReason as any,
          observacoes: singleBlockObs.trim() || `Bloqueio manual em ${formatarDataBR(singleDayModal.date)}`
        }, user?.uid);
        showNotification(`A data ${formatarDataBR(singleDayModal.date)} foi bloqueada com sucesso!`, 'success');
      }
      setSingleDayModal(null);
      if (onReloadData) await onReloadData();
    } catch (err: any) {
      console.error('[TemporaryCalendar] Erro ao alterar bloqueio:', err);
      alert(err.message || 'Erro ao alterar bloqueio da data.');
    } finally {
      setIsSavingSingle(false);
    }
  };

  // Day Click Dispatcher
  const handleDayClick = (dayKey: string) => {
    if (isBulkMode) {
      handleToggleBulkDate(dayKey);
      return;
    }

    // Normal mode: open single date management modal
    handleOpenSingleDayModal(dayKey);
  };

  // Count custom prices in the current property
  const customPricesCount = useMemo(() => {
    return propertySeasonalPrices.length;
  }, [propertySeasonalPrices]);

  const selectedNights = useMemo(() => {
    if (rangeStart && rangeEnd) {
      return calculateNights(rangeStart, rangeEnd);
    }
    return 0;
  }, [rangeStart, rangeEnd]);

  const cleaningFee = Number(selectedProperty?.taxaLimpeza || 150);
  const estimatedTotal = selectedNights > 0 ? (selectedNights * defaultDailyRate) + cleaningFee : 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-gray-100 space-y-8 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold transition-all animate-in slide-in-from-top-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-950 text-emerald-200 border-emerald-700/60' 
            : 'bg-red-950 text-red-200 border-red-700/60'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-red-400" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header & Property Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-gold mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Disponibilidade & Tarifas</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-primary-black">Calendário Visual de Temporada</h2>
          <p className="text-sm text-gray-400">
            Clique em qualquer dia para alterar a diária individualmente ou ative o modo em massa para múltiplos dias.
          </p>
        </div>

        {/* Property Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1 min-w-[260px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selecione o Imóvel</label>
            <div className="relative">
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  onSelectPropertyId(e.target.value);
                  setRangeStart(null);
                  setRangeEnd(null);
                  setSelectedBulkDates(new Set());
                }}
                className="input-field !py-3 font-bold text-sm bg-gray-50 border-gray-200"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} • {p.title || p.nomeEdificio || 'Imóvel'} ({formatCurrency(p.valorDiaria || p.priceDiaria || 0)}/noite)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-5">
            {/* BULK PRICING TOGGLE BUTTON */}
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                if (isBulkMode) {
                  setSelectedBulkDates(new Set());
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all shadow-md ${
                isBulkMode
                  ? 'bg-gold text-primary-black ring-2 ring-gold/50 shadow-gold/20'
                  : 'bg-primary-black text-gold hover:bg-neutral-800'
              }`}
              title="Ativar/desativar modo de alteração em massa de diárias"
            >
              <Layers size={15} />
              <span>{isBulkMode ? `Modo em Massa Ativo (${selectedBulkDates.size})` : 'Alterar valores em massa'}</span>
            </button>

            <button
              onClick={() => onOpenNewBlock({
                propertyId: selectedProperty?.id || '',
                checkIn: rangeStart || '',
                checkOut: rangeEnd || ''
              })}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all border border-gray-300"
              title="Bloquear período de datas no calendário"
            >
              <Lock size={15} />
              <span>Bloquear datas</span>
            </button>

            {onOpenNewSeasonalPrice && (
              <button
                onClick={() => onOpenNewSeasonalPrice({
                  propertyId: selectedProperty?.id || '',
                  checkIn: rangeStart || '',
                  checkOut: rangeEnd || rangeStart || ''
                })}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-xs"
                title="Cadastrar regra de preço especial por intervalo"
              >
                <Tag size={15} className="text-gold" />
                <span>Preço especial</span>
              </button>
            )}

            <button
              onClick={() => onOpenNewReservation({
                propertyId: selectedProperty?.id || '',
                checkIn: rangeStart || '',
                checkOut: rangeEnd || ''
              })}
              className="flex items-center gap-2 px-4 py-3 rounded-xl btn-gold text-xs font-black shadow-md"
              title="Cadastrar nova reserva"
            >
              <Plus size={15} />
              <span>Nova reserva</span>
            </button>
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
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Diária Padrão do Imóvel</span>
              <span className="font-extrabold text-primary-black text-sm">
                {formatCurrency(defaultDailyRate)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Regras de Preço Ativas</span>
              <span className="font-extrabold text-amber-800 text-sm flex items-center gap-1">
                <Sparkles size={13} className="text-gold" />
                {customPricesCount} {customPricesCount === 1 ? 'regra' : 'regras'}
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
                {formatCurrency(selectedProperty.taxaLimpeza || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BULK MODE TOP TOOLBAR (when isBulkMode is ON) */}
      {isBulkMode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-primary-black text-white border-2 border-gold/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-bold">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                  Modo de Alteração de Valores em Massa
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-gold text-primary-black font-black uppercase">
                    {selectedBulkDates.size} {selectedBulkDates.size === 1 ? 'data' : 'datas'}
                  </span>
                </h4>
                <p className="text-xs text-gray-300">
                  Clique diretamente nos dias no calendário para selecioná-los ou use os atalhos rápidos abaixo:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsBulkMode(false);
                  setSelectedBulkDates(new Set());
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                <span>Sair do Modo em Massa</span>
              </button>
            </div>
          </div>

          {/* Quick selection action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <button
              onClick={handleSelectFullMonth}
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            >
              <CalendarDays size={14} className="text-gold" />
              <span>Selecionar todo o mês de {monthNames[month]}</span>
            </button>

            <button
              onClick={handleSelectWeekends}
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-gold" />
              <span>Selecionar finais de semana (Sex/Sáb/Dom)</span>
            </button>

            <button
              onClick={() => setShowIntervalPicker(!showIntervalPicker)}
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors flex items-center gap-1.5"
            >
              <CalendarIcon size={14} className="text-gold" />
              <span>Selecionar por intervalo</span>
            </button>

            {selectedBulkDates.size > 0 && (
              <button
                onClick={handleClearBulkSelection}
                className="px-3.5 py-1.5 rounded-xl bg-red-900/50 hover:bg-red-800 text-xs font-bold text-red-200 transition-colors flex items-center gap-1.5 ml-auto"
              >
                <Trash2 size={13} />
                <span>Limpar seleção ({selectedBulkDates.size})</span>
              </button>
            )}
          </div>

          {/* Popover / Form for Interval Selection */}
          {showIntervalPicker && (
            <div className="p-4 rounded-xl bg-neutral-900 border border-gold/30 space-y-3 animate-in fade-in">
              <p className="text-xs font-bold text-gold">Adicionar intervalo contínuo de datas à seleção:</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Início</label>
                  <input
                    type="date"
                    value={intervalStart}
                    onChange={(e) => setIntervalStart(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-black text-white border border-gray-700 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold block">Término</label>
                  <input
                    type="date"
                    value={intervalEnd}
                    onChange={(e) => setIntervalEnd(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-black text-white border border-gray-700 text-xs"
                  />
                </div>
                <div className="pt-4 flex items-center gap-2">
                  <button
                    onClick={handleApplyIntervalSelection}
                    className="px-4 py-2 rounded-lg btn-gold text-xs font-black shadow-sm"
                  >
                    Adicionar Intervalo
                  </button>
                  <button
                    onClick={() => setShowIntervalPicker(false)}
                    className="px-3 py-2 rounded-lg bg-gray-800 text-xs text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
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
          <span>Bloqueado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-orange-100 border border-orange-300" />
          <span>Em Manutenção</span>
        </div>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
            R$ 550*
          </span>
          <span className="text-amber-900 font-bold">Valor Personalizado</span>
        </div>
        {isBulkMode && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 text-gold font-bold">
            <span className="w-3.5 h-3.5 rounded-md bg-gold/40 border-2 border-gold" />
            <span>Selecionado em Massa</span>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
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

            const isBulkSelected = selectedBulkDates.has(dayKey);

            // Background styles based on status
            let cellBg = 'bg-white hover:bg-emerald-50/30';
            if (info.status === 'reservado') {
              cellBg = 'bg-blue-50/60 hover:bg-blue-100/50';
            } else if (info.status === 'pre_reserva') {
              cellBg = 'bg-amber-50/60 hover:bg-amber-100/50';
            } else if (info.status === 'manutencao') {
              cellBg = 'bg-orange-50/60 hover:bg-orange-100/50';
            } else if (info.status === 'bloqueado') {
              cellBg = 'bg-gray-100/70 hover:bg-gray-200/50';
            }

            // Highlighting in bulk mode
            if (isBulkSelected) {
              cellBg = 'bg-gold/25 hover:bg-gold/35 ring-2 ring-inset ring-gold shadow-inner';
            }

            return (
              <div
                key={dayKey}
                onClick={() => handleDayClick(dayKey)}
                className={`h-28 sm:h-32 p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer relative group ${cellBg}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Bulk Selection Checkbox Icon */}
                    {isBulkMode && (
                      <span className={`transition-transform ${isBulkSelected ? 'text-primary-black scale-110' : 'text-gray-300'}`}>
                        {isBulkSelected ? <CheckSquare size={16} className="text-amber-600" /> : <Square size={16} />}
                      </span>
                    )}

                    <span className={`text-sm font-bold rounded-lg px-2 py-0.5 ${
                      isBulkSelected
                        ? 'bg-primary-black text-gold font-black' 
                        : 'text-gray-800'
                    }`}>
                      {dayNum}
                    </span>
                  </div>
                  
                  {/* Daily Rate Badge */}
                  {info.isCustomPrice ? (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSingleDayModal(dayKey);
                      }}
                      className="text-[9px] font-black text-amber-900 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-2xs border border-amber-300 flex items-center gap-0.5"
                      title={`Tarifa Personalizada: ${info.activeSeasonalPrice?.descricao || 'Preço Especial'} - R$ ${info.effectiveRate.toFixed(2)}`}
                    >
                      <Sparkles size={9} className="text-gold" />
                      <span>R${info.effectiveRate}*</span>
                    </span>
                  ) : (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSingleDayModal(dayKey);
                      }}
                      className="text-[10px] font-semibold text-gray-500 hover:text-black hidden sm:inline cursor-pointer"
                      title="Clique para alterar a diária deste dia"
                    >
                      R${info.effectiveRate}
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
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlock(info.activeBlock!);
                      }}
                      className="p-1 rounded-lg bg-gray-200/90 hover:bg-gray-300 text-gray-800 border border-gray-300 flex items-center justify-between cursor-pointer transition-colors"
                      title="Clique para consultar detalhes do bloqueio"
                    >
                      <span className="text-[9px] font-bold truncate">
                        {info.activeBlock.motivo === 'manutencao' ? 'Manutenção' : 'Bloqueado'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (info.activeBlock?.id && window.confirm('Deseja desbloquear esta data?')) {
                            onRemoveBlock(info.activeBlock.id);
                          }
                        }}
                        className="text-gray-500 hover:text-red-600 p-0.5 ml-1"
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

                {/* Bottom hint or quick action button */}
                <div className="text-[9px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                  {isBulkMode ? (
                    <span className="text-primary-black font-bold">
                      {isBulkSelected ? 'Desmarcar' : 'Selecionar'}
                    </span>
                  ) : (
                    <span className="text-gold font-bold">Editar dia</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR BULK EDIT (when isBulkMode is ON and dates are selected) */}
      {isBulkMode && selectedBulkDates.size > 0 && (
        <div className="p-6 rounded-3xl bg-primary-black text-white shadow-2xl border-2 border-gold/50 flex flex-col lg:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-4 sticky bottom-6 z-40">
          <div className="space-y-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-gold">
              <Layers size={18} />
              <span className="text-xs font-black uppercase tracking-widest">
                {selectedBulkDates.size} {selectedBulkDates.size === 1 ? 'Data Selecionada' : 'Datas Selecionadas'}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              Defina o novo valor ou restaure o preço padrão para todas as {selectedBulkDates.size} diárias marcadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Price Input Field */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-gray-700 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-gold">R$</span>
              <input
                type="number"
                placeholder="Novo valor da diária"
                value={bulkPriceInput}
                onChange={(e) => setBulkPriceInput(e.target.value)}
                className="bg-transparent text-white font-bold text-sm w-36 outline-none focus:ring-0"
                min="1"
              />
            </div>

            {/* Description Input Field */}
            <input
              type="text"
              placeholder="Descrição (ex: Feriado, Alta Temporada)"
              value={bulkDescInput}
              onChange={(e) => setBulkDescInput(e.target.value)}
              className="bg-neutral-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 w-52 outline-none focus:border-gold"
            />

            {/* Apply Button */}
            <button
              onClick={() => {
                if (!bulkPriceInput || Number(bulkPriceInput) <= 0) {
                  alert('Informe um novo valor de diária para aplicar às datas selecionadas.');
                  return;
                }
                setBulkActionType('apply');
                setIsBulkConfirmModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl btn-gold text-xs font-black shadow-lg transition-transform hover:scale-105"
            >
              <Check size={16} />
              <span>Aplicar valor às {selectedBulkDates.size} datas</span>
            </button>

            {/* Remove Custom Price Button */}
            <button
              onClick={() => {
                setBulkActionType('remove');
                setIsBulkConfirmModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white text-xs font-bold transition-colors border border-gray-700"
              title="Restaurar o valor padrão do imóvel para as datas selecionadas"
            >
              <RotateCcw size={15} />
              <span>Restaurar padrão</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={handleClearBulkSelection}
              className="px-3 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              title="Limpar seleção atual"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR BULK PRICING */}
      {isBulkConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-primary-black font-display font-bold text-lg">
                <Layers size={20} className="text-gold" />
                <span>Confirmar Alteração em Massa</span>
              </div>
              <button 
                onClick={() => setIsBulkConfirmModalOpen(false)}
                className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              {bulkActionType === 'apply' ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <p className="font-bold text-amber-950 text-base">
                    Você está prestes a alterar o valor de {selectedBulkDates.size} diárias para {formatCurrency(Number(bulkPriceInput))}.
                  </p>
                  <p className="text-xs text-amber-900">
                    Descrição da tarifa: <strong>{bulkDescInput.trim() || 'Tarifa em Massa'}</strong>
                  </p>
                  <p className="text-xs text-amber-800">
                    O novo valor será refletido imediatamente no calendário e nos cálculos de reserva do site público.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <p className="font-bold text-gray-900 text-base">
                    Você está prestes a remover o preço personalizado de {selectedBulkDates.size} diárias.
                  </p>
                  <p className="text-xs text-gray-600">
                    Todas as datas selecionadas voltarão a utilizar o <strong>valor padrão do imóvel ({formatCurrency(defaultDailyRate)})</strong>.
                  </p>
                </div>
              )}

              <div className="max-h-36 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                <span className="font-bold text-gray-500 block mb-1">Datas contempladas ({selectedBulkDates.size}):</span>
                <p className="text-gray-700 leading-relaxed font-mono">
                  {Array.from(selectedBulkDates).sort().map(d => formatarDataBR(d)).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isProcessingBulk}
                onClick={() => setIsBulkConfirmModalOpen(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingBulk}
                onClick={bulkActionType === 'apply' ? handleExecuteBulkPriceSave : handleExecuteBulkPriceRemoval}
                className="flex items-center gap-2 px-6 py-3 rounded-xl btn-gold text-xs font-black shadow-lg transition-all"
              >
                {isProcessingBulk ? (
                  <span>Salvando no Firestore...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO INDIVIDUAL DA DATA (QUANDO O USUÁRIO CLICA EM QUALQUER DIA) */}
      {singleDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gold block">Gestão da Data</span>
                <h3 className="text-xl font-display font-bold text-primary-black">
                  {formatarDataBR(singleDayModal.date)}
                </h3>
              </div>
              <button 
                onClick={() => setSingleDayModal(null)}
                className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Current Day Info */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Status no Calendário:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full capitalize ${
                  singleDayModal.status === 'disponivel' ? 'bg-emerald-100 text-emerald-800' :
                  singleDayModal.status === 'reservado' ? 'bg-blue-100 text-blue-800' :
                  singleDayModal.status === 'pre_reserva' ? 'bg-amber-100 text-amber-800' :
                  singleDayModal.status === 'manutencao' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-200 text-gray-800'
                }`}>
                  {singleDayModal.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Valor Atual da Diária:</span>
                <div className="text-right">
                  <span className="font-extrabold text-primary-black text-sm block">
                    {formatCurrency(singleDayModal.currentPrice)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {singleDayModal.isCustom ? `Personalizado (${singleDayModal.customDesc || 'Tarifa Especial'})` : 'Valor Padrão do Imóvel'}
                  </span>
                </div>
              </div>
            </div>

            {/* EDIT DAILY RATE SECTION */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 text-primary-black font-bold text-sm">
                <DollarSign size={16} className="text-gold" />
                <span>Alterar Preço Desta Diária</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
                    Novo Valor (R$) *
                  </label>
                  <input
                    type="number"
                    value={singlePriceInput}
                    onChange={(e) => setSinglePriceInput(e.target.value)}
                    placeholder="Ex: 550"
                    min="1"
                    className="input-field !py-2.5 text-sm font-bold bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
                    Descrição / Motivo
                  </label>
                  <input
                    type="text"
                    value={singleDescInput}
                    onChange={(e) => setSingleDescInput(e.target.value)}
                    placeholder="Ex: Feriado, Diária Promocional"
                    className="input-field !py-2.5 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingSingle}
                  onClick={handleSaveSinglePrice}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gold text-xs font-black shadow-md transition-all"
                >
                  <Check size={14} />
                  <span>Salvar Novo Preço</span>
                </button>

                {singleDayModal.isCustom && (
                  <button
                    type="button"
                    disabled={isSavingSingle}
                    onClick={handleRemoveSinglePrice}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all border border-gray-300"
                    title="Remover preço personalizado e voltar ao padrão"
                  >
                    <RotateCcw size={14} />
                    <span>Restaurar Padrão ({formatCurrency(defaultDailyRate)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* BLOCK / UNBLOCK SECTION */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-primary-black font-bold text-sm">
                <Lock size={16} className="text-amber-600" />
                <span>Bloqueio de Disponibilidade</span>
              </div>

              {singleDayModal.activeBlock ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-100 border border-gray-200 text-xs">
                  <div>
                    <span className="font-bold text-gray-800 block">Esta data está bloqueada</span>
                    <span className="text-gray-500 capitalize">Motivo: {singleDayModal.activeBlock.motivo}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingSingle}
                    onClick={handleToggleSingleBlock}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Unlock size={14} />
                    <span>Liberar Data</span>
                  </button>
                </div>
              ) : singleDayModal.status === 'disponivel' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
                        Motivo do Bloqueio
                      </label>
                      <select
                        value={singleBlockReason}
                        onChange={(e) => setSingleBlockReason(e.target.value)}
                        className="input-field !py-2 text-xs bg-white"
                      >
                        <option value="bloqueio_manual">Bloqueio Manual / Proprietário</option>
                        <option value="manutencao">Manutenção / Reparo</option>
                        <option value="uso_proprietario">Uso do Proprietário</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-1">
                        Observação Interna
                      </label>
                      <input
                        type="text"
                        value={singleBlockObs}
                        onChange={(e) => setSingleBlockObs(e.target.value)}
                        placeholder="Ex: Reforma de piso, pintura"
                        className="input-field !py-2 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingSingle}
                    onClick={handleToggleSingleBlock}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-gray-100 font-bold text-xs transition-colors"
                  >
                    <Lock size={14} />
                    <span>Bloquear Esta Data</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Esta data possui uma reserva ativa e não pode ser bloqueada manualmente.
                </p>
              )}
            </div>

            {/* QUICK RESERVATION BUTTON */}
            {singleDayModal.status === 'disponivel' && (
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Deseja abrir uma nova reserva com check-in nesta data?</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextDay = addDays(singleDayModal.date, 1);
                    setSingleDayModal(null);
                    onOpenNewReservation({
                      propertyId: selectedProperty?.id || '',
                      checkIn: singleDayModal.date,
                      checkOut: nextDay
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-primary-black text-white hover:bg-neutral-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} className="text-gold" />
                  <span>Iniciar Reserva</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block Details Consultation Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 text-primary-black font-display font-bold text-lg">
                <Lock size={20} className="text-amber-600" />
                <span>Consulta de Bloqueio</span>
              </div>
              <button 
                onClick={() => setSelectedBlock(null)}
                className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Motivo:</span>
                  <span className="font-bold text-gray-800 capitalize">
                    {selectedBlock.motivo === 'manutencao' ? 'Manutenção / Reparos' : 
                     selectedBlock.motivo === 'uso_proprietario' ? 'Uso do Proprietário' : 
                     selectedBlock.motivo === 'bloqueio_manual' ? 'Bloqueio Manual / Proprietário' : 
                     selectedBlock.motivo || 'Bloqueio'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Período Bloqueado:</span>
                  <span className="font-bold text-gray-800">
                    {formatarDataBR(selectedBlock.dataInicio)} até {formatarDataBR(selectedBlock.dataFim)}
                  </span>
                </div>
                {selectedBlock.observacoes && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500 block mb-1 font-medium">Observações Internas:</span>
                    <p className="text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-100">
                      {selectedBlock.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (selectedBlock.id) {
                    await onRemoveBlock(selectedBlock.id);
                    setSelectedBlock(null);
                    if (onReloadData) await onReloadData();
                  }
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md"
              >
                <Unlock size={14} />
                <span>Desbloquear Datas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

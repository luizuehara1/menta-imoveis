import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CalendarDays, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Users, 
  DollarSign, 
  FileText, 
  Printer, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Edit, 
  Trash2, 
  X, 
  Eye, 
  Phone, 
  Mail, 
  MessageSquare, 
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Home,
  ExternalLink,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { 
  Property, 
  TemporaryReservation, 
  TemporaryBlock, 
  TemporaryGuest, 
  TemporaryPayment, 
  TemporaryReceipt,
  TemporaryReservationStatus,
  TemporaryPaymentType,
  TemporaryBlockReason,
  TemporaryReservationRequest,
  TemporarySeasonalPrice,
  TemporaryCompanion
} from '../../types';
import { 
  fetchTemporaryProperties, 
  fetchAllProperties,
  fetchReservations, 
  fetchBlocks, 
  fetchGuests, 
  fetchPayments, 
  fetchReceipts,
  fetchReservationRequests,
  approveReservationRequest,
  refuseReservationRequest,
  cancelReservationRequest,
  checkAvailability,
  saveReservation,
  cancelReservation,
  addBlock,
  removeBlock,
  registerPayment,
  createTemporaryReceipt,
  buildTemporaryRentalWhatsAppUrl,
  buildPublicTemporaryRentalWhatsAppUrl,
  calculateNights,
  doIntervalsOverlap,
  fetchSeasonalPrices,
  saveSeasonalPrice,
  deleteSeasonalPrice,
  calculateReservationBreakdown
} from '../../services/temporaryRentalService';
import { formatCurrency, formatarDataBR, maskCurrency, parseCurrencyToNumber } from '../../lib/utils';
import { TemporaryCalendar } from '../../components/admin/TemporaryCalendar';
import { TemporaryReceiptModal } from '../../components/admin/TemporaryReceiptModal';

type ActiveTab = 'visao_geral' | 'calendario' | 'reservas' | 'solicitacoes' | 'precos' | 'hospedes' | 'pagamentos' | 'recibos' | 'imoveis';

export default function TemporaryRentals() {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Core Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<TemporaryReservation[]>([]);
  const [blocks, setBlocks] = useState<TemporaryBlock[]>([]);
  const [guests, setGuests] = useState<TemporaryGuest[]>([]);
  const [payments, setPayments] = useState<TemporaryPayment[]>([]);
  const [receipts, setReceipts] = useState<TemporaryReceipt[]>([]);
  const [requests, setRequests] = useState<TemporaryReservationRequest[]>([]);

  // Selection states
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modals state
  const [isNewReservationModalOpen, setIsNewReservationModalOpen] = useState(false);
  const [isReservationDetailsModalOpen, setIsReservationDetailsModalOpen] = useState(false);
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<TemporaryReservation | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TemporaryReservationRequest | null>(null);

  // Seasonal Prices State & Modal
  const [seasonalPrices, setSeasonalPrices] = useState<TemporarySeasonalPrice[]>([]);
  const [isSeasonalPriceModalOpen, setIsSeasonalPriceModalOpen] = useState(false);
  const [editingSeasonalPrice, setEditingSeasonalPrice] = useState<TemporarySeasonalPrice | null>(null);
  const [seasonalPriceForm, setSeasonalPriceForm] = useState<{
    imovelId: string;
    dataInicio: string;
    dataFim: string;
    valorDiaria: number | string;
    descricao: string;
  }>({
    imovelId: '',
    dataInicio: '',
    dataFim: '',
    valorDiaria: '',
    descricao: ''
  });

  // Multiple companions state for reservation form
  const [companions, setCompanions] = useState<TemporaryCompanion[]>([]);

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<TemporaryReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Availability helper for property card
  const getPropertyAvailability = (propId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const isOccupied = reservations.some(r => 
      r.imovelId === propId && 
      r.status !== 'cancelada' && 
      (r.dataEntrada || '') <= today && 
      (r.dataSaida || '') > today
    );
    if (isOccupied) return { label: 'Ocupado Hoje', color: 'bg-blue-50 text-blue-800 border-blue-200' };

    const isBlocked = blocks.some(b => 
      b.imovelId === propId && 
      (b.dataInicio || '') <= today && 
      (b.dataFim || '') >= today
    );
    if (isBlocked) return { label: 'Bloqueado Hoje', color: 'bg-amber-50 text-amber-800 border-amber-200' };

    return { label: 'Disponível Hoje', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  // Form states for New Reservation
  const [reservationForm, setReservationForm] = useState<Partial<TemporaryReservation>>({
    status: 'confirmada',
    formaPagamento: 'PIX',
    quantidadeHospedes: 2,
    valorDesconto: 0,
    outrasTaxas: 0
  });

  // Form states for New Block
  const [blockForm, setBlockForm] = useState<Partial<TemporaryBlock>>({
    motivo: 'bloqueio_manual'
  });

  // Form state for New Payment
  const [paymentForm, setPaymentForm] = useState<Partial<TemporaryPayment>>({
    formaPagamento: 'PIX',
    tipo: 'pagamento_parcial',
    status: 'confirmado'
  });

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [propsData, resData, blocksData, guestsData, paysData, recsData, reqsData, pricesData] = await Promise.all([
        fetchTemporaryProperties(),
        fetchReservations(),
        fetchBlocks(),
        fetchGuests(),
        fetchPayments(),
        fetchReceipts(),
        fetchReservationRequests(),
        fetchSeasonalPrices()
      ]);

      setProperties(propsData);

      const urlImovelId = searchParams.get('imovelId');
      const urlTab = searchParams.get('tab');
      const urlAction = searchParams.get('action');

      if (urlImovelId && propsData.some(p => p.id === urlImovelId)) {
        setSelectedPropertyId(urlImovelId);
      } else if (propsData.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(propsData[0].id || '');
      }

      if (urlTab && ['visao_geral', 'calendario', 'reservas', 'solicitacoes', 'precos', 'hospedes', 'pagamentos', 'recibos', 'imoveis'].includes(urlTab)) {
        setActiveTab(urlTab as ActiveTab);
      }

      setReservations(resData);
      setBlocks(blocksData);
      setGuests(guestsData);
      setPayments(paysData);
      setReceipts(recsData);
      setRequests(reqsData);
      setSeasonalPrices(pricesData);

      if (urlAction === 'nova-reserva' && urlImovelId) {
        setTimeout(() => {
          handleOpenNewReservation({ propertyId: urlImovelId, checkIn: '', checkOut: '' });
        }, 150);
      } else if (urlAction === 'bloquear' && urlImovelId) {
        setTimeout(() => {
          handleOpenNewBlock({ propertyId: urlImovelId, checkIn: '', checkOut: '' });
        }, 150);
      }
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao carregar dados:', err);
      triggerToast('Erro ao carregar dados de locação temporária.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  // Selected Property Object
  const currentProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  // KPIs
  const kpis = useMemo(() => {
    const totalImoveis = properties.length;
    const ativas = reservations.filter(r => r.status === 'confirmada' || r.status === 'em_andamento').length;
    const totalRecebido = payments.filter(p => p.status === 'confirmado').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const saldoPendente = reservations.filter(r => r.status !== 'cancelada').reduce((acc, r) => acc + Number(r.saldoRestante || 0), 0);
    const totalHospedes = guests.length;

    return {
      totalImoveis,
      ativas,
      totalRecebido,
      saldoPendente,
      totalHospedes
    };
  }, [properties, reservations, payments, guests]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const matchSearch = 
        r.codigoReserva?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.hospedeNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.imovelTitulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.imovelCodigo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  // Open New Reservation with preselected dates & property
  const handleOpenNewReservation = (dates?: { checkIn: string; checkOut: string; propertyId: string }) => {
    const propId = dates?.propertyId || selectedPropertyId || (properties[0]?.id || '');
    const prop = properties.find(p => p.id === propId) || properties[0] || null;

    const checkIn = dates?.checkIn || new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const checkOut = dates?.checkOut || tomorrow.toISOString().split('T')[0];

    let nights = calculateNights(checkIn, checkOut);
    let daily = Number(prop?.valorDiaria || prop?.priceDiaria || 350);
    let cleaning = Number(prop?.taxaLimpeza || 150);
    let subtotal = nights * daily;
    let total = subtotal + cleaning;
    let breakdownDetails = undefined;

    if (prop && checkIn && checkOut && checkIn < checkOut) {
      const bd = calculateReservationBreakdown(prop, checkIn, checkOut, seasonalPrices);
      nights = bd.nights;
      daily = bd.averageDailyRate;
      cleaning = bd.taxaLimpeza;
      subtotal = bd.subtotalDiarias;
      total = bd.valorTotal;
      breakdownDetails = bd.dailyRates;
    }

    setCompanions([]);

    setReservationForm({
      imovelId: propId,
      imovelCodigo: prop?.code || '',
      imovelTitulo: prop?.title || '',
      imovelEndereco: prop?.address ? `${prop.address}${prop.number ? ', ' + prop.number : ''}` : '',
      proprietarioNome: prop?.ownerName || '',
      proprietarioTelefone: prop?.ownerPhone || '',
      dataEntrada: checkIn,
      dataSaida: checkOut,
      quantidadeDiarias: nights,
      quantidadeHospedes: 1,
      valorDiaria: daily,
      subtotalDiarias: subtotal,
      taxaLimpeza: cleaning,
      outrasTaxas: 0,
      valorDesconto: 0,
      valorTotal: total,
      valorSinal: Math.round(total * 0.3), // 30% default deposit
      valorPago: 0,
      saldoRestante: total,
      formaPagamento: 'PIX',
      status: 'confirmada',
      statusPagamento: 'pendente',
      detalhamentoDiarias: breakdownDetails
    });

    setIsNewReservationModalOpen(true);
  };

  // Companions management helpers
  const handleAddCompanion = () => {
    const prop = properties.find(p => p.id === reservationForm.imovelId) || currentProperty;
    const maxGuests = Number(prop?.capacidadeHospedes || prop?.maxHospedes || 10);
    const currentTotal = 1 + companions.length;
    if (currentTotal >= maxGuests) {
      triggerToast(`Capacidade máxima do imóvel atingida (${maxGuests} pessoas). Não é possível adicionar mais acompanhantes.`, 'error');
      return;
    }
    setCompanions(prev => [
      ...prev,
      {
        id: String(Date.now()),
        nome: '',
        documento: '',
        parentesco: '',
        faixaEtaria: 'adulto'
      }
    ]);
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCompanion = (id: string, field: keyof TemporaryCompanion, value: string) => {
    setCompanions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Seasonal Price Handlers
  const handleSaveSeasonalPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!seasonalPriceForm.imovelId) throw new Error('Selecione o imóvel.');
      if (!seasonalPriceForm.dataInicio || !seasonalPriceForm.dataFim) throw new Error('Informe o período (data inicial e final).');
      if (seasonalPriceForm.dataInicio > seasonalPriceForm.dataFim) throw new Error('A data final deve ser igual ou posterior à data inicial.');
      const rate = typeof seasonalPriceForm.valorDiaria === 'string' 
        ? parseCurrencyToNumber(seasonalPriceForm.valorDiaria) 
        : Number(seasonalPriceForm.valorDiaria || 0);
      if (rate <= 0) throw new Error('Informe um valor de diária válido maior que zero.');

      const prop = properties.find(p => p.id === seasonalPriceForm.imovelId);

      await saveSeasonalPrice({
        id: editingSeasonalPrice?.id,
        imovelId: seasonalPriceForm.imovelId,
        imovelCodigo: prop?.code || '',
        imovelTitulo: prop?.title || '',
        dataInicio: seasonalPriceForm.dataInicio,
        dataFim: seasonalPriceForm.dataFim,
        valorDiaria: rate,
        descricao: seasonalPriceForm.descricao.trim() || 'Tarifa Especial'
      }, user?.uid);

      triggerToast('Preço especial por período salvo com sucesso!', 'success');
      setIsSeasonalPriceModalOpen(false);
      setEditingSeasonalPrice(null);
      await loadData();
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao salvar preço por período:', err);
      triggerToast(err.message || 'Erro ao salvar preço especial.', 'error');
    }
  };

  const handleDeleteSeasonalPrice = async (priceId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta regra de preço por período?')) return;
    try {
      await deleteSeasonalPrice(priceId);
      triggerToast('Regra de preço por período removida com sucesso!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao remover preço:', err);
      triggerToast(err.message || 'Erro ao remover preço especial.', 'error');
    }
  };

  // Open New Block Modal
  const handleOpenNewBlock = (dates?: { checkIn: string; checkOut: string; propertyId: string }) => {
    const propId = dates?.propertyId || selectedPropertyId || (properties[0]?.id || '');
    const prop = properties.find(p => p.id === propId) || properties[0] || null;

    setBlockForm({
      imovelId: propId,
      imovelCodigo: prop?.code || '',
      imovelTitulo: prop?.title || '',
      dataInicio: dates?.checkIn || new Date().toISOString().split('T')[0],
      dataFim: dates?.checkOut || '',
      motivo: 'bloqueio_manual',
      observacoes: ''
    });

    setIsNewBlockModalOpen(true);
  };

  // Recalculate reservation finances dynamically
  const updateReservationCalculation = (updates: Partial<TemporaryReservation>) => {
    setReservationForm(prev => {
      const next = { ...prev, ...updates };
      const prop = properties.find(p => p.id === next.imovelId) || properties[0] || null;

      let nights = calculateNights(next.dataEntrada || '', next.dataSaida || '');
      let daily = Number(next.valorDiaria || 0);
      let subtotal = nights * daily;
      let cleaning = Number(next.taxaLimpeza || (prop?.taxaLimpeza || 150));
      let breakdownDetails = next.detalhamentoDiarias;

      if (prop && next.dataEntrada && next.dataSaida && next.dataEntrada < next.dataSaida) {
        const bd = calculateReservationBreakdown(
          prop,
          next.dataEntrada,
          next.dataSaida,
          seasonalPrices,
          Number(next.valorDesconto || 0),
          Number(next.outrasTaxas || 0)
        );
        nights = bd.nights;
        subtotal = bd.subtotalDiarias;
        breakdownDetails = bd.dailyRates;
      }

      const extra = Number(next.outrasTaxas || 0);
      const discount = Number(next.valorDesconto || 0);
      const total = Math.max(0, subtotal + cleaning + extra - discount);
      const paid = Number(next.valorPago || 0);
      const balance = Math.max(0, total - paid);

      return {
        ...next,
        quantidadeDiarias: nights,
        subtotalDiarias: subtotal,
        valorTotal: total,
        saldoRestante: balance,
        detalhamentoDiarias: breakdownDetails
      };
    });
  };

  // Handle saving new reservation
  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!reservationForm.imovelId) throw new Error('Selecione o imóvel.');
      if (!reservationForm.hospedeNome) throw new Error('Informe o nome do hóspede.');
      if (!reservationForm.dataEntrada || !reservationForm.dataSaida) throw new Error('Selecione as datas de entrada e saída.');
      if (reservationForm.dataEntrada >= reservationForm.dataSaida) throw new Error('A data de saída deve ser posterior à data de entrada.');

      const prop = properties.find(p => p.id === reservationForm.imovelId);
      const maxGuests = Number(prop?.capacidadeHospedes || prop?.maxHospedes || 10);
      const totalGuests = 1 + companions.length;

      if (totalGuests > maxGuests) {
        throw new Error(`Limite de capacidade excedido: O imóvel permite no máximo ${maxGuests} hóspedes, mas foram cadastrados ${totalGuests} (titular + ${companions.length} acompanhantes).`);
      }

      const payload: Partial<TemporaryReservation> = {
        ...reservationForm,
        quantidadeHospedes: totalGuests,
        acompanhantes: companions
      };

      await saveReservation(payload, user?.uid);
      triggerToast('Locação temporária cadastrada com sucesso!', 'success');
      setIsNewReservationModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao salvar reserva:', err);
      triggerToast(err.message || 'Erro ao salvar reserva.', 'error');
    }
  };

  // Handle saving block
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!blockForm.imovelId || !blockForm.dataInicio || !blockForm.dataFim) {
        throw new Error('Preencha o imóvel e o período para bloquear.');
      }
      if (blockForm.dataInicio > blockForm.dataFim) {
        throw new Error('A data final deve ser igual ou posterior à data inicial.');
      }
      // Check if there is conflict with confirmed reservations
      const conflictRes = reservations.find(r => 
        r.imovelId === blockForm.imovelId && 
        r.status !== 'cancelada' &&
        doIntervalsOverlap(blockForm.dataInicio!, blockForm.dataFim!, r.dataEntrada, r.dataSaida)
      );
      if (conflictRes) {
        throw new Error(`CONFLITO DE RESERVA: O período selecionado (${formatarDataBR(blockForm.dataInicio!)} a ${formatarDataBR(blockForm.dataFim!)}) coincide com a reserva confirmada ${conflictRes.codigoReserva} (${conflictRes.hospedeNome}). Não é permitido bloquear silenciosamente sobre reservas existentes.`);
      }

      await addBlock(blockForm, user?.uid);
      triggerToast('Período bloqueado com sucesso no calendário!', 'success');
      setIsNewBlockModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao bloquear datas:', err);
      triggerToast(err.message || 'Erro ao bloquear datas.', 'error');
    }
  };

  // Request Action Handlers
  const handleApproveRequest = async (req: TemporaryReservationRequest) => {
    if (!window.confirm(`Deseja aprovar a solicitação de reserva de ${req.nomeCliente} para o período de ${formatarDataBR(req.dataEntrada)} a ${formatarDataBR(req.dataSaida)}? Uma reserva confirmada será gerada imediatamente.`)) {
      return;
    }
    try {
      await approveReservationRequest(req, user?.uid);
      triggerToast('Solicitação aprovada e reserva confirmada com sucesso!', 'success');
      setIsRequestDetailsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao aprovar solicitação:', err);
      triggerToast(err.message || 'Erro ao aprovar solicitação.', 'error');
    }
  };

  const handleRefuseRequest = async (req: TemporaryReservationRequest) => {
    const motivo = window.prompt('Informe o motivo da recusa desta solicitação:');
    if (motivo === null) return;
    try {
      await refuseReservationRequest(req.id, motivo);
      triggerToast('Solicitação recusada.', 'success');
      setIsRequestDetailsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao recusar solicitação:', err);
      triggerToast(err.message || 'Erro ao recusar solicitação.', 'error');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Deseja cancelar esta solicitação de reserva?')) return;
    try {
      await cancelReservationRequest(requestId);
      triggerToast('Solicitação cancelada.', 'success');
      setIsRequestDetailsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao cancelar solicitação:', err);
      triggerToast(err.message || 'Erro ao cancelar solicitação.', 'error');
    }
  };

  // Handle removing block
  const handleRemoveBlock = async (blockId: string) => {
    try {
      await removeBlock(blockId);
      triggerToast('Bloqueio removido. Datas liberadas!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao remover bloqueio:', err);
      triggerToast(err.message || 'Erro ao remover bloqueio.', 'error');
    }
  };

  // Handle registering payment
  const handleRegisterPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReservation?.id) return;
    try {
      const val = Number(paymentForm.valor || 0);
      if (val <= 0) throw new Error('Informe um valor de pagamento válido.');

      const paymentId = await registerPayment({
        ...paymentForm,
        reservaId: selectedReservation.id
      }, user?.uid);

      triggerToast('Pagamento registrado com sucesso!', 'success');
      setIsPaymentModalOpen(false);
      await loadData();

      // Offer immediate receipt generation
      if (window.confirm('Pagamento registrado! Deseja emitir o Recibo Oficial para o consumidor agora?')) {
        handleEmitReceiptForPayment(selectedReservation, val, paymentId, paymentForm.formaPagamento || 'PIX');
      }
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao registrar pagamento:', err);
      triggerToast(err.message || 'Erro ao registrar pagamento.', 'error');
    }
  };

  // Emit Receipt Helper
  const handleEmitReceiptForPayment = async (
    reserva: TemporaryReservation, 
    valorRecebido: number, 
    pagamentoId?: string,
    forma?: string
  ) => {
    try {
      if (valorRecebido <= 0) {
        alert('Não é possível emitir recibo sem recebimento financeiro confirmado.');
        return;
      }

      const receiptDraft: Partial<TemporaryReceipt> = {
        reservaId: reserva.id || '',
        pagamentoId,
        codigoReserva: reserva.codigoReserva,
        pagadorNome: reserva.hospedeNome,
        pagadorCpf: reserva.hospedeCpf || '',
        pagadorTelefone: reserva.hospedeTelefone || reserva.hospedeWhatsapp || '',
        pagadorEmail: reserva.hospedeEmail || '',
        imovelId: reserva.imovelId,
        imovelCodigo: reserva.imovelCodigo,
        imovelTitulo: reserva.imovelTitulo,
        imovelEndereco: reserva.imovelEndereco || 'Balneário Camboriú/SC',
        imovelNomeEdificio: reserva.imovelNomeEdificio || '',
        periodoHospedagem: `${formatarDataBR(reserva.dataEntrada)} a ${formatarDataBR(reserva.dataSaida)}`,
        dataEntrada: reserva.dataEntrada,
        dataSaida: reserva.dataSaida,
        quantidadeDiarias: reserva.quantidadeDiarias,
        descricao: `Pagamento referente à locação temporária do imóvel ${reserva.imovelCodigo} (${reserva.quantidadeDiarias} diárias)`,
        valorRecebido,
        formaPagamento: forma || reserva.formaPagamento || 'PIX',
        dataPagamento: new Date().toISOString().split('T')[0],
        valorTotalReserva: reserva.valorTotal,
        saldoRestante: Math.max(0, reserva.saldoRestante - (pagamentoId ? 0 : valorRecebido)),
        emissorNome: settings.empresa?.razaoSocial || settings.empresa?.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS",
        emissorCnpj: settings.empresa?.cnpj || "00.000.000/0001-00",
        emissorCreci: settings.empresa?.creci || settings.empresa?.creciPj || ""
      };

      const receiptId = await createTemporaryReceipt(receiptDraft, user?.uid);
      triggerToast('Recibo oficial emitido e registrado no Firestore!', 'success');
      await loadData();

      setActiveReceipt({
        id: receiptId,
        numeroRecibo: receiptDraft.numeroRecibo || 'REC-TEMP',
        ...(receiptDraft as any)
      });
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      console.error('[TemporaryRentals] Erro ao emitir recibo:', err);
      triggerToast(err.message || 'Erro ao emitir recibo.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white backdrop-blur-md shadow-2xl border ${
              toast.type === 'success' ? 'bg-emerald-800 border-emerald-500' : 'bg-red-800 border-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-300" /> : <AlertCircle size={20} className="text-red-300" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-gold mb-2">
            <div className="w-10 h-[1px] bg-gold/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Menta Short-Term Rentals</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Locação Temporária</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">
            Gestão profissional de reservas de temporada, calendário de disponibilidade Airbnb, hóspedes, pagamentos e emissão de recibos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenNewBlock()}
            className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:text-black font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <Lock size={16} />
            <span>Bloquear Datas</span>
          </button>
          
          <button
            onClick={() => handleOpenNewReservation()}
            className="btn-gold !rounded-2xl !py-4 !px-8 flex items-center gap-3 shadow-xl shadow-gold/20"
          >
            <Plus size={20} />
            <span className="uppercase text-xs font-black tracking-widest">Nova Reserva</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {[
          { id: 'visao_geral', label: 'Visão Geral', icon: TrendingUp },
          { id: 'calendario', label: 'Calendário de Disponibilidade', icon: CalendarDays },
          { id: 'reservas', label: `Reservas (${reservations.length})`, icon: Clock },
          { 
            id: 'solicitacoes', 
            label: `Solicitações (${requests.filter(r => r.status === 'solicitacao_recebida' || !r.status).length})`, 
            icon: MessageSquare 
          },
          { id: 'precos', label: `Preços por Período (${seasonalPrices.length})`, icon: Tag },
          { id: 'hospedes', label: `Hóspedes (${guests.length})`, icon: Users },
          { id: 'pagamentos', label: 'Pagamentos & Recebimentos', icon: DollarSign },
          { id: 'recibos', label: `Recibos Emitidos (${receipts.length})`, icon: FileText },
          { id: 'imoveis', label: `Imóveis de Temporada (${properties.length})`, icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-primary-black text-gold shadow-lg shadow-black/10' 
                  : 'bg-white text-gray-500 hover:text-primary-black hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-gold' : 'text-gray-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Imóveis de Temporada</span>
              <p className="text-3xl font-display font-black text-primary-black">{kpis.totalImoveis}</p>
              <span className="text-xs text-gray-500 font-medium">Unidades cadastradas</span>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Reservas Ativas / Próximas</span>
              <p className="text-3xl font-display font-black text-emerald-700">{kpis.ativas}</p>
              <span className="text-xs text-emerald-600 font-medium">Confirmadas</span>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gold block">Total Recebido Confirmado</span>
              <p className="text-2xl font-display font-black text-primary-black">{formatCurrency(kpis.totalRecebido)}</p>
              <span className="text-xs text-gray-400 font-medium">{payments.length} pagamentos processados</span>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Saldo Restante a Receber</span>
              <p className="text-2xl font-display font-black text-amber-700">{formatCurrency(kpis.saldoPendente)}</p>
              <span className="text-xs text-amber-600 font-medium">Aguardando quitação</span>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Hóspedes Cadastrados</span>
              <p className="text-3xl font-display font-black text-primary-black">{kpis.totalHospedes}</p>
              <span className="text-xs text-gray-500 font-medium">Diretório de locatários</span>
            </div>
          </div>

          {/* Quick Access to Calendar & Next Checkins */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display font-bold text-primary-black">Próximas Reservas & Check-ins</h3>
                  <p className="text-xs text-gray-400">Acompanhamento das estadias confirmadas</p>
                </div>
                <button
                  onClick={() => setActiveTab('reservas')}
                  className="text-xs font-bold text-gold hover:underline flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>

              {reservations.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  Nenhuma reserva cadastrada no momento. Clique em "+ Nova Reserva" para começar.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reservations.slice(0, 5).map(res => (
                    <div 
                      key={res.id} 
                      onClick={() => {
                        setSelectedReservation(res);
                        setIsReservationDetailsModalOpen(true);
                      }}
                      className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-4 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold text-xs shrink-0">
                          {res.imovelCodigo}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary-black">{res.hospedeNome}</p>
                          <p className="text-xs text-gray-500">
                            {formatarDataBR(res.dataEntrada)} até {formatarDataBR(res.dataSaida)} ({res.quantidadeDiarias} diárias)
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-sm text-primary-black">{formatCurrency(res.valorTotal)}</p>
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          res.status === 'confirmada' ? 'bg-emerald-50 text-emerald-700' :
                          res.status === 'pre_reserva' ? 'bg-amber-50 text-amber-700' :
                          res.status === 'concluida' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {res.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-primary-black text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold block">Ações Rápidas</span>
                <h3 className="text-xl font-display font-bold">Gerenciamento Integrado</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Gerencie todo o ciclo de locação de temporada da Menta Imóveis: crie contratos, emita recibos de sinal, envie links para hóspedes via WhatsApp e consulte a disponibilidade em tempo real.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('calendario')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all font-bold text-xs"
                >
                  <span className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-gold" />
                    Abrir Calendário Airbnb
                  </span>
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => handleOpenNewReservation()}
                  className="w-full btn-gold !py-4 font-black text-xs uppercase tracking-widest shadow-xl"
                >
                  Cadastrar Nova Reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CALENDÁRIO AIRBNB */}
      {activeTab === 'calendario' && (
        <TemporaryCalendar
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelectPropertyId={setSelectedPropertyId}
          reservations={reservations}
          blocks={blocks}
          seasonalPrices={seasonalPrices}
          onOpenNewSeasonalPrice={(params) => {
            const propId = params?.propertyId || selectedPropertyId || (properties[0]?.id || '');
            setSeasonalPriceForm({
              imovelId: propId,
              dataInicio: params?.checkIn || '',
              dataFim: params?.checkOut || '',
              valorDiaria: '',
              descricao: ''
            });
            setEditingSeasonalPrice(null);
            setIsSeasonalPriceModalOpen(true);
          }}
          onSelectSeasonalPrice={(sp) => {
            setEditingSeasonalPrice(sp);
            setSeasonalPriceForm({
              imovelId: sp.imovelId,
              dataInicio: sp.dataInicio,
              dataFim: sp.dataFim,
              valorDiaria: sp.valorDiaria,
              descricao: sp.descricao
            });
            setIsSeasonalPriceModalOpen(true);
          }}
          onOpenNewReservation={handleOpenNewReservation}
          onOpenNewBlock={handleOpenNewBlock}
          onSelectReservation={(res) => {
            setSelectedReservation(res);
            setIsReservationDetailsModalOpen(true);
          }}
          onRemoveBlock={handleRemoveBlock}
        />
      )}

      {/* TAB 3: RESERVAS */}
      {activeTab === 'reservas' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden space-y-6">
          {/* Filters Bar */}
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="relative flex-grow max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por código, hóspede, imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-12 !py-3.5 text-xs bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['todos', 'confirmada', 'pre_reserva', 'concluida', 'cancelada'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    statusFilter === st 
                      ? 'bg-primary-black text-gold shadow-md' 
                      : 'bg-white text-gray-500 hover:text-black border border-gray-200'
                  }`}
                >
                  {st === 'todos' ? 'Todas' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto px-8 pb-8">
            {filteredReservations.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                Nenhuma reserva encontrada para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-4">Reserva / Imóvel</th>
                    <th className="py-4 px-4">Hóspede</th>
                    <th className="py-4 px-4">Período</th>
                    <th className="py-4 px-4">Total</th>
                    <th className="py-4 px-4">Pago / Saldo</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReservations.map(res => (
                    <tr key={res.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-primary-black text-xs block">{res.codigoReserva}</span>
                        <span className="text-gray-500 text-[11px] block">{res.imovelTitulo} ({res.imovelCodigo})</span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-primary-black">{res.hospedeNome}</p>
                        <p className="text-gray-500 text-[11px]">{res.hospedeWhatsapp || res.hospedeTelefone || 'Sem telefone'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-700 block">{formatarDataBR(res.dataEntrada)} a {formatarDataBR(res.dataSaida)}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{res.quantidadeDiarias} diárias • {res.quantidadeHospedes} hóspedes</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-primary-black text-sm">
                        {formatCurrency(res.valorTotal)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-emerald-700 font-bold block">Pago: {formatCurrency(res.valorPago)}</span>
                        <span className="text-amber-700 text-[11px]">Restante: {formatCurrency(res.saldoRestante)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          res.status === 'confirmada' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          res.status === 'pre_reserva' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          res.status === 'concluida' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {res.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedReservation(res);
                            setIsReservationDetailsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gold/20 text-gray-800 hover:text-black font-bold text-xs transition-colors"
                          title="Ver Detalhes"
                        >
                          Detalhes
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReservation(res);
                            setPaymentForm({
                              reservaId: res.id,
                              valor: res.saldoRestante > 0 ? res.saldoRestante : res.valorTotal,
                              tipo: res.valorPago === 0 ? 'sinal' : 'saldo_final',
                              formaPagamento: 'PIX',
                              status: 'confirmado'
                            });
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                          title="Registrar Pagamento"
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3.5: SOLICITAÇÕES DE RESERVA ONLINE */}
      {activeTab === 'solicitacoes' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-gold mb-1">
                <MessageSquare size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Site Público Menta Imóveis</span>
              </div>
              <h3 className="text-xl font-display font-bold text-primary-black">Solicitações de Reserva</h3>
              <p className="text-xs text-gray-400">Pedidos de reserva enviados diretamente pelos clientes via site</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                {requests.filter(r => r.status === 'solicitacao_recebida' || !r.status).length} pendente(s)
              </span>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
                {requests.length} no total
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {requests.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <MessageSquare size={36} className="mx-auto text-gray-300 opacity-50" />
                <p className="font-bold text-sm">Nenhuma solicitação de reserva recebida até o momento.</p>
                <p className="text-xs">Quando um cliente solicitar uma reserva pela página do imóvel, ela aparecerá aqui instantaneamente.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-4">Protocolo / Data</th>
                    <th className="py-4 px-4">Imóvel</th>
                    <th className="py-4 px-4">Cliente</th>
                    <th className="py-4 px-4">Período Solicitado</th>
                    <th className="py-4 px-4">Valor Estimado</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map(req => {
                    const isPending = req.status === 'solicitacao_recebida' || !req.status;
                    const isConfirmed = req.status === 'confirmada';
                    const isRefused = req.status === 'recusada';
                    const isCancelled = req.status === 'cancelada';

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock size={10} /> Pendente
                      </span>
                    );
                    if (isConfirmed) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 size={10} /> Reserva Criada
                        </span>
                      );
                    } else if (isRefused) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <X size={10} /> Recusada
                        </span>
                      );
                    } else if (isCancelled) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                          Cancelada
                        </span>
                      );
                    }

                    return (
                      <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono font-bold text-primary-black text-xs block">
                            {req.codigoSolicitacao || req.id.slice(0, 8)}
                          </span>
                          <span className="text-gray-400 text-[10px] block">
                            {req.criadoEm?.seconds ? new Date(req.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'Hoje'}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold text-primary-black block truncate max-w-[180px]">
                            {req.imovelTitulo || 'Imóvel'}
                          </span>
                          <span className="text-gray-400 text-[10px] font-semibold">
                            Cód: {req.imovelCodigo}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-primary-black">{req.nomeCliente}</p>
                          <p className="text-gray-500 text-[11px]">{req.whatsapp || req.telefone}</p>
                          {req.email && <p className="text-gray-400 text-[10px] truncate max-w-[150px]">{req.email}</p>}
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-bold text-gray-700 block">
                            {formatarDataBR(req.dataEntrada)} a {formatarDataBR(req.dataSaida)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {req.quantidadeDiarias} diárias • {req.quantidadeHospedes} hóspede(s)
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-black text-emerald-700 block text-sm">
                            {formatCurrency(req.valorTotalEstimado || 0)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Diária: {formatCurrency(req.valorDiaria || 0)}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {statusBadge}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp link */}
                            <button
                              onClick={() => {
                                const cleanNum = (req.whatsapp || req.telefone || '').replace(/\D/g, '');
                                const whatsUrl = cleanNum ? `https://wa.me/55${cleanNum.replace(/^55/, '')}` : '#';
                                window.open(whatsUrl, '_blank');
                              }}
                              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Conversar com o cliente no WhatsApp"
                            >
                              <MessageSquare size={14} />
                            </button>

                            {/* View details */}
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsRequestDetailsModalOpen(true);
                              }}
                              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              title="Visualizar detalhes da solicitação"
                            >
                              <Eye size={14} />
                            </button>

                            {/* If pending: Approve / Refuse */}
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                                  title="Aprovar e Gerar Reserva Confirmada"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => handleRefuseRequest(req)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title="Recusar Solicitação"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: PREÇOS POR PERÍODO */}
      {activeTab === 'precos' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider mb-1">
                <Tag size={16} />
                <span>Tarifação Dinâmica & Sazonal</span>
              </div>
              <h3 className="text-xl font-display font-bold text-primary-black">Preços Especiais por Período</h3>
              <p className="text-xs text-gray-400">
                Defina valores de diária diferenciados para feriados, fins de semana, alta temporada ou datas comemorativas.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="text-xs font-bold px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700"
              >
                <option value="">Todos os Imóveis</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSeasonalPriceForm({
                    imovelId: selectedPropertyId || (properties[0]?.id || ''),
                    dataInicio: '',
                    dataFim: '',
                    valorDiaria: '',
                    descricao: ''
                  });
                  setEditingSeasonalPrice(null);
                  setIsSeasonalPriceModalOpen(true);
                }}
                className="btn-gold !py-3 !px-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md"
              >
                <Plus size={16} />
                <span>Novo Preço Especial</span>
              </button>
            </div>
          </div>

          {/* Pricing Rules Content */}
          {seasonalPrices.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Tag size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-primary-black">Nenhum preço especial cadastrado</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Todos os imóveis estão utilizando suas diárias padrão cadastradas. Clique no botão abaixo para adicionar tarifas especiais para feriados ou temporadas.
                </p>
              </div>
              <button
                onClick={() => {
                  setSeasonalPriceForm({
                    imovelId: selectedPropertyId || (properties[0]?.id || ''),
                    dataInicio: '',
                    dataFim: '',
                    valorDiaria: '',
                    descricao: ''
                  });
                  setEditingSeasonalPrice(null);
                  setIsSeasonalPriceModalOpen(true);
                }}
                className="btn-gold !py-2.5 !px-6 text-xs font-bold inline-flex items-center gap-2 shadow-md"
              >
                <Plus size={16} />
                <span>Cadastrar Primeiro Preço Especial</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="py-4 px-4">Imóvel</th>
                    <th className="py-4 px-4">Período de Aplicação</th>
                    <th className="py-4 px-4">Valor da Diária</th>
                    <th className="py-4 px-4">Motivo / Descrição</th>
                    <th className="py-4 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {seasonalPrices
                    .filter(sp => !selectedPropertyId || sp.imovelId === selectedPropertyId)
                    .map(sp => {
                      const prop = properties.find(p => p.id === sp.imovelId);
                      return (
                        <tr key={sp.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-bold text-primary-black block">
                              {sp.imovelTitulo || prop?.title || 'Imóvel'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Código: <strong>{sp.imovelCodigo || prop?.code || '-'}</strong>
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              <Calendar size={14} className="text-gold shrink-0" />
                              <span>{formatarDataBR(sp.dataInicio)}</span>
                              <span className="text-gray-400 font-normal">até</span>
                              <span>{formatarDataBR(sp.dataFim)}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-display font-black text-emerald-700 text-sm block">
                              {formatCurrency(sp.valorDiaria)}
                            </span>
                            {prop && (
                              <span className="text-[10px] text-gray-400">
                                Padrão: {formatCurrency(prop.valorDiaria || prop.priceDiaria || 0)}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[11px]">
                              {sp.descricao}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingSeasonalPrice(sp);
                                  setSeasonalPriceForm({
                                    imovelId: sp.imovelId,
                                    dataInicio: sp.dataInicio,
                                    dataFim: sp.dataFim,
                                    valorDiaria: sp.valorDiaria,
                                    descricao: sp.descricao
                                  });
                                  setIsSeasonalPriceModalOpen(true);
                                }}
                                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                title="Editar Preço por Período"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteSeasonalPrice(sp.id)}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Excluir Regra"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HÓSPEDES */}
      {activeTab === 'hospedes' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-display font-bold text-primary-black">Diretório de Hóspedes</h3>
              <p className="text-xs text-gray-400">Locatários cadastrados em reservas de temporada</p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
              {guests.length} hóspedes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guests.map(guest => (
              <div key={guest.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-primary-black">{guest.nome}</h4>
                    <p className="text-xs text-gray-500">CPF: {guest.cpf || 'Não informado'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 text-xs space-y-1 text-gray-600">
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    {guest.whatsapp || guest.telefone || 'Sem contato'}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    {guest.email || 'Sem e-mail'}
                  </p>
                  {guest.ultimaEstadia && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      Última estadia: {formatarDataBR(guest.ultimaEstadia)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PAGAMENTOS & RECEBIMENTOS */}
      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-display font-bold text-primary-black">Controle Financeiro de Temporada</h3>
              <p className="text-xs text-gray-400">Histórico de sinais, pagamentos parciais e quitações</p>
            </div>
            <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              Total Confirmado: {formatCurrency(kpis.totalRecebido)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-4 px-4">Data</th>
                  <th className="py-4 px-4">Reserva / Imóvel</th>
                  <th className="py-4 px-4">Hóspede</th>
                  <th className="py-4 px-4">Tipo</th>
                  <th className="py-4 px-4">Forma</th>
                  <th className="py-4 px-4">Valor</th>
                  <th className="py-4 px-4 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-600">{formatarDataBR(pay.dataPagamento)}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-primary-black block">{pay.codigoReserva}</span>
                      <span className="text-gray-500 text-[11px]">{pay.imovelTitulo}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-primary-black">{pay.hospedeNome}</td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {pay.tipo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold">{pay.formaPagamento}</td>
                    <td className="py-4 px-4 font-black text-emerald-700 text-sm">
                      {formatCurrency(pay.valor)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {pay.reciboEmitido ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1">
                          <CheckCircle2 size={14} /> Emitido
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            const relatedRes = reservations.find(r => r.id === pay.reservaId);
                            if (relatedRes) {
                              handleEmitReceiptForPayment(relatedRes, Number(pay.valor), pay.id, pay.formaPagamento);
                            } else {
                              alert('Reserva original não localizada para montar o recibo.');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold hover:text-black font-bold text-xs transition-colors"
                        >
                          Gerar Recibo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: RECIBOS EMITIDOS */}
      {activeTab === 'recibos' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-display font-bold text-primary-black">Recibos Emitidos para Consumidores</h3>
              <p className="text-xs text-gray-400">Comprovantes oficiais com validade jurídica de locações temporárias</p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">
              {receipts.length} recibos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map(rec => (
              <div key={rec.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-primary-black">{rec.numeroRecibo}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{formatarDataBR(rec.dataEmissao)}</span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-primary-black text-sm">{rec.pagadorNome}</p>
                  <p className="text-gray-500">Imóvel: {rec.imovelTitulo} ({rec.imovelCodigo})</p>
                  <p className="text-gray-500">Período: {rec.periodoHospedagem}</p>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-black text-emerald-700 text-base">
                    {formatCurrency(rec.valorRecebido)}
                  </span>
                  <button
                    onClick={() => {
                      setActiveReceipt(rec);
                      setIsReceiptModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-black text-gold hover:bg-black font-bold text-xs transition-colors shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: IMÓVEIS DE TEMPORADA */}
      {activeTab === 'imoveis' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-display font-bold text-primary-black">Catálogo de Imóveis para Temporada</h3>
              <p className="text-xs text-gray-400">Imóveis habilitados para reservas de curta temporada</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(p => {
              const avail = getPropertyAvailability(p.id || '');
              const isPublished = p.publicado === true || p.publicadoNoSite === true;
              const displayAddress = p.address ? `${p.address}${p.number ? ', ' + p.number : ''}${p.neighborhood ? ' - ' + p.neighborhood : ''}` : (p.neighborhood && p.city ? `${p.neighborhood}, ${p.city}` : 'Balneário Camboriú/SC');

              return (
                <div key={p.id} className="rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
                  <div>
                    {/* Foto Principal + Código + Status */}
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {p.mainImage || (p.images && p.images[0]) ? (
                        <img 
                          src={p.mainImage || (typeof p.images[0] === 'string' ? p.images[0] : (p.images[0] as any)?.url)} 
                          alt={p.title} 
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Building2 size={44} />
                        </div>
                      )}
                      
                      {/* Código do Imóvel */}
                      <span className="absolute top-3 left-3 bg-primary-black/90 backdrop-blur-md text-gold px-3 py-1 rounded-xl text-xs font-black font-mono shadow-md">
                        {p.code || 'S/CÓD'}
                      </span>

                      {/* Situação de Publicação */}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border ${
                        isPublished 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                          : 'bg-black/70 text-gray-300 border-white/20'
                      }`}>
                        {isPublished ? 'Publicado no Site' : 'Rascunho / Privado'}
                      </span>

                      {/* Situação de Disponibilidade */}
                      <div className="absolute bottom-3 left-3">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md border ${avail.color}`}>
                          {avail.label}
                        </span>
                      </div>
                    </div>

                    {/* Dados do Imóvel */}
                    <div className="p-6 space-y-3">
                      <div>
                        <h4 className="font-display font-bold text-primary-black text-base line-clamp-1" title={p.title}>
                          {p.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {displayAddress}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 font-black uppercase block tracking-wider">Valor Diária</span>
                          <span className="font-black text-emerald-700 text-sm">
                            {formatCurrency(p.valorDiaria || p.priceDiaria || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-black uppercase block tracking-wider">Capacidade</span>
                          <span className="font-bold text-primary-black text-sm">
                            {p.maxHospedes || 2} hóspedes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Botões Obrigatórios: Abrir calendário, Nova reserva, Bloquear datas, Ver imóvel no site */}
                  <div className="p-6 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPropertyId(p.id || '');
                          setActiveTab('calendario');
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary-black text-gold hover:bg-black font-bold text-xs transition-colors shadow-sm"
                      >
                        <CalendarDays size={14} />
                        <span>Abrir Calendário</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenNewReservation({ checkIn: '', checkOut: '', propertyId: p.id || '' })}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl btn-gold font-black text-xs transition-colors shadow-sm"
                      >
                        <Plus size={14} />
                        <span>Nova Reserva</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenNewBlock({ checkIn: '', checkOut: '', propertyId: p.id || '' })}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-[11px] transition-colors"
                      >
                        <Lock size={13} />
                        <span>Bloquear Datas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          window.open(`/imovel/${encodeURIComponent(p.code || p.id)}`, '_blank');
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:text-gold hover:border-gold font-bold text-[11px] transition-colors"
                      >
                        <ExternalLink size={13} />
                        <span>Ver no Site</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA RESERVA */}
      {/* ======================================================== */}
      {isNewReservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-primary-black">Nova Locação Temporária</h3>
                  <p className="text-xs text-gray-400">Cadastre os dados do hóspede, datas e condições financeiras</p>
                </div>
              </div>
              <button onClick={() => setIsNewReservationModalOpen(false)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReservation} className="p-8 overflow-y-auto space-y-8 flex-grow">
              
              {/* 1. Imóvel */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-2">
                  <Building2 size={16} /> 1. Dados do Imóvel
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selecione o Imóvel</label>
                    <select
                      value={reservationForm.imovelId || ''}
                      onChange={(e) => {
                        const p = properties.find(prop => prop.id === e.target.value);
                        if (p) {
                          updateReservationCalculation({
                            imovelId: p.id,
                            imovelCodigo: p.code,
                            imovelTitulo: p.title,
                            imovelEndereco: p.address ? `${p.address}${p.number ? ', ' + p.number : ''}` : '',
                            proprietarioNome: p.ownerName || '',
                            proprietarioTelefone: p.ownerPhone || '',
                            valorDiaria: Number(p.valorDiaria || p.priceDiaria || 350),
                            taxaLimpeza: Number(p.taxaLimpeza || 150)
                          });
                        }
                      }}
                      className="input-field font-bold"
                      required
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.code} • {p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Proprietário Vinculado</label>
                    <input
                      type="text"
                      className="input-field bg-gray-50"
                      value={reservationForm.proprietarioNome || 'Proprietário cadastrado no imóvel'}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* 2. Hóspede */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-2">
                    <Users size={16} /> 2. Dados do Hóspede / Locatário
                  </h4>
                  {guests.length > 0 && (
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white font-medium"
                      onChange={(e) => {
                        const g = guests.find(guest => guest.id === e.target.value);
                        if (g) {
                          setReservationForm(prev => ({
                            ...prev,
                            hospedeId: g.id,
                            hospedeNome: g.nome,
                            hospedeCpf: g.cpf,
                            hospedeRg: g.rg,
                            hospedeTelefone: g.telefone,
                            hospedeWhatsapp: g.whatsapp,
                            hospedeEmail: g.email
                          }));
                        }
                      }}
                    >
                      <option value="">-- Puxar Hóspede já cadastrado --</option>
                      {guests.map(g => (
                        <option key={g.id} value={g.id}>{g.nome} ({g.cpf || g.telefone})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Nome Completo</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nome completo do hóspede"
                      value={reservationForm.hospedeNome || ''}
                      onChange={e => setReservationForm(prev => ({ ...prev, hospedeNome: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">CPF</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="000.000.000-00"
                      value={reservationForm.hospedeCpf || ''}
                      onChange={e => setReservationForm(prev => ({ ...prev, hospedeCpf: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="(47) 99999-9999"
                      value={reservationForm.hospedeWhatsapp || reservationForm.hospedeTelefone || ''}
                      onChange={e => setReservationForm(prev => ({ ...prev, hospedeWhatsapp: e.target.value, hospedeTelefone: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">E-mail</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="hospede@email.com"
                      value={reservationForm.hospedeEmail || ''}
                      onChange={e => setReservationForm(prev => ({ ...prev, hospedeEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Estadia */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-2">
                  <Calendar size={16} /> 3. Período e Hóspedes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Data de Entrada</label>
                    <input
                      type="date"
                      className="input-field"
                      value={reservationForm.dataEntrada || ''}
                      onChange={e => updateReservationCalculation({ dataEntrada: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Data de Saída</label>
                    <input
                      type="date"
                      className="input-field"
                      value={reservationForm.dataSaida || ''}
                      onChange={e => updateReservationCalculation({ dataSaida: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Qtd Diárias</label>
                    <input
                      type="number"
                      className="input-field bg-gray-50 font-bold"
                      value={reservationForm.quantidadeDiarias || 0}
                      readOnly
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Qtd Hóspedes</label>
                    <input
                      type="number"
                      className="input-field bg-gray-50 font-bold"
                      value={1 + companions.length}
                      readOnly
                    />
                  </div>
                </div>

                {/* Sub-section: Companions management */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gold block">
                        Acompanhantes do Hóspede
                      </span>
                      <p className="text-xs text-gray-500">
                        Total: <strong>{1 + companions.length}</strong> de <strong>{properties.find(p => p.id === reservationForm.imovelId)?.capacidadeHospedes || properties.find(p => p.id === reservationForm.imovelId)?.maxHospedes || 10}</strong> pessoas permitidas no imóvel (1 titular + {companions.length} adicionais)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCompanion}
                      className="px-3.5 py-2 rounded-xl bg-gold/15 text-gold-dark hover:bg-gold/25 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-gold/30"
                    >
                      <Plus size={14} />
                      <span>+ Adicionar acompanhante</span>
                    </button>
                  </div>

                  {companions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center">
                      Nenhum acompanhante cadastrado. A reserva será gerada apenas para o titular.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {companions.map((comp, idx) => (
                        <div key={comp.id || idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-4">
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Nome do Acompanhante</label>
                            <input
                              type="text"
                              placeholder="Nome completo"
                              value={comp.nome}
                              onChange={(e) => handleUpdateCompanion(comp.id, 'nome', e.target.value)}
                              className="input-field !py-1.5 text-xs bg-white"
                              required
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Documento (CPF / RG)</label>
                            <input
                              type="text"
                              placeholder="Documento"
                              value={comp.documento || ''}
                              onChange={(e) => handleUpdateCompanion(comp.id, 'documento', e.target.value)}
                              className="input-field !py-1.5 text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Parentesco</label>
                            <input
                              type="text"
                              placeholder="Ex: Esposa, Filho"
                              value={comp.parentesco || ''}
                              onChange={(e) => handleUpdateCompanion(comp.id, 'parentesco', e.target.value)}
                              className="input-field !py-1.5 text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold text-gray-400 block mb-0.5">Faixa Etária</label>
                            <select
                              value={comp.faixaEtaria || 'adulto'}
                              onChange={(e) => handleUpdateCompanion(comp.id, 'faixaEtaria', e.target.value as any)}
                              className="input-field !py-1.5 text-xs bg-white"
                            >
                              <option value="adulto">Adulto</option>
                              <option value="crianca">Criança</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveCompanion(comp.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover acompanhante"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Valores & Financeiro */}
              <div className="space-y-4 p-6 rounded-2xl bg-gold/5 border border-gold/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gold flex items-center gap-2">
                    <DollarSign size={16} /> 4. Condições Financeiras
                  </h4>
                  {reservationForm.detalhamentoDiarias && reservationForm.detalhamentoDiarias.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-500">
                      Calculado dia a dia com base nas regras sazonais
                    </span>
                  )}
                </div>

                {/* Day-by-Day Rates Breakdown */}
                {reservationForm.detalhamentoDiarias && reservationForm.detalhamentoDiarias.length > 0 && (
                  <div className="p-4 bg-white rounded-2xl border border-gold/20 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gold flex items-center gap-1.5">
                      <Tag size={12} /> Discriminação de cada Diária ({reservationForm.detalhamentoDiarias.length} noites)
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                      {reservationForm.detalhamentoDiarias.map((d, dIdx) => (
                        <div key={dIdx} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px]">
                          <span className="font-semibold text-gray-700">Noite {dIdx + 1} ({d.dataFmt || d.data})</span>
                          <div className="flex items-center gap-2">
                            {d.isSpecialPrice && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                {d.descricao || 'Tarifa Especial'}
                              </span>
                            )}
                            <span className="font-bold text-emerald-700">{formatCurrency(d.valor)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Valor da Diária (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-white"
                      value={maskCurrency(reservationForm.valorDiaria ?? 0)}
                      onChange={e => updateReservationCalculation({ valorDiaria: parseCurrencyToNumber(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Taxa de Limpeza (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-white"
                      value={maskCurrency(reservationForm.taxaLimpeza ?? 0)}
                      onChange={e => updateReservationCalculation({ taxaLimpeza: parseCurrencyToNumber(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Descontos (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-white"
                      value={maskCurrency(reservationForm.valorDesconto ?? 0)}
                      onChange={e => updateReservationCalculation({ valorDesconto: parseCurrencyToNumber(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 pl-1 font-bold">Total da Estadia (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-emerald-50 text-emerald-800 font-black text-sm"
                      value={formatCurrency(reservationForm.valorTotal || 0)}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Valor do Sinal Pago Agora (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-white font-bold"
                      value={maskCurrency(reservationForm.valorSinal ?? 0)}
                      onChange={e => {
                        const sinal = parseCurrencyToNumber(e.target.value);
                        updateReservationCalculation({ 
                          valorSinal: sinal,
                          valorPago: sinal
                        });
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Saldo Restante (R$)</label>
                    <input
                      type="text"
                      className="input-field bg-white font-bold"
                      value={formatCurrency(reservationForm.saldoRestante || 0)}
                      readOnly
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Forma de Pagamento</label>
                    <select
                      value={reservationForm.formaPagamento || 'PIX'}
                      onChange={e => setReservationForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                      className="input-field bg-white"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Transferência Bancária">Transferência Bancária</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Observações da Reserva</label>
                <textarea
                  rows={2}
                  className="input-field py-3 text-xs"
                  placeholder="Horários específicos de check-in, preferências do hóspede, regras..."
                  value={reservationForm.observacoes || ''}
                  onChange={e => setReservationForm(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewReservationModalOpen(false)}
                  className="px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-gold !py-3.5 px-8 text-xs font-black uppercase tracking-widest shadow-xl"
                >
                  Confirmar e Salvar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETALHES DA RESERVA */}
      {/* ======================================================== */}
      {isReservationDetailsModalOpen && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="font-mono text-xs font-black text-gold uppercase tracking-wider block">Detalhes da Reserva</span>
                <h3 className="text-xl font-display font-bold text-primary-black">{selectedReservation.codigoReserva}</h3>
              </div>
              <button onClick={() => setIsReservationDetailsModalOpen(false)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 flex-grow text-xs">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Status da Reserva</span>
                  <span className="font-extrabold text-sm text-primary-black uppercase tracking-wide">
                    {selectedReservation.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Status Financeiro</span>
                  <span className={`font-bold text-xs uppercase px-2.5 py-0.5 rounded-full ${
                    selectedReservation.statusPagamento === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                    selectedReservation.statusPagamento === 'parcial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedReservation.statusPagamento}
                  </span>
                </div>
              </div>

              {/* Property & Stay */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <h5 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Imóvel</h5>
                  <p className="font-bold text-sm text-primary-black">{selectedReservation.imovelTitulo}</p>
                  <p className="text-gray-600">Código: <strong>{selectedReservation.imovelCodigo}</strong></p>
                  <p className="text-gray-500">{selectedReservation.imovelEndereco}</p>
                </div>

                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <h5 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Hóspede</h5>
                  <p className="font-bold text-sm text-primary-black">{selectedReservation.hospedeNome}</p>
                  <p className="text-gray-600">CPF: {selectedReservation.hospedeCpf || 'Não informado'}</p>
                  <p className="text-gray-600">WhatsApp: {selectedReservation.hospedeWhatsapp || 'Sem telefone'}</p>
                </div>
              </div>

              {/* Dates & Financial Details */}
              <div className="p-5 rounded-2xl bg-gold/5 border border-gold/20 space-y-3">
                <h5 className="font-black text-gold uppercase tracking-widest text-[10px]">Período e Financeiro</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Entrada</span>
                    <span className="font-bold text-gray-800">{formatarDataBR(selectedReservation.dataEntrada)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Saída</span>
                    <span className="font-bold text-gray-800">{formatarDataBR(selectedReservation.dataSaida)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Diárias</span>
                    <span className="font-bold text-gray-800">{selectedReservation.quantidadeDiarias} noites</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] uppercase font-bold block">Valor Total</span>
                    <span className="font-black text-primary-black text-sm">{formatCurrency(selectedReservation.valorTotal)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gold/20 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold">Total Pago: {formatCurrency(selectedReservation.valorPago)}</span>
                  <span className="text-amber-800 font-bold">Saldo Restante: {formatCurrency(selectedReservation.saldoRestante)}</span>
                </div>

                {/* Day-by-day detail breakdown if present */}
                {selectedReservation.detalhamentoDiarias && selectedReservation.detalhamentoDiarias.length > 0 && (
                  <div className="pt-3 border-t border-gold/20 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gold block">
                      Discriminação das Diárias ({selectedReservation.detalhamentoDiarias.length} noites)
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {selectedReservation.detalhamentoDiarias.map((d, dIdx) => (
                        <div key={dIdx} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/60 border border-gold/15 text-[11px]">
                          <span className="text-gray-700">Noite {dIdx + 1} ({d.dataFmt || d.data})</span>
                          <div className="flex items-center gap-2">
                            {d.isSpecialPrice && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                {d.descricao || 'Especial'}
                              </span>
                            )}
                            <span className="font-bold text-emerald-800">{formatCurrency(d.valor)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Companions & Vehicles Cards if available */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <h5 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">
                    Acompanhantes Cadastrados ({selectedReservation.acompanhantes?.length || 0})
                  </h5>
                  {selectedReservation.acompanhantes && selectedReservation.acompanhantes.length > 0 ? (
                    <div className="space-y-1.5 text-xs text-gray-700">
                      {selectedReservation.acompanhantes.map((acomp, aIdx) => (
                        <div key={aIdx} className="p-2 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{acomp.nomeCompleto || acomp.nome}</span>
                          <span className="text-[11px] text-gray-500">
                            {acomp.parentesco || 'Acompanhante'} {acomp.faixaEtaria ? `(${acomp.faixaEtaria})` : ''} {acomp.documento ? `• Doc: ${acomp.documento}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Nenhum acompanhante adicional registrado.</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <h5 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">
                    Veículos na Garagem
                  </h5>
                  {selectedReservation.possuiVeiculo && selectedReservation.veiculos && selectedReservation.veiculos.length > 0 ? (
                    <div className="space-y-1.5 text-xs text-gray-700">
                      {selectedReservation.veiculos.map((veh, vIdx) => (
                        <div key={vIdx} className="p-2 bg-white rounded-lg border border-gray-200 flex justify-between">
                          <span className="font-semibold">{veh.tipo}: {veh.marca} {veh.modelo}</span>
                          <span className="font-mono font-bold text-primary-black uppercase bg-gray-100 px-2 py-0.5 rounded">{veh.placa}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sem veículo registrado para garagem.</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={async () => {
                    if (window.confirm('Deseja realmente cancelar esta reserva?')) {
                      await cancelReservation(selectedReservation.id || '');
                      triggerToast('Reserva cancelada.', 'success');
                      setIsReservationDetailsModalOpen(false);
                      await loadData();
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs"
                >
                  Cancelar Reserva
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      const url = buildTemporaryRentalWhatsAppUrl('detalhes_reserva', {
                        imovelTitulo: selectedReservation.imovelTitulo,
                        imovelCodigo: selectedReservation.imovelCodigo,
                        dataEntrada: selectedReservation.dataEntrada,
                        dataSaida: selectedReservation.dataSaida,
                        quantidadeDiarias: selectedReservation.quantidadeDiarias,
                        quantidadeHospedes: selectedReservation.quantidadeHospedes,
                        valorTotal: selectedReservation.valorTotal,
                        valorPago: selectedReservation.valorPago,
                        saldoRestante: selectedReservation.saldoRestante,
                        hospedeNome: selectedReservation.hospedeNome,
                        hospedeTelefone: selectedReservation.hospedeWhatsapp
                      });
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    <MessageSquare size={16} />
                    <span>Enviar WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentForm({
                        reservaId: selectedReservation.id,
                        valor: selectedReservation.saldoRestante > 0 ? selectedReservation.saldoRestante : selectedReservation.valorTotal,
                        tipo: selectedReservation.valorPago === 0 ? 'sinal' : 'saldo_final',
                        formaPagamento: 'PIX',
                        status: 'confirmado'
                      });
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-black text-gold hover:bg-black font-bold text-xs shadow-md"
                  >
                    <DollarSign size={16} />
                    <span>Registrar Pagamento</span>
                  </button>

                  {selectedReservation.valorPago > 0 && (
                    <button
                      onClick={() => {
                        handleEmitReceiptForPayment(selectedReservation, selectedReservation.valorPago);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-gold font-black text-xs shadow-md"
                    >
                      <Printer size={16} />
                      <span>Gerar Recibo</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigate(`/admin/contratos/novo?tipo=locacao_temporaria&reservaId=${selectedReservation.id}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold hover:bg-gold/90 text-primary-black font-extrabold text-xs shadow-md transition-colors"
                  >
                    <FileText size={16} />
                    <span>Emitir Contrato</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PAGAMENTO */}
      {/* ======================================================== */}
      {isPaymentModalOpen && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-display font-bold text-primary-black">Registrar Recebimento de Temporada</h3>
                <p className="text-xs text-gray-400">Reserva {selectedReservation.codigoReserva}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterPaymentSubmit} className="p-8 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500">Hóspede: <strong>{selectedReservation.hospedeNome}</strong></p>
                <p className="text-gray-500">Valor Total da Reserva: <strong>{formatCurrency(selectedReservation.valorTotal)}</strong></p>
                <p className="text-amber-700 font-bold mt-1">Saldo Pendente: {formatCurrency(selectedReservation.saldoRestante)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Valor do Pagamento Recebido (R$)</label>
                <input
                  type="text"
                  className="input-field text-base font-black text-emerald-700"
                  value={maskCurrency(paymentForm.valor ?? 0)}
                  onChange={e => setPaymentForm(prev => ({ ...prev, valor: parseCurrencyToNumber(e.target.value) }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Tipo de Pagamento</label>
                  <select
                    className="input-field"
                    value={paymentForm.tipo || 'pagamento_parcial'}
                    onChange={e => setPaymentForm(prev => ({ ...prev, tipo: e.target.value as TemporaryPaymentType }))}
                  >
                    <option value="sinal">Sinal / Entrada</option>
                    <option value="pagamento_parcial">Pagamento Parcial</option>
                    <option value="saldo_final">Saldo Final / Quitação</option>
                    <option value="pagamento_integral">Pagamento Integral</option>
                    <option value="taxa_limpeza">Taxa de Limpeza</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Forma de Pagamento</label>
                  <select
                    className="input-field"
                    value={paymentForm.formaPagamento || 'PIX'}
                    onChange={e => setPaymentForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Observações do Pagamento</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Comprovante enviado via WhatsApp"
                  value={paymentForm.observacoes || ''}
                  onChange={e => setPaymentForm(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-gold !py-2.5 px-6 font-black uppercase tracking-wider shadow-lg"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BLOQUEAR DATAS */}
      {/* ======================================================== */}
      {isNewBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary-black">Bloqueio Manual de Datas</h3>
                  <p className="text-xs text-gray-400">Impeça reservas em períodos específicos no calendário</p>
                </div>
              </div>
              <button onClick={() => setIsNewBlockModalOpen(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="p-8 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Imóvel</label>
                <select
                  className="input-field"
                  value={blockForm.imovelId || ''}
                  onChange={e => {
                    const p = properties.find(prop => prop.id === e.target.value);
                    setBlockForm(prev => ({
                      ...prev,
                      imovelId: e.target.value,
                      imovelCodigo: p?.code,
                      imovelTitulo: p?.title
                    }));
                  }}
                  required
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.code} • {p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Data Início</label>
                  <input
                    type="date"
                    className="input-field"
                    value={blockForm.dataInicio || ''}
                    onChange={e => setBlockForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Data Fim</label>
                  <input
                    type="date"
                    className="input-field"
                    value={blockForm.dataFim || ''}
                    onChange={e => setBlockForm(prev => ({ ...prev, dataFim: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Motivo do Bloqueio</label>
                <select
                  className="input-field"
                  value={blockForm.motivo || 'bloqueio_manual'}
                  onChange={e => setBlockForm(prev => ({ ...prev, motivo: e.target.value as TemporaryBlockReason }))}
                >
                  <option value="bloqueio_manual">Bloqueio Manual pelo Administrador</option>
                  <option value="manutencao">Manutenção / Reforma / Reparo</option>
                  <option value="uso_proprietario">Uso Próprio do Proprietário</option>
                  <option value="outro">Outro Motivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Observações Internas</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Troca de ar-condicionado na suíte"
                  value={blockForm.observacoes || ''}
                  onChange={e => setBlockForm(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewBlockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary-black text-gold hover:bg-black font-black uppercase tracking-wider shadow-lg"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETALHES DA SOLICITAÇÃO DE RESERVA */}
      {/* ======================================================== */}
      {isRequestDetailsModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 my-8">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary-black">
                    Solicitação #{selectedRequest.codigoSolicitacao || selectedRequest.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Recebida em {selectedRequest.criadoEm?.seconds ? new Date(selectedRequest.criadoEm.seconds * 1000).toLocaleString('pt-BR') : 'Hoje'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRequestDetailsModalOpen(false)} 
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-8 space-y-6 text-xs">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Situação:</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  selectedRequest.status === 'confirmada' ? 'bg-emerald-100 text-emerald-800' :
                  selectedRequest.status === 'recusada' ? 'bg-red-100 text-red-800' :
                  selectedRequest.status === 'cancelada' ? 'bg-gray-100 text-gray-700' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {selectedRequest.status === 'confirmada' ? 'Confirmada / Reserva Criada' :
                   selectedRequest.status === 'recusada' ? 'Recusada' :
                   selectedRequest.status === 'cancelada' ? 'Cancelada' :
                   'Pendente de Avaliação'}
                </span>
              </div>

              {/* Property Info */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Imóvel Solicitado</span>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <p className="font-bold text-sm text-primary-black">{selectedRequest.imovelTitulo}</p>
                  <p className="text-xs text-gray-500">Código: {selectedRequest.imovelCodigo} • {selectedRequest.imovelEndereco || 'Balneário Camboriú/SC'}</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Dados do Solicitante</span>
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <p className="font-bold text-sm text-primary-black">{selectedRequest.nomeCliente}</p>
                  <div className="grid grid-cols-2 gap-2 text-gray-600">
                    <p>WhatsApp: <strong>{selectedRequest.whatsapp || selectedRequest.telefone}</strong></p>
                    <p>E-mail: <strong>{selectedRequest.email || 'Não informado'}</strong></p>
                  </div>
                  {selectedRequest.observacoes && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-400 text-[10px] block">Observações do Cliente:</span>
                      <p className="text-gray-700 italic mt-0.5">{selectedRequest.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Finances & Dates */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Reserva Solicitada</span>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-bold text-gray-800">
                      {formatarDataBR(selectedRequest.dataEntrada)} a {formatarDataBR(selectedRequest.dataSaida)} ({selectedRequest.quantidadeDiarias} diárias)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hóspedes:</span>
                    <span className="font-bold text-gray-800">{selectedRequest.quantidadeHospedes} pessoa(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor da Diária:</span>
                    <span className="font-bold text-gray-800">{formatCurrency(selectedRequest.valorDiaria)}</span>
                  </div>
                  {(selectedRequest.taxaLimpeza || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxa de Limpeza:</span>
                      <span className="font-bold text-gray-800">{formatCurrency(selectedRequest.taxaLimpeza || 0)}</span>
                    </div>
                  )}
                  <div className="border-t border-amber-200 pt-2 flex justify-between items-baseline font-bold">
                    <span className="text-primary-black uppercase tracking-wide text-xs">Total Estimado:</span>
                    <span className="text-base font-display font-black text-emerald-800">
                      {formatCurrency(selectedRequest.valorTotalEstimado)}
                    </span>
                  </div>

                  {/* Day-by-day detail breakdown if present */}
                  {selectedRequest.detalhamentoDiarias && selectedRequest.detalhamentoDiarias.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/80 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                        Detalhamento das Diárias
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1 text-[11px]">
                        {selectedRequest.detalhamentoDiarias.map((d, dIdx) => (
                          <div key={dIdx} className="flex items-center justify-between py-0.5 px-2 rounded bg-white/70">
                            <span className="text-gray-700">Noite {dIdx + 1} ({d.dataFmt || d.data})</span>
                            <div className="flex items-center gap-1.5">
                              {d.isSpecialPrice && (
                                <span className="px-1 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-bold">
                                  {d.descricao || 'Tarifa Especial'}
                                </span>
                              )}
                              <span className="font-bold text-emerald-800">{formatCurrency(d.valor)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Companions and Vehicles info for request */}
              {((selectedRequest.acompanhantes && selectedRequest.acompanhantes.length > 0) || selectedRequest.possuiVeiculo) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.acompanhantes && selectedRequest.acompanhantes.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                        Acompanhantes ({selectedRequest.acompanhantes.length})
                      </span>
                      {selectedRequest.acompanhantes.map((a, i) => (
                        <div key={i} className="p-2 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{a.nomeCompleto || (a as any).nome}</span>
                          <span className="text-[11px] text-gray-500">
                            {a.parentesco || 'Acompanhante'} {a.faixaEtaria ? `(${a.faixaEtaria})` : ''} {a.documento ? `• Doc: ${a.documento}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedRequest.possuiVeiculo && selectedRequest.veiculos && selectedRequest.veiculos.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                        Veículo para Garagem
                      </span>
                      {selectedRequest.veiculos.map((v, i) => (
                        <div key={i} className="p-2 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{v.tipo}: {v.marca} {v.modelo}</span>
                          <span className="font-mono font-bold uppercase bg-gray-100 px-2 py-0.5 rounded text-[11px]">{v.placa}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const cleanNum = (selectedRequest.whatsapp || selectedRequest.telefone || '').replace(/\D/g, '');
                    const whatsUrl = cleanNum ? `https://wa.me/55${cleanNum.replace(/^55/, '')}` : '#';
                    window.open(whatsUrl, '_blank');
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                >
                  <MessageSquare size={16} />
                  <span>Falar no WhatsApp</span>
                </button>

                <div className="flex items-center gap-2">
                  {(selectedRequest.status === 'solicitacao_recebida' || !selectedRequest.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRefuseRequest(selectedRequest)}
                        className="px-4 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-colors"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(selectedRequest)}
                        className="px-5 py-3 rounded-xl btn-gold font-black uppercase tracking-wider shadow-lg"
                      >
                        Aprovar e Criar Reserva
                      </button>
                    </>
                  )}
                  {selectedRequest.status === 'confirmada' && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 size={16} /> Reserva ativa no sistema
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PREÇO ESPECIAL POR PERÍODO */}
      {/* ======================================================== */}
      {isSeasonalPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 space-y-6 p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary-black">
                    {editingSeasonalPrice ? 'Editar Preço por Período' : 'Novo Preço por Período'}
                  </h3>
                  <p className="text-xs text-gray-400">Tarifa diferenciada para feriados ou temporadas</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsSeasonalPriceModalOpen(false);
                  setEditingSeasonalPrice(null);
                }}
                className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:text-black flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSeasonalPrice} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                  Imóvel de Temporada
                </label>
                <select
                  value={seasonalPriceForm.imovelId}
                  onChange={(e) => setSeasonalPriceForm(prev => ({ ...prev, imovelId: e.target.value }))}
                  className="input-field font-bold text-xs"
                  required
                >
                  <option value="">Selecione o imóvel...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.code} • {p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={seasonalPriceForm.dataInicio}
                    onChange={(e) => setSeasonalPriceForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="input-field text-xs font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={seasonalPriceForm.dataFim}
                    onChange={(e) => setSeasonalPriceForm(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="input-field text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                  Valor da Diária neste Período (R$)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 850,00"
                  value={maskCurrency(seasonalPriceForm.valorDiaria)}
                  onChange={(e) => setSeasonalPriceForm(prev => ({ ...prev, valorDiaria: parseCurrencyToNumber(e.target.value) }))}
                  className="input-field text-xs font-bold bg-amber-50/50 text-amber-900 border-amber-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                  Motivo / Descrição do Período
                </label>
                <input
                  type="text"
                  placeholder="Ex: Réveillon, Feriado de Finados, Alta Temporada..."
                  value={seasonalPriceForm.descricao}
                  onChange={(e) => setSeasonalPriceForm(prev => ({ ...prev, descricao: e.target.value }))}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-[11px] leading-relaxed">
                <span className="font-bold text-gray-700">Regra de Aplicação:</span> Todas as diárias compreendidas entre a data de início e término serão calculadas com este valor diferenciado. Se houver mais de uma regra para a mesma data, o período mais específico terá prioridade.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSeasonalPriceModalOpen(false);
                    setEditingSeasonalPrice(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl btn-gold font-black uppercase tracking-wider shadow-md"
                >
                  Salvar Preço Especial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONSUMER RECEIPT MODAL (PRINT & PDF) */}
      {/* ======================================================== */}
      {activeReceipt && (
        <TemporaryReceiptModal
          receipt={activeReceipt}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

    </div>
  );
}

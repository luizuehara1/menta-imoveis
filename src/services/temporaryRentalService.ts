import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  TemporaryReservation, 
  TemporaryBlock, 
  TemporaryGuest, 
  TemporaryPayment, 
  TemporaryReceipt,
  TemporaryReservationRequest,
  TemporaryOccupancy,
  TemporarySeasonalPrice,
  TemporaryDailyRateDetail,
  Property 
} from '../types';
import { formatarDataBR, formatCurrency, valorMonetarioPorExtenso } from '../lib/utils';

/**
 * Adds N days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateToMidnight(dateStr) || new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Checks whether two half-open date intervals [startA, endA) and [startB, endB) overlap.
 * In temporary rentals, check-out date (end) is morning/midday, so checkout on day X
 * does not conflict with a checkin on the same day X.
 */
export function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/**
 * Recursively locates any properties or array elements that are strictly `undefined`.
 * Returns an array of dot/bracket notation paths (e.g. "detalhamentoDiarias[0].descricao").
 */
export function findUndefinedPaths(obj: any, currentPath = ''): string[] {
  const paths: string[] = [];

  if (obj === undefined) {
    paths.push(currentPath || '(root)');
    return paths;
  }

  if (obj === null || typeof obj !== 'object') {
    return paths;
  }

  // Preserve Firestore FieldValues (serverTimestamp) and dates
  if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
    return paths;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPath = `${currentPath}[${index}]`;
      if (item === undefined) {
        paths.push(itemPath);
      } else {
        paths.push(...findUndefinedPaths(item, itemPath));
      }
    });
    return paths;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const keyPath = currentPath ? `${currentPath}.${key}` : key;
    if (val === undefined) {
      paths.push(keyPath);
    } else {
      paths.push(...findUndefinedPaths(val, keyPath));
    }
  }

  return paths;
}

/**
 * Deeply removes any keys whose values are strictly `undefined`.
 * Ensures Firestore addDoc/setDoc/updateDoc never throws "Unsupported field value: undefined".
 * Preserves Date, serverTimestamp, booleans, numbers, arrays, and strings.
 */
export function sanitizeFirestorePayload<T>(value: T): T {
  if (value === undefined) {
    return undefined as any;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Preserve Firestore FieldValues (e.g. serverTimestamp), Timestamps, Dates
  if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
    return value;
  }

  if (Array.isArray(value)) {
    return (value as any[])
      .map(item => sanitizeFirestorePayload(item))
      .filter(item => item !== undefined) as any;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(value as Record<string, any>)) {
    if (val !== undefined) {
      const sanitized = sanitizeFirestorePayload(val);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
  }
  return cleaned as T;
}

/**
 * Parses date string in YYYY-MM-DD or DD/MM/YYYY into midday Date to prevent timezone drift.
 */
export function parseDateToMidnight(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim().split('T')[0];
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
  } else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Calculates number of nights between check-in and check-out.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = parseDateToMidnight(checkIn);
  const d2 = parseDateToMidnight(checkOut);
  if (!d1 || !d2) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Fetches all properties that are registered for temporary rental or available.
 */
export async function fetchTemporaryProperties(): Promise<Property[]> {
  try {
    const snap = await getDocs(collection(db, 'imoveis'));
    const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Property[];
    // Filter strictly temporary properties
    const tempProps = all.filter(p => {
      const bType = String(p.businessType || (p as any).tipoNegocio || (p as any).tipo_negocio || '').toLowerCase();
      return bType.includes('tempor');
    });
    return tempProps;
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar imóveis de temporada:', error);
    return [];
  }
}

/**
 * Checks if a property has active or future reservations.
 * Useful when changing property modality to warn the administrator.
 */
export async function checkFutureActiveReservations(imovelId: string): Promise<TemporaryReservation[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const list = await fetchReservations(imovelId);
    return list.filter(r => {
      const isFutureOrCurrent = (r.dataSaida || '') >= today;
      const isActive = r.status !== 'cancelada';
      return isFutureOrCurrent && isActive;
    });
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao checar reservas futuras:', error);
    return [];
  }
}

/**
 * Fetches all properties in general.
 */
export async function fetchAllProperties(): Promise<Property[]> {
  try {
    const snap = await getDocs(collection(db, 'imoveis'));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Property[];
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar catálogo de imóveis:', error);
    return [];
  }
}

/**
 * Fetches reservations for an optional property or all.
 */
export async function fetchReservations(imovelId?: string): Promise<TemporaryReservation[]> {
  try {
    const ref = collection(db, 'reservasTemporada');
    const snap = await getDocs(ref);
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryReservation[];
    if (imovelId) {
      list = list.filter(r => r.imovelId === imovelId);
    }
    // Sort by dataEntrada descending
    list.sort((a, b) => (b.dataEntrada || '').localeCompare(a.dataEntrada || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar reservas administrativas (usuário precisa estar logado como admin).');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar reservas:', error);
    }
    return [];
  }
}

/**
 * Fetches date blocks.
 */
export async function fetchBlocks(imovelId?: string): Promise<TemporaryBlock[]> {
  try {
    const ref = collection(db, 'bloqueiosTemporada');
    const snap = await getDocs(ref);
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryBlock[];
    if (imovelId) {
      list = list.filter(b => b.imovelId === imovelId);
    }
    list.sort((a, b) => (a.dataInicio || '').localeCompare(b.dataInicio || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar bloqueios.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar bloqueios:', error);
    }
    return [];
  }
}

/**
 * Fetches seasonal / special pricing rules for a property or all properties.
 */
export async function fetchSeasonalPrices(imovelId?: string): Promise<TemporarySeasonalPrice[]> {
  try {
    const ref = collection(db, 'precosTemporada');
    const snap = await getDocs(ref);
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporarySeasonalPrice[];
    if (imovelId) {
      list = list.filter(p => p.imovelId === imovelId);
    }
    list.sort((a, b) => (a.dataInicio || '').localeCompare(b.dataInicio || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar preços sazonais.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar preços sazonais:', error);
    }
    return [];
  }
}

/**
 * Saves (creates or updates) a seasonal price rule.
 */
export async function saveSeasonalPrice(
  priceRule: Partial<TemporarySeasonalPrice>, 
  userUid?: string
): Promise<string> {
  if (!priceRule.imovelId) throw new Error('Selecione um imóvel para definir o preço especial.');
  if (!priceRule.dataInicio || !priceRule.dataFim) throw new Error('Informe o período (data inicial e final) do preço especial.');
  if (priceRule.dataInicio > priceRule.dataFim) throw new Error('A data final deve ser igual ou posterior à data inicial.');
  const val = Number(priceRule.valorDiaria || 0);
  if (val <= 0) throw new Error('Informe um valor de diária válido e maior que zero.');

  const payload: any = {
    ...priceRule,
    valorDiaria: val,
    descricao: (priceRule.descricao || 'Tarifa Especial').trim(),
    atualizadoEm: serverTimestamp()
  };

  if (!priceRule.id) {
    payload.criadoEm = serverTimestamp();
    payload.criadoPor = userUid || null;
    const docRef = await addDoc(collection(db, 'precosTemporada'), payload);
    return docRef.id;
  } else {
    await updateDoc(doc(db, 'precosTemporada', priceRule.id), payload);
    return priceRule.id;
  }
}

/**
 * Deletes a seasonal price rule.
 */
export async function deleteSeasonalPrice(priceId: string): Promise<void> {
  await deleteDoc(doc(db, 'precosTemporada', priceId));
}

/**
 * Calculates day-by-day reservation breakdown applying deterministic pricing priority:
 * 1. Matching seasonal price rule for the specific date.
 *    If multiple rules match the same date:
 *    a) The rule with smaller interval (most specific date range) has highest precedence.
 *    b) Ties are broken by newest creation/update.
 * 2. Default property daily rate if no special rule applies.
 * 3. Cleaning fee + other fees - discount.
 */
export function calculateReservationBreakdown(
  property: Property | null,
  checkIn: string,
  checkOut: string,
  seasonalPrices: TemporarySeasonalPrice[] = [],
  desconto = 0,
  outrasTaxas = 0
): {
  nights: number;
  dailyRates: TemporaryDailyRateDetail[];
  subtotalDiarias: number;
  taxaLimpeza: number;
  outrasTaxas: number;
  desconto: number;
  valorTotal: number;
  averageDailyRate: number;
  hasZeroRate: boolean;
} {
  const nights = calculateNights(checkIn, checkOut);
  const defaultDailyRate = Number(property?.valorDiaria || property?.priceDiaria || property?.precoDiaria || property?.diaria || 0);
  const taxaLimpeza = Number(property?.taxaLimpeza || property?.taxaLimpezaTemporada || 0);

  if (nights <= 0 || !checkIn) {
    return {
      nights: 0,
      dailyRates: [],
      subtotalDiarias: 0,
      taxaLimpeza,
      outrasTaxas: 0,
      desconto: 0,
      valorTotal: 0,
      averageDailyRate: defaultDailyRate,
      hasZeroRate: false
    };
  }

  const dailyRates: TemporaryDailyRateDetail[] = [];
  const propertyRules = (seasonalPrices || []).filter(p => !property?.id || p.imovelId === property.id);

  for (let i = 0; i < nights; i++) {
    const dayDate = parseDateToMidnight(checkIn) || new Date();
    dayDate.setDate(dayDate.getDate() + i);
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayDate.getDate()).padStart(2, '0');
    const dayKey = `${y}-${m}-${d}`;

    // Find all matching rules
    const matchingRules = propertyRules.filter(r => 
      r.dataInicio <= dayKey && 
      dayKey <= r.dataFim && 
      Number(r.valorDiaria) > 0
    );

    let appliedRate = defaultDailyRate;
    let isSpecial = false;
    let desc = '';

    if (matchingRules.length > 0) {
      // Deterministic priority:
      // 1. Smaller interval length (dataFim - dataInicio in days) -> most specific
      // 2. Newest rule
      matchingRules.sort((a, b) => {
        const spanA = calculateNights(a.dataInicio, a.dataFim);
        const spanB = calculateNights(b.dataInicio, b.dataFim);
        if (spanA !== spanB) return spanA - spanB;
        const timeA = a.atualizadoEm?.seconds || a.criadoEm?.seconds || 0;
        const timeB = b.atualizadoEm?.seconds || b.criadoEm?.seconds || 0;
        return timeB - timeA;
      });

      const bestRule = matchingRules[0];
      appliedRate = Number(bestRule.valorDiaria);
      isSpecial = true;
      desc = bestRule.descricao || 'Tarifa Especial';
    }

    dailyRates.push({
      data: dayKey,
      dataFmt: formatarDataBR(dayKey),
      valor: appliedRate,
      isSpecialPrice: isSpecial,
      descricao: desc
    });
  }

  const subtotalDiarias = dailyRates.reduce((sum, item) => sum + item.valor, 0);
  const cleanFee = Math.max(0, taxaLimpeza);
  const other = Math.max(0, outrasTaxas);
  const disc = Math.max(0, desconto);
  const valorTotal = Math.max(0, subtotalDiarias + cleanFee + other - disc);
  const averageDailyRate = nights > 0 ? subtotalDiarias / nights : defaultDailyRate;
  const hasZeroRate = nights > 0 ? (dailyRates.some(d => d.valor <= 0) || (dailyRates.length === 0 && defaultDailyRate <= 0)) : false;

  return {
    nights,
    dailyRates,
    subtotalDiarias,
    taxaLimpeza: cleanFee,
    outrasTaxas: other,
    desconto: disc,
    valorTotal,
    averageDailyRate,
    hasZeroRate
  };
}

/**
 * Fetches guests.
 */
export async function fetchGuests(): Promise<TemporaryGuest[]> {
  try {
    const ref = collection(db, 'hospedesTemporada');
    const snap = await getDocs(ref);
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryGuest[];
    list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar hóspedes.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar hóspedes:', error);
    }
    return [];
  }
}

/**
 * Fetches payments.
 */
export async function fetchPayments(reservaId?: string): Promise<TemporaryPayment[]> {
  try {
    const ref = collection(db, 'pagamentosTemporada');
    const snap = await getDocs(ref);
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryPayment[];
    if (reservaId) {
      list = list.filter(p => p.reservaId === reservaId);
    }
    list.sort((a, b) => (b.dataPagamento || '').localeCompare(a.dataPagamento || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar pagamentos.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar pagamentos:', error);
    }
    return [];
  }
}

/**
 * Fetches customer receipts.
 */
export async function fetchReceipts(reservaId?: string): Promise<TemporaryReceipt[]> {
  try {
    const ref = collection(db, 'recibosTemporada');
    const snap = await getDocs(ref);
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryReceipt[];
    if (reservaId) {
      list = list.filter(r => r.reservaId === reservaId);
    }
    list.sort((a, b) => (b.dataEmissao || '').localeCompare(a.dataEmissao || ''));
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar recibos.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar recibos:', error);
    }
    return [];
  }
}

/**
 * Checks if a date range is free for a property.
 */
export async function checkAvailability(
  imovelId: string, 
  dataEntrada: string, 
  dataSaida: string, 
  excludeReservaId?: string,
  excludeBlockId?: string
): Promise<{ 
  available: boolean; 
  reason?: string; 
  conflictingReservation?: TemporaryReservation; 
  conflictingBlock?: TemporaryBlock 
}> {
  if (!imovelId || !dataEntrada || !dataSaida) {
    return { available: false, reason: 'Imóvel e datas de entrada e saída são obrigatórios.' };
  }

  if (dataEntrada >= dataSaida) {
    return { available: false, reason: 'A data de saída deve ser posterior à data de entrada.' };
  }

  // 1. Check existing active reservations
  const allReservations = await fetchReservations(imovelId);
  const activeReservations = allReservations.filter(r => 
    r.status !== 'cancelada' && 
    (!excludeReservaId || r.id !== excludeReservaId)
  );

  for (const r of activeReservations) {
    if (doIntervalsOverlap(dataEntrada, dataSaida, r.dataEntrada, r.dataSaida)) {
      return {
        available: false,
        reason: `Conflito com a Reserva ${r.codigoReserva} (${formatarDataBR(r.dataEntrada)} a ${formatarDataBR(r.dataSaida)}) para ${r.hospedeNome}.`,
        conflictingReservation: r
      };
    }
  }

  // 2. Check blocks
  const allBlocks = await fetchBlocks(imovelId);
  const activeBlocks = allBlocks.filter(b => (!excludeBlockId || b.id !== excludeBlockId));

  for (const b of activeBlocks) {
    const blockEnd = b.dataFimEfetivo || (b.dataFim === b.dataInicio ? addDays(b.dataFim, 1) : addDays(b.dataFim, 1));
    if (doIntervalsOverlap(dataEntrada, dataSaida, b.dataInicio, blockEnd)) {
      const motivoLabel = b.motivo === 'manutencao' ? 'Manutenção' : b.motivo === 'uso_proprietario' ? 'Uso do Proprietário' : 'Bloqueio Manual';
      return {
        available: false,
        reason: `O período coincide com um bloqueio administrativo (${motivoLabel}: ${formatarDataBR(b.dataInicio)} a ${formatarDataBR(b.dataFim)}).`,
        conflictingBlock: b
      };
    }
  }

  return { available: true };
}

/**
 * Generates unique reservation code.
 */
export function generateReservationCode(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RES-${year}-${random}`;
}

/**
 * Generates unique receipt code.
 */
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `REC-TEMP-${year}-${random}`;
}

/**
 * Creates or updates a temporary rental reservation.
 */
export async function saveReservation(
  reservation: Partial<TemporaryReservation>, 
  userUid?: string
): Promise<string> {
  if (!reservation.imovelId) throw new Error('Selecione um imóvel para a locação temporária.');
  if (!reservation.dataEntrada || !reservation.dataSaida) throw new Error('Informe as datas de entrada e saída.');
  if (!reservation.hospedeNome) throw new Error('Informe o nome do hóspede.');

  // Verify availability atomically before persisting
  const avail = await checkAvailability(
    reservation.imovelId,
    reservation.dataEntrada,
    reservation.dataSaida,
    reservation.id
  );

  if (!avail.available) {
    throw new Error(avail.reason || 'O imóvel não está disponível no período selecionado.');
  }

  // Upsert guest record in hospedesTemporada
  try {
    const guestsRef = collection(db, 'hospedesTemporada');
    const existingGuests = await getDocs(guestsRef);
    const foundGuestDoc = existingGuests.docs.find(d => {
      const g = d.data();
      const matchCpf = reservation.hospedeCpf && g.cpf && g.cpf.replace(/\D/g, '') === reservation.hospedeCpf.replace(/\D/g, '');
      const matchEmail = reservation.hospedeEmail && g.email && g.email.toLowerCase() === reservation.hospedeEmail.toLowerCase();
      return matchCpf || matchEmail;
    });

    if (foundGuestDoc) {
      await updateDoc(doc(db, 'hospedesTemporada', foundGuestDoc.id), {
        nome: reservation.hospedeNome,
        cpf: reservation.hospedeCpf || '',
        rg: reservation.hospedeRg || '',
        telefone: reservation.hospedeTelefone || '',
        whatsapp: reservation.hospedeWhatsapp || reservation.hospedeTelefone || '',
        email: reservation.hospedeEmail || '',
        ultimaEstadia: reservation.dataEntrada,
        atualizadoEm: serverTimestamp()
      });
      reservation.hospedeId = foundGuestDoc.id;
    } else {
      const newGuestRef = await addDoc(guestsRef, {
        nome: reservation.hospedeNome,
        cpf: reservation.hospedeCpf || '',
        rg: reservation.hospedeRg || '',
        telefone: reservation.hospedeTelefone || '',
        whatsapp: reservation.hospedeWhatsapp || reservation.hospedeTelefone || '',
        email: reservation.hospedeEmail || '',
        totalReservas: 1,
        ultimaEstadia: reservation.dataEntrada,
        criadoEm: serverTimestamp()
      });
      reservation.hospedeId = newGuestRef.id;
    }
  } catch (guestErr) {
    console.warn('[temporaryRentalService] Aviso ao atualizar diretório de hóspedes:', guestErr);
  }

  const codigo = reservation.codigoReserva || generateReservationCode();
  const valorTotal = Number(reservation.valorTotal || 0);
  const valorSinal = Number(reservation.valorSinal || 0);
  const valorPago = Number(reservation.valorPago || (valorSinal > 0 ? valorSinal : 0));
  const saldoRestante = Math.max(0, valorTotal - valorPago);
  
  let statusPagamento = reservation.statusPagamento || 'pendente';
  if (valorPago >= valorTotal && valorTotal > 0) {
    statusPagamento = 'pago';
  } else if (valorPago > 0) {
    statusPagamento = 'parcial';
  }

  const payload: any = sanitizeFirestorePayload({
    ...reservation,
    codigoReserva: codigo,
    valorTotal,
    valorSinal,
    valorPago,
    saldoRestante,
    statusPagamento,
    acompanhantes: (Array.isArray(reservation.acompanhantes) ? reservation.acompanhantes : []).map(a => ({
      nomeCompleto: a.nomeCompleto || (a as any).nome || '',
      documento: a.documento || '',
      parentesco: a.parentesco || '',
      faixaEtaria: a.faixaEtaria || 'adulto'
    })),
    detalhamentoDiarias: (Array.isArray(reservation.detalhamentoDiarias) ? reservation.detalhamentoDiarias : []).map(d => ({
      data: d.data,
      dataFmt: d.dataFmt || formatarDataBR(d.data),
      valor: Number(d.valor || 0),
      isSpecialPrice: Boolean(d.isSpecialPrice),
      descricao: d.descricao ? String(d.descricao).trim() : ''
    })),
    status: reservation.status || 'confirmada',
    atualizadoEm: serverTimestamp()
  });

  if (!reservation.id) {
    payload.criadoEm = serverTimestamp();
    payload.criadoPor = userUid || null;
    const docRef = await addDoc(collection(db, 'reservasTemporada'), payload);

    // If signal was paid upfront, automatically record it in pagamentosTemporada
    if (valorSinal > 0) {
      try {
        await addDoc(collection(db, 'pagamentosTemporada'), {
          reservaId: docRef.id,
          codigoReserva: codigo,
          imovelId: reservation.imovelId,
          imovelTitulo: reservation.imovelTitulo || 'Imóvel Temporada',
          hospedeNome: reservation.hospedeNome,
          hospedeCpf: reservation.hospedeCpf || '',
          valor: valorSinal,
          tipo: 'sinal',
          dataPagamento: new Date().toISOString().split('T')[0],
          formaPagamento: reservation.formaPagamento || 'PIX',
          status: 'confirmado',
          observacoes: 'Pagamento inicial de sinal registrado na criação da reserva.',
          reciboEmitido: false,
          criadoEm: serverTimestamp(),
          registradoPor: userUid || null
        });
      } catch (payErr) {
        console.warn('[temporaryRentalService] Aviso ao lançar sinal inicial:', payErr);
      }
    }

    // Sync anonymous public occupancy record
    try {
      await setDoc(doc(db, 'ocupacaoTemporada', docRef.id), {
        imovelId: reservation.imovelId,
        dataEntrada: reservation.dataEntrada,
        dataSaida: reservation.dataSaida,
        tipo: 'reserva',
        referenciaId: docRef.id
      });
    } catch (occErr) {
      console.warn('[temporaryRentalService] Aviso ao sincronizar ocupação anônima:', occErr);
    }

    return docRef.id;
  } else {
    await updateDoc(doc(db, 'reservasTemporada', reservation.id), payload);

    try {
      if (payload.status === 'cancelada') {
        await deleteDoc(doc(db, 'ocupacaoTemporada', reservation.id));
      } else {
        await setDoc(doc(db, 'ocupacaoTemporada', reservation.id), {
          imovelId: reservation.imovelId,
          dataEntrada: reservation.dataEntrada,
          dataSaida: reservation.dataSaida,
          tipo: 'reserva',
          referenciaId: reservation.id
        });
      }
    } catch (occErr) {
      console.warn('[temporaryRentalService] Aviso ao atualizar ocupação anônima:', occErr);
    }

    return reservation.id;
  }
}

/**
 * Cancels a reservation.
 */
export async function cancelReservation(reservaId: string, motivo?: string): Promise<void> {
  await updateDoc(doc(db, 'reservasTemporada', reservaId), {
    status: 'cancelada',
    canceladoEm: serverTimestamp(),
    motivoCancelamento: motivo || 'Cancelada pelo administrador'
  });

  try {
    await deleteDoc(doc(db, 'ocupacaoTemporada', reservaId));
  } catch (occErr) {
    console.warn('[temporaryRentalService] Erro ao remover ocupação no cancelamento:', occErr);
  }
}

/**
 * Creates a manual block for maintenance or owner usage.
 */
export async function addBlock(block: Partial<TemporaryBlock>, userUid?: string): Promise<string> {
  if (!block.imovelId) throw new Error('Selecione um imóvel para bloquear datas.');
  if (!block.dataInicio || !block.dataFim) throw new Error('Informe o início e fim do bloqueio.');
  if (block.dataInicio > block.dataFim) throw new Error('A data final deve ser igual ou posterior à data inicial.');

  // Bloqueio administrativo cobre todas as pernoites de dataInicio até dataFim (inclusive).
  // No intervalo semi-aberto [dataEntrada, dataSaida), a data de liberação é o dia seguinte a dataFim:
  const dataSaidaEfetiva = addDays(block.dataFim, 1);

  // Verify no overlap with confirmed bookings
  const avail = await checkAvailability(block.imovelId, block.dataInicio, dataSaidaEfetiva, undefined, block.id);
  if (!avail.available && avail.conflictingReservation) {
    throw new Error(`Não é possível bloquear: ${avail.reason}`);
  }

  const payload: any = {
    ...block,
    dataFimEfetivo: dataSaidaEfetiva,
    motivo: block.motivo || 'bloqueio_manual',
    criadoEm: serverTimestamp(),
    criadoPor: userUid || null
  };

  let docId = block.id;
  if (!docId) {
    const docRef = await addDoc(collection(db, 'bloqueiosTemporada'), payload);
    docId = docRef.id;
  } else {
    await updateDoc(doc(db, 'bloqueiosTemporada', docId), payload);
  }

  try {
    await setDoc(doc(db, 'ocupacaoTemporada', docId), {
      imovelId: block.imovelId,
      dataEntrada: block.dataInicio,
      dataSaida: dataSaidaEfetiva,
      tipo: block.motivo === 'manutencao' ? 'manutencao' : 'bloqueio',
      referenciaId: docId
    });
  } catch (occErr) {
    console.warn('[temporaryRentalService] Aviso ao sincronizar bloqueio na ocupação anônima:', occErr);
  }

  return docId;
}

/**
 * Deletes a manual date block.
 */
export async function removeBlock(blockId: string): Promise<void> {
  await deleteDoc(doc(db, 'bloqueiosTemporada', blockId));
  try {
    await deleteDoc(doc(db, 'ocupacaoTemporada', blockId));
  } catch (occErr) {
    console.warn('[temporaryRentalService] Aviso ao remover ocupação de bloqueio:', occErr);
  }
}

/**
 * Registers an effective payment for a reservation and updates its balance.
 */
export async function registerPayment(payment: Partial<TemporaryPayment>, userUid?: string): Promise<string> {
  if (!payment.reservaId) throw new Error('Identificação da reserva ausente.');
  const val = Number(payment.valor || 0);
  if (val <= 0) throw new Error('O valor do pagamento deve ser maior que zero.');

  const resDoc = await getDoc(doc(db, 'reservasTemporada', payment.reservaId));
  if (!resDoc.exists()) throw new Error('Reserva não localizada no sistema.');
  const resData = resDoc.data() as TemporaryReservation;

  const paymentPayload: any = {
    ...payment,
    codigoReserva: resData.codigoReserva,
    imovelId: resData.imovelId,
    imovelTitulo: resData.imovelTitulo,
    hospedeNome: resData.hospedeNome,
    hospedeCpf: resData.hospedeCpf || '',
    valor: val,
    tipo: payment.tipo || 'pagamento_parcial',
    dataPagamento: payment.dataPagamento || new Date().toISOString().split('T')[0],
    formaPagamento: payment.formaPagamento || 'PIX',
    status: payment.status || 'confirmado',
    reciboEmitido: false,
    criadoEm: serverTimestamp(),
    registradoPor: userUid || null
  };

  const docRef = await addDoc(collection(db, 'pagamentosTemporada'), paymentPayload);

  // Recalculate reservation balance
  const allPayments = await fetchPayments(payment.reservaId);
  const totalPaidConfirmed = allPayments
    .filter(p => p.status === 'confirmado')
    .reduce((sum, p) => sum + Number(p.valor || 0), 0) + (payment.status === 'confirmado' ? val : 0);

  const totalReserva = Number(resData.valorTotal || 0);
  const newSaldo = Math.max(0, totalReserva - totalPaidConfirmed);
  
  let newStatusPagamento: 'pendente' | 'parcial' | 'pago' = 'pendente';
  if (totalPaidConfirmed >= totalReserva && totalReserva > 0) {
    newStatusPagamento = 'pago';
  } else if (totalPaidConfirmed > 0) {
    newStatusPagamento = 'parcial';
  }

  await updateDoc(doc(db, 'reservasTemporada', payment.reservaId), {
    valorPago: totalPaidConfirmed,
    saldoRestante: newSaldo,
    statusPagamento: newStatusPagamento,
    atualizadoEm: serverTimestamp()
  });

  return docRef.id;
}

/**
 * Creates and stores a formal customer receipt in Firestore.
 */
export async function createTemporaryReceipt(receipt: Partial<TemporaryReceipt>, userUid?: string): Promise<string> {
  if (!receipt.reservaId) throw new Error('Reserva não informada para emissão de recibo.');
  const valorRecebido = Number(receipt.valorRecebido || 0);
  if (valorRecebido <= 0) throw new Error('Não é possível emitir recibo de valor zerado ou pendente de recebimento.');

  const numeroRecibo = receipt.numeroRecibo || generateReceiptNumber();
  const valorExtenso = receipt.valorPorExtenso || valorMonetarioPorExtenso(valorRecebido);

  const payload: any = {
    ...receipt,
    numeroRecibo,
    valorRecebido,
    valorPorExtenso: valorExtenso,
    dataEmissao: receipt.dataEmissao || new Date().toISOString().split('T')[0],
    criadoEm: serverTimestamp(),
    criadoPor: userUid || null
  };

  const docRef = await addDoc(collection(db, 'recibosTemporada'), payload);

  // If this receipt is tied to a payment, mark it as emitted
  if (receipt.pagamentoId) {
    try {
      await updateDoc(doc(db, 'pagamentosTemporada', receipt.pagamentoId), {
        reciboEmitido: true,
        reciboId: docRef.id
      });
    } catch (err) {
      console.warn('[temporaryRentalService] Aviso ao associar recibo ao pagamento:', err);
    }
  }

  return docRef.id;
}

/**
 * Builds structured WhatsApp URL according to strict brief rules.
 */
export function buildTemporaryRentalWhatsAppUrl(
  type: 'consulta' | 'detalhes_reserva',
  data: {
    imovelTitulo?: string;
    imovelCodigo?: string;
    dataEntrada?: string;
    dataSaida?: string;
    quantidadeHospedes?: number;
    quantidadeDiarias?: number;
    valorTotal?: number;
    valorPago?: number;
    saldoRestante?: number;
    hospedeNome?: string;
    hospedeTelefone?: string;
    imovelEndereco?: string;
    linkImovel?: string;
  },
  destinationPhone?: string
): string {
  const phone = destinationPhone || data.hospedeTelefone || '';
  const cleanPhone = phone.replace(/\D/g, '');

  let text = '';
  if (type === 'consulta') {
    text = `Olá! Tenho interesse na locação temporária do imóvel ${data.imovelTitulo || ''}, código ${data.imovelCodigo || ''}. Gostaria de consultar a disponibilidade para entrada em ${formatarDataBR(data.dataEntrada || '')} e saída em ${formatarDataBR(data.dataSaida || '')}, para ${data.quantidadeHospedes || 2} hóspedes. Poderiam me passar mais informações?`;
    if (data.linkImovel) {
      text += `\n\nLink do imóvel: ${data.linkImovel}`;
    }
  } else {
    // Detalhes da reserva para o cliente
    text = `Olá, ${data.hospedeNome || 'Hóspede'}! Seguem os detalhes da sua reserva de locação temporária com a Menta Imóveis:\n\n` +
      `🏠 *Imóvel:* ${data.imovelTitulo || ''} (Cód: ${data.imovelCodigo || ''})\n` +
      (data.imovelEndereco ? `📍 *Endereço:* ${data.imovelEndereco}\n` : '') +
      `📅 *Período:* ${formatarDataBR(data.dataEntrada || '')} a ${formatarDataBR(data.dataSaida || '')} (${data.quantidadeDiarias || 0} diárias)\n` +
      `👥 *Hóspedes:* ${data.quantidadeHospedes || 1} pessoa(s)\n` +
      `💰 *Valor Total:* ${formatCurrency(data.valorTotal || 0)}\n` +
      `💵 *Valor Pago:* ${formatCurrency(data.valorPago || 0)}\n` +
      `⏳ *Saldo Pendente:* ${formatCurrency(data.saldoRestante || 0)}\n\n` +
      `Caso tenha dúvidas, nossa equipe está à total disposição!`;
  }

  const baseUrl = cleanPhone ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(text)}`;
}

/**
 * Fetches public anonymous occupied date intervals for a property (no personal data).
 */
export async function fetchPublicOccupiedDates(imovelId: string): Promise<Array<{
  dataEntrada: string;
  dataSaida: string;
  tipo: 'reserva' | 'bloqueio' | 'manutencao';
}>> {
  if (!imovelId) return [];
  try {
    const list: Array<{ dataEntrada: string; dataSaida: string; tipo: 'reserva' | 'bloqueio' | 'manutencao' }> = [];

    // 1. Fetch blocks
    const blocksSnap = await getDocs(query(collection(db, 'bloqueiosTemporada'), where('imovelId', '==', imovelId)));
    blocksSnap.docs.forEach(d => {
      const b = d.data();
      if (b.dataInicio && b.dataFim) {
        const effectiveEnd = b.dataFimEfetivo || (b.dataFim === b.dataInicio ? addDays(b.dataFim, 1) : addDays(b.dataFim, 1));
        list.push({
          dataEntrada: b.dataInicio,
          dataSaida: effectiveEnd,
          tipo: b.motivo === 'manutencao' ? 'manutencao' : 'bloqueio'
        });
      }
    });

    // 2. Fetch anonymous occupancy (covers confirmed reservations)
    const occSnap = await getDocs(query(collection(db, 'ocupacaoTemporada'), where('imovelId', '==', imovelId)));
    occSnap.docs.forEach(d => {
      const o = d.data();
      if (o.dataEntrada && o.dataSaida) {
        if (!list.some(item => item.dataEntrada === o.dataEntrada && item.dataSaida === o.dataSaida)) {
          list.push({
            dataEntrada: o.dataEntrada,
            dataSaida: o.dataSaida,
            tipo: o.tipo || 'reserva'
          });
        }
      }
    });

    return list;
  } catch (err) {
    console.error('[temporaryRentalService] Erro ao buscar datas ocupadas públicas:', err);
    return [];
  }
}

/**
 * Checks public availability for client reservation request.
 */
export async function checkPublicAvailability(
  imovelId: string, 
  dataEntrada: string, 
  dataSaida: string
): Promise<{ available: boolean; reason?: string }> {
  if (!imovelId || !dataEntrada || !dataSaida) {
    return { available: false, reason: 'Datas incompletas.' };
  }
  if (dataEntrada >= dataSaida) {
    return { available: false, reason: 'A data de saída deve ser posterior à data de entrada.' };
  }

  const occupied = await fetchPublicOccupiedDates(imovelId);
  for (const item of occupied) {
    if (doIntervalsOverlap(dataEntrada, dataSaida, item.dataEntrada, item.dataSaida)) {
      const motivoLabel = item.tipo === 'manutencao' ? 'manutenção' : item.tipo === 'bloqueio' ? 'bloqueio administrativo' : 'reserva existente';
      return {
        available: false,
        reason: `As datas selecionadas (${formatarDataBR(dataEntrada)} a ${formatarDataBR(dataSaida)}) coincidem com um período indisponível (${motivoLabel}).`
      };
    }
  }

  return { available: true };
}

/**
 * Generates unique reservation request code.
 */
export function generateRequestCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TMP-${y}${m}${d}-${random}`;
}

/**
 * Normalizes and deeply sanitizes a public reservation request object prior to persisting in Firestore.
 * Ensures:
 * - No property or array item property has value `undefined`.
 * - String fields are trimmed strings.
 * - Numerical fields (prices, counts) remain numbers.
 * - Boolean fields remain booleans.
 * - Arrays (veiculos, acompanhantes, detalhamentoDiarias) are normalized item-by-item without undefined attributes.
 * - If possuiVeiculo is false, veiculos is an empty array.
 * - Missing optional strings default to clean empty strings or are safely omitted.
 */
export function normalizeReservationRequest(
  request: Partial<TemporaryReservationRequest>,
  codigo: string
): Record<string, any> {
  const phone = String(request.whatsapp || request.telefone || '').trim();

  // Normalize vehicles: only keep vehicles with some identity and ensure all props are defined strings
  const cleanVeiculos = (request.possuiVeiculo && Array.isArray(request.veiculos))
    ? request.veiculos
        .filter(v => v && (String(v.placa || '').trim() || String(v.modelo || '').trim()))
        .map(v => ({
          tipo: String(v.tipo || 'Carro').trim(),
          marca: String(v.marca || '').trim(),
          modelo: String(v.modelo || '').trim(),
          cor: String(v.cor || '').trim(),
          placa: String(v.placa || '').trim().toUpperCase()
        }))
    : [];

  // Normalize companions: only keep companions with a name and ensure all props are defined strings
  const cleanAcompanhantes = Array.isArray(request.acompanhantes)
    ? request.acompanhantes
        .filter(a => a && String(a.nomeCompleto || (a as any).nome || '').trim())
        .map(a => ({
          nomeCompleto: String(a.nomeCompleto || (a as any).nome || '').trim(),
          documento: String(a.documento || '').trim(),
          parentesco: String(a.parentesco || '').trim(),
          faixaEtaria: (a.faixaEtaria === 'crianca' ? 'crianca' : 'adulto') as 'adulto' | 'crianca'
        }))
    : [];

  // Normalize daily rate breakdown: ensure numbers are numbers, boolean is boolean, string is string
  const cleanDiarias = Array.isArray(request.detalhamentoDiarias)
    ? request.detalhamentoDiarias.map(d => ({
        data: String(d.data || ''),
        dataFmt: String(d.dataFmt || (d.data ? formatarDataBR(d.data) : '')),
        valor: Number(d.valor || 0),
        isSpecialPrice: Boolean(d.isSpecialPrice),
        descricao: String(d.descricao || '')
      }))
    : [];

  const rawPayload: Record<string, any> = {
    imovelId: String(request.imovelId || '').trim(),
    imovelCodigo: String(request.imovelCodigo || '').trim(),
    imovelTitulo: String(request.imovelTitulo || 'Imóvel de Temporada').trim(),
    imovelEndereco: String(request.imovelEndereco || '').trim(),
    nomeCliente: String(request.nomeCliente || '').trim(),
    hospedeCpf: String(request.hospedeCpf || '').trim(),
    telefone: phone,
    whatsapp: phone,
    email: String(request.email || '').trim(),
    dataEntrada: String(request.dataEntrada || '').trim(),
    dataSaida: String(request.dataSaida || '').trim(),
    quantidadeDiarias: Math.max(0, Number(request.quantidadeDiarias || 0)),
    quantidadeHospedes: Math.max(1, Number(request.quantidadeHospedes || 1)),
    valorDiaria: Math.max(0, Number(request.valorDiaria || 0)),
    taxaLimpeza: Math.max(0, Number(request.taxaLimpeza || 0)),
    outrasTaxas: Math.max(0, Number(request.outrasTaxas || 0)),
    valorTotalEstimado: Math.max(0, Number(request.valorTotalEstimado || 0)),
    possuiVeiculo: Boolean(request.possuiVeiculo && cleanVeiculos.length > 0),
    veiculos: cleanVeiculos,
    acompanhantes: cleanAcompanhantes,
    detalhamentoDiarias: cleanDiarias,
    observacoes: String(request.observacoes || '').trim(),
    codigoSolicitacao: codigo,
    status: (request.status as any) || 'pendente',
    origem: 'site_publico',
    criadoEm: serverTimestamp()
  };

  return sanitizeFirestorePayload(rawPayload);
}

/**
 * Submits a public reservation request to Firestore and checks availability.
 */
export async function submitReservationRequest(
  request: Partial<TemporaryReservationRequest>
): Promise<{ id: string; codigo: string }> {
  if (!request.imovelId) throw new Error('Identificação do imóvel ausente.');
  if (!request.dataEntrada || !request.dataSaida) throw new Error('Selecione as datas de entrada e saída.');
  if (!request.nomeCliente?.trim()) throw new Error('Informe seu nome completo.');
  const phone = (request.whatsapp || request.telefone || '').trim();
  if (!phone) throw new Error('Informe seu telefone ou WhatsApp para contato.');

  // Validate availability in real-time before saving
  const avail = await checkPublicAvailability(request.imovelId, request.dataEntrada, request.dataSaida);
  if (!avail.available) {
    throw new Error(avail.reason || 'Desculpe, o período selecionado não está mais disponível.');
  }

  const codigo = generateRequestCode();
  const normalizedPayload = normalizeReservationRequest(request, codigo);

  // Diagnostic assertion: check for any remaining undefined values
  const undefinedPaths = findUndefinedPaths(normalizedPayload);
  if (undefinedPaths.length > 0) {
    console.error('[temporaryRentalService] ERRO CRÍTICO: Campo(s) undefined detectado(s) no payload de reserva:', undefinedPaths);
    throw new Error(`Dados inválidos para envio ao Firestore: campo undefined em ${undefinedPaths.join(', ')}.`);
  }

  // Safe diagnostics log (masking sensitive personal data like full CPF)
  console.info('[temporaryRentalService] Gravando solicitação de reserva normalizada:', {
    codigo,
    imovelId: normalizedPayload.imovelId,
    imovelCodigo: normalizedPayload.imovelCodigo,
    dataEntrada: normalizedPayload.dataEntrada,
    dataSaida: normalizedPayload.dataSaida,
    quantidadeDiarias: normalizedPayload.quantidadeDiarias,
    totalHospedes: normalizedPayload.quantidadeHospedes,
    veiculosCount: normalizedPayload.veiculos.length,
    acompanhantesCount: normalizedPayload.acompanhantes.length,
    detalhamentoCount: normalizedPayload.detalhamentoDiarias.length,
    possuiVeiculo: normalizedPayload.possuiVeiculo,
    hasCpf: Boolean(normalizedPayload.hospedeCpf)
  });

  try {
    const docRef = await addDoc(collection(db, 'solicitacoesReservaTemporada'), normalizedPayload);
    console.info('[temporaryRentalService] Solicitação gravada com sucesso no Firestore:', {
      id: docRef.id,
      codigo
    });
    return { id: docRef.id, codigo };
  } catch (err: any) {
    console.error('[temporaryRentalService] Erro ao gravar solicitação de reserva no Firestore:', {
      collection: 'solicitacoesReservaTemporada',
      operation: 'addDoc',
      errorCode: err?.code,
      errorMessage: err?.message,
      undefinedPaths: findUndefinedPaths(normalizedPayload)
    });
    if (err?.code === 'permission-denied') {
      throw new Error('Não foi possível registrar sua solicitação no sistema por uma questão de permissão. Por favor, tente novamente ou contate nossa equipe.');
    }
    throw new Error(err?.message || 'Falha ao registrar a solicitação de reserva no sistema.');
  }
}

/**
 * Fetches all reservation requests (for admin panel).
 */
export async function fetchReservationRequests(imovelId?: string): Promise<TemporaryReservationRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'solicitacoesReservaTemporada'));
    let list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TemporaryReservationRequest[];
    if (imovelId) {
      list = list.filter(r => r.imovelId === imovelId);
    }
    list.sort((a, b) => {
      const timeA = a.criadoEm?.seconds || 0;
      const timeB = b.criadoEm?.seconds || 0;
      return timeB - timeA;
    });
    return list;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.warn('[temporaryRentalService] Permissão insuficiente para listar solicitações de reserva.');
    } else {
      console.error('[temporaryRentalService] Erro ao buscar solicitações de reserva:', error);
    }
    return [];
  }
}

/**
 * Updates status of a reservation request with audit logging (who and when).
 */
export async function updateRequestStatus(
  requestId: string,
  newStatus: 'pendente' | 'em_analise' | 'confirmada' | 'recusada' | 'cancelada',
  options?: {
    motivo?: string;
    adminUser?: string;
  }
): Promise<void> {
  const adminName = options?.adminUser || 'Administrador';
  const updateData: Record<string, any> = {
    status: newStatus,
    statusAlteradoEm: serverTimestamp(),
    statusAlteradoPor: adminName,
    atualizadoEm: serverTimestamp()
  };

  if (newStatus === 'recusada') {
    updateData.motivoRecusa = options?.motivo || 'Recusada pelo administrador';
    updateData.recusadoEm = serverTimestamp();
    updateData.recusadoPor = adminName;
  } else if (newStatus === 'em_analise') {
    updateData.emAnaliseEm = serverTimestamp();
    updateData.emAnalisePor = adminName;
  } else if (newStatus === 'cancelada') {
    updateData.canceladoEm = serverTimestamp();
    updateData.canceladoPor = adminName;
  }

  await updateDoc(doc(db, 'solicitacoesReservaTemporada', requestId), updateData);
}

/**
 * Approves a reservation request, creates the official confirmed reservation in Firestore,
 * and synchronizes occupied dates in the calendar.
 */
export async function approveReservationRequest(
  solicitacao: TemporaryReservationRequest, 
  adminUser?: { uid?: string; email?: string } | string
): Promise<{ reservaId: string; codigoReserva: string }> {
  if (!solicitacao.id) throw new Error('ID da solicitação não informado.');
  if (solicitacao.status === 'confirmada') {
    throw new Error('Esta solicitação já foi aprovada e confirmada anteriormente.');
  }

  const adminName = typeof adminUser === 'string' 
    ? adminUser 
    : (adminUser?.email || adminUser?.uid || 'Administrador');

  // 1. Re-verify availability atomically to avoid double booking
  const avail = await checkAvailability(solicitacao.imovelId, solicitacao.dataEntrada, solicitacao.dataSaida);
  if (!avail.available) {
    throw new Error(`Não é possível aprovar esta solicitação: ${avail.reason}`);
  }

  // 2. Create confirmed reservation
  const codigoReserva = generateReservationCode();
  const subtotalDiarias = solicitacao.detalhamentoDiarias && solicitacao.detalhamentoDiarias.length > 0
    ? solicitacao.detalhamentoDiarias.reduce((sum, d) => sum + (Number(d.valor) || 0), 0)
    : (Number(solicitacao.valorDiaria || 0) * Number(solicitacao.quantidadeDiarias || 1));
  const taxaLimpeza = Number(solicitacao.taxaLimpeza || 0);
  const outrasTaxas = Number(solicitacao.outrasTaxas || 0);
  const valorTotal = Number(solicitacao.valorTotalEstimado || (subtotalDiarias + taxaLimpeza + outrasTaxas));

  const reservaPayload: Partial<TemporaryReservation> = {
    imovelId: solicitacao.imovelId,
    imovelCodigo: solicitacao.imovelCodigo,
    imovelTitulo: solicitacao.imovelTitulo,
    imovelEndereco: solicitacao.imovelEndereco,
    hospedeNome: solicitacao.nomeCliente,
    hospedeCpf: solicitacao.hospedeCpf || '',
    hospedeTelefone: solicitacao.telefone || solicitacao.whatsapp,
    hospedeWhatsapp: solicitacao.whatsapp || solicitacao.telefone,
    hospedeEmail: solicitacao.email || '',
    dataEntrada: solicitacao.dataEntrada,
    dataSaida: solicitacao.dataSaida,
    quantidadeDiarias: solicitacao.quantidadeDiarias,
    quantidadeHospedes: solicitacao.quantidadeHospedes,
    valorDiaria: solicitacao.valorDiaria,
    taxaLimpeza: taxaLimpeza,
    outrasTaxas: outrasTaxas,
    valorTotal: valorTotal,
    codigoReserva: codigoReserva,
    possuiVeiculo: solicitacao.possuiVeiculo ?? (Boolean(solicitacao.veiculos && solicitacao.veiculos.length > 0)),
    veiculos: solicitacao.veiculos || [],
    acompanhantes: solicitacao.acompanhantes || [],
    detalhamentoDiarias: solicitacao.detalhamentoDiarias || [],
    status: 'confirmada',
    statusPagamento: 'pendente',
    observacoes: `Aprovado a partir da Solicitação pública #${solicitacao.codigoSolicitacao || solicitacao.id} por ${adminName}. Observações do cliente: ${solicitacao.observacoes || 'Nenhuma'}`
  };

  const userUid = typeof adminUser === 'object' ? adminUser?.uid : undefined;
  const reservaId = await saveReservation(reservaPayload, userUid);

  // 3. Update request document status to confirmada with audit trail
  await updateDoc(doc(db, 'solicitacoesReservaTemporada', solicitacao.id), {
    status: 'confirmada',
    reservaGeradaId: reservaId,
    codigoReservaGerada: codigoReserva,
    aprovadoEm: serverTimestamp(),
    aprovadoPor: adminName,
    statusAlteradoEm: serverTimestamp(),
    statusAlteradoPor: adminName,
    atualizadoEm: serverTimestamp()
  });

  return { reservaId, codigoReserva };
}

/**
 * Refuses a reservation request with reason and logs responsible admin.
 */
export async function refuseReservationRequest(
  requestId: string, 
  motivo?: string, 
  adminUser?: string
): Promise<void> {
  await updateRequestStatus(requestId, 'recusada', { motivo, adminUser });
}

/**
 * Cancels a reservation request and logs responsible admin.
 */
export async function cancelReservationRequest(
  requestId: string, 
  adminUser?: string
): Promise<void> {
  await updateRequestStatus(requestId, 'cancelada', { adminUser });
}

/**
 * Formats standard message for administrator to confirm reservation to client on WhatsApp.
 */
export function buildAdminConfirmationWhatsAppMessage(
  solicitacao: TemporaryReservationRequest,
  reservaConfirmada?: { codigoReserva?: string; valorTotal?: number } | string
): string {
  const nome = solicitacao.nomeCliente || 'Cliente';
  const imovel = solicitacao.imovelTitulo || 'Imóvel de Temporada';
  const codigo = solicitacao.imovelCodigo || '';
  const endereco = solicitacao.imovelEndereco || '';
  const entrada = formatarDataBR(solicitacao.dataEntrada);
  const saida = formatarDataBR(solicitacao.dataSaida);
  const diarias = solicitacao.quantidadeDiarias;
  const hospedes = solicitacao.quantidadeHospedes;
  
  const subtotalDiarias = solicitacao.detalhamentoDiarias && solicitacao.detalhamentoDiarias.length > 0
    ? solicitacao.detalhamentoDiarias.reduce((sum, d) => sum + (Number(d.valor) || 0), 0)
    : (Number(solicitacao.valorDiaria || 0) * diarias);
    
  const taxaLimpeza = Number(solicitacao.taxaLimpeza || 0);
  const outrasTaxas = Number(solicitacao.outrasTaxas || 0);

  const parsedTotal = typeof reservaConfirmada === 'object' && reservaConfirmada?.valorTotal !== undefined
    ? reservaConfirmada.valorTotal
    : (solicitacao.valorTotalEstimado ?? (subtotalDiarias + taxaLimpeza + outrasTaxas));
  const total = Number(parsedTotal);

  const lines = [
    `Olá, ${nome}! Tudo bem?`,
    '',
    'Aqui é da equipe Menta Imóveis.',
    '',
    'Temos o prazer de informar que sua reserva de locação temporária foi confirmada!',
    '',
    `Imóvel: ${imovel}`,
    ...(codigo ? [`Código: ${codigo}`] : []),
    ...(endereco ? [`Endereço: ${endereco}`] : []),
    `Entrada: ${entrada} às 16:00`,
    `Saída: ${saida} às 11:00`,
    `Quantidade de diárias: ${diarias}`,
    `Hóspedes: ${hospedes}`,
    `Valor das diárias: ${formatCurrency(subtotalDiarias)}`,
    `Taxa de limpeza: ${formatCurrency(taxaLimpeza)}`,
    ...(outrasTaxas > 0 ? [`Outras taxas: ${formatCurrency(outrasTaxas)}`] : []),
    `Total da reserva: ${formatCurrency(total)}`,
    '',
    'Em breve, nossa equipe poderá entrar em contato para alinhar os detalhes da hospedagem.',
    '',
    'Agradecemos por escolher a Menta Imóveis!'
  ];

  return lines.join('\n');
}

/**
 * Builds WhatsApp link to send confirmation directly to the client's phone number.
 */
export function buildAdminConfirmationWhatsAppUrl(
  solicitacao: TemporaryReservationRequest,
  reservaConfirmada?: { codigoReserva?: string; valorTotal?: number } | string,
  customPhone?: string
): { url: string; cleanPhone: string; isValid: boolean; message: string } {
  const rawPhone = (customPhone || solicitacao.whatsapp || solicitacao.telefone || '').replace(/\D/g, '');
  const isValid = rawPhone.length >= 10;
  const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
  const message = buildAdminConfirmationWhatsAppMessage(solicitacao, reservaConfirmada);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return { url, cleanPhone, isValid, message };
}

/**
 * Formats message for administrator to initiate contact with client via WhatsApp.
 */
export function buildAdminContactWhatsAppMessage(
  solicitacao: TemporaryReservationRequest
): string {
  const nome = solicitacao.nomeCliente || 'Cliente';
  const imovel = solicitacao.imovelTitulo || 'Imóvel de Temporada';
  const codigo = solicitacao.imovelCodigo || '';
  const entrada = formatarDataBR(solicitacao.dataEntrada);
  const saida = formatarDataBR(solicitacao.dataSaida);
  const diarias = solicitacao.quantidadeDiarias;

  const lines = [
    `Olá, ${nome}! Tudo bem?`,
    '',
    'Aqui é da equipe Menta Imóveis.',
    '',
    `Recebemos sua solicitação de reserva (Protocolo: ${solicitacao.codigoSolicitacao || solicitacao.id?.slice(0, 8) || ''}) para o imóvel *${imovel}*` + (codigo ? ` (Cód: ${codigo})` : '') + `, para o período de ${entrada} a ${saida} (${diarias} diárias).`,
    '',
    'Gostaria de confirmar alguns detalhes e tirar eventuais dúvidas antes de prosseguirmos com a sua confirmação. Como podemos te ajudar?'
  ];

  return lines.join('\n');
}

/**
 * Builds WhatsApp link for administrator to initiate contact with client.
 */
export function buildAdminContactWhatsAppUrl(
  solicitacao: TemporaryReservationRequest,
  customPhone?: string
): { url: string; cleanPhone: string; isValid: boolean; message: string } {
  const rawPhone = (customPhone || solicitacao.whatsapp || solicitacao.telefone || '').replace(/\D/g, '');
  const isValid = rawPhone.length >= 10;
  const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
  const message = buildAdminContactWhatsAppMessage(solicitacao);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return { url, cleanPhone, isValid, message };
}

/**
 * Formats message for administrator when refusing a request.
 */
export function buildAdminRefusalWhatsAppMessage(
  solicitacao: TemporaryReservationRequest,
  motivo?: string
): string {
  const nome = solicitacao.nomeCliente || 'Cliente';
  const imovel = solicitacao.imovelTitulo || 'Imóvel de Temporada';
  const entrada = formatarDataBR(solicitacao.dataEntrada);
  const saida = formatarDataBR(solicitacao.dataSaida);

  const lines = [
    `Olá, ${nome}! Tudo bem?`,
    '',
    'Aqui é da equipe Menta Imóveis.',
    '',
    `Agradecemos seu interesse na locação temporária do imóvel *${imovel}* para o período de ${entrada} a ${saida}.`,
    '',
    'Infelizmente não foi possível confirmar sua solicitação para este período' + (motivo ? ` pelo seguinte motivo: ${motivo}.` : '.'),
    '',
    'Temos outras opções de imóveis disponíveis e estamos à disposição para te apresentar alternativas que combinem com suas datas e preferências!',
    '',
    'Equipe Menta Imóveis'
  ];

  return lines.join('\n');
}

/**
 * Builds WhatsApp link for administrator to communicate refusal to client.
 */
export function buildAdminRefusalWhatsAppUrl(
  solicitacao: TemporaryReservationRequest,
  motivo?: string,
  customPhone?: string
): { url: string; cleanPhone: string; isValid: boolean; message: string } {
  const rawPhone = (customPhone || solicitacao.whatsapp || solicitacao.telefone || '').replace(/\D/g, '');
  const isValid = rawPhone.length >= 10;
  const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
  const message = buildAdminRefusalWhatsAppMessage(solicitacao, motivo);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return { url, cleanPhone, isValid, message };
}

/**
 * Builds the public WhatsApp URL (retained for backward compatibility).
 */
export function buildPublicTemporaryRentalWhatsAppUrl(
  solicitacao: {
    codigoSolicitacao?: string;
    imovelTitulo?: string;
    imovelCodigo?: string;
    imovelEndereco?: string;
    imovelLink?: string;
    dataEntrada: string;
    dataSaida: string;
    quantidadeDiarias: number;
    quantidadeHospedes: number;
    valorDiaria: number;
    taxaLimpeza?: number;
    valorTotalEstimado: number;
    nomeCliente: string;
    telefone: string;
    whatsapp?: string;
    email?: string;
    observacoes?: string;
    acompanhantes?: any[];
    possuiVeiculo?: boolean;
    veiculos?: any[];
  },
  destinationPhone?: string
): string {
  const cleanDestination = (destinationPhone || '47999999999').replace(/\D/g, '');
  const targetPhone = cleanDestination.startsWith('55') ? cleanDestination : `55${cleanDestination}`;

  const link = solicitacao.imovelLink || `https://mentaimoveis.com/imovel/${encodeURIComponent(solicitacao.imovelCodigo || '')}`;

  const subtotalDiarias = (solicitacao.quantidadeDiarias || 0) * (solicitacao.valorDiaria || 0);

  const lines = [
    'Olá! Tenho interesse em uma locação temporária pela Menta Imóveis.',
    '',
    ...(solicitacao.codigoSolicitacao ? [`📋 *PROTOCOLO DA SOLICITAÇÃO:* ${solicitacao.codigoSolicitacao}`, ''] : []),
    'DADOS DO IMÓVEL',
    `* Imóvel: ${solicitacao.imovelTitulo || 'Imóvel de Temporada'}`,
    `* Código: ${solicitacao.imovelCodigo || '---'}`,
    `* Endereço: ${solicitacao.imovelEndereco || 'Balneário Camboriú/SC'}`,
    `* Link do imóvel: ${link}`,
    '',
    'DADOS DA SOLICITAÇÃO',
    `* Entrada: ${formatarDataBR(solicitacao.dataEntrada)}`,
    `* Saída: ${formatarDataBR(solicitacao.dataSaida)}`,
    `* Quantidade de diárias: ${solicitacao.quantidadeDiarias}`,
    `* Quantidade de hóspedes: ${solicitacao.quantidadeHospedes}`,
    `* Valor por diária: ${formatCurrency(solicitacao.valorDiaria)}`,
    `* Subtotal das diárias: ${formatCurrency(subtotalDiarias)}`,
    ...(solicitacao.taxaLimpeza && solicitacao.taxaLimpeza > 0 ? [`* Taxa de limpeza: ${formatCurrency(solicitacao.taxaLimpeza)}`] : []),
    `* Valor total estimado: ${formatCurrency(solicitacao.valorTotalEstimado)}`,
    '',
    'DADOS DO CLIENTE',
    `* Titular da reserva: ${solicitacao.nomeCliente}`,
    `* WhatsApp / Telefone: ${solicitacao.whatsapp || solicitacao.telefone}`,
    ...(solicitacao.email ? [`* E-mail: ${solicitacao.email}`] : []),
    ...(solicitacao.acompanhantes && solicitacao.acompanhantes.length > 0 
      ? [`* Acompanhantes (${solicitacao.acompanhantes.length}): ${solicitacao.acompanhantes.map(a => a.nomeCompleto + (a.parentesco ? ` (${a.parentesco})` : '')).join(', ')}`] 
      : []),
    ...(solicitacao.possuiVeiculo && solicitacao.veiculos && solicitacao.veiculos.length > 0
      ? [`* Veículo(s) na garagem: ${solicitacao.veiculos.map(v => `${v.tipo || 'Carro'} ${v.marca || ''} ${v.modelo || ''} (Placa ${v.placa})`).join(' | ')}`]
      : [`* Veículo para garagem: Não possui`]),
    `* Observações: ${solicitacao.observacoes || 'Nenhuma'}`,
    '',
    'Gostaria de confirmar a disponibilidade e receber informações sobre os próximos passos para concluir a reserva.'
  ];

  const text = lines.join('\n');
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
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
  Property 
} from '../types';
import { formatarDataBR, formatCurrency, valorMonetarioPorExtenso } from '../lib/utils';

/**
 * Checks whether two half-open date intervals [startA, endA) and [startB, endB) overlap.
 * In temporary rentals, check-out date (end) is morning/midday, so checkout on day X
 * does not conflict with a checkin on the same day X.
 */
export function doIntervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

/**
 * Calculates number of nights between check-in and check-out.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = new Date(checkIn + 'T00:00:00');
  const d2 = new Date(checkOut + 'T00:00:00');
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
    // Filter temporary properties or allow fallback to all
    const tempProps = all.filter(p => {
      const bType = String(p.businessType || '').toLowerCase();
      return bType.includes('tempor');
    });
    return tempProps.length > 0 ? tempProps : all;
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar imóveis de temporada:', error);
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
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar reservas:', error);
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
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar bloqueios:', error);
    return [];
  }
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
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar hóspedes:', error);
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
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar pagamentos:', error);
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
  } catch (error) {
    console.error('[temporaryRentalService] Erro ao buscar recibos:', error);
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
    if (doIntervalsOverlap(dataEntrada, dataSaida, b.dataInicio, b.dataFim)) {
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

  const payload: any = {
    ...reservation,
    codigoReserva: codigo,
    valorTotal,
    valorSinal,
    valorPago,
    saldoRestante,
    statusPagamento,
    status: reservation.status || 'confirmada',
    atualizadoEm: serverTimestamp()
  };

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

    return docRef.id;
  } else {
    await updateDoc(doc(db, 'reservasTemporada', reservation.id), payload);
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
}

/**
 * Creates a manual block for maintenance or owner usage.
 */
export async function addBlock(block: Partial<TemporaryBlock>, userUid?: string): Promise<string> {
  if (!block.imovelId) throw new Error('Selecione um imóvel para bloquear datas.');
  if (!block.dataInicio || !block.dataFim) throw new Error('Informe o início e fim do bloqueio.');

  // Verify no overlap with confirmed bookings
  const avail = await checkAvailability(block.imovelId, block.dataInicio, block.dataFim);
  if (!avail.available && avail.conflictingReservation) {
    throw new Error(`Não é possível bloquear: ${avail.reason}`);
  }

  const payload: any = {
    ...block,
    motivo: block.motivo || 'bloqueio_manual',
    criadoEm: serverTimestamp(),
    criadoPor: userUid || null
  };

  const docRef = await addDoc(collection(db, 'bloqueiosTemporada'), payload);
  return docRef.id;
}

/**
 * Deletes a manual date block.
 */
export async function removeBlock(blockId: string): Promise<void> {
  await deleteDoc(doc(db, 'bloqueiosTemporada', blockId));
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
      `💰 *Valor Total:* R$ ${formatCurrency(data.valorTotal || 0)}\n` +
      `💵 *Valor Pago:* R$ ${formatCurrency(data.valorPago || 0)}\n` +
      `⏳ *Saldo Pendente:* R$ ${formatCurrency(data.saldoRestante || 0)}\n\n` +
      `Caso tenha dúvidas, nossa equipe está à total disposição!`;
  }

  const baseUrl = cleanPhone ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(text)}`;
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  Firestore
} from 'firebase/firestore';
import { FinancialAccount, FinancialTransfer, TransferStatus } from '../types';
import { formatCurrency, BANK_PRESETS } from '../lib/financeUtils';

export interface TransferInput {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  dataTransferencia: string;
  descricao: string;
  formaTransferencia?: string;
  status?: TransferStatus;
  observacoes?: string;
  numeroComprovante?: string;
  comprovanteUrl?: string;
  imovelId?: string;
  codigoImovel?: string;
  locacaoId?: string;
  corretorId?: string;
  corretorNome?: string;
  categoriaInterna?: string;
  centroCustoId?: string;
  tags?: string[];
}

/**
 * Executa uma transferência atômica entre duas contas financeiras internas
 */
export async function executeFinancialTransfer(
  db: Firestore,
  input: TransferInput,
  currentUser?: { uid?: string; email?: string } | null
): Promise<{ success: boolean; transferId: string; message: string }> {
  const {
    contaOrigemId,
    contaDestinoId,
    valor,
    dataTransferencia,
    descricao,
    formaTransferencia = 'Pix',
    status = 'Concluída',
    observacoes = '',
    numeroComprovante = '',
    comprovanteUrl = '',
    imovelId = '',
    codigoImovel = '',
    locacaoId = '',
    corretorId = '',
    corretorNome = '',
    categoriaInterna = 'Transferência entre contas',
    centroCustoId = '',
    tags = []
  } = input;

  if (!contaOrigemId || !contaDestinoId) {
    throw new Error('Informe a conta de origem e a conta de destino.');
  }

  if (contaOrigemId === contaDestinoId) {
    throw new Error('Selecione contas diferentes.');
  }

  const numValor = Number(valor);
  if (isNaN(numValor) || numValor <= 0) {
    throw new Error('Informe um valor válido.');
  }

  if (!dataTransferencia) {
    throw new Error('Informe a data da transferência.');
  }

  if (!descricao || !descricao.trim()) {
    throw new Error('Informe uma descrição para a transferência.');
  }

  let generatedTransferId = '';

  await runTransaction(db, async (transaction) => {
    const origemRef = doc(db, 'contasFinanceiras', contaOrigemId);
    const destinoRef = doc(db, 'contasFinanceiras', contaDestinoId);
    const transferRef = doc(collection(db, 'transferenciasFinanceiras'));
    generatedTransferId = transferRef.id;

    const [origemSnap, destinoSnap] = await Promise.all([
      transaction.get(origemRef),
      transaction.get(destinoRef)
    ]);

    if (!origemSnap.exists()) {
      throw new Error('Conta de origem não encontrada.');
    }
    if (!destinoSnap.exists()) {
      throw new Error('Conta de destino não encontrada.');
    }

    const origemData = origemSnap.data() as FinancialAccount;
    const destinoData = destinoSnap.data() as FinancialAccount;

    const saldoOrigem = Number(origemData.saldoAtual || 0);
    const saldoDestino = Number(destinoData.saldoAtual || 0);

    // Validação de saldo disponível
    if (saldoOrigem < numValor && !origemData.permiteSaldoNegativo) {
      throw new Error('Saldo insuficiente na conta de origem.');
    }

    const novoSaldoOrigem = saldoOrigem - numValor;
    const novoSaldoDestino = saldoDestino + numValor;

    // Atualiza conta de origem
    transaction.update(origemRef, {
      saldoAtual: novoSaldoOrigem,
      updatedAt: serverTimestamp()
    });

    // Atualiza conta de destino
    transaction.update(destinoRef, {
      saldoAtual: novoSaldoDestino,
      updatedAt: serverTimestamp()
    });

    // Registra o documento da transferência
    transaction.set(transferRef, {
      transferenciaId: generatedTransferId,
      tipo: 'Transferência',
      origem: 'transferencia',
      contaOrigemId,
      contaOrigemNome: origemData.nome || 'Conta Origem',
      contaDestinoId,
      contaDestinoNome: destinoData.nome || 'Conta Destino',
      valor: numValor,
      valorFormatado: formatCurrency(numValor),
      dataTransferencia,
      descricao: descricao.trim(),
      formaTransferencia,
      status: status || 'Concluída',
      observacoes: observacoes.trim(),
      numeroComprovante: numeroComprovante.trim(),
      comprovanteUrl: comprovanteUrl.trim(),
      imovelId: imovelId || '',
      codigoImovel: codigoImovel || '',
      locacaoId: locacaoId || '',
      corretorId: corretorId || '',
      corretorNome: corretorNome || '',
      categoriaInterna: categoriaInterna || 'Transferência entre contas',
      centroCustoId: centroCustoId || '',
      tags: Array.isArray(tags) ? tags : [],
      estornada: false,
      criadoPorUid: currentUser?.uid || 'admin',
      criadoPorEmail: currentUser?.email || 'admin@mentaimoveis.com.br',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  return {
    success: true,
    transferId: generatedTransferId,
    message: 'Transferência realizada com sucesso.'
  };
}

/**
 * Estorna atomicamente uma transferência concluída
 */
export async function reverseFinancialTransfer(
  db: Firestore,
  transferId: string,
  motivo: string,
  currentUser?: { uid?: string; email?: string } | null
): Promise<{ success: boolean; message: string }> {
  if (!transferId) {
    throw new Error('ID da transferência não fornecido.');
  }

  await runTransaction(db, async (transaction) => {
    const transferRef = doc(db, 'transferenciasFinanceiras', transferId);
    const transferSnap = await transaction.get(transferRef);

    if (!transferSnap.exists()) {
      throw new Error('Transferência não encontrada.');
    }

    const transferData = transferSnap.data() as FinancialTransfer;

    if (transferData.estornada || transferData.status === 'Estornada') {
      throw new Error('Esta transferência já foi estornada.');
    }

    if (transferData.status !== 'Concluída') {
      throw new Error('Somente transferências com status Concluída podem ser estornadas.');
    }

    const { contaOrigemId, contaDestinoId, valor } = transferData;
    const numValor = Number(valor || 0);

    const origemRef = doc(db, 'contasFinanceiras', contaOrigemId);
    const destinoRef = doc(db, 'contasFinanceiras', contaDestinoId);

    const [origemSnap, destinoSnap] = await Promise.all([
      transaction.get(origemRef),
      transaction.get(destinoRef)
    ]);

    if (!origemSnap.exists()) {
      throw new Error('Conta de origem da transferência não existe mais.');
    }
    if (!destinoSnap.exists()) {
      throw new Error('Conta de destino da transferência não existe mais.');
    }

    const origemData = origemSnap.data() as FinancialAccount;
    const destinoData = destinoSnap.data() as FinancialAccount;

    const saldoOrigem = Number(origemData.saldoAtual || 0);
    const saldoDestino = Number(destinoData.saldoAtual || 0);

    // Na reversão, retira da conta destino e devolve à conta de origem
    if (saldoDestino < numValor && !destinoData.permiteSaldoNegativo) {
      throw new Error('Saldo insuficiente na conta de destino para efetuar o estorno.');
    }

    const novoSaldoDestino = saldoDestino - numValor;
    const novoSaldoOrigem = saldoOrigem + numValor;

    // Atualiza saldo da conta destino (subtrai)
    transaction.update(destinoRef, {
      saldoAtual: novoSaldoDestino,
      updatedAt: serverTimestamp()
    });

    // Atualiza saldo da conta origem (devolve)
    transaction.update(origemRef, {
      saldoAtual: novoSaldoOrigem,
      updatedAt: serverTimestamp()
    });

    // Marca a transferência original como Estornada
    transaction.update(transferRef, {
      status: 'Estornada',
      estornada: true,
      estornadaEm: serverTimestamp(),
      estornadaPorUid: currentUser?.uid || 'admin',
      estornadaPorEmail: currentUser?.email || 'admin@mentaimoveis.com.br',
      motivoEstorno: (motivo || 'Estorno solicitado pelo administrador').trim(),
      updatedAt: serverTimestamp()
    });
  });

  return {
    success: true,
    message: 'Transferência estornada com sucesso! Saldos devolvidos às contas originais.'
  };
}

/**
 * Inicializa contas padrões caso não existam
 */
export async function seedDefaultAccountsIfEmpty(db: Firestore): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'contasFinanceiras'));
    if (!snap.empty) {
      return;
    }

    const defaultAccounts = [
      {
        nome: 'Caixa Geral',
        tipo: 'caixa',
        banco: 'Caixa Físico / Gaveta',
        agencia: '0001',
        conta: '001',
        saldoInicial: 10000,
        saldoAtual: 10000,
        ativo: true,
        ordem: 1,
        permiteSaldoNegativo: false,
        descricao: 'Caixa físico da imobiliária para despesas e sangrias diárias'
      },
      {
        nome: 'Banco Itaú',
        tipo: 'banco',
        banco: 'Itaú Unibanco (341)',
        agencia: '1234',
        conta: '56789-0',
        saldoInicial: 20000,
        saldoAtual: 20000,
        ativo: true,
        ordem: 2,
        permiteSaldoNegativo: true,
        descricao: 'Conta corrente principal da imobiliária para recebimentos e pagamentos'
      },
      {
        nome: 'Nubank PJ',
        tipo: 'digital',
        banco: 'Nu Pagamentos (260)',
        agencia: '0001',
        conta: '987654-3',
        saldoInicial: 5000,
        saldoAtual: 5000,
        ativo: true,
        ordem: 3,
        permiteSaldoNegativo: false,
        descricao: 'Conta digital para operações Pix rápidas e comissões'
      },
      {
        nome: 'Banco Santander',
        tipo: 'banco',
        banco: 'Santander (033)',
        agencia: '0540',
        conta: '1300456-7',
        saldoInicial: 0,
        saldoAtual: 0,
        ativo: true,
        ordem: 4,
        permiteSaldoNegativo: false,
        descricao: 'Conta secundária para custódia e cauções'
      }
    ];

    for (const acc of defaultAccounts) {
      const docRef = doc(collection(db, 'contasFinanceiras'));
      await setDoc(docRef, {
        ...acc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
      console.warn('Permissão pendente ao inicializar contas padrão:', error?.message);
    } else {
      console.error('Erro ao inicializar contas padrão:', error);
    }
  }
}

/**
 * Cria ou edita uma conta financeira
 */
export async function saveFinancialAccount(
  db: Firestore,
  accountData: Partial<FinancialAccount>,
  accountId?: string
): Promise<string> {
  const nome = (accountData.nome || '').trim();
  if (!nome) {
    throw new Error('O nome da conta é obrigatório.');
  }

  const saldoInicial = Number(accountData.saldoInicial || 0);

  if (accountId) {
    const docRef = doc(db, 'contasFinanceiras', accountId);
    await updateDoc(docRef, {
      ...accountData,
      nome,
      saldoInicial,
      updatedAt: serverTimestamp()
    });
    return accountId;
  } else {
    const docRef = doc(collection(db, 'contasFinanceiras'));
    await setDoc(docRef, {
      ...accountData,
      nome,
      saldoInicial,
      saldoAtual: typeof accountData.saldoAtual === 'number' ? accountData.saldoAtual : saldoInicial,
      ativo: accountData.ativo !== false,
      permiteSaldoNegativo: !!accountData.permiteSaldoNegativo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }
}

/**
 * Exclui ou inativa uma conta financeira
 */
export async function deleteFinancialAccount(
  db: Firestore, 
  accountId: string
): Promise<{ success: boolean; message: string }> {
  if (!accountId) {
    throw new Error('ID da conta não informado.');
  }

  // Verifica se há transferências vinculadas a esta conta
  const transOrigemQuery = query(collection(db, 'transferenciasFinanceiras'), where('contaOrigemId', '==', accountId));
  const transDestinoQuery = query(collection(db, 'transferenciasFinanceiras'), where('contaDestinoId', '==', accountId));
  
  const [origemSnap, destinoSnap] = await Promise.all([
    getDocs(transOrigemQuery),
    getDocs(transDestinoQuery)
  ]);

  if (!origemSnap.empty || !destinoSnap.empty) {
    // Inativa a conta para manter a integridade histórica dos lançamentos
    const docRef = doc(db, 'contasFinanceiras', accountId);
    await updateDoc(docRef, {
      ativo: false,
      updatedAt: serverTimestamp()
    });
    return {
      success: true,
      message: 'A conta possui histórico de transferências e foi inativada para preservar o histórico contábil.'
    };
  }

  // Se não houver histórico, pode excluir fisicamente
  await deleteDoc(doc(db, 'contasFinanceiras', accountId));
  return {
    success: true,
    message: 'Conta financeira excluída com sucesso.'
  };
}

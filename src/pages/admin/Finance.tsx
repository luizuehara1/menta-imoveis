import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  CreditCard,
  ChevronDown,
  Sparkles,
  PieChart as PieIcon,
  Search,
  Filter,
  FileText,
  Download,
  Building,
  User,
  MoreVertical,
  X,
  PlusCircle,
  MinusCircle,
  FileDown,
  CheckCircle,
  ArrowRightLeft,
  Wallet,
  ShieldCheck,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  staggerContainer, 
  slideUp, 
  fadeIn, 
  scaleIn 
} from '../../constants/animations';
import { 
  maskCurrency, 
  parseCurrencyToNumber,
  formatCurrency,
  safeText,
  safeMoney,
  safeDate
} from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';
import { FinanceRecord, Property, Lease, FinancialAccount, FinancialTransfer } from '../../types';
import { isTransferencia } from '../../lib/financeUtils';
import { seedDefaultAccountsIfEmpty } from '../../services/financialTransferService';
import { TransferModal } from '../../components/admin/finance/TransferModal';
import { AccountsManager } from '../../components/admin/finance/AccountsManager';
import { TransferHistoryTable } from '../../components/admin/finance/TransferHistoryTable';
import { AccountFormModal } from '../../components/admin/finance/AccountFormModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EXPENSE_CATEGORIES = [
  'Anúncios', 'Comissão', 'Manutenção', 'Sistemas', 'Impostos', 'Escritório', 'Prestadores', 'Deslocamento', 'Operacional', 'Outros'
];

const REVENUE_CATEGORIES = [
  'Receita de Comissão', 'Comissão de venda', 'Comissão de locação', 'Aluguel recebido', 'Taxa administrativa', 'Serviço prestado', 'Entrada avulsa', 'Outros'
];

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto', 'Outro'];

const getWatermarkData = (
  url: string,
  opacity: number = 0.07,
): Promise<{ base64: string; aspectRatio: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0);
          resolve({
            base64: canvas.toDataURL("image/png"),
            aspectRatio: img.height / img.width,
          });
          return;
        }
      } catch (e) {
        console.error("Error creating watermark canvas:", e);
      }
      resolve({ base64: url, aspectRatio: 1 });
    };
    img.onerror = () => {
      if (url !== "/watermark.png") {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = fallbackImg.width;
            canvas.height = fallbackImg.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.globalAlpha = opacity;
              ctx.drawImage(fallbackImg, 0, 0);
              resolve({
                base64: canvas.toDataURL("image/png"),
                aspectRatio: fallbackImg.height / fallbackImg.width,
              });
              return;
            }
          } catch (e) {}
          resolve({ base64: "/watermark.png", aspectRatio: 1 });
        };
        fallbackImg.onerror = () => {
          resolve({ base64: "/watermark.png", aspectRatio: 1 });
        };
        fallbackImg.src = "/watermark.png";
      } else {
        resolve({ base64: "/watermark.png", aspectRatio: 1 });
      }
    };
    img.src = url;
  });
};

const toNumber = (value: any) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const clean = String(value || "0")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
};

const calcularComissaoImobiliaria = (locacao: any) => {
  const comissaoSalva = toNumber(locacao.valorComissaoImobiliaria);

  if (comissaoSalva > 0) return comissaoSalva;

  const totalLocatario = toNumber(locacao.valorTotalLocatario || locacao.valorTotalPagar);
  const valorAluguel = toNumber(locacao.valorAluguel);
  const baseCalculo = totalLocatario > 0 ? totalLocatario : valorAluguel;

  const percentualSalvo = toNumber(locacao.percentualComissaoImobiliaria);

  const percentual =
    percentualSalvo > 0
      ? percentualSalvo
      : locacao.tipoLocacao === "temporaria"
        ? 20
        : 10;

  return baseCalculo * percentual / 100;
};

function cleanFirestoreData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj
      .map(cleanFirestoreData)
      .filter(item => item !== undefined);
  }

  if (obj && typeof obj === "object") {
    // If it is a Firestore FieldValue (or anything not a plain object or array), return it as is
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null && proto !== Object.prototype) {
      return obj;
    }

    const cleaned: any = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value === undefined) return;

      if (typeof value === "number" && !Number.isFinite(value)) {
        cleaned[key] = 0;
        return;
      }

      if (value && typeof value === "object") {
        cleaned[key] = cleanFirestoreData(value);
        return;
      }

      cleaned[key] = value;
    });

    return cleaned;
  }

  return obj;
}

export default function AdminFinance() {
  const { user, isAdmin } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  const { settings } = useSettings();
  const empresa = (settings?.empresa || {}) as any;
  const [activeTab, setActiveTab] = useState<'todos' | 'entradas' | 'saidas' | 'transferencias' | 'contas'>('todos');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<(FinanceRecord & { sourceCollection?: string })[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Transfers & Accounts State
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transfers, setTransfers] = useState<FinancialTransfer[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [preselectedOriginId, setPreselectedOriginId] = useState<string | undefined>(undefined);
  
  // Data for integration
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [referenciaPeriodo, setReferenciaPeriodo] = useState<string>('este_mes');

  // Form State
  const [formData, setFormData] = useState<Partial<FinanceRecord>>({
    tipo: 'saida',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    valor: 0,
    categoria: EXPENSE_CATEGORIES[0],
    responsavel: '',
    formaPagamento: 'Pix',
    formaRecebimento: 'Pix',
    observacoes: '',
    status: 'confirmado',
    imovelId: '',
    codigoImovel: '',
    locacaoId: '',
    clienteOrigem: '',
    beneficiario: ''
  });

  // Helper functions requested by user
  const getDateFromTransaction = (transaction: any): string => {
    const val = transaction.dataCompetencia || transaction.dataPagamento || transaction.dataVencimento || transaction.dataEfetiva || transaction.data || transaction.createdAt;
    if (!val) return '';
    if (typeof val === 'object' && val !== null && 'seconds' in val) {
      return new Date(val.seconds * 1000).toISOString().split('T')[0];
    }
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
      return val.split('T')[0];
    }
    return String(val);
  };

  const filterTransactionsByPeriod = (transactions: any[], start: string, end: string) => {
    return transactions.filter(t => {
      const d = getDateFromTransaction(t);
      if (!d) return false;
      return d >= start && d <= end;
    });
  };

  const calculateFinancialSummary = (transactions: any[]) => {
    let totalOutflow = 0;
    let totalReceitasComissao = 0;
    let totalInflow = 0;
    let totalSaida = 0;

    transactions.forEach(t => {
      // IMPORTANT: Internal transfers NEVER affect operational expenses, revenues, or profit
      if (isTransferencia(t)) return;

      const val = Number(t.valor || 0);
      const tp = String(t.tipo || '').toLowerCase();
      const cat = String(t.categoria || '').toLowerCase();

      const isGasto = tp === 'saida' || tp === 'saída' || tp === 'despesa' || tp === 'gasto' || EXPENSE_CATEGORIES.map(c => c.toLowerCase()).includes(cat);
      if (isGasto) {
        totalOutflow += val;
      }

      const isRevComissao = (tp === 'entrada' || tp === 'receita' || tp === 'comissão' || tp === 'comissao') && (cat.includes('comissão') || cat.includes('comissao'));
      if (isRevComissao) {
        totalReceitasComissao += val;
      }

      const isEntrada = tp === 'entrada' || tp === 'receita' || tp === 'comissão' || tp === 'comissao' || REVENUE_CATEGORIES.map(c => c.toLowerCase()).includes(cat);
      const isSaida = tp === 'saida' || tp === 'saída' || tp === 'despesa' || tp === 'gasto' || EXPENSE_CATEGORIES.map(c => c.toLowerCase()).includes(cat);

      if (isEntrada) {
        totalInflow += val;
      }
      if (isSaida) {
        totalSaida += val;
      }
    });

    return {
      gastosOperacionais: totalOutflow,
      receitasComissao: totalReceitasComissao,
      lucroLiquido: totalReceitasComissao - totalOutflow,
      saldoMes: totalInflow - totalSaida
    };
  };

  const getPeriodRanges = (option: string, customStart?: string, customEnd?: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let start = new Date();
    let end = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (option === 'este_mes') {
      start = new Date(currentYear, currentMonth, 1);
      end = new Date(currentYear, currentMonth + 1, 0);
      
      prevStart = new Date(currentYear, currentMonth - 1, 1);
      prevEnd = new Date(currentYear, currentMonth, 0);
    } else if (option === 'mes_anterior') {
      start = new Date(currentYear, currentMonth - 1, 1);
      end = new Date(currentYear, currentMonth, 0);
      
      prevStart = new Date(currentYear, currentMonth - 2, 1);
      prevEnd = new Date(currentYear, currentMonth - 1, 0);
    } else if (option === 'proximo_mes') {
      start = new Date(currentYear, currentMonth + 1, 1);
      end = new Date(currentYear, currentMonth + 2, 0);
      
      prevStart = new Date(currentYear, currentMonth, 1);
      prevEnd = new Date(currentYear, currentMonth + 1, 0);
    } else if (option === 'ano') {
      start = new Date(currentYear, 0, 1);
      end = new Date(currentYear, 12, 0);
      
      prevStart = new Date(currentYear - 1, 0, 1);
      prevEnd = new Date(currentYear - 1, 12, 0);
    } else if (option === 'personalizado') {
      if (customStart && customEnd) {
        start = new Date(customStart + 'T00:00:00');
        end = new Date(customEnd + 'T23:59:59');
        
        const diffTime = Math.abs(end.getTime() - start.getTime());
        prevEnd = new Date(start.getTime() - 1000);
        prevStart = new Date(prevEnd.getTime() - diffTime);
      } else {
        start = new Date(currentYear, currentMonth, 1);
        end = new Date(currentYear, currentMonth + 1, 0);
        prevStart = new Date(currentYear, currentMonth - 1, 1);
        prevEnd = new Date(currentYear, currentMonth, 0);
      }
    } else {
      const monthsMap: { [key: string]: number } = {
        janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
        julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
      };
      const mIndex = monthsMap[option] ?? currentMonth;
      start = new Date(currentYear, mIndex, 1);
      end = new Date(currentYear, mIndex + 1, 0);
      
      prevStart = new Date(currentYear, mIndex - 1, 1);
      prevEnd = new Date(currentYear, mIndex, 0);
    }

    return {
      current: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      previous: {
        start: prevStart.toISOString().split('T')[0],
        end: prevEnd.toISOString().split('T')[0]
      }
    };
  };

  const getPercentageChange = (current: number, prev: number) => {
    if (prev === 0) {
      if (current === 0) return { percent: 0, text: '0%', type: 'neutral' };
      return { percent: 100, text: '+100%', type: 'increase' };
    }
    const diff = current - prev;
    const pct = (diff / prev) * 100;
    const sign = pct > 0 ? '+' : '';
    return {
      percent: pct,
      text: `${sign}${pct.toFixed(0)}%`,
      type: pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'neutral'
    };
  };

  // Real-time collection synchronization
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // 1. Live listener for financeiro collection
    const qFinanceiro = query(collection(db, 'financeiro'), orderBy('data', 'desc'));
    const unsubscribeFinanceiro = onSnapshot(qFinanceiro, (snapshot) => {
      const financeiroData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sourceCollection: 'financeiro'
      } as FinanceRecord & { sourceCollection: string }));
      
      setRecords(prev => {
        const others = prev.filter(r => r.sourceCollection !== 'financeiro');
        const merged = [...financeiroData, ...others].sort((a, b) => b.data.localeCompare(a.data));
        return merged;
      });
      setLoading(false);
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'financeiro':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'financeiro':", error);
      }
      setLoading(false);
    });

    // 2. Live listener for legacy gastos collection
    const qGastos = query(collection(db, 'gastos'), orderBy('date', 'desc'));
    const unsubscribeGastos = onSnapshot(qGastos, (snapshot) => {
      const legacyGastos = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          tipo: 'saida',
          data: d.date || '',
          valor: d.value || 0,
          descricao: d.description || '',
          categoria: d.category || 'Outros',
          responsavel: d.responsible || 'Admin',
          formaPagamento: d.paymentMethod || 'Outro',
          status: 'confirmado',
          sourceCollection: 'gastos'
        } as FinanceRecord & { sourceCollection: string };
      });

      setRecords(prev => {
        const others = prev.filter(r => r.sourceCollection !== 'gastos');
        const merged = [...legacyGastos, ...others].sort((a, b) => b.data.localeCompare(a.data));
        return merged;
      });
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'gastos':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'gastos':", error);
      }
    });

    // 3. Live listener for legacy receitas collection
    const qReceitas = query(collection(db, 'receitas'), orderBy('date', 'desc'));
    const unsubscribeReceitas = onSnapshot(qReceitas, (snapshot) => {
      const legacyReceitas = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          tipo: 'entrada',
          data: d.date || '',
          valor: d.value || 0,
          descricao: d.description || '',
          categoria: d.type || 'Outros',
          status: 'confirmado',
          responsavel: 'Admin',
          sourceCollection: 'receitas'
        } as FinanceRecord & { sourceCollection: string };
      });

      setRecords(prev => {
        const others = prev.filter(r => r.sourceCollection !== 'receitas');
        const merged = [...legacyReceitas, ...others].sort((a, b) => b.data.localeCompare(a.data));
        return merged;
      });
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'receitas':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'receitas':", error);
      }
    });

    fetchIntegrations();

    // 4. Live listener for contasFinanceiras
    const qContas = query(collection(db, 'contasFinanceiras'));
    const unsubscribeContas = onSnapshot(qContas, (snapshot) => {
      const contasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialAccount));
      setAccounts(contasData.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome)));
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'contasFinanceiras':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'contasFinanceiras':", error);
      }
    });

    // 5. Live listener for transferenciasFinanceiras
    const qTransferencias = query(collection(db, 'transferenciasFinanceiras'), orderBy('dataTransferencia', 'desc'));
    const unsubscribeTransferencias = onSnapshot(qTransferencias, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialTransfer));
      setTransfers(transData);
    }, (error: any) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn("Aguardando permissões em 'transferenciasFinanceiras':", error?.message);
      } else {
        console.error("Erro no onSnapshot 'transferenciasFinanceiras':", error);
      }
    });

    // Check and seed default accounts if empty
    seedDefaultAccountsIfEmpty(db);

    return () => {
      unsubscribeFinanceiro();
      unsubscribeGastos();
      unsubscribeReceitas();
      unsubscribeContas();
      unsubscribeTransferencias();
    };
  }, [user]);

  // Update date bounds automatically when referenciaPeriodo changes
  useEffect(() => {
    if (referenciaPeriodo !== 'personalizado') {
      const ranges = getPeriodRanges(referenciaPeriodo);
      setStartDate(ranges.current.start);
      setEndDate(ranges.current.end);
    }
  }, [referenciaPeriodo]);

  const toggleStatus = async (item: FinanceRecord & { sourceCollection?: string }) => {
    try {
      const coll = item.sourceCollection || 'financeiro';
      const currentStatus = item.status || 'confirmado';
      const newStatus = currentStatus === 'confirmado' ? 'pendente' : 'confirmado';
      await updateDoc(doc(db, coll, item.id!), { status: newStatus });
      triggerToast(`Status do lançamento atualizado para ${newStatus === 'confirmado' ? 'pago/recebido' : 'pendente'}.`, "success");
    } catch (err: any) {
      console.error("Erro ao atualizar status do lançamento:", err);
      triggerToast("Erro ao atualizar status do lançamento.", "error");
    }
  };

  const fetchData = async () => {
    // No-op placeholder since onSnapshot manages everything in real-time
  };

  const fetchIntegrations = async () => {
    try {
      const propSnap = await getDocs(collection(db, 'imoveis'));
      setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
      
      const leaseSnap = await getDocs(collection(db, 'locacoes'));
      setLeases(leaseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease)));
    } catch (error) {
      console.error("Error fetching integrations:", error);
    }
  };

  const handleSelecionarLocacao = (locacaoId: string) => {
    if (!locacaoId) {
      setFormData(prev => ({
        ...prev,
        locacaoId: '',
        imovelId: '',
        codigoImovel: '',
        clienteOrigem: '',
        descricao: '',
        valor: 0
      }));
      return;
    }

    const locacao = leases.find((item) => item.id === locacaoId) as any;
    if (!locacao) return;

    const valorComissao = calcularComissaoImobiliaria(locacao);
    const nomeLocatario = locacao.locatarioNome || locacao.tenantName || locacao.clienteNome || "";
    const codImovel = locacao.propertyCode || locacao.imovelCodigo || "";

    setFormData((prev) => ({
      ...prev,
      tipo: 'entrada',
      categoria: 'Receita de Comissão',
      valor: valorComissao,
      clienteOrigem: nomeLocatario,
      descricao: `Comissão imobiliária referente à locação do imóvel ${codImovel} - ${nomeLocatario}`.trim(),
      locacaoId: locacao.id,
      imovelId: locacao.imovelId || locacao.propertyId || '',
      codigoImovel: codImovel,
      formaRecebimento: prev.formaRecebimento || 'Pix'
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Usuário atual:", user?.email);
    console.log("É admin:", isAdmin);

    if (!isAdmin) {
      triggerToast("Você não tem permissão para salvar lançamentos.", "error");
      return;
    }

    // Custom Form Validation
    const valNumerico = parseFloat(String(formData.valor || '0'));
    if (!formData.data) {
      triggerToast("Informe a data efetiva do lançamento.", "error");
      return;
    }
    if (!(valNumerico > 0)) {
      triggerToast("Informe um valor maior que R$ 0,00.", "error");
      return;
    }
    if (!formData.descricao || !formData.descricao.trim()) {
      triggerToast("Informe a descrição do lançamento.", "error");
      return;
    }
    if (!formData.categoria) {
      triggerToast("Informe a categoria do lançamento.", "error");
      return;
    }

    setLoading(true);
    try {
      console.log("Tipo lançamento:", formData.tipo);
      console.log("Categoria:", formData.categoria);
      console.log("Imóvel selecionado:", formData.imovelId);
      console.log("É gasto da imobiliária:", formData.imovelId === 'imobiliaria');

      // 1. Prevent duplicate commission entries for this lease
      if (formData.locacaoId && formData.categoria === 'Receita de Comissão') {
        const duplicateExists = records.some(r => r.locacaoId === formData.locacaoId && r.categoria === 'Receita de Comissão');
        if (duplicateExists) {
          if (!confirm('Comissão desta locação já foi lançada no financeiro. Deseja registrar outro lançamento mesmo assim?')) {
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fetch extra keys for lease if not present or to ensure fidelity
      let extraFields: any = {};
      if (formData.locacaoId) {
        const lease = leases.find(l => l.id === formData.locacaoId) as any;
        if (lease) {
          const lNome = lease.locatarioNome || lease.tenantName || lease.clienteNome || '';
          const lCod = lease.propertyCode || lease.imovelCodigo || '';
          extraFields = {
            locatarioNome: lNome,
            imovelCodigo: lCod,
            origem: 'locacao',
            identificacao: `${lCod} - ${lNome}`.trim()
          };
        }
      }

      // Set property-related fields depending on whether 'imobiliaria' is selected or not
      let finalImovelId = formData.imovelId || null;
      let finalImovelCodigo = formData.codigoImovel || '';
      let finalImovelTitulo = '';
      let finalCentroCusto = 'Imóvel';
      let finalOrigem = formData.tipo === 'entrada' ? 'entrada' : 'imovel';

      if (formData.imovelId === 'imobiliaria') {
        finalImovelId = null;
        finalImovelCodigo = 'IMOBILIARIA';
        finalImovelTitulo = 'Imobiliária';
        finalCentroCusto = 'Imobiliária';
        finalOrigem = 'imobiliaria';
      } else if (formData.imovelId) {
        const prop = properties.find(p => p.id === formData.imovelId);
        if (prop) {
          finalImovelTitulo = prop.title || '';
          finalImovelCodigo = prop.code || '';
        }
      }

      const rawPayload = {
        tipo: formData.tipo || 'saida',
        categoria: formData.categoria || '',
        descricao: (formData.descricao || '').trim(),
        valor: valNumerico,
        formaPagamento: formData.tipo === 'entrada' ? '' : (formData.formaPagamento || 'Pix'),
        formaRecebimento: formData.tipo === 'entrada' ? (formData.formaRecebimento || 'Pix') : '',
        dataEfetiva: formData.data || '',
        data: formData.data || '', // kept for safety/compatibility
        destinatarioFornecedor: formData.tipo === 'entrada' ? '' : (formData.beneficiario || formData.clienteOrigem || ''),
        clienteOrigem: formData.tipo === 'entrada' ? (formData.clienteOrigem || '') : '',
        observacoes: formData.observacoes || "",
        imovelId: finalImovelId,
        imovelCodigo: finalImovelCodigo,
        codigoImovel: finalImovelCodigo, // kept for safety/compatibility
        imovelTitulo: finalImovelTitulo,
        centroCusto: finalCentroCusto,
        origem: finalOrigem,
        locacaoId: formData.locacaoId || null,
        responsavel: formData.responsavel || 'Admin',
        status: formData.status || 'confirmado',
        ...extraFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const cleanPayload = cleanFirestoreData(rawPayload);

      console.log("Dados finais do lançamento:", cleanPayload);

      await addDoc(collection(db, "financeiro"), cleanPayload);

      // If linked to a lease and confirmed inflow, update lease status
      if (formData.tipo === 'entrada' && formData.locacaoId && formData.status === 'confirmado') {
        const leaseRef = doc(db, 'locacoes', formData.locacaoId);
        await updateDoc(leaseRef, {
          statusPagamento: 'Pago',
          lastPaymentDate: formData.data,
          updatedAt: serverTimestamp()
        });
      }

      setShowModal(false);
      setFormData({
        tipo: 'saida',
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        valor: 0,
        categoria: EXPENSE_CATEGORIES[0],
        responsavel: '',
        formaPagamento: 'Pix',
        formaRecebimento: 'Pix',
        observacoes: '',
        status: 'confirmado',
        imovelId: '',
        codigoImovel: '',
        locacaoId: '',
        clienteOrigem: '',
        beneficiario: ''
      });
      fetchData();
      triggerToast("Lançamento registrado com sucesso.", "success");
    } catch (error: any) {
      console.error("Erro ao registrar saída:", error.code, error.message, error);
      triggerToast(`Erro ao registrar saída: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: FinanceRecord & { sourceCollection?: string }) => {
    if (confirm('Deseja excluir este lançamento?')) {
      try {
        const coll = record.sourceCollection || 'financeiro';
        await deleteDoc(doc(db, coll, record.id!));
        fetchData();
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Internal transfers are managed in the dedicated Transferências tab
      if (isTransferencia(record)) return false;

      const matchesTab = activeTab === 'todos' || 
                        (activeTab === 'entradas' && record.tipo === 'entrada') || 
                        (activeTab === 'saidas' && record.tipo === 'saida');
      
      const matchesSearch = record.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.clienteOrigem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.codigoImovel?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !filterCategory || record.categoria === filterCategory;
      const matchesStartDate = !startDate || record.data >= startDate;
      const matchesEndDate = !endDate || record.data <= endDate;

      return matchesTab && matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [records, activeTab, searchQuery, filterCategory, startDate, endDate]);

  const stats = useMemo(() => {
    // 1. Current selected period transactions
    const currentPeriodTransactions = filterTransactionsByPeriod(records, startDate, endDate);
    const currentSummary = calculateFinancialSummary(currentPeriodTransactions);

    // 2. Previous period transactions for comparison
    const ranges = getPeriodRanges(referenciaPeriodo, startDate, endDate);
    const prevPeriodTransactions = filterTransactionsByPeriod(records, ranges.previous.start, ranges.previous.end);
    const prevSummary = calculateFinancialSummary(prevPeriodTransactions);

    // Percentage Changes
    const gastosChange = getPercentageChange(currentSummary.gastosOperacionais, prevSummary.gastosOperacionais);
    const receitasChange = getPercentageChange(currentSummary.receitasComissao, prevSummary.receitasComissao);
    const lucroChange = getPercentageChange(currentSummary.lucroLiquido, prevSummary.lucroLiquido);
    const saldoChange = getPercentageChange(currentSummary.saldoMes, prevSummary.saldoMes);

    return {
      gastosOperacionais: currentSummary.gastosOperacionais,
      receitasComissao: currentSummary.receitasComissao,
      lucroLiquido: currentSummary.lucroLiquido,
      saldoMes: currentSummary.saldoMes,
      
      prevGastosOperacionais: prevSummary.gastosOperacionais,
      prevReceitasComissao: prevSummary.receitasComissao,
      prevLucroLiquido: prevSummary.lucroLiquido,
      prevSaldoMes: prevSummary.saldoMes,

      gastosChange,
      receitasChange,
      lucroChange,
      saldoChange,

      // Keep properties for older references to avoid any crashes
      totalInflow: currentSummary.receitasComissao,
      totalOutflow: currentSummary.gastosOperacionais,
      balance: currentSummary.lucroLiquido,
      monthInflow: currentSummary.receitasComissao,
      monthOutflow: currentSummary.gastosOperacionais,
      monthBalance: currentSummary.saldoMes
    };
  }, [records, startDate, endDate, referenciaPeriodo]);

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Resolve watermark image
      const watermarkUrl = empresa.marcaDaguaUrl || empresa.logoCabecalhoUrl || "/watermark.png";
      let watermarkBase64 = "";
      let watermarkAspect = 1.0;
      try {
        const watermarkData = await getWatermarkData(watermarkUrl, 0.08);
        watermarkBase64 = watermarkData.base64;
        watermarkAspect = watermarkData.aspectRatio;
      } catch (e) {
        console.error("Error drawing watermark:", e);
      }

      const logoUrl = empresa.logoCabecalhoUrl || empresa.logoUrl || "/logo.png";
      let logoBase64 = "";
      let logoAspect = 1.0;
      try {
        const logoData = await getWatermarkData(logoUrl, 1.0);
        logoBase64 = logoData.base64;
        logoAspect = logoData.aspectRatio;
      } catch (err) {
        console.error("Error fetching logo for finance report:", err);
      }

      // 1. Watermark - Centered high-fidelity branding or fallback diagonal texts
      if (watermarkBase64 && watermarkBase64 !== "/watermark.png") {
        const wWidth = 140;
        const wHeight = wWidth * watermarkAspect;
        const wX = (pageWidth - wWidth) / 2;
        const wY = (pageHeight - wHeight) / 2;
        doc.addImage(watermarkBase64, "PNG", wX, wY, wWidth, wHeight);
      } else {
        const watermarkText = safeText(empresa.nome || 'MENTA IMÓVEIS');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(245, 245, 245);
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.25, { align: 'center', angle: 30 });
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.55, { align: 'center', angle: 30 });
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.85, { align: 'center', angle: 30 });
      }

      // 2. Beautiful Corporate Header
      let headerTextOffset = 20;
      if (logoBase64 && logoBase64 !== "/logo.png" && logoBase64 !== "/watermark.png") {
        const logoWidth = 18;
        const logoHeight = logoWidth * logoAspect;
        doc.addImage(logoBase64, "PNG", 20, 14, logoWidth, logoHeight);
        headerTextOffset = 20 + logoWidth + 6;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(safeText(empresa.nome || 'MENTA IMÓVEIS'), headerTextOffset, 19);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      const headerLine2 = `${safeText(empresa.razaoSocial || 'Menta Negócios Imobiliários Ltda')} | CNPJ: ${safeText(empresa.cnpj || '---')}`;
      const headerLine3 = `${safeText(empresa.endereco || '---')} | CRECI PJ: ${safeText(empresa.creciPj || '---')}`;
      doc.text(headerLine2, headerTextOffset, 23);
      doc.text(headerLine3, headerTextOffset, 27);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(201, 161, 82); // Gold
      doc.text('RELATÓRIO FINANCEIRO', pageWidth - 20, 21, { align: 'right' });
      
      // Line under header
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.5);
      doc.line(20, 33, pageWidth - 20, 33);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`, 20, 39);
      doc.text(`Gerado em: ${safeDate(new Date())}`, pageWidth - 20, 39, { align: 'right' });
      
      autoTable(doc, {
        startY: 45,
        head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Centro de Custo', 'Valor']],
        body: filteredRecords.filter(r => r.tipo !== 'entrada' || r.categoria === 'Receita de Comissão').map(r => {
          let centroCustoText = 'Imóvel';
          if (r.centroCusto === 'Imobiliária' || r.codigoImovel === 'IMOBILIARIA' || (!r.imovelId && r.origem === 'imobiliaria')) {
            centroCustoText = 'Imobiliária';
          } else if (r.imovelId || r.codigoImovel) {
            centroCustoText = `Imóvel: ${r.codigoImovel || ''}`;
          } else {
            centroCustoText = '-';
          }
          return [
            safeDate(r.data),
            r.tipo === 'entrada' ? 'Entrada' : 'Saída',
            safeText(r.descricao),
            safeText(r.categoria),
            centroCustoText,
            safeMoney(r.valor)
          ];
        }),
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
        theme: 'grid',
        styles: { fontSize: 8.5 }
      });
  
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text('RESUMO FINANCEIRO', 20, finalY);
      
      const inflow = filteredRecords.filter(r => r.tipo === 'entrada' && r.categoria === 'Receita de Comissão').reduce((acc, curr) => acc + curr.valor, 0);
      const outflow = filteredRecords.filter(r => r.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total de Entradas:`, 20, finalY + 8);
      doc.setFont('helvetica', 'bold');
      doc.text(safeMoney(inflow), 70, finalY + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Saídas:`, 20, finalY + 15);
      doc.setFont('helvetica', 'bold');
      doc.text(safeMoney(outflow), 70, finalY + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Saldo Líquido:`, 20, finalY + 22);
      doc.setFont('helvetica', 'bold');
      if (inflow - outflow >= 0) {
        doc.setTextColor(30, 80, 50);
      } else {
        doc.setTextColor(180, 40, 40);
      }
      doc.text(safeMoney(inflow - outflow), 70, finalY + 22);
      
      doc.save('Relatorio_Financeiro.pdf');
    } catch (e) {
      console.error("Erro ao gerar relatório financeiro em PDF:", e);
      alert("Não foi possível gerar o PDF financeiro. Tente novamente.");
    }
  };

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <motion.div 
        variants={slideUp}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Financial Management</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Fluxo de Caixa</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Controle completo de entradas e saídas da imobiliária.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportPDF}
            className="flex items-center gap-2 px-5 py-3.5 border border-gray-200 rounded-2xl text-gray-600 hover:text-primary-black hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest bg-white shadow-sm"
          >
            <FileDown size={16} /> Exportar PDF
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 px-5 py-3.5 border border-amber-200/80 bg-amber-50/60 text-amber-900 hover:bg-amber-100/80 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
          >
            <Wallet size={16} className="text-amber-700" />
            <span>Cadastrar Conta</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setPreselectedOriginId(undefined);
              setShowTransferModal(true);
            }}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm group"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
              <ArrowRightLeft size={14} className="text-emerald-600 group-hover:text-white" />
            </div>
            <span>Nova Transferência</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-2xl !py-3.5 !px-7 shadow-xl shadow-primary-black/10 flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <Plus size={16} className="text-gold" />
            </div>
            <span className="uppercase text-xs font-black tracking-widest leading-none">Novo Lançamento</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mês de Referência Selector */}
      <motion.div 
        variants={slideUp} 
        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mês de referência</label>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gold" />
            <span className="text-sm font-semibold text-primary-black">
              Filtrando dados de: <span className="text-gold font-mono">{startDate || 'Início'}</span> até <span className="text-gold font-mono">{endDate || 'Hoje'}</span>
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <select
              value={referenciaPeriodo}
              onChange={(e) => setReferenciaPeriodo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-primary-black outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all cursor-pointer shadow-sm"
            >
              <option value="este_mes">Este mês</option>
              <option value="mes_anterior">Mês anterior</option>
              <option value="proximo_mes">Próximo mês</option>
              <option value="ano">Ano</option>
              <optgroup label="Janeiro a Dezembro">
                <option value="janeiro">Janeiro</option>
                <option value="fevereiro">Fevereiro</option>
                <option value="marco">Março</option>
                <option value="abril">Abril</option>
                <option value="maio">Maio</option>
                <option value="junho">Junho</option>
                <option value="julho">Julho</option>
                <option value="agosto">Agosto</option>
                <option value="setembro">Setembro</option>
                <option value="outubro">Outubro</option>
                <option value="novembro">Novembro</option>
                <option value="dezembro">Dezembro</option>
              </optgroup>
              <option value="personalizado">Período personalizado</option>
            </select>
          </div>

          {referenciaPeriodo === 'personalizado' && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
              />
              <span className="text-xs font-bold text-gray-400">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group"
         >
            <div className="flex items-center gap-3 text-red-500 mb-4 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><TrendingDown size={18} /></div> Gastos Operacionais
            </div>
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">{formatCurrency(stats.gastosOperacionais)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">vs mês anterior:</span>
               <span className={`font-bold ${stats.gastosChange.type === 'increase' ? 'text-red-500' : stats.gastosChange.type === 'decrease' ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {stats.gastosChange.text} ({formatCurrency(stats.prevGastosOperacionais)})
               </span>
            </div>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group"
         >
            <div className="flex items-center gap-3 text-emerald-500 mb-4 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp size={18} /></div> Receitas de Comissão
            </div>
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">{formatCurrency(stats.receitasComissao)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">vs mês anterior:</span>
               <span className={`font-bold ${stats.receitasChange.type === 'increase' ? 'text-emerald-500' : stats.receitasChange.type === 'decrease' ? 'text-red-500' : 'text-gray-400'}`}>
                  {stats.receitasChange.text} ({formatCurrency(stats.prevReceitasComissao)})
               </span>
            </div>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className={`${stats.lucroLiquido >= 0 ? 'bg-primary-black text-white' : 'bg-red-600 text-white'} p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group`}
         >
            <div className="flex items-center gap-3 text-gold mb-4 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><DollarSign size={18} /></div> Lucro Líquido
            </div>
            <h3 className="text-3xl font-bold tracking-tighter">{formatCurrency(stats.lucroLiquido)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-white/40 font-medium uppercase tracking-widest font-semibold">Saldo do mês:</span>
               <span className={`font-bold ${stats.saldoMes >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>{formatCurrency(stats.saldoMes)}</span>
            </div>
         </motion.div>
      </motion.div>

      {/* Module Navigation Tabs */}
      <motion.div variants={slideUp} className="bg-white p-2.5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap items-center gap-2">
        <button 
          onClick={() => setActiveTab('todos')}
          className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-2.5 ${activeTab === 'todos' ? 'bg-primary-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:text-primary-black hover:bg-gray-50'}`}
        >
          <span>Todos</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${activeTab === 'todos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {records.filter(r => !isTransferencia(r)).length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('entradas')}
          className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-2.5 ${activeTab === 'entradas' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/50'}`}
        >
          <PlusCircle size={14} />
          <span>Entradas</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${activeTab === 'entradas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {records.filter(r => !isTransferencia(r) && r.tipo === 'entrada').length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('saidas')}
          className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-2.5 ${activeTab === 'saidas' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-red-600 hover:bg-red-50/50'}`}
        >
          <MinusCircle size={14} />
          <span>Saídas</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${activeTab === 'saidas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {records.filter(r => !isTransferencia(r) && r.tipo === 'saida').length}
          </span>
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-2 hidden sm:block" />

        <button 
          onClick={() => setActiveTab('transferencias')}
          className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-2.5 ${activeTab === 'transferencias' ? 'bg-emerald-800 text-white shadow-lg shadow-emerald-900/20' : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/50'}`}
        >
          <ArrowRightLeft size={14} />
          <span>Transferências</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${activeTab === 'transferencias' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {transfers.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('contas')}
          className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-2.5 ${activeTab === 'contas' ? 'bg-primary-black text-white shadow-lg shadow-black/10' : 'text-gray-600 hover:text-primary-black hover:bg-gray-50'}`}
        >
          <Wallet size={14} />
          <span>Contas & Caixas</span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${activeTab === 'contas' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {accounts.filter(a => a.ativo !== false).length}
          </span>
        </button>
      </motion.div>

      {/* Tab Content: Contas & Caixas */}
      {activeTab === 'contas' && (
        <AccountsManager 
          db={db}
          accounts={accounts}
          transfers={transfers}
          onOpenTransferModal={(accId) => {
            setPreselectedOriginId(accId);
            setShowTransferModal(true);
          }}
          onToast={triggerToast}
        />
      )}

      {/* Tab Content: Transferências */}
      {activeTab === 'transferencias' && (
        <TransferHistoryTable 
          db={db}
          transfers={transfers}
          accounts={accounts}
          properties={properties}
          currentUser={user}
          onOpenTransferModal={() => {
            setPreselectedOriginId(undefined);
            setShowTransferModal(true);
          }}
          onToast={triggerToast}
        />
      )}

      {/* Tab Content: Lançamentos Operacionais (Todos, Entradas, Saídas) */}
      {(activeTab === 'todos' || activeTab === 'entradas' || activeTab === 'saidas') && (
        <>
          {/* Filters Area */}
          <motion.div variants={slideUp} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Busca Rápida</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="text" 
                    placeholder="Descrição, Cliente, Código..." 
                    className="w-full bg-gray-50 border border-transparent rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Categoria</label>
                <select 
                  className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {activeTab === 'saidas' && EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {activeTab === 'entradas' && REVENUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {activeTab === 'todos' && Array.from(new Set([...EXPENSE_CATEGORIES, ...REVENUE_CATEGORIES])).sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">De</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Até</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-gold/20 focus:bg-white transition-all"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={slideUp}
            className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* List */}
            <div className="overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.table 
                  key={activeTab}
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full"
                >
                  <thead>
                    <tr className="text-left bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                      <th className="p-8 pl-12 font-black">Data</th>
                      <th className="p-8 font-black">Tipo</th>
                      <th className="p-8 font-black">Descrição</th>
                      <th className="p-8 font-black">Categoria</th>
                      <th className="p-8 font-black">Identificação</th>
                      <th className="p-8 font-black">Valor</th>
                      <th className="p-8 text-right pr-12 font-black">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-gray-300">
                            <Filter size={48} className="opacity-20" />
                            <p className="text-sm font-medium">Nenhum lançamento encontrado para os filtros selecionados.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(item => (
                        <motion.tr 
                          key={item.id} 
                          variants={slideUp}
                          className="hover:bg-gray-50/40 transition-all group"
                        >
                          <td className="p-8 pl-12 text-sm text-gray-500 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Calendar size={14} className="text-gray-300" />
                              {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="p-8">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                              {item.tipo === 'entrada' ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                            </div>
                          </td>
                          <td className="p-8">
                            <span className="font-bold text-gray-900 tracking-tight leading-none block mb-1">{item.descricao}</span>
                            {item.observacoes && <span className="text-[10px] text-gray-400 italic line-clamp-1">{item.observacoes}</span>}
                          </td>
                          <td className="p-8">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="p-8">
                            <div className="flex flex-col gap-1">
                              {item.clienteOrigem && (
                                <span className="text-xs font-bold text-primary-black">{item.clienteOrigem}</span>
                              )}
                              {item.codigoImovel && (
                                <span className="text-[10px] font-black text-gold uppercase tracking-widest">{item.codigoImovel}</span>
                              )}
                              {!item.clienteOrigem && !item.codigoImovel && (
                                <span className="text-xs text-gray-300 italic">---</span>
                              )}
                            </div>
                          </td>
                          <td className="p-8">
                            <span className={`text-lg font-display font-bold tracking-tight whitespace-nowrap ${item.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.tipo === 'entrada' ? '+' : '-'} {formatCurrency(item.valor)}
                            </span>
                          </td>
                          <td className="p-8 pr-12 text-right">
                            <motion.button 
                              whileHover={{ scale: 1.1, color: '#ef4444' }}
                              onClick={() => handleDelete(item)}
                              className="p-4 text-gray-300 hover:bg-white hover:shadow-xl hover:shadow-black/5 rounded-2xl transition-all border border-transparent hover:border-gray-100"
                            >
                              <Trash2 size={20} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </motion.table>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}

      {/* Modal Lançamento */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div 
              {...fadeIn}
              className="fixed inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.form 
              onSubmit={handleSave}
              noValidate
              {...scaleIn}
              className="bg-white max-w-4xl w-full rounded-[3rem] shadow-2xl relative z-10 my-auto"
            >
              <div className="p-12 border-b border-gray-50 bg-primary-black text-white relative">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center"><Sparkles size={24} className="text-gold" /></div>
                      <div>
                        <h3 className="text-3xl font-display font-bold tracking-tight">Registrar Lançamento</h3>
                        <p className="text-gold/60 text-xs font-black uppercase tracking-widest mt-1">Gestão Financeira Consolidada</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all">
                      <X size={24} />
                    </button>
                 </div>

                 {/* Selector de Tipo */}
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'entrada', categoria: REVENUE_CATEGORIES[0]})}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border ${formData.tipo === 'entrada' ? 'bg-emerald-500 text-primary-black border-emerald-500 shadow-xl shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      <PlusCircle size={18} /> Entrada / Ganho
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'saida', categoria: EXPENSE_CATEGORIES[0]})}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border ${formData.tipo === 'saida' ? 'bg-red-500 text-white border-red-500 shadow-xl shadow-red-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      <MinusCircle size={18} /> Saída / Gasto
                    </button>
                 </div>
              </div>

              <div className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Data Efetiva</label>
                    <input 
                      type="date" required 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all" 
                      value={formData.data}
                      onChange={e => setFormData({...formData, data: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Valor (R$)</label>
                    <input 
                      type="text" required 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-lg font-bold text-primary-black focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all placeholder:text-gray-300" 
                      placeholder="0,00"
                      value={maskCurrency(formData.valor ?? '')}
                      onChange={e => setFormData({...formData, valor: parseCurrencyToNumber(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Forma de {formData.tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all"
                        value={formData.tipo === 'entrada' ? formData.formaRecebimento : formData.formaPagamento}
                        onChange={e => setFormData({...formData, [formData.tipo === 'entrada' ? 'formaRecebimento' : 'formaPagamento']: e.target.value})}
                      >
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Descrição do Lançamento</label>
                    <input 
                      type="text" required 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all placeholder:text-gray-300" 
                      placeholder={formData.tipo === 'entrada' ? 'Ex: Comissão de Venda - Apartamento Centro' : 'Ex: Pagamento Portais Imobiliários'}
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Categoria</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all"
                        value={formData.categoria}
                        onChange={e => setFormData({...formData, categoria: e.target.value})}
                      >
                        {(formData.tipo === 'entrada' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">{formData.tipo === 'entrada' ? 'Cliente / Origem' : 'Destinatário / Fornecedor'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all placeholder:text-gray-300" 
                      placeholder="Nome do pagador/receptor"
                      value={formData.clienteOrigem}
                      onChange={e => setFormData({...formData, clienteOrigem: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Vincular Locação (Opcional)</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all"
                        value={formData.locacaoId ?? ''}
                        onChange={e => handleSelecionarLocacao(e.target.value)}
                      >
                        <option value="">Nenhuma</option>
                        {leases.map((l: any) => (
                          <option key={l.id} value={l.id}>
                            {(l.propertyCode || l.imovelCodigo || "Sem Código")} - {(l.tenantName || l.locatarioNome || l.clienteNome || "Sem Nome")}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Vincular Imóvel (Opcional)</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all"
                        value={formData.imovelId ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'imobiliaria') {
                            setFormData({
                              ...formData,
                              imovelId: 'imobiliaria',
                              codigoImovel: 'IMOBILIARIA'
                            });
                          } else {
                            const prop = properties.find(p => p.id === val);
                            setFormData({
                              ...formData, 
                              imovelId: val,
                              codigoImovel: prop?.code || ''
                            });
                          }
                        }}
                      >
                        <option value="">Nenhum</option>
                        <option value="imobiliaria">Imobiliária</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.code} - {p.title}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Observações Adicionais</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all placeholder:text-gray-300 resize-none" 
                      placeholder="Notas internas importantes..."
                      value={formData.observacoes}
                      onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="p-10 bg-gray-50 flex items-center justify-end gap-6 border-t border-gray-100">
                 <button type="button" onClick={() => setShowModal(false)} className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] hover:text-primary-black transition-colors px-6">Cancelar</button>
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   type="submit" 
                   className={`btn-gold !text-[10px] font-black uppercase tracking-[0.3em] !rounded-[2rem] !py-6 !px-12 shadow-2xl ${formData.tipo === 'entrada' ? '!bg-emerald-600 !text-white' : '!bg-primary-black !text-white'}`}
                   disabled={loading}
                 >
                   {loading ? 'Processando...' : formData.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
                 </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Transferência Interna */}
      <TransferModal 
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setPreselectedOriginId(undefined);
        }}
        db={db}
        accounts={accounts}
        properties={properties}
        leases={leases}
        currentUser={user}
        preselectedOriginId={preselectedOriginId}
        onTransferSuccess={(msg) => {
          triggerToast(msg || "Transferência interna realizada com sucesso!", "success");
        }}
      />

      {/* Modal Cadastrar Conta Financeira */}
      {showAccountModal && (
        <AccountFormModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          db={db}
          onSuccess={(msg) => {
            triggerToast(msg || "Conta financeira salva com sucesso!", "success");
          }}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl text-white backdrop-blur-md shadow-2xl border"
            style={{
              backgroundColor: toast.type === 'success' ? '#14532d' : '#7f1d1d',
              borderColor: toast.type === 'success' ? '#16a34a' : '#b91c1c',
            }}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-300" /> : <X size={20} className="text-red-300" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
  CheckCircle
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
import { FinanceRecord, Property, Lease } from '../../types';
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

// -------------------------------------------------------------
// USER REQUESTED INTENTIONAL HELPER FUNCTIONS
// -------------------------------------------------------------

function getDateFromTransaction(transaction: any): string {
  if (!transaction) return '';
  const dateVal = transaction.dataCompetencia || 
                  transaction.dataPagamento || 
                  transaction.dataVencimento || 
                  transaction.createdAt || 
                  transaction.data || 
                  transaction.date;
                  
  if (!dateVal) return '';

  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      try {
        return dateVal.toDate().toISOString().split('T')[0];
      } catch (e) {}
    }
    if (dateVal.seconds !== undefined) {
      try {
        return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
      } catch (e) {}
    }
    if (dateVal instanceof Date) {
      try {
        return dateVal.toISOString().split('T')[0];
      } catch (e) {}
    }
  }

  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }

  return String(dateVal).split('T')[0];
}

function filterTransactionsByPeriod(transactions: any[], startDate: string, endDate: string): any[] {
  return transactions.filter(t => {
    const tDate = getDateFromTransaction(t);
    if (!tDate) return false;
    const matchesStart = !startDate || tDate >= startDate;
    const matchesEnd = !endDate || tDate <= endDate;
    return matchesStart && matchesEnd;
  });
}

function calculateFinancialSummary(transactions: any[]) {
  let gastosOperacionais = 0;
  let receitasComissao = 0;
  let entradasTotais = 0;
  let saidasTotais = 0;

  transactions.forEach(t => {
    const val = Number(t.valor) || 0;
    
    // 1. Gastos Operacionais: tipo = "Saída" ou "Despesa" ou "Gasto" ou categoria seja gasto operacional
    const tipo = String(t.tipo || '').toLowerCase();
    const cat = String(t.categoria || '').toLowerCase();
    
    const isGasto = tipo === 'saida' || tipo === 'saída' || tipo === 'despesa' || tipo === 'gasto' ||
                    cat === 'operacional' || cat.includes('gasto') || cat.includes('despesa') || cat.includes('operacional') ||
                    EXPENSE_CATEGORIES.map(c => c.toLowerCase()).includes(cat);
                    
    if (isGasto) {
      gastosOperacionais += val;
      saidasTotais += val;
    } else {
      if (tipo === 'saida' || tipo === 'saída' || tipo === 'despesa' || tipo === 'gasto') {
        saidasTotais += val;
      }
    }
    
    // 2. Receitas de Comissão: tipo = "Entrada" ou "Receita" ou "Comissão" e categoria contenha "Comissão"
    const isComissao = (tipo === 'entrada' || tipo === 'receita' || tipo === 'comissão' || tipo === 'comissao') &&
                       (cat.includes('comissão') || cat.includes('comissao'));
                       
    if (isComissao) {
      receitasComissao += val;
    }
    
    // 4. Saldo do mês (Entradas totais)
    const isEntrada = tipo === 'entrada' || tipo === 'receita' || tipo === 'comissão' || tipo === 'comissao';
    if (isEntrada) {
      entradasTotais += val;
    }
  });

  return {
    gastosOperacionais,
    receitasComissao,
    lucroLiquido: receitasComissao - gastosOperacionais,
    saldoMes: entradasTotais - saidasTotais,
    entradasTotais,
    saidasTotais
  };
}

const PERIOD_OPTIONS = [
  { value: 'este_mes', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'proximo_mes', label: 'Próximo mês' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
  { value: 'ano', label: 'Ano' },
  { value: 'personalizado', label: 'Período personalizado' }
];

const getPeriodDates = (period: string, customStart: string, customEnd: string) => {
  const today = new Date();
  const year = today.getFullYear(); // 2026
  const month = today.getMonth(); // 6 (July is index 6)

  let start = '';
  let end = '';
  let prevStart = '';
  let prevEnd = '';

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (period === 'este_mes') {
    const sDate = new Date(year, month, 1);
    const eDate = new Date(year, month + 1, 0);
    start = formatLocalDate(sDate);
    end = formatLocalDate(eDate);

    const psDate = new Date(year, month - 1, 1);
    const peDate = new Date(year, month, 0);
    prevStart = formatLocalDate(psDate);
    prevEnd = formatLocalDate(peDate);
  } else if (period === 'mes_anterior') {
    const sDate = new Date(year, month - 1, 1);
    const eDate = new Date(year, month, 0);
    start = formatLocalDate(sDate);
    end = formatLocalDate(eDate);

    const psDate = new Date(year, month - 2, 1);
    const peDate = new Date(year, month - 1, 0);
    prevStart = formatLocalDate(psDate);
    prevEnd = formatLocalDate(peDate);
  } else if (period === 'proximo_mes') {
    const sDate = new Date(year, month + 1, 1);
    const eDate = new Date(year, month + 2, 0);
    start = formatLocalDate(sDate);
    end = formatLocalDate(eDate);

    const psDate = new Date(year, month, 1);
    const peDate = new Date(year, month + 1, 0);
    prevStart = formatLocalDate(psDate);
    prevEnd = formatLocalDate(peDate);
  } else if (period === 'ano') {
    start = `${year}-01-01`;
    end = `${year}-12-31`;

    prevStart = `${year - 1}-01-01`;
    prevEnd = `${year - 1}-12-31`;
  } else if (period === 'personalizado') {
    start = customStart;
    end = customEnd;
    
    if (customStart && customEnd) {
      const s = new Date(customStart + 'T12:00:00');
      const e = new Date(customEnd + 'T12:00:00');
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const ps = new Date(s);
      ps.setDate(ps.getDate() - diffDays);
      const pe = new Date(e);
      pe.setDate(pe.getDate() - diffDays);
      
      prevStart = formatLocalDate(ps);
      prevEnd = formatLocalDate(pe);
    }
  } else {
    const mIdx = parseInt(period, 10) - 1;
    const sDate = new Date(year, mIdx, 1);
    const eDate = new Date(year, mIdx + 1, 0);
    start = formatLocalDate(sDate);
    end = formatLocalDate(eDate);

    const psDate = new Date(year, mIdx - 1, 1);
    const peDate = new Date(year, mIdx, 0);
    prevStart = formatLocalDate(psDate);
    prevEnd = formatLocalDate(peDate);
  }

  return { start, end, prevStart, prevEnd };
};

export default function AdminFinance() {
  const { user, isAdmin } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };
  const { settings } = useSettings();
  const empresa = (settings?.empresa || {}) as any;
  const [activeTab, setActiveTab] = useState<'todos' | 'entradas' | 'saidas'>('todos');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<(FinanceRecord & { sourceCollection?: string })[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Data for integration
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [referencePeriod, setReferencePeriod] = useState<string>('este_mes');

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

  useEffect(() => {
    // Set initial date range for 'este_mes' on mount
    const dates = getPeriodDates('este_mes', '', '');
    setStartDate(dates.start);
    setEndDate(dates.end);

    setLoading(true);
    let unsubFinanceiro = () => {};
    let unsubGastos = () => {};
    let unsubReceitas = () => {};

    let rawFinanceiro: any[] = [];
    let rawGastos: any[] = [];
    let rawReceitas: any[] = [];

    const combineAndSetRecords = () => {
      const allData = [...rawFinanceiro, ...rawGastos, ...rawReceitas].sort((a, b) => {
        const dateA = getDateFromTransaction(a);
        const dateB = getDateFromTransaction(b);
        return dateB.localeCompare(dateA);
      });
      setRecords(allData);
    };

    // 1. Listen to 'financeiro' in real-time
    try {
      unsubFinanceiro = onSnapshot(
        query(collection(db, 'financeiro'), orderBy('data', 'desc')),
        (snapshot) => {
          rawFinanceiro = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sourceCollection: 'financeiro'
          }));
          combineAndSetRecords();
          setLoading(false);
        },
        (error) => {
          console.error("Erro real-time no financeiro:", error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Erro ao assinar financeiro:", err);
    }

    // 2. Listen to 'gastos' (legacy) in real-time
    try {
      unsubGastos = onSnapshot(
        query(collection(db, 'gastos'), orderBy('date', 'desc')),
        (snapshot) => {
          rawGastos = snapshot.docs.map(doc => {
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
            };
          });
          combineAndSetRecords();
        },
        (error) => {
          console.error("Erro real-time legacy gastos:", error);
        }
      );
    } catch (err) {
      console.error("Erro ao assinar legacy gastos:", err);
    }

    // 3. Listen to 'receitas' (legacy) in real-time
    try {
      unsubReceitas = onSnapshot(
        query(collection(db, 'receitas'), orderBy('date', 'desc')),
        (snapshot) => {
          rawReceitas = snapshot.docs.map(doc => {
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
            };
          });
          combineAndSetRecords();
        },
        (error) => {
          console.error("Erro real-time legacy receitas:", error);
        }
      );
    } catch (err) {
      console.error("Erro ao assinar legacy receitas:", err);
    }

    fetchIntegrations();

    return () => {
      unsubFinanceiro();
      unsubGastos();
      unsubReceitas();
    };
  }, []);

  const fetchData = async () => {
    // Kept as a no-op fallback for any legacy code calling it
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

  const periodDates = useMemo(() => {
    return getPeriodDates(referencePeriod, startDate, endDate);
  }, [referencePeriod, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesTab = activeTab === 'todos' || 
                        (activeTab === 'entradas' && record.tipo === 'entrada') || 
                        (activeTab === 'saidas' && record.tipo === 'saida');
      
      const matchesSearch = record.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.clienteOrigem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           record.codigoImovel?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !filterCategory || record.categoria === filterCategory;
      
      const rDate = getDateFromTransaction(record);
      const matchesStartDate = !startDate || rDate >= startDate;
      const matchesEndDate = !endDate || rDate <= endDate;

      return matchesTab && matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [records, activeTab, searchQuery, filterCategory, startDate, endDate]);

  const stats = useMemo(() => {
    const currentPeriodTransactions = filterTransactionsByPeriod(records, periodDates.start, periodDates.end);
    const prevPeriodTransactions = filterTransactionsByPeriod(records, periodDates.prevStart, periodDates.prevEnd);

    const currentSummary = calculateFinancialSummary(currentPeriodTransactions);
    const prevSummary = calculateFinancialSummary(prevPeriodTransactions);

    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(0)}%`;
    };

    const compGastos = calculatePercentageChange(currentSummary.gastosOperacionais, prevSummary.gastosOperacionais);
    const compReceitas = calculatePercentageChange(currentSummary.receitasComissao, prevSummary.receitasComissao);
    const compLucro = calculatePercentageChange(currentSummary.lucroLiquido, prevSummary.lucroLiquido);
    const compSaldo = calculatePercentageChange(currentSummary.saldoMes, prevSummary.saldoMes);

    return {
      current: currentSummary,
      previous: prevSummary,
      comparisons: {
        gastos: compGastos,
        receitas: compReceitas,
        lucro: compLucro,
        saldo: compSaldo
      }
    };
  }, [records, periodDates]);

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
        <div className="flex flex-wrap items-center gap-6">
          {/* Mês de referência selector */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
              Mês de referência
            </label>
            <select
              value={referencePeriod}
              onChange={(e) => {
                const val = e.target.value;
                setReferencePeriod(val);
                const dates = getPeriodDates(val, startDate, endDate);
                setStartDate(dates.start);
                setEndDate(dates.end);
              }}
              className="bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-gold/20 hover:border-gray-300 transition-all text-primary-black shadow-sm"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 self-end">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportPDF}
              className="flex items-center gap-2 px-6 py-4 border border-gray-200 rounded-2xl text-gray-500 hover:text-primary-black hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              <FileDown size={18} /> Exportar PDF
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-2xl !py-4 !px-8 shadow-xl shadow-primary-black/10 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Plus size={20} className="text-gold" />
              </div>
              <span className="uppercase text-xs font-black tracking-widest leading-none">Novo Lançamento</span>
            </motion.button>
          </div>
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
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">
              {formatCurrency(stats.current.gastosOperacionais)}
            </h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">Comparativo:</span>
               <span className="font-bold text-red-500">
                 {stats.comparisons.gastos} vs período anterior
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
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">
              {formatCurrency(stats.current.receitasComissao)}
            </h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">Comparativo:</span>
               <span className="font-bold text-emerald-500">
                 {stats.comparisons.receitas} vs período anterior
               </span>
            </div>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className={`${stats.current.lucroLiquido >= 0 ? 'bg-primary-black text-white' : 'bg-red-600 text-white'} p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group`}
         >
            <div className="flex items-center gap-3 text-gold mb-4 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><DollarSign size={18} /></div> Lucro Líquido
            </div>
            <h3 className="text-3xl font-bold tracking-tighter">
              {formatCurrency(stats.current.lucroLiquido)}
            </h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-white/40 font-medium uppercase tracking-widest">Saldo do mês:</span>
               <span className="font-bold text-gold">
                 {formatCurrency(stats.current.saldoMes)} ({stats.comparisons.lucro} vs anterior)
               </span>
            </div>
         </motion.div>
      </motion.div>

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
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-50 bg-gray-50/20">
          <button 
            onClick={() => setActiveTab('todos')}
            className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'todos' ? 'text-primary-black' : 'text-gray-400 hover:text-primary-black'}`}
          >
            Todos
            {activeTab === 'todos' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />}
          </button>
          <button 
            onClick={() => setActiveTab('entradas')}
            className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'entradas' ? 'text-emerald-600' : 'text-gray-400 hover:text-primary-black'}`}
          >
            Entradas
            {activeTab === 'entradas' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />}
          </button>
          <button 
            onClick={() => setActiveTab('saidas')}
            className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'saidas' ? 'text-red-500' : 'text-gray-400 hover:text-primary-black'}`}
          >
            Saídas
            {activeTab === 'saidas' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />}
          </button>
        </div>

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
                          {(() => {
                            const dateStr = getDateFromTransaction(item);
                            if (!dateStr) return '---';
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                            return dateStr;
                          })()}
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

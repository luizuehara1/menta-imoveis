import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy, where, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  FileDown
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
  formatCurrency 
} from '../../lib/utils';
import { FinanceRecord, Property, Lease } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EXPENSE_CATEGORIES = [
  'Anúncios', 'Comissão', 'Manutenção', 'Sistemas', 'Impostos', 'Escritório', 'Prestadores', 'Deslocamento', 'Outros'
];

const REVENUE_CATEGORIES = [
  'Comissão de venda', 'Comissão de locação', 'Aluguel recebido', 'Taxa administrativa', 'Serviço prestado', 'Entrada avulsa', 'Outros'
];

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto', 'Outro'];

export default function AdminFinance() {
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
    fetchData();
    fetchIntegrations();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const financeiroSnap = await getDocs(query(collection(db, 'financeiro'), orderBy('data', 'desc')));
      const legacyGastosSnap = await getDocs(query(collection(db, 'gastos'), orderBy('date', 'desc')));
      const legacyReceitasSnap = await getDocs(query(collection(db, 'receitas'), orderBy('date', 'desc')));

      const financeiroData = financeiroSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        sourceCollection: 'financeiro' 
      } as FinanceRecord & { sourceCollection: string }));
      
      const legacyGastos = legacyGastosSnap.docs.map(doc => {
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

      const legacyReceitas = legacyReceitasSnap.docs.map(doc => {
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

      const allData = [...financeiroData, ...legacyGastos, ...legacyReceitas].sort((a,b) => b.data.localeCompare(a.data));
      setRecords(allData);
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'financeiro'), payload);

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
        status: 'confirmado'
      });
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
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
    const today = new Date();
    const currentMonthStr = today.toISOString().slice(0, 7);

    const inflows = records.filter(r => r.tipo === 'entrada');
    const outflows = records.filter(r => r.tipo === 'saida');

    const totalInflow = inflows.reduce((acc, curr) => acc + curr.valor, 0);
    const totalOutflow = outflows.reduce((acc, curr) => acc + curr.valor, 0);

    const monthInflow = inflows.filter(r => r.data.startsWith(currentMonthStr)).reduce((acc, curr) => acc + curr.valor, 0);
    const monthOutflow = outflows.filter(r => r.data.startsWith(currentMonthStr)).reduce((acc, curr) => acc + curr.valor, 0);

    return {
      totalInflow,
      totalOutflow,
      balance: totalInflow - totalOutflow,
      monthInflow,
      monthOutflow,
      monthBalance: monthInflow - monthOutflow
    };
  }, [records]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setTextColor(201, 161, 82);
    doc.text('Relatório Financeiro', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 20, 30, { align: 'right' });
    
    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']],
      body: filteredRecords.map(r => [
        r.data,
        r.tipo === 'entrada' ? 'Entrada' : 'Saída',
        r.descricao,
        r.categoria,
        formatCurrency(r.valor)
      ]),
      headStyles: { fillColor: [30, 30, 30] },
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Resumo do Filtro', 20, finalY);
    
    const inflow = filteredRecords.filter(r => r.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0);
    const outflow = filteredRecords.filter(r => r.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0);
    
    doc.setFontSize(10);
    doc.text(`Total Entradas: ${formatCurrency(inflow)}`, 20, finalY + 10);
    doc.text(`Total Saídas: ${formatCurrency(outflow)}`, 20, finalY + 18);
    doc.text(`Saldo: ${formatCurrency(inflow - outflow)}`, 20, finalY + 26);
    
    doc.save('Relatorio_Financeiro.pdf');
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
        <div className="flex items-center gap-4">
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
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">{formatCurrency(stats.totalOutflow)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">Este mês:</span>
               <span className="font-bold text-red-500">{formatCurrency(stats.monthOutflow)}</span>
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
            <h3 className="text-3xl font-bold text-primary-black tracking-tighter">{formatCurrency(stats.totalInflow)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-gray-400 font-medium uppercase tracking-widest">Este mês:</span>
               <span className="font-bold text-emerald-500">{formatCurrency(stats.monthInflow)}</span>
            </div>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className={`${stats.balance >= 0 ? 'bg-primary-black text-white' : 'bg-red-600 text-white'} p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group`}
         >
            <div className="flex items-center gap-3 text-gold mb-4 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><DollarSign size={18} /></div> Lucro Líquido
            </div>
            <h3 className="text-3xl font-bold tracking-tighter">{formatCurrency(stats.balance)}</h3>
            <div className="mt-4 flex items-center justify-between text-[10px]">
               <span className="text-white/40 font-medium uppercase tracking-widest">Saldo do mês:</span>
               <span className="font-bold text-gold">{formatCurrency(stats.monthBalance)}</span>
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
                        value={formData.locacaoId}
                        onChange={e => {
                          const lease = leases.find(l => l.id === e.target.value);
                          setFormData({
                            ...formData, 
                            locacaoId: e.target.value,
                            imovelId: lease?.propertyId,
                            codigoImovel: lease?.propertyCode,
                            clienteOrigem: lease?.tenantName,
                            valor: lease?.valorTotalPagar || formData.valor
                          });
                        }}
                      >
                        <option value="">Nenhuma</option>
                        {leases.map(l => <option key={l.id} value={l.id}>{l.propertyCode} - {l.tenantName}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Vincular Imóvel (Opcional)</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all"
                        value={formData.imovelId}
                        onChange={e => {
                          const prop = properties.find(p => p.id === e.target.value);
                          setFormData({
                            ...formData, 
                            imovelId: e.target.value,
                            codigoImovel: prop?.code
                          });
                        }}
                      >
                        <option value="">Nenhum</option>
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
    </motion.div>
  );
}

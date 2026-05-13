import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy } from 'firebase/firestore';
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
  ArrowRight,
  Sparkles,
  PieChart as PieIcon,
  RefreshCcw,
  User,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

const EXPENSE_CATEGORIES = [
  'Anúncios', 'Portais imobiliários', 'Fotografia', 'Vídeo', 'Tráfego pago', 
  'Comissão', 'Escritório', 'Água', 'Luz', 'Internet', 'Telefone', 
  'Sistema', 'Marketing', 'Cartório', 'Transporte', 'Outros'
];

const REVENUE_TYPES = ['Venda', 'Locação', 'Comissão', 'Repasse', 'Outro'];

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState<'gastos' | 'receitas'>('gastos');
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    category: EXPENSE_CATEGORIES[0],
    type: REVENUE_TYPES[0],
    paymentMethod: 'Pix',
    responsible: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const coll = activeTab === 'gastos' ? 'gastos' : 'receitas';
      const q = query(collection(db, coll), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (activeTab === 'gastos') setExpenses(data);
      else setRevenues(data);
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const coll = activeTab === 'gastos' ? 'gastos' : 'receitas';
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, coll), payload);
      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        value: '',
        category: EXPENSE_CATEGORIES[0],
        type: REVENUE_TYPES[0],
        paymentMethod: 'Pix',
        responsible: '',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      try {
        const coll = activeTab === 'gastos' ? 'gastos' : 'receitas';
        await deleteDoc(doc(db, coll, id));
        fetchData();
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const totalGastos = expenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalReceitas = revenues.reduce((acc, curr) => acc + curr.value, 0);
  const balance = totalReceitas - totalGastos;

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
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Financial Oversight</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Fluxo de Caixa</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Monitore a saúde financeira, comissões e despesas operacionais da Menta.</p>
        </div>
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
      </motion.div>

      {/* Summary Cards */}
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group"
         >
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown size={120} />
            </div>
            <div className="flex items-center gap-3 text-red-500 mb-6 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><TrendingDown size={18} /></div> Gastos Operacionais
            </div>
            <h3 className="text-4xl font-bold text-primary-black tracking-tighter">R$ {totalGastos.toLocaleString('pt-BR')}</h3>
            <p className="text-gray-400 text-xs mt-3 font-medium uppercase tracking-widest">Saídas consolidadas</p>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group"
         >
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={120} />
            </div>
            <div className="flex items-center gap-3 text-emerald-500 mb-6 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp size={18} /></div> Receitas de Comissão
            </div>
            <h3 className="text-4xl font-bold text-primary-black tracking-tighter">R$ {totalReceitas.toLocaleString('pt-BR')}</h3>
            <p className="text-gray-400 text-xs mt-3 font-medium uppercase tracking-widest">Entradas brutas</p>
         </motion.div>

         <motion.div 
           variants={slideUp}
           whileHover={{ y: -5 }}
           className={`${balance >= 0 ? 'bg-primary-black text-white' : 'bg-red-600 text-white'} p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group`}
         >
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10">
              <DollarSign size={120} />
            </div>
            <div className="flex items-center gap-3 text-gold mb-6 font-black uppercase text-[10px] tracking-[0.2em]">
               <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><DollarSign size={18} /></div> Lucro Líquido
            </div>
            <h3 className="text-4xl font-bold tracking-tighter">R$ {balance.toLocaleString('pt-BR')}</h3>
            <p className="text-white/40 text-xs mt-3 font-medium uppercase tracking-widest">Saldo disponível</p>
         </motion.div>
      </motion.div>

      <motion.div 
        variants={slideUp}
        className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden"
      >
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-50 bg-gray-50/20">
          <button 
            onClick={() => setActiveTab('gastos')}
            className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'gastos' ? 'text-primary-black' : 'text-gray-400 hover:text-primary-black'}`}
          >
            Sairas (Gastos)
            {activeTab === 'gastos' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />}
          </button>
          <button 
            onClick={() => setActiveTab('receitas')}
            className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === 'receitas' ? 'text-primary-black' : 'text-gray-400 hover:text-primary-black'}`}
          >
            Entradas (Receitas)
            {activeTab === 'receitas' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />}
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
                  <th className="p-8 pl-12">Data</th>
                  <th className="p-8">Descrição</th>
                  <th className="p-8">Identificação</th>
                  <th className="p-8">Valor</th>
                  <th className="p-8 text-right pr-12">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeTab === 'gastos' ? expenses : revenues).map(item => (
                  <motion.tr 
                    key={item.id} 
                    variants={slideUp}
                    className="hover:bg-gray-50/40 transition-all group"
                  >
                    <td className="p-8 pl-12 text-sm text-gray-500 font-bold">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gold/5 flex items-center justify-center shrink-0">
                          <Calendar size={14} className="text-gold" />
                        </div>
                        {item.date}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-primary-black tracking-tight leading-none mb-1.5">{item.description}</span>
                        <div className="flex items-center gap-2">
                          <User size={10} className="text-gray-300" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-gray-300 leading-none">{item.responsible || 'Admin'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-transparent group-hover:border-gold/20 group-hover:bg-gold/5 group-hover:text-gold transition-all">
                        <Tag size={10} className="mr-2" /> {activeTab === 'gastos' ? item.category : item.type}
                      </span>
                    </td>
                    <td className="p-8">
                      <span className={`text-lg font-display font-bold tracking-tight ${activeTab === 'gastos' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {activeTab === 'gastos' ? '-' : '+'} R$ {item.value.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-8 pr-12 text-right">
                      <motion.button 
                        whileHover={{ scale: 1.1, color: '#ef4444' }}
                        onClick={() => handleDelete(item.id)}
                        className="p-4 text-gray-300 hover:bg-white hover:shadow-xl hover:shadow-black/5 rounded-2xl transition-all border border-transparent hover:border-gray-100"
                      >
                        <Trash2 size={20} />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Modal Lançamento */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.form 
              onSubmit={handleSave}
              {...scaleIn}
              className="bg-white max-w-3xl w-full rounded-[3rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-12 border-b border-gray-50 bg-primary-black text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full" />
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><Sparkles size={20} className="text-gold" /></div>
                    <h3 className="text-3xl font-display font-bold tracking-tight">Registrar Operação</h3>
                 </div>
                <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-sm">Insira os detalhes do novo lançamento financeiro para {activeTab === 'gastos' ? 'saída de caixa' : 'entrada de consultoria'}.</p>
              </div>

              <div className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Data Efetiva</label>
                    <input 
                      type="date" required 
                      className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all" 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Valor do Lancamento (R$)</label>
                    <input 
                      type="number" step="0.01" required 
                      className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-lg font-bold text-primary-black focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                      placeholder="0,00"
                      value={formData.value}
                      onChange={e => setFormData({...formData, value: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Descrição Detalhada</label>
                    <input 
                      type="text" required 
                      className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                      placeholder="Ex: Aquisição de Mídia no Google Ads"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Categoria / Classificação</label>
                    <div className="relative">
                      {activeTab === 'gastos' ? (
                        <select 
                          className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all"
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <select 
                          className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold appearance-none focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all"
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value})}
                        >
                          {REVENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                      <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Responsável pela Ação</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                      placeholder="Nome do Operador"
                      value={formData.responsible}
                      onChange={e => setFormData({...formData, responsible: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="p-10 bg-gray-50 flex items-center justify-end gap-6 border-t border-gray-100">
                 <button type="button" onClick={() => setShowModal(false)} className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] hover:text-primary-black transition-colors">Voltar</button>
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   type="submit" 
                   className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-[2rem] !py-6 !px-12 shadow-2xl shadow-primary-black/10 text-[10px] font-black uppercase tracking-[0.3em]"
                   disabled={loading}
                 >
                   {loading ? 'Processando...' : 'Efetivar Lançamento'}
                 </motion.button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

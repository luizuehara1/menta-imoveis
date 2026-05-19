import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Home, 
  DollarSign, 
  Calendar, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Link } from 'react-router-dom';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

const COLORS = ['#003030', '#E5BC53', '#2B2B2B', '#9ca3af', '#f87171'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalImoveis: 0,
    aVenda: 0,
    locacao: 0,
    visitasPendentes: 0,
    receitaMes: 0,
    gastosMes: 0,
  });

  const [dataCharts, setDataCharts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const safeGetDocs = async (collPath: string, q?: any) => {
          try {
            return await getDocs(q || collection(db, collPath));
          } catch (e) {
            console.error(`Error fetching ${collPath}:`, e);
            return { docs: [], size: 0 } as any;
          }
        };

        const imoveisSnap = await safeGetDocs('imoveis');
        const visitasSnap = await safeGetDocs('visitas', query(collection(db, 'visitas'), where('status', '==', 'Pendente')));
        const financeiroSnap = await safeGetDocs('financeiro');
        const legacyGastosSnap = await safeGetDocs('gastos');
        const legacyReceitasSnap = await safeGetDocs('receitas');

        const imoveis = imoveisSnap.docs.map((doc: any) => doc.data());
        
        // Aggregate finance data
        const allFinance: any[] = [];
        
        financeiroSnap.docs.forEach((doc: any) => {
          const d = doc.data();
          allFinance.push({
            tipo: d.tipo,
            valor: d.valor || 0,
            data: d.data || '',
            categoria: d.categoria || 'Outros'
          });
        });

        legacyGastosSnap.docs.forEach((doc: any) => {
          const d = doc.data();
          allFinance.push({
            tipo: 'saida',
            valor: d.value || 0,
            data: d.date || '',
            categoria: d.category || 'Outros'
          });
        });

        legacyReceitasSnap.docs.forEach((doc: any) => {
          const d = doc.data();
          allFinance.push({
            tipo: 'entrada',
            valor: d.value || 0,
            data: d.date || '',
            categoria: 'Vendas'
          });
        });

        // Group by month for chart
        const monthsMap: Record<string, { name: string, receita: number, gastos: number }> = {};
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Initialize last 5 months
        const today = new Date();
        for (let i = 4; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = d.toISOString().slice(0, 7);
          monthsMap[key] = { name: monthNames[d.getMonth()], receita: 0, gastos: 0 };
        }

        allFinance.forEach(f => {
          if (!f.data) return;
          const monthKey = f.data.slice(0, 7);
          if (monthsMap[monthKey]) {
            if (f.tipo === 'entrada') monthsMap[monthKey].receita += f.valor;
            else monthsMap[monthKey].gastos += f.valor;
          }
        });

        setDataCharts(Object.values(monthsMap));

        // Category data
        const catMap: Record<string, number> = {};
        allFinance.filter(f => f.tipo === 'saida').forEach(f => {
          catMap[f.categoria] = (catMap[f.categoria] || 0) + f.valor;
        });

        const catArray = Object.entries(catMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setCategoryData(catArray.length > 0 ? catArray : [{ name: 'Sem gastos', value: 0 }]);

        const currentMonthStr = today.toISOString().slice(0, 7);
        const monthInflow = allFinance.filter(r => r.tipo === 'entrada' && r.data.startsWith(currentMonthStr)).reduce((acc, curr) => acc + curr.valor, 0);
        const monthOutflow = allFinance.filter(r => r.tipo === 'saida' && r.data.startsWith(currentMonthStr)).reduce((acc, curr) => acc + curr.valor, 0);

        setStats({
          totalImoveis: imoveisSnap.size,
          aVenda: imoveis.filter((i: any) => i.businessType === 'Venda').length,
          locacao: imoveis.filter((i: any) => i.businessType === 'Locação').length,
          visitasPendentes: visitasSnap.size,
          receitaMes: monthInflow,
          gastosMes: monthOutflow,
        });
      } catch (error) {
        console.error("Error in fetchStats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, trend, trendLabel }: any) => (
    <motion.div 
      variants={slideUp}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="admin-card !p-0 flex flex-col relative overflow-hidden group shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:shadow-black/5 transition-all"
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-1000`} />
      
      <div className="p-10 relative z-10">
        <div className="flex items-center justify-between mb-10">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className={`w-16 h-16 rounded-3xl flex items-center justify-center ${color} shadow-2xl shadow-black/10`}
          >
            <Icon size={32} className="text-white" />
          </motion.div>
          {trend && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
            >
              {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>{Math.abs(trend)}%</span>
            </motion.div>
          )}
        </div>

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 pl-1 leading-none">{title}</p>
        <motion.h3 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-5xl font-display font-bold text-primary-black tracking-tighter leading-none"
        >
          {value}
        </motion.h3>
        {trendLabel && (
          <div className="flex items-center gap-2 mt-6 opacity-40 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-gold" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">vs {trendLabel}</p>
          </div>
        )}
      </div>
      <div className="h-1 bg-gray-50 group-hover:bg-gold transition-colors" />
    </motion.div>
  );

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-16 max-w-[1600px] mx-auto pb-20"
    >
      <motion.div 
        variants={slideUp}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-gray-100 pb-16"
      >
        <div>
          <div className="flex items-center gap-4 text-gold mb-6">
             <div className="w-12 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Relatório em Tempo Real</span>
          </div>
          <h1 className="text-6xl font-display font-bold text-primary-black tracking-tighter">
             Dashboard <span className="text-gold italic font-light">Menta</span>
          </h1>
          <p className="text-gray-400 mt-4 text-xl font-light max-w-2xl leading-relaxed">
            Bem-vindo ao centro de comando comercial. Analise leads, acompanhe receitas e gerencie seu portfólio de luxo com precisão.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-5 bg-white border border-gray-200 rounded-3xl text-gray-400 hover:text-primary-black hover:border-gold/30 hover:bg-gold/5 transition-all shadow-sm"
          >
            <Calendar size={24} />
          </motion.button>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/admin/imoveis/novo" className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-[1.5rem] shadow-2xl shadow-primary-black/10 !py-6 !px-10">
              <Plus size={22} />
              <span className="uppercase text-xs tracking-[0.2em] font-black">Novo Imóvel</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Primary Stats */}
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        <StatCard 
          title="Portfólio Ativo" 
          value={stats.totalImoveis} 
          icon={Home} 
          color="bg-primary-green" 
          trend={12}
          trendLabel="mês anterior"
        />
        <StatCard 
          title="Leads / Visitas" 
          value={stats.visitasPendentes} 
          icon={Calendar} 
          color="bg-gold" 
          trend={-5}
          trendLabel="esta semana"
        />
        <StatCard 
          title="Receita Mensal" 
          value={`R$ ${(stats.receitaMes / 1000).toFixed(0)}k`} 
          icon={DollarSign} 
          color="bg-emerald-600" 
          trend={24}
          trendLabel="faturamento"
        />
        <StatCard 
          title="Custos Operacionais" 
          value={`R$ ${(stats.gastosMes / 1000).toFixed(1)}k`} 
          icon={TrendingUp} 
          color="bg-red-500" 
          trend={8}
          trendLabel="saídas fixas"
        />
      </motion.div>

      {/* Performance Charts */}
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <motion.div 
          variants={slideUp}
          className="admin-card lg:col-span-2 shadow-2xl shadow-black/5 !p-12 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12">
            <div className="flex items-center gap-3 bg-gray-50/80 backdrop-blur-md p-2 rounded-2xl border border-gray-100">
               <button className="px-6 py-3 bg-white rounded-xl shadow-lg shadow-black/5 text-xs font-black tracking-widest text-primary-black uppercase">Mensal</button>
               <button className="px-6 py-3 text-xs font-black tracking-widest text-gray-400 hover:text-primary-black transition-colors uppercase">Anual</button>
            </div>
          </div>

          <div className="mb-16">
            <div className="flex items-center gap-3 text-emerald-500 mb-2">
              <TrendingUp size={20} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Crescimento</span>
            </div>
            <h3 className="text-3xl font-display font-bold text-primary-black tracking-tight">Performance Financeira</h3>
            <p className="text-gray-400 mt-2 font-medium">Fluxo de caixa consolidado das últimas 5 competências.</p>
          </div>

          <div className="h-[450px] -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataCharts} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#003030" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#003030" stopOpacity={0.4}/>
                   </linearGradient>
                   <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#E5BC53" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#E5BC53" stopOpacity={0.4}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 900 }} 
                  dy={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 900 }} 
                  tickFormatter={(val) => `R$ ${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(229, 188, 83, 0.05)' }}
                  contentStyle={{ 
                    borderRadius: '32px', 
                    border: 'none', 
                    boxShadow: '0 40px 60px -15px rgb(0 0 0 / 0.15)',
                    padding: '24px',
                    background: '#000000',
                    color: '#FFFFFF'
                  }}
                  itemStyle={{ color: '#FFFFFF', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Bar 
                  dataKey="receita" 
                  fill="url(#colorReceita)" 
                  radius={[12, 12, 0, 0]} 
                  barSize={36} 
                  name="Entradas" 
                />
                <Bar 
                  dataKey="gastos" 
                  fill="url(#colorGastos)" 
                  radius={[12, 12, 0, 0]} 
                  barSize={36} 
                  name="Saídas" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          variants={slideUp}
          className="admin-card overflow-hidden !p-0 shadow-2xl shadow-black/5 flex flex-col h-full"
        >
          <div className="p-12 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-display font-bold text-primary-black tracking-tight">Investimentos</h3>
              <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest">Alocação de Capital</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-gold" />
            </div>
          </div>
          
          <div className="p-12 flex-grow flex flex-col">
            <div className="h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={125}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pt-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Budget</p>
                 <p className="text-3xl font-display font-bold text-primary-black tracking-tighter">R$ 1.2k</p>
              </div>
            </div>

            <div className="mt-12 space-y-6">
              {categoryData.map((cat, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1) }}
                  className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-lg border-4 border-white shadow-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest group-hover:text-primary-black transition-colors">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-primary-black font-display tracking-tight">R$ {cat.value}</span>
                    <ArrowRight size={14} className="text-gold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        <motion.div variants={slideUp} className="admin-card !p-12 shadow-2xl shadow-black/5">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-display font-bold text-primary-black tracking-tight">Visitas em Destaque</h3>
            <Link to="/admin/visitas" className="text-[10px] font-black text-gold uppercase tracking-[0.3em] hover:text-primary-black transition-colors">Ver Todas</Link>
          </div>
          <div className="space-y-6">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-gray-50/50 rounded-3xl p-10 border-2 border-dashed border-gray-100 text-center flex flex-col items-center group cursor-pointer hover:border-gold/30 hover:bg-white transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-xl shadow-black/5 group-hover:scale-110 transition-transform">
                <Calendar size={32} className="text-gray-300 group-hover:text-gold transition-colors" />
              </div>
              <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-[240px]">Nenhum agendimento urgente identificado para o período.</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={slideUp} className="admin-card !p-12 shadow-2xl shadow-black/5">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-display font-bold text-primary-black tracking-tight">Mix de Portfólio</h3>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
              <Home size={20} className="text-gold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-primary-green/5 rounded-[2rem] border border-primary-green/10 flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-green flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform shadow-xl shadow-primary-green/20">
                <Users size={20} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-primary-green/40 uppercase tracking-widest block mb-1">Para Venda</span>
              <span className="text-4xl font-display font-bold text-primary-green tracking-tighter">{stats.aVenda}</span>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-gold/5 rounded-[2rem] border border-gold/10 flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center mb-4 group-hover:-rotate-12 transition-transform shadow-xl shadow-gold/20">
                <Home size={20} className="text-primary-black" />
              </div>
              <span className="text-[10px] font-black text-gold/40 uppercase tracking-widest block mb-1">Locação</span>
              <span className="text-4xl font-display font-bold text-gold tracking-tighter">{stats.locacao}</span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

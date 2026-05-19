import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Broker } from '../../types';
import { 
  Plus, 
  Trash2, 
  Phone, 
  Mail, 
  Instagram, 
  User, 
  X,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

export default function AdminBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBroker, setNewBroker] = useState<Partial<Broker>>({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    creci: '',
    photo: '',
    active: true
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'corretores'));
      setBrokers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broker)));
    } catch (error) {
      console.error("Error fetching brokers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'corretores'), {
        ...newBroker,
        createdAt: new Date()
      });
      setShowModal(false);
      setNewBroker({ name: '', phone: '', whatsapp: '', email: '', creci: '', photo: '', active: true });
      fetchBrokers();
    } catch (error) {
      console.error("Error adding broker:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente remover este corretor?")) {
      try {
        await deleteDoc(doc(db, 'corretores', id));
        fetchBrokers();
      } catch (error) {
        console.error("Error deleting broker:", error);
      }
    }
  };

  const toggleStatus = async (broker: Broker) => {
    try {
      await updateDoc(doc(db, 'corretores', broker.id!), {
        active: !broker.active
      });
      fetchBrokers();
    } catch (error) {
      console.error("Error updating status:", error);
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
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Team Management</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Time de Especialistas</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Gerencie o time de corretores e associados da Menta Negócios Imobiliários.</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ rotate: 180 }}
            onClick={fetchBrokers}
            className="p-5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gold transition-all shadow-sm"
          >
            <RefreshCcw size={20} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="btn-gold !rounded-2xl !py-4 !px-8 shadow-xl shadow-gold/10"
          >
            <Plus size={22} />
            <span className="uppercase text-xs font-black tracking-widest leading-none">Novo Corretor</span>
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            [1, 2, 3].map(i => (
              <motion.div key={i} {...fadeIn} className="bg-white rounded-[2.5rem] p-10 border border-gray-50 flex items-center gap-6 animate-pulse">
                <div className="w-20 h-20 rounded-3xl bg-gray-100" />
                <div className="space-y-2 flex-grow">
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-2 bg-gray-50 rounded w-3/4" />
                </div>
              </motion.div>
            ))
          ) : brokers.length === 0 ? (
            <motion.div 
              {...fadeIn}
              className="col-span-full py-32 text-center flex flex-col items-center"
            >
               <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                 <User size={40} className="text-gray-200" />
               </div>
               <p className="text-lg font-display font-medium text-gray-400">Nenhum corretor cadastrado.</p>
            </motion.div>
          ) : (
            brokers.map(broker => (
              <motion.div
                key={broker.id}
                variants={slideUp}
                layout
                whileHover={{ y: -8 }}
                className="bg-white rounded-[2.5rem] p-10 border border-gray-50 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:shadow-black/5 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                
                <div className="flex items-center gap-6 mb-8 relative z-10">
                  <div className="w-20 h-20 rounded-3xl bg-primary-black text-gold flex items-center justify-center font-display font-bold text-3xl shadow-xl shadow-black/10 group-hover:scale-110 transition-transform">
                    {broker.photo ? <img src={broker.photo} alt={broker.name} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-3xl" /> : broker.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-primary-black mb-1">{broker.name}</h3>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{broker.creci}</p>
                    <div className={`mt-3 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit border ${broker.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-400 border-red-100'}`}>
                      {broker.active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 pt-8 border-t border-gray-50">
                  <div className="flex items-center gap-4 text-gray-400 group-hover:text-primary-black transition-colors">
                    <Phone size={16} />
                    <span className="text-sm font-medium">{broker.phone}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 group-hover:text-primary-black transition-colors">
                    <Mail size={16} />
                    <span className="text-sm font-medium truncate">{broker.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleStatus(broker)}
                      className={`p-3 rounded-xl transition-all ${broker.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      title="Alterar Status"
                    >
                      <User size={18} />
                    </button>
                    {broker.instagram && (
                      <a 
                        href={`https://instagram.com/${broker.instagram.replace('@', '')}`}
                        target="_blank"
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-gold transition-all"
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDelete(broker.id!)}
                    className="p-3 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              {...scaleIn}
              className="bg-white max-w-2xl w-full rounded-[3rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-12 border-b border-gray-50 bg-primary-black text-white relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full" />
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><Sparkles size={20} className="text-gold" /></div>
                    <h3 className="text-3xl font-display font-bold tracking-tight">Novo Especialista</h3>
                 </div>
                 <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-sm">Cadastre um novo corretor para atuar no portfólio exclusivo.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-12 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all" 
                      value={newBroker.name} 
                      onChange={e => setNewBroker({...newBroker, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CRECI</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all" 
                      value={newBroker.creci} 
                      onChange={e => setNewBroker({...newBroker, creci: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail Corporativo</label>
                    <input 
                      required
                      type="email" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all" 
                      value={newBroker.email} 
                      onChange={e => setNewBroker({...newBroker, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Celular / WhatsApp</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all" 
                      value={newBroker.phone} 
                      onChange={e => setNewBroker({...newBroker, phone: e.target.value, whatsapp: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">URL da Foto (Perfil)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all" 
                      value={newBroker.photo} 
                      onChange={e => setNewBroker({...newBroker, photo: e.target.value})}
                      placeholder="https://exemplo.com/foto.jpg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-6 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Voltar</button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-2xl !py-5 !px-10 shadow-2xl shadow-primary-black/10 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cadastrar Especialista
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

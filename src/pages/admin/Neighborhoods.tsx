import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RefreshCcw, 
  MapPin, 
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

export default function AdminNeighborhoods() {
  const [bairros, setBairros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newBairro, setNewBairro] = useState({
    nome: '',
    cidade: '',
    estado: '',
    ativo: true
  });

  useEffect(() => {
    fetchBairros();
  }, []);

  const fetchBairros = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bairros'), orderBy('nome', 'asc'));
      const snap = await getDocs(q);
      setBairros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching neighborhoods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBairro.nome.trim()) return;

    try {
      await addDoc(collection(db, 'bairros'), {
        ...newBairro,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });
      setShowModal(false);
      setNewBairro({ nome: '', cidade: '', estado: '', ativo: true });
      fetchBairros();
    } catch (error) {
      console.error("Error adding neighborhood:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este bairro?")) {
      try {
        await deleteDoc(doc(db, 'bairros', id));
        fetchBairros();
      } catch (error) {
        console.error("Error deleting neighborhood:", error);
      }
    }
  };

  const toggleStatus = async (bairro: any) => {
    try {
      await updateDoc(doc(db, 'bairros', bairro.id), {
        ativo: !bairro.ativo,
        atualizadoEm: serverTimestamp()
      });
      fetchBairros();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredBairros = bairros.filter(b => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <motion.div variants={slideUp} className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Location Data</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Gestão de Bairros</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Gerencie os bairros cadastrados no sistema (pelo CEP ou manualmente).</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="btn-gold !rounded-2xl !py-4 !px-8 shadow-xl shadow-gold/10"
          >
            <Plus size={22} />
            <span className="uppercase text-xs font-black tracking-widest">Novo Bairro</span>
          </motion.button>
        </div>
      </motion.div>

      <div className="bg-white rounded-[3rem] border border-gray-50 p-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nome ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-16 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
            />
          </div>
          <button onClick={fetchBairros} className="p-4 bg-gray-50 text-gray-400 hover:text-gold rounded-2xl transition-all">
            <RefreshCcw size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
              ))
            ) : filteredBairros.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="text-gray-400 font-medium font-display">Nenhum bairro encontrado.</p>
              </div>
            ) : (
              filteredBairros.map(bairro => (
                <motion.div
                  key={bairro.id}
                  layout
                  {...fadeIn}
                  className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between group hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleStatus(bairro)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        bairro.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <MapPin size={18} />
                    </button>
                    <div>
                      <h3 className={`font-bold ${bairro.ativo ? 'text-primary-black' : 'text-gray-300'}`}>{bairro.nome}</h3>
                      <p className="text-xs text-gray-400">{bairro.cidade} - {bairro.estado}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(bairro.id)}
                    className="p-3 bg-white text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div {...fadeIn} className="absolute inset-0 bg-primary-black/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
            <motion.div {...scaleIn} className="bg-white max-w-lg w-full rounded-[3rem] shadow-2xl relative z-10 p-12">
              <h2 className="text-3xl font-display font-bold text-primary-black mb-8">Novo Bairro</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Nome</label>
                  <input 
                    required
                    type="text"
                    className="input-field"
                    value={newBairro.nome}
                    onChange={e => setNewBairro({...newBairro, nome: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Cidade</label>
                    <input 
                      required
                      type="text"
                      className="input-field"
                      value={newBairro.cidade}
                      onChange={e => setNewBairro({...newBairro, cidade: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mb-2 block">UF</label>
                    <input 
                      required
                      maxLength={2}
                      type="text"
                      className="input-field"
                      value={newBairro.estado}
                      onChange={e => setNewBairro({...newBairro, estado: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-6 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="btn-gold">Salvar Bairro</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

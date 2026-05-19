import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Check, X, RefreshCcw, Settings, Shield, Activity, Clock, FileText, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

const CONFIG_CATEGORIES = [
  { id: 'configLocacaoGarantias', label: 'Garantias Locatícias', icon: Shield, description: 'Configure os tipos de garantias aceitas.' },
  { id: 'configLocacaoStatus', label: 'Status da Locação', icon: Activity, description: 'Defina os status possíveis para os imóveis.' },
  { id: 'configLocacaoContratos', label: 'Prazos de Contrato', icon: Clock, description: 'Gerencie os tempos mínimos de contrato.' },
  { id: 'configLocacaoRegras', label: 'Regras e Comodidades', icon: FileText, description: 'Aceitação de pets, mobiliário, etc.' }
];

const DEFAULT_OPTIONS: Record<string, string[]> = {
  configLocacaoGarantias: ["Caução", "Fiador", "Seguro fiança", "Título de capitalização", "Depósito antecipado", "Sem garantia", "Outro"],
  configLocacaoStatus: ["Disponível", "Reservado", "Alugado", "Em negociação", "Aguardando documentação", "Contrato em andamento", "Contrato assinado", "Inadimplente", "Encerrado", "Cancelado", "Indisponível"],
  configLocacaoContratos: ["30 dias", "90 dias", "6 meses", "12 meses", "24 meses", "30 meses", "36 meses", "Prazo indeterminado", "Temporária", "Outro"],
  configLocacaoRegras: ["Aceita pet", "Não aceita pet", "Mobiliado", "Semi mobiliado", "Não mobiliado", "Aceita criança", "Não permite festas", "Não permite fumar", "Garagem inclusa", "Condomínio incluso", "Água inclusa", "Luz individual", "Internet inclusa", "IPTU incluso", "Taxa de lixo inclusa", "Seguro incêndio obrigatório", "Necessário comprovar renda", "Sujeito à análise cadastral", "Contrato com reconhecimento de firma", "Vistoria obrigatória", "Outro"]
};

function normalizeText(value: string | undefined): string {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function LeaseSettings() {
  const [activeCategory, setActiveCategory] = useState(CONFIG_CATEGORIES[0].id);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchItems(true);
  }, [activeCategory]);

  const fetchItems = async (checkAutoLoad = false) => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, activeCategory));
      const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      
      setItems(fetchedItems);

      // Task 6: Load automatically if empty
      if (checkAutoLoad && fetchedItems.length === 0) {
        await loadDefaults(activeCategory);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaults = async (categoryId: string) => {
    const defaults = DEFAULT_OPTIONS[categoryId];
    if (!defaults) return;

    setIsSubmitting(true);
    try {
      const currentSnap = await getDocs(collection(db, categoryId));
      const currentNamesNormalized = currentSnap.docs.map(doc => normalizeText(doc.data().nome));
      
      const batch = writeBatch(db);
      let count = 0;

      for (const name of defaults) {
        if (!currentNamesNormalized.includes(normalizeText(name))) {
          const newDocRef = doc(collection(db, categoryId));
          batch.set(newDocRef, {
            nome: name,
            ativo: true,
            padrao: true,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        setSuccessMessage('Opções padrão carregadas com sucesso.');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchItems();
      }
    } catch (error) {
      console.error("Error loading defaults:", error);
      alert("Erro ao carregar opções padrão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, activeCategory), {
        nome: newItemName.trim(),
        ativo: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });
      setNewItemName('');
      fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleItemStatus = async (item: any) => {
    try {
      await updateDoc(doc(db, activeCategory, item.id), {
        ativo: !item.ativo,
        atualizadoEm: serverTimestamp()
      });
      fetchItems();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Deseja realmente excluir este item?")) return;
    try {
      await deleteDoc(doc(db, activeCategory, id));
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10 pb-20"
    >
      <motion.div variants={slideUp} className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Lease Configuration</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Configurações de Locação</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Gerencie as opções exibidas no cadastro de imóveis para locação.</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 text-sm font-bold flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => fetchItems()}
            className="p-5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gold transition-all shadow-sm"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </motion.div>

      {/* Task 10: Call to Action / Info Card */}
      <motion.div variants={fadeIn} className="bg-gradient-to-br from-primary-black to-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <Settings size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="max-w-xl">
              <h2 className="text-2xl font-display font-bold mb-3 flex items-center gap-3">
                <Sparkles className="text-gold" />
                Opções Padrão de Locação
              </h2>
              <p className="text-gray-400 leading-relaxed">
                Carregue automaticamente as opções mais usadas para garantias, status, prazos e regras para agilizar o cadastro de locações e imóveis.
              </p>
           </div>
           <button
             onClick={() => loadDefaults(activeCategory)}
             disabled={isSubmitting}
             className="bg-gold text-primary-black px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-xl shadow-gold/20 flex items-center gap-3 disabled:opacity-50 whitespace-nowrap"
           >
             <RefreshCcw size={18} className={isSubmitting ? 'animate-spin' : ''} />
             Carregar Opções Padrão
           </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar categories */}
        <div className="space-y-3">
          {CONFIG_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left p-6 rounded-[2rem] transition-all flex items-start gap-5 group border ${
                  activeCategory === cat.id 
                  ? 'bg-primary-black text-white border-primary-black shadow-xl' 
                  : 'bg-white text-gray-400 border-gray-50 hover:border-gold/30'
                }`}
              >
                <div className={`p-4 rounded-2xl transition-colors ${
                  activeCategory === cat.id ? 'bg-gold text-primary-black' : 'bg-gray-50 text-gray-400 group-hover:text-gold'
                }`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-lg mb-1 ${activeCategory === cat.id ? 'text-white' : 'text-primary-black'}`}>
                    {cat.label}
                  </h3>
                  <p className={`text-xs ${activeCategory === cat.id ? 'text-gray-400' : 'text-gray-400'}`}>
                    {items.length} itens cadastrados
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Content area */}
        <div className="lg:col-span-3 space-y-8">
          <motion.div 
            key={activeCategory}
            {...fadeIn}
            className="bg-white rounded-[3rem] border border-gray-50 shadow-sm overflow-hidden"
          >
            <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-primary-black">
                  {CONFIG_CATEGORIES.find(c => c.id === activeCategory)?.label}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {CONFIG_CATEGORIES.find(c => c.id === activeCategory)?.description}
                </p>
              </div>
              
              <form onSubmit={addItem} className="flex items-center gap-3 w-full md:w-auto">
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Novo item..."
                  className="bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all flex-grow md:w-64"
                />
                <button 
                  type="submit" 
                  disabled={!newItemName.trim() || isSubmitting}
                  className="p-4 bg-primary-black text-white hover:bg-gold hover:text-primary-black rounded-2xl transition-all disabled:opacity-50"
                >
                  <Plus size={24} />
                </button>
              </form>
            </div>

            <div className="p-10">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-4">
                    <Settings size={32} className="text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-medium">Nenhum item cadastrado nesta categoria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {items.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-gray-50/10 hover:bg-white hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => toggleItemStatus(item)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              item.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Check size={18} />
                          </button>
                          <span className={`text-sm font-bold ${item.ativo ? 'text-primary-black' : 'text-gray-300'}`}>
                            {item.nome}
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="p-3 bg-white text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

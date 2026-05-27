import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  CheckSquare, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  Save,
  Undo2
} from 'lucide-react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

interface ContractClause {
  id: string;
  titulo: string;
  texto: string;
  tipo: 'todos' | 'proposta' | 'contraproposta' | 'aceite' | 'locacao_temporaria' | 'compra_venda' | 'locacao' | 'arras_confirmatorios';
  ordem: number;
  ativo: boolean;
  obrigatorio: boolean;
  atualizadoEm?: any;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  todos: 'Todos os Contratos',
  proposta: 'Proposta de Compra',
  contraproposta: 'Contraproposta',
  aceite: 'Aceite de Proposta',
  locacao_temporaria: 'Locação Temporária',
  compra_venda: 'Compra e Venda',
  locacao: 'Locatício Anual',
  arras_confirmatorios: 'Arras Confirmatórios'
};

export default function ContractClauses() {
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos_filtros');
  
  // Form State for Adding / Editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<ContractClause['tipo']>('todos');
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);
  const [obrigatorio, setObrigatorio] = useState(false);

  // Success/Error Toast notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchClauses();
  }, []);

  const fetchClauses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'clausulasContratos'), orderBy('ordem', 'asc'));
      const querySnapshot = await getDocs(q);
      const data: ContractClause[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as ContractClause);
      });
      setClauses(data);
    } catch (e: any) {
      console.error("Error fetching clauses:", e);
      showToast("Erro ao carregar cláusulas.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setTitulo('');
    setTexto('');
    setTipo('todos');
    setOrdem(clauses.length > 0 ? Math.max(...clauses.map(c => c.ordem)) + 1 : 1);
    setAtivo(true);
    setObrigatorio(false);
    setIsFormOpen(true);
  };

  const handleEdit = (clause: ContractClause) => {
    setEditingId(clause.id);
    setTitulo(clause.titulo);
    setTexto(clause.texto);
    setTipo(clause.tipo);
    setOrdem(clause.ordem);
    setAtivo(clause.ativo);
    setObrigatorio(clause.obrigatorio || false);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !texto.trim()) {
      showToast("Preencha o título e o texto da cláusula.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        texto: texto.trim(),
        tipo,
        ordem: Number(ordem) || 1,
        ativo,
        obrigatorio,
        atualizadoEm: serverTimestamp()
      };

      if (editingId) {
        // Edit existing
        await setDoc(doc(db, 'clausulasContratos', editingId), payload, { merge: true });
        showToast("Cláusula atualizada com sucesso!");
      } else {
        // Create new
        await addDoc(collection(db, 'clausulasContratos'), payload);
        showToast("Cláusula criada com sucesso!");
      }
      
      setIsFormOpen(false);
      fetchClauses();
    } catch (err) {
      console.error("Error saving clause:", err);
      showToast("Erro ao salvar cláusula.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta cláusula? Esta ação é irreversível.")) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'clausulasContratos', id));
      showToast("Cláusula excluída com sucesso!");
      fetchClauses();
    } catch (e) {
      console.error("Error deleting clause:", e);
      showToast("Erro ao excluir cláusula.", "error");
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (clause: ContractClause) => {
    try {
      await setDoc(doc(db, 'clausulasContratos', clause.id), { ativo: !clause.ativo }, { merge: true });
      showToast(`Cláusula ${!clause.ativo ? 'ativada' : 'desativada'} com sucesso.`);
      setClauses(prev => prev.map(c => c.id === clause.id ? { ...c, ativo: !c.ativo } : c));
    } catch (e) {
      console.error("Error toggling active status:", e);
      showToast("Erro ao alterar status da cláusula.", "error");
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clauses.length) return;

    const clauseA = clauses[index];
    const clauseB = clauses[targetIndex];

    try {
      // Swap order attributes
      const orderA = clauseA.ordem;
      const orderB = clauseB.ordem;

      // Update in memory first for quick UI updates
      setClauses(prev => {
        const copy = [...prev];
        copy[index] = { ...clauseA, ordem: orderB };
        copy[targetIndex] = { ...clauseB, ordem: orderA };
        return copy.sort((a, b) => a.ordem - b.ordem);
      });

      // Update in Firestore
      await setDoc(doc(db, 'clausulasContratos', clauseA.id), { ordem: orderB }, { merge: true });
      await setDoc(doc(db, 'clausulasContratos', clauseB.id), { ordem: orderA }, { merge: true });
      showToast("Ordenação atualizada!");
    } catch (e) {
      console.error("Error reordering clauses:", e);
      showToast("Erro ao reordenar cláusula.", "error");
    }
  };

  // Filter & Search Logic
  const filteredClauses = clauses.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          c.texto.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'todos_filtros' || c.tipo === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border ${
              notification.type === 'success' 
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800' 
                : 'bg-red-950 text-red-100 border-red-800'
            }`}
          >
            {notification.type === 'success' ? <Check className="text-emerald-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <motion.div 
        variants={slideUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Corporate Contracts</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight select-none">Cláusulas dos Contratos</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">
            Configure e gerencie cláusulas contratuais dinâmicas e obrigatórias e adicione termos personalizados para cada modelo de PDF gerado.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenNew}
          className="btn-gold shadow-2xl shadow-gold/20 flex items-center gap-2 self-start md:self-auto !rounded-full px-6 py-3"
        >
          <Plus size={20} />
          <span className="text-xs uppercase font-extrabold tracking-widest leading-none">Nova Cláusula</span>
        </motion.button>
      </motion.div>

      {/* Search and filter toolbar */}
      <motion.div 
        variants={slideUp} 
        className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar cláusulas por título ou termo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50/60 hover:bg-gray-50 border border-gray-100/80 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all text-primary-black"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider select-none shrink-0">
            <Filter size={14} className="text-gold" />
            <span>Filtrar por Tipo:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-gray-50/80 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value="todos_filtros">Exibir Todos os Modelos</option>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Main clauses listing view */}
      {loading && clauses.length === 0 ? (
        <div className="flex items-center justify-center p-20">
          <div className="relative flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Acessando Banco de dados...</p>
          </div>
        </div>
      ) : filteredClauses.length === 0 ? (
        <motion.div 
          variants={fadeIn}
          className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[2.5rem] p-16 text-center"
        >
          <div className="w-20 h-20 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-display font-bold text-primary-black mb-1">Nenhuma cláusula encontrada</h3>
          <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
            {search || filterType !== 'todos_filtros' 
              ? "Experimente mudar os parâmetros do filtro ou buscar por outro termo." 
              : "Clique em 'Nova Cláusula' para cadastrar regras de contrato, juros, garantias e termos personalizados."}
          </p>
          {search || filterType !== 'todos_filtros' ? (
            <button 
              onClick={() => { setSearch(''); setFilterType('todos_filtros'); }}
              className="mt-6 text-xs uppercase font-extrabold tracking-wider text-gold hover:text-primary-black transition-colors"
            >
              Limpar Filtros
            </button>
          ) : (
            <button 
              onClick={handleOpenNew}
              className="mt-6 px-6 py-3 bg-primary-black text-white hover:bg-gold hover:text-primary-black rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-500"
            >
              Adicionar primeira cláusula
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          variants={fadeIn}
          className="grid grid-cols-1 gap-6"
        >
          {filteredClauses.map((clause, index) => (
            <motion.div
              layoutId={`clause-card-${clause.id}`}
              key={clause.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/30 flex flex-col md:flex-row md:items-start justify-between gap-6 ${
                clause.ativo ? 'border-gray-100 shadow-md' : 'border-gray-100 opacity-60 bg-gray-50/10'
              }`}
            >
              <div className="space-y-4 flex-grow max-w-4xl text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gold bg-gold/5 px-3 py-1 border border-gold/10 rounded-full select-none">
                    Ordem {clause.ordem}
                  </span>
                  <span className="text-[10px] font-black uppercase text-gray-500 bg-gray-100 px-3 py-1 rounded-full select-none">
                    {CONTRACT_TYPE_LABELS[clause.tipo] || clause.tipo}
                  </span>
                  {clause.obrigatorio && (
                    <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 border border-rose-100 rounded-full select-none flex items-center gap-1">
                      <CheckSquare size={10} />
                      Obrigatória
                    </span>
                  )}
                  {!clause.ativo && (
                    <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-3 py-1 rounded-full select-none">
                      Desativada
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-display font-bold text-primary-black truncate">{clause.titulo}</h3>
                  <p className="text-gray-600 font-light leading-relaxed whitespace-pre-wrap text-sm mt-2 font-serif bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                    {clause.texto}
                  </p>
                </div>
              </div>

              {/* Controls and order adjusters */}
              <div className="flex sm:flex-row md:flex-col items-center justify-end gap-3 shrink-0 self-start md:self-auto w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-50 md:border-none">
                {/* Positional controls */}
                <div className="flex items-center gap-1 sm:mr-auto md:mr-0">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveOrder(index, 'up')}
                    className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors disabled:opacity-30 disabled:hover:bg-gray-50"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    disabled={index === filteredClauses.length - 1}
                    onClick={() => handleMoveOrder(index, 'down')}
                    className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors disabled:opacity-30 disabled:hover:bg-gray-50"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Edit, status and delete actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAtivo(clause)}
                    title={clause.ativo ? "Desativar Cláusula" : "Ativar Cláusula"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                      clause.ativo 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-150'
                    }`}
                  >
                    {clause.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(clause)}
                    className="w-10 h-10 bg-gold/5 hover:bg-gold/15 border border-gold/10 rounded-xl flex items-center justify-center text-gold transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(clause.id)}
                    className="w-10 h-10 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Slide-over or Popup Form Panel */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-primary-black"
            />

            {/* Form body */}
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden relative border border-gray-100"
            >
              <div className="bg-primary-black p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 blur-xl" />
                <h3 className="text-2xl font-display font-bold text-white relative z-10">
                  {editingId ? "Editar Cláusula" : "Nova Cláusula Contratual"}
                </h3>
                <p className="text-gray-400 text-sm mt-1 relative z-10 leading-relaxed">
                  Insira o cabeçalho descritivo e o texto normativo que será incorporado ao PDF do contrato.
                </p>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 text-left max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">Título / Assunto da Cláusula</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cláusula de Rescisão de Locação"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 text-sm text-primary-black"
                    />
                  </div>

                  {/* Contract Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">Modelo Alvo (Tipo de Contrato)</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 text-sm text-primary-black"
                    >
                      {Object.entries(CONTRACT_TYPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Order Selector */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">Ordem de Exibição / Sequência</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ordem}
                      onChange={(e) => setOrdem(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 text-sm text-primary-black"
                    />
                  </div>

                  {/* Text normativ */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">Teor / Texto Completo da Cláusula</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Insira as regras e textos oficiais da cláusula. Você pode usar descrições detalhadas e quebras de linha."
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 text-sm font-serif leading-relaxed text-primary-black-light"
                    />
                  </div>

                  {/* Switches */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 md:col-span-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="form-ativo"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        className="w-4 h-4 rounded text-gold focus:ring-goldAccent"
                      />
                      <label htmlFor="form-ativo" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
                        Ativa no Sistema (Disponível nos PDFs)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="form-obrigatorio"
                        checked={obrigatorio}
                        onChange={(e) => setObrigatorio(e.target.checked)}
                        className="w-4 h-4 rounded text-gold focus:ring-goldAccent"
                      />
                      <label htmlFor="form-obrigatorio" className="text-sm font-bold text-gray-650 cursor-pointer select-none flex items-center gap-1">
                        Cláusula Obrigatória (Inserida por Padrão)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="btn-gold !px-8 !py-3 flex items-center gap-2"
                  >
                    <Save size={16} />
                    <span className="text-xs font-black uppercase tracking-widest leading-none">Salvar Cláusula</span>
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

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Building, 
  Filter, 
  Home, 
  MapPin, 
  List, 
  Palette,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SiteConfig, OptionItem } from '../../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../../constants/defaultSettings';
import { motion, AnimatePresence } from 'motion/react';
import { slideUp, staggerContainer } from '../../constants/animations';

const SiteSettings = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [options, setOptions] = useState<Record<string, OptionItem[]>>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Site Config
      const configDoc = await getDoc(doc(db, 'configuracoes', 'site'));
      if (configDoc.exists()) {
        setSettings({ ...DEFAULT_SITE_CONFIG, ...configDoc.data() } as SiteConfig);
      }

      // Fetch Options
      const categories = [
        'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 'bairros', 
        'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
        'lazer', 'localizacoes'
      ];

      const optionsData: Record<string, OptionItem[]> = { ...DEFAULT_OPTIONS };
      
      for (const category of categories) {
        const optionDoc = await getDoc(doc(db, 'opcoes_imoveis', category));
        if (optionDoc.exists()) {
          optionsData[category] = optionDoc.data().itens || [];
        }
      }

      setOptions(optionsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'site'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const saveOptions = async (category: string, items: OptionItem[]) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'opcoes_imoveis', category), {
        itens: items,
        updatedAt: serverTimestamp()
      });
      setOptions(prev => ({ ...prev, [category]: items }));
      setMessage({ type: 'success', text: 'Opções atualizadas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving options:", error);
      setMessage({ type: 'error', text: 'Erro ao salvar opções.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'Página Inicial', icon: Home },
    { id: 'empresa', label: 'Dados da Empresa', icon: Building },
    { id: 'opcoes', label: 'Opções de Imóveis', icon: List },
    { id: 'localizacao', label: 'Cidades e Bairros', icon: MapPin },
    { id: 'filtros', label: 'Filtros e Características', icon: Filter },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">
            Configurações do Site
          </h1>
          <p className="text-gray-500 font-medium">Gerencie o conteúdo e a aparência do seu portal imobiliário.</p>
        </div>
        <button
          onClick={() => saveSettings()}
          disabled={saving}
          className="btn-gold flex items-center justify-center gap-2 !px-8 shadow-xl shadow-gold/20"
        >
          {saving ? <div className="animate-spin h-5 w-5 border-2 border-primary-black border-t-transparent rounded-full" /> : <Save size={20} />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="font-bold">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 p-3 shadow-sm sticky top-28">
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-4 py-4 px-6 rounded-2xl transition-all duration-300 font-bold text-sm ${
                      isActive 
                        ? 'bg-primary-black text-gold shadow-lg' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-primary-black'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm"
          >
            {activeTab === 'home' && (
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><Home size={20} /></div>
                    Hero da Home
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.titulo}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, titulo: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                      <input 
                        type="text" 
                        value={settings.hero.subtitulo}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, subtitulo: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto Botão Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.botaoPrincipalTexto}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, botaoPrincipalTexto: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Link Botão Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.botaoPrincipalLink}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, botaoPrincipalLink: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto Botão Secundário</label>
                      <input 
                        type="text" 
                        value={settings.hero.botaoSecundarioTexto}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, botaoSecundarioTexto: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Link Botão Secundário</label>
                      <input 
                        type="text" 
                        value={settings.hero.botaoSecundarioLink}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, botaoSecundarioLink: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">URL da Imagem de Fundo</label>
                      <input 
                        type="text" 
                        value={settings.hero.imagemFundoUrl}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, imagemFundoUrl: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <input 
                        type="checkbox" 
                        id="threejs"
                        checked={settings.hero.threeJsAtivo}
                        onChange={(e) => setSettings({ ...settings, hero: { ...settings.hero, threeJsAtivo: e.target.checked } })}
                        className="w-5 h-5 accent-gold cursor-pointer"
                      />
                      <label htmlFor="threejs" className="text-sm font-bold text-primary-black cursor-pointer">Ativar efeito Three.js no Hero</label>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-12">
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><List size={20} /></div>
                    Seções da Home
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-primary-black">Imóveis em Destaque</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
                        <input 
                          type="text" 
                          value={settings.secoes.tituloDestaques}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, tituloDestaques: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtítulo</label>
                        <input 
                          type="text" 
                          value={settings.secoes.subtituloDestaques}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, subtituloDestaques: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-primary-black">Institucional (Sobre)</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
                        <input 
                          type="text" 
                          value={settings.secoes.tituloSobre}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, tituloSobre: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Texto</label>
                        <textarea 
                          rows={4}
                          value={settings.secoes.textoSobre}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, textoSobre: e.target.value } })}
                          className="admin-input py-4 min-h-[120px]" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-primary-black">Corretores</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
                        <input 
                          type="text" 
                          value={settings.secoes.tituloCorretores}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, tituloCorretores: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subtítulo</label>
                        <input 
                          type="text" 
                          value={settings.secoes.subtituloCorretores}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, subtituloCorretores: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-primary-black">Contato</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
                        <input 
                          type="text" 
                          value={settings.secoes.tituloContato}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, tituloContato: e.target.value } })}
                          className="admin-input" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Texto</label>
                        <textarea 
                          rows={2}
                          value={settings.secoes.textoContato}
                          onChange={(e) => setSettings({ ...settings, secoes: { ...settings.secoes, textoContato: e.target.value } })}
                          className="admin-input py-4" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'empresa' && (
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><Building size={20} /></div>
                    Dados da Imobiliária
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome da Empresa</label>
                      <input 
                        type="text" 
                        value={settings.empresa.nome}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, nome: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">CRECI</label>
                      <input 
                        type="text" 
                        value={settings.empresa.creci}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, creci: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Endereço Completo</label>
                      <input 
                        type="text" 
                        value={settings.empresa.endereco}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, endereco: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Telefone Principal</label>
                      <input 
                        type="text" 
                        value={settings.empresa.telefone1}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, telefone1: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">WhatsApp Principal (Somente Números)</label>
                      <input 
                        type="text" 
                        value={settings.empresa.whatsapp}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, whatsapp: e.target.value.replace(/\D/g,'') } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">E-mail</label>
                      <input 
                        type="email" 
                        value={settings.empresa.email}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, email: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Instagram (@usuario)</label>
                      <input 
                        type="text" 
                        value={settings.empresa.instagram}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, instagram: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Google Maps Link</label>
                      <input 
                        type="text" 
                        value={settings.empresa.googleMapsUrl}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, googleMapsUrl: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">URL da Logo</label>
                      <input 
                        type="text" 
                        value={settings.empresa.logoUrl}
                        onChange={(e) => setSettings({ ...settings, empresa: { ...settings.empresa, logoUrl: e.target.value } })}
                        className="admin-input" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'opcoes' || activeTab === 'localizacao' || activeTab === 'filtros') && (
              <OptionsManager 
                type={activeTab} 
                options={options} 
                onSave={saveOptions} 
                saving={saving}
              />
            )}

            {activeTab === 'aparencia' && (
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><Palette size={20} /></div>
                    Aparência do Site
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cor Primária</label>
                      <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={settings.aparencia.corPrimaria}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corPrimaria: e.target.value } })}
                          className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 overflow-hidden" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corPrimaria}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corPrimaria: e.target.value } })}
                          className="admin-input flex-grow" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cor Secundária (Dourado)</label>
                      <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={settings.aparencia.corSecundaria}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corSecundaria: e.target.value } })}
                          className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 overflow-hidden" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corSecundaria}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corSecundaria: e.target.value } })}
                          className="admin-input flex-grow" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cor dos Botões</label>
                       <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={settings.aparencia.corBotoes}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corBotoes: e.target.value } })}
                          className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 overflow-hidden" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corBotoes}
                          onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, corBotoes: e.target.value } })}
                          className="admin-input flex-grow" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-12 border-t border-gray-100">
                    <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-[24px] border border-gray-100 hover:border-gold/30 transition-all group">
                       <input 
                        type="checkbox" 
                        id="animations"
                        checked={settings.aparencia.animacoesAtivas}
                        onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, animacoesAtivas: e.target.checked } })}
                        className="w-6 h-6 accent-gold cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="animations" className="font-bold text-primary-black cursor-pointer">Animações Ativas</label>
                        <span className="text-xs text-gray-400">Ativa efeitos de scroll e transição no site todo.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-[24px] border border-gray-100 hover:border-gold/30 transition-all group">
                       <input 
                        type="checkbox" 
                        id="globalThree"
                        checked={settings.aparencia.threeJsAtivo}
                        onChange={(e) => setSettings({ ...settings, aparencia: { ...settings.aparencia, threeJsAtivo: e.target.checked } })}
                        className="w-6 h-6 accent-gold cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="globalThree" className="font-bold text-primary-black cursor-pointer">Efeito Three.js Global</label>
                        <span className="text-xs text-gray-400">Controla os efeitos 3D nas páginas públicas.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const OptionsManager = ({ type, options, onSave, saving }: { 
  type: string, 
  options: Record<string, OptionItem[]>, 
  onSave: (cat: string, items: OptionItem[]) => void,
  saving: boolean
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OptionItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemCity, setNewItemCity] = useState('');

  const categoriesMap: Record<string, { label: string, key: string, items: OptionItem[] }[]> = {
    opcoes: [
      { label: 'Tipos de Imóvel', key: 'tiposImovel', items: options.tiposImovel || [] },
      { label: 'Tipos de Negócio', key: 'tiposNegocio', items: options.tiposNegocio || [] },
      { label: 'Status do Imóvel', key: 'statusImovel', items: options.statusImovel || [] },
      { label: 'Faixas de Preço', key: 'faixasPreco', items: options.faixasPreco || [] },
    ],
    localizacao: [
      { label: 'Cidades', key: 'cidades', items: options.cidades || [] },
      { label: 'Bairros', key: 'bairros', items: options.bairros || [] },
      { label: 'Tags de Localização (ex: Frente Mar)', key: 'localizacoes', items: options.localizacoes || [] },
    ],
    filtros: [
      { label: 'Características', key: 'caracteristicas', items: options.caracteristicas || [] },
      { label: 'Instalações', key: 'instalacoes', items: options.instalacoes || [] },
      { label: 'Acabamentos', key: 'acabamentos', items: options.acabamentos || [] },
      { label: 'Lazer', key: 'lazer', items: options.lazer || [] },
    ]
  };

  const currentCategories = categoriesMap[type] || [];

  useEffect(() => {
    if (currentCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(currentCategories[0].key);
    }
  }, [type, currentCategories]);

  const activeItems = options[selectedCategory] || [];

  const handleAddItem = () => {
    const newItem: OptionItem = {
      id: Math.random().toString(36).substr(2, 9),
      nome: newItemName,
      valor: selectedCategory === 'faixasPreco' ? Number(newItemValue) : newItemValue || newItemName.toLowerCase().replace(/\s/g, '-'),
      ativo: true,
      ordem: activeItems.length + 1,
      cidade: selectedCategory === 'bairros' ? newItemCity : undefined
    };

    const updated = [...activeItems, newItem];
    onSave(selectedCategory, updated);
    resetForm();
  };

  const handleEditItem = (item: OptionItem) => {
    setEditingItem(item);
    setNewItemName(item.nome);
    setNewItemValue(item.valor.toString());
    setNewItemCity(item.cidade || '');
    setIsModalOpen(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    const updated = activeItems.map(item => 
      item.id === editingItem.id 
        ? { 
            ...item, 
            nome: newItemName, 
            valor: selectedCategory === 'faixasPreco' ? Number(newItemValue) : newItemValue,
            cidade: selectedCategory === 'bairros' ? newItemCity : undefined
          } 
        : item
    );
    onSave(selectedCategory, updated);
    resetForm();
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Deseja realmente excluir esta opção?')) {
      const updated = activeItems.filter(item => item.id !== id);
      onSave(selectedCategory, updated);
    }
  };

  const toggleItem = (id: string) => {
    const updated = activeItems.map(item => 
      item.id === id ? { ...item, ativo: !item.ativo } : item
    );
    onSave(selectedCategory, updated);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...activeItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    
    // Update orders
    const finalItems = newItems.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    onSave(selectedCategory, finalItems);
  };

  const resetForm = () => {
    setNewItemName('');
    setNewItemValue('');
    setNewItemCity('');
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h3 className="text-2xl font-display font-bold text-primary-black mb-1">
             Gerenciar {currentCategories.find(c => c.key === selectedCategory)?.label}
           </h3>
           <p className="text-sm text-gray-400 font-medium tracking-tight">Personalize as opções que aparecem nos filtros e cadastros.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-gold flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Adicionar Opção
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
        {currentCategories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              selectedCategory === cat.key 
                ? 'bg-gold text-primary-black shadow-lg shadow-gold/20' 
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {activeItems.sort((a, b) => a.ordem - b.ordem).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${
              item.ativo ? 'bg-white border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'
            } hover:shadow-xl hover:scale-[1.01] group`}
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-300 hover:text-gold disabled:opacity-0 transition-colors"
                >
                  <ArrowUp size={14} />
                </button>
                <button 
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === activeItems.length - 1}
                  className="p-1 text-gray-300 hover:text-gold disabled:opacity-0 transition-colors"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div>
                <p className="font-bold text-primary-black flex items-center gap-3">
                  {item.nome}
                  {!item.ativo && <span className="bg-gray-200 text-gray-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Inativo</span>}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Valor: {item.valor}</p>
                  {item.cidade && <p className="text-[10px] text-gold font-black uppercase tracking-widest">• {item.cidade}</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={() => toggleItem(item.id)}
                className={`p-3 rounded-xl transition-all ${item.ativo ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}
                title={item.ativo ? 'Desativar' : 'Ativar'}
              >
                {item.ativo ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </button>
              <button 
                onClick={() => handleEditItem(item)}
                className="p-3 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all"
                title="Editar"
              >
                <Plus size={18} className="rotate-45" />
              </button>
              <button 
                onClick={() => handleDeleteItem(item.id)}
                className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}

        {activeItems.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Nenhuma opção cadastrada nesta categoria.</p>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={resetForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-2xl font-display font-bold text-primary-black">
                    {editingItem ? 'Editar Opção' : 'Adicionar Opção'}
                  </h4>
                  <button onClick={resetForm} className="text-gray-400 hover:text-primary-black transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome para Exibição</label>
                    <input 
                      type="text" 
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ex: Apartamento"
                      className="admin-input" 
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      {selectedCategory === 'faixasPreco' ? 'Valor numérico (Ex: 500000)' : 'Identificador / Valor'}
                    </label>
                    <input 
                      type={selectedCategory === 'faixasPreco' ? 'number' : 'text'} 
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(e.target.value)}
                      placeholder={selectedCategory === 'faixasPreco' ? '500000' : 'ex: apartamento'}
                      className="admin-input" 
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">* Valor usado internamente para filtros.</p>
                  </div>

                  {selectedCategory === 'bairros' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cidade Pertencente</label>
                      <select 
                        value={newItemCity}
                        onChange={(e) => setNewItemCity(e.target.value)}
                        className="admin-input"
                      >
                        <option value="">Selecione a cidade...</option>
                        {(options.cidades || []).map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={editingItem ? handleUpdateItem : handleAddItem}
                      disabled={!newItemName || saving}
                      className="flex-grow btn-gold flex items-center justify-center gap-2 shadow-xl shadow-gold/20"
                    >
                      {saving ? <div className="animate-spin h-5 w-5 border-2 border-primary-black border-t-transparent rounded-full" /> : <Save size={18} />}
                      {editingItem ? 'Salvar Edição' : 'Cadastrar Opção'}
                    </button>
                    <button 
                      onClick={resetForm}
                      className="px-8 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SiteSettings;

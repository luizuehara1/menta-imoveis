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
  Info,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SiteConfig, OptionItem } from '../../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../../constants/defaultSettings';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../../components/ui/SafeImage';
import { isValidImageUrl } from '../../lib/utils';

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
      // Fetch Site Config from NEW collection siteSettings/main
      const configDoc = await getDoc(doc(db, 'siteSettings', 'main'));
      if (configDoc.exists()) {
        setSettings({ ...DEFAULT_SITE_CONFIG, ...configDoc.data() } as SiteConfig);
      } else {
        // Create initial doc if doesn't exist
        await setDoc(doc(db, 'siteSettings', 'main'), {
          ...DEFAULT_SITE_CONFIG,
          updatedAt: serverTimestamp()
        });
        setSettings(DEFAULT_SITE_CONFIG);
      }

      // Fetch Options (keep existing logic)
      const categories = [
        'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 'bairros', 
        'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
        'lazer', 'localizacoes'
      ];

      const optionsData: Record<string, OptionItem[]> = { ...DEFAULT_OPTIONS };
      console.log("[Seeding] Checking options categories...");
      
      for (const category of categories) {
        if (category === 'bairros') continue; // Bairros is a collection, handled differently elsewhere
        
        try {
          const optionDoc = await getDoc(doc(db, 'opcoes_imoveis', category));
          if (optionDoc.exists()) {
            optionsData[category] = optionDoc.data().itens || [];
          } else {
            // Seed defaults if missing and we are in admin
            console.log(`[Seeding] Seeding missing category: ${category}`);
            const defaultItems = DEFAULT_OPTIONS[category] || [];
            await setDoc(doc(db, 'opcoes_imoveis', category), {
              itens: defaultItems,
              updatedAt: serverTimestamp()
            });
            optionsData[category] = defaultItems;
          }
        } catch (err) {
          console.error(`[Seeding] Error checking/seeding ${category}:`, err);
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
      await setDoc(doc(db, 'siteSettings', 'main'), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações. Verifique o Firebase.' });
    } finally {
      setSaving(false);
    }
  };

  const handleNestedChange = (category: keyof SiteConfig, field: string, value: any, subfield?: string) => {
    setSettings(prev => {
      const catData = prev[category] as any;
      if (subfield) {
        return {
          ...prev,
          [category]: {
            ...catData,
            [field]: {
              ...catData[field],
              [subfield]: value
            }
          }
        };
      }
      return {
        ...prev,
        [category]: {
          ...catData,
          [field]: value
        }
      };
    });
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
    { id: 'secoes', label: 'Seções do Site', icon: List },
    { id: 'empresa', label: 'Dados da Empresa', icon: Building },
    { id: 'opcoes', label: 'Opções de Imóveis', icon: List },
    { id: 'localizacao', label: 'Cidades e Bairros', icon: MapPin },
    { id: 'filtros', label: 'Filtros e Características', icon: Filter },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">
            Configurações do Site
          </h1>
          <p className="text-gray-500 font-medium">Personalize cada detalhe do seu portal de luxo.</p>
        </div>
        <button
          onClick={() => saveSettings()}
          disabled={saving}
          className="btn-gold flex items-center justify-center gap-2 !px-8 shadow-xl shadow-gold/20 sticky top-4 z-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
            className="space-y-8"
          >
            {activeTab === 'home' && (
              <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm space-y-10">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-8 flex items-center gap-3 underline decoration-gold/30 underline-offset-8 decoration-4">
                    Página Inicial / Hero da Home
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.tituloPrincipal}
                        onChange={(e) => handleNestedChange('hero', 'tituloPrincipal', e.target.value)}
                        className="admin-input focus-visible:ring-gold" 
                        placeholder="Ex: Menta Negócios Imobiliários"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                      <textarea 
                        value={settings.hero.subtitulo}
                        onChange={(e) => handleNestedChange('hero', 'subtitulo', e.target.value)}
                        className="admin-input h-24 py-4 resize-none" 
                        placeholder="Breve descrição que aparece abaixo do título"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Badge (Texto Curto Superior)</label>
                      <input 
                        type="text" 
                        value={settings.hero.heroBadge}
                        onChange={(e) => handleNestedChange('hero', 'heroBadge', e.target.value)}
                        className="admin-input" 
                        placeholder="Ex: LUXO & EXCLUSIVIDADE EM SANTA CATARINA"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto Botão Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.textoBotaoPrincipal}
                        onChange={(e) => handleNestedChange('hero', 'textoBotaoPrincipal', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Link Botão Principal</label>
                      <input 
                        type="text" 
                        value={settings.hero.linkBotaoPrincipal}
                        onChange={(e) => handleNestedChange('hero', 'linkBotaoPrincipal', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto Botão Secundário</label>
                      <input 
                        type="text" 
                        value={settings.hero.textoBotaoSecundario}
                        onChange={(e) => handleNestedChange('hero', 'textoBotaoSecundario', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Link Botão Secundário</label>
                      <input 
                        type="text" 
                        value={settings.hero.linkBotaoSecundario}
                        onChange={(e) => handleNestedChange('hero', 'linkBotaoSecundario', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">URL da Imagem de Fundo</label>
                        <input 
                          type="url" 
                          value={settings.hero.imagemFundoUrl}
                          onChange={(e) => handleNestedChange('hero', 'imagemFundoUrl', e.target.value)}
                          className={`admin-input ${settings.hero.imagemFundoUrl && !isValidImageUrl(settings.hero.imagemFundoUrl) ? 'border-red-300' : ''}`} 
                          placeholder="https://exemplo.com/imagem.jpg"
                        />
                        {settings.hero.imagemFundoUrl && !isValidImageUrl(settings.hero.imagemFundoUrl) && (
                          <p className="text-[10px] text-red-500 font-bold ml-1">URL inválida. Deve começar com https://</p>
                        )}
                      </div>
                      
                      {settings.hero.imagemFundoUrl && (
                        <div className="relative group rounded-2xl overflow-hidden border border-gray-200 aspect-video max-w-md">
                          <SafeImage 
                            src={settings.hero.imagemFundoUrl} 
                            alt="Preview Hero" 
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">Preview do Hero</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-gold/30 transition-all cursor-pointer group" onClick={() => handleNestedChange('hero', 'ativarThreeJs', !settings.hero.ativarThreeJs)}>
                      <input 
                        type="checkbox" 
                        id="threejs"
                        checked={settings.hero.ativarThreeJs}
                        onChange={(e) => handleNestedChange('hero', 'ativarThreeJs', e.target.checked)}
                        className="w-6 h-6 accent-gold cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <label htmlFor="threejs" className="text-sm font-bold text-primary-black cursor-pointer">Ativar efeito Three.js no Hero</label>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Efeitos visuais 3D luxuosos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'secoes' && (
              <div className="space-y-8">
                {/* Imóveis Destaque */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm">
                  <h3 className="text-xl font-bold text-primary-black mb-8 flex items-center gap-3">
                    <Sparkles className="text-gold" size={24} />
                    Seção: Imóveis em Destaque
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                      <input 
                        type="text" 
                        value={settings.secoes.imoveisDestaque.titulo}
                        onChange={(e) => handleNestedChange('secoes', 'imoveisDestaque', e.target.value, 'titulo')}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                      <input 
                        type="text" 
                        value={settings.secoes.imoveisDestaque.subtitulo}
                        onChange={(e) => handleNestedChange('secoes', 'imoveisDestaque', e.target.value, 'subtitulo')}
                        className="admin-input" 
                      />
                    </div>
                  </div>
                </div>

                {/* Institucional / Sobre */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm">
                  <h3 className="text-xl font-bold text-primary-black mb-8 flex items-center gap-3">
                    <Building className="text-gold" size={24} />
                    Seção: Institucional / Sobre
                  </h3>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                      <input 
                        type="text" 
                        value={settings.secoes.sobre.titulo}
                        onChange={(e) => handleNestedChange('secoes', 'sobre', e.target.value, 'titulo')}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto</label>
                      <textarea 
                        value={settings.secoes.sobre.texto}
                        onChange={(e) => handleNestedChange('secoes', 'sobre', e.target.value, 'texto')}
                        className="admin-input h-40 py-4 resize-none" 
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Imagem URL (Opcional)</label>
                        <input 
                          type="url" 
                          value={settings.secoes.sobre.imagemUrl}
                          onChange={(e) => handleNestedChange('secoes', 'sobre', e.target.value, 'imagemUrl')}
                          className="admin-input" 
                        />
                      </div>
                      {settings.secoes.sobre.imagemUrl && (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 h-40 max-w-xs">
                          <SafeImage 
                            src={settings.secoes.sobre.imagemUrl} 
                            alt="Preview Sobre" 
                            className="w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corretores */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm">
                  <h3 className="text-xl font-bold text-primary-black mb-8 flex items-center gap-3">
                    <Globe className="text-gold" size={24} />
                    Seção: Corretores
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                      <input 
                        type="text" 
                        value={settings.secoes.corretores.titulo}
                        onChange={(e) => handleNestedChange('secoes', 'corretores', e.target.value, 'titulo')}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo</label>
                      <input 
                        type="text" 
                        value={settings.secoes.corretores.subtitulo}
                        onChange={(e) => handleNestedChange('secoes', 'corretores', e.target.value, 'subtitulo')}
                        className="admin-input" 
                      />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm">
                  <h3 className="text-xl font-bold text-primary-black mb-8 flex items-center gap-3">
                    <MessageCircle className="text-gold" size={24} />
                    Seção: Contato
                  </h3>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                      <input 
                        type="text" 
                        value={settings.secoes.contato.titulo}
                        onChange={(e) => handleNestedChange('secoes', 'contato', e.target.value, 'titulo')}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto de Apoio</label>
                      <textarea 
                        value={settings.secoes.contato.texto}
                        onChange={(e) => handleNestedChange('secoes', 'contato', e.target.value, 'texto')}
                        className="admin-input h-24 py-4 resize-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'empresa' && (
              <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm space-y-12">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-10 flex items-center gap-3 underline decoration-gold/30 underline-offset-8 decoration-4">
                    Dados da Empresa para Contratos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Nome Fantasia</label>
                      <input 
                        type="text" 
                        value={settings.empresa.nome}
                        onChange={(e) => handleNestedChange('empresa', 'nome', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Razão Social</label>
                      <input 
                        type="text" 
                        value={settings.empresa.razaoSocial}
                        onChange={(e) => handleNestedChange('empresa', 'razaoSocial', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">CNPJ</label>
                      <input 
                        type="text" 
                        value={settings.empresa.cnpj}
                        onChange={(e) => handleNestedChange('empresa', 'cnpj', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">CRECI PJ</label>
                      <input 
                        type="text" 
                        value={settings.empresa.creciPj}
                        onChange={(e) => handleNestedChange('empresa', 'creciPj', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">CRECI Responsável</label>
                      <input 
                        type="text" 
                        value={settings.empresa.creciResponsavel}
                        onChange={(e) => handleNestedChange('empresa', 'creciResponsavel', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Telefone</label>
                      <input 
                        type="text" 
                        value={settings.empresa.telefone}
                        onChange={(e) => handleNestedChange('empresa', 'telefone', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={settings.empresa.whatsapp}
                        onChange={(e) => handleNestedChange('empresa', 'whatsapp', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">E-mail</label>
                      <input 
                        type="email" 
                        value={settings.empresa.email}
                        onChange={(e) => handleNestedChange('empresa', 'email', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Site</label>
                      <input 
                        type="text" 
                        value={settings.empresa.site}
                        onChange={(e) => handleNestedChange('empresa', 'site', e.target.value)}
                        className="admin-input" 
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Endereço Completo</label>
                      <input 
                        type="text" 
                        value={settings.empresa.endereco}
                        onChange={(e) => handleNestedChange('empresa', 'endereco', e.target.value)}
                        className="admin-input" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Bairro</label>
                      <input 
                        type="text" 
                        value={settings.empresa.bairro}
                        onChange={(e) => handleNestedChange('empresa', 'bairro', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cidade</label>
                      <input 
                        type="text" 
                        value={settings.empresa.cidade}
                        onChange={(e) => handleNestedChange('empresa', 'cidade', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Estado</label>
                      <input 
                        type="text" 
                        value={settings.empresa.estado}
                        onChange={(e) => handleNestedChange('empresa', 'estado', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">CEP</label>
                      <input 
                        type="text" 
                        value={settings.empresa.cep}
                        onChange={(e) => handleNestedChange('empresa', 'cep', e.target.value)}
                        className="admin-input" 
                      />
                    </div>

                    <div className="md:col-span-1 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Responsável Legal</label>
                      <input 
                        type="text" 
                        value={settings.empresa.responsavelLegal}
                        onChange={(e) => handleNestedChange('empresa', 'responsavelLegal', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">CPF Responsável</label>
                      <input 
                        type="text" 
                        value={settings.empresa.responsavelCpf}
                        onChange={(e) => handleNestedChange('empresa', 'responsavelCpf', e.target.value)}
                        className="admin-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cargo</label>
                      <input 
                        type="text" 
                        value={settings.empresa.responsavelCargo}
                        onChange={(e) => handleNestedChange('empresa', 'responsavelCargo', e.target.value)}
                        className="admin-input" 
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 space-y-4 pt-6 border-t border-gray-100">
                      <h4 className="text-sm font-bold text-gold uppercase tracking-widest">Identidade Visual no Contrato</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">URL da Logo do Cabeçalho</label>
                          <input 
                            type="text" 
                            value={settings.empresa.logoCabecalhoUrl}
                            onChange={(e) => handleNestedChange('empresa', 'logoCabecalhoUrl', e.target.value)}
                            className="admin-input" 
                          />
                          {settings.empresa.logoCabecalhoUrl && (
                            <div className="mt-2 h-20 w-fit p-2 bg-gray-100 rounded-lg flex items-center justify-center">
                              <img src={settings.empresa.logoCabecalhoUrl} alt="Logo Cabeçalho" className="h-full w-auto object-contain" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">URL da Marca d'água</label>
                          <input 
                            type="text" 
                            value={settings.empresa.marcaDaguaUrl}
                            onChange={(e) => handleNestedChange('empresa', 'marcaDaguaUrl', e.target.value)}
                            className="admin-input" 
                          />
                          {settings.empresa.marcaDaguaUrl && (
                            <div className="mt-2 h-20 w-fit p-2 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                              <img src={settings.empresa.marcaDaguaUrl} alt="Marca D'água" className="h-full w-auto object-contain opacity-20" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Texto de Rodapé dos Contratos</label>
                      <textarea 
                        value={settings.empresa.rodapeContratos}
                        onChange={(e) => handleNestedChange('empresa', 'rodapeContratos', e.target.value)}
                        className="admin-input h-24 py-4 resize-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'aparencia' && (
              <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm space-y-12">
                <div>
                  <h3 className="text-2xl font-display font-bold text-primary-black mb-10 flex items-center gap-3 underline decoration-gold/30 underline-offset-8 decoration-4">
                    Aparência do Site
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-8">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cor Principal</label>
                      <div className="flex gap-4">
                        <input 
                          type="color" 
                          value={settings.aparencia.corPrincipal}
                          onChange={(e) => handleNestedChange('aparencia', 'corPrincipal', e.target.value)}
                          className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corPrincipal}
                          onChange={(e) => handleNestedChange('aparencia', 'corPrincipal', e.target.value)}
                          className="admin-input flex-grow text-center font-mono" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cor Secundária (Dourado)</label>
                      <div className="flex gap-4">
                        <input 
                          type="color" 
                          value={settings.aparencia.corSecundaria}
                          onChange={(e) => handleNestedChange('aparencia', 'corSecundaria', e.target.value)}
                          className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corSecundaria}
                          onChange={(e) => handleNestedChange('aparencia', 'corSecundaria', e.target.value)}
                          className="admin-input flex-grow text-center font-mono" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cor de Fundo</label>
                       <div className="flex gap-4">
                        <input 
                          type="color" 
                          value={settings.aparencia.corFundo}
                          onChange={(e) => handleNestedChange('aparencia', 'corFundo', e.target.value)}
                          className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corFundo}
                          onChange={(e) => handleNestedChange('aparencia', 'corFundo', e.target.value)}
                          className="admin-input flex-grow text-center font-mono" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Cor dos Textos</label>
                       <div className="flex gap-4">
                        <input 
                          type="color" 
                          value={settings.aparencia.corTexto}
                          onChange={(e) => handleNestedChange('aparencia', 'corTexto', e.target.value)}
                          className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0" 
                        />
                        <input 
                          type="text" 
                          value={settings.aparencia.corTexto}
                          onChange={(e) => handleNestedChange('aparencia', 'corTexto', e.target.value)}
                          className="admin-input flex-grow text-center font-mono" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-12 border-t border-gray-100">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Logo URL</label>
                        <input 
                          type="url" 
                          value={settings.aparencia.logoUrl}
                          onChange={(e) => handleNestedChange('aparencia', 'logoUrl', e.target.value)}
                          className="admin-input" 
                          placeholder="https://exemplo.com/logo.png"
                        />
                      </div>
                      {settings.aparencia.logoUrl && (
                        <div className="p-4 bg-primary-black rounded-2xl border border-gray-800 flex items-center justify-center h-24">
                          <SafeImage 
                            src={settings.aparencia.logoUrl} 
                            alt="Logo Preview" 
                            className="h-full w-auto object-contain brightness-0 invert"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Logo Navbar (Caixa Branca)</label>
                        <input 
                          type="url" 
                          value={settings.aparencia.logoNavbarUrl}
                          onChange={(e) => handleNestedChange('aparencia', 'logoNavbarUrl', e.target.value)}
                          className="admin-input" 
                          placeholder="https://exemplo.com/logo-navbar.png"
                        />
                      </div>
                      {settings.aparencia.logoNavbarUrl && (
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-24">
                          <SafeImage 
                            src={settings.aparencia.logoNavbarUrl} 
                            alt="Navbar Logo Preview" 
                            className="h-full w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Logo Footer (Caixa Branca)</label>
                        <input 
                          type="url" 
                          value={settings.aparencia.logoFooterUrl}
                          onChange={(e) => handleNestedChange('aparencia', 'logoFooterUrl', e.target.value)}
                          className="admin-input" 
                          placeholder="https://exemplo.com/logo-footer.png"
                        />
                      </div>
                      {settings.aparencia.logoFooterUrl && (
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-24">
                          <SafeImage 
                            src={settings.aparencia.logoFooterUrl} 
                            alt="Footer Logo Preview" 
                            className="h-full w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Logo Favicon URL</label>
                        <input 
                          type="url" 
                          value={settings.aparencia.faviconUrl}
                          onChange={(e) => handleNestedChange('aparencia', 'faviconUrl', e.target.value)}
                          className="admin-input" 
                          placeholder="https://exemplo.com/favicon.ico"
                        />
                      </div>
                      {settings.aparencia.faviconUrl && (
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-center h-24">
                          <SafeImage 
                            src={settings.aparencia.faviconUrl} 
                            alt="Favicon Preview" 
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'opcoes' || activeTab === 'localizacao' || activeTab === 'filtros') && (
              <div className="bg-white rounded-[32px] border border-gray-100 p-8 md:p-12 shadow-sm">
                <OptionsManager 
                  type={activeTab} 
                  options={options} 
                  onSave={saveOptions} 
                  saving={saving}
                />
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
  const [newItemTipo, setNewItemTipo] = useState('');

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
      cidade: selectedCategory === 'bairros' ? newItemCity : undefined,
      tipo: selectedCategory === 'faixasPreco' ? newItemTipo : undefined
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
    setNewItemTipo(item.tipo || '');
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
            cidade: selectedCategory === 'bairros' ? newItemCity : undefined,
            tipo: selectedCategory === 'faixasPreco' ? newItemTipo : undefined
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
    setNewItemTipo('');
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
                  {item.tipo && <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">• Tipo: {item.tipo}</p>}
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

                  {selectedCategory === 'faixasPreco' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tipo de Valor</label>
                      <select 
                        value={newItemTipo}
                        onChange={(e) => setNewItemTipo(e.target.value)}
                        className="admin-input"
                      >
                        <option value="">Selecione o tipo (opcional)</option>
                        <option value="venda">Venda</option>
                        <option value="locacao">Locação</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1 italic">* Ajuda a filtrar opções na busca da home.</p>
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

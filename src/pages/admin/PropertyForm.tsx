import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  db, 
  auth 
} from '../../lib/firebase';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  X, 
  Check, 
  Info, 
  MapPin, 
  User, 
  Grid, 
  Image as ImageIcon,
  Sparkles,
  Layout,
  Hammer,
  Waves,
  MessageCircle,
  CheckCircle,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { useOptions } from '../../hooks/useSettings';
import { Property, Owner } from '../../types';

const TABS = [
  { id: 'bash', label: 'Dados Básicos', icon: Info },
  { id: 'loc', label: 'Localização', icon: MapPin },
  { id: 'prop', label: 'Proprietário', icon: User },
  { id: 'chars', label: 'Características', icon: Grid },
  { id: 'inst', label: 'Instalação', icon: Layout },
  { id: 'fin', label: 'Acabamento', icon: Hammer },
  { id: 'leis', label: 'Lazer', icon: Waves },
  { id: 'img', label: 'Imagens', icon: ImageIcon },
  { id: 'pub', label: 'Publicação', icon: Sparkles },
];

export default function AdminPropertyForm() {
  const { options, loading: optionsLoading } = useOptions();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bash');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState('');

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<any>({
    defaultValues: {
      businessType: 'Venda',
      propertyType: 'Apartamento',
      status: 'Disponível',
      financing: false,
      exchange: false,
      documentationOk: true,
      furnished: false,
      rented: false,
      kitchen: true,
      destaque: false,
      publicado: false,
      caracteristicas: [],
      instalacoes: [],
      acabamentos: [],
      lazer: [],
      locationTags: [],
    }
  });

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const propertyDoc = await getDoc(doc(db, 'imoveis', id));
          if (propertyDoc.exists()) {
            const data = propertyDoc.data();
            Object.keys(data).forEach(key => {
              setValue(key, data[key]);
            });
            setImages(data.images || []);
            setMainImage(data.mainImage || '');
            
            // Fetch owner info
            const ownerDoc = await getDoc(doc(db, 'imoveis', id, 'privado', 'proprietario'));
            if (ownerDoc.exists()) {
              const ownerData = ownerDoc.data();
              setValue('ownerName', ownerData.name);
              setValue('ownerPhone', ownerData.phone);
              setValue('ownerEmail', ownerData.email);
              setValue('ownerNotes', ownerData.notes);
            }
          }
        } catch (error) {
          console.error("Error fetching property:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProperty();
    }
  }, [id, setValue]);

  const addImageUrl = () => {
    if (!imageUrl) return;
    const newImages = [...images, imageUrl];
    setImages(newImages);
    if (!mainImage) setMainImage(imageUrl);
    setImageUrl('');
  };

  const removeImage = (url: string) => {
    setImages(images.filter(img => img !== url));
    if (mainImage === url) setMainImage(images[0] || '');
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const propertyData: any = {
        ...data,
        images,
        mainImage,
        updatedAt: serverTimestamp(),
      };
      
      // Separate owner info
      const ownerData = {
        name: data.ownerName || '',
        phone: data.ownerPhone || '',
        email: data.ownerEmail || '',
        notes: data.ownerNotes || '',
      };
      
      delete propertyData.ownerName;
      delete propertyData.ownerPhone;
      delete propertyData.ownerEmail;
      delete propertyData.ownerNotes;

      let propertyId = id;

      if (id) {
        await updateDoc(doc(db, 'imoveis', id), propertyData);
      } else {
        propertyData.createdAt = serverTimestamp();
        propertyData.createdBy = auth.currentUser?.uid;
        const newDoc = await addDoc(collection(db, 'imoveis'), propertyData);
        propertyId = newDoc.id;
      }

      // Save owner info to subcollection
      if (propertyId) {
        await setDoc(doc(db, 'imoveis', propertyId, 'privado', 'proprietario'), ownerData);
      }

      navigate('/admin/imoveis');
    } catch (error) {
      console.error("Save error:", error);
      alert("Erro ao salvar imóvel.");
    } finally {
      setLoading(false);
    }
  };

  const selectAll = (field: string, category: string) => {
    const allValues = (options[category] || []).map(o => o.nome);
    setValue(field, allValues);
  };

  const clearAll = (field: string) => {
    setValue(field, []);
  };

  const renderTabContent = () => {
    if (optionsLoading) return <div className="py-20 text-center animate-pulse">Carregando opções dinâmicas...</div>;

    switch (activeTab) {
      case 'bash':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Código do Imóvel</label>
              <input {...register('code', { required: true })} className="input-field" placeholder="Ex: AP001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Tipo de Negócio</label>
              <select {...register('businessType')} className="input-field">
                {(options.tiposNegocio || []).filter(o => o.ativo).map(o => (
                  <option key={o.id} value={o.nome}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Tipo de Imóvel</label>
              <select {...register('propertyType')} className="input-field">
                {(options.tiposImovel || []).filter(o => o.ativo).map(o => (
                  <option key={o.id} value={o.nome}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Status</label>
              <select {...register('status')} className="input-field">
                {(options.statusImovel || []).filter(o => o.ativo).map(o => (
                  <option key={o.id} value={o.nome}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Valor de Venda (R$)</label>
              <input type="number" {...register('priceVenda')} className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Valor de Locação (R$)</label>
              <input type="number" {...register('priceLocacao')} className="input-field" />
            </div>
            <div className="space-y-4 md:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('financing')} className="w-5 h-5 accent-gold" />
                <span className="text-sm font-medium">Aceita Financiamento</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('exchange')} className="w-5 h-5 accent-gold" />
                <span className="text-sm font-medium">Aceita Permuta</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('furnished')} className="w-5 h-5 accent-gold" />
                <span className="text-sm font-medium">Mobiliado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('rented')} className="w-5 h-5 accent-gold" />
                <span className="text-sm font-medium">Imóvel Alugado</span>
              </label>
            </div>
          </div>
        );
      case 'loc':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">CEP</label>
              <input {...register('cep')} className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cidade</label>
              <select {...register('city')} className="input-field">
                <option value="">Selecione a cidade...</option>
                {(options.cidades || []).filter(o => o.ativo).map(o => (
                  <option key={o.id} value={o.nome}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Bairro</label>
              <select {...register('neighborhood')} className="input-field">
                <option value="">Selecione o bairro...</option>
                {(options.bairros || [])
                  .filter(o => o.ativo && (!watch('city') || o.cidade === watch('city')))
                  .map(o => (
                    <option key={o.id} value={o.nome}>{o.nome}</option>
                  ))
                }
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Endereço</label>
              <input {...register('address')} className="input-field" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Link Google Maps</label>
              <input {...register('googleMapsLink')} className="input-field" placeholder="https://goo.gl/maps/..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 shrink-0">Tags de Localização (Selecione)</label>
              <div className="flex flex-wrap gap-2">
                {(options.localizacoes || []).filter(o => o.ativo).map(tag => (
                   <label key={tag.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-gold/10 transition-colors">
                     <input 
                       type="checkbox" 
                       value={tag.nome} 
                       {...register('locationTags')} 
                       className="accent-gold"
                     />
                     {tag.nome}
                   </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'prop':
        return (
          <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-4 text-amber-800 border border-amber-100">
               <Info size={24} className="shrink-0" />
               <p className="text-sm">Os dados do proprietário são <strong>estritamente privados</strong> e nunca serão exibidos no site público. Apenas administradores autorizados têm acesso.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome do Proprietário</label>
                <input {...register('ownerName')} className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Telefone</label>
                <input {...register('ownerPhone')} className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input {...register('ownerEmail')} className="input-field" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-gray-700">Observações Internas</label>
                <textarea {...register('ownerNotes')} className="input-field h-24" />
              </div>
            </div>
          </div>
        );
      case 'chars':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { n: 'usefulArea', l: 'Área Útil' },
                { n: 'totalArea', l: 'Área Total' },
                { n: 'bedrooms', l: 'Dormitórios' },
                { n: 'suites', l: 'Suítes' },
                { n: 'bathrooms', l: 'Banheiros' },
                { n: 'garageSpaces', l: 'Vagas' },
              ].map(item => (
                <div key={item.n} className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">{item.l}</label>
                  <input type="number" {...register(item.n)} className="input-field" />
                </div>
              ))}
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h4 className="font-bold text-xl text-primary-black">Características</h4>
                  <p className="text-sm text-gray-500">Selecione os atributos que melhor definem este imóvel.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => selectAll('caracteristicas', 'caracteristicas')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Selecionar tudo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => clearAll('caracteristicas')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {(options.caracteristicas || []).map(opt => (
                  <label 
                    key={opt.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                      (watch('caracteristicas') || []).includes(opt.nome)
                      ? 'border-gold bg-gold/5'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      (watch('caracteristicas') || []).includes(opt.nome)
                      ? 'bg-gold border-gold text-primary-black'
                      : 'bg-white border-gray-300 group-hover:border-gold'
                    }`}>
                      <input 
                        type="checkbox" 
                        value={opt.nome} 
                        {...register('caracteristicas')} 
                        className="hidden" 
                      />
                      {(watch('caracteristicas') || []).includes(opt.nome) && <Check size={14} strokeWidth={4} />}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      (watch('caracteristicas') || []).includes(opt.nome)
                      ? 'text-primary-black'
                      : 'text-gray-600 group-hover:text-primary-black'
                    }`}>
                      {opt.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'inst':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="font-bold text-xl text-primary-black">Instalações</h4>
                <p className="text-sm text-gray-500">Equipamentos e sistemas instalados na unidade.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => selectAll('instalacoes', 'instalacoes')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => clearAll('instalacoes')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.instalacoes || []).map(opt => (
                <label 
                  key={opt.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    (watch('instalacoes') || []).includes(opt.nome)
                    ? 'border-primary-green bg-primary-green/5'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    (watch('instalacoes') || []).includes(opt.nome)
                    ? 'bg-primary-green border-primary-green text-white'
                    : 'bg-white border-gray-300 group-hover:border-primary-green'
                  }`}>
                    <input 
                      type="checkbox" 
                      value={opt.nome} 
                      {...register('instalacoes')} 
                      className="hidden" 
                    />
                    {(watch('instalacoes') || []).includes(opt.nome) && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    (watch('instalacoes') || []).includes(opt.nome)
                    ? 'text-primary-black'
                    : 'text-gray-600 group-hover:text-primary-black'
                  }`}>
                    {opt.nome}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'fin':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="font-bold text-xl text-primary-black">Acabamento</h4>
                <p className="text-sm text-gray-500">Materiais e padrões construtivos utilizados.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => selectAll('acabamentos', 'acabamentos')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => clearAll('acabamentos')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.acabamentos || []).map(opt => (
                <label 
                  key={opt.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    (watch('acabamentos') || []).includes(opt.nome)
                    ? 'border-gold bg-gold/5'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    (watch('acabamentos') || []).includes(opt.nome)
                    ? 'bg-gold border-gold text-primary-black'
                    : 'bg-white border-gray-300 group-hover:border-gold'
                  }`}>
                    <input 
                      type="checkbox" 
                      value={opt.nome} 
                      {...register('acabamentos')} 
                      className="hidden" 
                    />
                    {(watch('acabamentos') || []).includes(opt.nome) && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    (watch('acabamentos') || []).includes(opt.nome)
                    ? 'text-primary-black'
                    : 'text-gray-600 group-hover:text-primary-black'
                  }`}>
                    {opt.nome}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'leis':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="font-bold text-xl text-primary-black">Lazer</h4>
                <p className="text-sm text-gray-500">Áreas de convivência e infraestrutura recreativa.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => selectAll('lazer', 'lazer')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => clearAll('lazer')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.lazer || []).map(opt => (
                <label 
                  key={opt.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    (watch('lazer') || []).includes(opt.nome)
                    ? 'border-primary-green bg-primary-green/5'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    (watch('lazer') || []).includes(opt.nome)
                    ? 'bg-primary-green border-primary-green text-white'
                    : 'bg-white border-gray-300 group-hover:border-primary-green'
                  }`}>
                    <input 
                      type="checkbox" 
                      value={opt.nome} 
                      {...register('lazer')} 
                      className="hidden" 
                    />
                    {(watch('lazer') || []).includes(opt.nome) && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    (watch('lazer') || []).includes(opt.nome)
                    ? 'text-primary-black'
                    : 'text-gray-600 group-hover:text-primary-black'
                  }`}>
                    {opt.nome}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'img':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
               <h4 className="font-bold text-primary-black mb-4 flex items-center gap-2">
                 <ImageIcon size={20} className="text-gold" /> Adicionar Imagens por URL
               </h4>
               <p className="text-sm text-gray-500 mb-6">Como o armazenamento de arquivos está desativado, cole os links das imagens (Unsplash, Imgur, etc).</p>
               
               <div className="flex gap-4">
                 <input 
                   type="text" 
                   value={imageUrl}
                   onChange={(e) => setImageUrl(e.target.value)}
                   placeholder="https://exemplo.com/imagem.jpg"
                   className="input-field flex-grow"
                 />
                 <button 
                   type="button"
                   onClick={addImageUrl}
                   className="btn-gold !px-8"
                 >
                   <Plus size={20} /> Adicionar
                 </button>
               </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((url, idx) => (
                  <div key={idx} className={`relative rounded-xl overflow-hidden group aspect-square border-2 ${mainImage === url ? 'border-gold shadow-lg shadow-gold/20' : 'border-transparent'}`}>
                    <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button 
                         type="button" 
                         onClick={() => setMainImage(url)}
                         className="p-2 bg-gold text-primary-black rounded-lg hover:scale-110"
                         title="Definir como principal"
                       >
                         <Sparkles size={16} />
                       </button>
                       <button 
                         type="button" 
                         onClick={() => removeImage(url)}
                         className="p-2 bg-red-500 text-white rounded-lg hover:scale-110"
                         title="Excluir"
                       >
                         <X size={16} />
                       </button>
                    </div>
                    {mainImage === url && (
                      <div className="absolute top-2 left-2 bg-gold text-primary-black text-[10px] font-bold px-2 py-0.5 rounded">
                        PRINCIPAL
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'pub':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Título do Anúncio (Vibrante e Vendedor)</label>
                <input {...register('title')} className="input-field" placeholder="Ex: Espetacular Cobertura Duplex em frente à Ilha das Cabras" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição Curta (Meta data)</label>
                <input {...register('shortDescription')} className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Descrição Detalhada</label>
                <textarea {...register('fullDescription')} className="input-field h-64" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-gold" /> Configurações de Visibilidade</h4>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Publicado no Site</span>
                     <span className="text-xs text-gray-500 italic">Visível para todos os visitantes</span>
                   </div>
                   <input type="checkbox" {...register('publicado')} className="w-6 h-6 accent-primary-green" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer">
                   <div className="flex flex-col">
                     <span className="font-bold text-sm">Destaque na Home</span>
                     <span className="text-xs text-gray-500 italic">Exibir na seção principal do site</span>
                   </div>
                   <input type="checkbox" {...register('destaque')} className="w-6 h-6 accent-gold" />
                </label>
              </div>

              <div className="bg-primary-green text-white p-6 rounded-2xl shadow-xl">
                 <h4 className="font-bold mb-4">Ações Finais</h4>
                 <div className="space-y-3">
                   <button 
                     type="submit" 
                     className="w-full bg-gold text-primary-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                     disabled={loading}
                   >
                     <Save size={20} />
                     {loading ? 'Salvando...' : 'Salvar Alterações'}
                   </button>
                   <button 
                      type="button"
                      onClick={() => navigate('/admin/imoveis')}
                      className="w-full border border-white/20 text-white py-3 rounded-xl hover:bg-white/5 transition-all"
                   >
                     Cancelar
                   </button>
                 </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading && id) return <div className="h-full flex items-center justify-center">Carregando imóvel...</div>;

  return (
    <motion.form 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-10 pb-20"
    >
      <motion.div 
        variants={slideUp}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ x: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => navigate('/admin/imoveis')}
            className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gold hover:shadow-xl transition-all"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div className="flex items-center gap-3 text-gold mb-1">
               <div className="w-8 h-[1px] bg-gold/30" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em]">Asset Refinement</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">
              {id ? 'Editar Patrimônio' : 'Novo Lançamento'}
            </h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Especifique os detalhes técnicos e comerciais da unidade.</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div 
        variants={slideUp}
        className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide no-scrollbar border-b border-gray-100 sticky top-16 bg-gray-50/90 backdrop-blur-xl z-30 py-4 -mx-4 px-4"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id 
              ? 'text-primary-black' 
              : 'text-gray-400 hover:text-primary-black bg-white/50 border border-transparent hover:border-gray-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="tab-pill"
                className="absolute inset-0 bg-gold/10 -z-10 rounded-2xl border border-gold/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="active-dot"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gold rounded-full"
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Content Area */}
      <motion.div 
        variants={slideUp}
        className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden"
      >
        <div className="p-10 lg:p-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.form>
  );
}

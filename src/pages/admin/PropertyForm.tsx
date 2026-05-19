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
  serverTimestamp,
  getDocs,
  query,
  where
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Target,
  RefreshCw,
  Edit,
  Eye,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { SafeImage } from '../../components/ui/SafeImage';
import { 
  isValidImageUrl, 
  maskCurrency, 
  parseCurrencyToNumber,
  formatCurrency
} from '../../lib/utils';
import { useOptions } from '../../hooks/useSettings';
import { Property, Owner, Broker } from '../../types';
import { useSettings } from '../../hooks/useSettings';

const TABS = [
  { id: 'bash', label: 'Dados Básicos', icon: Info },
  { id: 'loc', label: 'Localização', icon: MapPin },
  { id: 'prop', label: 'Proprietário', icon: User },
  { id: 'chars', label: 'Características', icon: Grid },
  { id: 'prox', label: 'Proximidades', icon: Target },
  { id: 'inst', label: 'Instalação', icon: Layout },
  { id: 'fin', label: 'Acabamento', icon: Hammer },
  { id: 'leis', label: 'Lazer', icon: Waves },
  { id: 'img', label: 'Imagens', icon: ImageIcon },
  { id: 'vid', label: 'Vídeos', icon: Sparkles },
  { id: 'pub', label: 'Publicação', icon: Sparkles },
];

const PROPERTY_TYPE_PREFIXES: { [key: string]: string } = {
  "apartamento": "AP",
  "casa": "CA",
  "terreno": "TE",
  "sala comercial": "SC",
  "comercial": "CO",
  "galpão": "GA",
  "galpao": "GA",
  "chácara": "CH",
  "chacara": "CH",
  "sobrado": "SO",
  "kitnet": "KI",
  "studio": "ST",
  "cobertura": "CB",
  "loft": "LF",
  "fazenda": "FA",
  "sítio": "SI",
  "sitio": "SI"
};

const getPrefixByPropertyType = (tipoImovel: string) => {
  const tipo = tipoImovel?.toLowerCase().trim() || "";
  return PROPERTY_TYPE_PREFIXES[tipo] || "IM";
};

export default function AdminPropertyForm() {
  const { options, loading: optionsLoading } = useOptions();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bash');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showCodeChangeModal, setShowCodeChangeModal] = useState(false);
  const [manualCode, setManualCode] = useState(false);
  const [pendingType, setPendingType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videos, setVideos] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leaseOptions, setLeaseOptions] = useState<any>({
    garantias: [],
    status: [],
    contratos: [],
    regras: []
  });
  const { settings } = useSettings();

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isDirty } } = useForm<any>({
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
      proximities: [],
      title: '',
      code: '',
      priceVenda: 0,
      priceLocacao: 0,
      condoFee: 0,
      iptu: 0,
      fireInsurance: 0,
      totalMonthlyPrice: 0,
      usefulArea: 0,
      areaConstruida: 0,
      totalArea: 0,
      bedrooms: 0,
      suites: 0,
      bathrooms: 0,
      garageSpaces: 0,
      cep: '',
      city: '',
      neighborhood: '',
      address: '',
      googleMapsLink: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      ownerNotes: '',
      description: '',
      fullDescription: '',
      internalNotes: '',
      isBuilding: false,
      isCondo: false,
      buildingName: '',
      condoName: '',
      furnishingStatus: '',
      availableForVisit: '',
      minLeaseTerm: '',
      leaseStatus: '',
      leaseNotes: '',
      taxes: 0,
      broker: '',
    }
  });

  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const snap = await getDocs(collection(db, 'corretores'));
        setBrokers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broker)).filter(b => b.active));
      } catch (error) {
        console.error("Error fetching brokers:", error);
      }
    };
    fetchBrokers();

    const fetchLeaseOptions = async () => {
      try {
        const [garantias, status, contratos, regras] = await Promise.all([
          getDocs(collection(db, 'configLocacaoGarantias')),
          getDocs(collection(db, 'configLocacaoStatus')),
          getDocs(collection(db, 'configLocacaoContratos')),
          getDocs(collection(db, 'configLocacaoRegras'))
        ]);

        setLeaseOptions({
          garantias: garantias.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo),
          status: status.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo),
          contratos: contratos.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo),
          regras: regras.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo)
        });
      } catch (error) {
        console.error("Error fetching lease options:", error);
      }
    };
    fetchLeaseOptions();
  }, []);

  const isRented = watch('rented');
  useEffect(() => {
    if (isRented) {
      setValue('status', 'Locado');
    }
  }, [isRented, setValue]);

  // Auto-calculate Total Monthly Price
  const priceLocacao = watch('priceLocacao');
  const condoFee = watch('condoFee');
  const iptu = watch('iptu');
  const fireInsurance = watch('fireInsurance');
  const priceVenda = watch('priceVenda');
  const areaUtil = watch('usefulArea');
  const areaConstruida = watch('areaConstruida');

  useEffect(() => {
    const total = (Number(priceLocacao) || 0) + (Number(condoFee) || 0) + (Number(iptu) || 0) + (Number(fireInsurance) || 0);
    setValue('totalMonthlyPrice', total);
  }, [priceLocacao, condoFee, iptu, fireInsurance, setValue]);

  useEffect(() => {
    const areaBase = Number(areaUtil) || Number(areaConstruida);
    
    if (areaBase > 0) {
      if (priceVenda > 0) {
        setValue('valorMetroQuadrado', priceVenda / areaBase);
      } else {
        setValue('valorMetroQuadrado', 0);
      }

      if (priceLocacao > 0) {
        setValue('valorMetroQuadradoLocacao', priceLocacao / areaBase);
      } else {
        setValue('valorMetroQuadradoLocacao', 0);
      }
    } else {
      setValue('valorMetroQuadrado', 0);
      setValue('valorMetroQuadradoLocacao', 0);
    }
  }, [priceVenda, priceLocacao, areaUtil, areaConstruida, setValue]);

  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setValue('address', data.logradouro);
        setValue('neighborhood', data.bairro);
        setValue('city', data.localidade);
        setValue('state', data.uf);

        // Auto-save neighborhood if not exists
        if (data.bairro) {
          const neighborhoodName = data.bairro;
          const q = neighborhoodName.toLowerCase();
          const neighborhoodsSnap = await getDocs(collection(db, 'bairros'));
          const exists = neighborhoodsSnap.docs.some(doc => doc.data().nome.toLowerCase() === q);
          
          if (!exists) {
            await addDoc(collection(db, 'bairros'), {
              nome: neighborhoodName,
              cidade: data.localidade,
              estado: data.uf,
              ativo: true,
              criadoEm: serverTimestamp(),
              atualizadoEm: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error("CEP lookup error:", error);
    } finally {
      setCepLoading(false);
    }
  };

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
            setVideos(data.videos || []);
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
    
    // Add trimming
    const trimmedUrl = imageUrl.trim();
    
    if (!isValidImageUrl(trimmedUrl)) {
      alert("Por favor, insira uma URL válida (começando com http:// ou https://)");
      return;
    }

    const newImages = [...images, trimmedUrl];
    setImages(newImages);
    if (!mainImage) setMainImage(trimmedUrl);
    setImageUrl('');
  };

  const removeImage = (url: string) => {
    setImages(images.filter(img => img !== url));
    if (mainImage === url) setMainImage(images[0] || '');
  };

  const addVideoUrl = () => {
    if (!videoUrl) return;
    setVideos([...videos, videoUrl]);
    setVideoUrl('');
  };

  const removeVideo = (url: string) => {
    setVideos(videos.filter(v => v !== url));
  };

  useEffect(() => {
    if (!id) {
      const draft = localStorage.getItem('property_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          Object.keys(parsed).forEach(key => {
            if (key !== 'images' && key !== 'mainImage') {
              setValue(key, parsed[key]);
            }
          });
          if (parsed.images) setImages(parsed.images);
          if (parsed.mainImage) setMainImage(parsed.mainImage);
        } catch (e) {
          console.error("Draft load error:", e);
        }
      }
    }
  }, [id, setValue]);

  const formValues = watch();
  useEffect(() => {
    if (!id && isDirty) {
      const draft = { ...formValues, images, videos, mainImage };
      localStorage.setItem('property_draft', JSON.stringify(draft));
    }
  }, [formValues, images, videos, mainImage, id, isDirty]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Check for duplicate code
      const codeQ = query(collection(db, 'imoveis'), where('code', '==', data.code));
      const codeSnap = await getDocs(codeQ);
      const isDuplicate = codeSnap.docs.some(doc => doc.id !== id);
      
      if (isDuplicate) {
        alert(`Este código de imóvel (${data.code}) já está em uso. Por favor, gere ou insira outro código.`);
        setLoading(false);
        return;
      }

      const propertyData: any = {
        ...data,
        images,
        videos,
        mainImage,
        updatedAt: serverTimestamp(),
        // Redundancy for different filter styles across the app
        ativo: !!data.publicado,
        publicadoNoSite: !!data.publicado,
      };

      // Add broker details
      if (data.brokerId) {
        const selectedBroker = brokers.find(b => b.id === data.brokerId);
        if (selectedBroker) {
          propertyData.brokerName = selectedBroker.name;
          propertyData.brokerWhatsapp = selectedBroker.whatsapp || selectedBroker.phone;
          propertyData.brokerPhoto = selectedBroker.photo || '';
          propertyData.brokerCreci = selectedBroker.creci || '';
        }
      } else {
        propertyData.brokerName = '';
        propertyData.brokerWhatsapp = '';
        propertyData.brokerPhoto = '';
        propertyData.brokerCreci = '';
      }
      
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

      const linkImovel = `${window.location.origin}/imovel/${propertyId || ''}`;
      propertyData.linkImovel = linkImovel;

      if (id) {
        await updateDoc(doc(db, 'imoveis', id), propertyData);
      } else {
        propertyData.createdAt = serverTimestamp();
        propertyData.createdBy = auth.currentUser?.uid;
        const newDoc = await addDoc(collection(db, 'imoveis'), propertyData);
        propertyId = newDoc.id;
        // Update with the correct ID link after creation
        const finalLink = `${window.location.origin}/imovel/${propertyId}`;
        await updateDoc(doc(db, 'imoveis', propertyId), { linkImovel: finalLink });
      }

      // Save owner info to subcollection
      if (propertyId) {
        await setDoc(doc(db, 'imoveis', propertyId, 'privado', 'proprietario'), ownerData);
      }

      localStorage.removeItem('property_draft');
      navigate('/admin/imoveis');
    } catch (error) {
      console.error("Save error:", error);
      alert("Erro ao salvar imóvel.");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const selectAll = (field: string, category: string) => {
    const allValues = (options[category] || []).map(o => o.nome);
    setValue(field, allValues);
  };

  const clearAll = (field: string) => {
    setValue(field, []);
  };

  const generateTexts = (force = false) => {
    const values = watch();
    const { 
      propertyType, businessType, neighborhood, city, state,
      bedrooms, suites, bathrooms, garageSpaces, usefulArea, 
      priceVenda, priceLocacao, condoFee, iptu, fireInsurance, taxes,
      caracteristicas, lazer
    } = values;

    const hasContent = values.title || values.shortDescription || values.fullDescription;

    if (!force && hasContent) {
      setShowReplaceModal(true);
      return;
    }

    // 1. Título
    let titulo = `${propertyType} `;
    if (bedrooms) titulo += `${bedrooms} quartos `;
    titulo += `${businessType === 'Locação' ? 'para locação' : 'à venda'} `;
    if (neighborhood) titulo += `no ${neighborhood} `;
    if (city) titulo += `em ${city}`;

    // 2. Descrição Curta
    let descCurta = `${propertyType} ${businessType === 'Locação' ? 'para locação' : 'à venda'} no ${neighborhood || ''}${neighborhood ? ', ' : ''}${city}/${state}, `;
    if (bedrooms) descCurta += `com ${bedrooms} quartos, `;
    if (suites) descCurta += `suíte, `;
    if (garageSpaces) descCurta += `${garageSpaces} vagas `;
    descCurta += `e excelente localização.`;

    // 3. Descrição Detalhada
    let descCompleta = "";
    if (businessType === 'Locação') {
      descCompleta = `Esta ${propertyType.toLowerCase()} para locação está localizada no bairro ${neighborhood || 'Bairro'} e oferece uma excelente opção para quem busca praticidade, conforto e boa localização.\n\n`;
      descCompleta += `O imóvel possui `;
      if (bedrooms) descCompleta += `${bedrooms} quartos, `;
      descCompleta += `ambientes funcionais e está pronto para receber novos moradores.\n\n`;
      
      descCompleta += `Valores da locação:\n`;
      if (priceLocacao) descCompleta += `- Aluguel: ${formatCurrency(priceLocacao)}\n`;
      if (condoFee) descCompleta += `- Condomínio: ${formatCurrency(condoFee)}\n`;
      if (iptu) descCompleta += `- IPTU: ${formatCurrency(iptu)}\n`;
      if (fireInsurance) descCompleta += `- Seguro Incêndio: ${formatCurrency(fireInsurance)}\n`;
      if (taxes) descCompleta += `- Taxas Adicionais: ${formatCurrency(taxes)}\n`;
      
      const total = (Number(priceLocacao) || 0) + (Number(condoFee) || 0) + (Number(iptu) || 0) + (Number(fireInsurance) || 0) + (Number(taxes) || 0);
      descCompleta += `Valor total: ${formatCurrency(total)}\n\n`;
    } else {
      descCompleta = `Conheça este ${propertyType.toLowerCase()} à venda no ${neighborhood || 'Bairro'} de ${city || 'Cidade'} / ${state || 'UF'}. O imóvel conta com `;
      if (bedrooms) descCompleta += `${bedrooms} quartos, `;
      if (suites) descCompleta += `sendo ${suites} suíte, `;
      if (bathrooms) descCompleta += `${bathrooms} banheiros, `;
      if (garageSpaces) descCompleta += `${garageSpaces} vagas de garagem `;
      if (usefulArea) descCompleta += `e ${usefulArea}m² de área útil. `;
      descCompleta += `Ambientes bem distribuídos para oferecer conforto e praticidade no dia a dia.\n\n`;
      
      if (priceVenda) descCompleta += `Valor de investimento: ${formatCurrency(priceVenda)}\n\n`;
    }

    const allFeatures = [...(caracteristicas || []), ...(lazer || [])];
    if (allFeatures.length > 0) {
      descCompleta += `Diferenciais do imóvel:\n- ${allFeatures.slice(0, 8).join('\n- ')}\n\n`;
    }

    descCompleta += `Localizado em uma região valorizada, o imóvel é ideal para quem busca morar bem ou investir com segurança.\n\n`;
    descCompleta += `Entre em contato para mais informações ou agende uma visita.`;

    setValue('title', titulo.trim());
    setValue('shortDescription', descCurta.trim());
    setValue('fullDescription', descCompleta.trim());
    setShowReplaceModal(false);
  };

  const generateNextCode = async (prefix: string) => {
    try {
      const q = query(
        collection(db, 'imoveis'),
        where('code', '>=', prefix),
        where('code', '<=', prefix + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      
      let maxNum = 0;
      querySnapshot.forEach((docSnap) => {
        const code = docSnap.data().code;
        if (code && code.startsWith(prefix)) {
          const numPart = code.substring(prefix.length);
          const cleanNumPart = numPart.replace(/\D/g, '');
          const num = parseInt(cleanNumPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      
      const nextNum = maxNum + 1;
      const formattedNum = nextNum.toString().padStart(2, '0');
      return `${prefix}${formattedNum}`;
    } catch (error) {
      console.error("Error generating code:", error);
      return `${prefix}01`;
    }
  };

  const handlePropertyTypeChange = async (newType: string) => {
    const currentCode = watch('code');
    const currentType = watch('propertyType');
    
    if (id || (currentCode && currentType && currentType !== newType)) {
      setPendingType(newType);
      setShowCodeChangeModal(true);
    } else {
      setValue('propertyType', newType);
      const prefix = getPrefixByPropertyType(newType);
      const code = await generateNextCode(prefix);
      setValue('code', code);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const activeElement = document.getElementById(`tab-${activeTab}`);
    if (activeElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = activeElement.offsetLeft - (container.offsetWidth / 2) + (activeElement.offsetWidth / 2);
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!id) {
      const currentCode = watch('code');
      if (!currentCode) {
        const type = watch('propertyType');
        if (type) {
          const prefix = getPrefixByPropertyType(type);
          generateNextCode(prefix).then(code => {
            if (!watch('code')) {
              setValue('code', code);
            }
          });
        }
      }
    }
  }, [id, setValue, watch]);

  const renderTabContent = () => {
    if (optionsLoading) return <div className="py-20 text-center animate-pulse">Carregando opções dinâmicas...</div>;

    switch (activeTab) {
      case 'bash':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Código do Imóvel</label>
              <div className="relative group">
                <input 
                  {...register('code', { required: true })} 
                  className={`input-field pr-24 ${!manualCode ? 'bg-gray-50' : ''}`} 
                  placeholder="Ex: AP01" 
                  readOnly={!manualCode}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const prefix = getPrefixByPropertyType(watch('propertyType'));
                      const code = await generateNextCode(prefix);
                      setValue('code', code);
                    }}
                    title="Gerar código"
                    className="p-1.5 hover:bg-gold/10 text-gold rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCode(!manualCode)}
                    title="Editar manualmente"
                    className={`p-1.5 rounded-lg transition-colors ${manualCode ? 'bg-primary-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 pl-1">
                {!manualCode ? 'Gerado automaticamente conforme o tipo.' : 'Edição manual ativada.'}
              </p>
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
              <select 
                {...register('propertyType')} 
                className="input-field"
                onChange={(e) => handlePropertyTypeChange(e.target.value)}
              >
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

            {watch('businessType') === 'Venda' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Valor de Venda (R$)</label>
                <Controller
                  name="priceVenda"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="text"
                      className="input-field"
                      value={maskCurrency(field.value ?? '')}
                      onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                      placeholder="0,00"
                    />
                  )}
                />
              </div>
            )}

            {watch('businessType') === 'Locação' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor do Aluguel (R$)</label>
                  <Controller
                    name="priceLocacao"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="input-field"
                        value={maskCurrency(field.value ?? '')}
                        onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                        placeholder="0,00"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor do Condomínio (R$)</label>
                  <Controller
                    name="condoFee"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="input-field"
                        value={maskCurrency(field.value ?? '')}
                        onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                        placeholder="0,00"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Valor do IPTU (R$)</label>
                  <Controller
                    name="iptu"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="input-field"
                        value={maskCurrency(field.value ?? '')}
                        onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                        placeholder="0,00"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Seguro Incêndio (R$)</label>
                  <Controller
                    name="fireInsurance"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="input-field"
                        value={maskCurrency(field.value ?? '')}
                        onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                        placeholder="0,00"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-black text-primary-green">Valor Total Mensal (R$)</label>
                  <Controller
                    name="totalMonthlyPrice"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        className="input-field font-bold bg-green-50 border-green-200"
                        value={maskCurrency(field.value ?? '')}
                        onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                        placeholder="0,00"
                      />
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Garantia Locatícia</label>
                  <select {...register('leaseWarrantyType')} className="input-field">
                    <option value="">Selecione...</option>
                    {leaseOptions.garantias.map((o: any) => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Permite Pet?</label>
                  <select {...register('allowsPet')} className="input-field">
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Mobiliado?</label>
                  <select {...register('furnishingStatus')} className="input-field">
                    <option value="">Selecione...</option>
                    <option value="Mobiliado">Sim</option>
                    <option value="Não Mobiliado">Não</option>
                    <option value="Parcialmente">Parcialmente</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Tempo Mínimo Contrato</label>
                  <select {...register('minLeaseTerm')} className="input-field">
                    <option value="">Selecione...</option>
                    {leaseOptions.contratos.map((o: any) => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Disponível para Visita?</label>
                  <select {...register('availableForVisit')} className="input-field">
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Status da Locação</label>
                  <select {...register('leaseStatus')} className="input-field">
                    <option value="">Selecione...</option>
                    {leaseOptions.status.map((o: any) => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-bold text-gray-700">Observações da Locação</label>
                  <textarea {...register('leaseNotes')} className="input-field h-24" placeholder="Detalhes adicionais sobre a locação..." />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Taxas Adicionais (R$)</label>
              <Controller
                name="taxes"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    className="input-field"
                    value={maskCurrency(field.value || '')}
                    onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                    placeholder="0,00"
                  />
                )}
              />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
               <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('isBuilding')} className="w-5 h-5 accent-gold" />
                    <span className="text-sm font-bold">É um Edifício?</span>
                  </label>
                  {watch('isBuilding') && (
                    <input {...register('buildingName')} className="input-field" placeholder="Nome do Edifício" />
                  )}
               </div>
               <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('isCondo')} className="w-5 h-5 accent-gold" />
                    <span className="text-sm font-bold">Está em Condomínio?</span>
                  </label>
                  {watch('isCondo') && (
                    <input {...register('condoName')} className="input-field" placeholder="Nome do Condomínio" />
                  )}
               </div>
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
              <label className="text-sm font-bold text-gray-700 flex items-center justify-between">
                CEP {cepLoading && <span className="text-[10px] text-gold animate-pulse italic">Buscando...</span>}
              </label>
              <input 
                {...register('cep')} 
                className="input-field" 
                onBlur={(e) => handleCepLookup(e.target.value)}
                placeholder="00000-000"
              />
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
              <Controller
                name="neighborhood"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <input 
                      {...field} 
                      className="input-field w-full" 
                      placeholder="Bairro"
                      list="neighborhoods-list"
                    />
                    <datalist id="neighborhoods-list">
                      {(options.bairros || [])
                        .filter(o => o.ativo && (!watch('city') || o.cidade === watch('city')))
                        .map(o => (
                          <option key={o.id} value={o.nome} />
                        ))
                      }
                    </datalist>
                  </div>
                )}
              />
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
                { n: 'usefulArea', l: 'Área Útil (m²)' },
                { n: 'areaConstruida', l: 'Área Const. (m²)' },
                { n: 'totalArea', l: 'Área Total' },
                { n: 'bedrooms', l: 'Dormitórios' },
                { n: 'suites', l: 'Suítes' },
                { n: 'bathrooms', l: 'Banheiros' },
                { n: 'garageSpaces', l: 'Vagas' },
              ].map(item => (
                <div key={item.n} className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">{item.l}</label>
                  <input type="number" {...register(item.n)} className="input-field" step="0.01" />
                </div>
              ))}
            </div>

            {/* Metrics Summary Card */}
            <div className="bg-white p-6 rounded-[2rem] border-2 border-gold/20 shadow-xl shadow-gold/5 animate-in fade-in zoom-in duration-500">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
                    <Grid size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-black">Resumo de Metragem</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Cálculo Automático</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Metragem Base</p>
                    <p className="text-xl font-display font-bold text-primary-black">
                      {(Number(watch('usefulArea')) || Number(watch('areaConstruida')) || 0).toLocaleString('pt-BR')} m²
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 italic">
                      {Number(watch('usefulArea')) > 0 ? "Usando Área Útil" : Number(watch('areaConstruida')) > 0 ? "Usando Área Construída" : "Informe a área"}
                    </p>
                  </div>

                  {(watch('businessType') === 'Venda' || Number(watch('priceVenda')) > 0) && (
                    <div className="p-4 rounded-2xl bg-primary-black text-white shadow-lg">
                      <p className="text-[9px] font-black text-gold uppercase tracking-widest mb-1">Valor por m² (Venda)</p>
                      {watch('valorMetroQuadrado') > 0 ? (
                        <p className="text-xl font-display font-bold text-white">
                          {formatCurrency(watch('valorMetroQuadrado'))}/m²
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1 italic">Informe valor e área útil</p>
                      )}
                    </div>
                  )}

                  {(watch('businessType') === 'Locação' || Number(watch('priceLocacao')) > 0) && (
                    <div className="p-4 rounded-2xl bg-gold text-primary-black shadow-lg">
                      <p className="text-[9px] font-black text-primary-black/60 uppercase tracking-widest mb-1">Valor por m² (Locação)</p>
                      {watch('valorMetroQuadradoLocacao') > 0 ? (
                        <p className="text-xl font-display font-bold text-primary-black">
                          {formatCurrency(watch('valorMetroQuadradoLocacao'))}/m²
                        </p>
                      ) : (
                        <p className="text-[10px] text-primary-black/60 mt-1 italic">Informe valor e área útil</p>
                      )}
                    </div>
                  )}
               </div>
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
                {(options.caracteristicas || []).map((opt, idx) => (
                  <label 
                    key={opt.id || `char-${opt.nome}-${idx}`} 
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
      case 'prox':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="font-bold text-xl text-primary-black">Proximidades</h4>
                <p className="text-sm text-gray-500">Comércios e serviços próximos ao imóvel.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    const allProx = ["Shopping", "Escola", "Praia", "Bar", "Restaurantes", "Hospital", "Supermercado", "Academia", "Parque", "Farmácia"];
                    setValue('proximities', allProx);
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar principais
                </button>
                <button 
                  type="button" 
                  onClick={() => clearAll('proximities')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {["Shopping", "Escola", "Praia", "Bar", "Restaurantes", "Hospital", "Supermercado", "Academia", "Parque", "Farmácia", "Padaria", "Banco", "Posto de Gasolina", "Ponto de Ônibus", "Metrô"].map((opt, idx) => (
                <label 
                  key={`prox-${opt}-${idx}`} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    (watch('proximities') || []).includes(opt)
                    ? 'border-gold bg-gold/5'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    (watch('proximities') || []).includes(opt)
                    ? 'bg-gold border-gold text-primary-black'
                    : 'bg-white border-gray-300 group-hover:border-gold'
                  }`}>
                    <input 
                      type="checkbox" 
                      value={opt} 
                      {...register('proximities')} 
                      className="hidden" 
                    />
                    {(watch('proximities') || []).includes(opt) && <Check size={14} strokeWidth={4} />}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    (watch('proximities') || []).includes(opt)
                    ? 'text-primary-black'
                    : 'text-gray-600 group-hover:text-primary-black'
                  }`}>
                    {opt}
                  </span>
                </label>
              ))}
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
              {(options.instalacoes || []).map((opt, idx) => (
                <label 
                  key={opt.id || `inst-${opt.nome}-${idx}`} 
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
              {(options.acabamentos || []).map((opt, idx) => (
                <label 
                  key={opt.id || `acab-${opt.nome}-${idx}`} 
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
              {(options.lazer || []).map((opt, idx) => (
                <label 
                  key={opt.id || `lazer-${opt.nome}-${idx}`} 
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
                 <ImageIcon size={20} className="text-gold" /> Adicionar Imagens por URL (Ex: Postimage)
               </h4>
               <p className="text-sm text-gray-500 mb-6 font-medium">Use sites como <strong>Postimage.org</strong> ou <strong>Imgur</strong>. Cole o "Link Direto" da imagem abaixo.</p>
               
               <div className="flex flex-col md:flex-row gap-4 items-start">
                 <div className="flex-grow w-full space-y-2">
                   <input 
                     type="text" 
                     value={imageUrl}
                     onChange={(e) => setImageUrl(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         addImageUrl();
                       }
                     }}
                     placeholder="https://exemplo.com/imagem.jpg"
                     className={`input-field w-full ${imageUrl && !isValidImageUrl(imageUrl) ? 'border-red-300' : ''}`}
                   />
                   {imageUrl && !isValidImageUrl(imageUrl) && (
                     <p className="text-[10px] text-red-500 font-bold ml-1">URL inválida</p>
                   )}
                 </div>
                 <button 
                   type="button"
                   onClick={addImageUrl}
                   className="btn-gold !px-8 h-[50px] shrink-0"
                   disabled={!imageUrl || !isValidImageUrl(imageUrl)}
                 >
                   <Plus size={20} /> Adicionar
                 </button>
               </div>
               
               {imageUrl && isValidImageUrl(imageUrl) && (
                 <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 max-w-xs">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pré-visualização da URL:</p>
                    <SafeImage src={imageUrl} className="w-full aspect-video rounded-lg shadow-sm" />
                 </div>
               )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((url, idx) => (
                  <div key={idx} className={`relative rounded-xl overflow-hidden group aspect-square border-2 transition-all ${mainImage === url ? 'border-gold shadow-lg shadow-gold/20 scale-[1.02]' : 'border-gray-100 hover:border-gold/50'}`}>
                    <SafeImage 
                      src={url} 
                      alt={`Preview ${idx}`} 
                      className="w-full h-full" 
                    />
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
      case 'vid':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
               <h4 className="font-bold text-primary-black mb-4 flex items-center gap-2">
                 <Sparkles size={20} className="text-gold" /> Adicionar Vídeos por URL (YouTube ou Vimeo)
               </h4>
               <p className="text-sm text-gray-500 mb-6 font-medium">Cole o link completo do vídeo (Ex: https://www.youtube.com/watch?v=...).</p>
               
               <div className="flex gap-4">
                 <input 
                   type="text" 
                   value={videoUrl}
                   onChange={(e) => setVideoUrl(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       addVideoUrl();
                     }
                   }}
                   placeholder="https://www.youtube.com/watch?v=..."
                   className="input-field flex-grow"
                 />
                 <button 
                   type="button"
                   onClick={addVideoUrl}
                   className="btn-gold !px-8"
                 >
                   <Plus size={20} /> Adicionar
                 </button>
               </div>
            </div>

            {videos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.map((url, idx) => (
                  <div key={idx} className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-video border border-gray-200">
                    <div className="absolute top-4 right-4 z-10">
                       <button 
                         type="button" 
                         onClick={() => removeVideo(url)}
                         className="p-3 bg-red-500 text-white rounded-xl hover:scale-110 shadow-lg transition-all"
                         title="Remover Vídeo"
                       >
                         <X size={20} />
                       </button>
                    </div>
                    <div className="w-full h-full flex items-center justify-center bg-primary-black text-white p-4">
                       <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">Link do Vídeo</p>
                          <p className="text-xs break-all font-mono">{url}</p>
                       </div>
                    </div>
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
              {/* Card de Preenchimento Automático */}
              <div className="bg-gold/10 p-6 rounded-2xl border border-gold/20 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center text-gold">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary-black">Preenchimento automático</h4>
                    <p className="text-[11px] text-gray-500">Gere título e descrições com base nas informações do imóvel.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button"
                    onClick={() => generateTexts()}
                    className="flex-grow bg-gold text-primary-black font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                  >
                    Gerar textos automaticamente
                  </button>
                  <button 
                    type="button"
                    onClick={() => generateTexts(true)}
                    className="px-4 py-3 border border-gold/30 text-gold font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gold/5 transition-all"
                  >
                    Regerar textos
                  </button>
                </div>
              </div>

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
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Corretor Responsável</label>
                  <select 
                    {...register('brokerId')} 
                    className="input-field"
                    onChange={(e) => {
                      const selected = brokers.find(b => b.id === e.target.value);
                      if (selected) {
                        setValue('brokerName', selected.name);
                        setValue('brokerWhatsapp', selected.whatsapp || selected.phone);
                        setValue('brokerPhoto', selected.photo || '');
                        setValue('brokerCreci', selected.creci || '');
                      } else {
                        setValue('brokerName', '');
                        setValue('brokerWhatsapp', '');
                        setValue('brokerPhoto', '');
                        setValue('brokerCreci', '');
                      }
                    }}
                  >
                    <option value="">Imobiliária (Padrão)</option>
                    {brokers.map(broker => (
                      <option key={broker.id} value={broker.id}>
                        {broker.name} {broker.creci ? `- CRECI ${broker.creci}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 italic">Esse corretor será usado no botão de WhatsApp deste imóvel.</p>
                </div>

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

  if (loading && id) return (
    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
      <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-medium">Carregando dados do patrimônio...</p>
    </div>
  );

  const propertyLink = id ? `${window.location.origin}/imovel/${id}` : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Link do imóvel copiado com sucesso.");
  };

  const shareWhatsApp = () => {
    const data = watch();
    const message = `Olá! Segue o link deste imóvel incrível:\n\n*${data.title}*\n\n🏡 Confira os detalhes completos aqui:\n${propertyLink}\n\nCódigo: *${data.code}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <motion.form 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-10 pb-20"
    >
      {/* Property Link Card (Task 6) */}
      {id && (
        <motion.div 
          variants={slideUp}
          className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gold/10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
            <MessageSquare size={120} />
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 text-gold rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                   <h4 className="font-display font-bold text-primary-black text-lg leading-none">Link Público do Imóvel</h4>
                   <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1 font-black">Compartilhe este link com seus clientes interessados</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-4 group/link hover:border-gold/30 transition-colors">
                <span className="text-xs font-medium text-gray-400 truncate select-all">{propertyLink}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <button 
                 type="button"
                 onClick={() => copyToClipboard(propertyLink)}
                 className="flex items-center gap-2 bg-gray-100 hover:bg-gold/10 hover:text-gold text-gray-500 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 <ClipboardList size={14} />
                 <span>Copiar Link</span>
               </button>
               <button 
                 type="button"
                 onClick={() => window.open(propertyLink, '_blank')}
                 className="flex items-center gap-2 bg-primary-black text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:bg-gold hover:text-primary-black"
               >
                 <Eye size={14} />
                 <span>Abrir</span>
               </button>
               <button 
                 type="button"
                 onClick={shareWhatsApp}
                 className="flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
               >
                 <MessageSquare size={14} />
                 <span>WhatsApp</span>
               </button>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div 
        variants={slideUp}
        className="flex items-center justify-between sticky top-0 bg-gray-50/95 backdrop-blur-xl z-50 py-4 -mx-4 px-4 border-b border-gray-200"
      >
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ x: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => navigate('/admin/imoveis')}
            className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gold transition-all"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <h1 className="text-xl font-display font-bold text-primary-black tracking-tight">
              {id ? 'Editar Patrimônio' : 'Novo Lançamento'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             type="button"
             onClick={() => setShowConfirmModal(true)}
             className="bg-gold text-primary-black font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
           >
             <CheckCircle size={16} /> {id ? 'Confirmar Edição' : 'Confirmar Cadastro'}
           </button>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div 
        variants={slideUp}
        className="sticky top-16 bg-gray-50/95 backdrop-blur-xl z-30 py-4 -mx-4 px-4 border-b border-gray-100 group"
      >
        <div className="relative max-w-full">
          {/* Left Arrow */}
          <button 
            type="button"
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full shadow-lg items-center justify-center text-gray-400 hover:text-gold hover:scale-110 transition-all hidden md:flex opacity-0 group-hover:opacity-100 -translate-x-2"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Right Arrow */}
          <button 
            type="button"
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full shadow-lg items-center justify-center text-gray-400 hover:text-gold hover:scale-110 transition-all hidden md:flex opacity-0 group-hover:opacity-100 translate-x-2"
          >
            <ChevronRight size={20} />
          </button>

          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-3 pb-2 scrollbar-none no-scrollbar snap-x snap-mandatory"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 whitespace-nowrap px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 snap-start border ${
                  activeTab === tab.id 
                  ? 'text-primary-black bg-gold/10 border-gold/30 shadow-sm' 
                  : 'text-gray-400 bg-white border-gray-100 hover:border-gold/20 hover:text-gold shadow-sm hover:shadow-md'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.id ? 'text-primary-black' : 'text-gray-400'} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gold rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
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

      {/* Code Change Confirmation Modal */}
      <AnimatePresence>
        {showCodeChangeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-left">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowCodeChangeModal(false)}
            />
            <motion.div 
              {...scaleIn}
              className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl p-10 relative z-10 text-center"
            >
               <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center text-gold mx-auto mb-6">
                  <RefreshCw size={32} />
               </div>
               <h3 className="text-xl font-display font-bold text-primary-black mb-2">Alterar Tipo de Imóvel?</h3>
               <p className="text-gray-500 text-sm mb-8 leading-relaxed">O tipo de imóvel foi alterado para <strong>{pendingType}</strong>. Deseja gerar um novo código automático?</p>
               
               <div className="flex flex-col gap-3">
                  <button 
                    type="button"
                    onClick={async () => {
                      setValue('propertyType', pendingType);
                      const prefix = getPrefixByPropertyType(pendingType);
                      const code = await generateNextCode(prefix);
                      setValue('code', code);
                      setShowCodeChangeModal(false);
                    }}
                    className="w-full bg-gold text-primary-black font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20"
                  >
                    Sim, gerar novo código
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setValue('propertyType', pendingType);
                      setShowCodeChangeModal(false);
                    }}
                    className="w-full bg-primary-black text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-black/20"
                  >
                    Não, manter código atual
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div 
              {...scaleIn}
              className="bg-white max-w-md w-full rounded-[2.5rem] shadow-2xl p-10 relative z-10 text-center"
            >
               <div className="w-20 h-20 bg-gold/10 rounded-3xl flex items-center justify-center text-gold mx-auto mb-6">
                  <ClipboardList size={40} />
               </div>
               <h3 className="text-2xl font-display font-bold text-primary-black mb-2">Confirmar Lançamento?</h3>
               <p className="text-gray-500 text-sm mb-10 leading-relaxed">Verifique se todos os dados, valores e imagens estão corretos antes de publicar no catálogo.</p>
               
               <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-black text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-gold hover:text-primary-black transition-all shadow-xl shadow-primary-black/10"
                  >
                    {loading ? 'Processando...' : 'Sim, Publicar Imóvel'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 py-3"
                  >
                    Revisar Dados
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Replace Confirmation Modal */}
      <AnimatePresence>
        {showReplaceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowReplaceModal(false)}
            />
            <motion.div 
              {...scaleIn}
              className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl p-10 relative z-10 text-center"
            >
               <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center text-gold mx-auto mb-6">
                  <Sparkles size={32} />
               </div>
               <h3 className="text-xl font-display font-bold text-primary-black mb-2">Substituir Textos?</h3>
               <p className="text-gray-500 text-sm mb-8 leading-relaxed">Já existe um texto preenchido. Deseja substituir pelos textos gerados automaticamente?</p>
               
               <div className="flex flex-col gap-3">
                  <button 
                    type="button"
                    onClick={() => generateTexts(true)}
                    className="w-full bg-gold text-primary-black font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/20"
                  >
                    Sim, substituir
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowReplaceModal(false)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 py-2"
                  >
                    Cancelar
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}

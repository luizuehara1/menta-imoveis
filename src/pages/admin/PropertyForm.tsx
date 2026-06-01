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
import { useAuth } from '../../contexts/AuthContext';
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
  Upload,
  UploadCloud,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Target,
  RefreshCw,
  Edit,
  Eye,
  ExternalLink,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { SafeImage } from '../../components/ui/SafeImage';
import { 
  isValidImageUrl, 
  maskCurrency, 
  parseCurrencyToNumber,
  formatCurrency,
  pluralizeLabel,
  formatOptionWithQuantity,
  shouldShowQuantity,
  getOptionQuantity
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

async function uploadImageToCloudinary(file: File) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  console.log("Cloudinary cloud:", cloudName);
  console.log("Upload preset:", uploadPreset);

  if (!cloudName || !uploadPreset) {
    console.error("Cloudinary não configurado.");
    throw new Error("Cloudinary não configurado. Verifique as variáveis de ambiente.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "menta-imoveis");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Cloudinary:", data);
    throw new Error(data?.error?.message || "Erro ao enviar imagem para Cloudinary.");
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    ordem: 0,
    principal: false,
    aplicarMarcaDagua: true
  };
}

function normalizeImages(imovel: any, aplicarPadrao = true): any[] {
  const imagensRaw = Array.isArray(imovel) ? imovel : (imovel?.imagens || imovel?.images || []);
  if (!Array.isArray(imagensRaw)) return [];

  return imagensRaw.map((img: any, index: number) => {
    if (typeof img === "string") {
      return {
        url: img,
        publicId: "",
        ordem: index,
        principal: index === 0,
        aplicarMarcaDagua: aplicarPadrao
      };
    }

    return {
      url: img?.url || "",
      publicId: img?.publicId || "",
      ordem: img?.ordem ?? index,
      principal: img?.principal ?? (index === 0),
      aplicarMarcaDagua: img?.aplicarMarcaDagua ?? aplicarPadrao
    };
  }).filter((img: any) => img.url).sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

const toNumber = (value: any): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const clean = String(value || "0")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
};

export default function AdminPropertyForm() {
  const { isAdmin } = useAuth();
  const { options, loading: optionsLoading } = useOptions();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bash');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [cepLoading, setCepLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showCodeChangeModal, setShowCodeChangeModal] = useState(false);
  const [manualCode, setManualCode] = useState(false);
  const [pendingType, setPendingType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; previewUrl: string; statusText?: string; error?: string }[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const reordered = [...images];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    
    const updated = reordered.map((img, idx) => {
      if (typeof img === 'string') {
        return { url: img, aplicarMarcaDagua: false, ordem: idx };
      }
      return { ...img, ordem: idx };
    });
    
    setImages(updated);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const compressImage = async (file: File, onStatusChange: (status: string) => void): Promise<File> => {
    if (!file.type.startsWith("image/") || file.size < 400 * 1024) {
      return file;
    }
    onStatusChange("Otimizando...");
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        const maxDim = 2200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
            } else {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    
    const MAX_IMAGE_SIZE_MB = 100;
    const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

    const validFiles: File[] = [];
    for (const file of fileList) {
      console.log("Arquivo selecionado:", file.name);
      console.log("Tipo:", file.type);
      console.log("Tamanho MB:", file.size / 1024 / 1024);
      console.log("Cloudinary cloud:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      console.log("Upload preset:", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      if (!file.type.startsWith('image/')) {
        alert(`O arquivo "${file.name}" não é uma imagem válida.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        alert(`A imagem "${file.name}" ultrapassa o limite de 100MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newUploads = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      statusText: "Preparando...",
      file
    }));

    setUploadingFiles(prev => [...prev, ...newUploads.map(item => ({ id: item.id, name: item.name, previewUrl: item.previewUrl, statusText: item.statusText }))]);

    try {
      const uploadedResults = await Promise.all(
        newUploads.map(async (uploadItem, index) => {
          const { file, id } = uploadItem;
          try {
            const processedFile = await compressImage(file, (status) => {
              setUploadingFiles(prev => prev.map(item => item.id === id ? { ...item, statusText: status } : item));
            });

            const orderLabel = `Enviando ${index + 1} de ${newUploads.length}`;
            setUploadingFiles(prev => prev.map(item => item.id === id ? { ...item, statusText: orderLabel } : item));

            const uploadResult = await uploadImageToCloudinary(processedFile);
            return {
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              aplicarMarcaDagua: aplicarMarcaDagua
            };
          } catch (error: any) {
            console.error("Erro ao fazer upload da imagem:", error);
            alert(`Erro ao enviar imagem "${file.name}": ${error.message || error}`);
            return null;
          }
        })
      );

      const successUploads = uploadedResults.filter(img => img !== null) as any[];

      if (successUploads.length > 0) {
        setImages(prev => {
          const updated = [...prev];
          successUploads.forEach((img) => {
            updated.push({
              ...img,
              ordem: updated.length,
              principal: updated.length === 0
            });
          });

          const finalized = updated.map((img, idx) => ({
            ...img,
            ordem: idx,
            principal: idx === 0
          }));

          const firstUrl = finalized[0]?.url || "";
          if (firstUrl && !mainImage) {
            setMainImage(firstUrl);
          }
          return finalized;
        });

        triggerToast("Imagens enviadas com sucesso.", "success");
      }
    } catch (globalError: any) {
      console.error("Erro geral no upload das imagens:", globalError);
      triggerToast(`Erro ao processar o envio das imagens: ${globalError.message || globalError}`, "error");
    } finally {
      for (const item of newUploads) {
        URL.revokeObjectURL(item.previewUrl);
      }
      setUploadingFiles([]);
      e.target.value = "";
    }
  };

  const [aplicarMarcaDagua, setAplicarMarcaDagua] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
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
      valorTaxaLixo: 0,
      valorTaxaGas: 0,
      valorTaxaAgua: 0,
      valorTaxaLuz: 0,
      taxaLixo: 0,
      taxaGas: 0,
      taxaAgua: 0,
      taxaLuz: 0,
      fireInsurance: 0,
      totalMonthlyPrice: 0,
      valorTotalMensal: 0,
      valorGarantiaCaucao: 0,
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

        const optGarantias = garantias.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
        const optStatus = status.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
        const optContratos = contratos.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
        const optRegras = regras.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);

        // Auto-seed if empty (and admin is likely logged in since this is admin panel)
        if (optGarantias.length === 0 || optStatus.length === 0) {
           console.log("[PropertyForm] Opções de locação vazias. Sugerindo visita à tela de Configurações de Locação.");
        }

        setLeaseOptions({
          garantias: optGarantias,
          status: optStatus,
          contratos: optContratos,
          regras: optRegras
        });
      } catch (error) {
        console.error("Error fetching lease options:", error);
      }
    };
    fetchLeaseOptions();
  }, []);

  const isRented = watch('rented');
  const leaseWarrantyType = watch('leaseWarrantyType');
  useEffect(() => {
    if (isRented) {
      setValue('status', 'Alugado');
    }
  }, [isRented, setValue]);

  // Auto-calculate Total Monthly Price
  const priceLocacao = watch('priceLocacao');
  const condoFee = watch('condoFee');
  const iptu = watch('iptu');
  const fireInsurance = watch('fireInsurance');
  const valorTaxaLixo = watch('valorTaxaLixo');
  const valorTaxaGas = watch('valorTaxaGas');
  const valorTaxaAgua = watch('valorTaxaAgua');
  const valorTaxaLuz = watch('valorTaxaLuz');
  const taxes = watch('taxes'); // other fees
  const priceVenda = watch('priceVenda');
  const areaUtil = watch('usefulArea');
  const areaConstruida = watch('areaConstruida');

  useEffect(() => {
    const total = toNumber(priceLocacao) + 
                  toNumber(condoFee) + 
                  (toNumber(iptu) > 0 ? toNumber(iptu) / 12 : 0) + 
                  toNumber(valorTaxaLixo) + 
                  toNumber(valorTaxaGas) + 
                  toNumber(valorTaxaAgua) + 
                  toNumber(valorTaxaLuz) + 
                  toNumber(fireInsurance) + 
                  toNumber(taxes);
                  
    setValue('totalMonthlyPrice', total);
    setValue('valorTotalMensal', total);
  }, [priceLocacao, condoFee, iptu, valorTaxaLixo, valorTaxaGas, valorTaxaAgua, valorTaxaLuz, fireInsurance, taxes, setValue]);

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
        setInitialLoading(true);
        try {
          const propertyDoc = await getDoc(doc(db, 'imoveis', id));
          if (propertyDoc.exists()) {
            const data = propertyDoc.data();
            Object.keys(data).forEach(key => {
              setValue(key, data[key]);
            });

            // Normalize "Comprar" to "Venda" or variations
            const loadedBType = String(data.businessType || 'Venda').toLowerCase();
            let finalBType = 'Venda';
            if (loadedBType.includes('loca') && (loadedBType.includes('compr') || loadedBType.includes('vend'))) {
              finalBType = 'Venda e Locação';
            } else if (loadedBType.includes('loca')) {
              finalBType = 'Locação';
            } else {
              finalBType = 'Venda';
            }
            setValue('businessType', finalBType);
            
            // Normalize "Alugado" status for backwards compatibility
            const statusStr = String(data.status || "").toLowerCase();
            const alugado = data.imovelAlugado === true || statusStr.includes("alugado") || statusStr.includes("locado") || data.rented === true;
            setValue('rented', alugado);
            if (alugado) {
              setValue('status', 'Alugado');
            }

            // Set garbage and gas taxes with fallback for old properties
            const loadedTaxaLixo = Number(data.valorTaxaLixo ?? data.taxaLixo ?? 0);
            const loadedTaxaGas = Number(data.valorTaxaGas ?? data.taxaGas ?? 0);
            const loadedTaxaAgua = toNumber(data.valorTaxaAgua ?? data.taxaAgua ?? 0);
            const loadedTaxaLuz = toNumber(data.valorTaxaLuz ?? data.taxaLuz ?? 0);
            setValue('valorTaxaLixo', loadedTaxaLixo);
            setValue('valorTaxaGas', loadedTaxaGas);
            setValue('valorTaxaAgua', loadedTaxaAgua);
            setValue('valorTaxaLuz', loadedTaxaLuz);

            // Load quantities across all options categories supporting both legacy lists and object lists
            const loadedOptionQuantities: Record<string, number> = {};

            const parseFieldOptionsForLoading = (fieldData: any) => {
              if (!Array.isArray(fieldData)) return;
              fieldData.forEach((item: any) => {
                if (typeof item === 'string') {
                  loadedOptionQuantities[item] = shouldShowQuantity(item) ? 1 : 0;
                } else if (item && typeof item === 'object') {
                  const label = item.label || item.nome || item.value || "";
                  if (label && item.ativo !== false) {
                    loadedOptionQuantities[label] = shouldShowQuantity(label) ? Number(item.quantidade ?? 1) : 0;
                  }
                }
              });
            };

            // Parse all sections to compile optionQuantities
            parseFieldOptionsForLoading(data.ambientes);
            parseFieldOptionsForLoading(data.caracteristicasApartamento);
            parseFieldOptionsForLoading(data.caracteristicasEmpreendimento);
            parseFieldOptionsForLoading(data.lazer_objects);
            parseFieldOptionsForLoading(data.lazer);
            parseFieldOptionsForLoading(data.instalacoes_objects);
            parseFieldOptionsForLoading(data.instalacoes);
            parseFieldOptionsForLoading(data.acabamentos_objects);
            parseFieldOptionsForLoading(data.acabamentos);
            parseFieldOptionsForLoading(data.localizacao);
            parseFieldOptionsForLoading(data.locationTags);
            parseFieldOptionsForLoading(data.caracteristicas);

            // Always map flat fields to their corresponding checkbox name if flat fields exist and are > 0
            if (Number(data.dormitorios ?? data.bedrooms ?? 0) > 0) {
              loadedOptionQuantities["Dormitórios"] = Number(data.dormitorios ?? data.bedrooms ?? 0);
            }
            if (Number(data.suites ?? 0) > 0) {
              loadedOptionQuantities["Suítes"] = Number(data.suites ?? 0);
            }
            if (Number(data.lavabos ?? data.lavabo ?? 0) > 0) {
              loadedOptionQuantities["Lavabo"] = Number(data.lavabos ?? data.lavabo ?? 0);
            }
            if (Number(data.salas ?? 0) > 0) {
              loadedOptionQuantities["Número de salas"] = Number(data.salas ?? 0);
            }
            if (Number(data.vagas ?? data.garageSpaces ?? 0) > 0) {
              loadedOptionQuantities["Número de vagas"] = Number(data.vagas ?? data.garageSpaces ?? 0);
            }
            if (Number(data.bathrooms ?? 0) > 0) {
              loadedOptionQuantities["WC social"] = Number(data.bathrooms ?? 0);
            }

            setOptionQuantities(loadedOptionQuantities);

            // Transform nested object arrays back to flat string arrays for the React Hook Form checkbox checked state
            const extractStringArray = (fieldData: any): string[] => {
              if (!Array.isArray(fieldData)) return [];
              return fieldData.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') return item.label || item.nome || item.value || '';
                return '';
              }).filter(Boolean);
            };

            const loadedCaracteristicas = Array.from(new Set([
              ...extractStringArray(data.caracteristicas || []),
              ...extractStringArray(data.ambientes || []),
              ...extractStringArray(data.caracteristicasApartamento || [])
            ]));
            const loadedLazer = Array.from(new Set([
              ...extractStringArray(data.caracteristicasEmpreendimento || []),
              ...extractStringArray(data.lazer_objects || []),
              ...extractStringArray(data.lazer || [])
            ]));
            const loadedInstalacoes = Array.from(new Set([
              ...extractStringArray(data.instalacoes_objects || []),
              ...extractStringArray(data.instalacoes || [])
            ]));
            const loadedAcabamentos = Array.from(new Set([
              ...extractStringArray(data.acabamentos_objects || []),
              ...extractStringArray(data.acabamentos || [])
            ]));
            const loadedLocationTags = Array.from(new Set([
              ...extractStringArray(data.localizacao || []),
              ...extractStringArray(data.locationTags || [])
            ]));

            // Support compatibility fields for portaria
            if (data.portariaNoEdificio === true) {
              if (!loadedLazer.includes("Portaria no edifício")) {
                loadedLazer.push("Portaria no edifício");
              }
            }
            if (data.portaria24h === true || data.portaria24h === "Sim" || data.portaria24h === "true") {
              if (!loadedLazer.includes("Portaria 24 horas")) {
                loadedLazer.push("Portaria 24 horas");
              }
            }

            // Ensure Checked state based on quantities
            if (loadedOptionQuantities["Dormitórios"] > 0 && !loadedCaracteristicas.includes("Dormitórios")) loadedCaracteristicas.push("Dormitórios");
            if (loadedOptionQuantities["Suítes"] > 0 && !loadedCaracteristicas.includes("Suítes")) loadedCaracteristicas.push("Suítes");
            if (loadedOptionQuantities["Lavabo"] > 0 && !loadedCaracteristicas.includes("Lavabo")) loadedCaracteristicas.push("Lavabo");
            if (loadedOptionQuantities["Número de salas"] > 0 && !loadedCaracteristicas.includes("Número de salas")) loadedCaracteristicas.push("Número de salas");
            if (loadedOptionQuantities["Número de vagas"] > 0 && !loadedCaracteristicas.includes("Número de vagas")) loadedCaracteristicas.push("Número de vagas");
            if (loadedOptionQuantities["WC social"] > 0 && !loadedCaracteristicas.includes("WC social")) loadedCaracteristicas.push("WC social");

            // Debug logs as requested
            console.log("Imóvel carregado:", data);
            console.log("Ambientes normalizados:", loadedOptionQuantities);

            setValue('caracteristicas', Array.from(new Set(loadedCaracteristicas)));
            setValue('lazer', Array.from(new Set(loadedLazer)));
            setValue('instalacoes', Array.from(new Set(loadedInstalacoes)));
            setValue('acabamentos', Array.from(new Set(loadedAcabamentos)));
            setValue('locationTags', Array.from(new Set(loadedLocationTags)));

            setImages(normalizeImages(data));
            setVideos(data.videos || []);
            setMainImage(data.mainImage || '');
            
            // Fetch owner info - isolated try-catch to prevent trapping the main load
            try {
              const ownerDoc = await getDoc(doc(db, 'imoveis', id, 'privado', 'proprietario'));
              if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data();
                setValue('ownerName', ownerData.name);
                setValue('ownerPhone', ownerData.phone);
                setValue('ownerEmail', ownerData.email);
                setValue('ownerNotes', ownerData.notes);
              }
            } catch (ownerError: any) {
              console.warn("Imóvel carregado, mas houve erro ao carregar dados do proprietário (privado):", ownerError.message);
            }
          } else {
            console.warn("Imóvel não encontrado no Firestore ID:", id);
          }
        } catch (error) {
          console.error("Error fetching property:", error);
        } finally {
          setInitialLoading(false);
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

    const newImageItem = { url: trimmedUrl, aplicarMarcaDagua: aplicarMarcaDagua };
    const newImages = [...images, newImageItem];
    setImages(newImages);
    if (!mainImage) setMainImage(trimmedUrl);
    setImageUrl('');
    setAplicarMarcaDagua(true);
  };

  const removeImage = (urlToRemove: string) => {
    const itemUrl = urlToRemove;
    const filtered = images.filter(img => {
      const u = typeof img === 'string' ? img : img.url;
      return u !== itemUrl;
    });
    setImages(filtered);
    if (mainImage === itemUrl) {
      const firstImg = filtered[0];
      const nextMainUrl = firstImg ? (typeof firstImg === 'string' ? firstImg : firstImg.url) : '';
      setMainImage(nextMainUrl);
    }
  };

  const toggleWatermark = (urlToToggle: string) => {
    setImages(images.map(img => {
      const u = typeof img === 'string' ? img : img.url;
      if (u === urlToToggle) {
        const flag = typeof img === 'string' ? false : img.aplicarMarcaDagua;
        return { url: u, aplicarMarcaDagua: !flag };
      }
      return img;
    }));
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
    if (!isAdmin) {
      triggerToast("Usuário sem permissão administrativa.", "error");
      return;
    }
    setLoading(true);
    try {
      console.log("Cloudinary cloud:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
      console.log("Upload preset:", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      console.log("Imagens antes de salvar:", images);

      // Check for duplicate code
      const codeQ = query(collection(db, 'imoveis'), where('code', '==', data.code));
      const codeSnap = await getDocs(codeQ);
      const isDuplicate = codeSnap.docs.some(doc => doc.id !== id);
      
      if (isDuplicate) {
        alert(`Este código de imóvel (${data.code}) já está em uso. Por favor, gere ou insira outro código.`);
        setLoading(false);
        return;
      }

      if (uploadingFiles.length > 0) {
        alert("Aguarde o término do envio das imagens antes de salvar o imóvel.");
        setLoading(false);
        return;
      }

      console.log("[PropertyForm] Iniciando gravação do imóvel...");
      console.log("Salvando imóvel em:", id ? `imoveis/${id}` : "Novo documento na coleção 'imoveis'");

      // Recalculate ordem and principal based on the final images state
      const finalImagesOrdered = images.map((img, idx) => {
        const unwrapped = typeof img === 'string' ? { url: img, publicId: '', aplicarMarcaDagua: true } : img;
        return {
          url: unwrapped.url || '',
          publicId: unwrapped.publicId || '',
          ordem: idx,
          principal: (mainImage ? (unwrapped.url === mainImage) : (idx === 0)),
          aplicarMarcaDagua: unwrapped.aplicarMarcaDagua !== false
        };
      });

      console.log("Imagens normalizadas:", finalImagesOrdered);

      // Find the main image URL
      const finalMainImg = finalImagesOrdered.find(img => img.principal)?.url || (finalImagesOrdered[0]?.url || '');
      console.log("Imagem principal:", finalMainImg);
      console.log("Salvando imóvel em:", "imoveis");

      const valLixo = toNumber(data.valorTaxaLixo ?? data.taxaLixo);
      const valGas = toNumber(data.valorTaxaGas ?? data.taxaGas);
      const valAgua = toNumber(data.valorTaxaAgua ?? data.taxaAgua);
      const valLuz = toNumber(data.valorTaxaLuz ?? data.taxaLuz);
      const aluguel = toNumber(data.priceLocacao);
      const condoFee = toNumber(data.condoFee);
      const iptu = toNumber(data.iptu);
      const iptuMensal = iptu > 0 ? iptu / 12 : 0;
      const fireInsurance = toNumber(data.fireInsurance);
      const outrasTaxas = toNumber(data.taxes);

      const computedTotal = aluguel + condoFee + iptuMensal + valLixo + valGas + valAgua + valLuz + fireInsurance + outrasTaxas;

      const rawSaveBType = String(data.businessType || 'Venda').toLowerCase();
      let normalizedSaveBType = 'Venda';
      if (rawSaveBType.includes('loca') && (rawSaveBType.includes('compr') || rawSaveBType.includes('vend'))) {
        normalizedSaveBType = 'Venda e Locação';
      } else if (rawSaveBType.includes('loca')) {
        normalizedSaveBType = 'Locação';
      } else {
        normalizedSaveBType = 'Venda';
      }

      const propertyData: any = {
        ...data,
        businessType: normalizedSaveBType,
        valorTaxaLixo: valLixo,
        valorTaxaGas: valGas,
        valorTaxaAgua: valAgua,
        valorTaxaLuz: valLuz,
        taxaLixo: valLixo,
        taxaGas: valGas,
        taxaAgua: valAgua,
        taxaLuz: valLuz,
        iptu: iptu,
        valorIptu: iptu,
        valorIptuAnual: iptu,
        iptuAnual: iptu,
        iptuMensal: iptuMensal,
        valorIptuMensal: iptuMensal,
        valorTotalMensal: computedTotal,
        totalMonthlyPrice: computedTotal,
        images: finalImagesOrdered,
        imagens: finalImagesOrdered,
        mainImage: finalMainImg,
        imagemPrincipal: finalMainImg,
        videos,
        valorGarantiaCaucao: toNumber(data.valorGarantiaCaucao || 0),
        garantiaLocaticia: data.leaseWarrantyType || '',
        updatedAt: serverTimestamp(),
        destaque: data.destaque === true
      };

      const buildObjectArrayWithQuantity = (selectedNames: string[], optionsConfigList: any[]) => {
        if (!Array.isArray(selectedNames)) return [];
        return selectedNames
          .map((name: string, index: number) => {
            const label = name || "";
            const value = slugify(label);
            const isCountable = shouldShowQuantity(label);
            const qty = isCountable ? Math.max(1, Number(optionQuantities[label] ?? 1)) : 0;
            return {
              label,
              value,
              ativo: true,
              quantidade: qty,
              tipo: isCountable ? "quantidade" : "boolean",
              ordem: index
            };
          })
          .filter(Boolean);
      };

      // 1. Ambientes
      const checkedAmbientes = (data.caracteristicas || []).filter((name: string) => 
        (options.ambientes || []).some((o: any) => o.nome === name)
      );
      propertyData.ambientes = buildObjectArrayWithQuantity(checkedAmbientes, options.ambientes || []);

      // 2. Características do Apartamento
      const checkedApt = (data.caracteristicas || []).filter((name: string) => 
        (options.caracteristicasApartamento || []).some((o: any) => o.nome === name)
      );
      propertyData.caracteristicasApartamento = buildObjectArrayWithQuantity(checkedApt, options.caracteristicasApartamento || []);

      // 3. Características do Empreendimento / Lazer
      const checkedLazer = data.lazer || [];
      const opLazerList = buildObjectArrayWithQuantity(checkedLazer, options.lazer || []);
      propertyData.caracteristicasEmpreendimento = opLazerList;
      propertyData.lazer_objects = opLazerList;
      propertyData.lazer = checkedLazer; // also keep string list

      // 4. Instalações
      const checkedInst = data.instalacoes || [];
      const opInstList = buildObjectArrayWithQuantity(checkedInst, options.instalacoes || []);
      propertyData.instalacoes_objects = opInstList;
      propertyData.instalacoes = checkedInst; // also keep string list

      // 5. Acabamentos
      const checkedAcab = data.acabamentos || [];
      const opAcabList = buildObjectArrayWithQuantity(checkedAcab, options.acabamentos || []);
      propertyData.acabamentos_objects = opAcabList;
      propertyData.acabamentos = checkedAcab; // also keep string list

      // 6. Localização
      const checkedLoc = data.locationTags || [];
      const opLocList = buildObjectArrayWithQuantity(checkedLoc, options.localizacoes || []);
      propertyData.localizacao = opLocList;
      propertyData.locationTags = checkedLoc; // also keep string list

      // Keep string list of combined características for any global filters, searches, etc.
      propertyData.caracteristicas = data.caracteristicas || [];

      // Support direct legacy property fields as requested:
      // Dormitórios → dormitorios, bedrooms
      // Suítes → suites
      // Banheiros → bathrooms, banheiros
      // Vagas → vagas, garageSpaces
      // Salas → salas
      // Elevadores → elevadores
      // Piscinas → piscinas
      // Ar condicionado -> quantidadeArCondicionado
      const getQtyByName = (name: string) => {
        const isChecked = [
          ...(data.caracteristicas || []),
          ...(data.lazer || []),
          ...(data.instalacoes || []),
          ...(data.acabamentos || []),
          ...(data.locationTags || [])
        ].includes(name);
        return isChecked ? Math.max(1, Number(optionQuantities[name] ?? 1)) : 0;
      };

      const computedDormitorios = getQtyByName("Dormitórios") || getOptionQuantity(propertyData.ambientes, ["dormitorios", "dormitórios", "quartos"]);
      propertyData.dormitorios = computedDormitorios;
      propertyData.bedrooms = computedDormitorios;

      const computedSuites = getQtyByName("Suítes") || getOptionQuantity(propertyData.ambientes, ["suites", "suítes"]);
      propertyData.suites = computedSuites;

      const computedVagas = getQtyByName("Número de vagas") || getOptionQuantity(propertyData.ambientes, ["vagas", "numero_de_vagas", "vaga", "vagas privativas", "quantidade de vagas", "número de vagas"]);
      propertyData.vagas = computedVagas;
      propertyData.garageSpaces = computedVagas;

      const computedBathrooms = getQtyByName("WC social") || getOptionQuantity(propertyData.ambientes, ["banheiros", "wc social", "wc_social", "banheiro"]);
      propertyData.bathrooms = computedBathrooms;
      propertyData.banheiros = computedBathrooms;

      const computedLavabo = getQtyByName("Lavabo");
      propertyData.lavabos = computedLavabo;
      propertyData.lavabo = computedLavabo;

      const computedSalas = getQtyByName("Número de salas");
      propertyData.salas = computedSalas;

      const computedElevadores = getQtyByName("Elevador") || getQtyByName("Elevadores");
      if (computedElevadores > 0) {
        propertyData.elevadores = computedElevadores;
      }

      const computedPiscinas = getQtyByName("Piscina") || getQtyByName("Piscina adulta") || getQtyByName("Piscina infantil") || getQtyByName("Piscina privativa");
      if (computedPiscinas > 0) {
        propertyData.piscinas = computedPiscinas;
      }

      const computedArCondicionado = getQtyByName("Ar condicionado");
      if (computedArCondicionado > 0) {
        propertyData.quantidadeArCondicionado = computedArCondicionado;
      }

      const hasPortariaNoEdificio = [
        ...(data.lazer || []),
        ...(data.caracteristicasEmpreendimento || [])
      ].some(name => name === "Portaria no edifício");

      const hasPortaria24h = [
        ...(data.lazer || []),
        ...(data.caracteristicasEmpreendimento || [])
      ].some(name => name === "Portaria 24 horas" || name === "Portaria 24h");

      propertyData.portariaNoEdificio = hasPortariaNoEdificio;
      propertyData.portaria24h = hasPortaria24h;

      // Debug temporal log as requested:
      console.log("Ambientes antes de salvar:", propertyData.ambientes);
      console.log("Dormitórios calculado:", propertyData.dormitorios);
      console.log("Suítes calculado:", propertyData.suites);
      console.log("Vagas calculado:", propertyData.vagas);
      console.log("Dados finais enviados ao Firestore:", propertyData);

      const statusValue = String(data.status || "").trim();
      const checkboxRented = data.rented === true;
      const isAlugado = checkboxRented || statusValue.toLowerCase().includes("alugado") || statusValue.toLowerCase().includes("locado");

      if (isAlugado) {
        propertyData.status = "Alugado";
        propertyData.imovelAlugado = true;
        propertyData.disponivelParaVisita = false;
        propertyData.availableForVisit = "Não";
        propertyData.publicadoNoSite = true;
        propertyData.publicado = true;
        propertyData.ativo = true;
        propertyData.rented = true;
      } else {
        propertyData.imovelAlugado = false;
        propertyData.rented = false;
        if (propertyData.status === "Alugado" || propertyData.status === "Locado") {
          propertyData.status = "Disponível";
        }
        propertyData.disponivelParaVisita = data.availableForVisit !== "Não";
        propertyData.publicadoNoSite = data.publicado === true;
        propertyData.publicado = data.publicado === true;
        propertyData.ativo = data.publicado === true;
      }

      console.log("[PropertyForm] Salvando na coleção 'imoveis' do projeto:", auth.app.options.projectId);

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

      // 1. SALVAMENTO PRINCIPAL DO IMÓVEL (Must not trigger fake errors if secondary steps fail)
      if (id) {
        await updateDoc(doc(db, 'imoveis', id), propertyData);
      } else {
        propertyData.createdAt = serverTimestamp();
        propertyData.createdBy = auth.currentUser?.uid;
        const newDoc = await addDoc(collection(db, 'imoveis'), propertyData);
        propertyId = newDoc.id;
      }

      // Success in primary save!
      console.log("[PropertyForm] Sucesso real no salvamento do documento principal. ID:", propertyId);
      triggerToast("Imóvel salvo com sucesso.", "success");

      // 2. AÇÕES SECUNDÁRIAS (Wrapped in separate try-catches with safe warning logging so they never throw fake errors)

      // Secondary: Update with correct ID link after creation
      if (!id && propertyId) {
        try {
          const finalLink = `${window.location.origin}/imovel/${propertyId}`;
          console.log("[PropertyForm] Atualizando link público do imóvel...");
          await updateDoc(doc(db, 'imoveis', propertyId), { linkImovel: finalLink });
        } catch (linkError: any) {
          console.warn(
            "Erro na etapa:", 
            "atualizacao_link_imovel", 
            linkError.code || "UNKNOWN_CODE", 
            linkError.message || "Sem mensagem"
          );
        }
      }

      // Secondary: Save owner info to subcollection 'privado/proprietario'
      if (propertyId) {
        try {
          console.log("Atualizando patrimônio/proprietário em:", `imoveis/${propertyId}/privado/proprietario`);
          await setDoc(doc(db, 'imoveis', propertyId, 'privado', 'proprietario'), ownerData);
        } catch (ownerSaveError: any) {
          console.warn(
            "Erro na etapa:", 
            "gravacao_proprietario_privado", 
            ownerSaveError.code || "UNKNOWN_CODE", 
            ownerSaveError.message || "Sem mensagem"
          );
        }
      }

      // Secondary: Any extra custom logic/updates go here safely
      try {
        localStorage.removeItem('property_draft');
      } catch (draftError: any) {
        console.warn("Erro ao limpar rascunho de rascunhos:", draftError);
      }

      // Redirect user after showing the gorgeous toast shortly
      setTimeout(() => {
        navigate('/admin/imoveis');
      }, 1500);

    } catch (error: any) {
      console.error("Erro real ao salvar imóvel:", error);
      triggerToast("Erro ao salvar imóvel. Verifique o console.", "error");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const selectAll = (field: string, category: string) => {
    const allValues = (options[category] || []).map((o: any) => o.nome);
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
      priceVenda, priceLocacao, condoFee, iptu, fireInsurance, taxes
    } = values;

    const hasContent = values.title || values.shortDescription || values.fullDescription;

    if (!force && hasContent) {
      setShowReplaceModal(true);
      return;
    }

    // Helper functions for normalization and deduplication
    const getOptionNormalKey = (lbl: string): string => {
      const norm = String(lbl || "").toLowerCase().trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // remove accents
      
      if (norm.includes("dormitorio") || norm.includes("quarto")) return "dormitorios";
      if (norm.includes("suite")) return "suites";
      if (norm.includes("banheiro")) return "banheiros";
      if (norm.includes("vaga")) return "vagas";
      
      return norm;
    };

    const compileAllSelectedOptions = (): string[] => {
      const listSources = [
        values.caracteristicas,
        values.lazer,
        values.instalacoes,
        values.acabamentos,
        values.locationTags,
        values.proximities,
        // Any objects
        values.ambientes,
        values.caracteristicasApartamento,
        values.caracteristicasEmpreendimento,
        values.lazer_objects,
        values.instalacoes_objects,
        values.acabamentos_objects,
        values.localizacao
      ];

      const allItems: string[] = [];

      listSources.forEach(source => {
        if (Array.isArray(source)) {
          source.forEach(item => {
            if (!item) return;
            if (typeof item === 'string') {
              allItems.push(item);
            } else if (typeof item === 'object') {
              const label = item.label || item.nome || item.value || item.descricao;
              if (label && item.ativo !== false) {
                allItems.push(String(label));
              }
            }
          });
        }
      });

      return allItems;
    };

    // 1. Título
    let titulo = `${propertyType} `;
    if (bedrooms) {
      titulo += `${bedrooms} ${pluralizeLabel('quarto', Number(bedrooms))} `;
    }
    titulo += `${businessType === 'Locação' ? 'para locação' : 'à venda'} `;
    if (neighborhood) titulo += `no ${neighborhood} `;
    if (city) titulo += `em ${city}`;

    // 2. Descrição Curta
    let descCurta = `${propertyType} ${businessType === 'Locação' ? 'para locação' : 'à venda'} no ${neighborhood || ''}${neighborhood ? ', ' : ''}${city}/${state}, `;
    if (bedrooms) {
      const bedText = pluralizeLabel('quarto', Number(bedrooms));
      descCurta += `com ${bedrooms} ${bedText}, `;
    }
    if (suites) {
      const suiteText = pluralizeLabel('suíte', Number(suites));
      descCurta += `${suites} ${suiteText}, `;
    }
    if (garageSpaces) {
      const garageText = pluralizeLabel('vaga', Number(garageSpaces));
      descCurta += `${garageSpaces} ${garageText} `;
    }
    descCurta += `e excelente localização.`;

    // 3. Descrição Detalhada
    let descCompleta = "";
    if (businessType === 'Locação') {
      descCompleta = `Esta ${propertyType.toLowerCase()} para locação está localizada no bairro ${neighborhood || 'Bairro'} e oferece uma excelente opção para quem busca praticidade, conforto e boa localização.\n\n`;
      descCompleta += `O imóvel possui `;
      if (bedrooms) {
        const bedText = pluralizeLabel('quarto', Number(bedrooms));
        descCompleta += `${bedrooms} ${bedText}, `;
      }
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
      if (bedrooms) {
        const bedText = pluralizeLabel('quarto', Number(bedrooms));
        descCompleta += `${bedrooms} ${bedText}, `;
      }
      if (suites) {
        const suiteText = pluralizeLabel('suíte', Number(suites));
        descCompleta += `sendo ${suites} ${suiteText}, `;
      }
      if (bathrooms) {
        const bathText = pluralizeLabel('banheiro', Number(bathrooms));
        descCompleta += `${bathrooms} ${bathText}, `;
      }
      if (garageSpaces) {
        const garageText = pluralizeLabel('vaga', Number(garageSpaces));
        descCompleta += `${garageSpaces} ${garageText} de garagem `;
      }
      if (usefulArea) descCompleta += `e ${usefulArea}m² de área útil. `;
      descCompleta += `Ambientes bem distribuídos para oferecer conforto e praticidade no dia a dia.\n\n`;
      
      if (priceVenda) descCompleta += `Valor de investimento: ${formatCurrency(priceVenda)}\n\n`;
    }

    // Build the Differentials List
    const differentials: string[] = [];
    const seenKeys = new Set<string>();

    // Prioritize main fields
    const mainItems: { label: string; qty: number; key: string }[] = [];
    if (Number(bedrooms || 0) > 0) {
      mainItems.push({ label: "Dormitório", qty: Number(bedrooms), key: "dormitorios" });
    }
    if (Number(suites || 0) > 0) {
      mainItems.push({ label: "Suíte", qty: Number(suites), key: "suites" });
    }
    if (Number(bathrooms || 0) > 0) {
      mainItems.push({ label: "Banheiro", qty: Number(bathrooms), key: "banheiros" });
    }
    if (Number(garageSpaces || 0) > 0) {
      mainItems.push({ label: "Vaga de garagem", qty: Number(garageSpaces), key: "vagas" });
    }

    mainItems.forEach(item => {
      seenKeys.add(item.key);
      const text = formatOptionWithQuantity({ label: item.label, quantidade: item.qty });
      if (text) {
        differentials.push(`- ${text}`);
      }
    });

    // Add all other checked/filled options
    const checkedOptions = compileAllSelectedOptions();
    checkedOptions.forEach(optName => {
      const normKey = getOptionNormalKey(optName);
      if (!seenKeys.has(normKey)) {
        seenKeys.add(normKey);
        const text = formatOptionWithQuantity(optName, optionQuantities);
        // Exclude empty, zero-valued or weird strings from being added
        if (text && !text.startsWith("0 ")) {
          differentials.push(`- ${text}`);
        }
      }
    });

    if (differentials.length > 0) {
      descCompleta += `Diferenciais do imóvel:\n${differentials.join('\n')}\n\n`;
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

  const slugify = (text: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const OptionCardWithQuantity = ({ 
    fieldName, 
    optionName, 
    colorTheme = 'gold' 
  }: { 
    fieldName: string; 
    optionName: string; 
    colorTheme?: 'gold' | 'primary-green' 
  }) => {
    const currentSelections = watch(fieldName) || [];
    const isChecked = currentSelections.includes(optionName);
    const colorClass = colorTheme === 'gold' ? 'gold' : 'primary-green';
    
    const borderCheckedClass = colorTheme === 'gold' 
      ? 'border-gold bg-gold/5' 
      : 'border-primary-green bg-primary-green/5';
      
    const bgCheckedClass = colorTheme === 'gold' 
      ? 'bg-gold border-gold text-primary-black' 
      : 'bg-primary-green border-primary-green text-white';
      
    const focusRingClass = colorTheme === 'gold' 
      ? 'focus:ring-gold/30 focus:border-gold' 
      : 'focus:ring-primary-green/30 focus:border-primary-green';

    const handleToggle = (checked: boolean) => {
      let updatedSelection = [...currentSelections];
      const isCountable = shouldShowQuantity(optionName);
      if (checked) {
        if (!updatedSelection.includes(optionName)) {
          updatedSelection.push(optionName);
        }
        setOptionQuantities(prev => ({
          ...prev,
          [optionName]: isCountable ? (prev[optionName] > 0 ? prev[optionName] : 1) : 0
        }));
      } else {
        updatedSelection = updatedSelection.filter(item => item !== optionName);
        setOptionQuantities(prev => {
          const u = { ...prev };
          delete u[optionName];
          return u;
        });
      }
      setValue(fieldName, updatedSelection, { shouldDirty: true });
    };

    return (
      <div 
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isChecked ? borderCheckedClass : 'border-gray-100 hover:border-gray-205 bg-gray-50/10'
        }`}
      >
        <div 
          onClick={() => handleToggle(!isChecked)}
          className="flex items-center gap-3 cursor-pointer group flex-grow py-1 select-none"
        >
          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
            isChecked ? bgCheckedClass : `bg-white border-gray-300 group-hover:border-${colorClass}`
          }`}>
            {isChecked && <Check size={14} strokeWidth={4} />}
          </div>
          <span className={`text-sm font-medium transition-colors ${
            isChecked ? 'text-primary-black' : 'text-gray-650 group-hover:text-primary-black'
          }`}>
            {optionName}
          </span>
        </div>

        {isChecked && shouldShowQuantity(optionName) && (
          <div className="flex items-center gap-2 pl-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Qtd:</span>
            <input
              type="number"
              min="1"
              value={optionQuantities[optionName] ?? 1}
              onChange={(e) => {
                const valStr = e.target.value;
                if (valStr === '') {
                  setOptionQuantities(prev => ({ ...prev, [optionName]: 1 }));
                } else {
                  const valNum = Math.max(1, parseInt(valStr) || 1);
                  setOptionQuantities(prev => ({ ...prev, [optionName]: valNum }));
                }
              }}
              className={`w-12 h-8 text-center text-sm font-bold bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${focusRingClass}`}
            />
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    // Don't block the whole screen
  // if (optionsLoading) return <div className="py-20 text-center animate-pulse">Carregando opções dinâmicas...</div>;

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
                {(() => {
                  const items = (options.tiposNegocio || []).filter(o => o.ativo).map(o => {
                    const normName = o.nome === 'Comprar' ? 'Venda' : o.nome;
                    return { id: o.id, nome: normName };
                  });
                  const uniqueMap = new Map();
                  items.forEach(item => uniqueMap.set(item.nome, item));
                  return Array.from(uniqueMap.values()).map(o => (
                    <option key={o.id} value={o.nome}>{o.nome}</option>
                  ));
                })()}
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

            {(() => {
              const businessType = watch('businessType');
              const isTypeLocacao = businessType === 'Locação' || businessType === 'Venda e Locação';
              const isTypeVenda = businessType === 'Venda' || businessType === 'Venda e Locação';

              return (
                <>
                  {isTypeVenda && (
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

                  {isTypeLocacao && (
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
                  )}

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
                    <label className="text-sm font-bold text-gray-700">Valor do IPTU Anual (R$)</label>
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
                    {toNumber(iptu) > 0 && (
                      <p className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-lg p-2 mt-1">
                        IPTU Mensal calculado: {formatCurrency(toNumber(iptu) / 12)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-extrabold text-[#a27e1f]">Taxa de Lixo (R$)</label>
                    <Controller
                      name="valorTaxaLixo"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input-field font-semibold bg-amber-50/20 border-amber-200"
                          value={maskCurrency(field.value ?? '')}
                          onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                          placeholder="0,00"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-extrabold text-[#a27e1f]">Taxa de Gás (R$)</label>
                    <Controller
                      name="valorTaxaGas"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input-field font-semibold bg-amber-50/20 border-amber-200"
                          value={maskCurrency(field.value ?? '')}
                          onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                          placeholder="0,00"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-extrabold text-[#a27e1f]">Taxa de Água (R$)</label>
                    <Controller
                      name="valorTaxaAgua"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input-field font-semibold bg-amber-50/20 border-amber-200"
                          value={maskCurrency(field.value ?? '')}
                          onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                          placeholder="0,00"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-extrabold text-[#a27e1f]">Taxa de Luz (R$)</label>
                    <Controller
                      name="valorTaxaLuz"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input-field font-semibold bg-amber-50/20 border-amber-200"
                          value={maskCurrency(field.value ?? '')}
                          onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                          placeholder="0,00"
                        />
                      )}
                    />
                  </div>

                  {isTypeLocacao && (
                    <>
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
                              readOnly
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

                      {(leaseWarrantyType === 'Caução' || leaseWarrantyType === 'Depósito Caução' || leaseWarrantyType === 'Depósito antecipado') && (
                        <div className="space-y-2">
                          <label id="lbl-valorGarantiaCaucao" className="text-sm font-bold text-[#D4AF37]">Valor da Garantia Caução (R$)</label>
                          <Controller
                            name="valorGarantiaCaucao"
                            control={control}
                            render={({ field }) => (
                              <input
                                id="valorGarantiaCaucao"
                                type="text"
                                className="input-field font-bold bg-amber-50 border-amber-200"
                                value={maskCurrency(field.value ?? '')}
                                onChange={(e) => field.onChange(parseCurrencyToNumber(e.target.value))}
                                placeholder="0,00"
                              />
                            )}
                          />
                        </div>
                      )}

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
                </>
              );
            })()}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-2">
                {(options.localizacoes || []).filter(o => o.ativo).map((tag, idx) => (
                  <OptionCardWithQuantity 
                    key={tag.id || `locat-${tag.nome}-${idx}`}
                    fieldName="locationTags"
                    optionName={tag.nome}
                    colorTheme="gold"
                  />
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
            
            <div className="space-y-10">
              {/* Seção 1: Ambientes */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h4 className="font-bold text-xl text-primary-black">Ambientes</h4>
                    <p className="text-sm text-gray-500">Marque os ambientes físicos presentes no imóvel.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        const allAmb = (options.ambientes || []).map((o: any) => o.nome);
                        const current = watch('caracteristicas') || [];
                        const merged = Array.from(new Set([...current, ...allAmb]));
                        setValue('caracteristicas', merged);
                        setOptionQuantities(prev => {
                          const updated = { ...prev };
                          allAmb.forEach(name => {
                            if (!updated[name] || updated[name] < 1) {
                              updated[name] = 1;
                            }
                          });
                          return updated;
                        });
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gold/10 hover:border-gold transition-colors"
                    >
                      Selecionar Todos
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const allAmb = (options.ambientes || []).map((o: any) => o.nome);
                        const current = watch('caracteristicas') || [];
                        const remaining = current.filter((item: string) => !allAmb.includes(item));
                        setValue('caracteristicas', remaining);
                        setOptionQuantities(prev => {
                          const updated = { ...prev };
                          allAmb.forEach(name => {
                            delete updated[name];
                          });
                          return updated;
                        });
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gold/10 shadow-sm hover:border-gold transition-colors"
                    >
                      Limpar Ambientes
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {(options.ambientes || []).map((opt: any, idx: number) => (
                    <OptionCardWithQuantity 
                      key={opt.id || `amb-${opt.nome}-${idx}`} 
                      fieldName="caracteristicas"
                      optionName={opt.nome}
                      colorTheme="gold"
                    />
                  ))}
                </div>
              </div>

              {/* Seção 2: Características do Apartamento */}
              <div className="space-y-6 pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h4 className="font-bold text-xl text-primary-black">Características do Apartamento</h4>
                    <p className="text-sm text-gray-500">Atributos e diferenciais exclusivos da unidade.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        const allApt = (options.caracteristicasApartamento || []).map((o: any) => o.nome);
                        const current = watch('caracteristicas') || [];
                        const merged = Array.from(new Set([...current, ...allApt]));
                        setValue('caracteristicas', merged);
                        setOptionQuantities(prev => {
                          const updated = { ...prev };
                          allApt.forEach(name => {
                            if (!updated[name] || updated[name] < 1) {
                              updated[name] = 1;
                            }
                          });
                          return updated;
                        });
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gold/10 hover:border-gold transition-colors"
                    >
                      Selecionar Todas
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const allApt = (options.caracteristicasApartamento || []).map((o: any) => o.nome);
                        const current = watch('caracteristicas') || [];
                        const remaining = current.filter((item: string) => !allApt.includes(item));
                        setValue('caracteristicas', remaining);
                        setOptionQuantities(prev => {
                          const updated = { ...prev };
                          allApt.forEach(name => {
                            delete updated[name];
                          });
                          return updated;
                        });
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gold/10 shadow-sm hover:border-gold transition-colors"
                    >
                      Limpar Características
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {(options.caracteristicasApartamento || []).map((opt: any, idx: number) => (
                    <OptionCardWithQuantity 
                      key={opt.id || `apt-${opt.nome}-${idx}`} 
                      fieldName="caracteristicas"
                      optionName={opt.nome}
                      colorTheme="gold"
                    />
                  ))}
                </div>
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
                  onClick={() => {
                    const allInst = (options.instalacoes || []).map((o: any) => o.nome);
                    setValue('instalacoes', allInst);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allInst.forEach(name => {
                        if (!updated[name] || updated[name] < 1) {
                          updated[name] = 1;
                        }
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const allInst = (options.instalacoes || []).map((o: any) => o.nome);
                    setValue('instalacoes', []);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allInst.forEach(name => {
                        delete updated[name];
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.instalacoes || []).map((opt, idx) => (
                <OptionCardWithQuantity 
                  key={opt.id || `inst-${opt.nome}-${idx}`} 
                  fieldName="instalacoes"
                  optionName={opt.nome}
                  colorTheme="primary-green"
                />
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
                  onClick={() => {
                    const allAcab = (options.acabamentos || []).map((o: any) => o.nome);
                    setValue('acabamentos', allAcab);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allAcab.forEach(name => {
                        if (!updated[name] || updated[name] < 1) {
                          updated[name] = 1;
                        }
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const allAcab = (options.acabamentos || []).map((o: any) => o.nome);
                    setValue('acabamentos', []);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allAcab.forEach(name => {
                        delete updated[name];
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.acabamentos || []).map((opt, idx) => (
                <OptionCardWithQuantity 
                  key={opt.id || `acab-${opt.nome}-${idx}`} 
                  fieldName="acabamentos"
                  optionName={opt.nome}
                  colorTheme="gold"
                />
              ))}
            </div>
          </div>
        );
      case 'leis':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="font-bold text-xl text-primary-black">Características do Empreendimento</h4>
                <p className="text-sm text-gray-500">Áreas de lazer, conveniência e infraestrutura do condomínio.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    const allLazer = (options.lazer || []).map((o: any) => o.nome);
                    setValue('lazer', allLazer);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allLazer.forEach(name => {
                        if (!updated[name] || updated[name] < 1) {
                          updated[name] = 1;
                        }
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Selecionar tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const allLazer = (options.lazer || []).map((o: any) => o.nome);
                    setValue('lazer', []);
                    setOptionQuantities(prev => {
                      const updated = { ...prev };
                      allLazer.forEach(name => {
                        delete updated[name];
                      });
                      return updated;
                    });
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {(options.lazer || []).map((opt, idx) => (
                <OptionCardWithQuantity 
                  key={opt.id || `lazer-${opt.nome}-${idx}`} 
                  fieldName="lazer"
                  optionName={opt.nome}
                  colorTheme="primary-green"
                />
              ))}
            </div>
          </div>
        );
      case 'img':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100">
               {/* Seção 1: Upload de arquivos */}
               <div className="space-y-4">
                 <h4 className="font-bold text-primary-black flex items-center gap-2">
                   <UploadCloud size={20} className="text-gold" /> Enviar Fotos do Computador
                 </h4>
                 <p className="text-xs text-gray-500 font-medium">
                   Selecione uma ou mais fotos (JPG, PNG, WEBP) de até 100MB por foto para fazer o upload automático para o Cloudinary.
                 </p>
                 
                 <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 hover:border-gold rounded-2xl cursor-pointer bg-white transition-all hover:bg-gold/5 group">
                   <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                     <Upload size={28} className="text-gray-400 group-hover:text-gold mb-2 transition-colors" />
                     <p className="text-xs text-gray-700 font-bold group-hover:text-gold transition-colors">
                       Clique para selecionar fotos
                     </p>
                     <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                       Arraste e solte ou escolha arquivos
                     </p>
                   </div>
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="image/png, image/jpeg, image/jpg, image/webp" 
                     multiple 
                     onChange={handleFileChange}
                   />
                 </label>
               </div>

               {/* Seção 2: URL Manual */}
               <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
                 <div>
                   <h4 className="font-bold text-primary-black flex items-center gap-2">
                     <ImageIcon size={20} className="text-gold" /> Adicionar Imagem por URL
                   </h4>
                   <p className="text-xs text-gray-500 font-medium">
                     Insira a URL direta da imagem (ex: Postimage, Imgur).
                   </p>
                   
                   <div className="mt-3 flex flex-col space-y-2">
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
                     
                     <div className="flex items-center gap-2 pt-1 pl-1">
                       <input 
                         type="checkbox" 
                         id="aplicarMarcaDaguaCheck"
                         checked={aplicarMarcaDagua}
                         onChange={(e) => setAplicarMarcaDagua(e.target.checked)}
                         className="rounded border-gray-300 text-gold focus:ring-gold focus:ring-offset-0 h-4 w-4"
                       />
                       <label htmlFor="aplicarMarcaDaguaCheck" className="text-xs font-black uppercase text-gray-600 tracking-wider cursor-pointer select-none">
                         Aplicar marca d'água ao adicionar
                       </label>
                     </div>
                   </div>
                 </div>

                 <button 
                   type="button"
                   onClick={addImageUrl}
                   className="btn-gold !px-8 h-[46px] w-full mt-4 flex items-center justify-center gap-2 shadow-sm"
                   disabled={!imageUrl || !isValidImageUrl(imageUrl)}
                 >
                   <Plus size={18} /> Adicionar URL
                 </button>
               </div>
            </div>

            {imageUrl && isValidImageUrl(imageUrl) && (
              <div className="p-4 bg-white rounded-xl border border-gray-100 max-w-xs shadow-sm shadow-gold/5">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pré-visualização da URL:</p>
                 <SafeImage src={imageUrl} className="w-full aspect-video rounded-lg shadow-sm" />
              </div>
            )}

            {(images.length > 0 || uploadingFiles.length > 0) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50/50 py-2 px-4 rounded-xl border border-gray-100/60">
                  <span className="text-xs font-extrabold text-gold uppercase tracking-widest">Galeria de Fotos ({images.length})</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">💡 Arraste as fotos para mudar a ordem de exibição</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {images.map((img, idx) => {
                    const unwrapped = typeof img === 'string' ? { url: img, aplicarMarcaDagua: true } : img;
                    const url = unwrapped.url;
                    const isWatermarked = unwrapped.aplicarMarcaDagua !== false;
                    
                    return (
                      <div 
                        key={`${url}-${idx}`} 
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={`relative rounded-xl overflow-hidden group aspect-square border-2 transition-all cursor-move select-none ${draggedIndex === idx ? 'opacity-45 scale-95 border-dashed border-gold/40' : ''} ${mainImage === url ? 'border-gold shadow-lg shadow-gold/25 scale-[1.03]' : 'border-gray-100 hover:border-gold/50'}`}
                      >
                        <SafeImage 
                          src={url} 
                          alt={`Preview ${idx}`} 
                          className="w-full h-full object-cover" 
                        />
                        
                        {/* Watermark Indicating Border */}
                        {isWatermarked && (
                          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-[3px] border-emerald-500/60 rounded-xl" />
                        )}

                        {/* Order Number Indicator */}
                        <div className="absolute top-2 right-2 bg-primary-black/80 backdrop-blur-sm text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                          {idx + 1}
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg">
                           <button 
                             type="button" 
                             onClick={() => setMainImage(url)}
                             className="p-1.5 bg-gold text-primary-black rounded-lg hover:scale-110 transition-transform"
                             title="Definir como principal"
                           >
                             <Sparkles size={14} />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => toggleWatermark(url)}
                             className={`p-1.5 rounded-lg hover:scale-110 transition-transform ${isWatermarked ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700'}`}
                             title={isWatermarked ? "Remover Marca d'Água" : "Aplicar Marca d'Água"}
                           >
                             <FileText size={14} />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => removeImage(url)}
                             className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform"
                             title="Excluir"
                           >
                             <X size={14} />
                           </button>
                        </div>

                        {mainImage === url && (
                          <div className="absolute top-2 left-2 bg-gold text-primary-black text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase z-10 shadow">
                            PRINCIPAL
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow z-10 hover:bg-black/95 transition-all">
                          <input 
                            type="checkbox" 
                            id={`wm-check-${idx}`}
                            checked={isWatermarked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleWatermark(url);
                            }}
                            className="rounded border-gray-400 text-gold focus:ring-0 focus:ring-offset-0 h-3 w-3 bg-transparent cursor-pointer"
                          />
                          <label htmlFor={`wm-check-${idx}`} className="cursor-pointer select-none text-[8px]">
                            Marca d'água
                          </label>
                        </div>

                        {isWatermarked && (
                          <div className="absolute bottom-2 right-2 bg-emerald-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow z-10">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            M. Dagua
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {uploadingFiles.map((file) => (
                    <div key={file.id} className="relative rounded-xl overflow-hidden aspect-square border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-3 bg-gray-50/50 animate-pulse select-none">
                      <img src={file.previewUrl} alt="Uploading preview" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]" />
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className="w-9 h-9 rounded-full border-4 border-gold border-t-transparent animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-black bg-white/80 px-2 py-0.5 rounded shadow">{file.statusText || "Enviando..."}</span>
                      </div>
                    </div>
                  ))}
                </div>
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

  if (initialLoading && id) return (
    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
      <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-medium">Carregando dados do patrimônio...</p>
    </div>
  );

  const propertyLink = id ? `${window.location.origin}/imovel/${id}` : '';

  if (id) {
    console.log("Gerando link público do imóvel:");
    console.log("Imóvel ID:", id);
    console.log("Código:", watch('code') || watch('codigo') || watch('codigoImovel') || '');
    console.log("URL pública:", propertyLink);
  }

  const copyToClipboard = async (text: string) => {
    if (!id) {
      triggerToast("ID do imóvel não encontrado.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      triggerToast("Link copiado com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao copiar link:", err);
      triggerToast("Erro ao copiar o link.", "error");
    }
  };

  const handleOpenLink = () => {
    if (!id) {
      triggerToast("ID do imóvel não encontrado.", "error");
      return;
    }
    window.open(propertyLink, "_blank");
  };

  const shareWhatsApp = () => {
    if (!id) {
      triggerToast("ID do imóvel não encontrado.", "error");
      return;
    }
    const message = `Olá! Confira este imóvel: ${propertyLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white backdrop-blur-md shadow-2xl border"
            style={{
              backgroundColor: toast.type === 'success' ? '#14532d' : '#7f1d1d',
              borderColor: toast.type === 'success' ? '#16a34a' : '#b91c1c',
            }}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-300" /> : <X size={20} className="text-red-300" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        onSubmit={handleSubmit(onSubmit, (formErrors) => {
          console.warn("Erros de validação do formulário:", formErrors);
          triggerToast("Verifique os campos obrigatórios em vermelho antes de salvar.", "error");
          setShowConfirmModal(false);
          setLoading(false);
        })} 
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
                 onClick={handleOpenLink}
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
    </>
  );
}

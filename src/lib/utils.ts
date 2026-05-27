import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | undefined | null) {
  if (value === undefined || value === null || value === '') return 'Sob Consulta';
  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(val)) return 'Sob Consulta';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export function maskCurrency(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return "";
  
  if (typeof value === 'number') {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  
  const numberValue = parseInt(digits, 10) / 100;
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
}

export function parseCurrencyToNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  
  return parseInt(digits, 10) / 100;
}

export function isValidImageUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

/**
 * Validates if a property is complete enough to be shown to the public.
 */
export function isValidPublicProperty(p: any): boolean {
  if (!p || typeof p !== 'object') return false;

  const hasId = !!p.id;
  const isPublished = p.publicado === true || p.publicadoNoSite === true || p.ativo === true;
  const isExcluded = p.excluido === true || String(p.status || "").toLowerCase().includes("excluid");

  const isValid = hasId && isPublished && !isExcluded;

  if (!isValid && p.id) {
    console.warn(`[Property Validation] Imóvel ${p.id} INVÁLIDO. Motivos:`, {
       hasId,
       isPublished,
       isExcluded,
       status: p.status,
       publicado: p.publicado,
       publicadoNoSite: p.publicadoNoSite,
       ativo: p.ativo
    });
  }

  return isValid;
}

/**
 * Ensures a URL is valid and public
 */
export function isValidPublicImageUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Unwraps an image which can be a string or an object with url and optional watermark flag
 */
export function unwrapImage(img: any): { url: string; aplicarMarcaDagua: boolean } {
  if (!img) return { url: "", aplicarMarcaDagua: false };
  if (typeof img === "string") {
    return { url: img, aplicarMarcaDagua: true };
  }
  if (typeof img === "object") {
    return {
      url: img.url || img.imageUrl || img.imagem || "",
      aplicarMarcaDagua: img.aplicarMarcaDagua !== false && img.watermark !== false
    };
  }
  return { url: "", aplicarMarcaDagua: false };
}

/**
 * Safely extracts the best image for a property
 */
export function getPropertyImage(p: any): string {
  if (!p) return "";
  
  const possible = [
    p.mainImage,
    p.imagemPrincipal,
    p.fotoPrincipal,
    p.imageUrl,
    Array.isArray(p.images) ? p.images[0] : null,
    Array.isArray(p.imagens) ? p.imagens[0] : null,
    Array.isArray(p.fotos) ? p.fotos[0] : null
  ];

  const found = possible.find(item => {
    if (!item) return false;
    const unwrapped = unwrapImage(item);
    return isValidPublicImageUrl(unwrapped.url);
  });
  
  return getSafeImageUrl(found);
}

/**
 * Robust image fallback logic for external URLs (CORS/Broken)
 */
export function getSafeImageUrl(url: any, fallback = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200"): string {
  if (!url) return fallback;
  const unwrapped = unwrapImage(url);
  const cleanUrl = (unwrapped.url || "").trim();
  
  // Requirement: Must start with https:// or /
  if (!cleanUrl.startsWith("https://") && !cleanUrl.startsWith("/")) {
    return fallback;
  }
  
  return cleanUrl;
}

/**
 * Cleans a phone number for WhatsApp links (digits only)
 */
export function cleanPhoneForWhatsapp(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && !cleaned.startsWith("55")) {
    return cleaned; // Should use without 55 if calling code is already handled or add 55
  }
  return cleaned;
}

export function safeText(value: any, fallback = '---'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'object') {
    if (value.nome) return String(value.nome);
    if (value.label) return String(value.label);
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  const str = String(value).trim();
  if (str === 'undefined' || str === 'null' || str === 'NaN' || str === '[object Object]') return fallback;
  return str;
}

export function safeMoney(value: any, fallback = 'R$ 0,00'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d,-]/g, '').replace(',', '.'));
  if (isNaN(num)) return fallback;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

export function safeDate(value: any, fallback = '---'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const str = String(value).trim();
  if (str === 'undefined' || str === 'null' || str === 'NaN' || str === '[object Object]') return fallback;
  try {
    // If it's already structured as dd/mm/yyyy or equivalent, return as is
    if (str.includes('/') && str.split('/').length === 3) {
      return str;
    }
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = str.split('-');
      return `${day}/${month}/${year}`;
    }
    // Check if we can parse it
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return str;
  }
}

export function isImovelAlugado(imovel: any): boolean {
  if (!imovel) return false;
  const statusStr = String(imovel.status || "").toLowerCase();
  return (
    imovel.imovelAlugado === true ||
    imovel.rented === true ||
    statusStr.includes("alugado") ||
    statusStr.includes("locado")
  );
}

export function normalizeTipoNegocio(tipo: any): string {
  const value = String(tipo || "").toLowerCase();

  if (
    (value.includes("venda") && value.includes("loca")) ||
    value.includes("ambos")
  ) {
    return "Venda e Locação";
  }

  if (value.includes("compr") || value.includes("vend")) {
    return "Venda";
  }

  if (value.includes("loca") || value.includes("alug")) {
    return "Locação";
  }

  return "";
}

export function normalizeText(text: any): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function extractBedrooms(search: string): number | null {
  const text = normalizeText(search);

  const patterns = [
    /(\d+)\s*(quarto|quartos)/,
    /(\d+)\s*(dormitorio|dormitorios)/,
    /(\d+)\s*(dorm|dorms)/,
    /(\d+)\s*(qto|qtos)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

export function extractSuites(search: string): number | null {
  const text = normalizeText(search);

  const patterns = [
    /(\d+)\s*(suite|suites)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

export function extractVagas(search: string): number | null {
  const text = normalizeText(search);

  const patterns = [
    /(\d+)\s*(vaga|vagas)/,
    /(\d+)\s*(garagem|garagens)/,
    /(\d+)\s*(vaga de garagem|vagas de garagem)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

export function matchesQuickSearch(imovel: any, searchTerm: string): boolean {
  const search = normalizeText(searchTerm);

  if (!search) return true;

  const bedrooms = extractBedrooms(search);
  const suites = extractSuites(search);
  const vagas = extractVagas(search);

  const tipoImovel = normalizeText(imovel.tipoImovel || imovel.propertyType);
  const tipoNegocio = normalizeText(imovel.tipoNegocio || imovel.businessType);
  const titulo = normalizeText(imovel.titulo || imovel.title || imovel.tituloAnuncio || imovel.nome);
  const codigo = normalizeText(imovel.codigo || imovel.code || imovel.codigoImovel || imovel.id);
  const bairro = normalizeText(imovel.bairro || imovel.neighborhood);
  const cidade = normalizeText(imovel.cidade || imovel.city);
  const descricao = normalizeText(imovel.descricao || imovel.descricaoDetalhada || imovel.description);

  const caracteristicasStr = Array.isArray(imovel.caracteristicas)
    ? imovel.caracteristicas.map((c: any) => normalizeText(c.nome || c.label || c)).join(" ")
    : typeof imovel.caracteristicas === 'string'
      ? normalizeText(imovel.caracteristicas)
      : '';

  const ambientesStr = Array.isArray(imovel.ambientes)
    ? imovel.ambientes.map((a: any) => normalizeText(a.nome || a.label || a.descricao || a)).join(" ")
    : typeof imovel.ambientes === 'string'
      ? normalizeText(imovel.ambientes)
      : '';

  const searchableText = [
    titulo,
    codigo,
    tipoImovel,
    tipoNegocio,
    bairro,
    cidade,
    descricao,
    caracteristicasStr,
    ambientesStr
  ].join(" ");

  if (bedrooms !== null) {
    const imovelDormitorios = Number(imovel.dormitorios || imovel.quartos || imovel.bedrooms || 0);

    const ambientesDormitorios = Array.isArray(imovel.ambientes)
      ? imovel.ambientes.find((item: any) => {
          const label = normalizeText(item.label || item.value || item);
          return label.includes("dormitorio") || label.includes("quarto");
        })
      : null;

    const qtdAmbientesDormitorios = Number(ambientesDormitorios?.quantidade || 0);

    const qtdFinal = imovelDormitorios || qtdAmbientesDormitorios;

    if (qtdFinal !== bedrooms) return false;
  }

  if (suites !== null) {
    const qtdSuites = Number(imovel.suites || imovel.banheirosSuites || 0);
    if (qtdSuites !== suites) return false;
  }

  if (vagas !== null) {
    const qtdVagas = Number(imovel.vagas || imovel.numeroVagas || imovel.garageSpaces || imovel.vagasGaragem || 0);
    if (qtdVagas !== vagas) return false;
  }

  const words = search
    .split(" ")
    .filter(word => word.length > 1)
    .filter(word => !["com", "de", "da", "do", "no", "na", "em"].includes(word))
    .filter(word => !/^\d+$/.test(word))
    .filter(word => !["quarto", "quartos", "dormitorio", "dormitorios", "dorm", "dorms", "suite", "suites", "vaga", "vagas"].includes(word));

  const expandSynonyms = (word: string): string[] => {
    if (['apartamento', 'apto', 'ap', 'ape'].includes(word)) {
      return ['apartamento', 'apto', 'ap', 'ape'];
    }
    if (['casa', 'sobrado'].includes(word)) {
      return ['casa', 'sobrado'];
    }
    if (['cobertura', 'duplex'].includes(word)) {
      return ['cobertura', 'duplex'];
    }
    if (['venda', 'vender', 'comprar', 'compra'].includes(word)) {
      return ['venda', 'vender', 'comprar', 'compra'];
    }
    if (['locacao', 'aluguel', 'alugar'].includes(word)) {
      return ['locacao', 'aluguel', 'alugar'];
    }
    return [word];
  };

  return words.every(word => {
    const synonyms = expandSynonyms(word);
    return synonyms.some(syn => searchableText.includes(syn));
  });
}


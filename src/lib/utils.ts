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

export function isMockProperty(p: any): boolean {
  if (!p) return true;
  const idStr = String(p.id || "").toLowerCase();
  const codeStr = String(p.codigo || p.code || p.codigoImovel || "").toLowerCase();
  const titleStr = String(p.titulo || p.title || p.tituloAnuncio || p.nome || "").toLowerCase();

  const mockKeywords = [
    "mock",
    "demo",
    "sample",
    "fallback",
    "teste",
    "test",
    "exemplo",
    "apartamento alto padrao em balneario camboriu",
    "apartamento alto padrão em balneário camboriú",
    "menta001"
  ];

  if (mockKeywords.some(kw => idStr.includes(kw) || codeStr.includes(kw) || titleStr.includes(kw))) {
    return true;
  }

  const resolvedTitle = String(p.titulo || p.title || p.tituloAnuncio || p.nome || "").trim();
  if (!resolvedTitle) {
    return true;
  }

  return false;
}

/**
 * Validates if a property is complete enough to be shown to the public.
 */
export function isValidPublicProperty(p: any): boolean {
  if (!p || typeof p !== 'object') return false;

  const hasId = !!p.id;
  const isPublished = p.publicado === true || p.publicadoNoSite === true || p.ativo === true;
  const isExcluded = p.excluido === true || String(p.status || "").toLowerCase().includes("excluid");
  const isMock = isMockProperty(p);

  const isValid = hasId && isPublished && !isExcluded && !isMock;

  if (!isValid && p.id) {
    console.warn(`[Property Validation] Imóvel ${p.id} INVÁLIDO. Motivos:`, {
       hasId,
       isPublished,
       isExcluded,
       isMock,
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

export function pluralizeLabel(label: string, quantidade: number): string {
  if (!label) return "";
  const text = String(label || "").toLowerCase().trim();

  // Mapping singular/plural pairs for standard options
  const map: Record<string, [string, string]> = {
    "dormitório": ["dormitório", "dormitórios"],
    "dormitórios": ["dormitório", "dormitórios"],
    "dormitorio": ["dormitório", "dormitórios"],
    "dormitorios": ["dormitório", "dormitórios"],
    "quarto": ["quarto", "quartos"],
    "quartos": ["quarto", "quartos"],
    "suíte": ["suíte", "suítes"],
    "suítes": ["suíte", "suítes"],
    "suite": ["suíte", "suítes"],
    "suites": ["suíte", "suítes"],
    "vaga": ["vaga", "vagas"],
    "vagas": ["vaga", "vagas"],
    "banheiro": ["banheiro", "banheiros"],
    "banheiros": ["banheiro", "banheiros"],
    "lavabo": ["lavabo", "lavabos"],
    "lavabos": ["lavabo", "lavabos"],
    "elevador": ["elevador", "elevadores"],
    "elevadores": ["elevador", "elevadores"],
    "piscina": ["piscina", "piscinas"],
    "piscinas": ["piscina", "piscinas"],
    "ar condicionado": ["ar-condicionado", "ar-condicionados"],
    "ar-condicionado": ["ar-condicionado", "ar-condicionados"],
    "ar condicionados": ["ar-condicionado", "ar-condicionados"],
    "ar-condicionados": ["ar-condicionado", "ar-condicionados"],
    "salão de festas": ["salão de festas", "salões de festas"],
    "salões de festas": ["salão de festas", "salões de festas"],
    "sala de jogos": ["sala de jogos", "salas de jogos"],
    "salas de jogos": ["sala de jogos", "salas de jogos"],
    "academia": ["academia", "academias"],
    "academias": ["academia", "academias"],
    "churrasqueira": ["churrasqueira", "churrasqueiras"],
    "churrasqueiras": ["churrasqueira", "churrasqueiras"],
    "sacada": ["sacada", "sacadas"],
    "sacadas": ["sacada", "sacadas"],
    "sacada integrada": ["sacada integrada", "sacadas integradas"],
    "sacadas integradas": ["sacada integrada", "sacadas integradas"]
  };

  const found = map[text];

  if (found) {
    return quantidade === 1 ? found[0] : found[1];
  }

  // Fallback heuristic for pluralization in Portuguese if not found in list
  if (quantidade !== 1) {
    if (text.endsWith("r") || text.endsWith("s") || text.endsWith("z")) {
      if (text.endsWith("es")) return label;
      return `${label}es`;
    }
    if (text.endsWith("m")) {
      return `${label.slice(0, -1)}ns`;
    }
    if (text.endsWith("al") || text.endsWith("el") || text.endsWith("ol") || text.endsWith("ul")) {
      return `${label.slice(0, -2)}is`;
    }
    if (!text.endsWith("s")) {
      return `${label}s`;
    }
  }

  return label;
}

export function shouldShowQuantity(label: string): boolean {
  const text = String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const quantityKeywords = [
    "dormitorio",
    "suite",
    "demi-suite",
    "banheiro",
    "lavabo",
    "wc",
    "vaga",
    "box privativo",
    "sala",
    "escritorio",
    "dependencia",
    "ar condicionado",
    "elevador",
    "piscina",
    "churrasqueira",
    "salao de festas",
    "salao de jogos",
    "academia",
    "playground",
    "quadra",
    "brinquedoteca",
    "bicicletario",
    "box de praia",
    "sauna",
    "spa",
    "area gourmet",
    "espaco gourmet"
  ];

  const noQuantityKeywords = [
    "mobiliado",
    "semi mobiliado",
    "vazio",
    "alugado",
    "desocupado",
    "mora no local",
    "financiamento",
    "documentacao",
    "permuta",
    "area de servico",
    "master com closet",
    "hidro",
    "closet",
    "vista",
    "sacada",
    "gas central",
    "gerador",
    "portaria",
    "fechadura",
    "portao",
    "sistema",
    "moveis planejados",
    "face do apartamento",
    "posicao relativa",
    "frente mar",
    "quadra mar",
    "centro",
    "barra norte",
    "barra sul",
    "entre"
  ];

  if (noQuantityKeywords.some(keyword => text.includes(keyword))) {
    return false;
  }

  return quantityKeywords.some(keyword => text.includes(keyword));
}

export function formatBooleanLabel(label: string): string {
  const text = String(label || "").trim();

  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const map: Record<string, string> = {
    "documentacao": "Documentação ok",
    "financiamento": "Aceita financiamento",
    "permuta": "Aceita permuta",
    "mobiliado": "Mobiliado",
    "semi mobiliado": "Semi mobiliado",
    "vazio": "Imóvel vazio",
    "desocupado": "Desocupado",
    "mora no local": "Mora no local",
    "area de servico": "Área de serviço",
    "face do apartamento norte": "Face do apartamento: Norte",
    "face do apartamento sul": "Face do apartamento: Sul",
    "face do apartamento leste": "Face do apartamento: Leste",
    "face do apartamento oeste": "Face do apartamento: Oeste",
    "posicao relativa do apartamento frente": "Posição relativa: Frente",
    "posicao relativa do apartamento lateral": "Posição relativa: Lateral",
    "posicao relativa do apartamento meio": "Posição relativa: Meio",
    "posicao relativa do apartamento fundos": "Posição relativa: Fundos"
  };

  return map[normalized] || text;
}

export function formatOptionDisplay(option: any): string {
  if (!option) return "";

  if (typeof option === "string") {
    if (shouldShowQuantity(option)) {
      return option;
    }
    return formatBooleanLabel(option);
  }

  const label = option.label || option.nome || option.value || "";
  const quantidade = Number(option.quantidade || 0);

  if (!label) return "";

  if (shouldShowQuantity(label) && quantidade > 0) {
    return `${quantidade} ${pluralizeLabel(label, quantidade)}`;
  }

  return formatBooleanLabel(label);
}

export function formatOptionWithQuantity(option: any, optionQuantities?: Record<string, number>): string {
  if (!option) return "";

  if (typeof option === "string") {
    const qty = Number(optionQuantities?.[option] ?? 1);
    if (!shouldShowQuantity(option)) {
      return formatBooleanLabel(option);
    }
    const labelPluralized = pluralizeLabel(option, qty);
    return qty > 0 ? `${qty} ${labelPluralized}` : option;
  }

  const label = option.label || option.nome || option.value || option.descricao || "";
  if (!label) return "";

  // Give priority to option.quantidade, fall back to optionQuantities map, then defaults to 1 or 0
  const qty = Number(option.quantidade !== undefined ? option.quantidade : (optionQuantities?.[label] ?? 1));

  if (shouldShowQuantity(label) && qty > 0) {
    return `${qty} ${pluralizeLabel(label, qty)}`;
  }

  return formatBooleanLabel(label);
}

export function buildPropertyWhatsAppMessage(imovel: any): string {
  if (!imovel) return "";
  const publicUrl = `${window.location.origin}/imovel/${imovel.id}`;

  const titulo = imovel.tituloAnuncio || imovel.titulo || imovel.nome || "Imóvel disponível";
  const codigo = imovel.codigo || imovel.code || imovel.codigoImovel || "não informado";
  const tipo = imovel.businessType || imovel.tipoNegocio || imovel.tipo || "não informado";

  const bairro = imovel.bairro || imovel.neighborhood || "";
  const cidade = imovel.cidade || imovel.city || "";
  const estado = imovel.estado || imovel.state || "";

  let localizacao = "não informada";
  if (bairro || cidade || estado) {
    const parts = [];
    if (bairro) parts.push(bairro);
    if (cidade) parts.push(cidade);
    localizacao = parts.join(", ");
    if (estado) {
      localizacao += ` - ${estado}`;
    }
  }

  return `Olá! Tenho interesse em agendar uma visita para este imóvel:

Imóvel: ${titulo}
Código: ${codigo}
Tipo: ${tipo}
Localização: ${localizacao}

Link do imóvel:
${publicUrl}

Pode me passar mais informações?`;
}


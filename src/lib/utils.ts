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
    "exemplo"
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

export function isImovelPublico(imovel: any): boolean {
  return (
    imovel?.publicadoNoSite === true ||
    imovel?.publicado === true
  );
}

export function getCodigoPublicoImovel(imovel: any): string {
  return (
    imovel?.codigoImovel ||
    imovel?.codigo ||
    imovel?.codImovel ||
    imovel?.referencia ||
    imovel?.id ||
    ""
  );
}

export function getProprietarioFromImovel(imovel: any = {}): any {
  return {
    nome:
      imovel.proprietarioNome ||
      imovel.nomeProprietario ||
      imovel.vendedorNome ||
      imovel.proprietario?.nome ||
      "",

    cpf:
      imovel.proprietarioCpf ||
      imovel.cpfProprietario ||
      imovel.vendedorCpf ||
      imovel.proprietario?.cpf ||
      "",

    rg:
      imovel.proprietarioRg ||
      imovel.rgProprietario ||
      imovel.vendedorRg ||
      imovel.proprietario?.rg ||
      "",

    estadoCivil:
      imovel.proprietarioEstadoCivil ||
      imovel.estadoCivilProprietario ||
      imovel.vendedorEstadoCivil ||
      imovel.proprietario?.estadoCivil ||
      "",

    profissao:
      imovel.proprietarioProfissao ||
      imovel.profissaoProprietario ||
      imovel.vendedorProfissao ||
      imovel.proprietario?.profissao ||
      "",

    telefone:
      imovel.proprietarioTelefone ||
      imovel.telefoneProprietario ||
      imovel.vendedorTelefone ||
      imovel.proprietario?.telefone ||
      "",

    whatsapp:
      imovel.proprietarioWhatsapp ||
      imovel.whatsappProprietario ||
      imovel.vendedorWhatsapp ||
      imovel.proprietario?.whatsapp ||
      imovel.proprietarioTelefone ||
      "",

    email:
      imovel.proprietarioEmail ||
      imovel.emailProprietario ||
      imovel.vendedorEmail ||
      imovel.proprietario?.email ||
      "",

    endereco:
      imovel.proprietarioEndereco ||
      imovel.enderecoProprietario ||
      imovel.vendedorEndereco ||
      imovel.proprietario?.endereco ||
      "",

    numero:
      imovel.proprietarioNumero ||
      imovel.numeroProprietario ||
      imovel.vendedorNumero ||
      imovel.proprietario?.numero ||
      imovel.proprietario?.number ||
      "",

    complemento:
      imovel.proprietarioComplemento ||
      imovel.complementoProprietario ||
      imovel.vendedorComplemento ||
      imovel.proprietario?.complemento ||
      imovel.proprietario?.complement ||
      "",

    cep:
      imovel.proprietarioCep ||
      imovel.cepProprietario ||
      imovel.vendedorCep ||
      imovel.proprietario?.cep ||
      "",

    cidade:
      imovel.proprietarioCidade ||
      imovel.cidadeProprietario ||
      imovel.vendedorCidade ||
      imovel.proprietario?.cidade ||
      "",

    estado:
      imovel.proprietarioEstado ||
      imovel.estadoProprietario ||
      imovel.vendedorEstado ||
      imovel.proprietario?.estado ||
      "",

    possuiConjuge:
      imovel.possuiConjugeProprietario ||
      imovel.proprietario?.possuiConjuge ||
      false,

    conjuge: {
      nome:
        imovel.proprietarioConjugeNome ||
        imovel.conjugeProprietarioNome ||
        imovel.proprietario?.conjuge?.nome ||
        "",

      cpf:
        imovel.proprietarioConjugeCpf ||
        imovel.conjugeProprietarioCpf ||
        imovel.proprietario?.conjuge?.cpf ||
        "",

      rg:
        imovel.proprietarioConjugeRg ||
        imovel.conjugeProprietarioRg ||
        imovel.proprietario?.conjuge?.rg ||
        "",

      profissao:
        imovel.proprietarioConjugeProfissao ||
        imovel.conjugeProprietarioProfissao ||
        imovel.proprietario?.conjuge?.profissao ||
        "",

      estadoCivil:
        imovel.proprietarioConjugeEstadoCivil ||
        imovel.conjugeProprietarioEstadoCivil ||
        imovel.proprietario?.conjuge?.estadoCivil ||
        "",

      telefone:
        imovel.proprietarioConjugeTelefone ||
        imovel.proprietario?.conjuge?.telefone ||
        "",

      whatsapp:
        imovel.proprietarioConjugeWhatsapp ||
        imovel.proprietario?.conjuge?.whatsapp ||
        "",

      email:
        imovel.proprietarioConjugeEmail ||
        imovel.proprietario?.conjuge?.email ||
        "",

      endereco:
        imovel.proprietarioConjugeEndereco ||
        imovel.proprietario?.conjuge?.endereco ||
        "",

      numero:
        imovel.proprietarioConjugeNumero ||
        imovel.proprietario?.conjuge?.numero ||
        imovel.proprietario?.conjuge?.number ||
        "",

      complemento:
        imovel.proprietarioConjugeComplemento ||
        imovel.proprietario?.conjuge?.complemento ||
        imovel.proprietario?.conjuge?.complement ||
        "",

      cep:
        imovel.proprietarioConjugeCep ||
        imovel.proprietario?.conjuge?.cep ||
        "",

      cidade:
        imovel.proprietarioConjugeCidade ||
        imovel.proprietario?.conjuge?.cidade ||
        "",

      estado:
        imovel.proprietarioConjugeEstado ||
        imovel.proprietario?.conjuge?.estado ||
        ""
    }
  };
}

export function getLinkPublicoImovel(imovel: any): string {
  const codigoPublico = getCodigoPublicoImovel(imovel);

  if (!codigoPublico) {
    console.error("Imóvel sem código público:", imovel);
    return "https://mentaimoveis.com/imoveis";
  }

  return `https://mentaimoveis.com/imovel/${encodeURIComponent(codigoPublico)}`;
}

/**
 * Validates if a property is complete enough to be shown to the public.
 */
export function isValidPublicProperty(p: any): boolean {
  return isImovelPublico(p);
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

export function getFotosImovel(imovel: any): string[] {
  const rawFotos =
    imovel?.fotos ||
    imovel?.imagens ||
    imovel?.images ||
    imovel?.photos ||
    [];

  let fotosArray: any[] = [];
  if (Array.isArray(rawFotos)) {
    fotosArray = [...rawFotos];
  } else if (rawFotos) {
    fotosArray = [rawFotos];
  }

  const extraImages: string[] = [];
  if (imovel?.imagemPrincipal) {
    extraImages.push(
      typeof imovel.imagemPrincipal === "string"
        ? imovel.imagemPrincipal
        : imovel.imagemPrincipal.url || imovel.imagemPrincipal.secure_url || imovel.imagemPrincipal.imagem || ""
    );
  }
  if (imovel?.mainImage) {
    extraImages.push(
      typeof imovel.mainImage === "string"
        ? imovel.mainImage
        : imovel.mainImage.url || imovel.mainImage.secure_url || imovel.mainImage.imagem || ""
    );
  }

  const processed = fotosArray
    .map((foto) => {
      if (typeof foto === "string") return foto;

      return (
        foto?.url ||
        foto?.secure_url ||
        foto?.src ||
        foto?.imagem ||
        foto?.imageUrl ||
        ""
      );
    })
    .filter(Boolean);

  const allImages = [...extraImages, ...processed];
  const uniqueImages = [...new Set(allImages.filter(Boolean))];

  return uniqueImages;
}

export function getFotoPrincipal(imovel: any): string {
  const fotos = getFotosImovel(imovel);

  const fotoPrincipalObj = Array.isArray(imovel?.fotos)
    ? imovel.fotos.find((foto: any) => foto?.principal === true)
    : null;

  if (fotoPrincipalObj) {
    return (
      fotoPrincipalObj.url ||
      fotoPrincipalObj.secure_url ||
      fotoPrincipalObj.src ||
      fotoPrincipalObj.imagem ||
      fotoPrincipalObj.imageUrl ||
      fotos[0] ||
      "/placeholder-imovel.png"
    );
  }

  if (imovel?.imagemPrincipal) {
    return typeof imovel.imagemPrincipal === "string"
      ? imovel.imagemPrincipal
      : imovel.imagemPrincipal.url || imovel.imagemPrincipal.secure_url || imovel.imagemPrincipal.imagem || fotos[0] || "/placeholder-imovel.png";
  }

  if (imovel?.mainImage) {
    return typeof imovel.mainImage === "string"
      ? imovel.mainImage
      : imovel.mainImage.url || imovel.mainImage.secure_url || imovel.mainImage.imagem || fotos[0] || "/placeholder-imovel.png";
  }

  return fotos[0] || "/placeholder-imovel.png";
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
  const statusLocacao = String(imovel.statusLocacao || "").toLowerCase();
  return (
    imovel.imovelAlugado === true ||
    imovel.rented === true ||
    statusStr.includes("alugado") ||
    statusStr.includes("locado") ||
    statusLocacao.includes("alugado") ||
    imovel.disponivelParaVisita === false
  );
}

export function isImovelVendido(imovel: any): boolean {
  if (!imovel) return false;
  const status = String(imovel.status || "").toLowerCase();
  const statusVenda = String(imovel.statusVenda || "").toLowerCase();

  return (
    imovel.vendido === true ||
    status.includes("vendido") ||
    statusVenda.includes("vendido")
  );
}

export function podeAgendarVisita(imovel: any): boolean {
  if (isImovelVendido(imovel)) return false;

  if (imovel?.disponivelParaVisita === false) return false;

  return true;
}

export function podeFazerProposta(imovel: any): boolean {
  if (isImovelVendido(imovel)) return false;

  if (imovel?.disponivelParaProposta === false) return false;

  return true;
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
    "sala": ["sala", "salas"],
    "salas": ["sala", "salas"],
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
    "posicao relativa do apartamento fundos": "Posição relativa: Fundos",
    "portaria no edificio": "Portaria no edifício",
    "portaria 24 horas": "Portaria 24 horas",
    "portaria 24h": "Portaria 24 horas"
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
  const codigoPublico = getCodigoPublicoImovel(imovel);
  const linkImovel = getLinkPublicoImovel(imovel);

  const titulo =
    imovel.tituloAnuncio ||
    imovel.titulo ||
    imovel.title ||
    imovel.nome ||
    "Imóvel disponível";

  const codigo = codigoPublico || "Não informado";

  if (isImovelVendido(imovel)) {
    return `Olá! Vi o imóvel vendido ${codigo} no site da Menta Imóveis e gostaria de conhecer opções semelhantes disponíveis.`;
  }

  if (isImovelAlugado(imovel) && normalizeTipoNegocio(imovel.tipoNegocio || imovel.businessType) === "Venda e Locação") {
    const vVenda = imovel.priceVenda || imovel.valorVenda || 0;
    const txtVenda = vVenda ? Number(vVenda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sob consulta";
    return `Olá! Tenho interesse na compra deste imóvel:

Imóvel: ${titulo}
Código: ${codigo}
Valor de venda: ${txtVenda}

Link do imóvel:
${linkImovel}

O imóvel está alugado atualmente, mas vi que está disponível para venda.`;
  }

  const tipo =
    imovel.tipoNegocio ||
    imovel.businessType ||
    "Não informado";

  const bairro = imovel.bairro || imovel.neighborhood || "";
  const cidade = imovel.cidade || imovel.city || "";
  const estado = imovel.estado || imovel.state || "";

  const localizacao = [bairro, cidade, estado]
    .filter(Boolean)
    .join(", ");

  const isVenda = String(tipo).toLowerCase().includes("venda") || String(imovel.businessType || "").toLowerCase().includes("venda") || String(imovel.tipoNegocio || "").toLowerCase().includes("venda");
  const isLocacao = String(tipo).toLowerCase().includes("locação") || String(tipo).toLowerCase().includes("locacao") || String(imovel.businessType || "").toLowerCase().includes("locacao") || String(imovel.tipoNegocio || "").toLowerCase().includes("locacao") || String(imovel.businessType || "").toLowerCase().includes("aluguel") || String(imovel.tipoNegocio || "").toLowerCase().includes("aluguel");

  let valorTexto = "Sob consulta";
  if (isVenda && isLocacao) {
    const vVenda = imovel.priceVenda || imovel.valorVenda || 0;
    const vLoc = getValorTotalMensal(imovel) || imovel.priceLocacao || imovel.valorAluguel || 0;
    const txtVenda = vVenda ? Number(vVenda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
    const txtLoc = vLoc ? Number(vLoc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
    if (txtVenda && txtLoc) {
      valorTexto = `Venda: ${txtVenda} | Locação: ${txtLoc}/mês`;
    } else if (txtVenda) {
      valorTexto = txtVenda;
    } else if (txtLoc) {
      valorTexto = txtLoc + "/mês";
    }
  } else if (isVenda) {
    const v = imovel.priceVenda || imovel.valorVenda || 0;
    valorTexto = v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sob consulta";
  } else if (isLocacao) {
    const v = getValorTotalMensal(imovel) || imovel.priceLocacao || imovel.valorAluguel || 0;
    valorTexto = v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/mês" : "Sob consulta";
  } else {
    const v = imovel.priceVenda || imovel.valorVenda || getValorTotalMensal(imovel) || imovel.priceLocacao || imovel.valorAluguel;
    if (v) {
      valorTexto = Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
  }

  return `Olá! Tenho interesse neste imóvel:

Imóvel: ${titulo}
Código: ${codigo}
Tipo: ${tipo}
Localização: ${localizacao || "Não informada"}
Valor: ${valorTexto}

Link do imóvel:
${linkImovel}

Gostaria de mais informações.`;
}

export function toNumber(value: any): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const clean = String(value || "0")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

export function getIptuAnual(imovel: any): number {
  if (!imovel) return 0;
  return toNumber(
    imovel.valorIptu ||
    imovel.valorIPTU ||
    imovel.iptu ||
    imovel.valorIptuAnual ||
    imovel.iptuAnual ||
    0
  );
}

export function getIptuValue(imovel: any): number {
  return getIptuMensal(imovel);
}

export function getIptuMensal(imovel: any): number {
  const iptuAnual = getIptuAnual(imovel);
  return iptuAnual > 0 ? iptuAnual / 12 : 0;
}

export function getCondominio(imovel: any): number {
  if (!imovel) return 0;
  return toNumber(
    imovel.valorCondominio ||
    imovel.condominio ||
    imovel.valorCond ||
    imovel.condoFee ||
    imovel.txCondominio ||
    0
  );
}

export function getValorMensal(imovel: any): number {
  if (!imovel) return 0;

  const aluguel = toNumber(imovel.valorAluguel || imovel.priceLocacao || 0);
  const condominio = getCondominio(imovel);
  const iptuMensal = getIptuMensal(imovel);
  const taxaLixo = getTaxaLixoMensal(imovel);
  const taxaGas = toNumber(imovel.valorTaxaGas || imovel.taxaGas || 0);
  const taxaAgua = toNumber(imovel.valorTaxaAgua || imovel.taxaAgua || 0);
  const taxaLuz = toNumber(imovel.valorTaxaLuz || imovel.taxaLuz || 0);
  const seguroIncendio = toNumber(imovel.valorSeguroIncendio || imovel.fireInsurance || 0);
  const taxasAdicionais = toNumber(imovel.taxasAdicionais || imovel.outrasTaxas || imovel.taxes || imovel.valorOutros || 0);

  const calculatedSum = aluguel + condominio + iptuMensal + taxaLixo + taxaGas + taxaAgua + taxaLuz + seguroIncendio + taxasAdicionais;
  
  if (calculatedSum > 0) return calculatedSum;
  return toNumber(imovel.valorTotalMensal || imovel.totalMonthlyPrice || 0);
}

export function getValorTotalMensal(imovel: any): number {
  return getValorMensal(imovel);
}

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeOption(option: any): any {
  if (!option) return null;

  if (typeof option === "string") {
    return {
      label: option,
      value: slugify(option),
      ativo: true,
      quantidade: shouldShowQuantity(option) ? 1 : 0,
      tipo: shouldShowQuantity(option) ? "quantidade" : "boolean"
    };
  }

  const label = option.label || option.nome || option.value || "";
  const value = option.value || slugify(label);
  const isCountable = shouldShowQuantity(label);

  return {
    label,
    value,
    ativo: option.ativo !== false,
    quantidade: isCountable 
      ? (Number.isFinite(Number(option.quantidade)) ? Number(option.quantidade) : 1)
      : 0,
    tipo: option.tipo || (isCountable ? "quantidade" : "boolean")
  };
}

export function getNumberValue(value: any): number {
  return toNumber(value);
}

export function getOptionQuantity(options: any[], keywords: string[]): number {
  if (!Array.isArray(options)) return 0;

  const normalizedKeywords = keywords.map(kw => normalizeText(kw));

  const found = options.find((option) => {
    if (!option) return false;

    const label = normalizeText(
      typeof option === "string"
        ? option
        : option.label || option.nome || option.value || ""
    );

    const ativo = typeof option === "string" ? true : option.ativo !== false;

    if (!ativo) return false;

    return normalizedKeywords.some((keyword) => label.includes(keyword));
  });

  if (!found) return 0;
  
  if (typeof found === "string") {
    return 1;
  }

  return toNumber(found.quantidade !== undefined ? found.quantidade : found.qtd);
}

export function getAllPropertyOptions(imovel: any): any[] {
  if (!imovel) return [];
  return [
    ...(Array.isArray(imovel.ambientes) ? imovel.ambientes : []),
    ...(Array.isArray(imovel.caracteristicas) ? imovel.caracteristicas : []),
    ...(Array.isArray(imovel.caracteristicasApartamento) ? imovel.caracteristicasApartamento : []),
    ...(Array.isArray(imovel.caracteristicasEmpreendimento) ? imovel.caracteristicasEmpreendimento : []),
    ...(Array.isArray(imovel.instalacoes) ? imovel.instalacoes : []),
    ...(Array.isArray(imovel.lazer) ? imovel.lazer : [])
  ];
}

export function getAllOptions(imovel: any): any[] {
  return getAllPropertyOptions(imovel);
}

export function getPropertyStats(imovel: any) {
  const options = getAllPropertyOptions(imovel);

  const dormitorios =
    toNumber(imovel?.dormitorios) ||
    toNumber(imovel?.quartos) ||
    toNumber(imovel?.bedrooms) ||
    getOptionQuantity(options, ["dormitorio", "dormitório", "quarto", "quartos"]);

  const suites =
    toNumber(imovel?.suites) ||
    getOptionQuantity(options, ["suite", "suíte", "suites", "suítes"]);

  const banheiros =
    toNumber(imovel?.banheiros) ||
    toNumber(imovel?.bathrooms) ||
    getOptionQuantity(options, ["banheiro", "banheiros", "wc social"]);

  const salas =
    toNumber(imovel?.salas) ||
    getOptionQuantity(options, ["sala", "salas", "numero de salas", "número de salas"]);

  const vagas =
    toNumber(imovel?.vagas) ||
    toNumber(imovel?.numeroVagas) ||
    toNumber(imovel?.garageSpaces) ||
    toNumber(imovel?.vagasGaragem) ||
    getOptionQuantity(options, ["vaga", "vagas", "numero de vagas", "número de vagas"]);

  const area =
    toNumber(imovel?.usefulArea) ||
    toNumber(imovel?.areaUtil) ||
    toNumber(imovel?.areaTotal) ||
    toNumber(imovel?.areaPrivada) ||
    toNumber(imovel?.areaConstruida) ||
    toNumber(imovel?.totalArea);

  return {
    dormitorios,
    suites,
    banheiros,
    salas,
    vagas,
    area
  };
}

export function getCardStats(imovel: any) {
  return getPropertyStats(imovel);
}

export function parseCurrencyBR(value: any): number {
  if (typeof value === "number") return value;

  if (!value) return 0;

  const clean = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(clean);

  return Number.isFinite(number) ? number : 0;
}

export function numeroPorExtenso(n: number): string {
  const unidades = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove"
  ];

  const especiais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove"
  ];

  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa"
  ];

  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos"
  ];

  if (n === 0) return "zero";
  if (n === 100) return "cem";

  if (n < 10) return unidades[n];

  if (n < 20) return especiais[n - 10];

  if (n < 100) {
    const dezena = Math.floor(n / 10);
    const unidade = n % 10;

    return dezenas[dezena] + (unidade ? " e " + unidades[unidade] : "");
  }

  if (n < 1000) {
    const centena = Math.floor(n / 100);
    const resto = n % 100;

    return centenas[centena] + (resto ? " e " + numeroPorExtenso(resto) : "");
  }

  if (n < 1000000) {
    const milhar = Math.floor(n / 1000);
    const resto = n % 1000;

    const milharTexto =
      milhar === 1 ? "mil" : numeroPorExtenso(milhar) + " mil";

    return milharTexto + (resto ? " e " + numeroPorExtenso(resto) : "");
  }

  if (n < 1000000000) {
    const milhao = Math.floor(n / 1000000);
    const resto = n % 1000000;

    const milhaoTexto =
      milhao === 1
        ? "um milhão"
        : numeroPorExtenso(milhao) + " milhões";

    return milhaoTexto + (resto ? " e " + numeroPorExtenso(resto) : "");
  }

  return String(n);
}

export function primeiraLetraMaiuscula(texto: string): string {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function valorMonetarioPorExtenso(valor: any): string {
  const numero = parseCurrencyBR(valor);

  if (!numero || numero <= 0) return "";

  const reais = Math.floor(numero);
  const centavos = Math.round((numero - reais) * 100);

  let texto = "";

  if (reais > 0) {
    texto += numeroPorExtenso(reais);
    texto += reais === 1 ? " real" : " reais";
  }

  if (centavos > 0) {
    if (texto) texto += " e ";

    texto += numeroPorExtenso(centavos);
    texto += centavos === 1 ? " centavo" : " centavos";
  }

  return primeiraLetraMaiuscula(texto);
}

export function normalizarDadosImovel(imovel: any): any {
  return {
    imovelId: imovel?.id || "",
    imovelCodigo:
      imovel?.codigoImovel ||
      imovel?.codigo ||
      imovel?.codImovel ||
      imovel?.referencia ||
      imovel?.id ||
      "",

    imovelTitulo: getTituloImovel(imovel) || "Imóvel",

    imovelTipo: imovel?.tipoImovel || imovel?.tipo || "",
    imovelTipoNegocio: imovel?.tipoNegocio || "",

    imovelEndereco: [
      imovel?.endereco,
      imovel?.numero,
      imovel?.complemento,
      imovel?.bairro,
      imovel?.cidade,
      imovel?.estado
    ].filter(Boolean).join(", "),

    imovelBairro: imovel?.bairro || "",
    imovelCidade: imovel?.cidade || "",
    imovelEstado: imovel?.estado || "",

    imovelMatricula:
      imovel?.matriculaImovel ||
      imovel?.matricula ||
      imovel?.numeroMatricula ||
      imovel?.numeroMatriculaImovel ||
      "",

    imovelCri:
      imovel?.criImovel ||
      imovel?.cri ||
      imovel?.cartorioRegistroImoveis ||
      imovel?.cartorioRegistro ||
      imovel?.cartorioImovel ||
      "",

    valorImovel:
      imovel?.valorVenda ||
      imovel?.precoVenda ||
      imovel?.preco ||
      imovel?.valor ||
      "",

    valorLocacao:
      imovel?.valorLocacao ||
      imovel?.valorAluguel ||
      imovel?.aluguel ||
      "",

    valorCondominio:
      imovel?.valorCondominio ||
      imovel?.condominio ||
      "",

    valorIptu:
      imovel?.valorIptu ||
      imovel?.iptu ||
      imovel?.valorIptuAnual ||
      "",

    proprietario:
      imovel?.proprietario ||
      imovel?.nomeProprietario ||
      "",

    corretorResponsavel:
      imovel?.corretorResponsavel ||
      ""
  };
}

export function normalizarPessoa(pessoa: any, prefixo: string): any {
  return {
    [`${prefixo}Nome`]: pessoa?.nome || "",
    [`${prefixo}Cpf`]: pessoa?.cpf || pessoa?.cpfCnpj || pessoa?.cpf_cnpj || "",
    [`${prefixo}Rg`]: pessoa?.rg || pessoa?.rgIe || pessoa?.rg_ie || "",
    [`${prefixo}Profissao`]: pessoa?.profissao || "",
    [`${prefixo}EstadoCivil`]: pessoa?.estadoCivil || "",
    [`${prefixo}Telefone`]: pessoa?.telefone || "",
    [`${prefixo}Email`]: pessoa?.email || "",
    [`${prefixo}Endereco`]: pessoa?.endereco || "",
    [`${prefixo}Nacionalidade`]: pessoa?.nacionalidade || "brasileiro(a)"
  };
}

export function textoConjuge(prefixo: string, dados: any): string {
  if (!dados) return "";
  const nome = dados[`${prefixo}ConjugeNome`];

  if (!nome) return "";

  const cpf = dados[`${prefixo}ConjugeCpf`] || "";
  const rg = dados[`${prefixo}ConjugeRg`] || "";
  const profissao = dados[`${prefixo}ConjugeProfissao`] || "";
  const estadoCivil = dados[`${prefixo}ConjugeEstadoCivil`] || "";

  return `, e seu cônjuge ${nome}${cpf ? `, inscrito(a) no CPF nº ${cpf}` : ""}${rg ? `, RG nº ${rg}` : ""}${estadoCivil ? `, estado civil ${estadoCivil}` : ""}${profissao ? `, profissão ${profissao}` : ""}`;
}

export function getTituloImovel(imovel: any): string {
  return (
    imovel?.nomeEdificio ||
    imovel?.edificio ||
    imovel?.nomeEmpreendimento ||
    imovel?.empreendimento ||
    imovel?.condominioNome ||
    imovel?.nomeCondominio ||
    imovel?.tituloAnuncio ||
    imovel?.titulo ||
    imovel?.nome ||
    ""
  );
}

export function formatarDataBR(data: any): string {
  if (!data) return "Não informado";

  if (data?.toDate && typeof data.toDate === 'function') {
    return data.toDate().toLocaleDateString("pt-BR");
  }

  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return String(data);
  }

  return date.toLocaleDateString("pt-BR");
}

export function getOutrasCondicoes(dados: any = {}): string {
  if (!dados) return "";
  return (
    dados.outrasCondicoes ||
    dados.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.condicoesPagamento ||
    dados.observacoesPagamento ||
    dados.clausulaPagamento ||
    dados.termosCondicoes ||
    dados.observacoes ||
    ""
  );
}

export function getTaxaLixoAnual(imovel: any): number {
  if (!imovel) return 0;
  return toNumber(
    imovel.taxaLixo ||
    imovel.valorTaxaLixo ||
    imovel.taxaDeLixo ||
    imovel.lixo ||
    imovel.valorLixo ||
    imovel.taxaLixoAnual ||
    0
  );
}

export function getTaxaLixoMensal(imovel: any): number {
  const anual = getTaxaLixoAnual(imovel);
  return anual > 0 ? anual / 12 : 0;
}

export function getCondicoesPagamentoFinal(dados: any = {}): string {
  if (!dados) return "";
  const cond =
    dados.condicoesPagamento ||
    dados.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.outrasCondicoes ||
    dados.observacoesPagamento ||
    dados.clausulaPagamento ||
    dados.termosCondicoes ||
    "";
  if (cond) return String(cond);
  if (dados.dados) {
    return getCondicoesPagamentoFinal(dados.dados);
  }
  return "";
}

export function montarTextoConjuge(dados: any = {}, prefixo: string): string {
  if (!dados) return "";
  const possuiConjuge = dados[`${prefixo}PossuiConjuge`];
  const nome = dados[`${prefixo}ConjugeNome`];

  if (!possuiConjuge && !nome) return "";
  if (!nome) return "";

  const cpf = dados[`${prefixo}ConjugeCpf`] || "";
  const rg = dados[`${prefixo}ConjugeRg`] || "";
  const profissao = dados[`${prefixo}ConjugeProfissao`] || "";
  const estadoCivil = dados[`${prefixo}ConjugeEstadoCivil`] || "";
  const telefone = dados[`${prefixo}ConjugeTelefone`] || "";
  const email = dados[`${prefixo}ConjugeEmail`] || "";
  const endereco = dados[`${prefixo}ConjugeEndereco`] || "";

  return `, e seu cônjuge ${nome}${cpf ? `, inscrito(a) no CPF nº ${cpf}` : ""}${rg ? `, RG nº ${rg}` : ""}${estadoCivil ? `, estado civil ${estadoCivil}` : ""}${profissao ? `, profissão ${profissao}` : ""}${telefone ? `, telefone ${telefone}` : ""}${email ? `, e-mail ${email}` : ""}${endereco ? `, residente e domiciliado(a) em ${endereco}` : ""}`;
}

export function normalizarDadosDocumento(origem: any = {}): any {
  // Extract and normalize nested sub-objects or raw top-level fields
  const parsedDados = origem?.dados || {};
  const imovelRaw = parsedDados?.imovel || {};
  const compradorRaw = parsedDados?.proponente || parsedDados?.comprador || {};
  const compradorConjugeRaw = parsedDados?.proponenteConjuge || parsedDados?.compradorConjuge || {};
  const vendedorRaw = parsedDados?.vendedor || parsedDados?.aceitante || {};
  const vendedorConjugeRaw = parsedDados?.vendedorConjuge || parsedDados?.aceitanteConjuge || {};
  const locadorRaw = parsedDados?.locador || {};
  const locadorConjugeRaw = parsedDados?.locadorConjuge || {};
  const locatarioRaw = parsedDados?.locatario || {};
  const locatarioConjugeRaw = parsedDados?.locatarioConjuge || {};

  return {
    tipoDocumento: origem.tipoDocumento || origem.tipoContrato || "",

    propostaId: origem.propostaId || origem.id || "",
    aceiteId: origem.aceiteId || "",
    contratoId: origem.contratoId || "",

    dataProposta:
      origem.dataProposta ||
      origem.criadoEm ||
      origem.dataCriacao ||
      origem.createdAt ||
      "",

    dataAceite:
      origem.dataAceite ||
      origem.aceitoEm ||
      "",

    dataContrato:
      origem.dataContrato ||
      origem.contratoCriadoEm ||
      "",

    imovelId: origem.imovelId || imovelRaw.id || imovelRaw.imovelId || "",

    imovelCodigo:
      origem.imovelCodigo ||
      origem.codigoImovel ||
      origem.codigo ||
      origem.codImovel ||
      origem.referencia ||
      imovelRaw.codigo ||
      imovelRaw.code ||
      "",

    imovelTitulo:
      origem.imovelTitulo ||
      origem.imovelNomeEdificio ||
      origem.nomeEdificio ||
      origem.edificio ||
      origem.nomeEmpreendimento ||
      origem.empreendimento ||
      origem.condominioNome ||
      origem.nomeCondominio ||
      origem.tituloAnuncio ||
      origem.titulo ||
      imovelRaw.titulo ||
      imovelRaw.nomeEdificio ||
      "",

    imovelEndereco:
      origem.imovelEndereco ||
      origem.endereco ||
      imovelRaw.endereco ||
      origem.enderecoImovel ||
      "",

    imovelBairro:
      origem.imovelBairro ||
      origem.bairro ||
      imovelRaw.bairro ||
      "",

    imovelCidade:
      origem.imovelCidade ||
      origem.cidade ||
      imovelRaw.cidade ||
      "",

    imovelEstado:
      origem.imovelEstado ||
      origem.estado ||
      imovelRaw.estado ||
      "SC",

    imovelMatricula:
      origem.imovelMatricula ||
      origem.matriculaImovel ||
      origem.matricula ||
      origem.numeroMatricula ||
      origem.numeroMatriculaImovel ||
      imovelRaw.matricula ||
      "",

    imovelCri: String(
      origem.imovelCri ||
      origem.criImovel ||
      origem.cri ||
      origem.cartorioRegistroImoveis ||
      origem.cartorioRegistro ||
      origem.cartorioImovel ||
      imovelRaw.cri ||
      imovelRaw.criImovel ||
      ""
    ).trim(),

    valorAnunciado:
      origem.valorAnunciado ||
      origem.valorImovel ||
      origem.valorVenda ||
      origem.precoVenda ||
      origem.preco ||
      origem.valor ||
      imovelRaw.valor ||
      imovelRaw.preco ||
      "",

    valorProposta:
      origem.valorProposta ||
      origem.valorTotalNegociado ||
      origem.valorNegociado ||
      origem.valor ||
      "",

    valorTotalNegociado:
      origem.valorTotalNegociado ||
      origem.valorProposta ||
      origem.valorNegociado ||
      origem.valor ||
      "",

    valorPorExtenso:
      origem.valorPorExtenso ||
      parsedDados?.pagamento?.valorExtenso ||
      parsedDados?.termos?.valorExtenso ||
      "",

    formaPagamento:
      origem.formaPagamento ||
      "",

    formasPagamento:
      origem.formasPagamento ||
      (origem.tipoContrato === 'proposta' || origem.tipoDocumento === 'proposta'
        ? (parsedDados?.pagamento?.metodos || parsedDados?.termos?.metodos || [])
        : (parsedDados?.termos?.metodos || parsedDados?.pagamento?.metodos || [])),

    condicoesPagamento:
      getOutrasCondicoes(origem) ||
      getOutrasCondicoes(parsedDados) ||
      getOutrasCondicoes(parsedDados?.pagamento) ||
      getOutrasCondicoes(parsedDados?.termos) ||
      "",

    outrasCondicoes:
      getOutrasCondicoes(origem) ||
      getOutrasCondicoes(parsedDados) ||
      getOutrasCondicoes(parsedDados?.pagamento) ||
      getOutrasCondicoes(parsedDados?.termos) ||
      "",

    detalhesPagamento:
      getOutrasCondicoes(origem) ||
      getOutrasCondicoes(parsedDados) ||
      getOutrasCondicoes(parsedDados?.pagamento) ||
      getOutrasCondicoes(parsedDados?.termos) ||
      "",

    detalhesPagamentoContraproposta:
      getOutrasCondicoes(origem) ||
      getOutrasCondicoes(parsedDados) ||
      getOutrasCondicoes(parsedDados?.pagamento) ||
      getOutrasCondicoes(parsedDados?.termos) ||
      "",

    observacoesPagamento:
      getOutrasCondicoes(origem) ||
      getOutrasCondicoes(parsedDados) ||
      getOutrasCondicoes(parsedDados?.pagamento) ||
      getOutrasCondicoes(parsedDados?.termos) ||
      "",

    sinal:
      origem.sinal ||
      origem.valorSinal ||
      parsedDados?.pagamento?.sinal ||
      origem.valorArras ||
      "",

    fgts:
      origem.fgts ||
      origem.valorFgts ||
      parsedDados?.pagamento?.fgts ||
      "",

    financiamento:
      origem.financiamento ||
      origem.valorFinanciamento ||
      parsedDados?.pagamento?.financiamento ||
      "",

    permuta:
      origem.permuta ||
      origem.valorPermuta ||
      parsedDados?.pagamento?.permuta ||
      "",

    parcelamentoDireto:
      origem.parcelamentoDireto ||
      origem.valorParcelamentoDireto ||
      parsedDados?.pagamento?.parcelamentoDireto ||
      "",

    compradorNome: getNomeComprador(origem),
    proponenteNome: getNomeComprador(origem),
    nomeComprador: getNomeComprador(origem),
    nomeCompleto: getNomeComprador(origem),
    nomeCliente: getNomeComprador(origem),

    compradorCpf:
      origem.compradorCpf ||
      origem.proponenteCpf ||
      origem.cpfComprador ||
      compradorRaw.cpf ||
      compradorRaw.cpfCnpj ||
      "",

    compradorRg:
      origem.compradorRg ||
      origem.proponenteRg ||
      origem.rgComprador ||
      compradorRaw.rg ||
      "",

    compradorProfissao:
      origem.compradorProfissao ||
      origem.proponenteProfissao ||
      compradorRaw.profissao ||
      "",

    compradorEstadoCivil:
      origem.compradorEstadoCivil ||
      origem.proponenteEstadoCivil ||
      compradorRaw.estadoCivil ||
      "",

    compradorTelefone:
      origem.compradorTelefone ||
      origem.proponenteTelefone ||
      compradorRaw.telefone ||
      "",

    compradorEmail:
      origem.compradorEmail ||
      origem.proponenteEmail ||
      compradorRaw.email ||
      "",

    compradorEndereco:
      origem.compradorEndereco ||
      origem.proponenteEndereco ||
      compradorRaw.endereco ||
      "",

    compradorConjugeNome:
      origem.compradorConjugeNome ||
      compradorConjugeRaw.nome ||
      "",

    compradorConjugeCpf:
      origem.compradorConjugeCpf ||
      compradorConjugeRaw.cpf ||
      compradorConjugeRaw.cpfCnpj ||
      "",

    compradorConjugeRg:
      origem.compradorConjugeRg ||
      compradorConjugeRaw.rg ||
      "",

    compradorConjugeProfissao:
      origem.compradorConjugeProfissao ||
      compradorConjugeRaw.profissao ||
      "",

    compradorConjugeEstadoCivil:
      origem.compradorConjugeEstadoCivil ||
      compradorConjugeRaw.estadoCivil ||
      "",

    compradorConjugeTelefone:
      origem.compradorConjugeTelefone ||
      compradorConjugeRaw.telefone ||
      "",

    compradorConjugeEmail:
      origem.compradorConjugeEmail ||
      compradorConjugeRaw.email ||
      "",

    compradorConjugeEndereco:
      origem.compradorConjugeEndereco ||
      compradorConjugeRaw.endereco ||
      "",

    compradorPossuiConjuge:
      origem.compradorPossuiConjuge ||
      compradorRaw.possuiConjuge ||
      compradorRaw.compradorPossuiConjuge ||
      compradorConjugeRaw.possuiConjuge ||
      parsedDados?.compradorPossuiConjuge ||
      false,

    vendedorNome: getNomeVendedor(origem),
    nomeVendedor: getNomeVendedor(origem),
    nomeProprietario: getNomeVendedor(origem),
    proprietario: getNomeVendedor(origem),

    vendedorCpf: getCpfVendedor(origem),
    vendedorRg: getRgVendedor(origem),
    vendedorProfissao: getProfissaoVendedor(origem),
    vendedorEstadoCivil: getEstadoCivilVendedor(origem),
    vendedorTelefone: getTelefoneVendedor(origem),
    vendedorEmail: getEmailVendedor(origem),
    vendedorEndereco: getEnderecoVendedor(origem),

    vendedorConjugeNome:
      origem.vendedorConjugeNome ||
      vendedorConjugeRaw.nome ||
      "",

    vendedorConjugeCpf:
      origem.vendedorConjugeCpf ||
      vendedorConjugeRaw.cpf ||
      vendedorConjugeRaw.cpfCnpj ||
      "",

    vendedorConjugeRg:
      origem.vendedorConjugeRg ||
      vendedorConjugeRaw.rg ||
      "",

    vendedorConjugeProfissao:
      origem.vendedorConjugeProfissao ||
      vendedorConjugeRaw.profissao ||
      "",

    vendedorConjugeEstadoCivil:
      origem.vendedorConjugeEstadoCivil ||
      vendedorConjugeRaw.estadoCivil ||
      "",

    vendedorConjugeTelefone:
      origem.vendedorConjugeTelefone ||
      vendedorConjugeRaw.telefone ||
      "",

    vendedorConjugeEmail:
      origem.vendedorConjugeEmail ||
      vendedorConjugeRaw.email ||
      "",

    vendedorConjugeEndereco:
      origem.vendedorConjugeEndereco ||
      vendedorConjugeRaw.endereco ||
      "",

    vendedorPossuiConjuge:
      origem.vendedorPossuiConjuge ||
      vendedorRaw.possuiConjuge ||
      vendedorRaw.vendedorPossuiConjuge ||
      vendedorConjugeRaw.possuiConjuge ||
      parsedDados?.vendedorPossuiConjuge ||
      false,

    // Locador definitions with standard fallbacks
    locadorNome:
      origem.locadorNome ||
      locadorRaw.nome ||
      origem.vendedorNome ||
      vendedorRaw.nome ||
      "",
    locadorCpf:
      origem.locadorCpf ||
      locadorRaw.cpf ||
      locadorRaw.cpfCnpj ||
      origem.vendedorCpf ||
      vendedorRaw.cpf ||
      "",
    locadorRg:
      origem.locadorRg ||
      locadorRaw.rg ||
      origem.vendedorRg ||
      vendedorRaw.rg ||
      "",
    locadorProfissao:
      origem.locadorProfissao ||
      locadorRaw.profissao ||
      origem.vendedorProfissao ||
      vendedorRaw.profissao ||
      "",
    locadorEstadoCivil:
      origem.locadorEstadoCivil ||
      locadorRaw.estadoCivil ||
      origem.vendedorEstadoCivil ||
      vendedorRaw.estadoCivil ||
      "",
    locadorTelefone:
      origem.locadorTelefone ||
      locadorRaw.telefone ||
      origem.vendedorTelefone ||
      vendedorRaw.telefone ||
      "",
    locadorEmail:
      origem.locadorEmail ||
      locadorRaw.email ||
      origem.vendedorEmail ||
      vendedorRaw.email ||
      "",
    locadorEndereco:
      origem.locadorEndereco ||
      locadorRaw.endereco ||
      origem.vendedorEndereco ||
      vendedorRaw.endereco ||
      "",

    locadorConjugeNome: origem.locadorConjugeNome || locadorConjugeRaw.nome || origem.vendedorConjugeNome || vendedorConjugeRaw.nome || "",
    locadorConjugeCpf: origem.locadorConjugeCpf || locadorConjugeRaw.cpf || origem.vendedorConjugeCpf || vendedorConjugeRaw.cpf || "",
    locadorConjugeRg: origem.locadorConjugeRg || locadorConjugeRaw.rg || origem.vendedorConjugeRg || vendedorConjugeRaw.rg || "",
    locadorConjugeProfissao: origem.locadorConjugeProfissao || locadorConjugeRaw.profissao || origem.vendedorConjugeProfissao || vendedorConjugeRaw.profissao || "",
    locadorConjugeEstadoCivil: origem.locadorConjugeEstadoCivil || locadorConjugeRaw.estadoCivil || origem.vendedorConjugeEstadoCivil || vendedorConjugeRaw.estadoCivil || "",
    locadorConjugeTelefone: origem.locadorConjugeTelefone || locadorConjugeRaw.telefone || origem.vendedorConjugeTelefone || vendedorConjugeRaw.telefone || "",
    locadorConjugeEmail: origem.locadorConjugeEmail || locadorConjugeRaw.email || origem.vendedorConjugeEmail || vendedorConjugeRaw.email || "",
    locadorConjugeEndereco: origem.locadorConjugeEndereco || locadorConjugeRaw.endereco || origem.vendedorConjugeEndereco || vendedorConjugeRaw.endereco || "",

    locadorPossuiConjuge:
      origem.locadorPossuiConjuge ||
      locadorRaw.possuiConjuge ||
      locadorRaw.locadorPossuiConjuge ||
      locadorConjugeRaw.possuiConjuge ||
      parsedDados?.locadorPossuiConjuge ||
      origem.vendedorPossuiConjuge ||
      vendedorRaw.possuiConjuge ||
      false,

    // Locatário definitions with standard fallbacks
    locatarioNome:
      origem.locatarioNome ||
      locatarioRaw.nome ||
      origem.compradorNome ||
      compradorRaw.nome ||
      "",
    locatarioCpf:
      origem.locatarioCpf ||
      locatarioRaw.cpf ||
      locatarioRaw.cpfCnpj ||
      origem.compradorCpf ||
      compradorRaw.cpf ||
      "",
    locatarioRg:
      origem.locatarioRg ||
      locatarioRaw.rg ||
      origem.compradorRg ||
      compradorRaw.rg ||
      "",
    locatarioProfissao:
      origem.locatarioProfissao ||
      locatarioRaw.profissao ||
      origem.compradorProfissao ||
      compradorRaw.profissao ||
      "",
    locatarioEstadoCivil:
      origem.locatarioEstadoCivil ||
      locatarioRaw.estadoCivil ||
      origem.compradorEstadoCivil ||
      compradorRaw.estadoCivil ||
      "",
    locatarioTelefone:
      origem.locatarioTelefone ||
      locatarioRaw.telefone ||
      origem.compradorTelefone ||
      compradorRaw.telefone ||
      "",
    locatarioEmail:
      origem.locatarioEmail ||
      locatarioRaw.email ||
      origem.compradorEmail ||
      compradorRaw.email ||
      "",
    locatarioEndereco:
      origem.locatarioEndereco ||
      locatarioRaw.endereco ||
      origem.compradorEndereco ||
      compradorRaw.endereco ||
      "",

    locatarioConjugeNome: origem.locatarioConjugeNome || locatarioConjugeRaw.nome || origem.compradorConjugeNome || compradorConjugeRaw.nome || "",
    locatarioConjugeCpf: origem.locatarioConjugeCpf || locatarioConjugeRaw.cpf || origem.compradorConjugeCpf || compradorConjugeRaw.cpf || "",
    locatarioConjugeRg: origem.locatarioConjugeRg || locatarioConjugeRaw.rg || origem.compradorConjugeRg || compradorConjugeRaw.rg || "",
    locatarioConjugeProfissao: origem.locatarioConjugeProfissao || locatarioConjugeRaw.profissao || origem.compradorConjugeProfissao || compradorConjugeRaw.profissao || "",
    locatarioConjugeEstadoCivil: origem.locatarioConjugeEstadoCivil || locatarioConjugeRaw.estadoCivil || origem.compradorConjugeEstadoCivil || compradorConjugeRaw.estadoCivil || "",
    locatarioConjugeTelefone: origem.locatarioConjugeTelefone || locatarioConjugeRaw.telefone || origem.compradorConjugeTelefone || compradorConjugeRaw.telefone || "",
    locatarioConjugeEmail: origem.locatarioConjugeEmail || locatarioConjugeRaw.email || origem.compradorConjugeEmail || compradorConjugeRaw.email || "",
    locatarioConjugeEndereco: origem.locatarioConjugeEndereco || locatarioConjugeRaw.endereco || origem.compradorConjugeEndereco || compradorConjugeRaw.endereco || "",

    locatarioPossuiConjuge:
      origem.locatarioPossuiConjuge ||
      locatarioRaw.possuiConjuge ||
      locatarioRaw.locatarioPossuiConjuge ||
      locatarioConjugeRaw.possuiConjuge ||
      parsedDados?.locatarioPossuiConjuge ||
      origem.compradorPossuiConjuge ||
      compradorRaw.possuiConjuge ||
      false,

    observacoes:
      origem.observacoes ||
      origem.observacoesGerais ||
      origem.descricao ||
      parsedDados?.observacoes ||
      ""
  };
}

export function getNomeComprador(dados: any = {}): string {
  if (!dados) return "";
  const proponenteRaw = dados.dados?.proponente || dados.dados?.comprador || dados.proponente || dados.comprador || {};
  return (
    dados.compradorNome ||
    dados.proponenteNome ||
    dados.nomeComprador ||
    dados.nomeProponente ||
    dados.nomeCompleto ||
    dados.clienteNome ||
    dados.nomeCliente ||
    dados.nome ||
    proponenteRaw.nome ||
    ""
  ).trim();
}

export function getNomeVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados.dados?.vendedor || dados.vendedor || dados.proprietarioDados || {};
  return (
    dados.vendedorNome ||
    dados.proprietarioNome ||
    dados.nomeVendedor ||
    dados.nomeProprietario ||
    dados.proprietario ||
    vendedorRaw.nome ||
    dados.vendedor?.nome ||
    dados.proprietarioDados?.nome ||
    ""
  ).trim();
}

export function getCpfVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorCpf ||
    dados.proprietarioCpf ||
    dados.cpfVendedor ||
    dados.cpfProprietario ||
    vendedorRaw.cpf ||
    dados.vendedor?.cpf ||
    dados.proprietarioDados?.cpf ||
    ""
  ).trim();
}

export function getRgVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorRg ||
    dados.proprietarioRg ||
    dados.rgVendedor ||
    dados.rgProprietario ||
    vendedorRaw.rg ||
    dados.vendedor?.rg ||
    dados.proprietarioDados?.rg ||
    ""
  ).trim();
}

export function getProfissaoVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorProfissao ||
    dados.proprietarioProfissao ||
    dados.profissaoVendedor ||
    dados.profissaoProprietario ||
    vendedorRaw.profissao ||
    dados.vendedor?.profissao ||
    dados.proprietarioDados?.profissao ||
    ""
  ).trim();
}

export function getEstadoCivilVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorEstadoCivil ||
    dados.proprietarioEstadoCivil ||
    dados.estadoCivilVendedor ||
    dados.estadoCivilProprietario ||
    vendedorRaw.estadoCivil ||
    dados.vendedor?.estadoCivil ||
    dados.proprietarioDados?.estadoCivil ||
    ""
  ).trim();
}

export function getTelefoneVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorTelefone ||
    dados.proprietarioTelefone ||
    dados.telefoneVendedor ||
    dados.telefoneProprietario ||
    vendedorRaw.telefone ||
    dados.vendedor?.telefone ||
    dados.proprietarioDados?.telefone ||
    ""
  ).trim();
}

export function getEmailVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorEmail ||
    dados.proprietarioEmail ||
    dados.emailVendedor ||
    dados.emailProprietario ||
    vendedorRaw.email ||
    dados.vendedor?.email ||
    dados.proprietarioDados?.email ||
    ""
  ).trim();
}

export function getEnderecoVendedor(dados: any = {}): string {
  if (!dados) return "";
  const vendedorRaw = dados?.dados?.vendedor || dados?.vendedor || dados?.proprietarioDados || {};
  return (
    dados.vendedorEndereco ||
    dados.proprietarioEndereco ||
    dados.enderecoVendedor ||
    dados.enderecoProprietario ||
    vendedorRaw.endereco ||
    dados.vendedor?.endereco ||
    dados.proprietarioDados?.endereco ||
    ""
  ).trim();
}

export function valorOuNaoInformado(...valores: any[]): string {
  const valor = valores.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return valor ? String(valor).trim() : "Não informado";
}

export function getNomeEdificio(dados: any = {}): string {
  if (!dados) return "";
  const imovelRaw = dados.dados?.imovel || dados.imovel || {};
  return (
    dados.imovelTitulo ||
    dados.imovelNomeEdificio ||
    dados.nomeEdificio ||
    dados.edificio ||
    dados.nomeEmpreendimento ||
    dados.empreendimento ||
    dados.condominioNome ||
    dados.nomeCondominio ||
    dados.tituloAnuncio ||
    dados.titulo ||
    imovelRaw.titulo ||
    imovelRaw.nomeEdificio ||
    ""
  ).trim();
}

export function getEnderecoImovel(dados: any = {}): string {
  if (!dados) return "";
  const imovelRaw = dados.dados?.imovel || dados.imovel || {};
  
  if (dados.imovelEndereco) return dados.imovelEndereco.trim();
  if (dados.endereco) return dados.endereco.trim();
  if (imovelRaw.endereco) return imovelRaw.endereco.trim();

  const parts = [
    dados.logradouro || imovelRaw.logradouro,
    dados.numero || imovelRaw.numero,
    dados.complemento || imovelRaw.complemento,
    dados.bairro || imovelRaw.bairro,
    dados.cidade || imovelRaw.cidade,
    dados.estado || imovelRaw.estado
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ").trim() : "";
}

export function getMatriculaImovel(dados: any = {}): string {
  if (!dados) return "";
  const imovelRaw = dados.dados?.imovel || dados.imovel || {};
  return String(
    dados.imovelMatricula ||
    dados.matriculaImovel ||
    dados.matricula ||
    dados.numeroMatricula ||
    dados.numeroMatriculaImovel ||
    imovelRaw.matricula ||
    ""
  ).trim();
}

export function getCriImovel(dados: any = {}): string {
  if (!dados) return "";
  const imovelRaw = dados.dados?.imovel || dados.imovel || {};
  return String(
    dados.imovelCri ||
    dados.criImovel ||
    dados.cri ||
    dados.cartorioRegistroImoveis ||
    dados.cartorioRegistro ||
    dados.cartorioImovel ||
    imovelRaw.cri ||
    imovelRaw.criImovel ||
    ""
  ).trim();
}

export function getTermosCondicoes(dados: any = {}): string {
  if (!dados) return "";
  return (
    dados.termosCondicoes ||
    dados.termosDaProposta ||
    dados.condicoesPagamento ||
    dados.outrasCondicoes ||
    dados.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.observacoesPagamento ||
    dados.observacoes ||
    ""
  ).trim();
}

export function getFormaPagamento(dados: any = {}): string {
  if (!dados) return "";
  const formasArray = Array.isArray(dados.formasPagamento)
    ? dados.formasPagamento.filter(Boolean)
    : [];

  if (formasArray.length > 0) {
    return formasArray.join(", ");
  }

  return (
    dados.formaPagamento ||
    dados.tipoPagamento ||
    dados.pagamento ||
    ""
  ).trim();
}

export function getDetalhesPagamento(dados: any = {}): string {
  if (!dados) return "";
  return (
    dados.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.outrasCondicoes ||
    dados.condicoesPagamento ||
    dados.observacoesPagamento ||
    dados.clausulaPagamento ||
    dados.termosCondicoes ||
    ""
  ).trim();
}

export function normalizarFormasPagamento(dados: any = {}): string[] {
  if (!dados) return [];

  if (Array.isArray(dados.formasPagamento)) {
    return dados.formasPagamento.filter(Boolean);
  }

  if (Array.isArray(dados.opcoesPagamento)) {
    return dados.opcoesPagamento.filter(Boolean);
  }

  if (Array.isArray(dados.pagamentosSelecionados)) {
    return dados.pagamentosSelecionados.filter(Boolean);
  }

  if (Array.isArray(dados.metodos)) {
    return dados.metodos.filter(Boolean);
  }

  if (typeof dados.formaPagamento === "string" && dados.formaPagamento.trim()) {
    return dados.formaPagamento
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function getParteAceitante(dados: any = {}) {
  if (!dados) return {
    nome: "",
    cpf: "",
    rg: "",
    profissao: "",
    estadoCivil: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    cep: "",
    cidade: "",
    estado: "",
    conjugeNome: "",
    conjugeCpf: "",
    conjugeRg: "",
    conjugeProfissao: "",
    conjugeEmail: "",
    conjugeTelefone: "",
    conjugeEstadoCivil: "",
    conjugeEndereco: "",
    hasConjuge: false
  };

  const deveUsarVendedor =
    dados.usarVendedorComoAceitante === true ||
    dados.parteAceitanteTipo === "vendedor";

  if (deveUsarVendedor) {
    const telefoneFinal =
      dados.parteAceitanteTelefone ||
      dados.vendedorTelefone ||
      dados.proprietarioTelefone ||
      dados.telefoneVendedor ||
      dados.vendedor?.telefone ||
      "";
    return {
      nome:
        dados.parteAceitanteNome ||
        dados.vendedorNome ||
        dados.proprietarioNome ||
        dados.nomeVendedor ||
        dados.nomeProprietario ||
        dados.proprietario ||
        dados.vendedor?.nome ||
        "",

      cpf:
        dados.parteAceitanteCpf ||
        dados.vendedorCpf ||
        dados.proprietarioCpf ||
        dados.cpfVendedor ||
        dados.cpfProprietario ||
        dados.vendedor?.cpf ||
        "",

      rg:
        dados.parteAceitanteRg ||
        dados.vendedorRg ||
        dados.proprietarioRg ||
        dados.rgVendedor ||
        dados.rgProprietario ||
        dados.vendedor?.rg ||
        "",

      profissao:
        dados.parteAceitanteProfissao ||
        dados.vendedorProfissao ||
        dados.proprietarioProfissao ||
        dados.vendedor?.profissao ||
        "",

      estadoCivil:
        dados.parteAceitanteEstadoCivil ||
        dados.vendedorEstadoCivil ||
        dados.proprietarioEstadoCivil ||
        dados.vendedor?.estadoCivil ||
        "Solteiro(a)",

      telefone: telefoneFinal,

      whatsapp:
        dados.parteAceitanteWhatsapp ||
        dados.vendedorWhatsapp ||
        dados.proprietarioWhatsapp ||
        dados.vendedorTelefone ||
        dados.vendedor?.whatsapp ||
        telefoneFinal,

      email:
        dados.parteAceitanteEmail ||
        dados.vendedorEmail ||
        dados.proprietarioEmail ||
        dados.vendedor?.email ||
        "",

      endereco:
        dados.parteAceitanteEndereco ||
        dados.vendedorEndereco ||
        dados.proprietarioEndereco ||
        dados.vendedor?.endereco ||
        "",

      cep:
        dados.parteAceitanteCep ||
        dados.vendedorCep ||
        dados.proprietarioCep ||
        dados.vendedor?.cep ||
        "",

      cidade:
        dados.parteAceitanteCidade ||
        dados.vendedorCidade ||
        dados.proprietarioCidade ||
        dados.vendedor?.cidade ||
        "",

      estado:
        dados.parteAceitanteEstado ||
        dados.vendedorEstado ||
        dados.proprietarioEstado ||
        dados.vendedor?.estado ||
        "",

      conjugeNome:
        dados.parteAceitanteConjugeNome ||
        dados.vendedorConjugeNome ||
        dados.proprietarioConjugeNome ||
        dados.vendedor?.vendedorConjugeNome ||
        dados.vendedor?.conjugeNome ||
        "",

      conjugeCpf:
        dados.parteAceitanteConjugeCpf ||
        dados.vendedorConjugeCpf ||
        dados.proprietarioConjugeCpf ||
        dados.vendedor?.vendedorConjugeCpf ||
        dados.vendedor?.conjugeCpf ||
        "",

      conjugeRg:
        dados.parteAceitanteConjugeRg ||
        dados.vendedorConjugeRg ||
        dados.proprietarioConjugeRg ||
        dados.vendedor?.vendedorConjugeRg ||
        dados.vendedor?.conjugeRg ||
        "",

      conjugeProfissao:
        dados.parteAceitanteConjugeProfissao ||
        dados.vendedorConjugeProfissao ||
        dados.proprietarioConjugeProfissao ||
        dados.vendedor?.vendedorConjugeProfissao ||
        dados.vendedor?.conjugeProfissao ||
        "",

      conjugeEmail:
        dados.parteAceitanteConjugeEmail ||
        dados.vendedorConjugeEmail ||
        dados.proprietarioConjugeEmail ||
        dados.vendedor?.vendedorConjugeEmail ||
        dados.vendedor?.conjugeEmail ||
        "",

      conjugeTelefone:
        dados.parteAceitanteConjugeTelefone ||
        dados.vendedorConjugeTelefone ||
        dados.proprietarioConjugeTelefone ||
        dados.vendedor?.vendedorConjugeTelefone ||
        dados.vendedor?.conjugeTelefone ||
        "",

      conjugeEstadoCivil:
        dados.parteAceitanteConjugeEstadoCivil ||
        dados.vendedorConjugeEstadoCivil ||
        dados.proprietarioConjugeEstadoCivil ||
        dados.vendedor?.vendedorConjugeEstadoCivil ||
        dados.vendedor?.conjugeEstadoCivil ||
        "",

      conjugeEndereco:
        dados.parteAceitanteConjugeEndereco ||
        dados.vendedorConjugeEndereco ||
        dados.proprietarioConjugeEndereco ||
        dados.vendedor?.vendedorConjugeEndereco ||
        dados.vendedor?.conjugeEndereco ||
        "",

      hasConjuge: !!(
        dados.parteAceitanteConjugeNome ||
        dados.vendedorConjugeNome ||
        dados.proprietarioConjugeNome ||
        dados.vendedor?.vendedorConjugeNome ||
        dados.vendedor?.conjugeNome
      )
    };
  }

  // Comprador (Buyer) as the default Parte Aceitante if not vendedor
  const p = dados.proponente || dados.comprador || {};
  const isCompradorPhone =
    dados.parteAceitanteTelefone ||
    dados.compradorTelefone ||
    dados.proponenteTelefone ||
    p.telefone ||
    "";
  return {
    nome:
      dados.parteAceitanteNome ||
      dados.compradorNome ||
      dados.proponenteNome ||
      dados.nomeComprador ||
      dados.nomeCompleto ||
      dados.nomeCliente ||
      p.nome ||
      "",

    cpf:
      dados.parteAceitanteCpf ||
      dados.compradorCpf ||
      dados.proponenteCpf ||
      p.cpf ||
      "",

    rg:
      dados.parteAceitanteRg ||
      dados.compradorRg ||
      dados.proponenteRg ||
      p.rg ||
      "",

    profissao:
      dados.parteAceitanteProfissao ||
      dados.compradorProfissao ||
      dados.proponenteProfissao ||
      p.profissao ||
      "",

    estadoCivil:
      dados.parteAceitanteEstadoCivil ||
      dados.compradorEstadoCivil ||
      dados.proponenteEstadoCivil ||
      p.estadoCivil ||
      "Solteiro(a)",

    telefone: isCompradorPhone,

    whatsapp:
      dados.parteAceitanteWhatsapp ||
      dados.compradorWhatsapp ||
      dados.proponenteWhatsapp ||
      p.whatsapp ||
      isCompradorPhone,

    email:
      dados.parteAceitanteEmail ||
      dados.compradorEmail ||
      dados.proponenteEmail ||
      p.email ||
      "",

    endereco:
      dados.parteAceitanteEndereco ||
      dados.compradorEndereco ||
      dados.proponenteEndereco ||
      p.endereco ||
      "",

    cep:
      dados.parteAceitanteCep ||
      dados.compradorCep ||
      dados.proponenteCep ||
      p.cep ||
      "",

    cidade:
      dados.parteAceitanteCidade ||
      dados.compradorCidade ||
      dados.proponenteCidade ||
      p.cidade ||
      "",

    estado:
      dados.parteAceitanteEstado ||
      dados.compradorEstado ||
      dados.proponenteEstado ||
      p.estado ||
      "",

    conjugeNome:
      dados.parteAceitanteConjugeNome ||
      p.compradorConjugeNome ||
      p.conjugeNome ||
      dados.compradorConjugeNome ||
      dados.conjugeNome ||
      "",

    conjugeCpf:
      dados.parteAceitanteConjugeCpf ||
      p.compradorConjugeCpf ||
      p.conjugeCpf ||
      dados.compradorConjugeCpf ||
      dados.conjugeCpf ||
      "",

    conjugeRg:
      dados.parteAceitanteConjugeRg ||
      p.compradorConjugeRg ||
      p.conjugeRg ||
      dados.compradorConjugeRg ||
      dados.conjugeRg ||
      "",

    conjugeProfissao:
      dados.parteAceitanteConjugeProfissao ||
      p.compradorConjugeProfissao ||
      p.conjugeProfissao ||
      dados.compradorConjugeProfissao ||
      dados.conjugeProfissao ||
      "",

    conjugeEmail:
      dados.parteAceitanteConjugeEmail ||
      p.compradorConjugeEmail ||
      p.conjugeEmail ||
      dados.compradorConjugeEmail ||
      dados.conjugeEmail ||
      "",

    conjugeTelefone:
      dados.parteAceitanteConjugeTelefone ||
      p.compradorConjugeTelefone ||
      p.conjugeTelefone ||
      dados.compradorConjugeTelefone ||
      dados.conjugeTelefone ||
      "",

    conjugeEstadoCivil:
      dados.parteAceitanteConjugeEstadoCivil ||
      p.compradorConjugeEstadoCivil ||
      p.conjugeEstadoCivil ||
      dados.compradorConjugeEstadoCivil ||
      dados.conjugeEstadoCivil ||
      "",

    conjugeEndereco:
      dados.parteAceitanteConjugeEndereco ||
      p.compradorConjugeEndereco ||
      p.conjugeEndereco ||
      dados.compradorConjugeEndereco ||
      dados.conjugeEndereco ||
      "",

    hasConjuge: !!(
      dados.parteAceitanteConjugeNome ||
      p.compradorConjugeNome ||
      p.conjugeNome ||
      dados.compradorConjugeNome ||
      dados.conjugeNome
    )
  };
}






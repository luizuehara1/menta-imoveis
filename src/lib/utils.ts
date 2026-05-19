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

  // 1. Mandatory presence of ID
  const hasId = !!p.id;
  
  // 2. Minimum Content (Must have one identifier)
  const title = String(p.title || p.titulo || p.nome || "").trim();
  const code = String(p.code || p.codigo || p.codigoImovel || "").trim();
  
  const hasTitleOrCode = title.length > 0 || code.length > 0;

  // 3. Visibility Requirement
  const isPublished = p.publicado === true || p.publicadoNoSite === true || p.ativo === true;
  
  // 4. Status Filter
  const status = String(p.status || "").toLowerCase();
  const isBlocked = [
    'rascunho', 
    'excluido', 
    'excluído', 
    'inativo', 
    'cancelado', 
    'indisponível', 
    'indisponivel'
  ].some(blocked => status.includes(blocked));

  const isValid = hasId && hasTitleOrCode && isPublished && !isBlocked;

  if (!isValid && p.id && (p.title || p.code)) {
    console.warn(`[Property Validation] Imóvel ${p.code || p.id} INVÁLIDO. Motivos:`, {
       hasId,
       hasTitleOrCode,
       isPublished,
       isBlocked,
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

  const found = possible.find(url => isValidPublicImageUrl(url));
  return found || ""; // SafeImage will handle the fallback if empty
}

/**
 * Robust image fallback logic for external URLs (CORS/Broken)
 */
export function getSafeImageUrl(url: any, fallback = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200"): string {
  if (!url || typeof url !== "string") return fallback;
  
  const cleanUrl = url.trim();
  
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

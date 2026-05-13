export type PropertyStatus = 'Disponível' | 'Reservado' | 'Vendido' | 'Locado' | 'Inativo';
export type BusinessType = 'Venda' | 'Locação';

export interface Property {
  id?: string;
  code: string;
  businessType: BusinessType;
  propertyType: string;
  status: PropertyStatus;
  priceVenda?: number;
  priceLocacao?: number;
  condoFee?: number;
  iptu?: number;
  financing: boolean;
  exchange: boolean;
  documentationOk: boolean;
  furnished: boolean;
  rented: boolean;
  
  // Location
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  address: string;
  number: string;
  complement?: string;
  referencePoint?: string;
  googleMapsLink?: string;
  
  // Characteristics
  usefulArea: number;
  totalArea: number;
  privateArea: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  halfBaths: number;
  livingRooms: number;
  kitchen: boolean;
  garageSpaces: number;
  floors?: number;
  unitsPerFloor?: number;
  floorLevel?: number;
  yearBuilt?: number;
  
  // Description
  title: string;
  shortDescription: string;
  fullDescription: string;
  internalNotes?: string;
  
  // Media
  images: string[];
  mainImage: string;
  
  // Checklist Features
  features: string[];
  installations: string[];
  finishes: string[];
  leisure: string[];
  locationTags: string[];
  
  destaque: boolean;
  publicado: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

export interface Owner {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export type VisitStatus = 'pendente' | 'confirmada' | 'realizada' | 'cancelada';

export interface Visit {
  id?: string;
  nomeCliente: string;
  telefone: string;
  email: string;
  imovelId: string;
  codigoImovel: string;
  tituloImovel: string;
  cidade: string;
  bairro: string;
  brokerId?: string;
  brokerName?: string;
  date: string;
  horario: string;
  mensagem?: string;
  status: VisitStatus;
  createdAt: any;
}

export interface Broker {
  id?: string;
  name: string;
  photo?: string;
  phone: string;
  whatsapp: string;
  email: string;
  creci: string;
  instagram?: string;
  active: boolean;
}

export interface Expense {
  id?: string;
  date: string;
  description: string;
  category: string;
  value: number;
  paymentMethod: string;
  responsible: string;
  notes?: string;
  receiptUrl?: string;
}

export interface Revenue {
  id?: string;
  date: string;
  description: string;
  type: 'Venda' | 'Locação' | 'Comissão' | 'Repasse' | 'Outro';
  value: number;
  brokerId?: string;
  propertyId?: string;
  notes?: string;
}

export interface Admin {
  email: string;
  role: 'admin';
}

export interface SiteConfig {
  hero: {
    titulo: string;
    subtitulo: string;
    botaoPrincipalTexto: string;
    botaoPrincipalLink: string;
    botaoSecundarioTexto: string;
    botaoSecundarioLink: string;
    imagemFundoUrl: string;
    threeJsAtivo: boolean;
  };
  secoes: {
    tituloDestaques: string;
    subtituloDestaques: string;
    tituloSobre: string;
    textoSobre: string;
    tituloCorretores: string;
    subtituloCorretores: string;
    tituloContato: string;
    textoContato: string;
  };
  empresa: {
    nome: string;
    creci: string;
    endereco: string;
    telefone1: string;
    telefone2: string;
    whatsapp: string;
    instagram: string;
    email: string;
    googleMapsUrl: string;
    logoUrl: string;
  };
  aparencia: {
    corPrimaria: string;
    corSecundaria: string;
    corFundo: string;
    corBotoes: string;
    animacoesAtivas: boolean;
    threeJsAtivo: boolean;
    logoUrl: string;
    faviconUrl: string;
  };
  updatedAt?: any;
}

export interface OptionItem {
  id: string;
  nome: string;
  valor: string | number;
  ativo: boolean;
  ordem: number;
  cidade?: string; // For neighborhoods
}

export interface PropertyOptions {
  itens: OptionItem[];
  updatedAt?: any;
}

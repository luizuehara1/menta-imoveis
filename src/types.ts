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
  fireInsurance?: number;
  totalMonthlyPrice?: number;
  valorTaxaLixo?: number;
  taxaLixo?: number;
  valorTaxaGas?: number;
  taxaGas?: number;
  valorTotalMensal?: number;
  leaseWarrantyType?: string;
  allowsPet?: 'Sim' | 'Não';
  furnishingStatus?: 'Mobiliado' | 'Parcialmente' | 'Não Mobiliado';
  minLeaseTerm?: string;
  availableForVisit?: 'Sim' | 'Não';
  leaseStatus?: string;
  leaseNotes?: string;
  imovelAlugado?: boolean;
  disponivelParaVisita?: boolean;
  locacaoAtivaId?: string | null;
  dataInicioLocacao?: string;
  dataFimLocacao?: string;
  publicadoNoSite?: boolean;
  ativo?: boolean;
  
  linkImovel?: string;
  
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
  
  // Owner Info
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerNotes?: string;
  
  // Characteristics
  usefulArea: number;
  areaConstruida?: number;
  totalArea: number;
  privateArea: number;
  valorMetroQuadrado?: number;
  valorMetroQuadradoLocacao?: number;
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
  
  // Financial Additional
  taxes?: number;
  
  // Building/Condo Info
  buildingName?: string;
  condoName?: string;
  isBuilding?: boolean;
  isCondo?: boolean;

  // Proximities
  proximities?: string[];
  
  // Description
  title: string;
  shortDescription: string;
  fullDescription: string;
  internalNotes?: string;
  
  // Media
  images: string[];
  videos?: string[];
  mainImage: string;
  
  // Checklist Features
  features: string[];
  installations: string[];
  finishes: string[];
  leisure: string[];
  locationTags: string[];
  
  // Broker Responsible
  brokerId?: string;
  brokerName?: string;
  brokerWhatsapp?: string;
  brokerPhoto?: string;
  brokerCreci?: string;
  
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
  brokerCreci?: string;
  brokerPhone?: string;
  clientCpf?: string;
  date: string;
  horario: string;
  mensagem?: string;
  status: VisitStatus;
  createdAt: any;
  confirmadoEm?: any;
  updatedAt?: any;
  pdfGerado?: boolean;
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

export interface Lease {
  id?: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress?: string;
  propertyNeighborhood?: string;
  propertyCity?: string;
  tenantName: string;
  tenantPhone: string;
  tenantCpf?: string;
  startDate: string;
  dueDay: number; // 1-31
  valorAluguel: number;
  valorIptu: number;
  valorTaxaLixo: number;
  valorTaxaGas?: number;
  valorCondominio: number;
  valorOutros: number;
  valorDesconto: number;
  valorTotalPagar: number;
  percentualComissaoImobiliaria?: number;
  valorComissaoImobiliaria?: number;
  valorRepassadoProprietario?: number;
  statusPagamento: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  statusLocacao: 'Ativa' | 'Encerrada' | 'Cancelada';
  lastPaymentDate?: string;
  lastPaymentMonth?: string; // YYYY-MM
  observacoes?: string;
  active: boolean;
  manterPublicado?: boolean;
  createdAt?: any;
  updatedAt?: any;
  value: number; // Compatibility
}

export interface FinanceRecord {
  id?: string;
  tipo: 'entrada' | 'saida';
  data: string;
  valor: number;
  descricao: string;
  categoria: string;
  clienteOrigem?: string;
  beneficiario?: string;
  responsavel: string;
  formaPagamento?: string;
  formaRecebimento?: string;
  observacoes?: string;
  imovelId?: string | null;
  codigoImovel?: string;
  locacaoId?: string | null;
  status: 'confirmado' | 'pendente';
  centroCusto?: string;
  origem?: string;
  criadoEm?: any;
  atualizadoEm?: any;
}

export interface Admin {
  email: string;
  role: 'admin';
}

export type ContractType = 'proposta' | 'contraproposta' | 'aceite' | 'locacao_temporaria';
export type ContractStatus = 'rascunho' | 'finalizado' | 'assinado' | 'cancelado';

export interface Contract {
  id?: string;
  tipoContrato: ContractType;
  status: ContractStatus;
  nomeCliente: string;
  nomeVendedor: string;
  enderecoImovel: string;
  valor: number;
  local?: string;
  data?: string;
  dados: any; 
  criadoEm: any;
  finalizadoEm?: any;
  atualizadoEm: any;
  criadoPor: string;
  imovelId?: string;
  observacoes?: string;
}

export interface SiteConfig {
  hero: {
    tituloPrincipal: string;
    subtitulo: string;
    textoBotaoPrincipal: string;
    linkBotaoPrincipal: string;
    textoBotaoSecundario: string;
    linkBotaoSecundario: string;
    heroBadge: string;
    imagemFundoUrl: string;
    ativarThreeJs: boolean;
  };
  secoes: {
    imoveisDestaque: {
      titulo: string;
      subtitulo: string;
    };
    sobre: {
      titulo: string;
      texto: string;
      imagemUrl: string;
    };
    corretores: {
      titulo: string;
      subtitulo: string;
    };
    contato: {
      titulo: string;
      texto: string;
    };
  };
  empresa: {
    nome: string;
    razaoSocial?: string;
    cnpj?: string;
    creciPj?: string;
    creciResponsavel?: string;
    telefone: string;
    whatsapp: string;
    email: string;
    site?: string;
    endereco: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    logoCabecalhoUrl?: string;
    marcaDaguaUrl?: string;
    rodapeContratos?: string;
    responsavelLegal?: string;
    responsavelCpf?: string;
    responsavelCargo?: string;
    slogan: string;
    creci: string;
    cidadeEstado: string;
    googleMapsUrl: string;
  };
  aparencia: {
    corPrincipal: string;
    corSecundaria: string;
    corFundo: string;
    corTexto: string;
    logoUrl: string;
    logoNavbarUrl: string;
    logoFooterUrl: string;
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
  tipo?: string; // For price ranges or other categorizations
  label?: string; // Standard format for printed sheet
  value?: string | number; // Standard format for printed sheet
}

export interface PropertyOptions {
  itens: OptionItem[];
  updatedAt?: any;
}

import { SiteConfig, OptionItem } from '../types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  hero: {
    tituloPrincipal: "Menta Imobiliária: Onde o Luxo Encontra a Modernidade",
    subtitulo: "Encontre os melhores imóveis de alto padrão e viva a experiência Menta.",
    textoBotaoPrincipal: "Ver Imóveis",
    linkBotaoPrincipal: "/imoveis",
    textoBotaoSecundario: "Sobre Nós",
    linkBotaoSecundario: "/sobre",
    imagemFundoUrl: "https://images.unsplash.com/photo-1600607687940-4e5c7ef95c73?auto=format&fit=crop&q=80",
    ativarThreeJs: true
  },
  secoes: {
    imoveisDestaque: {
      titulo: "Imóveis em Destaque",
      subtitulo: "Uma seleção exclusiva das melhores oportunidades no mercado."
    },
    sobre: {
      titulo: "Sobre a Menta",
      texto: "A Menta é uma boutique imobiliária focada na excelência, transparência e exclusividade. Localizada em Balneário Camboriú, atendemos clientes que buscam o melhor do mercado de luxo catarinense.",
      imagemUrl: ""
    },
    corretores: {
      titulo: "Nossos Especialistas",
      subtitulo: "Profissionais qualificados para entregar a melhor experiência."
    },
    contato: {
      titulo: "Fale Conosco",
      texto: "Estamos prontos para atender você e realizar o melhor negócio."
    }
  },
  empresa: {
    nome: "Menta Negócios Imobiliários",
    razaoSocial: "A & E Negócios Imobiliários Ltda",
    cnpj: "63.572.479/0001-50",
    creciPj: "11255PJ",
    creciResponsavel: "11255PJ",
    telefone: "(47) 99291-4069",
    whatsapp: "(47) 99291-4069",
    email: "contato@mentaimoveis.com.br",
    site: "www.mentaimoveis.com.br",
    endereco: "Av. Brasil, 2636",
    bairro: "Centro",
    cidade: "Balneário Camboriú",
    estado: "SC",
    cep: "88330-000",
    logoCabecalhoUrl: "https://i.postimg.cc/kMZXNdCS/image.png",
    marcaDaguaUrl: "https://i.postimg.cc/kMZXNdCS/image.png",
    rodapeContratos: "Menta Negócios Imobiliários - Transparência e Exclusividade",
    responsavelLegal: "Responsável Menta",
    responsavelCpf: "000.000.000-00",
    responsavelCargo: "Diretor Comercial",
    slogan: "Exclusividade em cada detalhe",
    creci: "11255PJ",
    cidadeEstado: "Balneário Camboriú - SC",
    googleMapsUrl: ""
  },
  aparencia: {
    corPrincipal: "#003030",
    corSecundaria: "#E5BC53",
    corFundo: "#FFFFFF",
    corTexto: "#111111",
    logoUrl: "https://i.postimg.cc/kMZXNdCS/image.png",
    logoNavbarUrl: "https://i.postimg.cc/kMZXNdCS/image.png",
    logoFooterUrl: "https://i.postimg.cc/kMZXNdCS/image.png",
    faviconUrl: ""
  }
};

export const DEFAULT_OPTIONS: Record<string, OptionItem[]> = {
  tiposNegocio: [
    { id: "venda", nome: "Comprar", valor: "venda", ativo: true, ordem: 1 },
    { id: "locacao", nome: "Locação", valor: "locacao", ativo: true, ordem: 2 },
    { id: "venda_locacao", nome: "Venda e Locação", valor: "venda_locacao", ativo: true, ordem: 3 }
  ],
  tiposImovel: [
    { id: "todos", nome: "Todos os tipos", valor: "", ativo: true, ordem: 0 },
    { id: "apartamento", nome: "Apartamento", valor: "apartamento", ativo: true, ordem: 1 },
    { id: "casa", nome: "Casa", valor: "casa", ativo: true, ordem: 2 },
    { id: "cobertura", nome: "Cobertura", valor: "cobertura", ativo: true, ordem: 3 },
    { id: "duplex", nome: "Duplex", valor: "duplex", ativo: true, ordem: 4 },
    { id: "sobrado", nome: "Sobrado", valor: "sobrado", ativo: true, ordem: 5 },
    { id: "terreno", nome: "Terreno", valor: "terreno", ativo: true, ordem: 6 },
    { id: "sala-comercial", nome: "Sala comercial", valor: "sala-comercial", ativo: true, ordem: 7 },
    { id: "loja", nome: "Loja", valor: "loja", ativo: true, ordem: 8 },
    { id: "galpao", nome: "Galpão", valor: "galpao", ativo: true, ordem: 9 },
    { id: "chacara", nome: "Chácara", valor: "chacara", ativo: true, ordem: 10 },
    { id: "outros", nome: "Outros", valor: "outros", ativo: true, ordem: 11 }
  ],
  statusImovel: [
    { id: "disponivel", nome: "Disponível", valor: "disponivel", ativo: true, ordem: 1 },
    { id: "reservado", nome: "Reservado", valor: "reservado", ativo: true, ordem: 2 },
    { id: "vendido", nome: "Vendido", valor: "vendido", ativo: true, ordem: 3 },
    { id: "locado", nome: "Locado", valor: "locado", ativo: true, ordem: 4 },
    { id: "inativo", nome: "Inativo", valor: "inativo", ativo: true, ordem: 5 }
  ],
  cidades: [
    { id: "balneario-camboriu", nome: "Balneário Camboriú", valor: "Balneário Camboriú", ativo: true, ordem: 1 },
    { id: "itajai", nome: "Itajaí", valor: "Itajaí", ativo: true, ordem: 2 },
    { id: "itapema", nome: "Itapema", valor: "Itapema", ativo: true, ordem: 3 },
    { id: "camboriu", nome: "Camboriú", valor: "Camboriú", ativo: true, ordem: 4 },
    { id: "navegantes", nome: "Navegantes", valor: "Navegantes", ativo: true, ordem: 5 },
    { id: "porto-belo", nome: "Porto Belo", valor: "Porto Belo", ativo: true, ordem: 6 },
    { id: "bombinhas", nome: "Bombinhas", valor: "Bombinhas", ativo: true, ordem: 7 }
  ],
  faixasPreco: [
    { id: "sem-limite", nome: "Sem limite", valor: 0, ativo: true, ordem: 0 },
    // Venda
    { id: "venda-300k", nome: "Venda: Até R$ 300 mil", valor: 300000, ativo: true, ordem: 1, tipo: 'venda' },
    { id: "venda-500k", nome: "Venda: Até R$ 500 mil", valor: 500000, ativo: true, ordem: 2, tipo: 'venda' },
    { id: "venda-1m", nome: "Venda: Até R$ 1 milhão", valor: 1000000, ativo: true, ordem: 3, tipo: 'venda' },
    { id: "venda-2m", nome: "Venda: Até R$ 2 milhões", valor: 2000000, ativo: true, ordem: 4, tipo: 'venda' },
    { id: "venda-5m", nome: "Venda: Até R$ 5 milhões", valor: 5000000, ativo: true, ordem: 5, tipo: 'venda' },
    { id: "venda-10m", nome: "Venda: Até R$ 10 milhões", valor: 10000000, ativo: true, ordem: 6, tipo: 'venda' },
    // Locação
    { id: "loc-2k", nome: "Locação: Até R$ 2.000", valor: 2000, ativo: true, ordem: 7, tipo: 'locacao' },
    { id: "loc-3k", nome: "Locação: Até R$ 3.000", valor: 3000, ativo: true, ordem: 8, tipo: 'locacao' },
    { id: "loc-5k", nome: "Locação: Até R$ 5.000", valor: 5000, ativo: true, ordem: 9, tipo: 'locacao' },
    { id: "loc-10k", nome: "Locação: Até R$ 10.000", valor: 10000, ativo: true, ordem: 10, tipo: 'locacao' },
    { id: "loc-20k", nome: "Locação: Até R$ 20.000", valor: 20000, ativo: true, ordem: 11, tipo: 'locacao' }
  ],
  caracteristicas: [
    "Área de Luz", "Box no banheiro", "Churrasqueira", "Copa", "Dependência de empregados", "Entrada lateral",
    "Frente para o mar", "Imóvel de esquina", "Lavabo", "Mezanino", "Piscina", "Quintal", "Sala de jantar",
    "SPA com Deck", "Varanda", "Área de serviço", "Bunker Subterrâneo", "Closet", "Cozinha", "Despensa",
    "Escritório", "Geminada", "Jacuzzi", "Lavanderia", "Pé direito alto", "Ponto de ar condicionado nos quartos",
    "Sala de almoço", "Sala de TV", "Suíte master", "WC de empregados", "Área Gourmet com Churrasqueira",
    "Casa de esquina", "Closet Sr. e Closet Srt.", "Cozinha americana", "Edícula", "Espelho nos banheiros",
    "Hidro", "Lareira", "Living with pé direito duplo", "Pintura with textura projetada", "Preparação para Boiler",
    "Sala de estar", "Sala íntima", "Terraço"
  ].map((nome, index) => ({ id: `feat-${index}`, nome, valor: nome, ativo: true, ordem: index })),
  instalacoes: [
    "Acabamento da iluminação em LED", "Aquecedor de toalhas", "Aquecimento central", "Armário de cozinha",
    "Canil", "Energia Fotovoltaica", "Fechadura Digital", "Hidromassagem", "Piscina", "Portão eletrônico",
    "Sistema de alarme", "Telefone", "Torneira Monocomando na Cozinha", "Acesso para deficientes",
    "Aquecedor nas torneiras", "Aquecimento de piso", "Armário embutido", "Cerca Elétrica",
    "Fachada de Ripado em PVC", "Fechadura Eletrônica", "Infra para instalação de ar condicionado",
    "Poço artesiano", "Recirculação de água quente", "Sistema de segurança", "Telefone DDR",
    "Tratamento acústico", "Antena parabólica", "Aquecedor solar", "Ar condicionado", "Câmera de segurança",
    "Desembaçador de espelho", "Fechadura biométrica", "Fogo de chão / Fireplace", "Móveis planejados",
    "Porta de Ripado em Alumínio", "Sistema contra incêndio", "Suíte com chuveiro duplo para casal",
    "Tomada para carro elétrico"
  ].map((nome, index) => ({ id: `inst-${index}`, nome, valor: nome, ativo: true, ordem: index })),
  acabamentos: [
    "Carpete", "Decorado", "Mármore", "Piso frio", "Carpete de madeira", "Gesso", "Pintura Projetada",
    "Piso laminado", "Cerâmica", "Granito", "Piso de madeira", "Porcelanato"
  ].map((nome, index) => ({ id: `fin-${index}`, nome, valor: nome, ativo: true, ordem: index })),
  lazer: [
    "Academia", "Churrasqueira", "Lago para pesca", "Playground", "Salão de festas", "Sauna seca",
    "Área gourmet coletiva", "Espaço para pet", "Mercado Smart", "Quadra poliesportiva", "Salão de jogos",
    "Campo Society", "Jardim", "Piscina", "Quintal", "Sauna à vapor"
  ].map((nome, index) => ({ id: `leisure-${index}`, nome, valor: nome, ativo: true, ordem: index }))
};

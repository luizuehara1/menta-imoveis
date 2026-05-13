import { SiteConfig, OptionItem } from '../types';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  hero: {
    titulo: "Menta Imobiliária: Onde o Luxo Encontra a Modernidade",
    subtitulo: "Encontre os melhores imóveis de alto padrão e viva a experiência Menta.",
    botaoPrincipalTexto: "Ver Imóveis",
    botaoPrincipalLink: "/imoveis",
    botaoSecundarioTexto: "Sobre Nós",
    botaoSecundarioLink: "/sobre",
    imagemFundoUrl: "https://images.unsplash.com/photo-1600607687940-4e5c7ef95c73?auto=format&fit=crop&q=80",
    threeJsAtivo: true
  },
  secoes: {
    tituloDestaques: "Imóveis em Destaque",
    subtituloDestaques: "Uma seleção exclusiva das melhores oportunidades no mercado.",
    tituloSobre: "Sobre a Menta",
    textoSobre: "A Menta é uma boutique imobiliária focada na excelência, transparência e exclusividade. Localizada em Balneário Camboriú, atendemos clientes que buscam o melhor do mercado de luxo catarinense.",
    tituloCorretores: "Nossos Especialistas",
    subtituloCorretores: "Profissionais qualificados para entregar a melhor experiência.",
    tituloContato: "Fale Conosco",
    textoContato: "Estamos prontos para atender você e realizar o melhor negócio."
  },
  empresa: {
    nome: "Menta Imobiliária",
    creci: "123456-J",
    endereco: "Av. Atlântica, 1000 - Centro, Balneário Camboriú - SC",
    telefone1: "(47) 99999-9999",
    telefone2: "(47) 3333-3333",
    whatsapp: "47999999999",
    instagram: "@mentaimobiliaria",
    email: "contato@mentaimobiliaria.com.br",
    googleMapsUrl: "https://goo.gl/maps/...",
    logoUrl: "https://i.postimg.cc/ZRkx8Py6/image.png"
  },
  aparencia: {
    corPrimaria: "#003030",
    corSecundaria: "#E5BC53",
    corFundo: "#FFFFFF",
    corBotoes: "#003030",
    animacoesAtivas: true,
    threeJsAtivo: true,
    logoUrl: "https://i.postimg.cc/ZRkx8Py6/image.png",
    faviconUrl: ""
  }
};

export const DEFAULT_OPTIONS: Record<string, OptionItem[]> = {
  tiposNegocio: [
    { id: "venda", nome: "Comprar", valor: "venda", ativo: true, ordem: 1 },
    { id: "locacao", nome: "Alugar", valor: "locacao", ativo: true, ordem: 2 },
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
    { id: "ate-300k", nome: "Até R$ 300 mil", valor: 300000, ativo: true, ordem: 1 },
    { id: "ate-500k", nome: "Até R$ 500 mil", valor: 500000, ativo: true, ordem: 2 },
    { id: "ate-1m", nome: "Até R$ 1 milhão", valor: 1000000, ativo: true, ordem: 3 },
    { id: "ate-2m", nome: "Até R$ 2 milhões", valor: 2000000, ativo: true, ordem: 4 },
    { id: "ate-5m", nome: "Até R$ 5 milhões", valor: 5000000, ativo: true, ordem: 5 }
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

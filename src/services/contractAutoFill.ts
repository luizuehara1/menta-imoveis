import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  getProprietarioFromImovel, 
  getLocatarioFromImovelOrLease, 
  montarEnderecoCompletoImovel, 
  limparEnderecoDuplicadoSalvo 
} from '../lib/utils';
import { Property } from '../types';

export interface PartyAutoFillResult {
  proprietario: any;
  locatario: any | null;
  temLocatarioVinculado: boolean;
  imovelNormalizado: any;
  imobiliaria: any;
  mensagemInformativa?: string;
}

/**
 * Localiza o imóvel no Firestore pelo ID do documento ou pelos códigos de referência.
 */
export async function buscarImovelFirestore(codigoOuId: string): Promise<Property | null> {
  const clean = String(codigoOuId || "").trim();
  if (!clean) return null;

  const imoveisRef = collection(db, "imoveis");

  // 1. Tentar busca direta pelo ID do documento
  try {
    const docSnap = await getDoc(doc(db, "imoveis", clean));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Property;
    }
  } catch (e) {
    console.warn("[contractAutoFill] Busca direta por ID falhou, tentando por campos de código:", e);
  }

  // 2. Tentar busca por campos de código
  const campos = ["code", "codigo", "codigoImovel", "codImovel", "referencia"];
  for (const campo of campos) {
    try {
      const q = query(imoveisRef, where(campo, "==", clean), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as Property;
      }
    } catch (e) {
      console.warn(`[contractAutoFill] Erro ao buscar por ${campo}:`, e);
    }
  }

  return null;
}

/**
 * Localiza o locatário já cadastrado e vinculado a este imóvel.
 * Prioriza IDs de relacionamento (locacaoAtivaId, locatarioId, clienteId),
 * depois consulta a coleção de 'locacoes' e os dados embutidos no imóvel.
 */
export async function buscarLocatarioVinculado(imovel: any): Promise<any | null> {
  if (!imovel) return null;

  // 1. Verificar se o imóvel possui locacaoAtivaId referenciando a locação ativa no Firestore
  if (imovel.locacaoAtivaId) {
    try {
      const leaseSnap = await getDoc(doc(db, "locacoes", String(imovel.locacaoAtivaId)));
      if (leaseSnap.exists()) {
        const leaseData = { id: leaseSnap.id, ...leaseSnap.data() };
        const locatario = getLocatarioFromImovelOrLease(leaseData);
        if (locatario) {
          console.log("[contractAutoFill] Locatário encontrado via locacaoAtivaId:", locatario.nome);
          return locatario;
        }
      }
    } catch (e) {
      console.warn("[contractAutoFill] Erro ao consultar locacaoAtivaId:", e);
    }
  }

  // 2. Verificar se o imóvel possui locatarioId ou clienteId direto
  const idVinculado = imovel.locatarioId || imovel.tenantId || imovel.inquilinoId || imovel.clienteId;
  if (idVinculado) {
    const colecoes = ["locatarios", "clientes", "inquilinos"];
    for (const col of colecoes) {
      try {
        const cSnap = await getDoc(doc(db, col, String(idVinculado)));
        if (cSnap.exists()) {
          const locatario = getLocatarioFromImovelOrLease({ id: cSnap.id, ...cSnap.data() });
          if (locatario) {
            console.log(`[contractAutoFill] Locatário encontrado na coleção ${col}:`, locatario.nome);
            return locatario;
          }
        }
      } catch (e) {
        // Ignora caso a coleção não exista ou não tenha permissão
      }
    }
  }

  // 3. Buscar na coleção 'locacoes' por propertyId ou propertyCode
  const imovelId = imovel.id || "";
  const imovelCode = imovel.code || imovel.codigo || imovel.codigoImovel || "";

  if (imovelId || imovelCode) {
    try {
      const locacoesRef = collection(db, "locacoes");
      const queries = [];

      if (imovelId) {
        queries.push(query(locacoesRef, where("propertyId", "==", imovelId)));
        queries.push(query(locacoesRef, where("imovelId", "==", imovelId)));
      }
      if (imovelCode) {
        queries.push(query(locacoesRef, where("propertyCode", "==", imovelCode)));
        queries.push(query(locacoesRef, where("codigoImovel", "==", imovelCode)));
      }

      for (const q of queries) {
        try {
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Preferir locação com status ativa ou pegar a primeira
            const allLeases = snap.docs.map(d => ({ id: d.id, ...((d.data() || {}) as Record<string, any>) }));
            const activeLease = allLeases.find((l: any) => 
              l.active === true || 
              l.ativo === true || 
              String(l.statusLocacao || l.status || "").toLowerCase() === "ativa"
            ) || allLeases[0];

            if (activeLease) {
              const locatario = getLocatarioFromImovelOrLease(activeLease);
              if (locatario) {
                console.log("[contractAutoFill] Locatário localizado em 'locacoes':", locatario.nome);
                return locatario;
              }
            }
          }
        } catch (errQuery) {
          console.warn("[contractAutoFill] Erro na query de locacoes:", errQuery);
        }
      }
    } catch (e) {
      console.warn("[contractAutoFill] Erro ao buscar locação vinculada:", e);
    }
  }

  // 4. Verificar se o próprio imóvel já possui os dados do locatário embutidos
  const locatarioEmbutido = getLocatarioFromImovelOrLease(imovel);
  if (locatarioEmbutido) {
    console.log("[contractAutoFill] Locatário localizado diretamente no imóvel:", locatarioEmbutido.nome);
    return locatarioEmbutido;
  }

  return null;
}

/**
 * Normaliza os dados da Imobiliária Menta Negócios Imobiliários a partir das configurações do sistema.
 */
export function normalizarImobiliariaConfigurada(empresaSettings: any = {}): any {
  return {
    nome: empresaSettings.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS",
    razaoSocial: empresaSettings.razaoSocial || empresaSettings.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS LTDA",
    cnpj: empresaSettings.cnpj || "",
    creciPj: empresaSettings.creciPj || empresaSettings.creci || "",
    creciResponsavel: empresaSettings.creciResponsavel || "",
    telefone: empresaSettings.telefone || "",
    whatsapp: empresaSettings.whatsapp || empresaSettings.telefone || "",
    email: empresaSettings.email || "",
    site: empresaSettings.site || "https://mentaimoveis.com",
    endereco: empresaSettings.endereco || "",
    numero: empresaSettings.numero || "",
    complemento: empresaSettings.complemento || "",
    bairro: empresaSettings.bairro || "",
    cidade: empresaSettings.cidade || "Balneário Camboriú",
    estado: empresaSettings.estado || "SC",
    cep: empresaSettings.cep || "",
    responsavelLegal: empresaSettings.responsavelLegal || "",
    responsavelCargo: empresaSettings.responsavelCargo || "Administrador",
    responsavelCpf: empresaSettings.responsavelCpf || ""
  };
}

/**
 * Função centralizada para carregar e preencher os dados de todas as partes
 * envolvidas em um contrato a partir do imóvel selecionado.
 */
export async function obterDadosAutomaticosDoContrato(
  imovelSelecionado: any,
  tipoContrato: string,
  empresaSettings: any = {}
): Promise<PartyAutoFillResult> {
  const pAny = imovelSelecionado as any;
  const proprietario = getProprietarioFromImovel(imovelSelecionado);
  const imobiliaria = normalizarImobiliariaConfigurada(empresaSettings);

  const logradouroPart = pAny.logradouro || pAny.rua || pAny.endereco || pAny.street || pAny.address || "";
  const numeroPart = pAny.numero || pAny.number || "";
  const complementoPart = pAny.complemento || pAny.complement || "";
  const bairroPart = pAny.neighborhood || pAny.bairro || pAny.district || "";
  const cidadePart = pAny.city || pAny.cidade || "";
  const estadoPart = pAny.state || pAny.uf || pAny.estado || "SC";
  const cepPart = pAny.cep || pAny.zipCode || "";
  
  const enderecoCompleto = (pAny.enderecoCompleto || pAny.enderecoFormatado || pAny.localizacaoCompleta)
    ? limparEnderecoDuplicadoSalvo(pAny.enderecoCompleto || pAny.enderecoFormatado || pAny.localizacaoCompleta)
    : montarEnderecoCompletoImovel(imovelSelecionado);

  const imovelNormalizado = {
    id: imovelSelecionado.id || "",
    codigo: imovelSelecionado.code || imovelSelecionado.codigo || imovelSelecionado.codigoImovel || "",
    titulo: imovelSelecionado.title || imovelSelecionado.nomeEdificio || imovelSelecionado.buildingName || "Imóvel",
    tipo: imovelSelecionado.propertyType || pAny.tipoImovel || "Apartamento",
    tipoNegocio: pAny.tipoNegocio || imovelSelecionado.businessType || "Locação",
    endereco: logradouroPart,
    numero: numeroPart,
    complemento: complementoPart,
    bairro: bairroPart,
    cidade: cidadePart,
    estado: estadoPart,
    cep: cepPart,
    enderecoCompleto,
    matricula: imovelSelecionado.matriculaImovel || imovelSelecionado.matricula || pAny.numeroMatricula || "",
    cri: String(imovelSelecionado.criImovel || imovelSelecionado.cri || pAny.cartorioRegistroImoveis || "").trim(),
    valorVenda: Number(imovelSelecionado.priceVenda || pAny.valorVenda || 0),
    valorLocacao: Number(imovelSelecionado.priceLocacao || pAny.valorLocacao || 0),
    condominio: Number(imovelSelecionado.condoFee || pAny.valorCondominio || 0),
    iptu: Number(imovelSelecionado.iptu || pAny.valorIptu || 0),
    areaUtil: Number(imovelSelecionado.usefulArea || pAny.areaUtil || 0),
    areaTotal: Number(imovelSelecionado.totalArea || pAny.areaTotal || 0),
    dormitorios: Number(imovelSelecionado.bedrooms || pAny.dormitorios || 0),
    suites: Number(imovelSelecionado.suites || 0),
    vagas: Number(imovelSelecionado.garageSpaces || pAny.vagas || 0),
    mobiliado: imovelSelecionado.furnished ? "Sim" : (imovelSelecionado.furnishingStatus || "Não")
  };

  let locatario: any | null = null;
  let mensagemInformativa: string | undefined = undefined;

  // Busca locatário vinculado apenas quando relevante (Locação Temporária)
  if (tipoContrato === 'locacao_temporaria') {
    locatario = await buscarLocatarioVinculado(imovelSelecionado);

    if (locatario && locatario.nome) {
      mensagemInformativa = `Locatário "${locatario.nome}" identificado e vinculado automaticamente com sucesso!`;
    } else {
      mensagemInformativa = "Imóvel sem locatário vinculado no momento. Os dados do locatário podem ser preenchidos manualmente.";
    }
  }

  return {
    proprietario,
    locatario,
    temLocatarioVinculado: !!(locatario && locatario.nome),
    imovelNormalizado,
    imobiliaria,
    mensagemInformativa
  };
}

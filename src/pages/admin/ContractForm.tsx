import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Download, 
  Printer, 
  Search,
  Check,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  FileText,
  Building2,
  User,
  CreditCard,
  MapPin,
  Calendar,
  AlertCircle,
  Home,
  Clock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { Contract, ContractType, ContractStatus, Property } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskCurrency, parseCurrencyToNumber, formatCurrency, valorMonetarioPorExtenso, normalizarDadosImovel, normalizarPessoa, textoConjuge, normalizarDadosDocumento, formatarDataBR, getOutrasCondicoes, montarTextoConjuge, getNomeComprador, getNomeVendedor, getCpfVendedor, getRgVendedor, getProfissaoVendedor, getEstadoCivilVendedor, getTelefoneVendedor, getEmailVendedor, getEnderecoVendedor, valorOuNaoInformado, getNomeEdificio, getEnderecoImovel, getTermosCondicoes, getFormaPagamento, getDetalhesPagamento } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { ContractA4Preview } from '../../components/admin/ContractA4Preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function isDomElement(value: any): boolean {
  return (
    typeof HTMLElement !== "undefined" &&
    value instanceof HTMLElement
  );
}

function isReactEvent(value: any): boolean {
  return (
    value &&
    typeof value === "object" &&
    ("nativeEvent" in value || "target" in value || "currentTarget" in value)
  );
}

function cleanSerializableData(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (isDomElement(value)) return undefined;
  if (isReactEvent(value)) return undefined;

  if (typeof value === "function") return undefined;
  if (typeof value === "symbol") return undefined;

  if (typeof File !== "undefined" && value instanceof File) return undefined;
  if (typeof Blob !== "undefined" && value instanceof Blob) return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (Array.isArray(value)) {
    return value
      .map(cleanSerializableData)
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
      return value;
    }

    const cleaned: any = {};

    Object.entries(value).forEach(([key, val]) => {
      if (
        key.startsWith("__react") ||
        key === "_owner" ||
        key === "ref" ||
        key === "current" ||
        key === "target" ||
        key === "currentTarget" ||
        key === "nativeEvent"
      ) {
        return;
      }

      const cleanedValue = cleanSerializableData(val);

      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    });

    return cleaned;
  }

  return value;
}

function getValorVendaImovel(imovel: any): number {
  return Number(
    imovel?.priceVenda ||
    imovel?.valorVenda ||
    imovel?.precoVenda ||
    imovel?.preco ||
    imovel?.valor ||
    0
  );
}

function getMatriculaImovel(imovel: any): string {
  return (
    imovel?.imovelMatricula ||
    imovel?.matriculaImovel ||
    imovel?.matricula ||
    imovel?.numeroMatricula ||
    imovel?.numeroMatriculaImovel ||
    imovel?.dados?.imovel?.matricula ||
    ""
  );
}

function getCriImovel(imovel: any): string {
  const value = (
    imovel?.imovelCri ||
    imovel?.criImovel ||
    imovel?.cri ||
    imovel?.cartorioRegistroImoveis ||
    imovel?.cartorioRegistro ||
    imovel?.cartorioImovel ||
    imovel?.dados?.imovel?.cri ||
    ""
  );
  return String(value).trim();
}

function getTituloImovel(imovel: any): string {
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

function getCodigoImovel(imovel: any): string {
  return (
    imovel?.codigoImovel ||
    imovel?.codigo ||
    imovel?.code ||
    imovel?.codImovel ||
    imovel?.referencia ||
    imovel?.id ||
    ""
  );
}

function montarEnderecoImovel(imovel: any): string {
  return [
    imovel?.endereco || imovel?.address,
    imovel?.numero || imovel?.number,
    imovel?.complemento || imovel?.complement,
    imovel?.bairro || imovel?.neighborhood,
    imovel?.cidade || imovel?.city,
    imovel?.estado || imovel?.state
  ].filter(Boolean).join(", ");
}

async function buscarImovelPorCodigoOuId(codigoOuId: string) {
  const codigoLimpo = String(codigoOuId || "").trim();

  if (!codigoLimpo) return null;

  const imoveisRef = collection(db, "imoveis");

  const campos = ["code", "codigo", "codigoImovel", "codImovel", "referencia"];

  for (const campo of campos) {
    const q = query(imoveisRef, where(campo, "==", codigoLimpo));
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
    } catch (e) {
      console.error("Erro ao buscar imovel por campo " + campo, e);
    }
  }

  try {
    const docSnap = await getDoc(doc(db, "imoveis", codigoLimpo));
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
  } catch (e) {
    console.error("Erro ao buscar imovel por ID " + codigoLimpo, e);
  }

  return null;
}

function normalizarDadosAceite(origem: any = {}) {
  const parsedDados = origem?.dados || {};
  const imovelRaw = parsedDados?.imovel || {};
  const proponenteRaw = parsedDados?.proponente || parsedDados?.comprador || {};
  const vendedorRaw = parsedDados?.vendedor || {};

  const propId = origem.propostaId || origem.id || "";
  const contraId = origem.origem === 'contraproposta' ? (origem.contrapropostaId || origem.id || "") : (origem.contrapropostaId || "");

  const dProposta = origem.dataProposta || origem.criadoEm || origem.createdAt || origem.dataCriacao || "";
  const dDocumentoBase = origem.dataDocumentoBase || origem.dataProposta || origem.criadoEm || origem.createdAt || origem.dataCriacao || "";

  const compNome = getNomeComprador(origem);
  const compCpf = origem.compradorCpf || origem.proponenteCpf || origem.cpfComprador || (origem.dados?.proponente?.cpf || origem.dados?.proponente?.cpfCnpj || proponenteRaw.cpf || proponenteRaw.cpfCnpj || proponenteRaw.documento || "");
  const compRg = origem.compradorRg || origem.proponenteRg || proponenteRaw.rg || "";
  const compProfissao = origem.compradorProfissao || origem.proponenteProfissao || proponenteRaw.profissao || "";
  const compEstadoCivil = origem.compradorEstadoCivil || origem.proponenteEstadoCivil || proponenteRaw.estadoCivil || "Solteiro(a)";
  const compTelefone = origem.compradorTelefone || origem.proponenteTelefone || proponenteRaw.telefone || "";
  const compEmail = origem.compradorEmail || origem.proponenteEmail || proponenteRaw.email || "";
  const compEndereco = origem.compradorEndereco || origem.proponenteEndereco || proponenteRaw.endereco || "";

  const compConjugeNome = origem.compradorConjugeNome || origem.proponenteConjugeNome || proponenteRaw.compradorConjugeNome || proponenteRaw.conjugeNome || proponenteRaw.conjuge?.nome || "";
  const compConjugeCpf = origem.compradorConjugeCpf || origem.proponenteConjugeCpf || proponenteRaw.compradorConjugeCpf || proponenteRaw.conjugeCpf || proponenteRaw.conjuge?.cpf || "";
  const compConjugeRg = origem.compradorConjugeRg || proponenteRaw.compradorConjugeRg || proponenteRaw.conjugeRg || proponenteRaw.conjuge?.rg || "";
  const compConjugeProfissao = proponenteRaw.compradorConjugeProfissao || proponenteRaw.conjugeProfissao || proponenteRaw.conjuge?.profissao || "";
  const compConjugeEstadoCivil = proponenteRaw.compradorConjugeEstadoCivil || proponenteRaw.conjugeEstadoCivil || proponenteRaw.conjuge?.estadoCivil || "Casado(a)";
  const compConjugeTelefone = proponenteRaw.compradorConjugeTelefone || proponenteRaw.conjugeTelefone || proponenteRaw.conjuge?.telefone || "";
  const compConjugeEmail = proponenteRaw.compradorConjugeEmail || proponenteRaw.conjugeEmail || proponenteRaw.conjuge?.email || "";
  const compConjugeEndereco = proponenteRaw.compradorConjugeEndereco || proponenteRaw.conjugeEndereco || proponenteRaw.conjuge?.endereco || "";

  const vendNome = getNomeVendedor(origem);
  const vendCpf = origem.vendedorCpf || origem.proprietarioCpf || vendedorRaw.cpf || vendedorRaw.documento || "";
  const vendRg = origem.vendedorRg || origem.proprietarioRg || vendedorRaw.rg || "";
  const vendProfissao = origem.vendedorProfissao || origem.proprietarioProfissao || vendedorRaw.profissao || "";
  const vendEstadoCivil = origem.vendedorEstadoCivil || origem.proprietarioEstadoCivil || vendedorRaw.estadoCivil || "Solteiro(a)";
  const vendTelefone = origem.vendedorTelefone || origem.proprietarioTelefone || vendedorRaw.telefone || "";
  const vendEmail = origem.vendedorEmail || origem.proprietarioEmail || vendedorRaw.email || "";
  const vendEndereco = origem.vendedorEndereco || origem.proprietarioEndereco || vendedorRaw.endereco || "";

  const vendConjugeNome = origem.vendedorConjugeNome || vendedorRaw.vendedorConjugeNome || vendedorRaw.conjugeNome || "";
  const vendConjugeCpf = origem.vendedorConjugeCpf || vendedorRaw.vendedorConjugeCpf || vendedorRaw.conjugeCpf || "";

  const imId = origem.imovelId || imovelRaw.id || "";
  const imCodigo = origem.imovelCodigo || origem.codigoImovel || origem.codigo || origem.codImovel || origem.referencia || imovelRaw.codigo || "";
  const imTitulo = getNomeEdificio(origem) || getNomeEdificio(imovelRaw) || "Imóvel";
  const imEndereco = getEnderecoImovel(origem) || getEnderecoImovel(imovelRaw) || "";
  const imBairro = origem.imovelBairro || origem.bairro || imovelRaw.bairro || "";
  const imCidade = origem.imovelCidade || origem.cidade || imovelRaw.cidade || "";
  const imEstado = origem.imovelEstado || origem.estado || imovelRaw.estado || "SC";
  const imMatricula = getMatriculaImovel(origem) || getMatriculaImovel(imovelRaw) || "";
  const imCri = getCriImovel(origem) || getCriImovel(imovelRaw) || "";

  const vAceite = origem.valorAceite || origem.valorTotalNegociado || origem.valorProposta || origem.valorNegociado || origem.valorContraproposta || origem.valor || 0;
  const vProposta = origem.valorProposta || origem.valorTotalNegociado || origem.valorNegociado || origem.valor || 0;
  const vTotalNegociado = origem.valorTotalNegociado || origem.valorProposta || origem.valorNegociado || origem.valor || 0;

  const vExtenso = origem.valorPorExtenso || parsedDados?.pagamento?.valorExtenso || parsedDados?.termos?.valorExtenso || "";
  const fPagamento = getFormaPagamento(origem) || getFormaPagamento(parsedDados) || getFormaPagamento(parsedDados?.pagamento) || getFormaPagamento(parsedDados?.termos) || "";
  const fPagamentos = origem.formasPagamento || parsedDados?.formasPagamento || parsedDados?.pagamento?.formasPagamento || parsedDados?.termos?.metodos || [];

  const condPagamento = getTermosCondicoes(origem) || getTermosCondicoes(parsedDados) || getTermosCondicoes(parsedDados?.pagamento) || getTermosCondicoes(parsedDados?.termos) || "";
  const outCondicoes = condPagamento;

  const obs = origem.observacoes || origem.observacoesGerais || "";

  return {
    documentoBaseId: origem.id || origem.propostaId || "",
    documentoBaseTipo: origem.origem || origem.tipoDocumento || "",

    propostaId: propId,
    contrapropostaId: contraId,

    dataProposta: dProposta,
    dataDocumentoBase: dDocumentoBase,

    compradorNome: compNome,
    compradorCpf: compCpf,
    compradorRg: compRg,
    compradorProfissao: compProfissao,
    compradorEstadoCivil: compEstadoCivil,
    compradorTelefone: compTelefone,
    compradorEmail: compEmail,
    compradorEndereco: compEndereco,

    compradorConjugeNome: compConjugeNome,
    compradorConjugeCpf: compConjugeCpf,
    compradorConjugeRg: compConjugeRg,
    compradorConjugeProfissao: compConjugeProfissao,
    compradorConjugeEstadoCivil: compConjugeEstadoCivil,
    compradorConjugeTelefone: compConjugeTelefone,
    compradorConjugeEmail: compConjugeEmail,
    compradorConjugeEndereco: compConjugeEndereco,

    vendedorNome: vendNome,
    vendedorCpf: vendCpf,
    vendedorRg: vendRg,
    vendedorProfissao: vendProfissao,
    vendedorEstadoCivil: vendEstadoCivil,
    vendedorTelefone: vendTelefone,
    vendedorEmail: vendEmail,
    vendedorEndereco: vendEndereco,

    vendedorConjugeNome: vendConjugeNome,
    vendedorConjugeCpf: vendConjugeCpf,

    imovelId: imId,
    imovelCodigo: imCodigo,
    imovelTitulo: imTitulo,
    imovelEndereco: imEndereco,
    imovelBairro: imBairro,
    imovelCidade: imCidade,
    imovelEstado: imEstado,
    imovelMatricula: imMatricula,
    imovelCri: imCri,

    valorAceite: vAceite,
    valorProposta: vProposta,
    valorTotalNegociado: vTotalNegociado,
    valorPorExtenso: vExtenso,
    formaPagamento: fPagamento,
    formasPagamento: fPagamentos,
    condicoesPagamento: condPagamento,
    outrasCondicoes: outCondicoes,
    observacoes: obs,

    dados: {
      ...parsedDados,
      proponente: {
        ...proponenteRaw,
        nome: compNome,
        cpf: compCpf,
        rg: compRg,
        profissao: compProfissao,
        estadoCivil: compEstadoCivil,
        telefone: compTelefone,
        email: compEmail,
        endereco: compEndereco,
        compradorConjugeNome: compConjugeNome,
        compradorConjugeCpf: compConjugeCpf,
        compradorConjugeRg: compConjugeRg,
        compradorConjugeProfissao: compConjugeProfissao,
        compradorConjugeEstadoCivil: compConjugeEstadoCivil,
        compradorConjugeTelefone: compConjugeTelefone,
        compradorConjugeEmail: compConjugeEmail,
        compradorConjugeEndereco: compConjugeEndereco,
        conjugeNome: compConjugeNome,
        conjugeCpf: compConjugeCpf,
      },
      vendedor: {
        ...origem.vendedor,
        ...vendedorRaw,
        nome: vendNome,
        cpf: vendCpf,
        rg: vendRg,
        profissao: vendProfissao,
        estadoCivil: vendEstadoCivil,
        telefone: vendTelefone,
        email: vendEmail,
        endereco: vendEndereco,
        vendedorConjugeNome: vendConjugeNome,
        vendedorConjugeCpf: vendConjugeCpf,
        conjugeNome: vendConjugeNome,
        conjugeCpf: vendConjugeCpf,
      },
      aceitante: {
        nome: compNome, // We accept the offer on buyer details
        cpf: compCpf,
        rg: compRg,
        profissao: compProfissao,
        estadoCivil: compEstadoCivil,
        telefone: compTelefone,
        email: compEmail,
        endereco: compEndereco,
        conjugeNome: compConjugeNome,
        conjugeCpf: compConjugeCpf,
      },
      imovel: {
        ...imovelRaw,
        id: imId,
        codigo: imCodigo,
        titulo: imTitulo,
        endereco: imEndereco,
        bairro: imBairro,
        cidade: imCidade,
        estado: imEstado,
        matricula: imMatricula,
        cri: imCri,
      },
      pagamento: {
        ...parsedDados.pagamento,
        metodos: fPagamentos,
        valorExtenso: vExtenso,
        outrasCondicoes: outCondicoes,
        detalhesPagamento: outCondicoes,
        detalhesPagamentoContraproposta: outCondicoes,
        condicoesPagamento: condPagamento,
        observacoesPagamento: outCondicoes,
        observacoes: obs,
      },
      termos: {
        ...parsedDados.termos,
        metodos: fPagamentos,
        valorExtenso: vExtenso,
        outrasCondicoes: outCondicoes,
        detalhesPagamento: outCondicoes,
        detalhesPagamentoContraproposta: outCondicoes,
        condicoesPagamento: condPagamento,
        observacoesPagamento: outCondicoes,
        observacoes: obs,
      },
      objeto: {
        tipoAceite: origem.origem || origem.tipoDocumento || 'proposta',
        dataDocumentoBase: dDocumentoBase,
        valorAceite: vAceite,
      }
    }
  };
}

async function completarComPropostaOriginal(dados: any) {
  if (!dados.propostaId) return dados;

  try {
    console.log("Completando dados da contraproposta com a proposta original ID:", dados.propostaId);
    let propostaRaw: any = null;
    let propostaId = dados.propostaId;

    const propostaSnap = await getDoc(doc(db, "propostas", propostaId));

    if (propostaSnap.exists()) {
      propostaRaw = { id: propostaSnap.id, ...propostaSnap.data() };
    } else {
      const cSnap = await getDoc(doc(db, "contratos", propostaId));
      if (cSnap.exists()) {
        propostaRaw = { id: cSnap.id, ...cSnap.data() };
      }
    }

    if (!propostaRaw) {
      console.warn("Proposta original nao encontrada no banco de dados.");
      return dados;
    }

    const propostaNormalizada = normalizarDadosAceite(propostaRaw);
    const mesclado = mesclarDadosPropostaEContra(dados, propostaNormalizada);

    // Complete property data if missing
    mesclado.imovelTitulo = mesclado.imovelTitulo || getNomeEdificio(propostaNormalizada) || getNomeEdificio(dados);
    mesclado.imovelNomeEdificio = mesclado.imovelTitulo;
    mesclado.imovelEndereco = mesclado.imovelEndereco || getEnderecoImovel(propostaNormalizada) || getEnderecoImovel(dados);
    mesclado.imovelBairro = mesclado.imovelBairro || propostaNormalizada.imovelBairro || propostaRaw.imovelBairro || propostaRaw.bairro || "";
    mesclado.imovelCidade = mesclado.imovelCidade || propostaNormalizada.imovelCidade || propostaRaw.imovelCidade || propostaRaw.cidade || "";
    mesclado.imovelEstado = mesclado.imovelEstado || propostaNormalizada.imovelEstado || propostaRaw.imovelEstado || propostaRaw.estado || "SC";
    mesclado.imovelMatricula = mesclado.imovelMatricula || getMatriculaImovel(propostaNormalizada) || getMatriculaImovel(dados);
    mesclado.imovelCri = mesclado.imovelCri || getCriImovel(propostaNormalizada) || getCriImovel(dados);

    const termosProposta = getTermosCondicoes(propostaNormalizada) || getTermosCondicoes(propostaRaw);
    const formaProposta = getFormaPagamento(propostaNormalizada) || getFormaPagamento(propostaRaw);

    mesclado.termosCondicoes = mesclado.termosCondicoes || termosProposta;
    mesclado.condicoesPagamento = mesclado.condicoesPagamento || termosProposta;
    mesclado.outrasCondicoes = mesclado.outrasCondicoes || termosProposta;
    mesclado.detalhesPagamento = mesclado.detalhesPagamento || termosProposta;
    mesclado.detalhesPagamentoContraproposta = mesclado.detalhesPagamentoContraproposta || termosProposta;
    mesclado.observacoesPagamento = mesclado.observacoesPagamento || termosProposta;

    mesclado.formaPagamento = mesclado.formaPagamento || formaProposta;
    mesclado.formasPagamento = mesclado.formasPagamento || propostaNormalizada.formasPagamento || [];

    // update nested dados as well
    if (mesclado.dados) {
      mesclado.dados.termos = {
        ...(mesclado.dados.termos || {}),
        metodos: mesclado.formasPagamento,
        outrasCondicoes: mesclado.outrasCondicoes || mesclado.condicoesPagamento,
        condicoesPagamento: mesclado.condicoesPagamento,
        detalhesPagamento: mesclado.detalhesPagamento,
        detalhesPagamentoContraproposta: mesclado.detalhesPagamentoContraproposta,
        observacoesPagamento: mesclado.observacoesPagamento,
      };
      if (mesclado.dados.pagamento) {
        mesclado.dados.pagamento = {
          ...(mesclado.dados.pagamento || {}),
          formasPagamento: mesclado.formasPagamento,
          formaPagamento: mesclado.formaPagamento,
          outrasCondicoes: mesclado.outrasCondicoes || mesclado.condicoesPagamento,
          condicoesPagamento: mesclado.condicoesPagamento,
          detalhesPagamento: mesclado.detalhesPagamento,
          detalhesPagamentoContraproposta: mesclado.detalhesPagamentoContraproposta,
          observacoesPagamento: mesclado.observacoesPagamento,
        };
      }
    }

    return mesclado;
  } catch (error) {
    console.error("Erro ao completar contraproposta com proposta original:", error);
    return dados;
  }
}

async function completarVendedorComImovel(dados: any) {
  const temVendedor = getNomeVendedor(dados);

  if (temVendedor) return dados;

  const codigoOuId = dados.imovelId || dados.imovelCodigo;

  if (!codigoOuId) return dados;

  const imovel = await buscarImovelPorCodigoOuId(codigoOuId);

  if (!imovel) return dados;

  const vendedorNomeFinal = getNomeVendedor(imovel);
  const vendedorCpfFinal = getCpfVendedor(imovel);
  const vendedorRgFinal = getRgVendedor(imovel);
  const vendedorProfissaoFinal = getProfissaoVendedor(imovel);
  const vendedorEstadoCivilFinal = getEstadoCivilVendedor(imovel);
  const vendedorTelefoneFinal = getTelefoneVendedor(imovel);
  const vendedorEmailFinal = getEmailVendedor(imovel);
  const vendedorEnderecoFinal = getEnderecoVendedor(imovel);

  return {
    ...dados,
    vendedorNome: vendedorNomeFinal,
    vendedorCpf: vendedorCpfFinal,
    vendedorRg: vendedorRgFinal,
    vendedorProfissao: vendedorProfissaoFinal,
    vendedorEstadoCivil: vendedorEstadoCivilFinal,
    vendedorTelefone: vendedorTelefoneFinal,
    vendedorEmail: vendedorEmailFinal,
    vendedorEndereco: vendedorEnderecoFinal,
    dados: {
      ...dados.dados,
      vendedor: {
        ...dados.dados?.vendedor,
        nome: vendedorNomeFinal,
        cpf: vendedorCpfFinal,
        rg: vendedorRgFinal,
        profissao: vendedorProfissaoFinal,
        estadoCivil: vendedorEstadoCivilFinal,
        telefone: vendedorTelefoneFinal,
        email: vendedorEmailFinal,
        endereco: vendedorEnderecoFinal
      }
    }
  };
}

async function completarComCadastroImovel(dados: any) {
  const codigoOuId = dados.imovelId || dados.imovelCodigo;
  if (!codigoOuId) return dados;

  try {
    console.log("Tentando buscar dados adicionais do imovel no cadastro geral:", codigoOuId);
    const imovel: any = await buscarImovelPorCodigoOuId(codigoOuId);
    if (!imovel) {
      console.warn("Imovel nao localizado no cadastro geral pelo ID ou Codigo:", codigoOuId);
      return dados;
    }

    const imTituloRaw = getNomeEdificio(imovel);
    const imEnderecoRaw = getEnderecoImovel(imovel);
    const imMatriculaRaw = getMatriculaImovel(imovel);
    const imCriRaw = getCriImovel(imovel);

    const temVendedor = getNomeVendedor(dados);
    const vendedorNomeFinal = temVendedor ? getNomeVendedor(dados) : getNomeVendedor(imovel);
    const vendedorCpfFinal = temVendedor ? getCpfVendedor(dados) : getCpfVendedor(imovel);
    const vendedorRgFinal = temVendedor ? getRgVendedor(dados) : getRgVendedor(imovel);
    const vendedorProfissaoFinal = temVendedor ? getProfissaoVendedor(dados) : getProfissaoVendedor(imovel);
    const vendedorEstadoCivilFinal = temVendedor ? getEstadoCivilVendedor(dados) : getEstadoCivilVendedor(imovel);
    const vendedorTelefoneFinal = temVendedor ? getTelefoneVendedor(dados) : getTelefoneVendedor(imovel);
    const vendedorEmailFinal = temVendedor ? getEmailVendedor(dados) : getEmailVendedor(imovel);
    const vendedorEnderecoFinal = temVendedor ? getEnderecoVendedor(dados) : getEnderecoVendedor(imovel);

    return {
      ...dados,
      imovelId: dados.imovelId || imovel.id || "",
      imovelCodigo: dados.imovelCodigo || imovel.codigo || imovel.codigoImovel || imovel.code || "",
      imovelBairro: dados.imovelBairro || imovel.bairro || "",
      imovelCidade: dados.imovelCidade || imovel.cidade || "",
      imovelEstado: dados.imovelEstado || imovel.estado || "SC",
      imovelTitulo: dados.imovelTitulo || imTituloRaw,
      imovelNomeEdificio: dados.imovelNomeEdificio || imTituloRaw,
      imovelEndereco: dados.imovelEndereco || imEnderecoRaw,
      imovelMatricula: dados.imovelMatricula || imMatriculaRaw,
      imovelCri: dados.imovelCri || imCriRaw,

      vendedorNome: vendedorNomeFinal,
      vendedorCpf: vendedorCpfFinal,
      vendedorRg: vendedorRgFinal,
      vendedorProfissao: vendedorProfissaoFinal,
      vendedorEstadoCivil: vendedorEstadoCivilFinal,
      vendedorTelefone: vendedorTelefoneFinal,
      vendedorEmail: vendedorEmailFinal,
      vendedorEndereco: vendedorEnderecoFinal,

      dados: {
        ...dados.dados,
        vendedor: {
          ...dados.dados?.vendedor,
          nome: vendedorNomeFinal,
          cpf: vendedorCpfFinal,
          rg: vendedorRgFinal,
          profissao: vendedorProfissaoFinal,
          estadoCivil: vendedorEstadoCivilFinal,
          telefone: vendedorTelefoneFinal,
          email: vendedorEmailFinal,
          endereco: vendedorEnderecoFinal
        },
        imovel: {
          ...dados.dados?.imovel,
          titulo: dados.imovelTitulo || imTituloRaw,
          endereco: dados.imovelEndereco || imEnderecoRaw,
          bairro: dados.imovelBairro || imovel.bairro || "",
          cidade: dados.imovelCidade || imovel.cidade || "",
          estado: dados.imovelEstado || imovel.estado || "SC",
          matricula: dados.imovelMatricula || imMatriculaRaw,
          cri: dados.imovelCri || imCriRaw
        }
      }
    };
  } catch (err) {
    console.error("Erro ao completar dados com o cadastro do imovel:", err);
    return dados;
  }
}

function mesclarDadosPropostaEContra(dados: any, proposta: any) {
  const nomeFinal = getNomeComprador(dados) || getNomeComprador(proposta);
  return {
    ...proposta,
    ...dados,

    compradorNome: nomeFinal,
    proponenteNome: nomeFinal,
    nomeComprador: nomeFinal,
    nomeCompleto: nomeFinal,
    compradorCpf: dados.compradorCpf || proposta.compradorCpf,
    compradorRg: dados.compradorRg || proposta.compradorRg,
    compradorProfissao: dados.compradorProfissao || proposta.compradorProfissao,
    compradorEstadoCivil: dados.compradorEstadoCivil || proposta.compradorEstadoCivil,
    compradorTelefone: dados.compradorTelefone || proposta.compradorTelefone,
    compradorEmail: dados.compradorEmail || proposta.compradorEmail,
    compradorEndereco: dados.compradorEndereco || proposta.compradorEndereco,

    compradorConjugeNome: dados.compradorConjugeNome || proposta.compradorConjugeNome,
    compradorConjugeCpf: dados.compradorConjugeCpf || proposta.compradorConjugeCpf,

    imovelTitulo: dados.imovelTitulo || proposta.imovelTitulo,
    imovelMatricula: dados.imovelMatricula || proposta.imovelMatricula,
    imovelCri: dados.imovelCri || proposta.imovelCri,
    imovelEndereco: dados.imovelEndereco || proposta.imovelEndereco,

    condicoesPagamento: dados.condicoesPagamento || proposta.condicoesPagamento || "",
    outrasCondicoes: dados.outrasCondicoes || proposta.outrasCondicoes || "",
    valorPorExtenso: dados.valorPorExtenso || proposta.valorPorExtenso,
    dataProposta: dados.dataProposta || proposta.dataProposta,
    
    dados: {
      ...proposta.dados,
      ...dados.dados,
      proponente: {
        ...proposta.dados?.proponente,
        ...dados.dados?.proponente,
        nome: nomeFinal,
        cpf: dados.compradorCpf || proposta.compradorCpf,
        rg: dados.compradorRg || proposta.compradorRg,
        profissao: dados.compradorProfissao || proposta.compradorProfissao,
        estadoCivil: dados.compradorEstadoCivil || proposta.compradorEstadoCivil,
        telefone: dados.compradorTelefone || proposta.compradorTelefone,
        email: dados.compradorEmail || proposta.compradorEmail,
        endereco: dados.compradorEndereco || proposta.compradorEndereco,
        compradorConjugeNome: dados.compradorConjugeNome || proposta.compradorConjugeNome,
        compradorConjugeCpf: dados.compradorConjugeCpf || proposta.compradorConjugeCpf,
      },
      imovel: {
        ...proposta.dados?.imovel,
        ...dados.dados?.imovel,
        titulo: dados.imovelTitulo || proposta.imovelTitulo,
        matricula: dados.imovelMatricula || proposta.imovelMatricula,
        cri: dados.imovelCri || proposta.imovelCri,
        endereco: dados.imovelEndereco || proposta.imovelEndereco,
      }
    }
  };
}

type Step = 'tipo' | 'dados' | 'pagamento' | 'revisao';

export default function AdminContractForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreviewOnly = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const lastConvertedValueRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(id ? true : false);
  const [step, setStep] = useState<Step>(isPreviewOnly ? 'revisao' : 'tipo');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propostas, setPropostas] = useState<any[]>([]);
  const [temConjugeComprador, setTemConjugeComprador] = useState(false);
  const [temConjugeVendedor, setTemConjugeVendedor] = useState(false);
  const [temConjugeLocador, setTemConjugeLocador] = useState(false);
  const [temConjugeLocatario, setTemConjugeLocatario] = useState(false);

  const [contract, setContract] = useState<Partial<Contract>>({
    tipoContrato: 'proposta',
    status: 'rascunho',
    nomeCliente: '',
    nomeVendedor: '',
    enderecoImovel: '',
    valor: 0,
    local: 'Balneário Camboriú - SC',
    data: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    dados: {
      proponente: { estadoCivil: 'Solteiro(a)' },
      vendedor: { estadoCivil: 'Solteiro(a)' },
      aceitante: { estadoCivil: 'Solteiro(a)' },
      locador: { estadoCivil: 'Solteiro(a)' },
      locatario: { estadoCivil: 'Solteiro(a)' },
      prazo: { finalidade: 'Temporada' },
      valores: { valorDiario: 0, taxaLimpeza: 0, taxaCaucao: 0, taxasAdicionais: 0, desconto: 0 },
      regras: {},
      assinaturas: {},
      imovel: {},
      pagamento: { metodos: [] },
      termos: { metodos: [] },
      objeto: { tipoAceite: 'proposta' }
    }
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const clausulasPadrao: Record<string, Array<{id: string, titulo: string, texto: string, ordem: number}>> = {
    proposta: [
      {
        id: "fallback-prop-1",
        titulo: "Do Objeto e Caráter Irretratável",
        texto: "A presente proposta tem por objeto manifestar o interesse inequívoco na aquisição/locação do imóvel, em caráter irrevogável e irretratável após o aceite do vendedor/locador.",
        ordem: 1
      },
      {
        id: "fallback-prop-2",
        titulo: "Da Validade da Proposta",
        texto: "Esta proposta é válida por 5 (cinco) dias úteis a contar de sua assinatura, findo os quais decairá sem ônus adicionais se não aceita expressamente.",
        ordem: 2
      }
    ],
    temporada: [
      {
        id: "fallback-temp-1",
        titulo: "Da Destinação do Imóvel",
        texto: "O imóvel locado destinar-se exclusivamente para fins residenciais por temporada, sendo expressamente proibida a sublocação, cessão ou uso comercial.",
        ordem: 1
      },
      {
        id: "fallback-temp-2",
        titulo: "Das Regras de Convivência e Danos",
        texto: "O locatário compromete-se a respeitar as convenções de condomínio e devolver o imóvel nas mesmas condições recebidas, respondendo integralmente por eventuais avarias.",
        ordem: 2
      }
    ],
    aluguel: [
      {
        id: "fallback-alug-1",
        titulo: "Da Vigência e Reajuste",
        texto: "A locação residencial terá o prazo pactuado nas condições gerais, sendo o aluguel reajustado anualmente com base na variação positiva do IPCA/IBGE ou outro índice oficial.",
        ordem: 1
      },
      {
        id: "fallback-alug-2",
        titulo: "Dos Encargos e Multas por Atraso",
        texto: "O pagamento do aluguel após a data do vencimento ensejará multa moratória de 10% (dez por cento) acrescida de juros de 1% ao mês pró-rata.",
        ordem: 2
      }
    ],
    venda: [
      {
        id: "fallback-venda-1",
        titulo: "Do Preço e Condições de Pagamento",
        texto: "O preço certo e ajustado da transação imobiliária dar-se-á nos estritos termos pactuados, com quitação formal descrita nos métodos de pagamento aprovados.",
        ordem: 1
      },
      {
        id: "fallback-venda-2",
        titulo: "Da Outorga da Escritura",
        texto: "A escritura definitiva de compra e venda será outorgada em favor do comprador após a quitação integral do preço ora estabelecido.",
        ordem: 2
      }
    ],
    arras_confirmatorios: [
      {
        id: "fallback-arras-1",
        titulo: "CLÁUSULA 1ª - DO OBJETO",
        texto: "O presente instrumento tem por objeto a formalização do pagamento de arras confirmatórias referente à intenção de compra e venda do imóvel descrito neste contrato.",
        ordem: 1
      },
      {
        id: "fallback-arras-2",
        titulo: "CLÁUSULA 2ª - DO IMÓVEL",
        texto: "O imóvel objeto deste instrumento é aquele identificado pelas partes, contendo suas características, localização, matrícula, cadastro e demais informações constantes neste contrato.",
        ordem: 2
      },
      {
        id: "fallback-arras-3",
        titulo: "CLÁUSULA 3ª - DO VALOR TOTAL DO NEGÓCIO",
        texto: "As partes ajustam que o valor total da negociação do imóvel será aquele informado neste instrumento, podendo ser pago conforme as condições acordadas entre comprador e vendedor.",
        ordem: 3
      },
      {
        id: "fallback-arras-4",
        titulo: "CLÁUSULA 4ª - DAS ARRAS CONFIRMATÓRIAS",
        texto: "O comprador entrega ao vendedor, neste ato ou na data indicada neste instrumento, o valor defined como arras confirmatórias, servindo como sinal de confirmação do negócio e princípio de pagamento.",
        ordem: 4
      },
      {
        id: "fallback-arras-5",
        titulo: "CLÁUSULA 5ª - DA FORMA DE PAGAMENTO DAS ARRAS",
        texto: "O pagamento das arras será realizado conforme forma, data e condições informadas neste instrumento, mediante comprovação pelas partes.",
        ordem: 5
      },
      {
        id: "fallback-arras-6",
        titulo: "CLÁUSULA 6ª - DA DESISTÊNCIA DO COMPRADOR",
        texto: "Em caso de desistência injustificada por parte do comprador, este poderá perder em favor do vendedor o valor pago a título de arras, salvo disposição diversa acordada entre as partes.",
        ordem: 6
      },
      {
        id: "fallback-arras-7",
        titulo: "CLÁUSULA 7ª - DA DESISTÊNCIA DO VENDEDOR",
        texto: "Em caso de desistência injustificada por parte do vendedor, este deverá restituir ao comprador o valor recebido a título de arras, podendo incidir devolução em dobro quando aplicável, conforme legislação vigente e condições pactuadas.",
        ordem: 7
      },
      {
        id: "fallback-arras-8",
        titulo: "CLÁUSULA 8ª - DO CONTRATO DEFINITIVO",
        texto: "As partes se comprometem a formalizar o contrato definitivo de compra e venda ou escritura pública dentro do prazo ajustado neste instrumento, desde que cumpridas as condições estabelecidas.",
        ordem: 8
      },
      {
        id: "fallback-arras-9",
        titulo: "CLÁUSULA 9ª - DAS OBRIGAÇÕES DAS PARTES",
        texto: "Comprador e vendedor comprometem-se a fornecer documentos, informações e assinaturas necessárias para conclusão da negociação, agindo com boa-fé e transparência.",
        ordem: 9
      },
      {
        id: "fallback-arras-10",
        titulo: "CLÁUSULA 10ª - DA INTERMEDIAÇÃO IMOBILIÁRIA",
        texto: "As partes reconhecem a participação da imobiliária/intermediadora na aproximação e formalização do negócio, conforme condições comerciais previamente acordadas.",
        ordem: 10
      },
      {
        id: "fallback-arras-11",
        titulo: "CLÁUSULA 11ª - DAS DISPOSIÇÕES GERAIS",
        texto: "Este instrumento obriga as partes, seus herdeiros e sucessores, sendo firmado em comum acordo, após leitura e compreensão de todas as condições.",
        ordem: 11
      },
      {
        id: "fallback-arras-12",
        titulo: "CLÁUSULA 12ª - DO FORO",
        texto: "Fica eleito o foro da comarca competente para dirimir eventuais dúvidas ou controvérsias decorrentes deste instrumento.",
        ordem: 12
      }
    ]
  };

  const [allSysClauses, setAllSysClauses] = useState<any[]>([]);

  useEffect(() => {
    const fetchSysClauses = async () => {
      console.log("Carregando cláusulas de clausulasContratos...");
      try {
        const q = query(collection(db, 'clausulasContratos'), orderBy('ordem', 'asc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(dSnapshot => ({ id: dSnapshot.id, ...dSnapshot.data() }));
        console.log("Cláusulas carregadas da collection oficial:", list.length);
        
        if (list.length === 0) {
          console.log("Nenhuma cláusula cadastrada. Aplicando fallbacks padrão de cláusulas...");
          const fallbacks = Object.entries(clausulasPadrao).flatMap(([tipo, clauses]) => 
            clauses.map(c => ({
              id: c.id,
              titulo: c.titulo,
              texto: c.texto,
              ordem: c.ordem,
              ativo: true,
              obrigatorio: true,
              tipo: tipo
            }))
          );
          setAllSysClauses(fallbacks);
        } else {
          setAllSysClauses(list);
        }
      } catch (e: any) {
        console.error("Erro ao carregar cláusulas de clausulasContratos (permissão ou falha):", e?.code, e?.message, e);
        console.log("Aplicando fallbacks padrão devido à falha na leitura das cláusulas.");
        const fallbacks = Object.entries(clausulasPadrao).flatMap(([tipo, clauses]) => 
          clauses.map(c => ({
            id: c.id,
            titulo: c.titulo,
            texto: c.texto,
            ordem: c.ordem,
            ativo: true,
            obrigatorio: true,
            tipo: tipo
          }))
        );
        setAllSysClauses(fallbacks);
      }
    };
    fetchSysClauses();
  }, [contract.tipoContrato]);

  useEffect(() => {
    if (allSysClauses.length === 0) return;
    
    // Check if contract already has selected clauses
    if (contract.dados?.clausulasSelecionadas && contract.dados.clausulasSelecionadas.length > 0) {
      return;
    }

    // Auto-select mandatory clauses for the current contract type
    const mandatory = allSysClauses
      .filter(c => c.ativo && c.obrigatorio && (c.tipo === 'todos' || c.tipo === contract.tipoContrato))
      .map(c => ({
        id: c.id,
        titulo: c.titulo,
        texto: c.texto,
        ordem: c.ordem
      }));

    if (mandatory.length > 0) {
      setContract(prev => ({
        ...prev,
        dados: {
          ...prev.dados,
          clausulasSelecionadas: mandatory
        }
      }));
    }
  }, [contract.tipoContrato, allSysClauses, contract.dados?.clausulasSelecionadas]);

  const diffInDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    try {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return 1;
    }
  };

  // Preencher automaticamente o valor por extenso conforme o valor total negociado
  useEffect(() => {
    const valor = Number(contract.valor || 0);
    const section = contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos';
    const currentExtenso = contract.dados?.[section]?.valorExtenso || '';

    if (valor > 0 && (currentExtenso === '' || lastConvertedValueRef.current !== valor)) {
      const extensoGerado = valorMonetarioPorExtenso(valor);
      lastConvertedValueRef.current = valor;

      setContract(prev => {
        const currentSectionData = prev.dados?.[section] || {};
        if (currentSectionData.valorExtenso === extensoGerado) {
          return prev;
        }
        return {
          ...prev,
          dados: {
            ...prev.dados,
            [section]: {
              ...currentSectionData,
              valorExtenso: extensoGerado
            }
          }
        };
      });
    }
  }, [contract.valor, contract.tipoContrato]);

  useEffect(() => {
    if (contract.tipoContrato === 'locacao_temporaria') {
       const v = contract.dados?.valores || {};
       const p = contract.dados?.prazo || {};
       
       const start = p.dataInicio;
       const end = p.dataTermino;
       
       if (start && end) {
         const days = diffInDays(start, end);
         const daily = Number(v.valorDiario) || 0;
         const totalLease = days * daily;
         const cleaning = Number(v.taxaLimpeza) || 0;
         const security = Number(v.taxaCaucao) || 0;
         const additional = Number(v.taxasAdicionais) || 0;
         const discount = Number(v.desconto) || 0;
         const final = totalLease + cleaning + security + additional - discount;
         
         const percComissao = v.percentualComissaoImobiliaria ?? 20;
         const comissao = totalLease * percComissao / 100;
         const repasse = totalLease - comissao;
         
         if (p.quantidadeDias !== days || v.valorTotalLocacao !== totalLease || v.valorFinal !== final || contract.valor !== final || v.valorComissaoImobiliaria !== comissao) {
           setContract(prev => ({
             ...prev,
             valor: final,
             dados: {
               ...prev.dados,
               prazo: { ...prev.dados.prazo, quantidadeDias: days },
               valores: { 
                 ...prev.dados.valores, 
                 valorTotalLocacao: totalLease, 
                 valorFinal: final,
                 percentualComissaoImobiliaria: percComissao,
                 valorComissaoImobiliaria: comissao,
                 valorRepassadoProprietario: repasse
               }
             }
           }));
         }
       }
    }
  }, [
    contract.tipoContrato,
    contract.dados?.prazo?.dataInicio, 
    contract.dados?.prazo?.dataTermino, 
    contract.dados?.valores?.valorDiario, 
    contract.dados?.valores?.taxaLimpeza, 
    contract.dados?.valores?.taxaCaucao, 
    contract.dados?.valores?.taxasAdicionais, 
    contract.dados?.valores?.desconto
  ]);

  const sincronizarECompletarDocumento = (docObj: any) => {
    // 1. Get flat normalized data
    const flatData = normalizarDadosDocumento(docObj);

    // 2. Build or merge with existing sub-objects under .dados
    const existingDados = docObj.dados || {};

    const proponenteMerged = {
      ...existingDados.proponente,
      nome: flatData.compradorNome || existingDados.proponente?.nome || "",
      cpf: flatData.compradorCpf || existingDados.proponente?.cpf || "",
      cpfCnpj: flatData.compradorCpf || existingDados.proponente?.cpfCnpj || "",
      rg: flatData.compradorRg || existingDados.proponente?.rg || "",
      profissao: flatData.compradorProfissao || existingDados.proponente?.profissao || "",
      estadoCivil: flatData.compradorEstadoCivil || existingDados.proponente?.estadoCivil || "Solteiro(a)",
      telefone: flatData.compradorTelefone || existingDados.proponente?.telefone || "",
      email: flatData.compradorEmail || existingDados.proponente?.email || "",
      endereco: flatData.compradorEndereco || existingDados.proponente?.endereco || "",
      compradorConjugeNome: flatData.compradorConjugeNome || existingDados.proponente?.compradorConjugeNome || "",
      compradorConjugeCpf: flatData.compradorConjugeCpf || existingDados.proponente?.compradorConjugeCpf || "",
      compradorConjugeRg: flatData.compradorConjugeRg || existingDados.proponente?.compradorConjugeRg || "",
      compradorConjugeProfissao: flatData.compradorConjugeProfissao || existingDados.proponente?.compradorConjugeProfissao || "",
      compradorConjugeTelefone: flatData.compradorConjugeTelefone || existingDados.proponente?.compradorConjugeTelefone || "",
      compradorConjugeEmail: flatData.compradorConjugeEmail || existingDados.proponente?.compradorConjugeEmail || "",
      compradorConjugeEstadoCivil: flatData.compradorConjugeEstadoCivil || existingDados.proponente?.compradorConjugeEstadoCivil || "",
      compradorConjugeEndereco: flatData.compradorConjugeEndereco || existingDados.proponente?.compradorConjugeEndereco || ""
    };

    const vendedorMerged = {
      ...existingDados.vendedor,
      ...existingDados.aceitante,
      nome: flatData.vendedorNome || existingDados.vendedor?.nome || existingDados.aceitante?.nome || "",
      cpf: flatData.vendedorCpf || existingDados.vendedor?.cpf || existingDados.aceitante?.cpf || "",
      cpfCnpj: flatData.vendedorCpf || existingDados.vendedor?.cpfCnpj || existingDados.aceitante?.cpfCnpj || "",
      rg: flatData.vendedorRg || existingDados.vendedor?.rg || existingDados.aceitante?.rg || "",
      profissao: flatData.vendedorProfissao || existingDados.vendedor?.profissao || existingDados.aceitante?.profissao || "",
      estadoCivil: flatData.vendedorEstadoCivil || existingDados.vendedor?.estadoCivil || existingDados.aceitante?.estadoCivil || "Solteiro(a)",
      telefone: flatData.vendedorTelefone || existingDados.vendedor?.telefone || existingDados.aceitante?.telefone || "",
      email: flatData.vendedorEmail || existingDados.vendedor?.email || existingDados.aceitante?.email || "",
      endereco: flatData.vendedorEndereco || existingDados.vendedor?.endereco || existingDados.aceitante?.endereco || "",
      vendedorConjugeNome: flatData.vendedorConjugeNome || existingDados.vendedor?.vendedorConjugeNome || "",
      vendedorConjugeCpf: flatData.vendedorConjugeCpf || existingDados.vendedor?.vendedorConjugeCpf || "",
      vendedorConjugeRg: flatData.vendedorConjugeRg || existingDados.vendedor?.vendedorConjugeRg || "",
      vendedorConjugeProfissao: flatData.vendedorConjugeProfissao || existingDados.vendedor?.vendedorConjugeProfissao || "",
      vendedorConjugeTelefone: flatData.vendedorConjugeTelefone || existingDados.vendedor?.vendedorConjugeTelefone || "",
      vendedorConjugeEmail: flatData.vendedorConjugeEmail || existingDados.vendedor?.vendedorConjugeEmail || "",
      vendedorConjugeEstadoCivil: flatData.vendedorConjugeEstadoCivil || existingDados.vendedor?.vendedorConjugeEstadoCivil || "",
      vendedorConjugeEndereco: flatData.vendedorConjugeEndereco || existingDados.vendedor?.vendedorConjugeEndereco || ""
    };

    const locadorMerged = {
      ...existingDados.locador,
      nome: flatData.locadorNome || existingDados.locador?.nome || "",
      cpf: flatData.locadorCpf || existingDados.locador?.cpf || "",
      rg: flatData.locadorRg || existingDados.locador?.rg || "",
      profissao: flatData.locadorProfissao || existingDados.locador?.profissao || "",
      estadoCivil: flatData.locadorEstadoCivil || existingDados.locador?.estadoCivil || "Solteiro(a)",
      telefone: flatData.locadorTelefone || existingDados.locador?.telefone || "",
      email: flatData.locadorEmail || existingDados.locador?.email || "",
      endereco: flatData.locadorEndereco || existingDados.locador?.endereco || "",
      locadorConjugeNome: flatData.locadorConjugeNome || existingDados.locador?.locadorConjugeNome || "",
      locadorConjugeCpf: flatData.locadorConjugeCpf || existingDados.locador?.locadorConjugeCpf || "",
      locadorConjugeRg: flatData.locadorConjugeRg || existingDados.locador?.locadorConjugeRg || "",
      locadorConjugeProfissao: flatData.locadorConjugeProfissao || existingDados.locador?.locadorConjugeProfissao || "",
      locadorConjugeTelefone: flatData.locadorConjugeTelefone || existingDados.locador?.locadorConjugeTelefone || "",
      locadorConjugeEmail: flatData.locadorConjugeEmail || existingDados.locador?.locadorConjugeEmail || "",
      locadorConjugeEstadoCivil: flatData.locadorConjugeEstadoCivil || existingDados.locador?.locadorConjugeEstadoCivil || "",
      locadorConjugeEndereco: flatData.locadorConjugeEndereco || existingDados.locador?.locadorConjugeEndereco || ""
    };

    const locatarioMerged = {
      ...existingDados.locatario,
      nome: flatData.locatarioNome || existingDados.locatario?.nome || "",
      cpf: flatData.locatarioCpf || existingDados.locatario?.cpf || "",
      rg: flatData.locatarioRg || existingDados.locatario?.rg || "",
      profissao: flatData.locatarioProfissao || existingDados.locatario?.profissao || "",
      estadoCivil: flatData.locatarioEstadoCivil || existingDados.locatario?.estadoCivil || "Solteiro(a)",
      telefone: flatData.locatarioTelefone || existingDados.locatario?.telefone || "",
      email: flatData.locatarioEmail || existingDados.locatario?.email || "",
      endereco: flatData.locatarioEndereco || existingDados.locatario?.endereco || "",
      locatarioConjugeNome: flatData.locatarioConjugeNome || existingDados.locatario?.locatarioConjugeNome || "",
      locatarioConjugeCpf: flatData.locatarioConjugeCpf || existingDados.locatario?.locatarioConjugeCpf || "",
      locatarioConjugeRg: flatData.locatarioConjugeRg || existingDados.locatario?.locatarioConjugeRg || "",
      locatarioConjugeProfissao: flatData.locatarioConjugeProfissao || existingDados.locatario?.locatarioConjugeProfissao || "",
      locatarioConjugeTelefone: flatData.locatarioConjugeTelefone || existingDados.locatario?.locatarioConjugeTelefone || "",
      locatarioConjugeEmail: flatData.locatarioConjugeEmail || existingDados.locatario?.locatarioConjugeEmail || "",
      locatarioConjugeEstadoCivil: flatData.locatarioConjugeEstadoCivil || existingDados.locatario?.locatarioConjugeEstadoCivil || "",
      locatarioConjugeEndereco: flatData.locatarioConjugeEndereco || existingDados.locatario?.locatarioConjugeEndereco || ""
    };

    const imovelMerged = {
      ...existingDados.imovel,
      titulo: flatData.imovelTitulo || existingDados.imovel?.titulo || "",
      cri: flatData.imovelCri || existingDados.imovel?.cri || "",
      matricula: flatData.imovelMatricula || existingDados.imovel?.matricula || "",
      codigo: flatData.imovelCodigo || existingDados.imovel?.codigo || "",
      endereco: flatData.imovelEndereco || existingDados.imovel?.endereco || "",
      bairro: flatData.imovelBairro || existingDados.imovel?.bairro || "",
      cidade: flatData.imovelCidade || existingDados.imovel?.cidade || "",
      estado: flatData.imovelEstado || existingDados.imovel?.estado || "",
      tipo: flatData.imovelTipo || existingDados.imovel?.tipo || ""
    };

    const detalhesFinal = getDetalhesPagamento(docObj) || getDetalhesPagamento(flatData) || getDetalhesPagamento(existingDados.pagamento) || getDetalhesPagamento(existingDados.termos) || "";

    const pagamentoMerged = {
      ...existingDados.pagamento,
      metodos: flatData.formasPagamento || existingDados.pagamento?.metodos || [],
      valorExtenso: flatData.valorPorExtenso || existingDados.pagamento?.valorExtenso || "",
      outrasCondicoes: detalhesFinal,
      detalhesPagamento: detalhesFinal,
      detalhesPagamentoContraproposta: detalhesFinal,
      condicoesPagamento: detalhesFinal,
      observacoesPagamento: detalhesFinal,
      clausulaPagamento: detalhesFinal,
      observacoes: flatData.observacoes || existingDados.pagamento?.observacoes || ""
    };

    const termosMerged = {
      ...existingDados.termos,
      metodos: flatData.formasPagamento || existingDados.termos?.metodos || [],
      valorExtenso: flatData.valorPorExtenso || existingDados.termos?.valorExtenso || "",
      outrasCondicoes: detalhesFinal,
      detalhesPagamento: detalhesFinal,
      detalhesPagamentoContraproposta: detalhesFinal,
      condicoesPagamento: detalhesFinal,
      observacoesPagamento: detalhesFinal,
      clausulaPagamento: detalhesFinal,
      observacoes: flatData.observacoes || existingDados.termos?.observacoes || ""
    };

    if (proponenteMerged.compradorConjugeNome) setTemConjugeComprador(true);
    if (vendedorMerged.vendedorConjugeNome) setTemConjugeVendedor(true);
    if (locadorMerged.locadorConjugeNome) setTemConjugeLocador(true);
    if (locatarioMerged.locatarioConjugeNome) setTemConjugeLocatario(true);

    return {
      ...docObj,
      ...flatData,
      detalhesPagamento: detalhesFinal,
      detalhesPagamentoContraproposta: detalhesFinal,
      outrasCondicoes: detalhesFinal,
      condicoesPagamento: detalhesFinal,
      observacoesPagamento: detalhesFinal,
      clausulaPagamento: detalhesFinal,
      dados: {
        ...existingDados,
        proponente: proponenteMerged,
        vendedor: vendedorMerged,
        locador: locadorMerged,
        locatario: locatarioMerged,
        imovel: imovelMerged,
        pagamento: pagamentoMerged,
        termos: termosMerged
      }
    };
  };

  useEffect(() => {
    const fetchProperties = async () => {
      const q = query(collection(db, 'imoveis'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[]);
    };

    const fetchPropostas = async () => {
      try {
        const snap = await getDocs(collection(db, 'propostas'));
        setPropostas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Erro ao buscar propostas:", err);
      }
    };

    const fetchContract = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'contratos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          let data = docSnap.data() as any;

          // If it's an old contract, arras, or update, and proposalId is present, we complete the missing fields
          if (data.tipoContrato !== 'proposta' && data.propostaId) {
            try {
              const propostaSnap = await getDoc(doc(db, "propostas", data.propostaId));
              if (propostaSnap.exists()) {
                const propostaDados = propostaSnap.data() as any;
                
                // Merge fields dynamically from proposal if currently missing or default in contract
                const normalizedProp = normalizarDadosDocumento({ id: propostaSnap.id, ...propostaDados });
                const normalizedContract = normalizarDadosDocumento({ id: docSnap.id, ...data });

                const outrasCondVal = getOutrasCondicoes(normalizedProp) || getOutrasCondicoes(propostaDados) || getOutrasCondicoes(propostaDados?.dados?.pagamento) || getOutrasCondicoes(propostaDados?.dados?.termos) || "";
                 
                data = {
                  ...normalizedProp,
                  ...data,
                  outrasCondicoes: data.outrasCondicoes || outrasCondVal,
                  detalhesPagamento: data.detalhesPagamento || outrasCondVal,
                  detalhesPagamentoContraproposta: data.detalhesPagamentoContraproposta || outrasCondVal,
                  observacoesPagamento: data.observacoesPagamento || outrasCondVal,
                  
                  imovelCri: normalizedContract.imovelCri || normalizedProp.imovelCri || "",
                  imovelMatricula: normalizedContract.imovelMatricula || normalizedProp.imovelMatricula || "",
                  imovelTitulo: normalizedContract.imovelTitulo || normalizedProp.imovelTitulo || "",
                  condicoesPagamento: data.condicoesPagamento || normalizedContract.condicoesPagamento || normalizedProp.condicoesPagamento || outrasCondVal || "",
                  dataProposta: normalizedContract.dataProposta || normalizedProp.dataProposta || "",
                  valorPorExtenso: normalizedContract.valorPorExtenso || normalizedProp.valorPorExtenso || ""
                };

                if (!data.dados) data.dados = {};
                if (!data.dados.pagamento) data.dados.pagamento = {};
                if (!data.dados.termos) data.dados.termos = {};

                data.dados.pagamento = {
                  ...propostaDados?.dados?.pagamento,
                  ...data.dados.pagamento,
                  outrasCondicoes: data.dados.pagamento?.outrasCondicoes || outrasCondVal,
                  detalhesPagamento: data.dados.pagamento?.detalhesPagamento || outrasCondVal,
                  detalhesPagamentoContraproposta: data.dados.pagamento?.detalhesPagamentoContraproposta || outrasCondVal,
                  condicoesPagamento: data.dados.pagamento?.condicoesPagamento || outrasCondVal,
                  observacoesPagamento: data.dados.pagamento?.observacoesPagamento || outrasCondVal,
                };

                data.dados.termos = {
                  ...propostaDados?.dados?.termos,
                  ...data.dados.termos,
                  outrasCondicoes: data.dados.termos?.outrasCondicoes || outrasCondVal,
                  detalhesPagamento: data.dados.termos?.detalhesPagamento || outrasCondVal,
                  detalhesPagamentoContraproposta: data.dados.termos?.detalhesPagamentoContraproposta || outrasCondVal,
                  condicoesPagamento: data.dados.termos?.condicoesPagamento || outrasCondVal,
                  observacoesPagamento: data.dados.termos?.observacoesPagamento || outrasCondVal,
                };
              }
            } catch (propErr) {
              console.error("Erro ao completar dados da proposta:", propErr);
            }
          }

          if (data.tipoContrato === 'arras_confirmatorios') {
            if (!data.dados) data.dados = {};
            if (!data.dados.proponente) data.dados.proponente = {};
            if (!data.dados.vendedor) data.dados.vendedor = {};
            if (!data.dados.arras) data.dados.arras = {};
            
            if (data.comprador) {
              data.dados.proponente = {
                ...data.dados.proponente,
                cpf: data.comprador.documento || data.dados.proponente.cpf,
                cpfCnpj: data.comprador.documento || data.dados.proponente.cpfCnpj,
                rg: data.comprador.rg || data.dados.proponente.rg,
                estadoCivil: data.comprador.estadoCivil || data.dados.proponente.estadoCivil,
                profissao: data.comprador.profissao || data.dados.proponente.profissao,
                telefone: data.comprador.telefone || data.dados.proponente.telefone,
                whatsapp: data.comprador.whatsapp || data.dados.proponente.whatsapp,
                email: data.comprador.email || data.dados.proponente.email,
                endereco: data.comprador.endereco || data.dados.proponente.endereco,
              };
            }
            if (data.vendedor) {
              data.dados.vendedor = {
                ...data.dados.vendedor,
                cpf: data.vendedor.documento || data.dados.vendedor.cpf,
                cpfCnpj: data.vendedor.documento || data.dados.vendedor.cpfCnpj,
                rg: data.vendedor.rg || data.dados.vendedor.rg,
                estadoCivil: data.vendedor.estadoCivil || data.dados.vendedor.estadoCivil,
                profissao: data.vendedor.profissao || data.dados.vendedor.profissao,
                telefone: data.vendedor.telefone || data.dados.vendedor.telefone,
                whatsapp: data.vendedor.whatsapp || data.dados.vendedor.whatsapp,
                email: data.vendedor.email || data.dados.vendedor.email,
                endereco: data.vendedor.endereco || data.dados.vendedor.endereco,
              };
            }
            
            data.valorImovel = data.valorImovel || data.dados.arras?.valorImovel || 0;
            data.valorArras = data.valorArras || data.dados.arras?.valorArras || 0;
            data.formaPagamentoArras = data.formaPagamentoArras || data.dados.arras?.formaPagamentoArras || "";
            data.dataPagamentoArras = data.dataPagamentoArras || data.dados.arras?.dataPagamentoArras || "";
            data.prazoContratoDefinitivo = data.prazoContratoDefinitivo || data.dados.arras?.prazoContratoDefinitivo || "";
            data.prazoEscritura = data.prazoEscritura || data.dados.arras?.prazoEscritura || "";

            data.dados.arras = {
              ...data.dados.arras,
              valorImovel: data.valorImovel,
              valorArras: data.valorArras,
              formaPagamentoArras: data.formaPagamentoArras,
              dataPagamentoArras: data.dataPagamentoArras,
              prazoContratoDefinitivo: data.prazoContratoDefinitivo,
              prazoEscritura: data.prazoEscritura
            };
          }

          let imovelOriginal: any = null;
          const lookupId = data.imovelId || data.imovelCodigo || data.dados?.imovel?.id || data.dados?.imovel?.codigo;
          if (lookupId) {
            try {
              imovelOriginal = await buscarImovelPorCodigoOuId(lookupId);
            } catch (imovelErr) {
              console.error("Erro ao buscar dados do imovel original:", imovelErr);
            }
          }

          if (imovelOriginal) {
            const tituloCorreto = getTituloImovel(imovelOriginal);
            if (tituloCorreto && (!data.imovelTitulo || data.imovelTitulo === "Imóvel")) {
              data.imovelTitulo = tituloCorreto;
              data.imovelNomeEdificio = tituloCorreto;
              if (!data.dados) data.dados = {};
              if (!data.dados.imovel) data.dados.imovel = {};
              data.dados.imovel.titulo = tituloCorreto;
            }

            const criCorreto = getCriImovel(imovelOriginal);
            if (criCorreto && (!data.imovelCri || String(data.imovelCri).trim().length <= 2)) {
              data.imovelCri = criCorreto;
              if (!data.dados) data.dados = {};
              if (!data.dados.imovel) data.dados.imovel = {};
              data.dados.imovel.cri = criCorreto;
            }
          }

          const synchronizedData = sincronizarECompletarDocumento(data);

          setContract({ id: docSnap.id, ...synchronizedData } as Contract);
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchProperties();
    fetchPropostas();
    fetchContract();
  }, [id]);

  useEffect(() => {
    const handleUrlParam = async () => {
      const imovelParam = searchParams.get('imovel') || searchParams.get('imovelId');
      if (imovelParam && !id) {
        setLoading(true);
        try {
          const foundImovel = await buscarImovelPorCodigoOuId(imovelParam);
          if (foundImovel) {
            handlePropertySelect(foundImovel as any);
          }
        } catch (error) {
          console.error("Erro ao buscar imóvel do parâmetro da URL:", error);
        } finally {
          setLoading(false);
        }
      }

      // Check for document base loading (Aceite de Termos flow)
      const tipo = searchParams.get('tipo') || searchParams.get('tipoContrato');
      const propostaId = searchParams.get('propostaId');
      const contrapropostaId = searchParams.get('contrapropostaId');
      const documentoBaseId = searchParams.get('documentoBaseId') || searchParams.get('baseId');

      if ((tipo === 'aceite' || propostaId || contrapropostaId || documentoBaseId) && !id) {
        setLoading(true);
        try {
          console.log("Detectado fluxo de Aceite ou carregamento de documento base!");
          console.log("propostaId:", propostaId);
          console.log("contrapropostaId:", contrapropostaId);
          console.log("documentoBaseId:", documentoBaseId);

          let documentoBase: any = null;

          if (contrapropostaId) {
            const snap = await getDoc(doc(db, "contrapropostas", contrapropostaId));
            if (snap.exists()) {
              documentoBase = {
                id: snap.id,
                origem: "contraproposta",
                ...snap.data()
              };
            } else {
              console.log("Tentando buscar na coleção geral de contratos (contrapropostaId)...");
              const cSnap = await getDoc(doc(db, "contratos", contrapropostaId));
              if (cSnap.exists()) {
                documentoBase = {
                  id: cSnap.id,
                  origem: "contraproposta",
                  ...cSnap.data()
                };
              }
            }
          }

          if (!documentoBase && propostaId) {
            const snap = await getDoc(doc(db, "propostas", propostaId));
            if (snap.exists()) {
              documentoBase = {
                id: snap.id,
                origem: "proposta",
                ...snap.data()
              };
            } else {
              console.log("Tentando buscar na coleção geral de contratos (propostaId)...");
              const cSnap = await getDoc(doc(db, "contratos", propostaId));
              if (cSnap.exists()) {
                documentoBase = {
                  id: cSnap.id,
                  origem: "proposta",
                  ...cSnap.data()
                };
              }
            }
          }

          if (!documentoBase && documentoBaseId) {
            const propostaSnap = await getDoc(doc(db, "propostas", documentoBaseId));
            if (propostaSnap.exists()) {
              documentoBase = {
                id: propostaSnap.id,
                origem: "proposta",
                ...propostaSnap.data()
              };
            } else {
              const contraSnap = await getDoc(doc(db, "contrapropostas", documentoBaseId));
              if (contraSnap.exists()) {
                documentoBase = {
                  id: contraSnap.id,
                  origem: "contraproposta",
                  ...contraSnap.data()
                };
              } else {
                console.log("Tentando buscar na coleção geral de contratos (documentoBaseId)...");
                const cSnap = await getDoc(doc(db, "contratos", documentoBaseId));
                if (cSnap.exists()) {
                  const cData = cSnap.data() as any;
                  documentoBase = {
                    id: cSnap.id,
                    origem: cData.tipoContrato || "proposta",
                    ...cData
                  };
                }
              }
            }
          }

          console.log("documentoBase encontrado:", documentoBase);

          if (documentoBase) {
            let dadosAceite = normalizarDadosAceite(documentoBase);

            if (dadosAceite.contrapropostaId || documentoBase.origem === 'contraproposta') {
              dadosAceite = await completarComPropostaOriginal(dadosAceite);
            }

            // Enrich from Property registry if code/ID is available
            dadosAceite = await completarComCadastroImovel(dadosAceite);

            const dAceite = dadosAceite as any;

            console.log("dadosAceite normalizados (enriquecidos):", dAceite);

            console.log("Documento base do aceite:", documentoBase);
            console.log("Campos disponíveis no documento base:", Object.keys(documentoBase));
            console.log("Nome detectado:", getNomeComprador(documentoBase));

            setContract((prev: any) => {
              const nomeCompradorFinal = getNomeComprador(dAceite);
              const finalVal = {
                ...prev,
                ...dAceite,
                tipoContrato: 'aceite',
                status: 'rascunho',
                compradorNome: nomeCompradorFinal,
                proponenteNome: nomeCompradorFinal,
                nomeComprador: nomeCompradorFinal,
                nomeCompleto: nomeCompradorFinal,
                nomeCliente: nomeCompradorFinal || prev.nomeCliente,
                nomeVendedor: dAceite.vendedorNome || prev.nomeVendedor,
                enderecoImovel: dAceite.imovelEndereco || prev.enderecoImovel,
                valor: dAceite.valorAceite || prev.valor,
                imovelTitulo: dAceite.imovelTitulo || prev.imovelTitulo,
                imovelNomeEdificio: dAceite.imovelNomeEdificio || dAceite.imovelTitulo || prev.imovelNomeEdificio || prev.imovelTitulo,
                imovelEndereco: dAceite.imovelEndereco || prev.imovelEndereco,
                imovelBairro: dAceite.imovelBairro || prev.imovelBairro,
                imovelCidade: dAceite.imovelCidade || prev.imovelCidade,
                imovelEstado: dAceite.imovelEstado || prev.imovelEstado,
                imovelMatricula: dAceite.imovelMatricula || prev.imovelMatricula,
                imovelCri: dAceite.imovelCri || prev.imovelCri,
                termosCondicoes: dAceite.termosCondicoes,
                condicoesPagamento: dAceite.condicoesPagamento,
                outrasCondicoes: dAceite.outrasCondicoes,
                detalhesPagamento: dAceite.detalhesPagamento,
                detalhesPagamentoContraproposta: dAceite.detalhesPagamentoContraproposta,
                observacoesPagamento: dAceite.observacoesPagamento,
                formaPagamento: dAceite.formaPagamento,
                formasPagamento: dAceite.formasPagamento || [],
                dados: {
                  ...prev.dados,
                  ...dAceite.dados,
                  proponente: {
                    ...prev.dados?.proponente,
                    ...dAceite.dados?.proponente,
                    nome: nomeCompradorFinal
                  },
                  vendedor: {
                    ...prev.dados?.vendedor,
                    ...dAceite.dados?.vendedor
                  },
                  aceitante: {
                    ...prev.dados?.aceitante,
                    ...dAceite.dados?.aceitante,
                    nome: nomeCompradorFinal
                  },
                  imovel: {
                    ...prev.dados?.imovel,
                    ...dAceite.dados?.imovel,
                    titulo: dAceite.imovelTitulo || prev.dados?.imovel?.titulo,
                    endereco: dAceite.imovelEndereco || prev.dados?.imovel?.endereco,
                    bairro: dAceite.imovelBairro || prev.dados?.imovel?.bairro,
                    cidade: dAceite.imovelCidade || prev.dados?.imovel?.cidade,
                    estado: dAceite.imovelEstado || prev.dados?.imovel?.estado,
                    matricula: dAceite.imovelMatricula || prev.dados?.imovel?.matricula,
                    cri: dAceite.imovelCri || prev.dados?.imovel?.cri
                  }
                }
              };

              console.log("formData final aceite:", finalVal);
              return finalVal;
            });
          } else {
            console.warn("Nenhum documento base do aceite foi encontrado no banco de dados.");
          }
        } catch (error) {
          console.error("Erro ao carregar dados do aceite:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    handleUrlParam();
  }, [searchParams, id]);

  useEffect(() => {
    if (step === 'revisao') {
      const detalhesFinal = getDetalhesPagamento(contract) || getDetalhesPagamento(contract.dados?.[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']);
      if (detalhesFinal) {
        const section = contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos';
        setContract((prev) => ({
          ...prev,
          detalhesPagamento: detalhesFinal,
          detalhesPagamentoContraproposta: detalhesFinal,
          outrasCondicoes: detalhesFinal,
          condicoesPagamento: detalhesFinal,
          observacoesPagamento: detalhesFinal,
          clausulaPagamento: detalhesFinal,
          dados: {
            ...prev.dados,
            [section]: {
              ...prev?.dados?.[section],
              detalhesPagamento: detalhesFinal,
              detalhesPagamentoContraproposta: detalhesFinal,
              outrasCondicoes: detalhesFinal,
              condicoesPagamento: detalhesFinal,
              observacoesPagamento: detalhesFinal,
              clausulaPagamento: detalhesFinal
            }
          }
        }));
        console.log("Detalhes do pagamento indo para revisão:", detalhesFinal);
      }
    }
  }, [step]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setContract(prev => {
      const isArras = prev.tipoContrato === 'arras_confirmatorios';
      const defaultVal = isArras 
        ? (getValorVendaImovel(property) || 0) 
        : (prev.tipoContrato === 'proposta' ? (getValorVendaImovel(property) || 0) : prev.valor);
      
      const tituloFinal = getTituloImovel(property) || "Imóvel";

      const updatedDados = {
        ...prev.dados,
        imovel: {
          ...prev.dados?.imovel,
          matricula: getMatriculaImovel(property),
          cri: getCriImovel(property),
          tipo: property.propertyType || (property as any).tipoImovel || '',
          descricao: property.shortDescription || property.title || getTituloImovel(property),
          codigo: getCodigoImovel(property),
          titulo: tituloFinal,
          endereco: montarEnderecoImovel(property),
          bairro: property.neighborhood || (property as any).bairro || '',
          cidade: property.city || (property as any).cidade || '',
          estado: property.state || (property as any).estado || '',
          valorVenda: getValorVendaImovel(property),
          valorCondominio: property.condoFee || (property as any).valorCondominio || (property as any).condominio || "",
          valorIptu: property.iptu || (property as any).valorIptu || (property as any).iptu || ""
        }
      };

      if (isArras) {
        if (!updatedDados.vendedor) updatedDados.vendedor = {};
        updatedDados.vendedor = {
          ...updatedDados.vendedor,
          nome: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || '',
          telefone: property.ownerPhone || '',
          email: property.ownerEmail || ''
        };
        if (!updatedDados.arras) updatedDados.arras = {};
        updatedDados.arras = {
          ...updatedDados.arras,
          valorImovel: getValorVendaImovel(property)
        };
      }

      return {
        ...prev,
        // Root attributes as requested
        imovelId: property.id,
        imovelCodigo: getCodigoImovel(property),
        imovelTitulo: tituloFinal,
        imovelNomeEdificio: tituloFinal,
        imovelTipo: property.propertyType || (property as any).tipoImovel || "",
        imovelTipoNegocio: (property as any).tipoNegocio || property.businessType || "",
        imovelEndereco: montarEnderecoImovel(property),
        imovelBairro: property.neighborhood || (property as any).bairro || "",
        imovelCidade: property.city || (property as any).cidade || "",
        imovelEstado: property.state || (property as any).estado || "",
        imovelMatricula: getMatriculaImovel(property),
        imovelCri: getCriImovel(property),

        valorImovel: getValorVendaImovel(property),
        valorVenda: getValorVendaImovel(property),
        valorCondominio: property.condoFee || (property as any).valorCondominio || (property as any).condominio || "",
        valorIptu: property.iptu || (property as any).valorIptu || (property as any).iptu || "",

        proprietario: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || "",
        corretorResponsavel: (property as any).corretorResponsavel || (property as any).brokerName || "",

        enderecoImovel: montarEnderecoImovel(property),
        nomeVendedor: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || '',
        valor: defaultVal,
        dados: updatedDados
      };
    });
  };

  const handleLoadProposta = (prop: any) => {
    if (!prop) return;
    setContract(prev => {
      const isArras = prev.tipoContrato === 'arras_confirmatorios';
      const isAceite = prev.tipoContrato === 'aceite';

      // Reconstruct comprador/proponente
      const compradorFromProp = prop.comprador || {};
      const proponente = {
        nome: compradorFromProp.nome || prop.compradorNome || prop.dados?.proponente?.nome || prop.nomeCliente || "",
        cpf: compradorFromProp.documento || prop.compradorCpf || prop.dados?.proponente?.cpf || "",
        rg: compradorFromProp.rg || prop.compradorRg || prop.dados?.proponente?.rg || "",
        estadoCivil: compradorFromProp.estadoCivil || prop.compradorEstadoCivil || prop.dados?.proponente?.estadoCivil || "Solteiro(a)",
        profissao: compradorFromProp.profissao || prop.compradorProfissao || prop.dados?.proponente?.profissao || "",
        telefone: compradorFromProp.telefone || prop.compradorTelefone || prop.dados?.proponente?.telefone || "",
        whatsapp: compradorFromProp.whatsapp || prop.compradorWhatsapp || prop.dados?.proponente?.whatsapp || "",
        email: compradorFromProp.email || prop.compradorEmail || prop.dados?.proponente?.email || "",
        endereco: compradorFromProp.endereco || prop.compradorEndereco || prop.dados?.proponente?.endereco || "",
        cep: prop.compradorCep || prop.dados?.proponente?.cep || "",
        cidade: prop.compradorCidade || prop.dados?.proponente?.cidade || "",
        estado: prop.compradorEstado || prop.dados?.proponente?.estado || "",
        
        compradorConjugeNome: prop.compradorConjugeNome || prop.dados?.proponente?.compradorConjugeNome || prop.dados?.proponente?.conjugeNome || "",
        compradorConjugeCpf: prop.compradorConjugeCpf || prop.dados?.proponente?.compradorConjugeCpf || prop.dados?.proponente?.conjugeCpf || "",
        compradorConjugeRg: prop.compradorConjugeRg || prop.dados?.proponente?.compradorConjugeRg || prop.dados?.proponente?.conjugeRg || "",
        compradorConjugeProfissao: prop.compradorConjugeProfissao || prop.dados?.proponente?.compradorConjugeProfissao || prop.dados?.proponente?.conjugeProfissao || "",
        compradorConjugeTelefone: prop.compradorConjugeTelefone || prop.dados?.proponente?.compradorConjugeTelefone || prop.dados?.proponente?.conjugeTelefone || "",
        compradorConjugeEmail: prop.compradorConjugeEmail || prop.dados?.proponente?.compradorConjugeEmail || prop.dados?.proponente?.conjugeEmail || "",
        compradorConjugeEstadoCivil: prop.compradorConjugeEstadoCivil || prop.dados?.proponente?.compradorConjugeEstadoCivil || prop.dados?.proponente?.conjugeEstadoCivil || "",
        compradorConjugeEndereco: prop.compradorConjugeEndereco || prop.dados?.proponente?.compradorConjugeEndereco || prop.dados?.proponente?.conjugeEndereco || "",
        
        conjugeNome: prop.compradorConjugeNome || prop.dados?.proponente?.compradorConjugeNome || prop.dados?.proponente?.conjugeNome || "",
        conjugeCpf: prop.compradorConjugeCpf || prop.dados?.proponente?.compradorConjugeCpf || prop.dados?.proponente?.conjugeCpf || "",
      };

      // Reconstruct vendedor
      const vendedorFromProp = prop.vendedor || {};
      const vendedor = {
        nome: vendedorFromProp.nome || prop.vendedorNome || prop.dados?.vendedor?.nome || prop.nomeVendedor || "",
        cpf: vendedorFromProp.documento || prop.vendedorCpf || prop.dados?.vendedor?.cpf || "",
        rg: vendedorFromProp.rg || prop.vendedorRg || prop.dados?.vendedor?.rg || "",
        estadoCivil: vendedorFromProp.estadoCivil || prop.vendedorEstadoCivil || prop.dados?.vendedor?.estadoCivil || "Solteiro(a)",
        profissao: vendedorFromProp.profissao || prop.vendedorProfissao || prop.dados?.vendedor?.profissao || "",
        telefone: vendedorFromProp.telefone || prop.vendedorTelefone || prop.dados?.vendedor?.telefone || "",
        whatsapp: vendedorFromProp.whatsapp || prop.vendedorWhatsapp || prop.dados?.vendedor?.whatsapp || "",
        email: vendedorFromProp.email || prop.vendedorEmail || prop.dados?.vendedor?.email || "",
        endereco: vendedorFromProp.endereco || prop.vendedorEndereco || prop.dados?.vendedor?.endereco || "",
        cep: prop.vendedorCep || prop.dados?.vendedor?.cep || "",
        cidade: prop.vendedorCidade || prop.dados?.vendedor?.cidade || "",
        estado: prop.vendedorEstado || prop.dados?.vendedor?.estado || "",
        
        vendedorConjugeNome: prop.vendedorConjugeNome || prop.dados?.vendedor?.vendedorConjugeNome || prop.dados?.vendedor?.conjugeNome || "",
        vendedorConjugeCpf: prop.vendedorConjugeCpf || prop.dados?.vendedor?.vendedorConjugeCpf || prop.dados?.vendedor?.conjugeCpf || "",
        vendedorConjugeRg: prop.vendedorConjugeRg || prop.dados?.vendedor?.vendedorConjugeRg || prop.dados?.vendedor?.conjugeRg || "",
        vendedorConjugeProfissao: prop.vendedorConjugeProfissao || prop.dados?.vendedor?.vendedorConjugeProfissao || prop.dados?.vendedor?.conjugeProfissao || "",
        vendedorConjugeTelefone: prop.vendedorConjugeTelefone || prop.dados?.vendedor?.vendedorConjugeTelefone || prop.dados?.vendedor?.conjugeTelefone || "",
        vendedorConjugeEmail: prop.vendedorConjugeEmail || prop.dados?.vendedor?.vendedorConjugeEmail || prop.dados?.vendedor?.conjugeEmail || "",
        vendedorConjugeEstadoCivil: prop.vendedorConjugeEstadoCivil || prop.dados?.vendedor?.vendedorConjugeEstadoCivil || prop.dados?.vendedor?.conjugeEstadoCivil || "",
        vendedorConjugeEndereco: prop.vendedorConjugeEndereco || prop.dados?.vendedor?.vendedorConjugeEndereco || prop.dados?.vendedor?.conjugeEndereco || "",
        
        conjugeNome: prop.vendedorConjugeNome || prop.dados?.vendedor?.vendedorConjugeNome || prop.dados?.vendedor?.conjugeNome || "",
        conjugeCpf: prop.vendedorConjugeCpf || prop.dados?.vendedor?.vendedorConjugeCpf || prop.dados?.vendedor?.conjugeCpf || "",
      };

      if (proponente.compradorConjugeNome) setTemConjugeComprador(true);
      if (vendedor.vendedorConjugeNome) setTemConjugeVendedor(true);
      if (prop.locadorConjugeNome || prop.dados?.locador?.locadorConjugeNome || prop.dados?.locador?.conjugeNome) setTemConjugeLocador(true);
      if (prop.locatarioConjugeNome || prop.dados?.locatario?.locatarioConjugeNome || prop.dados?.locatario?.conjugeNome) setTemConjugeLocatario(true);

      const imovel = {
        matricula: prop.imovelMatricula || prop.dados?.imovel?.matricula || "",
        cri: getCriImovel(prop) || "",
        tipo: prop.imovelTipo || prop.dados?.imovel?.tipo || "",
        codigo: prop.imovelCodigo || prop.dados?.imovel?.codigo || "",
        titulo: prop.imovelTitulo || prop.dados?.imovel?.titulo || "",
        endereco: prop.imovelEndereco || prop.dados?.imovel?.endereco || "",
        bairro: prop.imovelBairro || prop.dados?.imovel?.bairro || "",
        cidade: prop.imovelCidade || prop.dados?.imovel?.cidade || "",
        estado: prop.imovelEstado || prop.dados?.imovel?.estado || "",
        valorVenda: prop.valorImovel || prop.dados?.imovel?.valorVenda || 0,
        valorCondominio: prop.valorCondominio || prop.dados?.imovel?.valorCondominio || "",
        valorIptu: prop.valorIptu || prop.dados?.imovel?.valorIptu || "",
      };

      const outrasCondVal = getOutrasCondicoes(prop) || prop.formaPagamento || prop.dados?.pagamento?.outrasCondicoes || "";
      const pagamento = {
        metodos: prop.dados?.pagamento?.metodos || [],
        valorExtenso: prop.valorPorExtenso || prop.dados?.pagamento?.valorExtenso || "",
        outrasCondicoes: outrasCondVal,
        detalhesPagamento: outrasCondVal,
        detalhesPagamentoContraproposta: outrasCondVal,
        condicoesPagamento: outrasCondVal,
        observacoesPagamento: outrasCondVal,
        observacoes: prop.observacoes || prop.dados?.pagamento?.observacoes || "",
      };

      const aceitante = isAceite ? {
        nome: vendedor.nome,
        cpf: vendedor.cpf,
        rg: vendedor.rg,
        estadoCivil: vendedor.estadoCivil,
        profissao: vendedor.profissao,
        telefone: vendedor.telefone,
        whatsapp: vendedor.whatsapp,
        email: vendedor.email,
        endereco: vendedor.endereco,
        cep: vendedor.cep,
        cidade: vendedor.cidade,
        estado: vendedor.estado,
        conjugeNome: vendedor.vendedorConjugeNome || vendedor.conjugeNome,
        conjugeCpf: vendedor.vendedorConjugeCpf || vendedor.conjugeCpf,
      } : { estadoCivil: 'Solteiro(a)' };

      return {
        ...prev,
        imovelId: prop.imovelId || prev.imovelId || "",
        imovelCodigo: prop.imovelCodigo || prev.imovelCodigo || "",
        imovelTitulo: prop.imovelTitulo || prev.imovelTitulo || "",
        imovelNomeEdificio: prop.imovelNomeEdificio || prop.imovelTitulo || prev.imovelNomeEdificio || "",
        imovelTipo: prop.imovelTipo || prev.imovelTipo || "",
        imovelTipoNegocio: prop.imovelTipoNegocio || prev.imovelTipoNegocio || "",
        imovelEndereco: prop.imovelEndereco || prev.imovelEndereco || "",
        imovelBairro: prop.imovelBairro || prev.imovelBairro || "",
        imovelCidade: prop.imovelCidade || prev.imovelCidade || "",
        imovelEstado: prop.imovelEstado || prev.imovelEstado || "",
        imovelMatricula: prop.imovelMatricula || prev.imovelMatricula || "",
        imovelCri: prop.imovelCri || getCriImovel(prop) || prev.imovelCri || "",
        enderecoImovel: prop.imovelEndereco || prev.enderecoImovel || "",
        nomeCliente: proponente.nome || prev.nomeCliente || "",
        nomeVendedor: vendedor.nome || prev.nomeVendedor || "",
        valor: prop.valorProposta || prop.valorTotalNegociado || prop.valor || prev.valor || 0,
        valorPorExtenso: prop.valorPorExtenso || prev.valorPorExtenso || "",
        dados: {
          ...prev.dados,
          proponente,
          vendedor,
          imovel,
          pagamento,
          aceitante,
          objeto: {
            tipoAceite: 'proposta',
            dataDocumentoBase: prop.criadoEm?.toDate ? format(prop.criadoEm.toDate(), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
          }
        }
      };
    });
    showToast("Dados da proposta importados com sucesso!", "success");
  };

  const saveContract = async (finalizar = false) => {
    if (!isAdmin) {
      showToast('Usuário sem permissão administrativa.', 'error');
      return;
    }
    if (!contract.nomeCliente || !contract.valor) {
      showToast('Por favor, preencha o nome do cliente e o valor.', 'error');
      return;
    }

    if (contract.tipoContrato === 'proposta') {
      const im_id = contract.imovelId || '';
      const im_matricula = (contract as any).imovelMatricula || contract.dados?.imovel?.matricula || '';
      const im_cri = (contract as any).imovelCri || contract.dados?.imovel?.cri || '';
      const val_proposta = Number((contract as any).valorProposta || contract.valor || 0);

      if (!im_id) {
        alert("Selecione um imóvel para criar a proposta.");
        return;
      }
      if (!im_matricula) {
        alert("Informe o número da matrícula do imóvel.");
        return;
      }
      if (!im_cri) {
        alert("Informe o CRI do imóvel.");
        return;
      }
      if (!val_proposta || val_proposta <= 0) {
        alert("Informe o valor da proposta.");
        return;
      }
    }

    const propertyWarranty = selectedProperty?.leaseWarrantyType || (selectedProperty as any)?.garantiaLocaticia || contract.dados?.imovel?.leaseWarrantyType || contract.dados?.imovel?.garantiaLocaticia || '';
    const isCaucao = propertyWarranty === 'Caução' || propertyWarranty === 'Depósito Caução' || propertyWarranty === 'Depósito antecipado';
    const caucaoValue = Number(contract.dados?.valores?.taxaCaucao || 0);
    if (isCaucao && caucaoValue <= 0) {
      alert("Atenção: A modalidade de garantia do imóvel selecionado é Caução, mas o valor correspondente (Valor Caução) não foi preenchido!");
      return;
    }

    if (contract.tipoContrato === 'locacao_temporaria') {
      const days = contract.dados?.prazo?.quantidadeDias || 0;
      if (days > 90) {
        showToast('A locação temporária não pode ultrapassar 90 dias.', 'error');
        return;
      }
    }

    setLoading(true);
    
    // Clean data from undefined/NaN values to prevent Firestore crashes
    const cleanFirestoreData = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj
          .map(cleanFirestoreData)
          .filter(item => item !== undefined);
      }

      if (obj && typeof obj === 'object') {
        // Safe check for special Firestore FieldValue objects or custom SDK types
        if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
          return obj;
        }
        
        const cleaned: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          if (value === undefined) return;
          if (typeof value === 'number' && !Number.isFinite(value)) {
            cleaned[key] = 0;
            return;
          }
          if (value && typeof value === 'object') {
            cleaned[key] = cleanFirestoreData(value);
            return;
          }
          cleaned[key] = value;
        });
        return cleaned;
      }
      return obj;
    };

    try {
      // 1. Normalize Property
      const imovelNormalizado = normalizarDadosImovel(selectedProperty || contract.dados?.imovel || contract);
      const tituloFinal = 
        getTituloImovel(selectedProperty) ||
        getTituloImovel(contract.dados?.imovel) ||
        getTituloImovel(contract) ||
        ((contract as any).imovelTitulo !== "Imóvel" ? (contract as any).imovelTitulo : "") ||
        ((contract as any).imovelNomeEdificio !== "Imóvel" ? (contract as any).imovelNomeEdificio : "") ||
        "Imóvel";
      
      // 2. Normalize Parties
      const compradorNormalizado = normalizarPessoa(contract.dados?.proponente, 'comprador');
      const vendedorNormalizado = normalizarPessoa(contract.dados?.vendedor || contract.dados?.aceitante, 'vendedor');
      const locadorNormalizado = normalizarPessoa(contract.dados?.locador, 'locador');
      const locatarioNormalizado = normalizarPessoa(contract.dados?.locatario, 'locatario');

      // 3. Normalize Spouses (preserve entered values or fallback)
      const compradorConjugeNormalizado = {
        compradorConjugeNome: contract.dados?.proponente?.compradorConjugeNome || contract.dados?.proponente?.conjugeNome || "",
        compradorConjugeCpf: contract.dados?.proponente?.compradorConjugeCpf || contract.dados?.proponente?.conjugeCpf || "",
        compradorConjugeRg: contract.dados?.proponente?.compradorConjugeRg || contract.dados?.proponente?.conjugeRg || "",
        compradorConjugeProfissao: contract.dados?.proponente?.compradorConjugeProfissao || contract.dados?.proponente?.conjugeProfissao || "",
        compradorConjugeTelefone: contract.dados?.proponente?.compradorConjugeTelefone || contract.dados?.proponente?.conjugeTelefone || "",
        compradorConjugeEmail: contract.dados?.proponente?.compradorConjugeEmail || contract.dados?.proponente?.conjugeEmail || "",
        compradorConjugeEstadoCivil: contract.dados?.proponente?.compradorConjugeEstadoCivil || contract.dados?.proponente?.conjugeEstadoCivil || "",
        compradorConjugeEndereco: contract.dados?.proponente?.compradorConjugeEndereco || contract.dados?.proponente?.conjugeEndereco || "",
      };

      const vendedorConjugeNormalizado = {
        vendedorConjugeNome: contract.dados?.vendedor?.vendedorConjugeNome || contract.dados?.vendedor?.conjugeNome || "",
        vendedorConjugeCpf: contract.dados?.vendedor?.vendedorConjugeCpf || contract.dados?.vendedor?.conjugeCpf || "",
        vendedorConjugeRg: contract.dados?.vendedor?.vendedorConjugeRg || contract.dados?.vendedor?.conjugeRg || "",
        vendedorConjugeProfissao: contract.dados?.vendedor?.vendedorConjugeProfissao || contract.dados?.vendedor?.conjugeProfissao || "",
        vendedorConjugeTelefone: contract.dados?.vendedor?.vendedorConjugeTelefone || contract.dados?.vendedor?.conjugeTelefone || "",
        vendedorConjugeEmail: contract.dados?.vendedor?.vendedorConjugeEmail || contract.dados?.vendedor?.conjugeEmail || "",
        vendedorConjugeEstadoCivil: contract.dados?.vendedor?.vendedorConjugeEstadoCivil || contract.dados?.vendedor?.conjugeEstadoCivil || "",
        vendedorConjugeEndereco: contract.dados?.vendedor?.vendedorConjugeEndereco || contract.dados?.vendedor?.conjugeEndereco || "",
      };

      const locadorConjugeNormalizado = {
        locadorConjugeNome: contract.dados?.locador?.locadorConjugeNome || contract.dados?.locador?.conjugeNome || "",
        locadorConjugeCpf: contract.dados?.locador?.locadorConjugeCpf || contract.dados?.locador?.conjugeCpf || "",
        locadorConjugeRg: contract.dados?.locador?.locadorConjugeRg || contract.dados?.locador?.conjugeRg || "",
        locadorConjugeProfissao: contract.dados?.locador?.locadorConjugeProfissao || contract.dados?.locador?.conjugeProfissao || "",
        locadorConjugeTelefone: contract.dados?.locador?.locadorConjugeTelefone || contract.dados?.locador?.conjugeTelefone || "",
        locadorConjugeEmail: contract.dados?.locador?.locadorConjugeEmail || contract.dados?.locador?.conjugeEmail || "",
        locadorConjugeEstadoCivil: contract.dados?.locador?.locadorConjugeEstadoCivil || contract.dados?.locador?.conjugeEstadoCivil || "",
        locadorConjugeEndereco: contract.dados?.locador?.locadorConjugeEndereco || contract.dados?.locador?.conjugeEndereco || "",
      };

      const locatarioConjugeNormalizado = {
        locatarioConjugeNome: contract.dados?.locatario?.locatarioConjugeNome || contract.dados?.locatario?.conjugeNome || "",
        locatarioConjugeCpf: contract.dados?.locatario?.locatarioConjugeCpf || contract.dados?.locatario?.conjugeCpf || "",
        locatarioConjugeRg: contract.dados?.locatario?.locatarioConjugeRg || contract.dados?.locatario?.conjugeRg || "",
        locatarioConjugeProfissao: contract.dados?.locatario?.locatarioConjugeProfissao || contract.dados?.locatario?.conjugeProfissao || "",
        locatarioConjugeTelefone: contract.dados?.locatario?.locatarioConjugeTelefone || contract.dados?.locatario?.conjugeTelefone || "",
        locatarioConjugeEmail: contract.dados?.locatario?.locatarioConjugeEmail || contract.dados?.locatario?.conjugeEmail || "",
        locatarioConjugeEstadoCivil: contract.dados?.locatario?.locatarioConjugeEstadoCivil || contract.dados?.locatario?.conjugeEstadoCivil || "",
        locatarioConjugeEndereco: contract.dados?.locatario?.locatarioConjugeEndereco || contract.dados?.locatario?.conjugeEndereco || "",
      };

      const dadosContrato = {
        ...contract,
        ...imovelNormalizado,
        ...compradorNormalizado,
        ...compradorConjugeNormalizado,
        ...vendedorNormalizado,
        ...vendedorConjugeNormalizado,
        ...locadorNormalizado,
        ...locadorConjugeNormalizado,
        ...locatarioNormalizado,
        ...locatarioConjugeNormalizado,
        status: finalizar ? 'finalizado' : (contract.status || 'rascunho'),
        imovelId: contract.imovelId || selectedProperty?.id || '',
        imovelCodigo: selectedProperty?.code || contract.imovelCodigo || '',
        imovelTitulo: tituloFinal,
        imovelNomeEdificio: tituloFinal,
        imovelMatricula: String((contract as any).imovelMatricula || contract.dados?.imovel?.matricula || '').trim(),
        imovelCri: String((contract as any).imovelCri || contract.dados?.imovel?.cri || '').trim(),
        valorTotalNegociado: Number(contract.valor || 0),
        valorPorExtenso: contract.dados?.[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']?.valorExtenso || valorMonetarioPorExtenso(Number(contract.valor || 0)),
        locadorNome: contract.dados?.locador?.nome || contract.nomeVendedor || '',
        locadorDocumento: contract.dados?.locador?.cpf || '',
        locatarioNome: contract.nomeCliente || '',
        locatarioDocumento: contract.dados?.locatario?.cpf || contract.dados?.proponente?.cpf || '',
        valorAluguel: contract.valor || 0,
        valorTotalLocatario: contract.valor || 0,
        valorRepasseLocador: contract.valor || 0,
        clausulasAplicadas: contract.dados?.clausulasSelecionadas || [],
        atualizadoEm: serverTimestamp(),
        criadoPor: user?.uid || null,
        comprador: {
          nome: contract.nomeCliente || "",
          documento: contract.dados?.proponente?.cpf || contract.dados?.proponente?.cpfCnpj || "",
          rg: contract.dados?.proponente?.rg || "",
          estadoCivil: contract.dados?.proponente?.estadoCivil || "Solteiro(a)",
          profissao: contract.dados?.proponente?.profissao || "",
          telefone: contract.dados?.proponente?.telefone || "",
          whatsapp: contract.dados?.proponente?.whatsapp || "",
          email: contract.dados?.proponente?.email || "",
          endereco: contract.dados?.proponente?.endereco || "",
          conjugeNome: compradorConjugeNormalizado.compradorConjugeNome,
          conjugeCpf: compradorConjugeNormalizado.compradorConjugeCpf,
        },
        vendedor: {
          nome: contract.nomeVendedor || "",
          documento: contract.dados?.vendedor?.cpf || contract.dados?.vendedor?.cpfCnpj || "",
          rg: contract.dados?.vendedor?.rg || "",
          estadoCivil: contract.dados?.vendedor?.estadoCivil || "Solteiro(a)",
          profissao: contract.dados?.vendedor?.profissao || "",
          telefone: contract.dados?.vendedor?.telefone || "",
          whatsapp: contract.dados?.vendedor?.whatsapp || "",
          email: contract.dados?.vendedor?.email || "",
          endereco: contract.dados?.vendedor?.endereco || "",
          conjugeNome: vendedorConjugeNormalizado.vendedorConjugeNome,
          conjugeCpf: vendedorConjugeNormalizado.vendedorConjugeCpf,
        },
        dados: {
          ...contract.dados,
          proponente: {
            ...contract.dados?.proponente,
            ...compradorConjugeNormalizado,
            conjugeNome: compradorConjugeNormalizado.compradorConjugeNome,
            conjugeCpf: compradorConjugeNormalizado.compradorConjugeCpf,
          },
          vendedor: {
            ...contract.dados?.vendedor,
            ...vendedorConjugeNormalizado,
            conjugeNome: vendedorConjugeNormalizado.vendedorConjugeNome,
            conjugeCpf: vendedorConjugeNormalizado.vendedorConjugeCpf,
          },
          locador: {
            ...contract.dados?.locador,
            ...locadorConjugeNormalizado,
            conjugeNome: locadorConjugeNormalizado.locadorConjugeNome,
            conjugeCpf: locadorConjugeNormalizado.locadorConjugeCpf,
          },
          locatario: {
            ...contract.dados?.locatario,
            ...locatarioConjugeNormalizado,
            conjugeNome: locatarioConjugeNormalizado.locatarioConjugeNome,
            conjugeCpf: locatarioConjugeNormalizado.locatarioConjugeCpf,
          },
          imovel: {
            ...contract.dados?.imovel,
            ...imovelNormalizado,
            titulo: tituloFinal,
            cri: String((contract as any).imovelCri || contract.dados?.imovel?.cri || '').trim(),
          }
        }
      } as any;

      const detalhesFinal = getDetalhesPagamento(contract) || getDetalhesPagamento(contract.dados?.[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']);
      dadosContrato.detalhesPagamento = detalhesFinal;
      dadosContrato.detalhesPagamentoContraproposta = detalhesFinal;
      dadosContrato.outrasCondicoes = detalhesFinal;
      dadosContrato.condicoesPagamento = detalhesFinal;
      dadosContrato.observacoesPagamento = detalhesFinal;
      dadosContrato.clausulaPagamento = detalhesFinal;

      if (!dadosContrato.dados) dadosContrato.dados = {};
      if (!dadosContrato.dados.pagamento) dadosContrato.dados.pagamento = {};
      dadosContrato.dados.pagamento.detalhesPagamento = detalhesFinal;
      dadosContrato.dados.pagamento.detalhesPagamentoContraproposta = detalhesFinal;
      dadosContrato.dados.pagamento.outrasCondicoes = detalhesFinal;
      dadosContrato.dados.pagamento.condicoesPagamento = detalhesFinal;
      dadosContrato.dados.pagamento.observacoesPagamento = detalhesFinal;
      dadosContrato.dados.pagamento.clausulaPagamento = detalhesFinal;

      if (!dadosContrato.dados.termos) dadosContrato.dados.termos = {};
      dadosContrato.dados.termos.detalhesPagamento = detalhesFinal;
      dadosContrato.dados.termos.detalhesPagamentoContraproposta = detalhesFinal;
      dadosContrato.dados.termos.outrasCondicoes = detalhesFinal;
      dadosContrato.dados.termos.condicoesPagamento = detalhesFinal;
      dadosContrato.dados.termos.observacoesPagamento = detalhesFinal;
      dadosContrato.dados.termos.clausulaPagamento = detalhesFinal;

      console.log("Documento final antes de salvar:", {
        id,
        tipoContrato: contract.tipoContrato,
        detalhesPagamento: detalhesFinal
      });

      if (contract.tipoContrato === 'proposta') {
        dadosContrato.valorImovel = Number(imovelNormalizado.valorImovel || 0);
        dadosContrato.valorProposta = Number(contract.valor || 0);
        dadosContrato.formaPagamento = contract.dados?.pagamento?.outrasCondicoes || contract.dados?.pagamento?.descricao || "";
        dadosContrato.observacoes = contract.dados?.pagamento?.observacoes || contract.dados?.observacoes || "";
        dadosContrato.status = contract.status || "Pendente";
      }

      if (contract.tipoContrato === 'aceite') {
        const termosFinal = getTermosCondicoes(contract);
        const formaFinal = getFormaPagamento(contract);

        dadosContrato.termosCondicoes = termosFinal;
        dadosContrato.condicoesPagamento = termosFinal;
        dadosContrato.outrasCondicoes = termosFinal;
        dadosContrato.detalhesPagamento = termosFinal;
        dadosContrato.detalhesPagamentoContraproposta = termosFinal;
        dadosContrato.observacoesPagamento = termosFinal;
        dadosContrato.formaPagamento = formaFinal;
        dadosContrato.formasPagamento = contract.formasPagamento || [];
      }

      if (contract.tipoContrato === 'arras_confirmatorios') {
        const a = contract.dados?.arras || {};
        dadosContrato.tipoContratoLabel = "Arras Confirmatórios";
        dadosContrato.valorImovel = Number(a.valorImovel || contract.valorImovel || contract.valor || 0);
        dadosContrato.valorArras = Number(a.valorArras || 0);
        dadosContrato.formaPagamentoArras = a.formaPagamentoArras || "";
        dadosContrato.dataPagamentoArras = a.dataPagamentoArras || "";
        dadosContrato.prazoContratoDefinitivo = a.prazoContratoDefinitivo || "";
        dadosContrato.prazoEscritura = a.prazoEscritura || "";
      }

      if (finalizar) {
        (dadosContrato as any).finalizadoEm = serverTimestamp();
      }

      // Consolidar e normalizar todos os dados planos na raiz do documento antes de salvar
      const normalizedFlatData = normalizarDadosDocumento(dadosContrato);
      const finalDadosContrato = {
        ...dadosContrato,
        ...normalizedFlatData
      };

      const cleanedData = cleanFirestoreData(finalDadosContrato);
      console.log("Salvando contrato final/rascunho no Firestore:", cleanedData);

      let savedId = id;
      if (!id) {
        cleanedData.criadoEm = serverTimestamp();
        const docRef = await addDoc(collection(db, 'contratos'), cleanedData);
        savedId = docRef.id;
        console.log("Contrato novo criado com sucesso. ID gerado:", savedId);
        
        if (contract.tipoContrato === 'proposta') {
          await setDoc(doc(db, 'propostas', savedId), cleanedData);
          console.log("Cópia da proposta salva na coleção 'propostas' ID:", savedId);
        } else if (contract.tipoContrato === 'contraproposta') {
          await setDoc(doc(db, 'contrapropostas', savedId), cleanedData);
          console.log("Cópia da contraproposta salva na coleção 'contrapropostas' ID:", savedId);
        } else if (contract.tipoContrato === 'aceite') {
          const nomeCompradorFinal = getNomeComprador(cleanedData);
          const aceiteData = {
            ...cleanedData,
            compradorNome: nomeCompradorFinal,
            proponenteNome: nomeCompradorFinal,
            nomeComprador: nomeCompradorFinal,
            nomeCompleto: nomeCompradorFinal,
            tipoDocumento: "aceite_termos",
            statusAceite: "Aceito",
            aceitoEm: serverTimestamp()
          };
          await setDoc(doc(db, 'aceitesProposta', savedId), aceiteData);
          console.log("Cópia do aceite salva na coleção 'aceitesProposta' ID:", savedId);
        } else if (contract.tipoContrato === 'arras_confirmatorios') {
          await setDoc(doc(db, 'arrasConfirmatorios', savedId), cleanedData);
          console.log("Cópia das arras salva na coleção 'arrasConfirmatorios' ID:", savedId);
        } else if (contract.tipoContrato === 'locacao_temporaria') {
          await setDoc(doc(db, 'locacoes', savedId), cleanedData);
          console.log("Cópia da locação salva na coleção 'locacoes' ID:", savedId);
        }
      } else {
        await updateDoc(doc(db, 'contratos', id), cleanedData);
        console.log("Contrato existente atualizado com sucesso. ID:", id);
        
        if (contract.tipoContrato === 'proposta') {
          await setDoc(doc(db, 'propostas', id), cleanedData, { merge: true });
          console.log("Cópia da proposta atualizada na coleção 'propostas' ID:", id);
        } else if (contract.tipoContrato === 'contraproposta') {
          await setDoc(doc(db, 'contrapropostas', id), cleanedData, { merge: true });
          console.log("Cópia da contraproposta atualizada na coleção 'contrapropostas' ID:", id);
        } else if (contract.tipoContrato === 'aceite') {
          const nomeCompradorFinal = getNomeComprador(cleanedData);
          const aceiteData = {
            ...cleanedData,
            compradorNome: nomeCompradorFinal,
            proponenteNome: nomeCompradorFinal,
            nomeComprador: nomeCompradorFinal,
            nomeCompleto: nomeCompradorFinal,
            tipoDocumento: "aceite_termos",
            statusAceite: "Aceito",
            updatedAt: serverTimestamp()
          };
          await setDoc(doc(db, 'aceitesProposta', id), aceiteData, { merge: true });
          console.log("Cópia do aceite atualizada na coleção 'aceitesProposta' ID:", id);
        } else if (contract.tipoContrato === 'arras_confirmatorios') {
          await setDoc(doc(db, 'arrasConfirmatorios', id), cleanedData, { merge: true });
          console.log("Cópia das arras atualizada na coleção 'arrasConfirmatorios' ID:", id);
        } else if (contract.tipoContrato === 'locacao_temporaria') {
          await setDoc(doc(db, 'locacoes', id), cleanedData, { merge: true });
          console.log("Cópia da locação atualizada na coleção 'locacoes' ID:", id);
        }
      }

      showToast(finalizar ? 'Contrato finalizado e salvo com sucesso!' : 'Contrato salvo como rascunho com sucesso!', 'success');

      if (finalizar) {
         console.log("Iniciando geração automática do PDF pós salvamento...");
         if (!id && savedId) {
           navigate(`/admin/contratos/editar/${savedId}?preview=true`);
         }
         setTimeout(() => {
           downloadPDF();
         }, 1000);
      } else {
        setTimeout(() => {
          navigate('/admin/contratos');
        }, 1500);
      }
    } catch (error: any) {
      console.error("Erro ao salvar contrato no Firestore (Caminho: contratos):", error?.code, error?.message, error);
      showToast(`Erro ao finalizar contrato: ${error?.message || error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const debugOklabColors = (el: HTMLElement) => {
    const allElements = [el, ...Array.from(el.querySelectorAll("*"))];
    allElements.forEach((elem) => {
      const computed = window.getComputedStyle(elem);
      const props = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor"
      ];
      props.forEach((prop) => {
        const value = (computed as any)[prop];
        if (
          value &&
          (
            value.includes("oklab") ||
            value.includes("oklch") ||
            value.includes("color-mix")
          )
        ) {
          console.warn("Cor incompatível encontrada no PDF:", {
            tagName: elem.tagName,
            id: elem.id,
            prop,
            value,
            className: elem.className
          });
        }
      });
    });
  };

  const sanitizePdfColors = (el: HTMLElement) => {
    if (!el) return;
    const allElements = [el, ...Array.from(el.querySelectorAll("*"))];
    allElements.forEach((elem) => {
      const htmlEl = elem as HTMLElement;
      htmlEl.style.color = "#111827";
      htmlEl.style.backgroundColor = htmlEl.style.backgroundColor || "transparent";
      htmlEl.style.borderColor = "#e5e7eb";
      htmlEl.style.boxShadow = "none";

      const computed = window.getComputedStyle(htmlEl);
      const props = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "outlineColor",
        "textDecorationColor"
      ];

      props.forEach((prop) => {
        const value = (computed as any)[prop];
        if (
          value &&
          (
            value.includes("oklab") ||
            value.includes("oklch") ||
            value.includes("color-mix")
          )
        ) {
          (htmlEl.style as any)[prop] = prop === "backgroundColor"
            ? "#ffffff"
            : "#111827";
        }
      });
    });
  };

  const downloadPDF = async () => {
    const element = document.getElementById("contrato-pdf") || printRef.current;
    if (!element) {
      console.error("Elemento #contrato-pdf não encontrado.");
      showToast("Elemento do contrato não encontrado para gerar PDF.", "error");
      return;
    }
    
    setLoading(true);
    const companyName = settings?.empresa?.nome || 'Menta Negócios Imobiliários';
    const companyCnpj = settings?.empresa?.cnpj || '63.572.479/0001-50';
    const companyCreci = settings?.empresa?.creciPj || '11255PJ';

    console.log("Iniciando geração do PDF do contrato...");
    const safeContract = cleanSerializableData(contract);
    console.log("Contrato:", safeContract);
    console.log("Dados do contrato:", safeContract?.dados);
    console.log("Elemento PDF encontrado:", !!element, "ID:", element?.id);

    try {
      JSON.stringify(safeContract);
      console.log("Dados do contrato serializáveis OK");
    } catch (err: any) {
      console.error("Ainda existe estrutura circular em safeContract:", err);
    }

    try {
      // Small timeout to ensure all components are fully rendered and styles applied
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      debugOklabColors(element);
      sanitizePdfColors(element);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll("*");
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const style = window.getComputedStyle(el);
            const properties = ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke'];
            
            properties.forEach(prop => {
              try {
                const value = (style as any)[prop];
                if (value && (
                  value.includes("oklab") || 
                  value.includes("oklch") || 
                  value.includes("color-mix") || 
                  value.includes("lab(") || 
                  value.includes("lch(")
                )) {
                  if (prop.toLowerCase().includes('background')) {
                    htmlEl.style.setProperty(prop, "#ffffff", "important");
                  } else if (prop.toLowerCase().includes('color')) {
                    htmlEl.style.setProperty(prop, "#111827", "important");
                  } else if (prop.toLowerCase().includes('border')) {
                    htmlEl.style.setProperty(prop, "#e5e7eb", "important");
                  } else {
                    htmlEl.style.setProperty(prop, "inherit", "important");
                  }
                }
              } catch (e) {}
            });
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the total height of the image on the PDF while maintaining aspect ratio
      const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeightInPdf;
      let position = 0;

      // Function to add footer to each page
      const addPageDecorations = (pageNum: number, totalPages: number) => {
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        const footerText = `${companyName} • CNPJ: ${companyCnpj} • CRECI PJ: ${companyCreci}`;
        const pageText = `Página ${pageNum} de ${totalPages}`;
        
        pdf.text(footerText, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
        pdf.text(pageText, pdfWidth - 15, pdfHeight - 10, { align: 'right' });
      };

      const totalPages = Math.ceil(imgHeightInPdf / (pdfHeight - 20)) || 1; // Subtract margin

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
      addPageDecorations(1, totalPages);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      let currentPage = 2;
      while (heightLeft > 0 && currentPage <= totalPages) {
        position = (currentPage - 1) * -pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        addPageDecorations(currentPage, totalPages);
        heightLeft -= pdfHeight;
        currentPage++;
      }
      
      pdf.save(`Contrato_${contract.nomeCliente || 'Pendente'}_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
    } catch (error: any) {
      console.error("Erro real ao gerar PDF do contrato:", error);
      console.error("Mensagem:", error?.message);
      console.error("Stack:", error?.stack);
      showToast(`Erro ao gerar PDF: ${error?.message || error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateDados = (section: string, field: string, value: any) => {
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev.dados,
        [section]: {
          ...prev.dados[section],
          [field]: value
        }
      }
    }));
  };

  const toggleMetodo = (section: 'pagamento' | 'termos', metodo: string) => {
    const currentMetodos = [...(contract.dados[section].metodos || [])];
    const index = currentMetodos.indexOf(metodo);
    if (index > -1) {
      currentMetodos.splice(index, 1);
    } else {
      currentMetodos.push(metodo);
    }
    updateDados(section, 'metodos', currentMetodos);
  };

  const handleAddClauseFromSys = (sysClause: any) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const exists = selectedClauses.some((c: any) => c.id === sysClause.id);
    if (exists) return;

    const updated = [...selectedClauses, {
      id: sysClause.id,
      titulo: sysClause.titulo,
      texto: sysClause.texto,
      ordem: selectedClauses.length + 1
    }];
    
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleRemoveClause = (clauseId: string, idx: number) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.filter((c: any, i: number) => c.id !== clauseId && i !== idx);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleClauseTextChange = (idx: number, newText: string) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.map((c: any, i: number) => i === idx ? { ...c, texto: newText } : c);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleClauseTitleChange = (idx: number, newTitle: string) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.map((c: any, i: number) => i === idx ? { ...c, titulo: newTitle } : c);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleAddCustomClause = () => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = [...selectedClauses, {
      id: 'custom-' + Date.now(),
      titulo: 'Nova Cláusula Personalizada',
      texto: '',
      ordem: selectedClauses.length + 1
    }];
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleMoveClause = (idx: number, direction: 'up' | 'down') => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedClauses.length) return;

    const copy = [...selectedClauses];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;

    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: copy
      }
    }));
  };

  if (fetching) {
    return (
      <div className="h-96 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Carregando dados do contrato...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            notification.type === 'success' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
          }`}>
            <Check size={12} />
          </div>
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/admin/contratos')}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary-black hover:shadow-xl transition-all border border-gray-100 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-black tracking-tight">{id ? 'Editar' : 'Novo'} Contrato</h1>
            <p className="text-gray-400 font-medium">Preencha os dados para gerar o documento oficial.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {step === 'revisao' && (
            <>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-4 bg-white text-gray-600 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all"
              >
                <Printer size={18} />
                <span>Imprimir</span>
              </button>
              <button 
                onClick={() => downloadPDF()}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-4 bg-white text-gray-600 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all disabled:opacity-50"
              >
                <Download size={18} />
                <span>PDF</span>
              </button>
              <button 
                onClick={() => saveContract(true)}
                disabled={loading}
                className="btn-gold !py-4 px-8 flex items-center gap-3 shadow-xl shadow-gold/20 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-primary-black border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                <span>Finalizar e Salvar</span>
              </button>
            </>
          )}
          <button 
            onClick={() => saveContract(false)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-4 bg-white text-gray-500 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
            <span>Salvar Rascunho</span>
          </button>
        </div>
      </div>

      {/* Stepper */}
      {!isPreviewOnly && (
        <div className="flex items-center justify-between max-w-2xl mx-auto print:hidden">
          {(['tipo', 'dados', 'pagamento', 'revisao'] as Step[]).map((s, idx) => {
            const isActive = step === s;
            const isCompleted = ['tipo', 'dados', 'pagamento', 'revisao'].indexOf(step) > idx;
            
            return (
              <React.Fragment key={s}>
                <button 
                  onClick={() => setStep(s)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isActive ? 'bg-gold text-primary-black ring-4 ring-gold/20 scale-110' : 
                    isCompleted ? 'bg-primary-black text-gold' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <Check size={16} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-primary-black' : 'text-gray-400'}`}>
                    {s}
                  </span>
                </button>
                {idx < 3 && <div className={`flex-grow h-px mx-4 ${['tipo', 'dados', 'pagamento', 'revisao'].indexOf(step) > idx ? 'bg-gold' : 'bg-gray-100'}`} />}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Form Content */}
      <div className="print:m-0">
        <AnimatePresence mode="wait">
          {step === 'tipo' && (
            <motion.div 
              key="tipo"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[
                { id: 'proposta', title: 'Proposta de Compra', icon: FileText, desc: 'Primeiro contato com oferta de valor e condições.' },
                { id: 'contraproposta', title: 'Contraproposta', icon: AlertCircle, desc: 'Resposta do vendedor com novos termos.' },
                { id: 'aceite', title: 'Aceite de Termos', icon: Check, desc: 'Formalização final do acordo entre as partes.' },
                { id: 'locacao_temporaria', title: 'Locação Temporária', icon: Calendar, desc: 'Contrato para aluguéis de temporada e curtos períodos.' },
                { id: 'arras_confirmatorios', title: 'Arras Confirmatórios', icon: CreditCard, desc: 'Instrumento para formalizar sinal de pagamento e compromisso entre comprador e vendedor.' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setContract(prev => ({ ...prev, tipoContrato: t.id as ContractType }));
                    setStep('dados');
                  }}
                  className={`p-10 rounded-[2.5rem] border-2 text-left transition-all ${
                    contract.tipoContrato === t.id ? 'bg-white border-gold shadow-2xl shadow-gold/10' : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-gray-100 hover:shadow-xl'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                    contract.tipoContrato === t.id ? 'bg-primary-black text-gold' : 'bg-white text-gray-400'
                  }`}>
                    <t.icon size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-primary-black mb-3">{t.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">{t.desc}</p>
                </button>
              ))}
            </motion.div>
          )}

          {step === 'dados' && (
            <motion.div 
              key="dados"
              variants={fadeIn}
              className="space-y-8"
            >
              {contract.tipoContrato === 'locacao_temporaria' ? (
                <>
                  {/* Locação Temporária - Dados do Imóvel */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">1. Objeto e Imóvel</h3>
                        <p className="text-sm text-gray-400">Escolha o imóvel para locação.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selecionar Imóvel</label>
                        <select 
                          className="input-field"
                          onChange={(e) => {
                            const p = properties.find(prop => prop.id === e.target.value);
                            if (p) handlePropertySelect(p);
                          }}
                          value={contract.imovelId || ''}
                        >
                          <option value="">-- Selecione um imóvel --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                        <input type="text" className="input-field" value={contract.enderecoImovel} onChange={e => setContract({...contract, enderecoImovel: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo</label>
                        <input type="text" className="input-field" value={contract.dados.imovel?.tipo || ''} onChange={e => updateDados('imovel', 'tipo', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mobiliado</label>
                        <select className="input-field" value={contract.dados.imovel?.mobiliado || 'Sim'} onChange={e => updateDados('imovel', 'mobiliado', e.target.value)}>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                          <option value="Parcialmente">Parcialmente</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Código</label>
                        <input type="text" className="input-field" value={contract.dados.imovel?.codigo || ''} onChange={e => updateDados('imovel', 'codigo', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Locador e Locatário */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">2. Dados das Partes</h3>
                        <p className="text-sm text-gray-400">Identificação do Locador e Locatário.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Locador (Proprietário)</h4>
                        <div className="space-y-4">
                          <input type="text" className="input-field" placeholder="Nome Completo / Razão Social" value={contract.dados.locador?.nome || ''} onChange={e => {
                            updateDados('locador', 'nome', e.target.value);
                            setContract(prev => ({ ...prev, nomeVendedor: e.target.value }));
                          }} />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="CPF / CNPJ" value={contract.dados.locador?.cpfCnpj || ''} onChange={e => updateDados('locador', 'cpfCnpj', e.target.value)} />
                            <input type="text" className="input-field" placeholder="RG / IE" value={contract.dados.locador?.rgIe || ''} onChange={e => updateDados('locador', 'rgIe', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <select className="input-field" value={contract.dados.locador?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('locador', 'estadoCivil', e.target.value)}>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a)">Casado(a)</option>
                              <option value="Divorciado(a)">Divorciado(a)</option>
                            </select>
                            <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.locador?.profissao || ''} onChange={e => updateDados('locador', 'profissao', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.locador?.telefone || ''} onChange={e => updateDados('locador', 'telefone', e.target.value)} />
                            <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.locador?.whatsapp || ''} onChange={e => updateDados('locador', 'whatsapp', e.target.value)} />
                          </div>
                          <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.locador?.email || ''} onChange={e => updateDados('locador', 'email', e.target.value)} />
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locador?.endereco || ''} onChange={e => updateDados('locador', 'endereco', e.target.value)} />
                          <div className="grid grid-cols-3 gap-4">
                            <input type="text" className="col-span-1 input-field" placeholder="CEP" value={contract.dados.locador?.cep || ''} onChange={e => updateDados('locador', 'cep', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Cidade" value={contract.dados.locador?.cidade || ''} onChange={e => updateDados('locador', 'cidade', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Estado" value={contract.dados.locador?.estado || ''} onChange={e => updateDados('locador', 'estado', e.target.value)} />
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <input
                              type="checkbox"
                              id="possuiConjugeLocador"
                              className="rounded border-gray-300 text-gold focus:ring-gold"
                              checked={temConjugeLocador}
                              onChange={e => setTemConjugeLocador(e.target.checked)}
                            />
                            <label htmlFor="possuiConjugeLocador" className="text-xs text-gray-500 font-medium">Possui cônjuge / companheiro(a)</label>
                          </div>

                          {temConjugeLocador && (
                            <div className="space-y-4 border-l-2 border-gold/30 pl-4 mt-2">
                              <h5 className="text-[10px] font-black text-gold uppercase tracking-widest">Cônjuge do Locador</h5>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Nome Completo do Cônjuge"
                                value={contract.dados.locador?.locadorConjugeNome || contract.dados.locador?.conjugeNome || ''}
                                onChange={e => {
                                  updateDados('locador', 'locadorConjugeNome', e.target.value);
                                  updateDados('locador', 'conjugeNome', e.target.value);
                                }}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="CPF do Cônjuge"
                                  value={contract.dados.locador?.locadorConjugeCpf || contract.dados.locador?.conjugeCpf || ''}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeCpf', e.target.value);
                                    updateDados('locador', 'conjugeCpf', e.target.value);
                                  }}
                                />
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="RG do Cônjuge"
                                  value={contract.dados.locador?.locadorConjugeRg || contract.dados.locador?.conjugeRg || ''}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeRg', e.target.value);
                                    updateDados('locador', 'conjugeRg', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <select
                                  className="input-field"
                                  value={contract.dados.locador?.locadorConjugeEstadoCivil || contract.dados.locador?.conjugeEstadoCivil || 'Casado(a)'}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeEstadoCivil', e.target.value);
                                    updateDados('locador', 'conjugeEstadoCivil', e.target.value);
                                  }}
                                >
                                  <option value="Casado(a)">Casado(a)</option>
                                  <option value="União Estável">União Estável</option>
                                  <option value="Solteiro(a)">Solteiro(a)</option>
                                </select>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Profissão do Cônjuge"
                                  value={contract.dados.locador?.locadorConjugeProfissao || contract.dados.locador?.conjugeProfissao || ''}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeProfissao', e.target.value);
                                    updateDados('locador', 'conjugeProfissao', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Telefone do Cônjuge"
                                  value={contract.dados.locador?.locadorConjugeTelefone || contract.dados.locador?.conjugeTelefone || ''}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeTelefone', e.target.value);
                                    updateDados('locador', 'conjugeTelefone', e.target.value);
                                  }}
                                />
                                <input
                                  type="email"
                                  className="input-field"
                                  placeholder="E-mail do Cônjuge"
                                  value={contract.dados.locador?.locadorConjugeEmail || contract.dados.locador?.conjugeEmail || ''}
                                  onChange={e => {
                                    updateDados('locador', 'locadorConjugeEmail', e.target.value);
                                    updateDados('locador', 'conjugeEmail', e.target.value);
                                  }}
                                />
                              </div>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Endereço Residencial do Cônjuge"
                                value={contract.dados.locador?.locadorConjugeEndereco || contract.dados.locador?.conjugeEndereco || ''}
                                onChange={e => {
                                  updateDados('locador', 'locadorConjugeEndereco', e.target.value);
                                  updateDados('locador', 'conjugeEndereco', e.target.value);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Locatário (Hóspede)</h4>
                        <div className="space-y-4">
                          <input type="text" className="input-field" placeholder="Nome Completo" value={contract.dados.locatario?.nome || ''} onChange={e => {
                            updateDados('locatario', 'nome', e.target.value);
                            setContract(prev => ({ ...prev, nomeCliente: e.target.value }));
                          }} />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="CPF" value={contract.dados.locatario?.cpf || ''} onChange={e => updateDados('locatario', 'cpf', e.target.value)} />
                            <input type="text" className="input-field" placeholder="RG" value={contract.dados.locatario?.rg || ''} onChange={e => updateDados('locatario', 'rg', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <select className="input-field" value={contract.dados.locatario?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('locatario', 'estadoCivil', e.target.value)}>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a)">Casado(a)</option>
                              <option value="Divorciado(a)">Divorciado(a)</option>
                            </select>
                            <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.locatario?.profissao || ''} onChange={e => updateDados('locatario', 'profissao', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.locatario?.telefone || ''} onChange={e => updateDados('locatario', 'telefone', e.target.value)} />
                            <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.locatario?.whatsapp || ''} onChange={e => updateDados('locatario', 'whatsapp', e.target.value)} />
                          </div>
                          <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.locatario?.email || ''} onChange={e => updateDados('locatario', 'email', e.target.value)} />
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locatario?.endereco || ''} onChange={e => updateDados('locatario', 'endereco', e.target.value)} />
                          <div className="grid grid-cols-3 gap-4">
                            <input type="text" className="col-span-1 input-field" placeholder="CEP" value={contract.dados.locatario?.cep || ''} onChange={e => updateDados('locatario', 'cep', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Cidade" value={contract.dados.locatario?.cidade || ''} onChange={e => updateDados('locatario', 'cidade', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Estado" value={contract.dados.locatario?.estado || ''} onChange={e => updateDados('locatario', 'estado', e.target.value)} />
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <input
                              type="checkbox"
                              id="possuiConjugeLocatario"
                              className="rounded border-gray-300 text-gold focus:ring-gold"
                              checked={temConjugeLocatario}
                              onChange={e => setTemConjugeLocatario(e.target.checked)}
                            />
                            <label htmlFor="possuiConjugeLocatario" className="text-xs text-gray-500 font-medium">Possui cônjuge / companheiro(a)</label>
                          </div>

                          {temConjugeLocatario && (
                            <div className="space-y-4 border-l-2 border-gold/30 pl-4 mt-2">
                              <h5 className="text-[10px] font-black text-gold uppercase tracking-widest">Cônjuge do Locatário</h5>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Nome Completo do Cônjuge"
                                value={contract.dados.locatario?.locatarioConjugeNome || contract.dados.locatario?.conjugeNome || ''}
                                onChange={e => {
                                  updateDados('locatario', 'locatarioConjugeNome', e.target.value);
                                  updateDados('locatario', 'conjugeNome', e.target.value);
                                }}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="CPF do Cônjuge"
                                  value={contract.dados.locatario?.locatarioConjugeCpf || contract.dados.locatario?.conjugeCpf || ''}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeCpf', e.target.value);
                                    updateDados('locatario', 'conjugeCpf', e.target.value);
                                  }}
                                />
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="RG do Cônjuge"
                                  value={contract.dados.locatario?.locatarioConjugeRg || contract.dados.locatario?.conjugeRg || ''}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeRg', e.target.value);
                                    updateDados('locatario', 'conjugeRg', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <select
                                  className="input-field"
                                  value={contract.dados.locatario?.locatarioConjugeEstadoCivil || contract.dados.locatario?.conjugeEstadoCivil || 'Casado(a)'}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeEstadoCivil', e.target.value);
                                    updateDados('locatario', 'conjugeEstadoCivil', e.target.value);
                                  }}
                                >
                                  <option value="Casado(a)">Casado(a)</option>
                                  <option value="União Estável">União Estável</option>
                                  <option value="Solteiro(a)">Solteiro(a)</option>
                                </select>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Profissão do Cônjuge"
                                  value={contract.dados.locatario?.locatarioConjugeProfissao || contract.dados.locatario?.conjugeProfissao || ''}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeProfissao', e.target.value);
                                    updateDados('locatario', 'conjugeProfissao', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Telefone do Cônjuge"
                                  value={contract.dados.locatario?.locatarioConjugeTelefone || contract.dados.locatario?.conjugeTelefone || ''}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeTelefone', e.target.value);
                                    updateDados('locatario', 'conjugeTelefone', e.target.value);
                                  }}
                                />
                                <input
                                  type="email"
                                  className="input-field"
                                  placeholder="E-mail do Cônjuge"
                                  value={contract.dados.locatario?.locatarioConjugeEmail || contract.dados.locatario?.conjugeEmail || ''}
                                  onChange={e => {
                                    updateDados('locatario', 'locatarioConjugeEmail', e.target.value);
                                    updateDados('locatario', 'conjugeEmail', e.target.value);
                                  }}
                                />
                              </div>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Endereço Residencial do Cônjuge"
                                value={contract.dados.locatario?.locatarioConjugeEndereco || contract.dados.locatario?.conjugeEndereco || ''}
                                onChange={e => {
                                  updateDados('locatario', 'locatarioConjugeEndereco', e.target.value);
                                  updateDados('locatario', 'conjugeEndereco', e.target.value);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fiador (Opcional - Se Houver) */}
                    <div className="border-t border-gray-100 pt-8 mt-8 space-y-6">
                      <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Fiador (Opcional - Se Houver)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo do Fiador</label>
                            <input type="text" className="input-field" placeholder="Nome Completo" value={contract.dados.fiador?.nome || ''} onChange={e => updateDados('fiador', 'nome', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF / CNPJ</label>
                              <input type="text" className="input-field" placeholder="Documento" value={contract.dados.fiador?.cpfCnpj || ''} onChange={e => updateDados('fiador', 'cpfCnpj', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.fiador?.telefone || ''} onChange={e => updateDados('fiador', 'telefone', e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.fiador?.email || ''} onChange={e => updateDados('fiador', 'email', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial do Fiador</label>
                            <input type="text" className="input-field" placeholder="Endereço Completo" value={contract.dados.fiador?.endereco || ''} onChange={e => updateDados('fiador', 'endereco', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Prazo */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">3. Período da Locação</h3>
                        <p className="text-sm text-gray-400">Prazos e horários de entrada e saída.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Data de Início</label>
                        <input type="date" className="input-field" value={contract.dados.prazo?.dataInicio || ''} onChange={e => updateDados('prazo', 'dataInicio', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Data de Término</label>
                        <input type="date" className="input-field" value={contract.dados.prazo?.dataTermino || ''} onChange={e => updateDados('prazo', 'dataTermino', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Horário Check-in</label>
                        <input type="time" className="input-field" value={contract.dados.prazo?.horarioEntrada || '14:00'} onChange={e => updateDados('prazo', 'horarioEntrada', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Horário Check-out</label>
                        <input type="time" className="input-field" value={contract.dados.prazo?.horarioSaida || '10:00'} onChange={e => updateDados('prazo', 'horarioSaida', e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-8 p-6 bg-gold/5 rounded-2xl border border-gold/10">
                       <p className="text-lg font-display font-bold text-primary-black">Duração: <span className="text-gold">{contract.dados.prazo?.quantidadeDias || 0} dias</span></p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* ... Existing Steps for Proposta/Contraproposta ... */}
                  {/* Imóvel Selection Component */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Vincular Imóvel</h3>
                        <p className="text-sm text-gray-400">Selecione um imóvel do sistema ou preencha manualmente.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Escolher do Sistema</label>
                        <select 
                          className="input-field"
                          onChange={(e) => {
                            const p = properties.find(prop => prop.id === e.target.value);
                            if (p) handlePropertySelect(p);
                          }}
                          value={contract.imovelId || ''}
                        >
                          <option value="">-- Selecione ou preencha abaixo --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>
                              {getCodigoImovel(p)} - {getTituloImovel(p)} ({p.neighborhood || (p as any).bairro || "Sem bairro Check"} - R$ {getValorVendaImovel(p) ? formatCurrency(getValorVendaImovel(p)) : "Sob Consulta"})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.enderecoImovel} 
                          onChange={e => setContract({...contract, enderecoImovel: e.target.value})}
                          placeholder="Ex: Rua das Flores, 123 - Centro"
                        />
                      </div>
                    </div>

                    {contract.imovelId && (
                      <div className="mt-8 p-6 bg-gold/5 rounded-2xl border border-gold/10 space-y-4">
                        <h4 className="text-sm font-black text-gold uppercase tracking-wider">Resumo do Imóvel Selecionado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Código:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelCodigo || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Título:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelTitulo || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Endereço:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelEndereco || contract.enderecoImovel || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Bairro / Cidade:</span>
                            <span className="text-gray-900 font-semibold">
                              {(contract as any).imovelBairro || ""}{(contract as any).imovelCidade ? ` / ${(contract as any).imovelCidade}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Valor de Venda (R$):</span>
                            <span className="text-gray-900 font-semibold">
                              {(contract as any).valorVenda ? formatCurrency(Number((contract as any).valorVenda)) : "Sob Consulta"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Matrícula do Imóvel:</span>
                            {getMatriculaImovel(contract) ? (
                              <span className="text-gray-900 font-semibold">{getMatriculaImovel(contract)}</span>
                            ) : (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  className="input-field py-1 text-xs"
                                  placeholder="Preencher matrícula obrigatoriamente *"
                                  value={(contract as any).imovelMatricula || ""}
                                  onChange={(e) => {
                                    setContract(prev => ({
                                      ...prev,
                                      imovelMatricula: e.target.value,
                                      dados: {
                                        ...prev.dados,
                                        imovel: {
                                          ...prev.dados?.imovel,
                                          matricula: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-[10px] text-red-500 mt-0.5">A matrícula é obrigatória para gerar esta proposta.</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">CRI do Imóvel:</span>
                            {getCriImovel(contract) ? (
                              <span className="text-gray-900 font-semibold">{getCriImovel(contract)}</span>
                            ) : (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  className="input-field py-1 text-xs"
                                  placeholder="Preencher CRI obrigatoriamente *"
                                  value={(contract as any).imovelCri || ""}
                                  onChange={(e) => {
                                    setContract(prev => ({
                                      ...prev,
                                      imovelCri: e.target.value,
                                      dados: {
                                        ...prev.dados,
                                        imovel: {
                                          ...prev.dados?.imovel,
                                          cri: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-[10px] text-red-500 mt-0.5">O CRI é obrigatório para gerar esta proposta.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Partes Envolvidas */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Partes Envolvidas</h3>
                        <p className="text-sm text-gray-400">Identificação clara do comprador e vendedor.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Comprador/Proponente */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-gold uppercase tracking-[0.2em] mb-4">Comprador / Proponente</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={contract.nomeCliente} 
                              onChange={e => setContract({...contract, nomeCliente: e.target.value})} 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cpf || ''} onChange={e => updateDados('proponente', 'cpf', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.rg || ''} onChange={e => updateDados('proponente', 'rg', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                              <select className="input-field" value={contract.dados.proponente?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('proponente', 'estadoCivil', e.target.value)}>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viúvo(a)">Viúvo(a)</option>
                                <option value="União Estável">União Estável</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.profissao || ''} onChange={e => updateDados('proponente', 'profissao', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.telefone || ''} onChange={e => updateDados('proponente', 'telefone', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.whatsapp || ''} onChange={e => updateDados('proponente', 'whatsapp', e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" value={contract.dados.proponente?.email || ''} onChange={e => updateDados('proponente', 'email', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial</label>
                            <input type="text" className="input-field" value={contract.dados.proponente?.endereco || ''} onChange={e => updateDados('proponente', 'endereco', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CEP</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cep || ''} onChange={e => updateDados('proponente', 'cep', e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cidade || ''} onChange={e => updateDados('proponente', 'cidade', e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.estado || ''} onChange={e => updateDados('proponente', 'estado', e.target.value)} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <input
                              type="checkbox"
                              id="possuiConjugeComprador"
                              className="rounded border-gray-300 text-gold focus:ring-gold"
                              checked={temConjugeComprador}
                              onChange={e => setTemConjugeComprador(e.target.checked)}
                            />
                            <label htmlFor="possuiConjugeComprador" className="text-xs text-gray-500 font-medium">Possui cônjuge / companheiro(a)</label>
                          </div>

                          {temConjugeComprador && (
                            <div className="space-y-4 border-l-2 border-gold/30 pl-4 mt-2">
                              <h5 className="text-[10px] font-black text-gold uppercase tracking-widest">Cônjuge do Comprador</h5>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo do Cônjuge</label>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Nome Completo do Cônjuge"
                                  value={contract.dados.proponente?.compradorConjugeNome || contract.dados.proponente?.conjugeNome || ''}
                                  onChange={e => {
                                    updateDados('proponente', 'compradorConjugeNome', e.target.value);
                                    updateDados('proponente', 'conjugeNome', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="CPF"
                                    value={contract.dados.proponente?.compradorConjugeCpf || contract.dados.proponente?.conjugeCpf || ''}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeCpf', e.target.value);
                                      updateDados('proponente', 'conjugeCpf', e.target.value);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="RG"
                                    value={contract.dados.proponente?.compradorConjugeRg || contract.dados.proponente?.conjugeRg || ''}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeRg', e.target.value);
                                      updateDados('proponente', 'conjugeRg', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                                  <select
                                    className="input-field"
                                    value={contract.dados.proponente?.compradorConjugeEstadoCivil || contract.dados.proponente?.conjugeEstadoCivil || 'Casado(a)'}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeEstadoCivil', e.target.value);
                                      updateDados('proponente', 'conjugeEstadoCivil', e.target.value);
                                    }}
                                  >
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="União Estável">União Estável</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Profissão"
                                    value={contract.dados.proponente?.compradorConjugeProfissao || contract.dados.proponente?.conjugeProfissao || ''}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeProfissao', e.target.value);
                                      updateDados('proponente', 'conjugeProfissao', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Telefone"
                                    value={contract.dados.proponente?.compradorConjugeTelefone || contract.dados.proponente?.conjugeTelefone || ''}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeTelefone', e.target.value);
                                      updateDados('proponente', 'conjugeTelefone', e.target.value);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                                  <input
                                    type="email"
                                    className="input-field"
                                    placeholder="E-mail"
                                    value={contract.dados.proponente?.compradorConjugeEmail || contract.dados.proponente?.conjugeEmail || ''}
                                    onChange={e => {
                                      updateDados('proponente', 'compradorConjugeEmail', e.target.value);
                                      updateDados('proponente', 'conjugeEmail', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial</label>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Endereço Residencial do Cônjuge"
                                  value={contract.dados.proponente?.compradorConjugeEndereco || contract.dados.proponente?.conjugeEndereco || ''}
                                  onChange={e => {
                                    updateDados('proponente', 'compradorConjugeEndereco', e.target.value);
                                    updateDados('proponente', 'conjugeEndereco', e.target.value);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vendedor */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-gold uppercase tracking-[0.2em] mb-4">Vendedor / Parte Aceitante</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="Nome Completo"
                              value={contract.nomeVendedor} 
                              onChange={e => setContract({...contract, nomeVendedor: e.target.value})} 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                              <input type="text" className="input-field" placeholder="CPF" value={contract.dados.vendedor?.cpf || contract.dados.aceitante?.cpf || ''} onChange={e => {
                                updateDados('vendedor', 'cpf', e.target.value);
                                updateDados('aceitante', 'cpf', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                              <input type="text" className="input-field" placeholder="RG" value={contract.dados.vendedor?.rg || contract.dados.aceitante?.rg || ''} onChange={e => {
                                updateDados('vendedor', 'rg', e.target.value);
                                updateDados('aceitante', 'rg', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                              <select className="input-field" value={contract.dados.vendedor?.estadoCivil || contract.dados.aceitante?.estadoCivil || 'Solteiro(a)'} onChange={e => {
                                updateDados('vendedor', 'estadoCivil', e.target.value);
                                updateDados('aceitante', 'estadoCivil', e.target.value);
                              }}>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                              <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.vendedor?.profissao || contract.dados.aceitante?.profissao || ''} onChange={e => {
                                updateDados('vendedor', 'profissao', e.target.value);
                                updateDados('aceitante', 'profissao', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.vendedor?.telefone || contract.dados.aceitante?.telefone || ''} onChange={e => {
                                updateDados('vendedor', 'telefone', e.target.value);
                                updateDados('aceitante', 'telefone', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                              <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.vendedor?.whatsapp || contract.dados.aceitante?.whatsapp || ''} onChange={e => {
                                updateDados('vendedor', 'whatsapp', e.target.value);
                                updateDados('aceitante', 'whatsapp', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.vendedor?.email || contract.dados.aceitante?.email || ''} onChange={e => {
                              updateDados('vendedor', 'email', e.target.value);
                              updateDados('aceitante', 'email', e.target.value);
                            }} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço</label>
                            <input type="text" className="input-field" placeholder="Endereço" value={contract.dados.vendedor?.endereco || contract.dados.aceitante?.endereco || ''} onChange={e => {
                              updateDados('vendedor', 'endereco', e.target.value);
                              updateDados('aceitante', 'endereco', e.target.value);
                            }} />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CEP</label>
                              <input type="text" className="input-field" placeholder="CEP" value={contract.dados.vendedor?.cep || contract.dados.aceitante?.cep || ''} onChange={e => {
                                updateDados('vendedor', 'cep', e.target.value);
                                updateDados('aceitante', 'cep', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                              <input type="text" className="input-field" placeholder="Cidade" value={contract.dados.vendedor?.cidade || contract.dados.aceitante?.cidade || ''} onChange={e => {
                                updateDados('vendedor', 'cidade', e.target.value);
                                updateDados('aceitante', 'cidade', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado</label>
                              <input type="text" className="input-field" placeholder="Estado" value={contract.dados.vendedor?.estado || contract.dados.aceitante?.estado || ''} onChange={e => {
                                updateDados('vendedor', 'estado', e.target.value);
                                updateDados('aceitante', 'estado', e.target.value);
                              }} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <input
                              type="checkbox"
                              id="possuiConjugeVendedor"
                              className="rounded border-gray-300 text-gold focus:ring-gold"
                              checked={temConjugeVendedor}
                              onChange={e => setTemConjugeVendedor(e.target.checked)}
                            />
                            <label htmlFor="possuiConjugeVendedor" className="text-xs text-gray-500 font-medium">Possui cônjuge / companheiro(a)</label>
                          </div>

                          {temConjugeVendedor && (
                            <div className="space-y-4 border-l-2 border-gold/30 pl-4 mt-2">
                              <h5 className="text-[10px] font-black text-gold uppercase tracking-widest">Cônjuge do Vendedor</h5>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo do Cônjuge</label>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Nome Completo do Cônjuge"
                                  value={contract.dados.vendedor?.vendedorConjugeNome || contract.dados.vendedor?.conjugeNome || ''}
                                  onChange={e => {
                                    updateDados('vendedor', 'vendedorConjugeNome', e.target.value);
                                    updateDados('vendedor', 'conjugeNome', e.target.value);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="CPF"
                                    value={contract.dados.vendedor?.vendedorConjugeCpf || contract.dados.vendedor?.conjugeCpf || ''}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeCpf', e.target.value);
                                      updateDados('vendedor', 'conjugeCpf', e.target.value);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="RG"
                                    value={contract.dados.vendedor?.vendedorConjugeRg || contract.dados.vendedor?.conjugeRg || ''}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeRg', e.target.value);
                                      updateDados('vendedor', 'conjugeRg', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                                  <select
                                    className="input-field"
                                    value={contract.dados.vendedor?.vendedorConjugeEstadoCivil || contract.dados.vendedor?.conjugeEstadoCivil || 'Casado(a)'}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeEstadoCivil', e.target.value);
                                      updateDados('vendedor', 'conjugeEstadoCivil', e.target.value);
                                    }}
                                  >
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="União Estável">União Estável</option>
                                    <option value="Solteiro(a)">Solteiro(a)</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Profissão"
                                    value={contract.dados.vendedor?.vendedorConjugeProfissao || contract.dados.vendedor?.conjugeProfissao || ''}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeProfissao', e.target.value);
                                      updateDados('vendedor', 'conjugeProfissao', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                                  <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Telefone"
                                    value={contract.dados.vendedor?.vendedorConjugeTelefone || contract.dados.vendedor?.conjugeTelefone || ''}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeTelefone', e.target.value);
                                      updateDados('vendedor', 'conjugeTelefone', e.target.value);
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                                  <input
                                    type="email"
                                    className="input-field"
                                    placeholder="E-mail"
                                    value={contract.dados.vendedor?.vendedorConjugeEmail || contract.dados.vendedor?.conjugeEmail || ''}
                                    onChange={e => {
                                      updateDados('vendedor', 'vendedorConjugeEmail', e.target.value);
                                      updateDados('vendedor', 'conjugeEmail', e.target.value);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial</label>
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Endereço Residencial do Cônjuge"
                                  value={contract.dados.vendedor?.vendedorConjugeEndereco || contract.dados.vendedor?.conjugeEndereco || ''}
                                  onChange={e => {
                                    updateDados('vendedor', 'vendedorConjugeEndereco', e.target.value);
                                    updateDados('vendedor', 'conjugeEndereco', e.target.value);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            
              <div className="flex justify-end pt-8">
                <button 
                  onClick={() => setStep('pagamento')}
                  className="btn-gold !py-4 px-10 flex items-center gap-3 shadow-xl"
                >
                  <span className="font-bold">Próxima Etapa</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'pagamento' && (
            <motion.div 
              key="pagamento"
              variants={fadeIn}
              className="space-y-8"
            >
              {contract.tipoContrato === 'locacao_temporaria' ? (
                <>
                  {/* Locação Temporária - Valores */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">4. Valores e Regras</h3>
                        <p className="text-sm text-gray-400">Configuração financeira e regras da locação.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor da Diária (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.valorDiario || '')}
                          onChange={e => updateDados('valores', 'valorDiario', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Taxa de Limpeza (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxaLimpeza || '')}
                          onChange={e => updateDados('valores', 'taxaLimpeza', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor Caução (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxaCaucao || '')}
                          onChange={e => updateDados('valores', 'taxaCaucao', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Outras Taxas (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxasAdicionais || '')}
                          onChange={e => updateDados('valores', 'taxasAdicionais', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-red-500">Desconto (R$)</label>
                        <input 
                          type="text" 
                          className="input-field text-red-500 font-bold" 
                          value={maskCurrency(contract.dados.valores?.desconto || '')}
                          onChange={e => updateDados('valores', 'desconto', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="bg-primary-black p-6 rounded-2xl flex flex-col justify-center shadow-2xl">
                         <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1">Valor Total do Contrato</p>
                         <p className="text-3xl font-display font-bold text-white">{formatCurrency(contract.valor || 0)}</p>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comissão Imobiliária (20%)</p>
                          <div className="flex items-center gap-3">
                             <input 
                               type="number" 
                               className="w-20 bg-white border border-gray-200 rounded-lg py-1 px-2 text-xs font-bold" 
                               value={contract.dados.valores?.percentualComissaoImobiliaria || 20}
                               onChange={e => updateDados('valores', 'percentualComissaoImobiliaria', parseFloat(e.target.value))}
                             />
                             <span className="text-lg font-bold text-primary-black">{formatCurrency(contract.dados.valores?.valorComissaoImobiliaria || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 font-medium italic">* Calculado sobre o valor total das diárias.</p>
                       </div>
                       <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Repasse Proprietário</p>
                          <p className="text-lg font-bold text-emerald-700">{formatCurrency(contract.dados.valores?.valorRepassadoProprietario || 0)}</p>
                          <p className="text-[10px] text-emerald-600/60 mt-2 font-medium italic">* Valor bruto das diárias menos comissão.</p>
                       </div>
                       <div className="bg-gold/5 p-6 rounded-2xl border border-gold/10">
                          <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-2">Valor Total das Diárias</p>
                          <p className="text-lg font-bold text-primary-black">{formatCurrency(contract.dados.valores?.valorTotalLocacao || 0)}</p>
                          <p className="text-[10px] text-gold/60 mt-2 font-medium italic">* {contract.dados.prazo?.quantidadeDias || 0} dias x {formatCurrency(contract.dados.valores?.valorDiario || 0)}</p>
                       </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Condições de Pagamento e Assinaturas */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">5. Local, Data e Assinaturas</h3>
                        <p className="text-sm text-gray-400">Localização e testemunhas.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade - UF</label>
                          <input type="text" className="input-field" value={contract.local || ''} onChange={e => setContract({...contract, local: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data</label>
                          <input type="text" className="input-field" value={contract.data || ''} onChange={e => setContract({...contract, data: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Testemunha 1</label>
                          <input type="text" className="input-field" placeholder="Nome completo" value={contract.dados.assinaturas?.testemunha1 || ''} onChange={e => updateDados('assinaturas', 'testemunha1', e.target.value)} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF Testemunha 1</label>
                          <input type="text" className="input-field" value={contract.dados.assinaturas?.cpfTestemunha1 || ''} onChange={e => updateDados('assinaturas', 'cpfTestemunha1', e.target.value)} />
                       </div>
                    </div>

                    <div className="mt-8 space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cláusulas Adicionais Personalizadas</label>
                       <textarea 
                        className="input-field min-h-[150px] py-4" 
                        placeholder="Adicione cláusulas extras se necessário..."
                        value={contract.dados.clausulas || ''}
                        onChange={e => setContract(prev => ({ ...prev, dados: { ...prev.dados, clausulas: e.target.value } }))}
                       />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {contract.tipoContrato === 'arras_confirmatorios' ? (
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-primary-black">Dados das Arras Confirmatórias</h3>
                          <p className="text-sm text-gray-400">Preencha os valores, prazos e condições do sinal.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor do Imóvel (R$)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={maskCurrency(contract.dados?.arras?.valorImovel ?? contract.valorImovel ?? contract.valor ?? '')}
                            onChange={e => {
                              const num = parseCurrencyToNumber(e.target.value);
                              setContract(prev => ({ ...prev, valor: num, valorImovel: num }));
                              updateDados('arras', 'valorImovel', num);
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gold uppercase tracking-widest pl-1">Valor das Arras / Sinal (R$)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={maskCurrency(contract.dados?.arras?.valorArras ?? '')}
                            onChange={e => updateDados('arras', 'valorArras', parseCurrencyToNumber(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Forma de Pagamento das Arras</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: PIX / Transferência"
                            value={contract.dados?.arras?.formaPagamentoArras || ''}
                            onChange={e => updateDados('arras', 'formaPagamentoArras', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data do Pagamento das Arras</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: Até 05/06/2026 ou Na assinatura"
                            value={contract.dados?.arras?.dataPagamentoArras || ''}
                            onChange={e => updateDados('arras', 'dataPagamentoArras', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Prazo Contrato Definitivo</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: 30 dias"
                            value={contract.dados?.arras?.prazoContratoDefinitivo || ''}
                            onChange={e => updateDados('arras', 'prazoContratoDefinitivo', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Prazo para Escritura</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: 60 dias"
                            value={contract.dados?.arras?.prazoEscritura || ''}
                            onChange={e => updateDados('arras', 'prazoEscritura', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Condições para Devolução</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições para devolução do sinal..."
                            value={contract.dados?.arras?.condicoesDevolucao || ''}
                            onChange={e => updateDados('arras', 'condicoesDevolucao', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Desistência do Comprador</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições em caso de desistência do comprador..."
                            value={contract.dados?.arras?.condicoesDesistenciaComprador || ''}
                            onChange={e => updateDados('arras', 'condicoesDesistenciaComprador', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Desistência do Vendedor</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições em caso de desistência do vendedor..."
                            value={contract.dados?.arras?.condicoesDesistenciaVendedor || ''}
                            onChange={e => updateDados('arras', 'condicoesDesistenciaVendedor', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Observações Adicionais</label>
                        <textarea 
                          rows={2}
                          className="input-field py-4 min-h-[60px]" 
                          placeholder="Observações adicionais para o contrato..."
                          value={contract.observacoes || ''}
                          onChange={e => setContract(prev => ({ ...prev, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-primary-black">Condições Financeiras</h3>
                          <p className="text-sm text-gray-400">Detalhe como será efetuado o pagamento.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Valor Total Negociado (R$)</label>
                            <input 
                              type="text" 
                              className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-2xl font-display font-bold text-primary-black focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all"
                              value={maskCurrency(contract.valor || '')}
                              onChange={e => setContract({...contract, valor: parseCurrencyToNumber(e.target.value)})}
                            />
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Formas de Pagamento</label>
                            <div className="grid grid-cols-2 gap-3">
                              {['À vista', 'Financiamento', 'FGTS', 'Parcelamento Direto', 'Sinal', 'Permuta', 'Outras'].map(m => (
                                <button
                                  key={m}
                                  onClick={() => toggleMetodo(contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos', m)}
                                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                                    (contract.dados[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos'].metodos || []).includes(m)
                                      ? 'bg-gold text-primary-black border-gold shadow-lg shadow-gold/20'
                                      : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor por Extenso</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={contract.dados[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']?.valorExtenso || ''} 
                              onChange={e => updateDados(contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos', 'valorExtenso', e.target.value)}
                              placeholder="Ex: Quinhentos mil reais"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Detalhes do Pagamento / Contraproposta</label>
                            <textarea 
                              rows={4}
                              className="input-field py-4 min-h-[120px]" 
                              value={
                                (contract as any).detalhesPagamento ||
                                (contract as any).detalhesPagamentoContraproposta ||
                                (contract as any).outrasCondicoes ||
                                (contract as any).condicoesPagamento ||
                                (contract as any).observacoesPagamento ||
                                (contract as any).clausulaPagamento ||
                                getDetalhesPagamento(contract.dados?.[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']) ||
                                ""
                              } 
                              onChange={e => {
                                const val = e.target.value;
                                const section = contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos';
                                setContract(prev => ({
                                  ...prev,
                                  outrasCondicoes: val,
                                  detalhesPagamento: val,
                                  detalhesPagamentoContraproposta: val,
                                  condicoesPagamento: val,
                                  observacoesPagamento: val,
                                  clausulaPagamento: val,
                                  dados: {
                                    ...prev.dados,
                                    [section]: {
                                      ...prev?.dados?.[section],
                                      outrasCondicoes: val,
                                      detalhesPagamento: val,
                                      detalhesPagamentoContraproposta: val,
                                      condicoesPagamento: val,
                                      observacoesPagamento: val,
                                      clausulaPagamento: val
                                    }
                                  }
                                }));
                              }}
                              placeholder="Descreva detalhadamente prazos, parcelas, ou termos da contraproposta..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Local e Data</h3>
                        <p className="text-sm text-gray-400">Dados que sairão no rodapé do documento.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade - UF</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.local || ''} 
                          onChange={e => setContract(prev => ({ ...prev, local: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data (por extenso)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.data || ''} 
                          onChange={e => setContract(prev => ({ ...prev, data: e.target.value }))} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* DYNAMIC CONTRACT CLAUSES MANAGER */}
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 mt-10">
                <div className="flex items-center gap-4 mb-6 text-left">
                  <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText size={24} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-display font-bold text-primary-black">Cláusulas do Contrato</h3>
                    <p className="text-sm text-gray-400">Selecione, ordene ou personalize cláusulas dinâmicas oficiais da imobiliária para este documento.</p>
                  </div>
                </div>

                {/* System-wide active template clauses selector */}
                {allSysClauses.length > 0 && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100/50 text-left">
                    <p className="text-[10px] font-black uppercase text-gold tracking-widest mb-3 select-none">Ativar Clausulas do Banco de Dados</p>
                    <div className="flex flex-wrap gap-2">
                      {allSysClauses
                        .filter(sys => sys.ativo && (sys.tipo === 'todos' || sys.tipo === contract.tipoContrato))
                        .map(sys => {
                          const isSelected = (contract.dados?.clausulasSelecionadas || []).some((c: any) => c.id === sys.id);
                          return (
                            <button
                              key={sys.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  const idx = (contract.dados?.clausulasSelecionadas || []).findIndex((c: any) => c.id === sys.id);
                                  if (idx !== -1) handleRemoveClause(sys.id, idx);
                                } else {
                                  handleAddClauseFromSys(sys);
                                }
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                                isSelected 
                                  ? 'bg-gold/10 text-gold border-gold/30' 
                                  : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-150 shadow-sm'
                              }`}
                            >
                              <span>{sys.titulo}</span>
                              {isSelected ? <Check size={14} className="text-gold" /> : <Plus size={14} />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Edit list of selected clauses for current contract */}
                <div className="space-y-4">
                  {(contract.dados?.clausulasSelecionadas || []).length === 0 ? (
                    <p className="text-sm text-center text-gray-400 py-10 border border-dashed border-gray-150 rounded-3xl bg-gray-50/20">
                      Nenhuma cláusula dinâmica ativa neste documento. Use os botões acima ou adicione uma cláusula personalizada abaixo.
                    </p>
                  ) : (
                    (contract.dados?.clausulasSelecionadas || []).map((clause: any, idx: number) => (
                      <div key={clause.id || idx} className="p-6 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-3xl transition-all space-y-3 text-left">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-grow">
                            <span className="w-6 h-6 bg-gold/15 text-gold text-xs font-black rounded-full flex items-center justify-center select-none">
                              {idx + 1}
                            </span>
                            <input 
                              type="text"
                              className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gold focus:outline-none font-bold text-sm text-primary-black py-0.5 flex-grow font-sans"
                              value={clause.titulo}
                              onChange={(e) => handleClauseTitleChange(idx, e.target.value)}
                              placeholder="Título da cláusula..."
                            />
                          </div>
                          
                          {/* Actions and order controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveClause(idx, 'up')}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-35 shadow-sm"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (contract.dados?.clausulasSelecionadas || []).length - 1}
                              onClick={() => handleMoveClause(idx, 'down')}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-35 shadow-sm"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveClause(clause.id, idx)}
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <textarea 
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs text-gray-650 leading-relaxed font-serif focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all"
                          rows={4}
                          value={clause.texto}
                          onChange={(e) => handleClauseTextChange(idx, e.target.value)}
                          placeholder="Teor descritivo e legal da cláusula..."
                        />
                      </div>
                    ))
                  )}

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={handleAddCustomClause}
                      className="flex items-center gap-2 px-5 py-2.5 border border-dashed border-gold/30 text-gold hover:border-gold hover:bg-gold/5 rounded-2xl text-xs font-bold transition-all bg-white"
                    >
                      <Plus size={14} />
                      <span>Adicionar Cláusula Personalizada</span>
                    </button>

                    <div className="text-[10px] font-bold text-gray-400 select-none">
                      {(contract.dados?.clausulasSelecionadas || []).length} Cláusula(s) Aplicada(s)
                    </div>
                  </div>

                  {/* Additional General Clause box */}
                  <div className="w-full pt-6 border-t border-gray-100 space-y-2 text-left">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Anotações e Observações Gerais Extras</label>
                     <textarea 
                       className="input-field min-h-[100px] py-4 text-xs font-serif" 
                       placeholder="Adicionalmente, você pode escrever observações gerais extras aqui..."
                       value={contract.dados.clausulas || ''}
                       onChange={e => setContract(prev => ({ ...prev, dados: { ...prev.dados, clausulas: e.target.value } }))}
                     />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-10">
                <button 
                  onClick={() => setStep('dados')}
                  className="px-10 py-4 bg-white text-gray-400 font-bold rounded-2xl border border-gray-100 flex items-center gap-3 hover:text-primary-black hover:shadow-xl transition-all"
                >
                  <ChevronLeft size={18} />
                  <span>Voltar</span>
                </button>
                <button 
                  onClick={() => setStep('revisao')}
                  className="btn-gold !py-4 px-10 flex items-center gap-3 shadow-xl"
                >
                  <span className="font-bold">Gerar Documento</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'revisao' && (
            <motion.div 
              key="revisao"
              variants={fadeIn}
              className="space-y-10"
            >
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                      <Eye size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-black">Prévia do Documento Oficial</h3>
                      <p className="text-sm text-gray-400">Verifique os dados cuidadosamente antes de finalizar.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-xl text-gold font-bold text-[10px] uppercase tracking-widest border border-gold/20">
                     <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                     Modo de Revisão
                  </div>
                </div>

                {contract.tipoContrato === 'aceite' && (
                  <div className="space-y-6 mb-8">
                    {/* DADOS DO ACEITE */}
                    <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-200/60 text-amber-950">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                          <Eye size={20} />
                        </div>
                        <h4 className="font-display font-bold text-base text-amber-900">DADOS DO ACEITE</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Valor do Aceite</span>
                          <strong className="text-amber-950 font-semibold">{formatCurrency((contract as any).valorAceite || contract.valor || 0)}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Data do Documento Base</span>
                          <strong className="text-amber-950 font-semibold">{formatarDataBR((contract as any).dataDocumentoBase || (contract as any).dataProposta || "")}</strong>
                        </div>
                      </div>
                    </div>

                    {/* DADOS DO IMÓVEL */}
                    <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-200/60 text-amber-950">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                          <Home size={20} />
                        </div>
                        <h4 className="font-display font-bold text-base text-amber-900">DADOS DO IMÓVEL</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Nome do Edifício</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).imovelTitulo || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Endereço</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).imovelEndereco || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Bairro</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).imovelBairro || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Cidade/UF</span>
                          <strong className="text-amber-950 font-semibold">
                            {((contract as any).imovelCidade || "Não informado")} / {((contract as any).imovelEstado || "Não informado")}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Matrícula</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).imovelMatricula || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">CRI</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).imovelCri || "Não informado"}</strong>
                        </div>
                      </div>

                      {(!(contract as any).imovelTitulo || !(contract as any).imovelMatricula || !(contract as any).imovelCri) && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs mt-2">
                          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                          <div>
                            <p className="font-bold">Dados do imóvel incompletos</p>
                            <p>Verifique nome do edifício, matrícula e CRI antes de finalizar o documento.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* TERMOS E CONDIÇÕES */}
                    <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-200/60 text-amber-950">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                          <FileText size={20} />
                        </div>
                        <h4 className="font-display font-bold text-base text-amber-900">TERMOS E CONDIÇÕES</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Forma de pagamento</span>
                          <strong className="text-amber-950 font-semibold">{(contract as any).formaPagamento || "Não informado"}</strong>
                        </div>
                        <div>
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Opções selecionadas</span>
                          <strong className="text-amber-950 font-semibold">
                            {Array.isArray((contract as any).formasPagamento) && (contract as any).formasPagamento.length > 0 ? (
                              (contract as any).formasPagamento.join(', ')
                            ) : (
                              "Nenhuma opção selecionada"
                            )}
                          </strong>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Condições de pagamento</span>
                          <strong className="text-amber-950 font-semibold block bg-amber-100/30 p-2.5 rounded-xl border border-amber-100 mt-1">{(contract as any).condicoesPagamento || "Não informado"}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Outras condições</span>
                          <strong className="text-amber-950 font-semibold block bg-amber-100/30 p-2.5 rounded-xl border border-amber-100 mt-1">{(contract as any).outrasCondicoes || "Não informado"}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] text-amber-800 font-medium uppercase tracking-wider">Detalhes do pagamento</span>
                          <strong className="text-amber-950 font-semibold block bg-amber-100/30 p-2.5 rounded-xl border border-amber-100 mt-1">{(contract as any).detalhesPagamento || "Não informado"}</strong>
                        </div>
                      </div>

                      {(!getTermosCondicoes(contract) || getTermosCondicoes(contract) === "") && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs mt-2">
                          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                          <div>
                            <p className="font-bold">Atenção: os termos e condições da proposta não foram carregados.</p>
                            <p>Verifique o documento base para carregar os detalhes do pagamento e condições.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* DETALHES DO PAGAMENTO / CONTRAPROPOSTA */}
                <div className="mb-8 p-6 rounded-3xl bg-amber-50/50 border border-amber-200/60 text-amber-950">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                      <CreditCard size={20} />
                    </div>
                    <h4 className="font-display font-bold text-base text-amber-900 text-left">DETALHES DO PAGAMENTO / CONTRAPROPOSTA</h4>
                  </div>
                  
                  <div className="text-xs space-y-4 text-left">
                    {getDetalhesPagamento(contract) ? (
                      <div className="bg-amber-100/30 p-4 rounded-xl border border-amber-100 mt-1 whitespace-pre-wrap leading-relaxed font-sans text-amber-950">
                        {getDetalhesPagamento(contract)}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs mt-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                        <div>
                          <p className="font-bold">Atenção: detalhes do pagamento não foram preenchidos.</p>
                          <p>Por favor, volte à etapa anterior e preencha o campo de detalhes do pagamento caso necessário.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* A4 Preview Container */}
                <div className="flex justify-center bg-gray-50/50 -m-10 p-10 overflow-hidden lg:overflow-visible min-h-[500px]">
                  <ContractA4Preview contract={contract as Contract} printRef={printRef} />
                </div>
              </div>

              {!isPreviewOnly && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center text-primary-black shadow-lg">
                      <FileCheck size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-bold text-white">Tudo pronto para finalizar?</h4>
                      <p className="text-gray-400 text-sm">Ao finalizar, o contrato será bloqueado para edições e o status passará para <span className="text-gold font-bold">Finalizado</span>.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                    <button 
                      onClick={() => setStep('pagamento')}
                      className="flex-1 md:flex-none px-10 py-5 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      <ChevronLeft size={18} />
                      <span>Voltar e Ajustar</span>
                    </button>
                    <button 
                      onClick={() => saveContract(true)}
                      disabled={loading}
                      className="flex-1 md:flex-none btn-gold !py-5 px-12 flex items-center justify-center gap-3 shadow-2xl shadow-gold/20 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <div className="w-6 h-6 border-3 border-primary-black border-t-transparent rounded-full animate-spin" /> : <Check size={20} />}
                      <span className="text-lg">Finalizar e Salvar</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

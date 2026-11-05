import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Contract } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  isValidImageUrl, 
  safeText, 
  safeMoney, 
  safeDate, 
  valorMonetarioPorExtenso, 
  getParteAceitante,
  formatarDataBR,
  getNomeCompletoPessoa,
  getNomeComprador,
  getNomeVendedor,
  limparTextoEndereco,
  montarEnderecoCompletoImovel,
  montarEnderecoComprador,
  montarEnderecoVendedor,
  montarEnderecoImovel,
  normalizarParteEndereco,
  normalizarChaveEndereco,
  removerPartesDuplicadas,
  montarEnderecoImovelPDF,
  montarEnderecoCompradorPDF,
  montarEnderecoVendedorPDF,
  limparEnderecoDuplicadoSalvo
} from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';
import { calculateNights } from '../../services/temporaryRentalService';

// ============================================================================
// HELPER FUNCTIONS & TEXT DEDUPLICATION
// ============================================================================

export function normalizarTextoPDF(texto: any): string {
  return String(texto || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function textosIguaisPDF(a: any, b: any): boolean {
  return normalizarTextoPDF(a) === normalizarTextoPDF(b);
}

const getCleanVal = (val: any): string => (typeof val === 'string' ? val.trim() : '');

export const parseValorNum = (v: any): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // aceita "850.000,00", "850000.00", "R$ 850.000,00"
    const cleaned = v.replace(/[^\d,.-]/g, '');
    // pt-BR: ponto = milhar, vírgula = decimal
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const estimateHeight = (text: string, divisor: number = 56, mmPerLine: number = 5.0): number => {
  if (!text) return 0;
  const lines = text.split('\n');
  let totalLines = 0;
  lines.forEach(line => {
    totalLines += Math.max(1, Math.ceil(line.length / divisor));
  });
  return totalLines * mmPerLine;
};

/**
 * Parses markdown bold (**bold** or __bold__) into JSX strong elements,
 * ensuring no literal asterisks remain.
 */
export function parseInlineBold(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  const regex = /(\*\*|__)(.*?)\1/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index).replace(/\*\*/g, ''));
    }
    const boldText = match[2];
    if (boldText) {
      parts.push(
        <strong key={match.index} className="font-bold text-black">
          {boldText.replace(/\*\*/g, '')}
        </strong>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex).replace(/\*\*/g, ''));
  }

  return parts.length > 0 ? parts : [text.replace(/\*\*/g, '')];
}

/**
 * Formats multi-paragraph or listed text:
 * - Parses **bold** without showing literal asterisks
 * - Formats bullet lists (*, -, •) and numbered lists (1., 2.)
 * - Preserves line breaks and paragraph spacing
 */
export function renderFormattedText(text: any, className: string = ""): React.ReactNode {
  if (text === null || text === undefined) return null;
  const rawStr = String(text).trim();
  if (!rawStr) return null;

  const lines = rawStr.split(/\r?\n/);
  
  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        const isBullet = /^[*-•]\s+/.test(trimmed);
        const isNumbered = /^(\d+)[.)-]\s+/.test(trimmed);

        let content = trimmed;
        let prefix: React.ReactNode = null;

        if (isBullet) {
          content = trimmed.replace(/^[*-•]\s+/, '');
          prefix = <span className="inline-block w-3 text-gold shrink-0 font-black select-none">•</span>;
        } else if (isNumbered) {
          const match = trimmed.match(/^(\d+[.)-])\s+/);
          const numPrefix = match ? match[1] : '';
          content = trimmed.replace(/^(\d+[.)-])\s+/, '');
          prefix = <span className="inline-block min-w-4 text-black font-bold shrink-0 mr-1 select-none">{numPrefix}</span>;
        }

        const parsedContent = parseInlineBold(content);

        if (isBullet || isNumbered) {
          return (
            <div key={lineIdx} className="flex items-start pl-1.5 leading-relaxed text-justify break-words">
              {prefix}
              <div className="flex-1">{parsedContent}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="leading-relaxed text-justify break-words">
            {parsedContent}
          </p>
        );
      })}
    </div>
  );
}

export function limparParteEndereco(valor: any): string {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "");
}

export function removerDuplicadosEndereco(partes: any[] = []): string[] {
  const vistos = new Set();

  return partes
    .map(limparParteEndereco)
    .filter(Boolean)
    .filter((parte) => {
      const chave = parte.toLowerCase();

      if (vistos.has(chave)) {
        return false;
      }

      vistos.add(chave);
      return true;
    });
}

// montarEnderecoImovelPDF is imported from ../../lib/utils

export function montarEnderecoIdentificacaoImovel(imovel: any = {}): string {
  if (!imovel) return "Não informado";

  if (typeof imovel === 'string') return limparTextoEndereco(imovel);

  const cep = limparTextoEndereco(imovel.imovelCep || imovel.cep || imovel.zipCode || "");
  const cepStr = cep ? `CEP ${cep}` : "";

  const logradouro = limparTextoEndereco(imovel.imovelLogradouro || imovel.logradouro || imovel.endereco || imovel.rua || imovel.street || imovel.address || "");
  const numero = limparTextoEndereco(imovel.imovelNumero || imovel.numero || imovel.number || "");
  const complemento = limparTextoEndereco(imovel.imovelComplemento || imovel.complemento || imovel.complement || "");

  const logradouroCompletado = [logradouro, numero, complemento]
    .map(limparTextoEndereco)
    .filter(Boolean)
    .join(", ");

  const bairro = limparTextoEndereco(imovel.imovelBairro || imovel.bairro || imovel.neighborhood || imovel.district || "");

  const cidade = limparTextoEndereco(imovel.imovelCidade || imovel.cidade || imovel.city || "");
  const estado = limparTextoEndereco(imovel.imovelEstado || imovel.estado || imovel.uf || imovel.state || "");
  let cidadeUf = "";
  if (cidade && estado) {
    if (cidade.toLowerCase() === estado.toLowerCase()) {
      cidadeUf = cidade;
    } else {
      cidadeUf = `${cidade}/${estado}`;
    }
  } else {
    cidadeUf = cidade || estado;
  }

  // Deduplicate parts
  const partes = [logradouroCompletado, bairro, cidadeUf, cepStr].filter(Boolean);
  const partesUnicas: string[] = [];
  const normalizados = new Set<string>();

  for (const parte of partes) {
    const chave = parte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]/g, "");

    if (chave && !normalizados.has(chave)) {
      normalizados.add(chave);
      partesUnicas.push(parte);
    }
  }

  return partesUnicas.join(" — ");
}

export function getDadosImovelPDF(dados: any = {}): any {
  if (!dados) return {};
  const imovelData = dados.imovel || {};
  
  const imovel = {
    nomeEdificio:
      dados.nomeEdificio ||
      dados.edificio ||
      dados.tituloImovel ||
      dados.imovelTitulo ||
      dados.titulo ||
      imovelData.nomeEdificio ||
      imovelData.edificio ||
      imovelData.tituloImovel ||
      imovelData.imovelTitulo ||
      imovelData.titulo ||
      "",

    codigoImovel:
      dados.codigoImovel ||
      dados.codigo ||
      dados.referencia ||
      dados.id ||
      imovelData.codigoImovel ||
      imovelData.codigo ||
      imovelData.referencia ||
      imovelData.id ||
      "",

    endereco:
      montarEnderecoImovelPDF(dados.imovel || dados),

    bairro:
      dados.bairro ||
      dados.bairroImovel ||
      imovelData.bairro ||
      imovelData.bairroImovel ||
      "",

    cidade:
      dados.cidade ||
      dados.cidadeImovel ||
      imovelData.cidade ||
      imovelData.cidadeImovel ||
      "",

    estado:
      dados.estado ||
      dados.uf ||
      dados.estadoImovel ||
      imovelData.estado ||
      imovelData.uf ||
      imovelData.estadoImovel ||
      "",

    matricula:
      dados.imovelMatricula ||
      dados.matriculaImovel ||
      dados.numeroMatricula ||
      dados.matricula ||
      imovelData.imovelMatricula ||
      imovelData.matriculaImovel ||
      imovelData.numeroMatricula ||
      imovelData.matricula ||
      "",

    cri:
      dados.imovelCri ||
      dados.criImovel ||
      dados.criRegistrario ||
      dados.cri ||
      imovelData.imovelCri ||
      imovelData.criImovel ||
      imovelData.criRegistrario ||
      imovelData.cri ||
      "",

    valorAnunciado:
      Number(
        dados.valorAnunciado ||
        dados.valorVenda ||
        dados.valorImovel ||
        imovelData.valorAnunciado ||
        imovelData.valorVenda ||
        imovelData.valorImovel ||
        0
      ),

    valorDocumento:
      Number(
        dados.valorAceite ||
        dados.valorProposta ||
        dados.valorTotalNegociado ||
        dados.valorNegociado ||
        dados.valor ||
        imovelData.valorAceite ||
        imovelData.valorProposta ||
        0
      )
  };

  return imovel;
}

export function getTextoPagamentoPDF(dados: any = {}, contract: any = {}): string {
  const d = dados || {};
  const c = contract || {};
  return getCleanVal(
    c.detalhesPagamento ||
    c.detalhesPagamentoContraproposta ||
    c.observacoesPagamento ||
    c.formaPagamentoDetalhada ||
    c.pagamento?.detalhes ||
    c.pagamento?.detalhesPagamento ||
    c.pagamento?.detalhesPagamentoContraproposta ||
    c.pagamento?.condicoesPagamento ||
    c.termos?.detalhesPagamento ||
    c.termos?.detalhesPagamentoContraproposta ||
    c.termos?.condicoesPagamento ||
    c.dados?.detalhesPagamento ||
    c.dados?.detalhesPagamentoContraproposta ||
    c.dados?.observacoesPagamento ||
    c.dados?.formaPagamentoDetalhada ||
    c.dados?.pagamento?.detalhes ||
    c.dados?.pagamento?.detalhesPagamento ||
    c.dados?.pagamento?.detalhesPagamentoContraproposta ||
    c.dados?.pagamento?.condicoesPagamento ||
    c.dados?.termos?.detalhesPagamento ||
    c.dados?.termos?.detalhesPagamentoContraproposta ||
    c.dados?.termos?.condicoesPagamento ||
    d.detalhesPagamento ||
    d.pagamento?.detalhesPagamento ||
    d.termos?.detalhesPagamento ||
    d.detalhesPagamentoContraproposta ||
    d.pagamento?.detalhesPagamentoContraproposta ||
    d.termos?.detalhesPagamentoContraproposta ||
    d.observacoesPagamento ||
    d.formaPagamentoDetalhada ||
    d.pagamento?.detalhes ||
    d.condicoesFinal ||
    d.condicoesPagamento ||
    d.pagamento?.condicoesPagamento ||
    d.termos?.condicoesPagamento ||
    d.condicoesDaProposta ||
    ""
  );
}

export function getOutrasCondicoesPDF(dados: any = {}, contract: any = {}): string {
  const d = dados || {};
  const c = contract || {};
  return getCleanVal(
    c.outrasCondicoes ||
    c.pagamento?.outrasCondicoes ||
    c.termos?.outrasCondicoes ||
    c.dados?.outrasCondicoes ||
    c.dados?.pagamento?.outrasCondicoes ||
    c.dados?.termos?.outrasCondicoes ||
    d.outrasCondicoes ||
    d.pagamento?.outrasCondicoes ||
    d.termos?.outrasCondicoes ||
    ""
  );
}

export function getSpouseDataPDF(partyData: any = {}, prefix: 'comprador' | 'vendedor' | 'locador' | 'locatario', globalDados: any = {}): any {
  const p = partyData || {};
  const gd = globalDados || {};
  
  const nome = 
    p[`${prefix}ConjugeNome`] || 
    p.conjugeNome || 
    p.conjuge?.nome || 
    gd[`${prefix}ConjugeNome`] || 
    gd.conjugeNome ||
    "";
    
  const cpf = 
    p[`${prefix}ConjugeCpf`] || 
    p.conjugeCpf || 
    p.conjuge?.cpf || 
    gd[`${prefix}ConjugeCpf`] || 
    gd.conjugeCpf ||
    "";

  const rg = 
    p[`${prefix}ConjugeRg`] || 
    p.conjugeRg || 
    p.conjuge?.rg || 
    gd[`${prefix}ConjugeRg`] || 
    gd.conjugeRg ||
    "";

  const profissao = 
    p[`${prefix}ConjugeProfissao`] || 
    p.conjugeProfissao || 
    p.conjuge?.profissao || 
    gd[`${prefix}ConjugeProfissao`] || 
    gd.conjugeProfissao ||
    "";

  const telefone = 
    p[`${prefix}ConjugeTelefone`] || 
    p.conjugeTelefone || 
    p.conjuge?.telefone || 
    gd[`${prefix}ConjugeTelefone`] || 
    gd.conjugeTelefone ||
    "";

  const email = 
    p[`${prefix}ConjugeEmail`] || 
    p.conjugeEmail || 
    p.conjuge?.email || 
    gd[`${prefix}ConjugeEmail`] || 
    gd.conjugeEmail ||
    "";

  const estadoCivil = 
    p[`${prefix}ConjugeEstadoCivil`] || 
    p.conjugeEstadoCivil || 
    p.conjuge?.estadoCivil || 
    gd[`${prefix}ConjugeEstadoCivil`] || 
    gd.conjugeEstadoCivil ||
    "";

  const endereco = 
    p[`${prefix}ConjugeEndereco`] || 
    p.conjugeEndereco || 
    p.conjuge?.endereco || 
    gd[`${prefix}ConjugeEndereco`] || 
    gd.conjugeEndereco ||
    "";

  return { nome, cpf, rg, profissao, telefone, email, estadoCivil, endereco };
}

export function estimateSignatureHeight(dados: any, tipoContrato: string, contract: any, empresa: any, parteAceitante?: any): number {
  let count = 4; // Base: Contratante + Contratada + Testemunha 1 + Testemunha 2

  // Spouses
  const compSpouse = getSpouseDataPDF(dados.proponente || dados.comprador || dados.locatario, 'comprador', dados);
  if (compSpouse.nome) count++;
  const vendSpouse = getSpouseDataPDF(dados.vendedor || dados.proprietario || dados.locador, 'vendedor', dados);
  if (vendSpouse.nome) count++;

  // Intermediária se aplicável
  if (tipoContrato !== 'administracao_temporaria' && tipoContrato !== 'aceite') {
    count++;
  }

  const numRows = Math.ceil(count / 2);
  return 8 + (numRows * 15);
}

const formatFullAddress = (obj: any): string => {
  if (!obj) return 'Não informado';
  if (typeof obj === 'string') return limparParteEndereco(obj);
  return montarEnderecoImovelPDF(obj);
};

// ============================================================================
// REUSABLE PDF COMPONENTS
// ============================================================================

interface PdfHeaderProps {
  empresa: any;
  isCompact?: boolean;
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({ empresa, isCompact = true }) => {
  const logoUrl = empresa.logoCabecalhoUrl || '/logo.png';
  const addressLine = [
    empresa.endereco,
    empresa.bairro,
    empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : (empresa.cidade || empresa.estado),
    empresa.cep ? `CEP: ${empresa.cep}` : ''
  ].filter(Boolean).join(' - ');

  if (isCompact) {
    return (
      <div className="pdf-compact-header select-none">
        {logoUrl && isValidImageUrl(logoUrl) && (
          <img 
            src={logoUrl} 
            alt={safeText(empresa.nome)} 
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-grow text-right">
          <h2 className="company-name text-primary-black uppercase leading-none mb-1">
            {safeText(empresa.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
          </h2>
          <div className="company-info">
            {empresa.razaoSocial && <span className="block mb-0.5 font-bold uppercase">{safeText(empresa.razaoSocial)}</span>}
            <p className="m-0 text-gray-500 text-[11px]">
              {empresa.cnpj ? `CNPJ: ${safeText(empresa.cnpj)}` : ''}
              {empresa.creciPj ? ` | CRECI PJ: ${safeText(empresa.creciPj)}` : ''}
              {addressLine ? ` | ${addressLine}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b-2 border-primary-black pb-2 mb-4 gap-4 w-full select-none">
      {logoUrl && isValidImageUrl(logoUrl) && (
        <img 
          src={logoUrl} 
          alt={safeText(empresa.nome)} 
          className="h-16 w-auto object-contain shrink-0" 
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="flex-grow text-right text-[11.5px] text-gray-700 font-bold uppercase tracking-widest leading-normal">
        <h2 className="text-[15px] font-display font-black text-primary-black uppercase tracking-[0.1em] mb-0.5">
          {safeText(empresa.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
        </h2>
        {empresa.razaoSocial && <p className="mb-0.5">{safeText(empresa.razaoSocial)}</p>}
        {addressLine && <p className="mb-0.5">{addressLine}</p>}
        <p className="mb-0.5">
          {empresa.cnpj ? `CNPJ: ${safeText(empresa.cnpj)}` : ''}
          {empresa.creciPj ? ` | CRECI PJ: ${safeText(empresa.creciPj)}` : ''}
        </p>
        <p>
          {empresa.telefone ? `Tel: ${safeText(empresa.telefone)}` : ''}
          {empresa.email ? ` | ${safeText(empresa.email)}` : ''}
        </p>
      </div>
    </div>
  );
};

interface PdfSectionProps {
  title: string;
  children: React.ReactNode;
  isDense?: boolean;
}

export const PdfSection: React.FC<PdfSectionProps> = ({ title, children, isDense = false }) => {
  return (
    <section className={`section avoid-break ${isDense ? 'mb-1.5' : 'mb-2'}`}>
      <h3 className="section-title text-[11px] font-black uppercase text-black tracking-wider bg-gray-50 border-l-2 border-gold py-0.5 px-1.5 mb-1">
        {title}
      </h3>
      {children}
    </section>
  );
};

interface PdfFieldGridProps {
  children: React.ReactNode;
  cols?: number;
  isDense?: boolean;
}

export const PdfFieldGrid: React.FC<PdfFieldGridProps> = ({ children, cols = 2, isDense = false }) => {
  const gridClass = cols === 3 ? 'grid grid-cols-3' : 'grid grid-cols-2';
  return (
    <div className={`${gridClass} ${isDense ? 'gap-y-0.5 gap-x-4' : 'gap-y-0.5 gap-x-5'} text-[10.5px] sm:text-[11px] leading-snug text-gray-800`}>
      {children}
    </div>
  );
};

interface PdfPropertyBlockProps {
  imovel: any;
  tipoContrato: string;
  valorAlternativo?: number;
  dataAlternativa?: string;
  contract?: any;
  isDense?: boolean;
}

export const PdfPropertyBlock: React.FC<PdfPropertyBlockProps> = ({ 
  imovel, 
  tipoContrato, 
  valorAlternativo, 
  dataAlternativa,
  contract = {},
  isDense = false
}) => {
  // Combine all sources into a single object for robust parsing
  const combined = { 
    ...contract, 
    ...imovel, 
    imovel: imovel || contract.imovel 
  };
  const imovParsed = getDadosImovelPDF(combined);

  const titulo = imovParsed.nomeEdificio || "Imóvel";
  const codigo = imovParsed.codigoImovel || "Não informado";
  
  const logradouro = combined.imovelLogradouro || combined.imovel?.imovelLogradouro || combined.logradouro || combined.imovel?.logradouro || combined.endereco || combined.imovel?.endereco || combined.rua || combined.imovel?.rua || combined.street || combined.imovel?.street || combined.address || combined.imovel?.address || "";
  const numero = combined.imovelNumero || combined.imovel?.imovelNumero || combined.numero || combined.imovel?.numero || combined.number || combined.imovel?.number || "";
  const complemento = combined.imovelComplemento || combined.imovel?.imovelComplemento || combined.complemento || combined.imovel?.complemento || combined.complement || combined.imovel?.complement || "";
  const bairro = combined.imovelBairro || combined.imovel?.imovelBairro || combined.bairro || combined.imovel?.bairro || combined.district || combined.imovel?.district || combined.neighborhood || combined.imovel?.neighborhood || "";
  const cidade = combined.imovelCidade || combined.imovel?.imovelCidade || combined.cidade || combined.imovel?.cidade || combined.city || combined.imovel?.city || "";
  const estado = combined.imovelEstado || combined.imovel?.imovelEstado || combined.estado || combined.imovel?.estado || combined.uf || combined.imovel?.uf || combined.state || combined.imovel?.state || "";
  const cep = combined.imovelCep || combined.imovel?.imovelCep || combined.cep || combined.imovel?.cep || combined.zipCode || combined.imovel?.zipCode || "";

  // Helper to strip neighborhood, city, state, and cep from a given string to ensure the Address row only has street info
  const obterApenasLogradouroNumeroComplemento = (textoOriginal: string): string => {
    if (!textoOriginal) return "";
    const partes = textoOriginal.split(",").map(p => p.trim()).filter(Boolean);
    const ignorarChaves = new Set<string>();
    if (bairro) ignorarChaves.add(normalizarChaveEndereco(bairro));
    if (cidade) ignorarChaves.add(normalizarChaveEndereco(cidade));
    if (estado) ignorarChaves.add(normalizarChaveEndereco(estado));
    if (cep) {
      ignorarChaves.add(normalizarChaveEndereco(cep));
      ignorarChaves.add(normalizarChaveEndereco(cep.replace("-", "")));
    }

    const limpas = partes.filter(parte => {
      const chave = normalizarChaveEndereco(parte);
      if (ignorarChaves.has(chave)) return false;
      for (const k of ignorarChaves) {
        if (k && k.length >= 3 && (chave === k || chave.includes(k) || k.includes(chave))) {
          return false;
        }
      }
      return true;
    });

    return removerPartesDuplicadas(limpas).join(", ");
  };

  // Build the Endereço row (logradouro, numero, complemento)
  let streetPart = "";
  if (logradouro) {
    const partes = removerPartesDuplicadas([logradouro, numero, complemento]);
    streetPart = obterApenasLogradouroNumeroComplemento(partes.join(", "));
  } else {
    const full = combined.imovelEnderecoCompleto || combined.enderecoCompleto || combined.imovel?.imovelEnderecoCompleto || combined.imovel?.enderecoCompleto || "";
    streetPart = obterApenasLogradouroNumeroComplemento(full);
  }

  if (!streetPart.trim()) {
    streetPart = removerPartesDuplicadas([logradouro, numero, complemento]).join(", ");
  }

  streetPart = limparEnderecoDuplicadoSalvo(streetPart);

  let cidadeUf = "";
  if (cidade && estado) {
    if (String(cidade).toLowerCase() === String(estado).toLowerCase()) {
      cidadeUf = String(cidade);
    } else {
      cidadeUf = `${cidade}/${estado}`;
    }
  } else {
    cidadeUf = String(cidade || estado || "Balneário Camboriú/SC");
  }

  const matricula = imovParsed.matricula || "Não informada";
  const cri = imovParsed.cri || "Não informado";

  let labelValor = "Valor do Imóvel:";
  if (tipoContrato === 'aceite') labelValor = "Valor do Aceite:";
  else if (tipoContrato === 'proposta') labelValor = "Valor da Proposta:";
  else if (tipoContrato === 'contraproposta') labelValor = "Valor da Contraproposta:";
  else if (tipoContrato === 'arras_confirmatorios') labelValor = "Valor Total do Negócio:";
  else if (tipoContrato === 'locacao_temporaria') labelValor = "Valor Total da Locação:";

  return (
    <div className={`bg-gray-50/50 border border-gray-150 rounded-lg ${isDense ? 'p-1.5 gap-y-0.5 gap-x-4 text-[10px] sm:text-[10.5px]' : 'p-2 gap-y-0.5 gap-x-5 text-[10.5px] sm:text-[11px]'} grid grid-cols-2 leading-snug property-block avoid-break`}>
      <p><strong>Edifício / Imóvel:</strong> {safeText(titulo)}</p>
      <p><strong>Código do Imóvel:</strong> {safeText(codigo)}</p>
      
      <p className="col-span-2"><strong>Endereço:</strong> {safeText(streetPart)}</p>
      <p><strong>Bairro:</strong> {safeText(bairro || "Não informado")}</p>
      <p><strong>Cidade/UF:</strong> {safeText(cidadeUf)}</p>
      {cep && <p className="col-span-2"><strong>CEP:</strong> {safeText(cep)}</p>}

      <p><strong>Matrícula:</strong> {safeText(matricula)}</p>
      <p><strong>CRI Registrário:</strong> {safeText(cri)}</p>
      
      {valorAlternativo !== undefined && valorAlternativo > 0 && (
        <p className={`${tipoContrato === 'aceite' ? 'col-span-1' : 'col-span-2'}`}>
          <strong>{labelValor}</strong> <span className="font-bold text-black">{safeMoney(valorAlternativo)}</span>
          {tipoContrato === 'aceite' && valorAlternativo ? ` (${valorMonetarioPorExtenso(valorAlternativo)})` : ''}
        </p>
      )}

      {dataAlternativa && (
        <p><strong>Data Proposta Base:</strong> {safeText(dataAlternativa)}</p>
      )}

      {tipoContrato === 'locacao_temporaria' && (
        <>
          <p><strong>Mobiliado:</strong> {safeText(imovel.mobiliado || 'Sim')}</p>
          {imovel.itensInclusos && <p className="col-span-2"><strong>Itens inclusos:</strong> {safeText(imovel.itensInclusos)}</p>}
        </>
      )}
    </div>
  );
};

interface PdfPaymentBlockProps {
  dados: any;
  tipoContrato: string;
  totalValor: number;
  metodosDePagamento?: any[];
  formaPagamentoSimple?: string;
  contract?: any;
  isDense?: boolean;
}

export const PdfPaymentBlock: React.FC<PdfPaymentBlockProps> = ({
  dados = {},
  tipoContrato = 'proposta',
  totalValor = 0,
  metodosDePagamento = [],
  formaPagamentoSimple = "",
  contract = {},
  isDense = false
}) => {
  const d = dados || {};
  const c = contract || {};
  const rawDetalhes = getTextoPagamentoPDF(d, c);
  const rawOutras = getOutrasCondicoesPDF(d, c);

  const showDetalhes = rawDetalhes.trim() !== "";
  const showOutras = rawOutras.trim() !== "" && !textosIguaisPDF(rawOutras, rawDetalhes);

  const safeTotal = typeof totalValor === 'number' && !isNaN(totalValor) ? totalValor : parseValorNum(totalValor);
  const valorExtenso = safeTotal > 0 ? valorMonetarioPorExtenso(safeTotal) : '';
  
  const safeMetodos: any[] = Array.isArray(metodosDePagamento)
    ? metodosDePagamento
    : (typeof metodosDePagamento === 'string' && (metodosDePagamento as string).trim()
        ? (metodosDePagamento as string).split(',').map((s: string) => s.trim()).filter(Boolean)
        : []);

  let sectionTitle = "III - Valor e Forma de Pagamento";
  if (tipoContrato === 'aceite') {
    sectionTitle = "III - Termos e Condições da Proposta Aceita";
  } else if (tipoContrato === 'contraproposta') {
    sectionTitle = "IV - Termos e Condições da Contraproposta";
  } else if (tipoContrato === 'arras_confirmatorios') {
    sectionTitle = "IV - Das Arras e Condições do Negócio";
  } else if (tipoContrato === 'locacao_temporaria') {
    sectionTitle = "V - Valores e Detalhamento da Locação";
  }

  return (
    <PdfSection title={sectionTitle} isDense={isDense}>
      {tipoContrato === 'aceite' ? (
        <div className="text-[10.5px] sm:text-[11px] text-gray-800 leading-snug space-y-1">
          <p><strong>Valor do Aceite:</strong> <span className="font-bold text-black">{safeMoney(safeTotal)}</span> {valorExtenso ? `(${valorExtenso})` : ''}</p>
          {formaPagamentoSimple && (
            <p><strong>Forma de Pagamento:</strong> {safeText(formaPagamentoSimple)}</p>
          )}
          {showDetalhes && (
            <div className="mt-0.5 leading-normal text-[10px] sm:text-[10.5px] text-gray-800 text-justify">
              <p className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-0.5">Detalhes / Condições de Pagamento:</p>
              <div className="text-justify tracking-tight break-words text-gray-800">
                {renderFormattedText(rawDetalhes)}
              </div>
            </div>
          )}
          {showOutras && (
            <div className="mt-0.5 leading-normal text-[10px] sm:text-[10.5px] text-gray-800 text-justify">
              <p className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-0.5">Outras Condições:</p>
              <div className="text-justify tracking-tight break-words text-gray-800">
                {renderFormattedText(rawOutras)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {tipoContrato !== 'locacao_temporaria' && tipoContrato !== 'arras_confirmatorios' && (
            <p className="text-justify text-[10.5px] sm:text-[11px] leading-snug mb-1 text-gray-800">
              O valor total da transação é de <strong>{safeMoney(safeTotal)}</strong> ({valorExtenso ? `${valorExtenso}` : 'Não informado'}).
            </p>
          )}

          {tipoContrato === 'arras_confirmatorios' && (
            <div className={`grid grid-cols-2 ${isDense ? 'gap-y-0.5 gap-x-4' : 'gap-y-0.5 gap-x-5'} text-[10.5px] sm:text-[11px] text-gray-800 leading-snug mb-1`}>
              <p><strong>Valor Total do Negócio:</strong> {safeMoney(safeTotal)}</p>
              <p><strong>Valor do Sinal/Arras:</strong> {safeMoney(Number(d.arras?.valorArras || 0))}</p>
              <p><strong>Forma do Sinal:</strong> {safeText(d.arras?.formaPagamentoArras || "Não informado")}</p>
              <p><strong>Vencimento do Sinal:</strong> {safeDate(d.arras?.dataPagamentoArras)}</p>
              {d.arras?.condicoesDevolucao && (
                <p className="col-span-2 text-[10px] text-gray-700 mt-0.5">
                  <strong>Condições de devolução do sinal:</strong> {safeText(d.arras.condicoesDevolucao)}
                </p>
              )}
              {d.arras?.observacoes && (
                <p className="col-span-2 text-[10px] text-gray-700 mt-0.5">
                  <strong>Observações Gerais:</strong> {safeText(d.arras.observacoes)}
                </p>
              )}
            </div>
          )}

          {tipoContrato === 'locacao_temporaria' && (() => {
            let qtdDiarias = Number(d?.prazo?.quantidadeDiarias ?? d?.prazo?.quantidadeDias ?? d?.prazo?.totalDiarias ?? c?.quantidadeDiarias ?? 0);
            if (qtdDiarias <= 0 && d?.prazo?.dataInicio && d?.prazo?.dataTermino) {
              qtdDiarias = calculateNights(d.prazo.dataInicio, d.prazo.dataTermino);
            }
            const valDiaria = Number(
              d?.valores?.valorDiaria ?? 
              d?.valores?.valorDiario ?? 
              d?.valorDiaria ?? 
              d?.imovel?.valorDiaria ?? 
              c?.valorDiaria ?? 
              c?.imovel?.valorDiaria ?? 
              0
            );
            const subtotal = Number(d?.valores?.subtotalDiarias) || (valDiaria * qtdDiarias);
            const txLimpeza = Number(d?.valores?.taxaLimpeza ?? d?.taxaLimpeza ?? d?.imovel?.taxaLimpeza ?? 0);
            const txAdicionais = Number(d?.valores?.taxasAdicionais ?? d?.valores?.outrasTaxas ?? d?.outrasTaxas ?? 0);
            const desc = Number(d?.valores?.desconto ?? d?.valores?.descontos ?? d?.valorDesconto ?? 0);
            const txCaucao = Number(d?.valores?.taxaCaucao ?? d?.taxaCaucao ?? 0);
            const computedTotal = subtotal + txLimpeza + txAdicionais - desc;
            const totalGeral = Number(d?.valores?.valorTotalLocacao ?? d?.valores?.valorFinal ?? c?.valor ?? (computedTotal > 0 ? computedTotal : 0));
            const totalExtenso = totalGeral > 0 ? valorMonetarioPorExtenso(totalGeral) : '';

            return (
              <div className="space-y-1 mb-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-0.5 gap-x-4 text-[10.5px] sm:text-[11px] text-gray-800 leading-snug">
                  <p><strong>Valor da Diária:</strong> {safeMoney(valDiaria)}</p>
                  <p><strong>Quantidade de Diárias:</strong> {qtdDiarias} diária(s)</p>
                  <p><strong>Subtotal das Diárias:</strong> {safeMoney(subtotal)}</p>
                  <p><strong>Taxa de Limpeza:</strong> {safeMoney(txLimpeza)}</p>
                  {txAdicionais > 0 && (
                    <p><strong>Outras Taxas:</strong> {safeMoney(txAdicionais)}</p>
                  )}
                  {desc > 0 && (
                    <p className="text-red-700"><strong>Descontos:</strong> - {safeMoney(desc)}</p>
                  )}
                  {txCaucao > 0 && (
                    <p><strong>Taxa Caução/Garantia:</strong> {safeMoney(txCaucao)}</p>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-1 mt-0.5">
                  <p className="text-primary-black font-extrabold text-[11px] sm:text-[11.5px]">
                    TOTAL GERAL DA LOCAÇÃO: {safeMoney(totalGeral)} {totalExtenso ? `(${totalExtenso})` : ''}
                  </p>
                </div>
              </div>
            );
          })()}

          {formaPagamentoSimple && (
            <p className="text-[10.5px] sm:text-[11px] text-gray-800 mb-1">
              <strong>Forma de Pagamento Principal:</strong> {safeText(formaPagamentoSimple)}
            </p>
          )}

          {safeMetodos && safeMetodos.length > 0 && (
            <div className="mb-1 pl-1">
              <p className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-0.5">Condições de Pagamento de Preferência:</p>
              {safeMetodos.map((item: any, index: number) => {
                if (typeof item === 'string') {
                  return (
                    <div key={index} className="text-[10px] sm:text-[10.5px] text-gray-800 leading-snug pl-2 my-0.5 relative border-l-2 border-gold/40">
                      • <strong>{safeText(item)}</strong>
                    </div>
                  );
                }
                const subValue = Number(item?.valor) || 0;
                return (
                  <div key={index} className="text-[10px] sm:text-[10.5px] text-gray-800 leading-snug pl-2 my-0.5 relative border-l-2 border-gold/40">
                    • <strong>{safeText(item?.tipo || 'Parcela')}</strong>{subValue > 0 ? `: ${safeMoney(subValue)}` : ''}
                    {item?.vencimento && ` com vencimento em ${safeDate(item.vencimento)}`}
                    {item?.observacao && ` (${safeText(item.observacao)})`}
                  </div>
                );
              })}
            </div>
          )}

          {showDetalhes && (
            <div className="mt-0.5 leading-normal text-[10px] sm:text-[10.5px] text-gray-800 text-justify">
              <p className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-0.5">Detalhes / Condições de Pagamento:</p>
              <div className="text-justify tracking-tight break-words text-gray-800">
                {renderFormattedText(rawDetalhes)}
              </div>
            </div>
          )}

          {showOutras && (
            <div className="mt-0.5 leading-normal text-[10px] sm:text-[10.5px] text-gray-800 text-justify">
              <p className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-0.5">Outras Condições:</p>
              <div className="text-justify tracking-tight break-words text-gray-800">
                {renderFormattedText(rawOutras)}
              </div>
            </div>
          )}
        </>
      )}
    </PdfSection>
  );
};

export function formatarTituloClausula(titulo: string, numero: number): string {
  if (!titulo) return `CLÁUSULA ${numero}ª`;
  
  let cleanTitle = String(titulo).trim();
  cleanTitle = cleanTitle
    .replace(/^(cl[aá]usula\s*\d+[ªºa-z]?\s*[-–—:.]*)/i, '')
    .replace(/^(\d+[ªº.]\s*[-–—:]*)/i, '')
    .replace(/^[-–—:\s]+/, '')
    .trim();
    
  if (!cleanTitle) {
    return `CLÁUSULA ${numero}ª`;
  }
  
  return `CLÁUSULA ${numero}ª — ${cleanTitle.toUpperCase()}`;
}

export const TITULO_OFICIAL_SINAL = "CLÁUSULA – ADIANTAMENTO REEMBOLSÁVEL E DESPESAS INICIAIS";

export const TEXTO_OFICIAL_SINAL = `O(A) COMPRADOR(A) pagará à imobiliária intermediadora **{{valor_sinal}}** ({{valor_sinal_extenso}}), a título de adiantamento, sem natureza de arras confirmatórias ou penitenciais. Concretizado o negócio, esse valor será integralmente abatido do preço total do imóvel.

Caso o negócio não seja concretizado, o valor será devolvido ao(à) COMPRADOR(A), descontadas exclusivamente as despesas efetivamente realizadas e previamente autorizadas pelo(a) COMPRADOR(A) com elaboração do contrato, emissão de certidões negativas e demais documentos necessários à negociação, mediante apresentação de notas fiscais ou recibos e prestação de contas discriminada. O desconto ficará limitado ao valor adiantado, sendo vedada a retenção de valores a título de multa, arras ou comissão de corretagem com fundamento nesta cláusula.`;

export function getTextoClausulaSinal(contract: any = {}): { titulo: string; texto: string } {
  const d = contract?.dados || {};
  const rawClauses = Array.isArray(d?.clausulasSelecionadas)
    ? d.clausulasSelecionadas
    : (Array.isArray(contract?.clausulasSelecionadas) ? contract.clausulasSelecionadas : []);
  
  const custom = rawClauses.find((c: any) => 
    c && (
      c.campoVinculado === 'valorSinalNegocio' ||
      String(c.titulo || '').toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL') ||
      c.id === 'clausula-sinal-oficial'
    )
  );

  const titulo = custom?.titulo ? String(custom.titulo).trim() : TITULO_OFICIAL_SINAL;
  const texto = custom?.texto ? String(custom.texto).trim() : TEXTO_OFICIAL_SINAL;
  return { titulo, texto };
}

export function substituirVariaveisDinamicas(texto: string, contract: any = {}): string {
  if (!texto) return '';
  const d = contract?.dados || {};
  const p = d.proponente || d.locatario || d.comprador || contract.comprador || {};
  const v = d.vendedor || d.proprietario || d.locador || contract.vendedor || {};
  const imov = d.imovel || {};
  
  const nomeCliente = contract.nomeCliente || p.nome || '';
  const cpfCliente = p.cpf || p.cpfCnpj || '';
  const rgCliente = p.rg || '';
  const telefoneCliente = p.telefone || p.whatsapp || '';
  const emailCliente = p.email || '';
  
  const nomeVendedor = contract.nomeVendedor || v.nome || '';
  const cpfVendedor = v.cpf || v.cpfCnpj || '';
  
  const imovelTitulo = imov.titulo || imov.nomeEdificio || contract.imovelTitulo || contract.enderecoImovel || '';
  const imovelCodigo = imov.codigo || contract.imovelCodigo || '';
  const imovelEndereco = imov.endereco || contract.imovelEndereco || contract.enderecoImovel || '';
  const imovelMatricula = imov.matricula || contract.imovelMatricula || '';
  const imovelCri = imov.cri || contract.imovelCri || '';
  
  const valorTotalNum = Number(contract.valor || 0);
  const valorTotalStr = valorTotalNum > 0 ? valorTotalNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  const valorExtensoStr = valorTotalNum > 0 ? valorMonetarioPorExtenso(valorTotalNum).toLowerCase() : '';
  
  const valorSinalNum = Number(
    contract.valorSinal || 
    contract.valorSinalNegocio || 
    d.valorSinal || 
    d.valorSinalNegocio || 
    d.pagamento?.valorSinal || 
    d.pagamento?.valorSinalNegocio || 
    d.termos?.valorSinal || 
    d.termos?.valorSinalNegocio || 
    d.arras?.valorArras || 
    0
  );
  const valorSinalStr = valorSinalNum > 0 ? valorSinalNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  const valorSinalExtensoStr = valorSinalNum > 0 ? valorMonetarioPorExtenso(valorSinalNum).toLowerCase() : '';
  
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const cidade = contract.local || 'Balneário Camboriú - SC';

  return texto
    .replace(/\{\{\s*nome_cliente\s*\}\}/gi, nomeCliente)
    .replace(/\{\s*nome_cliente\s*\}/gi, nomeCliente)
    .replace(/\{\{\s*cpf_cliente\s*\}\}/gi, cpfCliente)
    .replace(/\{\s*cpf_cliente\s*\}/gi, cpfCliente)
    .replace(/\{\{\s*rg_cliente\s*\}\}/gi, rgCliente)
    .replace(/\{\s*rg_cliente\s*\}/gi, rgCliente)
    .replace(/\{\{\s*telefone_cliente\s*\}\}/gi, telefoneCliente)
    .replace(/\{\s*telefone_cliente\s*\}/gi, telefoneCliente)
    .replace(/\{\{\s*email_cliente\s*\}\}/gi, emailCliente)
    .replace(/\{\s*email_cliente\s*\}/gi, emailCliente)
    .replace(/\{\{\s*nome_vendedor\s*\}\}/gi, nomeVendedor)
    .replace(/\{\s*nome_vendedor\s*\}/gi, nomeVendedor)
    .replace(/\{\{\s*cpf_vendedor\s*\}\}/gi, cpfVendedor)
    .replace(/\{\s*cpf_vendedor\s*\}/gi, cpfVendedor)
    .replace(/\{\{\s*imovel_titulo\s*\}\}/gi, imovelTitulo)
    .replace(/\{\s*imovel_titulo\s*\}/gi, imovelTitulo)
    .replace(/\{\{\s*imovel_codigo\s*\}\}/gi, imovelCodigo)
    .replace(/\{\s*imovel_codigo\s*\}/gi, imovelCodigo)
    .replace(/\{\{\s*imovel_endereco\s*\}\}/gi, imovelEndereco)
    .replace(/\{\s*imovel_endereco\s*\}/gi, imovelEndereco)
    .replace(/\{\{\s*imovel_matricula\s*\}\}/gi, imovelMatricula)
    .replace(/\{\s*imovel_matricula\s*\}/gi, imovelMatricula)
    .replace(/\{\{\s*imovel_cri\s*\}\}/gi, imovelCri)
    .replace(/\{\s*imovel_cri\s*\}/gi, imovelCri)
    .replace(/\{\{\s*valor_total\s*\}\}/gi, valorTotalStr)
    .replace(/\{\s*valor_total\s*\}/gi, valorTotalStr)
    .replace(/\{\{\s*valor_extenso\s*\}\}/gi, valorExtensoStr)
    .replace(/\{\s*valor_extenso\s*\}/gi, valorExtensoStr)
    .replace(/\{\{\s*valor_sinal_extenso\s*\}\}/gi, valorSinalExtensoStr)
    .replace(/\{\s*valor_sinal_extenso\s*\}/gi, valorSinalExtensoStr)
    .replace(/\{\{\s*valor_sinal\s*\}\}/gi, valorSinalStr)
    .replace(/\{\s*valor_sinal\s*\}/gi, valorSinalStr)
    .replace(/\{\{\s*data_atual\s*\}\}/gi, dataAtual)
    .replace(/\{\s*data_atual\s*\}/gi, dataAtual)
    .replace(/\{\{\s*cidade\s*\}\}/gi, cidade)
    .replace(/\{\s*cidade\s*\}/gi, cidade);
}

export function splitClauseIntoSegments(texto: string): string[] {
  if (!texto) return [];
  const clean = String(texto).trim();
  if (!clean) return [];

  // 1. Explicit paragraph breaks
  if (clean.includes('\n\n')) {
    const paras = clean.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (paras.length > 1) {
      return paras;
    }
  }

  // 2. Sentences splitting:
  // If text is at least 140 characters with multiple sentences, split cleanly at sentence boundary
  // so text can continue onto the next page naturally without leaving large empty holes on the current page
  if (clean.length > 140) {
    const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9À-Ú])/).map(s => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      const chunks: string[] = [];
      let current = '';
      for (const sent of sentences) {
        if (!current) {
          current = sent;
        } else if ((current + ' ' + sent).length <= 260) {
          current += ' ' + sent;
        } else {
          chunks.push(current);
          current = sent;
        }
      }
      if (current) {
        chunks.push(current);
      }
      if (chunks.length > 1) {
        return chunks;
      }
    }
  }

  // 3. Long single sentence without period breaks (> 280 chars)
  if (clean.length > 280) {
    const subParts = clean.split(/(?<=[;])\s+|(?<=,)\s+(?=(?:sendo|bem como|ficando|facultando-se|mediante|ressalvado|sob pena|devendo)\b)/i).map(s => s.trim()).filter(Boolean);
    if (subParts.length >= 2) {
      const chunks: string[] = [];
      let current = '';
      for (const part of subParts) {
        if (!current) {
          current = part;
        } else if ((current + ' ' + part).length <= 260) {
          current += ' ' + part;
        } else {
          chunks.push(current);
          current = part;
        }
      }
      if (current) chunks.push(current);
      if (chunks.length > 1) return chunks;
    }
  }

  return [clean];
}

export interface PdfClauseSegmentBlockProps {
  titulo?: string;
  texto: string;
  isContinuation?: boolean;
  numClausula?: number;
  sectionTitle?: string;
  contract?: any;
  isDense?: boolean;
  isFirstOnPage?: boolean;
}

export const PdfClauseSegmentBlock: React.FC<PdfClauseSegmentBlockProps> = ({
  titulo,
  texto,
  isContinuation = false,
  numClausula,
  sectionTitle,
  contract = {},
  isDense = false,
  isFirstOnPage = false
}) => {
  const textoProcessado = substituirVariaveisDinamicas(texto, contract);
  const showContinuationNotice = isContinuation && isFirstOnPage;

  return (
    <div className={`clause-item text-justify avoid-break ${isDense ? 'mb-1' : 'mb-1.5'}`}>
      {sectionTitle && sectionTitle.trim() !== "" && (
        <h3 className="section-title text-[11px] font-black uppercase text-black tracking-wider bg-gray-50 border-l-2 border-gold py-0.5 px-1.5 mb-1">
          {sectionTitle}
        </h3>
      )}
      {titulo && (
        <p className="font-bold text-[10.5px] sm:text-[11px] text-black tracking-tight mb-0.5 uppercase">
          {titulo}
        </p>
      )}
      {showContinuationNotice && (
        <p className="text-[9px] font-bold text-gray-500 italic mb-0.5 uppercase tracking-wide">
          {numClausula ? `(Continuação da Cláusula ${numClausula}ª)` : '(Continuação)'}
        </p>
      )}
      <div className="text-gray-800 leading-normal text-justify break-words text-[10px] sm:text-[10.5px]">
        {renderFormattedText(textoProcessado)}
      </div>
    </div>
  );
};

interface PdfClausesBlockProps {
  clausulas: Array<{ id?: string; titulo: string; texto: string }>;
  sectionTitle?: string;
  startIndex?: number;
  contract?: any;
  isDense?: boolean;
}

export const PdfClausesBlock: React.FC<PdfClausesBlockProps> = ({
  clausulas = [],
  sectionTitle,
  startIndex = 1,
  contract = {},
  isDense = false
}) => {
  const safeClauses = Array.isArray(clausulas) ? clausulas : [clausulas].filter(Boolean);
  const filteredClauses = safeClauses.filter(c => c && typeof c === 'object' && c.texto && String(c.texto).trim() !== "");

  if (filteredClauses.length === 0) return null;

  return (
    <div className={`clause-wrapper ${isDense ? 'space-y-1' : 'space-y-1.5'}`}>
      {sectionTitle && sectionTitle.trim() !== "" && (
        <h3 className="section-title text-[11px] font-black uppercase text-black tracking-wider bg-gray-50 border-l-2 border-gold py-0.5 px-1.5 mb-1">
          {sectionTitle}
        </h3>
      )}
      {filteredClauses.map((c, idx) => {
        const numClausula = startIndex + idx;
        const tituloFormatado = formatarTituloClausula(c.titulo, numClausula);
        const textoProcessado = substituirVariaveisDinamicas(c.texto, contract);

        return (
          <div key={c.id || idx} className="clause-item text-justify avoid-break mb-1.5">
            <p className="font-bold text-[10.5px] sm:text-[11px] text-black tracking-tight mb-0.5 uppercase">
              {tituloFormatado}
            </p>
            <div className="text-gray-800 leading-normal text-justify break-words text-[10px] sm:text-[10.5px]">
              {renderFormattedText(textoProcessado)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface PdfSignaturesProps {
  dados: any;
  tipoContrato: string;
  contract: any;
  empresa: any;
  parteAceitante?: any;
  isDense?: boolean;
}

export const PdfSignatures: React.FC<PdfSignaturesProps> = ({
  dados = {},
  tipoContrato = 'proposta',
  contract = {},
  empresa = {},
  parteAceitante,
  isDense = false
}) => {
  const d = dados || {};
  const c = contract || {};
  const emp = empresa || {};
  const ptGap = isDense ? 'pt-2.5' : 'pt-3.5';

  // 1. Identificar Parte Contratante (Comprador / Locatário / Aceitante / Proprietário na Administração)
  let nomeContratante = '';
  let cpfContratante = '';
  let roleContratante = 'PARTE CONTRATANTE';

  if (tipoContrato === 'locacao_temporaria') {
    nomeContratante = d.locatario?.nome || 'LOCATÁRIO';
    cpfContratante = d.locatario?.cpf || d.locatario?.documento || '';
    roleContratante = 'LOCATÁRIO (HÓSPEDE/INQUILINO)';
  } else if (tipoContrato === 'administracao_temporaria') {
    nomeContratante = d.proprietario?.nome || d.vendedor?.nome || c.nomeVendedor || 'PROPRIETÁRIO';
    cpfContratante = d.proprietario?.cpf || d.proprietario?.cpfCnpj || d.vendedor?.cpf || '';
    roleContratante = 'CONTRATANTE (PROPRIETÁRIO)';
  } else if (tipoContrato === 'aceite') {
    nomeContratante = parteAceitante?.nome || d.proponente?.nome || c.nomeCliente || 'PARTE ACEITANTE';
    cpfContratante = parteAceitante?.cpf || d.proponente?.cpf || '';
    roleContratante = 'PARTE ACEITANTE';
  } else if (tipoContrato === 'compra_venda') {
    nomeContratante = c.nomeCliente || d.comprador?.nome || d.proponente?.nome || 'PROMITENTE COMPRADOR';
    cpfContratante = d.comprador?.cpf || d.comprador?.cpfCnpj || d.proponente?.cpf || (c as any).comprador?.documento || '';
    roleContratante = 'PROMITENTE COMPRADOR(A)';
  } else {
    nomeContratante = c.nomeCliente || d.proponente?.nome || d.comprador?.nome || 'COMPRADOR / PROPONENTE';
    cpfContratante = d.proponente?.cpf || d.proponente?.cpfCnpj || d.comprador?.cpf || (c as any).comprador?.documento || '';
    roleContratante = tipoContrato === 'contraproposta' ? 'PROPONENTE COMPRADOR' : 'COMPRADOR / PROPONENTE';
  }

  // 2. Identificar Parte Contratada (Vendedor / Locador / Administradora / Imobiliária)
  let nomeContratada = '';
  let cpfContratada = '';
  let roleContratada = 'PARTE CONTRATADA';

  if (tipoContrato === 'locacao_temporaria') {
    nomeContratada = d.locador?.nome || d.proprietario?.nome || 'LOCADOR';
    cpfContratada = d.locador?.cpf || d.locador?.cpfCnpj || d.locador?.cnpj || '';
    roleContratada = 'LOCADOR (PROPRIETÁRIO)';
  } else if (tipoContrato === 'administracao_temporaria') {
    nomeContratada = emp.razaoSocial || emp.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS';
    cpfContratada = emp.cnpj || '';
    roleContratada = 'CONTRATADA (ADMINISTRADORA)';
  } else if (tipoContrato === 'aceite') {
    nomeContratada = emp.razaoSocial || emp.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS';
    cpfContratada = emp.cnpj || '';
    roleContratada = 'IMOBILIÁRIA INTERMEDIADORA';
  } else if (tipoContrato === 'compra_venda') {
    nomeContratada = c.nomeVendedor || d.vendedor?.nome || d.proprietario?.nome || 'PROMITENTE VENDEDOR';
    cpfContratada = d.vendedor?.cpf || d.vendedor?.cpfCnpj || (c as any).vendedor?.documento || '';
    roleContratada = 'PROMITENTE VENDEDOR(A)';
  } else {
    nomeContratada = c.nomeVendedor || d.vendedor?.nome || d.proprietario?.nome || (parteAceitante?.nome) || 'VENDEDOR / PROPRIETÁRIO';
    cpfContratada = d.vendedor?.cpf || d.vendedor?.cpfCnpj || (parteAceitante?.cpf) || (c as any).vendedor?.documento || '';
    roleContratada = 'VENDEDOR / PROPRIETÁRIO';
  }

  // Cônjuges
  const contratanteSpouse = getSpouseDataPDF(d.proponente || d.comprador || d.locatario, 'comprador', d);
  const contratadaSpouse = getSpouseDataPDF(d.vendedor || d.proprietario || d.locador, 'vendedor', d);

  // Testemunhas
  const t1Nome = d.assinaturas?.testemunha1 || c.dados?.assinaturas?.testemunha1 || '';
  const t1Cpf = d.assinaturas?.cpfTestemunha1 || c.dados?.assinaturas?.cpfTestemunha1 || '';
  const t2Nome = d.assinaturas?.testemunha2 || c.dados?.assinaturas?.testemunha2 || '';
  const t2Cpf = d.assinaturas?.cpfTestemunha2 || c.dados?.assinaturas?.cpfTestemunha2 || '';

  // Intermediadora (Menta Imóveis)
  const showIntermediadora = tipoContrato !== 'administracao_temporaria' && tipoContrato !== 'aceite';

  return (
    <div className={`pdf-signatures grid grid-cols-2 ${isDense ? 'gap-x-8 gap-y-2 mt-1.5' : 'gap-x-10 gap-y-2.5 mt-2'} avoid-break signature-block text-[10.5px] sm:text-[11px]`}>
      {/* 1. PARTE CONTRATANTE */}
      <div className={`flex flex-col justify-end text-center ${ptGap}`}>
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(nomeContratante)}
        </div>
        <div className="pdf-signature-role">{roleContratante}</div>
        <div className="pdf-signature-doc text-[9.5px] text-gray-600 font-medium">
          CPF: {safeText(cpfContratante || 'Não informado')}
        </div>
      </div>

      {/* 2. PARTE CONTRATADA */}
      <div className={`flex flex-col justify-end text-center ${ptGap}`}>
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(nomeContratada)}
        </div>
        <div className="pdf-signature-role">{roleContratada}</div>
        <div className="pdf-signature-doc text-[9.5px] text-gray-600 font-medium">
          {cpfContratada && cpfContratada.length > 14 ? 'CNPJ: ' : 'CPF: '}{safeText(cpfContratada || 'Não informado')}
        </div>
      </div>

      {/* Cônjuges se informados */}
      {contratanteSpouse?.nome && (
        <div className={`flex flex-col justify-end text-center ${ptGap}`}>
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(contratanteSpouse.nome)}
          </div>
          <div className="pdf-signature-role">CÔNJUGE DO CONTRATANTE</div>
          <div className="pdf-signature-doc text-[9.5px] text-gray-600 font-medium">
            CPF: {safeText(contratanteSpouse.cpf || 'Não informado')}
          </div>
        </div>
      )}

      {contratadaSpouse?.nome && (
        <div className={`flex flex-col justify-end text-center ${ptGap}`}>
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(contratadaSpouse.nome)}
          </div>
          <div className="pdf-signature-role">CÔNJUGE DO CONTRATADO</div>
          <div className="pdf-signature-doc text-[9.5px] text-gray-600 font-medium">
            CPF: {safeText(contratadaSpouse.cpf || 'Não informado')}
          </div>
        </div>
      )}

      {/* 3. TESTEMUNHA 1 */}
      <div className={`flex flex-col justify-end text-center ${ptGap}`}>
        <div className="pdf-signature-line text-gray-800 font-bold max-w-full truncate">
          {t1Nome ? safeText(t1Nome) : <span className="opacity-0 select-none">ASSINATURA TESTEMUNHA 1</span>}
        </div>
        <div className="pdf-signature-role">TESTEMUNHA 1</div>
        <div className="pdf-signature-doc text-[9px] text-gray-600 font-medium leading-tight">
          {t1Nome ? `Nome: ${safeText(t1Nome)}` : 'Nome: ____________________________'}
          {t1Cpf ? ` • CPF: ${safeText(t1Cpf)}` : ' • CPF: ___________________'}
        </div>
      </div>

      {/* 4. TESTEMUNHA 2 */}
      <div className={`flex flex-col justify-end text-center ${ptGap}`}>
        <div className="pdf-signature-line text-gray-800 font-bold max-w-full truncate">
          {t2Nome ? safeText(t2Nome) : <span className="opacity-0 select-none">ASSINATURA TESTEMUNHA 2</span>}
        </div>
        <div className="pdf-signature-role">TESTEMUNHA 2</div>
        <div className="pdf-signature-doc text-[9px] text-gray-600 font-medium leading-tight">
          {t2Nome ? `Nome: ${safeText(t2Nome)}` : 'Nome: ____________________________'}
          {t2Cpf ? ` • CPF: ${safeText(t2Cpf)}` : ' • CPF: ___________________'}
        </div>
      </div>

      {/* 5. INTERMEDIADORA (MENTA IMÓVEIS) */}
      {showIntermediadora && (
        <div className={`flex flex-col justify-end text-center col-span-2 max-w-[320px] mx-auto w-full mt-1 ${ptGap}`}>
          <div className="pdf-signature-line text-gray-900 font-bold max-w-full truncate">
            {safeText(emp.razaoSocial || emp.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
          </div>
          <div className="pdf-signature-role">INTERMEDIADORA IMOBILIÁRIA</div>
          <div className="pdf-signature-doc text-[9px] text-gray-500 font-medium">
            {emp.creciPj ? `CRECI PJ: ${safeText(emp.creciPj)}` : ''}
            {emp.cnpj ? ` | CNPJ: ${safeText(emp.cnpj)}` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

interface PdfFooterProps {
  pageNumber: number;
  totalPages?: number;
  empresa: any;
  isCompact?: boolean;
}

export const PdfFooter: React.FC<PdfFooterProps> = ({ pageNumber, totalPages, empresa, isCompact = true }) => {
  const footerCustom = empresa.rodapeContratos || '';
  if (isCompact) {
    return (
      <div className="pdf-footer select-none">
        <div className="max-w-[75%] leading-tight text-left">
          <p className="font-bold text-gray-500 mb-0.5 text-gray-400">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[10.5px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-600 font-extrabold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-3 border-t border-gray-150 flex items-end justify-between text-[10.5px] text-gray-400 font-medium w-full select-none">
      <div className="max-w-[75%] leading-tight">
        <p className="font-bold text-gray-500 mb-0.5">
          {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
        </p>
        <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[10.5px] uppercase tracking-widest opacity-60">
        <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-500 font-bold">
          Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
        </div>
      </div>
    </div>
  );
};

interface ContractA4PreviewProps {
  contract: Contract;
  printRef?: React.RefObject<HTMLDivElement>;
}

const SafeBlockRenderer: React.FC<{ 
  block: { render: (ctx?: { isFirstOnPage?: boolean; pageIndex?: number }) => React.JSX.Element }; 
  index: number;
  context?: { isFirstOnPage?: boolean; pageIndex?: number };
}> = ({ block, index, context }) => {
  try {
    return block.render(context);
  } catch (err) {
    console.warn(`[ContractA4Preview] Erro capturado ao renderizar bloco ${index}:`, err);
    return null;
  }
};

const ContractA4PreviewInner: React.FC<ContractA4PreviewProps> = ({ contract: originalContract, printRef }) => {
  const contract = originalContract as any;
  const { tipoContrato, dados = {} } = contract;
  const { settings } = useSettings();
  const empresa = (settings.empresa || {}) as any;

  const isCompact = tipoContrato !== 'locacao_temporaria';
  const [isDense, setIsDense] = useState(false);

  // HELPER Functions
  const getCleanVal = (val: any): string => (typeof val === 'string' ? val.trim() : '');

  const formatFullAddress = (obj: any): string => {
    if (!obj) return 'Não informado';
    if (typeof obj === 'string') return limparEnderecoDuplicadoSalvo(obj);
    
    const isBuyerObj = obj.compradorEnderecoCompleto || obj.compradorEndereco || obj.compradorLogradouro || obj.compradorBairro || obj.compradorCidade;
    const isSellerObj = obj.vendedorEnderecoCompleto || obj.vendedorEndereco || obj.vendedorLogradouro || obj.vendedorBairro || obj.vendedorCidade;
    
    if (isBuyerObj) {
      return limparEnderecoDuplicadoSalvo(montarEnderecoCompradorPDF(obj, dados));
    }
    if (isSellerObj) {
      return limparEnderecoDuplicadoSalvo(montarEnderecoVendedorPDF(obj, dados));
    }

    const street = obj.endereco || obj.address || obj.street || '';
    const num = obj.numero || obj.number || '';
    const numStr = num ? `Nº ${num}` : '';
    const compl = obj.complemento || obj.complement || '';
    const neighborhood = obj.bairro || obj.district || obj.neighborhood || '';
    const city = obj.cidade || obj.city || '';
    const state = obj.estado || obj.state || '';
    const cep = obj.cep || '';

    const parts = [
      street,
      numStr,
      compl,
      neighborhood,
      city,
      state
    ];

    const cleanParts = parts.map(s => String(s || '').trim()).filter(Boolean);
    if (cleanParts.length === 0) {
      if (typeof obj.enderecoImovel === 'string' && obj.enderecoImovel) {
        return limparEnderecoDuplicadoSalvo(obj.enderecoImovel);
      }
      return 'Não informado';
    }

    let result = removerPartesDuplicadas(cleanParts).join(', ');
    if (cep) {
      result += ` - CEP: ${cep}`;
    }
    return limparEnderecoDuplicadoSalvo(result);
  };

  // Global Watermark & Headers/Footers Renders (Top-level)
  const renderHeader = () => {
    const logoUrl = empresa.logoCabecalhoUrl || '/logo.png';
    const addressLine = [
      empresa.endereco,
      empresa.bairro,
      empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : (empresa.cidade || empresa.estado),
      empresa.cep ? `CEP: ${empresa.cep}` : ''
    ].filter(Boolean).join(' - ');

    return (
      <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2 gap-3 w-full shrink-0">
        {logoUrl && isValidImageUrl(logoUrl) && (
          <img 
            src={logoUrl} 
            alt={safeText(empresa.nome)} 
            className="h-12 w-auto object-contain shrink-0" 
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-grow text-right text-[10px] text-gray-600 font-semibold uppercase tracking-wider leading-snug">
          <h2 className="text-[14px] font-display font-black text-black uppercase tracking-[0.08em] mb-0.5">
            {safeText(empresa.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
          </h2>
          {empresa.razaoSocial && <p className="mb-0.5 text-gray-700 font-bold">{safeText(empresa.razaoSocial)}</p>}
          <p className="mb-0.5 text-gray-500">
            {empresa.cnpj ? `CNPJ: ${safeText(empresa.cnpj)}` : ''}
            {empresa.creciPj ? ` | CRECI PJ: ${safeText(empresa.creciPj)}` : ''}
            {addressLine ? ` | ${addressLine}` : ''}
          </p>
          {(empresa.telefone || empresa.email) && (
            <p className="text-gray-500">
              {empresa.telefone ? `Tel: ${safeText(empresa.telefone)}` : ''}
              {empresa.email ? ` | ${safeText(empresa.email)}` : ''}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderCompactHeader = renderHeader;

  const renderFooter = (pageNumber: number, totalPages?: number) => {
    const footerCustom = empresa.rodapeContratos || '';
    return (
      <div className="mt-auto pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 font-medium w-full select-none shrink-0">
        <div className="max-w-[75%] leading-tight text-left">
          <p className="font-bold text-gray-600 mb-0.5">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p className="text-gray-400">{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[9px] uppercase tracking-widest">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-200 text-gray-600 font-extrabold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
        </div>
      </div>
    );
  };

  const renderCompactFooter = renderFooter;

  const normalizarTextoComparacao = (texto: any): string => {
    return String(texto || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  };

  // Resolve Duplicate Text between Payment Details and Other Conditions
  const rawDetalhes = getCleanVal(
    dados.detalhesPagamento ||
    dados.pagamento?.detalhesPagamento ||
    dados.termos?.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.pagamento?.detalhesPagamentoContraproposta ||
    dados.termos?.detalhesPagamentoContraproposta ||
    contract.detalhesPagamento ||
    contract.detalhesPagamentoContraproposta ||
    ''
  );

  const rawOutras = getCleanVal(
    dados.outrasCondicoes ||
    dados.pagamento?.outrasCondicoes ||
    dados.termos?.outrasCondicoes ||
    contract.outrasCondicoes ||
    ''
  );

  let showDetalhes = false;
  let showOutras = false;

  const detalhesNormalizado = normalizarTextoComparacao(rawDetalhes);
  const outrasNormalizado = normalizarTextoComparacao(rawOutras);

  if (rawDetalhes) {
    showDetalhes = true;
    if (rawOutras && outrasNormalizado !== detalhesNormalizado) {
      showOutras = true;
    }
  } else if (rawOutras) {
    showOutras = true;
  }

  // Text height estimator (in mm)
  const estimateHeight = (text: string, divisor: number = 75, mmPerLine: number = 3.8): number => {
    if (!text) return 0;
    const lines = text.split('\n');
    let totalLines = 0;
    lines.forEach(line => {
      totalLines += Math.max(1, Math.ceil(line.length / divisor));
    });
    return totalLines * mmPerLine;
  };

  // Dynamic Blocks Compiler based on Contract Types
  const buildContractPages = (isDenseMode: boolean) => {
    const blocks: { 
      render: (ctx?: { isFirstOnPage?: boolean; pageIndex?: number }) => React.JSX.Element; 
      estimatedHeight: number; 
      isSignature?: boolean 
    }[] = [];

    // estimatedHeight is now only a lightweight change-detector for the
    // measurement effect; real layout uses measured DOM heights.
    const addBlock = (
      elementOrFn: React.JSX.Element | ((ctx?: { isFirstOnPage?: boolean; pageIndex?: number }) => React.JSX.Element), 
      height: number, 
      isSignature?: boolean
    ) => {
      const renderFn = typeof elementOrFn === 'function' ? elementOrFn : () => elementOrFn;
      blocks.push({ render: renderFn, estimatedHeight: height, isSignature });
    };

    // Helper to register modular clauses with continuous flow and intelligent continuation splitting
    const addClauseBlocks = (
      clausesList: Array<{ id?: string; titulo: string; texto: string }>,
      mainSectionTitle: string,
      baseStartIndex = 1
    ) => {
      if (!clausesList || clausesList.length === 0) return;

      clausesList.forEach((c: any, idx: number) => {
        if (!c || !c.texto || !String(c.texto).trim()) return;

        const numClausula = baseStartIndex + idx;
        const isFirstClause = idx === 0;
        const sectionTitleForThis = isFirstClause ? mainSectionTitle : "";
        const segments = splitClauseIntoSegments(c.texto);

        if (segments.length <= 1) {
          addBlock(
            (ctx) => (
              <PdfClauseSegmentBlock
                titulo={formatarTituloClausula(c.titulo, numClausula)}
                texto={segments[0] || c.texto}
                isContinuation={false}
                numClausula={numClausula}
                sectionTitle={sectionTitleForThis}
                contract={contract}
                isDense={isDenseMode}
                isFirstOnPage={ctx?.isFirstOnPage}
              />
            ),
            estimateHeight(c.texto) + (sectionTitleForThis ? 14 : 8)
          );
        } else {
          segments.forEach((seg, sIdx) => {
            const isFirstSegment = sIdx === 0;
            addBlock(
              (ctx) => (
                <PdfClauseSegmentBlock
                  titulo={isFirstSegment ? formatarTituloClausula(c.titulo, numClausula) : undefined}
                  texto={seg}
                  isContinuation={!isFirstSegment}
                  numClausula={numClausula}
                  sectionTitle={isFirstSegment ? sectionTitleForThis : undefined}
                  contract={contract}
                  isDense={isDenseMode}
                  isFirstOnPage={ctx?.isFirstOnPage}
                />
              ),
              estimateHeight(seg) + (isFirstSegment ? (sectionTitleForThis ? 14 : 8) : 4)
            );
          });
        }
      });
    };

    // Helper to register custom clause text boxes with natural paragraph flow
    const addCustomClauseBlocks = (
      customText: string,
      sectionTitle = "Cláusulas Adicionais"
    ) => {
      if (!customText || !customText.trim()) return;
      const paragraphs = customText.split(/\n\n+/).filter(p => p.trim());
      if (paragraphs.length <= 1) {
        addBlock(
          <PdfSection title={sectionTitle} isDense={isDenseMode}>
            <div className="text-justify text-[10px] sm:text-[10.5px] text-gray-800 whitespace-pre-wrap leading-normal">
              {renderFormattedText(customText)}
            </div>
          </PdfSection>,
          14 + estimateHeight(customText)
        );
      } else {
        paragraphs.forEach((para, pIdx) => {
          addBlock(
            (ctx) => (
              <div className={`clause-item text-justify avoid-break ${isDenseMode ? 'mb-1' : 'mb-1.5'}`}>
                {pIdx === 0 && (
                  <h3 className="section-title text-[11px] font-black uppercase text-black tracking-wider bg-gray-50 border-l-2 border-gold py-0.5 px-1.5 mb-1">
                    {sectionTitle}
                  </h3>
                )}
                {pIdx > 0 && ctx?.isFirstOnPage && (
                  <p className="text-[9px] font-bold text-gray-500 italic mb-0.5 tracking-tight uppercase">
                    (Continuação das Cláusulas Adicionais)
                  </p>
                )}
                <div className="text-gray-800 leading-normal text-justify break-words text-[10px] sm:text-[10.5px]">
                  {renderFormattedText(para)}
                </div>
              </div>
            ),
            (pIdx === 0 ? 14 : 4) + estimateHeight(para)
          );
        });
      }
    };

    // Dynamic blocks depending on Contract Types
    if (tipoContrato === 'proposta' || tipoContrato === 'contraproposta') {
      const isContra = tipoContrato === 'contraproposta';
      const p = dados.proponente || {};
      const comp = dados.comprador || {};
      const vend = dados.vendedor || {};
      const imov = dados.imovel || {};

      const contraParteAceitante = getParteAceitante({
        ...dados,
        ...contract,
        parteAceitanteTipo: "vendedor",
        tipoDocumento: "contraproposta"
      });

      const compradorSpouse = getSpouseDataPDF(p, 'comprador', dados);
      const vendedorSpouse = getSpouseDataPDF(contraParteAceitante, 'vendedor', dados);

      const rawMetodos = dados.pagamento?.metodos || dados.termos?.metodos || (contract as any).formasPagamento || [];
      const metodosDePagamento = Array.isArray(rawMetodos)
        ? rawMetodos
        : (typeof rawMetodos === 'string' && rawMetodos.trim() ? rawMetodos.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

      // 1. Title Block
      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[15px] mb-2' : 'text-[17px] mb-2.5'}`}>
          {isContra ? "CONTRAPROPOSTA DE COMPRA E VENDA" : "PROPOSTA DE COMPRA E VENDA DE IMÓVEL"}
        </div>,
        10
      );

      // 2. Proponente Block
      const firstSectionHeight = compradorSpouse.nome || vendedorSpouse.nome ? 52 : 32;
      addBlock(
        <PdfSection title={isContra ? "I - Proprietário Vendedor" : "I - Proponente Comprador"} isDense={isDenseMode}>
          {isContra ? (
            <PdfFieldGrid isDense={isDenseMode}>
              <p><strong>Nome:</strong> {safeText(contraParteAceitante.nome || "Não informado")}</p>
              <p><strong>CPF:</strong> {safeText(contraParteAceitante.cpf || "Não informado")}</p>
              <p><strong>RG:</strong> {safeText(contraParteAceitante.rg || "Não informado")}</p>
              <p><strong>Estado Civil:</strong> {safeText(contraParteAceitante.estadoCivil || "Não informado")}</p>
              <p><strong>Profissão:</strong> {safeText(contraParteAceitante.profissao || "Não informado")}</p>
              <p><strong>Telefone:</strong> {safeText(contraParteAceitante.telefone || "Não informado")}</p>
              <p className="col-span-2"><strong>E-mail:</strong> {safeText(contraParteAceitante.email || "Não informado")}</p>
              <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(contraParteAceitante)}</p>
              
              {vendedorSpouse.nome && (
                <>
                  <p><strong>Cônjuge:</strong> {vendedorSpouse.nome}</p>
                  <p><strong>CPF Cônjuge:</strong> {vendedorSpouse.cpf || "Não informado"}</p>
                  {vendedorSpouse.rg && <p><strong>RG Cônjuge:</strong> {vendedorSpouse.rg}</p>}
                  {vendedorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {vendedorSpouse.profissao}</p>}
                  {vendedorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {vendedorSpouse.telefone}</p>}
                  {vendedorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {vendedorSpouse.email}</p>}
                  {vendedorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {vendedorSpouse.estadoCivil}</p>}
                  {vendedorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {vendedorSpouse.endereco}</p>}
                </>
              )}
            </PdfFieldGrid>
          ) : (
            <PdfFieldGrid isDense={isDenseMode}>
              <p><strong>Nome:</strong> {safeText(p.nome || contract.nomeCliente || "Não informado")}</p>
              <p><strong>CPF:</strong> {safeText(p.cpf || "Não informado")}</p>
              <p><strong>RG:</strong> {safeText(p.rg || "Não informado")}</p>
              <p><strong>Estado Civil:</strong> {safeText(p.estadoCivil || "Não informado")}</p>
              <p><strong>Profissão:</strong> {safeText(p.profissao || "Não informado")}</p>
              <p><strong>Telefone:</strong> {safeText(p.telefone || "Não informado")}</p>
              <p className="col-span-2"><strong>E-mail:</strong> {safeText(p.email || 'Não informado')}</p>
              <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(p)}</p>
              
              {compradorSpouse.nome && (
                <>
                  <p><strong>Cônjuge:</strong> {compradorSpouse.nome}</p>
                  <p><strong>CPF Cônjuge:</strong> {compradorSpouse.cpf || "Não informado"}</p>
                  {compradorSpouse.rg && <p><strong>RG Cônjuge:</strong> {compradorSpouse.rg}</p>}
                  {compradorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {compradorSpouse.profissao}</p>}
                  {compradorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {compradorSpouse.telefone}</p>}
                  {compradorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {compradorSpouse.email}</p>}
                  {compradorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {compradorSpouse.estadoCivil}</p>}
                  {compradorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {compradorSpouse.endereco}</p>}
                </>
              )}
            </PdfFieldGrid>
          )}
        </PdfSection>,
        firstSectionHeight
      );

      // 3. Comprador details block (only if isContra)
      if (isContra) {
        const compSpouse = getSpouseDataPDF(comp || (contract as any).comprador, 'comprador', dados);
        addBlock(
          <PdfSection title="II - Proponente Comprador" isDense={isDenseMode}>
            <PdfFieldGrid isDense={isDenseMode}>
              <p><strong>Nome:</strong> {safeText(comp.nome || contract.nomeCliente || "Não informado")}</p>
              <p><strong>CPF/CNPJ:</strong> {safeText(comp.cpfCnpj || comp.cpf || (contract as any).comprador?.documento || "Não informado")}</p>
              <p><strong>RG:</strong> {safeText(comp.rg || (contract as any).comprador?.rg || "Não informado")}</p>
              <p><strong>Estado Civil:</strong> {safeText(comp.estadoCivil || (contract as any).comprador?.estadoCivil || "Não informado")}</p>
              <p><strong>Profissão:</strong> {safeText(comp.profissao || (contract as any).comprador?.profissao || "Não informado")}</p>
              <p><strong>Telefone:</strong> {safeText(comp.telefone || (contract as any).comprador?.telefone || "Não informado")}</p>
              <p className="col-span-2"><strong>E-mail:</strong> {safeText(comp.email || (contract as any).comprador?.email || "Não informado")}</p>
              <p className="col-span-2"><strong>Endereço residencial:</strong> {formatFullAddress(comp || (contract as any).comprador)}</p>
              
              {compSpouse.nome && (
                <>
                  <p><strong>Cônjuge do Comprador:</strong> {compSpouse.nome}</p>
                  <p><strong>CPF Cônjuge:</strong> {compSpouse.cpf || "Não informado"}</p>
                  {compSpouse.rg && <p><strong>RG Cônjuge:</strong> {compSpouse.rg}</p>}
                  {compSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {compSpouse.profissao}</p>}
                  {compSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {compSpouse.telefone}</p>}
                  {compSpouse.email && <p><strong>E-mail Cônjuge:</strong> {compSpouse.email}</p>}
                  {compSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {compSpouse.estadoCivil}</p>}
                  {compSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {compSpouse.endereco}</p>}
                </>
              )}
            </PdfFieldGrid>
          </PdfSection>,
          compSpouse.nome ? 52 : 32
        );
      }

      // 4. Imovel Block
      addBlock(
        <PdfSection title={isContra ? "III - Identificação do Imóvel" : "II - Identificação do Imóvel"} isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
          <p className="mt-1 text-justify text-[10px] sm:text-[10.5px] italic text-gray-500 leading-normal">
            O imóvel objeto desta {isContra ? 'contraproposta' : 'proposta'} é aceito pelo proponente nas condições físicas em que se encontra, declarando ter vistoriado o mesmo.
          </p>
        </PdfSection>,
        32
      );

      // 5. Pagamento Block
      const totalValor =
        parseValorNum(dados.pagamento?.valorTotal) ||
        parseValorNum(dados.pagamento?.valorTotalNegociado) ||
        parseValorNum(dados.termos?.valorTotal) ||
        parseValorNum(dados.termos?.valorTotalNegociado) ||
        parseValorNum(dados.valorTotalNegociado) ||
        parseValorNum(dados.valorNegociado) ||
        parseValorNum(dados.valorTotal) ||
        parseValorNum(dados.valorProposta) ||
        parseValorNum(dados.valor) ||
        parseValorNum(contract.valorTotalNegociado) ||
        parseValorNum(contract.valorContrato) ||
        parseValorNum(contract.valor) ||
        0;
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={totalValor} metodosDePagamento={metodosDePagamento} contract={contract} isDense={isDenseMode} />,
        25 + ((Array.isArray(metodosDePagamento) ? metodosDePagamento.length : 1) * 3.8) + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause (Official Automatic Clause)
      const vSinal = parseValorNum(dados.valorSinal || contract.valorSinal || contract.valorSinalNegocio || dados.valorSinalNegocio || dados.pagamento?.valorSinal || dados.pagamento?.valorSinalNegocio || dados.termos?.valorSinal || dados.termos?.valorSinalNegocio || dados.arras?.valorArras || 0);
      if (vSinal > 0) {
        const sinalInfo = getTextoClausulaSinal(contract);
        const processedSinalText = substituirVariaveisDinamicas(sinalInfo.texto, contract);
        const sinalParas = processedSinalText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        addBlock(
          <PdfSection title={sinalInfo.titulo} isDense={isDenseMode}>
            <div className="space-y-1.5 text-justify text-[10.5px] sm:text-[11px] text-gray-800 leading-normal">
              {sinalParas.map((para, pIdx) => (
                <div key={pIdx} className="break-words">
                  {renderFormattedText(para)}
                </div>
              ))}
            </div>
          </PdfSection>,
          14 + estimateHeight(processedSinalText)
        );
      }

      // 6. Selected Clauses (Continuous Flow & Pagination)
      const rawListClauses = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listClauses = rawListClauses.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false' &&
          !(vSinal > 0 && (c.campoVinculado === 'valorSinalNegocio' || String(c.titulo || '').toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL')))
      );
      if (listClauses.length > 0) {
        const titleClausesGerais = isContra ? "V - Cláusulas e Condições Gerais" : "Cláusulas e Condições Gerais";
        addClauseBlocks(listClauses, titleClausesGerais, 1);
      }

      // 6.5. Cláusulas Adicionais / Personalizadas
      const customClausulasText = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClause = 
          textosIguaisPDF(customClausulasText, rawDetalhes) || 
          textosIguaisPDF(customClausulasText, rawOutras);
      if (customClausulasText && !isDuplicateCustomClause) {
        addCustomClauseBlocks(customClausulasText, isContra ? "VI - Cláusulas Adicionais" : "Cláusulas Adicionais");
      }

      // 7. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa, contraParteAceitante);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={contraParteAceitante} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );

    } else if (tipoContrato === 'administracao_temporaria') {
      const p = dados.proprietario || dados.vendedor || (contract as any).vendedor || {};
      const imov = dados.imovel || {};
      const adminTerms = dados.administracao || {};
      const proprietarioSpouse = getSpouseDataPDF(p, 'vendedor', dados);

      // 1. Title Block
      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[14px] mb-2' : 'text-[16px] mb-2.5'}`}>
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ADMINISTRAÇÃO TEMPORÁRIA DE IMÓVEL
        </div>,
        12
      );

      // 2. Intro Text
      addBlock(
        <p className="text-justify indent-6 text-[10px] sm:text-[10.5px] text-gray-800 mt-1 mb-1.5 leading-normal">
          Pelo presente instrumento particular, de um lado o <strong>CONTRATANTE</strong> (Proprietário do Imóvel), qualificado no item I, e de outro lado a <strong>CONTRATADA</strong> (Imobiliária Administradora), qualificada no item II, têm entre si justo e acordado o presente Contrato de Prestação de Serviços de Administração Temporária, regendo-se pelas cláusulas e condições a seguir estipuladas.
        </p>,
        10
      );

      // 3. Contratante (Proprietário + Cônjuge)
      addBlock(
        <PdfSection title="I - Contratante (Proprietário do Imóvel)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(contract.nomeVendedor || p.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(p.cpf || p.cpfCnpj || p.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(p.rg || p.rgIe || "---")}</p>
            <p><strong>Nacionalidade:</strong> {safeText(p.nacionalidade || "Brasileiro(a)")}</p>
            <p><strong>Estado Civil:</strong> {safeText(p.estadoCivil || "Solteiro(a)")}</p>
            <p><strong>Profissão:</strong> {safeText(p.profissao || "Não informada")}</p>
            <p><strong>Telefone/WhatsApp:</strong> {safeText(p.whatsapp || p.telefone || p.celular || "---")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(p.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço Completo:</strong> {formatFullAddress(p)}</p>
            
            {proprietarioSpouse.nome && (
              <>
                <p className="col-span-2 border-t border-gray-150 pt-1 font-bold text-gray-700">Dados do Cônjuge:</p>
                <p><strong>Nome Cônjuge:</strong> {proprietarioSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {proprietarioSpouse.cpf || "Não informado"}</p>
                {proprietarioSpouse.rg && <p><strong>RG Cônjuge:</strong> {proprietarioSpouse.rg}</p>}
                {proprietarioSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {proprietarioSpouse.profissao}</p>}
                {proprietarioSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {proprietarioSpouse.telefone}</p>}
                {proprietarioSpouse.email && <p><strong>E-mail Cônjuge:</strong> {proprietarioSpouse.email}</p>}
                {proprietarioSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {proprietarioSpouse.estadoCivil}</p>}
                {proprietarioSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {proprietarioSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        proprietarioSpouse.nome ? 44 : 26
      );

      // 4. Contratada (Imobiliária)
      addBlock(
        <PdfSection title="II - Contratada (Imobiliária Administradora)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p className="col-span-2"><strong>Razão Social / Nome:</strong> {safeText(empresa.razaoSocial || empresa.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS")}</p>
            <p><strong>CNPJ:</strong> {safeText(empresa.cnpj || "Não informado")}</p>
            <p><strong>CRECI PJ:</strong> {safeText(empresa.creciPj || "Não informado")}</p>
            <p><strong>Telefone:</strong> {safeText(empresa.telefone || "Não informado")}</p>
            <p><strong>E-mail:</strong> {safeText(empresa.email || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {safeText(empresa.endereco || "Não informado")}</p>
            {contract.corretorResponsavel && (
              <p className="col-span-2"><strong>Corretor / Gestor Responsável:</strong> {safeText(contract.corretorResponsavel)}</p>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        22
      );

      // 5. Imóvel
      addBlock(
        <PdfSection title="III - Identificação e Descrição do Imóvel" isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        28
      );

      // 6. Condições Comerciais e Remuneração
      const taxaPercentual = adminTerms.taxaAdministracaoPercentual ?? dados.taxaAdministracaoPercentual ?? 20;
      const taxaValor = adminTerms.taxaAdministracaoValor ?? dados.taxaAdministracaoValor ?? 0;
      const prazoRepasse = adminTerms.prazoRepasseDias ?? dados.prazoRepasseDias ?? 5;
      const prestacaoContas = adminTerms.prestacaoContasPeriodo || dados.prestacaoContasPeriodo || "Mensal, até o 10º dia do mês subsequente ao término de cada locação";
      const vigenciaMeses = adminTerms.vigenciaMeses || dados.vigenciaMeses || 12;
      const dadosBancarios = adminTerms.dadosBancariosRepasse || dados.dadosBancariosRepasse || p.dadosBancarios || "Não informado";
      const chavePix = adminTerms.chavePixRepasse || dados.chavePixRepasse || p.chavePix || "";

      addBlock(
        <PdfSection title="IV - Condições Comerciais e Remuneração da Administração" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Taxa de Administração:</strong> {taxaPercentual}% sobre o valor bruto das locações{taxaValor > 0 ? ` (Mínimo: ${safeMoney(taxaValor)})` : ''}</p>
            <p><strong>Prazo para Repasse:</strong> Até {prazoRepasse} dia(s) útil(eis) após recebimento</p>
            <p className="col-span-2"><strong>Prestação de Contas:</strong> {safeText(prestacaoContas)}</p>
            <p><strong>Vigência do Contrato:</strong> {vigenciaMeses} meses (renovável automaticamente)</p>
            <p><strong>Chave PIX para Repasse:</strong> {safeText(chavePix || "Não informada")}</p>
            <p className="col-span-2"><strong>Dados Bancários para Depósito:</strong> {safeText(dadosBancarios)}</p>
          </PdfFieldGrid>
        </PdfSection>,
        24
      );

      // 7. Cláusulas Contratuais Selecionadas (Continuous Flow)
      const rawListClausesAdmin = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listClausesAdmin = rawListClausesAdmin.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false'
      );
      if (listClausesAdmin.length > 0) {
        addClauseBlocks(listClausesAdmin, "V - Cláusulas e Condições da Administração", 1);
      }

      // 8. Cláusulas Adicionais / Personalizadas
      const customClausulasTextAdmin = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      if (customClausulasTextAdmin) {
        addCustomClauseBlocks(customClausulasTextAdmin, "Cláusulas Adicionais");
      }

      // 9. Signatures Block
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú/SC')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );

    } else if (tipoContrato === 'arras_confirmatorios') {
      const comp = dados.proponente || {};
      const vend = dados.vendedor || (contract as any).vendedor || {};
      const arr = dados.arras || {};
      const imov = dados.imovel || {};

      const compradorSpouse = getSpouseDataPDF(comp, 'comprador', dados);
      const vendedorSpouse = getSpouseDataPDF(vend, 'vendedor', dados);

      // 1. Title
      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[14px] mb-2' : 'text-[16px] mb-2.5'}`}>
          CONTRATO DE ARRAS CONFIRMATÓRIAS E COMPROMISSO DE COMPRA E VENDA
        </div>,
        12
      );

      // 2. Comprador
      addBlock(
        <PdfSection title="I - Comprador / Proponente" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Nome:</strong> {safeText(contract.nomeCliente || comp.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(comp.cpf || comp.cpfCnpj || (contract as any).comprador?.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(comp.rg || (contract as any).comprador?.rg || "---")}</p>
            <p><strong>Estado Civil:</strong> {safeText(comp.estadoCivil || (contract as any).comprador?.estadoCivil || "---")}</p>
            <p><strong>Profissão:</strong> {safeText(comp.profissao || (contract as any).comprador?.profissao || "---")}</p>
            <p><strong>Telefone:</strong> {safeText(comp.telefone || (contract as any).comprador?.telefone || "---")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(comp.email || (contract as any).comprador?.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(comp || (contract as any).comprador)}</p>
            
            {compradorSpouse.nome && (
              <>
                <p><strong>Cônjuge Comprador:</strong> {compradorSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {compradorSpouse.cpf || "Não informado"}</p>
                {compradorSpouse.rg && <p><strong>RG Cônjuge:</strong> {compradorSpouse.rg}</p>}
                {compradorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {compradorSpouse.profissao}</p>}
                {compradorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {compradorSpouse.telefone}</p>}
                {compradorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {compradorSpouse.email}</p>}
                {compradorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {compradorSpouse.estadoCivil}</p>}
                {compradorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {compradorSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        compradorSpouse.nome ? 34 : 20
      );

      // 3. Vendedor
      addBlock(
        <PdfSection title="II - Vendedor / Proprietário" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Nome:</strong> {safeText(contract.nomeVendedor || vend.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(vend.cpf || vend.cpfCnpj || (contract as any).vendedor?.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(vend.rg || (contract as any).vendedor?.rg || "---")}</p>
            <p><strong>Estado Civil:</strong> {safeText(vend.estadoCivil || (contract as any).vendedor?.estadoCivil || "---")}</p>
            <p><strong>Profissão:</strong> {safeText(vend.profissao || (contract as any).vendedor?.profissao || "---")}</p>
            <p><strong>Telefone:</strong> {safeText(vend.telefone || (contract as any).vendedor?.telefone || "---")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(vend.email || (contract as any).vendedor?.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(vend || (contract as any).vendedor)}</p>
            
            {vendedorSpouse.nome && (
              <>
                <p><strong>Cônjuge Vendedor:</strong> {vendedorSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {vendedorSpouse.cpf || "Não informado"}</p>
                {vendedorSpouse.rg && <p><strong>RG Cônjuge:</strong> {vendedorSpouse.rg}</p>}
                {vendedorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {vendedorSpouse.profissao}</p>}
                {vendedorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {vendedorSpouse.telefone}</p>}
                {vendedorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {vendedorSpouse.email}</p>}
                {vendedorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {vendedorSpouse.estadoCivil}</p>}
                {vendedorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {vendedorSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        vendedorSpouse.nome ? 52 : 32
      );

      // 4. Imovel
      addBlock(
        <PdfSection title="III - Identificação do Imóvel" isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        28
      );

      // 5. Arras e Condicoes
      const valorTotal =
        parseValorNum(arr.valorTotalNegocio) ||
        parseValorNum(arr.valorTotalNegociado) ||
        parseValorNum(arr.valorTotal) ||
        parseValorNum(dados.valorTotalNegociado) ||
        parseValorNum(dados.valorNegociado) ||
        parseValorNum(dados.valorTotal) ||
        parseValorNum(contract.valorTotalNegociado) ||
        parseValorNum(contract.valorContrato) ||
        0;
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={valorTotal} contract={contract} isDense={isDenseMode} />,
        28 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause (Official Automatic Clause)
      const vSinalArras = parseValorNum(dados.valorSinal || contract.valorSinal || contract.valorSinalNegocio || dados.valorSinalNegocio || dados.pagamento?.valorSinal || dados.pagamento?.valorSinalNegocio || dados.termos?.valorSinal || dados.termos?.valorSinalNegocio || dados.arras?.valorArras || 0);
      if (vSinalArras > 0) {
        const sinalInfo = getTextoClausulaSinal(contract);
        const processedSinalText = substituirVariaveisDinamicas(sinalInfo.texto, contract);
        const sinalParas = processedSinalText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        addBlock(
          <PdfSection title={sinalInfo.titulo} isDense={isDenseMode}>
            <div className="space-y-1.5 text-justify text-[10.5px] sm:text-[11px] text-gray-800 leading-normal">
              {sinalParas.map((para, pIdx) => (
                <div key={pIdx} className="break-words">
                  {renderFormattedText(para)}
                </div>
              ))}
            </div>
          </PdfSection>,
          14 + estimateHeight(processedSinalText)
        );
      }

      // 6. Selected Clauses (Continuous Flow & Pagination)
      const rawListClausesArras = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listClausesArras = rawListClausesArras.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false' &&
          !(vSinalArras > 0 && (c.campoVinculado === 'valorSinalNegocio' || String(c.titulo || '').toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL')))
      );
      if (listClausesArras.length > 0) {
        addClauseBlocks(listClausesArras, "Cláusulas e Condições Gerais", 1);
      }

      // 6.5. Cláusulas Adicionais / Personalizadas
      const customClausulasTextArras = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClauseArras = 
        textosIguaisPDF(customClausulasTextArras, rawDetalhes) || 
        textosIguaisPDF(customClausulasTextArras, rawOutras);
      if (customClausulasTextArras && !isDuplicateCustomClauseArras) {
        addCustomClauseBlocks(customClausulasTextArras, "Cláusulas Adicionais");
      }

      // 7. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );

    } else if (tipoContrato === 'locacao_temporaria') {
      const l = dados.locador || {};
      const t = dados.locatario || {};
      const imov = dados.imovel || {};
      const p = dados.prazo || {};
      const v = dados.valores || {};
      const r = dados.regras || {};

      const percComissao = v.percentualComissaoImobiliaria ?? 20;
      const valorComissao = v.valorComissaoImobiliaria ?? ((Number(v.valorTotalLocacao) || 0) * percComissao / 100);
      const valorRepasse = v.valorRepassadoProprietario ?? v.valorRepasseLocador ?? ((Number(v.valorTotalLocacao) || 0) - valorComissao);

      // 1. Title Block
      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[14px] mb-2' : 'text-[16px] mb-2.5'}`}>
          CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL
        </div>,
        10
      );

      // 2. Intro Text
      addBlock(
        <p className="text-justify indent-6 text-[10px] sm:text-[10.5px] text-gray-800 mt-1 mb-1.5 leading-normal">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>,
        10
      );

      // 3. Locador Block
      const locadorSpouse = getSpouseDataPDF(l, 'locador', dados);
      addBlock(
        <PdfSection title="I - Dados do Locador (Proprietário)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p className="col-span-2"><strong>Nome/Razão Social:</strong> {safeText(l.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(l.cpfCnpj || l.cpf || l.cnpj)}</p>
            <p><strong>RG/IE:</strong> {safeText(l.rgIe || l.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(l.telefone || l.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(l.email)}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(l)}</p>
            <p className="col-span-2"><strong>Dados Bancários:</strong> {safeText(l.dadosBancarios || l.banco || 'Não informado')}</p>
            
            {locadorSpouse.nome && (
              <>
                <p><strong>Cônjuge:</strong> {locadorSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {locadorSpouse.cpf || "Não informado"}</p>
                {locadorSpouse.rg && <p><strong>RG Cônjuge:</strong> {locadorSpouse.rg}</p>}
                {locadorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {locadorSpouse.profissao}</p>}
                {locadorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {locadorSpouse.telefone}</p>}
                {locadorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {locadorSpouse.email}</p>}
                {locadorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {locadorSpouse.estadoCivil}</p>}
                {locadorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {locadorSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        locadorSpouse.nome ? 34 : 20
      );

      // 4. Locatario Block
      const locatarioSpouse = getSpouseDataPDF(t, 'locatario', dados);
      addBlock(
        <PdfSection title="II - Dados do Locatário (Hóspede/Inquilino)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(t.nome)}</p>
            <p><strong>CPF:</strong> {safeText(t.cpf || t.documento)}</p>
            <p><strong>RG:</strong> {safeText(t.rg)}</p>
            <p><strong>Nacionalidade:</strong> {safeText(t.nacionalidade || 'Brasileiro(a)')}</p>
            <p><strong>Estado Civil:</strong> {safeText(t.estadoCivil || 'Não informado')}</p>
            <p><strong>Profissão:</strong> {safeText(t.profissao || 'Não informado')}</p>
            {t.dataNascimento && <p><strong>Data de Nascimento:</strong> {safeDate(t.dataNascimento)}</p>}
            <p><strong>Telefone/WhatsApp:</strong> {safeText(t.whatsapp || t.telefone || t.celular || t.phone)}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(t.email)}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {formatFullAddress(t)}</p>
            
            {locatarioSpouse.nome && (
              <>
                <p><strong>Cônjuge:</strong> {locatarioSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {locatarioSpouse.cpf || "Não informado"}</p>
                {locatarioSpouse.rg && <p><strong>RG Cônjuge:</strong> {locatarioSpouse.rg}</p>}
                {locatarioSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {locatarioSpouse.profissao}</p>}
                {locatarioSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {locatarioSpouse.telefone}</p>}
                {locatarioSpouse.email && <p><strong>E-mail Cônjuge:</strong> {locatarioSpouse.email}</p>}
                {locatarioSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {locatarioSpouse.estadoCivil}</p>}
                {locatarioSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {locatarioSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        locatarioSpouse.nome ? 36 : 22
      );

      // 4.1. Acompanhantes Autorizados (Seção II.1)
      const acompanhantesList = dados.acompanhantes || dados.locatario?.acompanhantes || contract.acompanhantes || contract.dados?.acompanhantes || [];
      if (acompanhantesList && acompanhantesList.length > 0) {
        addBlock(
          <PdfSection title="II.1 - Relação de Acompanhantes Autorizados" isDense={isDenseMode}>
            <div className="space-y-1 text-[10px] sm:text-[10.5px] text-gray-800">
              {acompanhantesList.map((acomp: any, idx: number) => (
                <div key={idx} className="flex justify-between py-0.5 border-b border-gray-100 last:border-0">
                  <span><strong>{idx + 1}. {safeText(acomp.nomeCompleto || acomp.nome)}</strong></span>
                  <span className="text-gray-600">{acomp.parentesco ? `Parentesco: ${acomp.parentesco} ` : ''}{acomp.documento ? `• Doc/CPF: ${acomp.documento}` : ''}</span>
                </div>
              ))}
            </div>
          </PdfSection>,
          12 + (acompanhantesList.length * 4.5)
        );
      }

      // 5. Fiador (Optional)
      if (dados.fiador && dados.fiador.nome) {
        addBlock(
          <PdfSection title="II.2 - Dados do Fiador" isDense={isDenseMode}>
            <PdfFieldGrid isDense={isDenseMode}>
              <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(dados.fiador.nome)}</p>
              <p><strong>CPF/CNPJ:</strong> {safeText(dados.fiador.cpfCnpj)}</p>
              <p><strong>Telefone:</strong> {safeText(dados.fiador.telefone)}</p>
              <p><strong>E-mail:</strong> {safeText(dados.fiador.email)}</p>
              <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(dados.fiador)}</p>
            </PdfFieldGrid>
          </PdfSection>,
          24
        );
      }

      // 6. Imovel Locacao
      addBlock(
        <PdfSection title="III - Dados do Imóvel" isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        26
      );

      // 6.1. Veículos Autorizados para a Garagem (Seção III.1)
      const possuiVeiculo = dados.possuiVeiculo ?? dados.locatario?.possuiVeiculo ?? contract.possuiVeiculo ?? false;
      const veiculosList = dados.veiculos || dados.locatario?.veiculos || contract.veiculos || [];
      if (possuiVeiculo && veiculosList && veiculosList.length > 0) {
        addBlock(
          <PdfSection title="III.1 - Veículos Autorizados para a Garagem" isDense={isDenseMode}>
            <div className="space-y-1 text-[10px] sm:text-[10.5px] text-gray-800">
              {veiculosList.map((veh: any, idx: number) => (
                <div key={idx} className="flex justify-between py-0.5 border-b border-gray-100 last:border-0">
                  <span><strong>{idx + 1}. {veh.tipo || 'Veículo'}: {safeText(veh.marca)} {safeText(veh.modelo)} {veh.cor ? `(${veh.cor})` : ''}</strong></span>
                  <span className="font-mono font-bold uppercase bg-gray-100 px-2 py-0.5 rounded text-[10px]">Placa: {safeText(veh.placa?.toUpperCase())}</span>
                </div>
              ))}
            </div>
          </PdfSection>,
          12 + (veiculosList.length * 4.5)
        );
      }

      // 7. Prazo Locacao
      let totalDiariasContrato = Number(
        p.totalDiarias || 
        p.quantidadeDiarias || 
        p.quantidadeDias || 
        contract?.quantidadeDiarias || 
        contract?.quantidadeDias || 
        0
      );

      if (totalDiariasContrato <= 0 && p.dataInicio && p.dataTermino) {
        totalDiariasContrato = calculateNights(p.dataInicio, p.dataTermino);
      }

      addBlock(
        <PdfSection title="IV - Prazo da Locação" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Início:</strong> {safeDate(p.dataInicio)} às {safeText(p.horarioEntrada || '14:00')}</p>
            <p><strong>Término:</strong> {safeDate(p.dataTermino)} às {safeText(p.horarioSaida || '10:00')}</p>
            <p className="col-span-2 font-bold text-[10.5px] sm:text-[11px] text-gray-700">Total de diárias: {totalDiariasContrato} diária(s)</p>
          </PdfFieldGrid>
        </PdfSection>,
        18
      );

      // 8. Valores e Detalhamento
      const totalLocacaoParaPdf = Number(
        dados?.valores?.valorTotalLocacao || 
        dados?.valores?.valorFinal || 
        contract?.valor || 
        0
      );

      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={totalLocacaoParaPdf} contract={contract} isDense={isDenseMode} />,
        28 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // 9. Standard static locacao clauses
      const clausesList = [
        { titulo: "Da Destinação", texto: "O imóvel locado destina-se exclusivamente a uso residencial temporário (turismo), sendo vedada a sublocação, cessão ou empréstimo, total ou parcial, sob pena de rescisão contratual imediata e multa." },
        { titulo: "Das Limitações de Hóspedes", texto: `O limite máximo de pessoas no imóvel é de ${safeText(r.limiteHospedes || 'Não informado')} hóspede(s). A permanência de pessoas acima do limite estipulado acarretará em multa diária adicional de 20% do valor da diária acumulada por pessoa excedente.` },
        { titulo: "Das Obrigações do Locatário", texto: "O LOCATÁRIO obriga-se a manter o imóvel nas mesmas condições de higiene, limpeza e conservação em que o recebeu, respeitando as normas internas e regulamento do condomínio, inclusive horários de silêncio." },
        { titulo: "Das Vistorias e Danos", texto: "Caso ocorra qualquer dano estrutural, em móvel, eletrodoméstico ou utensílio decorrente de dolo ou culpa, o LOCATÁRIO autoriza o desconto correspondente do valor da caução descrita no item V ou indenização direta imediatamente." },
        { titulo: "Da Desocupação", texto: "O LOCATÁRIO desocupará o imóvel impreterivelmente na data e horários estabelecidos sob pena de multa de 1 (uma) diária cheia para cada hora de atraso, mais as diárias correntes." }
      ];

      addClauseBlocks(clausesList, "VI - Cláusulas e Condições da Locação", 1);

      // Optional Caucao Cláusula
      let nextClauseIdx = 6;
      if (Number(v.taxaCaucao) > 0) {
        const caucaoClause = {
          titulo: "Da Caução e Garantia Locatícia",
          texto: `O LOCATÁRIO prestou a título de garantia e reembolso de eventuais perdas e danos, caução no valor de ${safeMoney(v.taxaCaucao)}, que será devolvido integralmente em até 48 horas úteis após a vistoria de saída, caso nenhum dano seja verificado.`
        };
        addClauseBlocks([caucaoClause], "", nextClauseIdx);
        nextClauseIdx++;
      }

      // 10. Additional text Clauses (clausulas)
      const customClausesTextLoc = getCleanVal(dados.clausulas || '');
      const isDuplicateCustomClauseLoc = 
        textosIguaisPDF(customClausesTextLoc, rawDetalhes) || 
        textosIguaisPDF(customClausesTextLoc, rawOutras);
      if (customClausesTextLoc && !isDuplicateCustomClauseLoc) {
        addCustomClauseBlocks(customClausesTextLoc, "Cláusulas Adicionais do Contrato");
      }

      // 11. Selected database Clauses (Continuous Flow)
      const rawListSelection = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listSelection = rawListSelection.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false'
      );
      if (listSelection.length > 0) {
        addClauseBlocks(listSelection, "", nextClauseIdx);
      }

      // 12. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );

    } else if (tipoContrato === 'aceite') {
      const mergedDados = {
        ...contract,
        ...dados
      };
      const parte = getParteAceitante(mergedDados);
      const imov = {
        ...dados.imovel,
        titulo: dados.imovel?.titulo || contract.imovelTitulo || contract.imovelNomeEdificio || dados.nomeEdificio || dados.tituloImovel || "",
        endereco: dados.imovel?.endereco || contract.imovelEndereco || contract.enderecoImovel || dados.imovelEndereco || dados.enderecoImovel || "",
        bairro: dados.imovel?.bairro || contract.imovelBairro || dados.bairro || "",
        cidade: dados.imovel?.cidade || contract.imovelCidade || dados.cidade || "",
        estado: dados.imovel?.estado || contract.imovelState || dados.estado || "",
        matricula: dados.imovel?.matricula || contract.imovelMatricula || contract.matriculaImovel || dados.matriculaImovel || dados.numeroMatricula || dados.matricula || "",
        cri: dados.imovel?.cri || contract.imovelCri || contract.criImovel || dados.criImovel || dados.cri || "",
        codigo: dados.imovel?.codigo || contract.imovelCodigo || contract.codigoImovel || dados.codigoImovel || ""
      };

      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[15px] mb-2' : 'text-[17px] mb-2.5'}`}>
          ACEITE DE TERMOS DE PROPOSTA
        </div>,
        10
      );

      // 1. Identificacao
      const parteSpouse = getSpouseDataPDF(parte, 'comprador', dados);
      const hasConjuge = !!(parteSpouse.nome || parte.hasConjuge || parte.conjugeNome);
      addBlock(
        <PdfSection title="I - Identificação da Parte que Manifesta o Aceite" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Nome Completo:</strong> {safeText(parte.nome || "Não informado")}</p>
            <p><strong>CPF:</strong> {safeText(parte.cpf || "Não informado")}</p>
            <p><strong>RG:</strong> {safeText(parte.rg || "Não informado")}</p>
            <p><strong>Estado Civil:</strong> {safeText(parte.estadoCivil || "Não informado")}</p>
            <p><strong>Profissão:</strong> {safeText(parte.profissao || "Não informado")}</p>
            <p><strong>Telefone:</strong> {safeText(parte.telefone || "Não informado")}</p>
            <p><strong>E-mail:</strong> {safeText(parte.email || "Não informado")}</p>
            <p><strong>WhatsApp:</strong> {safeText(parte.whatsapp || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(parte)}</p>
          </PdfFieldGrid>

          {hasConjuge && (
            <div className="mt-1 pt-1 border-t border-gray-150">
              <h4 className="font-bold text-[9.5px] uppercase tracking-wider text-gray-700 mb-0.5">Cônjuge / Companheiro(a)</h4>
              <div className="grid grid-cols-2 gap-y-0.5 gap-x-5 text-[10px] leading-snug text-gray-700">
                <p><strong>Nome Completo:</strong> {safeText(parteSpouse.nome || parte.conjugeNome || "Não informado")}</p>
                <p><strong>CPF:</strong> {safeText(parteSpouse.cpf || parte.conjugeCpf || "Não informado")}</p>
                <p><strong>RG:</strong> {safeText(parteSpouse.rg || parte.conjugeRg || "Não informado")}</p>
                <p><strong>Telefone:</strong> {safeText(parteSpouse.telefone || parte.conjugeTelefone || "Não informado")}</p>
                <p><strong>E-mail:</strong> {safeText(parteSpouse.email || parte.conjugeEmail || "Não informado")}</p>
                <p><strong>Profissão:</strong> {safeText(parteSpouse.profissao || parte.conjugeProfissao || "Não informado")}</p>
                {parteSpouse.estadoCivil && <p><strong>Estado Civil:</strong> {parteSpouse.estadoCivil}</p>}
                {parteSpouse.endereco && <p className="col-span-2"><strong>Endereço:</strong> {parteSpouse.endereco}</p>}
              </div>
            </div>
          )}
        </PdfSection>,
        hasConjuge ? 30 : 20
      );

      const vAceite = Number(
        mergedDados.valorAceite ||
        mergedDados.valorTotal ||
        mergedDados.valor ||
        mergedDados.valorContrato ||
        mergedDados.valorTotalNegociado ||
        mergedDados.valorProposta ||
        mergedDados.valorNegociado ||
        mergedDados.objeto?.valorAceite ||
        0
      );

      const formaPag = 
        mergedDados.formaPagamento || 
        (Array.isArray(mergedDados.formasPagamento) ? mergedDados.formasPagamento.join(", ") : "") || 
        mergedDados.dados?.pagamento?.formaPagamento ||
        "Não informada";

      // 2. Objeto (strictly clean)
      addBlock(
        <PdfSection title="II - Objeto e Efeitos do Aceite" isDense={isDenseMode}>
          <p className="text-justify text-[10.5px] sm:text-[11px] leading-snug mb-1 text-gray-800">
            A parte qualificada no Item I manifesta o seu inequívoco e pelo <strong>ACEITE</strong> aos termos e condições de pagamento propostos para a transação imobiliária do bem imóvel especificado abaixo:
          </p>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        32
      );

      // 3. Condições / Pagamento Block
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={vAceite} formaPagamentoSimple={formaPag} contract={contract} isDense={isDenseMode} />,
        24 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause (Official Automatic Clause)
      const vSinalAceite = parseValorNum(dados.valorSinal || contract.valorSinal || contract.valorSinalNegocio || dados.valorSinalNegocio || dados.pagamento?.valorSinal || dados.pagamento?.valorSinalNegocio || dados.termos?.valorSinal || dados.termos?.valorSinalNegocio || dados.arras?.valorArras || 0);
      if (vSinalAceite > 0) {
        const sinalInfo = getTextoClausulaSinal(contract);
        const processedSinalText = substituirVariaveisDinamicas(sinalInfo.texto, contract);
        const sinalParas = processedSinalText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        addBlock(
          <PdfSection title={sinalInfo.titulo} isDense={isDenseMode}>
            <div className="space-y-1.5 text-justify text-[10.5px] sm:text-[11px] text-gray-800 leading-normal">
              {sinalParas.map((para, pIdx) => (
                <div key={pIdx} className="break-words">
                  {renderFormattedText(para)}
                </div>
              ))}
            </div>
          </PdfSection>,
          14 + estimateHeight(processedSinalText)
        );
      }

      // 4. Database Clauses (Continuous Flow)
      const rawListSelectionAceite = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listSelectionAceite = rawListSelectionAceite.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false' &&
          !(vSinalAceite > 0 && (c.campoVinculado === 'valorSinalNegocio' || String(c.titulo || '').toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL')))
      );
      if (listSelectionAceite.length > 0) {
        addClauseBlocks(listSelectionAceite, "IV - Cláusulas e Condições do Aceite", 1);
      }

      // 4.5. Cláusulas Adicionais / Personalizadas
      const customClausulasTextAceite = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClauseAceite = 
        textosIguaisPDF(customClausulasTextAceite, rawDetalhes) || 
        textosIguaisPDF(customClausulasTextAceite, rawOutras);
      if (customClausulasTextAceite && !isDuplicateCustomClauseAceite) {
        addCustomClauseBlocks(customClausulasTextAceite, "Cláusulas Adicionais");
      }

      // 5. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa, parte);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(mergedDados.local || 'Balneário Camboriú')}, {safeText(mergedDados.data || (mergedDados.dataProposta ? formatarDataBR(mergedDados.dataProposta) : "") || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={parte} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );
    } else if (tipoContrato === 'compra_venda') {
      const p = dados.proponente || dados.comprador || {};
      const vend = dados.vendedor || dados.proprietario || {};
      const imov = dados.imovel || {};
      const compradorSpouse = getSpouseDataPDF(p, 'comprador', dados);
      const vendedorSpouse = getSpouseDataPDF(vend, 'vendedor', dados);

      // 1. Title Block
      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[14px] mb-2' : 'text-[16px] mb-2.5'}`}>
          INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL
        </div>,
        10
      );

      // 2. Preâmbulo
      addBlock(
        <p className="text-justify indent-6 text-[10px] sm:text-[10.5px] text-gray-800 mt-1 mb-1.5 leading-normal">
          Pelo presente Instrumento Particular de Compromisso de Compra e Venda de Imóvel, as partes contratantes, devidamente qualificadas, têm entre si, justo e acertado, em caráter irrevogável e irretratável, a transação imobiliária regida pelas cláusulas e condições seguintes:
        </p>,
        10
      );

      // 3. Vendedor Block
      addBlock(
        <PdfSection title="I - Promitente(s) Vendedor(es)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Nome Completo:</strong> {safeText(contract.nomeVendedor || vend.nome || "Não informado")}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(vend.cpf || vend.cpfCnpj || (contract as any).vendedor?.documento || "Não informado")}</p>
            <p><strong>RG:</strong> {safeText(vend.rg || (contract as any).vendedor?.rg || "Não informado")}</p>
            <p><strong>Estado Civil:</strong> {safeText(vend.estadoCivil || (contract as any).vendedor?.estadoCivil || "Solteiro(a)")}</p>
            <p><strong>Profissão:</strong> {safeText(vend.profissao || (contract as any).vendedor?.profissao || "Não informado")}</p>
            <p><strong>Telefone/WhatsApp:</strong> {safeText(vend.whatsapp || vend.telefone || (contract as any).vendedor?.telefone || "Não informado")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(vend.email || (contract as any).vendedor?.email || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {formatFullAddress(vend || (contract as any).vendedor)}</p>
            
            {vendedorSpouse.nome && (
              <>
                <p><strong>Cônjuge:</strong> {vendedorSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {vendedorSpouse.cpf || "Não informado"}</p>
                {vendedorSpouse.rg && <p><strong>RG Cônjuge:</strong> {vendedorSpouse.rg}</p>}
                {vendedorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {vendedorSpouse.profissao}</p>}
                {vendedorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {vendedorSpouse.telefone}</p>}
                {vendedorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {vendedorSpouse.email}</p>}
                {vendedorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {vendedorSpouse.estadoCivil}</p>}
                {vendedorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {vendedorSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        vendedorSpouse.nome ? 52 : 32
      );

      // 4. Comprador Block
      addBlock(
        <PdfSection title="II - Promitente(s) Comprador(es)" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Nome Completo:</strong> {safeText(contract.nomeCliente || p.nome || (contract as any).comprador?.nome || "Não informado")}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(p.cpf || p.cpfCnpj || (contract as any).comprador?.documento || "Não informado")}</p>
            <p><strong>RG:</strong> {safeText(p.rg || (contract as any).comprador?.rg || "Não informado")}</p>
            <p><strong>Estado Civil:</strong> {safeText(p.estadoCivil || (contract as any).comprador?.estadoCivil || "Solteiro(a)")}</p>
            <p><strong>Profissão:</strong> {safeText(p.profissao || (contract as any).comprador?.profissao || "Não informado")}</p>
            <p><strong>Telefone/WhatsApp:</strong> {safeText(p.whatsapp || p.telefone || (contract as any).comprador?.telefone || "Não informado")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(p.email || (contract as any).comprador?.email || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {formatFullAddress(p || (contract as any).comprador)}</p>
            
            {compradorSpouse.nome && (
              <>
                <p><strong>Cônjuge:</strong> {compradorSpouse.nome}</p>
                <p><strong>CPF Cônjuge:</strong> {compradorSpouse.cpf || "Não informado"}</p>
                {compradorSpouse.rg && <p><strong>RG Cônjuge:</strong> {compradorSpouse.rg}</p>}
                {compradorSpouse.profissao && <p><strong>Profissão Cônjuge:</strong> {compradorSpouse.profissao}</p>}
                {compradorSpouse.telefone && <p><strong>Telefone Cônjuge:</strong> {compradorSpouse.telefone}</p>}
                {compradorSpouse.email && <p><strong>E-mail Cônjuge:</strong> {compradorSpouse.email}</p>}
                {compradorSpouse.estadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {compradorSpouse.estadoCivil}</p>}
                {compradorSpouse.endereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {compradorSpouse.endereco}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        compradorSpouse.nome ? 52 : 32
      );

      // 5. Imovel Block
      addBlock(
        <PdfSection title="III - Do Objeto e Identificação do Imóvel" isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        28
      );

      // 6. Preco e Condicoes de Pagamento
      const valorTotalCompraVenda = parseValorNum(contract.valor) || parseValorNum(contract.valorTotalNegociado) || parseValorNum(dados.valorTotalNegociado) || 0;
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={valorTotalCompraVenda} contract={contract} isDense={isDenseMode} />,
        28 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause (Official Automatic Clause)
      const vSinalCV = parseValorNum(dados.valorSinal || contract.valorSinal || contract.valorSinalNegocio || dados.valorSinalNegocio || dados.pagamento?.valorSinal || dados.pagamento?.valorSinalNegocio || dados.termos?.valorSinal || dados.termos?.valorSinalNegocio || 0);
      if (vSinalCV > 0) {
        const sinalInfo = getTextoClausulaSinal(contract);
        const processedSinalText = substituirVariaveisDinamicas(sinalInfo.texto, contract);
        const sinalParas = processedSinalText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        addBlock(
          <PdfSection title={sinalInfo.titulo} isDense={isDenseMode}>
            <div className="space-y-1.5 text-justify text-[10.5px] sm:text-[11px] text-gray-800 leading-normal">
              {sinalParas.map((para, pIdx) => (
                <div key={pIdx} className="break-words">
                  {renderFormattedText(para)}
                </div>
              ))}
            </div>
          </PdfSection>,
          14 + estimateHeight(processedSinalText)
        );
      }

      // Cláusulas Selecionadas / Padrão (Continuous Flow & Pagination)
      const rawListClausesCV = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listClausesCV = rawListClausesCV.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false' &&
          !(vSinalCV > 0 && (c.campoVinculado === 'valorSinalNegocio' || String(c.titulo || '').toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL')))
      );
      if (listClausesCV.length > 0) {
        addClauseBlocks(listClausesCV, "Cláusulas Contratuais", 1);
      }

      // Cláusulas Adicionais Personalizadas
      const customClausulasTextCV = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClauseCV = 
        textosIguaisPDF(customClausulasTextCV, rawDetalhes) || 
        textosIguaisPDF(customClausulasTextCV, rawOutras);
      if (customClausulasTextCV && !isDuplicateCustomClauseCV) {
        addCustomClauseBlocks(customClausulasTextCV, "Cláusulas Adicionais");
      }

      // Date & Signatures Block
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );
    } else {
      // Fallback para qualquer outro tipo de documento
      const p = dados.proponente || dados.comprador || {};
      const vend = dados.vendedor || dados.proprietario || {};
      const imov = dados.imovel || {};

      addBlock(
        <div className={`pdf-document-title font-display font-black text-black text-center ${isDenseMode ? 'text-[15px] mb-2' : 'text-[17px] mb-2.5'}`}>
          {safeText(contract.tipoContratoLabel || (tipoContrato === 'proposta' ? 'PROPOSTA DE COMPRA' : tipoContrato === 'contraproposta' ? 'CONTRAPROPOSTA' : tipoContrato === 'aceite' ? 'ACEITE DE TERMOS' : tipoContrato === 'compra_venda' ? 'COMPROMISSO DE COMPRA E VENDA' : tipoContrato === 'locacao_temporaria' ? 'LOCAÇÃO POR TEMPORADA' : tipoContrato === 'administracao_temporaria' ? 'ADMINISTRAÇÃO TEMPORÁRIA' : 'DOCUMENTO CONTRATUAL'))}
        </div>,
        10
      );

      addBlock(
        <PdfSection title="I - Identificação das Partes" isDense={isDenseMode}>
          <PdfFieldGrid isDense={isDenseMode}>
            <p><strong>Parte 1 (Vendedor/Locador):</strong> {safeText(contract.nomeVendedor || vend.nome || "Não informado")}</p>
            <p><strong>Documento:</strong> {safeText(vend.cpf || vend.cpfCnpj || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(vend)}</p>
            <p><strong>Parte 2 (Comprador/Locatário):</strong> {safeText(contract.nomeCliente || p.nome || "Não informado")}</p>
            <p><strong>Documento:</strong> {safeText(p.cpf || p.cpfCnpj || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(p)}</p>
          </PdfFieldGrid>
        </PdfSection>,
        36
      );

      addBlock(
        <PdfSection title="II - Objeto e Imóvel" isDense={isDenseMode}>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} isDense={isDenseMode} />
        </PdfSection>,
        28
      );

      const valorTotalGenerico = parseValorNum(contract.valor) || parseValorNum(contract.valorTotalNegociado) || 0;
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={valorTotalGenerico} contract={contract} isDense={isDenseMode} />,
        28
      );

      // Selected Clauses fallback (Continuous Flow)
      const rawListClausesGen = Array.isArray(dados?.clausulasSelecionadas) 
        ? dados.clausulasSelecionadas 
        : (Array.isArray((contract as any)?.clausulasSelecionadas) ? (contract as any).clausulasSelecionadas : []);
      const listClausesGen = rawListClausesGen.filter(
        (c: any) => c && c.texto && c.texto.trim() !== "" &&
          c.ativo !== false && (c.ativo as any) !== 'false'
      );
      if (listClausesGen.length > 0) {
        addClauseBlocks(listClausesGen, "Cláusulas Contratuais", 1);
      }

      // Custom Clauses fallback
      const customClausulasTextGen = getCleanVal(dados?.clausulas || dados?.clausulasPersonalizadas || '');
      if (customClausulasTextGen) {
        addCustomClauseBlocks(customClausulasTextGen, "Cláusulas Adicionais");
      }

      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className={`pdf-date-signatures ${isDenseMode ? 'mt-1.5' : 'mt-2'} avoid-break signature-block text-[10.5px]`}>
          <div className="text-right font-bold text-[10.5px] sm:text-[11px] text-black pt-0.5 mb-1.5">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} isDense={isDenseMode} />
        </div>,
        sigHeight,
        true
      );
    }

    const totalEstimated = blocks.reduce((sum, b) => sum + b.estimatedHeight, 0);
    return { blocks, totalEstimated };
  };

  const { blocks, totalEstimated } = buildContractPages(isDense);

  // ---- Real-DOM pagination via measurement ----------------------------------
  // Usable content height per page, in CSS px (96dpi). A4 = 1122.5px tall.
  // We subtract page padding + header + footer to get the printable band.
  const PX_PER_MM = 96 / 25.4;

  const getPageLimits = (dense: boolean) => {
    // Exact A4 usable height (297mm = 1122.5px at 96dpi)
    // Page 1: 1122.5px - padding (14-16mm) - header (~45px) - footer (~22px)
    // Usable Page 1: 1005px in normal mode, 1025px in dense mode.
    // Subsequent pages: 1122.5px - padding (14-16mm) - runningHeader (~18px) - footer (~22px)
    // Usable Sub: 1025px in normal mode, 1045px in dense mode.
    const usableFirst = dense ? 1025 : 1005;
    const usableSub = dense ? 1045 : 1025;
    return { usableFirst, usableSub };
  };

  const measureRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<number[] | null>(null);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const nodes = Array.from(
      measureRef.current.querySelectorAll<HTMLElement>('[data-measure-block]')
    );
    if (nodes.length !== blocks.length) return;

    const heights = nodes.map((n) => n.getBoundingClientRect().height);
    const totalH = heights.reduce((sum, h) => sum + h, 0);
    const { usableFirst, usableSub } = getPageLimits(isDense);

    // Single-Page Absorption:
    // If not yet dense and total content can fit on Page 1 under dense spacing (within 28%),
    // trigger dense mode so the document is neatly consolidated onto a SINGLE sheet!
    if (!isDense && totalH > usableFirst && totalH <= usableFirst * 1.28) {
      setIsDense(true);
      return;
    }

    // Multi-page Trailing Page Squeeze:
    // If the contract spans 2+ pages and the last page has only signatures or minimal content (<= 260px),
    // dense mode squeezes earlier pages to pull the signatures onto the previous page, avoiding an isolated signature page.
    const pages: number[][] = [[]];
    let currentH = 0;
    heights.forEach((h, i) => {
      const limit = pages.length === 1 ? usableFirst : usableSub;
      const isSig = !!blocks[i]?.isSignature;
      const effectiveLimit = isSig ? (limit + (isDense ? 45 : 30)) : limit;
      if (currentH + h > effectiveLimit && pages[pages.length - 1].length > 0) {
        pages.push([i]);
        currentH = h;
      } else {
        pages[pages.length - 1].push(i);
        currentH += h;
      }
    });

    const lastPageBlocks = pages[pages.length - 1] || [];
    const isOnlySignaturesOnLastPage = lastPageBlocks.length === 1 && !!blocks[lastPageBlocks[0]]?.isSignature;
    const isMinimalOnLastPage = currentH <= 260;

    if (!isDense && pages.length >= 2 && (isOnlySignaturesOnLastPage || isMinimalOnLastPage)) {
      setIsDense(true);
      return;
    }

    setMeasuredHeights((prev) => {
      if (
        prev &&
        prev.length === heights.length &&
        prev.every((v, i) => Math.abs(v - heights[i]) < 1)
      ) {
        return prev;
      }
      return heights;
    });
  }, [totalEstimated, blocks.length, isDense]);

  // Reset measured heights whenever block count or contract type changes
  useEffect(() => {
    setMeasuredHeights(null);
    setIsDense(false);
  }, [blocks.length, tipoContrato]);

  // Build the final pages from measured heights (or estimates before measurement)
  const buildPagesFromMeasured = (): number[][] => {
    const { usableFirst, usableSub } = getPageLimits(isDense);
    const pages: number[][] = [[]];
    let h = 0;

    const heightsToUse = (measuredHeights && measuredHeights.length === blocks.length)
      ? measuredHeights
      : blocks.map(b => (b.estimatedHeight || 18) * PX_PER_MM);

    const totalH = heightsToUse.reduce((sum, val) => sum + val, 0);

    // PRIORITY 1: If all content fits in Page 1, strictly guarantee a SINGLE sheet!
    const singlePageAllowance = isDense ? 45 : 25;
    if (totalH <= usableFirst + singlePageAllowance) {
      return [blocks.map((_, i) => i)];
    }

    heightsToUse.forEach((rawH, i) => {
      if (!blocks[i]) return;
      const isFirst = pages.length === 1;
      const limit = isFirst ? usableFirst : usableSub;
      
      // For signature blocks, permit a small flex allowance (up to 30px in normal, 45px in dense)
      // to avoid pushing signatures alone to an empty trailing page when they fit comfortably
      const isSig = !!blocks[i]?.isSignature;
      const effectiveLimit = isSig ? (limit + (isDense ? 45 : 30)) : limit;
      const breakHere = (h + rawH > effectiveLimit);

      if (breakHere && pages[pages.length - 1].length > 0) {
        pages.push([i]);
        h = rawH;
      } else {
        pages[pages.length - 1].push(i);
        h += rawH;
      }
    });

    return pages.filter(p => p.length > 0);
  };

  const pageIndexGroups = buildPagesFromMeasured();
  const pages = pageIndexGroups.map((group) =>
    group
      .map((i) => blocks[i])
      .filter((b): b is { render: (ctx?: { isFirstOnPage?: boolean; pageIndex?: number }) => React.JSX.Element; estimatedHeight: number; isSignature?: boolean } => !!b && typeof (b as any).render === 'function')
  );

  return (
    <div 
      id="contrato-pdf" 
      ref={printRef} 
      className={`pdf-export-container font-sans bg-transparent mx-auto ${isDense ? 'pdf-dense' : ''}`}
      style={{
        boxSizing: 'border-box'
      }}
    >
      {/* Hidden measurement layer: renders every block once at the real content
          width so we can read its true rendered height and paginate exactly.
          Positioned off-screen; never printed. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className={`no-print font-sans ${isDense ? 'pdf-dense' : ''}`}
        style={{
          position: 'absolute',
          left: '-99999px',
          top: 0,
          width: 'calc(210mm - 24mm)',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
          boxSizing: 'border-box'
        }}
      >
        {blocks.map((block, i) => (
          block && typeof block.render === 'function' ? (
            <div data-measure-block key={i}>
              <SafeBlockRenderer block={block} index={i} context={{ isFirstOnPage: false, pageIndex: 0 }} />
            </div>
          ) : null
        ))}
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <div 
          key={pageIndex}
          className="pdf-page bg-white relative flex flex-col justify-between print:shadow-none print:m-0"
          style={{
            width: '210mm',
            height: '297mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            padding: isDense ? '6.5mm 12mm 7.5mm 12mm' : '7.5mm 12mm 8.5mm 12mm',
            boxSizing: 'border-box',
            position: 'relative',
            pageBreakAfter: 'always',
            breakAfter: 'page',
            margin: '0 auto 24px auto',
            overflow: 'hidden'
          }}
        >
          {/* Watermark in each page */}
          <div className="pdf-watermark">
            <img 
              src={empresa.marcaDaguaUrl || '/watermark.png'} 
              alt="Marca d'água" 
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Header on page 1, elegant top bar on pages 2+ */}
          {pageIndex === 0 ? (
            renderHeader()
          ) : (
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-2 text-[9px] uppercase tracking-wider text-gray-400 select-none shrink-0">
              <span className="font-medium text-gray-500">{safeText(contract.dados?.proponente?.nome || contract.nomeCliente || 'Contrato')} — {safeText(contract.tipoContratoLabel || 'Menta Imóveis')}</span>
              <span className="font-bold text-gray-600">{safeText(empresa.nome || 'Menta Imóveis')}</span>
            </div>
          )}

          {/* Content Block Wrapper — overflow hidden strictly keeps each page to A4 */}
          <div className="flex-grow flex flex-col justify-start overflow-visible relative z-10">
            {pageBlocks.map((block, bIndex) => (
              block && typeof block.render === 'function' ? (
                <React.Fragment key={bIndex}>
                  <SafeBlockRenderer 
                    block={block} 
                    index={bIndex} 
                    context={{ isFirstOnPage: bIndex === 0, pageIndex }}
                  />
                </React.Fragment>
              ) : null
            ))}
          </div>

          {/* Footer on each page */}
          {renderFooter(pageIndex + 1, pages.length)}
        </div>
      ))}

      {/* Styled Sheets for perfect PDF outputs and preview displays */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-page {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }

        .pdf-page {
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .pdf-document-title {
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
          line-height: 1.2;
        }

        .pdf-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 24px;
          align-items: end;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .pdf-signature-line {
          border-top: 1.2px solid #111827;
          padding-top: 3px;
          text-align: center;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.3;
          overflow: visible;
        }

        .pdf-signature-role {
          font-size: 9px;
          font-weight: 700;
          color: #374151;
          margin-top: 1px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .pdf-signature-doc {
          font-size: 9px;
          color: #4b5563;
          margin-top: 1px;
          text-align: center;
        }

        .pdf-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
          pointer-events: none;
          opacity: 0.018;
        }

        .pdf-watermark img {
          width: 50%;
          max-width: 340px;
          object-fit: contain;
        }

        .avoid-break,
        .clause-item,
        .signature-block,
        .property-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          position: relative !important;
        }

        /* Dense Mode Overrides to Consolidate into Minimum Pages */
        .pdf-dense {
          font-size: 10px !important;
        }
        
        .pdf-dense p,
        .pdf-dense div,
        .pdf-dense span,
        .pdf-dense td,
        .pdf-dense strong,
        .pdf-dense li {
          font-size: 10px !important;
          line-height: 1.3 !important;
        }

        .pdf-dense .section {
          margin-bottom: 4px !important;
        }
        
        .pdf-dense .section-title {
          font-size: 10.5px !important;
          margin-bottom: 2px !important;
          padding-top: 1px !important;
          padding-bottom: 1px !important;
        }

        .pdf-dense .clause-item {
          margin-bottom: 3px !important;
        }

        .pdf-dense .clause-item p {
          font-size: 10px !important;
          line-height: 1.3 !important;
        }

        .pdf-dense .signature-block {
          margin-top: 6px !important;
        }

        .pdf-dense .pdf-signatures {
          margin-top: 8px !important;
          gap: 10px 24px !important;
        }

        .pdf-dense .pdf-signature-line {
          font-size: 10px !important;
          border-top: 1px solid #111827 !important;
          padding-top: 4px !important;
          margin-top: 2px !important;
        }

        .pdf-dense .pdf-signature-role {
          font-size: 8.5px !important;
          margin-top: 1px !important;
        }

        .pdf-dense .pdf-signature-doc {
          font-size: 8.5px !important;
          margin-top: 0.5px !important;
        }

        .pdf-dense .pdf-document-title {
          font-size: 14px !important;
          margin-bottom: 6px !important;
        }

        .pdf-dense .grid {
          gap-y: 2px !important;
        }

        .pdf-dense .pdf-signatures {
          gap: 10px 24px !important;
        }
      `}</style>
    </div>
  );
};

interface ContractPreviewErrorBoundaryProps {
  children: React.ReactNode;
  contract?: any;
}

interface ContractPreviewErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ContractPreviewErrorBoundary extends React.Component<
  ContractPreviewErrorBoundaryProps,
  ContractPreviewErrorBoundaryState
> {
  constructor(props: ContractPreviewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ContractPreviewErrorBoundary] Erro capturado na prévia do contrato:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const c = this.props.contract || {};
      const dados = c.dados || {};
      const comp = dados.proponente || dados.comprador || c.comprador || {};
      const vend = dados.vendedor || dados.proprietario || dados.locador || c.vendedor || {};
      const imov = dados.imovel || {};
      const valorExibicao = c.valor || c.valorTotalNegociado || dados.valorTotalNegociado || dados.pagamento?.valorTotal || 0;

      return (
        <div id="contrato-pdf" className="w-full max-w-4xl mx-auto my-6 space-y-6">
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-950 space-y-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 font-bold text-xl shrink-0">
                ⚠️
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-amber-950">
                  Modo de Segurança — Dados do Documento Preservados
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Todos os dados que você preencheu (comprador, vendedor, imóvel, valores e condições) estão totalmente preservados e salvos no formulário. Você pode continuar editando, avançar ou clicar para atualizar a visualização.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-6 py-2.5 bg-gold hover:bg-amber-500 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Atualizar Visualização
              </button>
            </div>
          </div>

          {/* Structured Safe Summary Sheet */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-md text-gray-800 space-y-6">
            <div className="border-b border-gray-100 pb-4 text-center">
              <h3 className="text-lg font-bold uppercase tracking-wider text-black">
                {c.tipoContratoLabel || 'Documento Contratual'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Resumo Estruturado de Conferência</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                <h5 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide border-b border-gray-200 pb-1">
                  Parte 1 (Proponente / Comprador / Locatário)
                </h5>
                <p><strong>Nome:</strong> {comp.nome || c.nomeCliente || 'Não informado'}</p>
                <p><strong>Documento:</strong> {comp.cpf || comp.cpfCnpj || comp.documento || 'Não informado'}</p>
                <p><strong>Telefone:</strong> {comp.telefone || comp.whatsapp || 'Não informado'}</p>
                <p><strong>E-mail:</strong> {comp.email || 'Não informado'}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                <h5 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide border-b border-gray-200 pb-1">
                  Parte 2 (Vendedor / Proprietário / Locador)
                </h5>
                <p><strong>Nome:</strong> {vend.nome || c.nomeVendedor || 'Não informado'}</p>
                <p><strong>Documento:</strong> {vend.cpf || vend.cpfCnpj || vend.documento || 'Não informado'}</p>
                <p><strong>Telefone:</strong> {vend.telefone || vend.whatsapp || 'Não informado'}</p>
                <p><strong>E-mail:</strong> {vend.email || 'Não informado'}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
              <h5 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide border-b border-gray-200 pb-1">
                Imóvel Objeto
              </h5>
              <p><strong>Empreendimento / Imóvel:</strong> {imov.titulo || imov.nomeEdificio || c.imovelTitulo || 'Não informado'}</p>
              <p><strong>Endereço:</strong> {imov.endereco || c.imovelEndereco || 'Não informado'}</p>
              <p><strong>Matrícula / CRI:</strong> {imov.matricula || c.imovelMatricula || '---'} {imov.cri ? `(CRI: ${imov.cri})` : ''}</p>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-2 text-xs">
              <h5 className="font-bold text-gray-900 uppercase text-[11px] tracking-wide border-b border-amber-200/50 pb-1">
                Valores e Condições de Pagamento
              </h5>
              <p><strong>Valor Total:</strong> {valorExibicao ? Number(valorExibicao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
              {dados.valorSinal && <p><strong>Sinal de Negócio:</strong> {Number(dados.valorSinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
              <p><strong>Forma de Pagamento:</strong> {c.formaPagamento || (Array.isArray(c.formasPagamento) ? c.formasPagamento.join(', ') : 'Conforme proposta')}</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ContractA4Preview: React.FC<ContractA4PreviewProps> = (props) => {
  return (
    <ContractPreviewErrorBoundary contract={props.contract}>
      <ContractA4PreviewInner {...props} />
    </ContractPreviewErrorBoundary>
  );
};
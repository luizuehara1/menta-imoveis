import React, { useState, useRef, useLayoutEffect } from 'react';
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
  formatarDataBR
} from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';

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

export function montarEnderecoImovelPDF(imovel: any = {}): string {
  if (!imovel) return "";
  if (typeof imovel === 'string') return limparParteEndereco(imovel);

  const enderecoBase =
    imovel.imovelEndereco ||
    imovel.enderecoImovel ||
    imovel.endereco ||
    imovel.street ||
    imovel.address ||
    "";

  const numero =
    imovel.numero ||
    imovel.numeroImovel ||
    imovel.number ||
    "";

  const complemento =
    imovel.complemento ||
    imovel.complementoImovel ||
    imovel.complement ||
    "";

  const bairro =
    imovel.bairro ||
    imovel.bairroImovel ||
    imovel.district ||
    imovel.neighborhood ||
    "";

  const cidade =
    imovel.cidade ||
    imovel.cidadeImovel ||
    imovel.city ||
    "";

  const estado =
    imovel.estado ||
    imovel.uf ||
    imovel.estadoImovel ||
    imovel.state ||
    "";

  let enderecoLimpo = limparParteEndereco(enderecoBase);

  // Evitar adicionar bairro/cidade/estado se já estiverem no endereço base
  const enderecoLower = enderecoLimpo.toLowerCase();

  const partes: string[] = [];

  if (enderecoLimpo) partes.push(enderecoLimpo);

  if (numero && !enderecoLower.includes(String(numero).toLowerCase())) {
    partes.push(`nº ${numero}`);
  }

  if (complemento && !enderecoLower.includes(String(complemento).toLowerCase())) {
    partes.push(complemento);
  }

  if (bairro && !enderecoLower.includes(String(bairro).toLowerCase())) {
    partes.push(bairro);
  }

  let cidadeUf = "";

  if (cidade && estado) {
    if (cidade.toLowerCase() === estado.toLowerCase()) {
      cidadeUf = cidade;
    } else {
      cidadeUf = `${cidade}/${estado}`;
    }
  } else if (cidade) {
    cidadeUf = cidade;
  } else if (estado) {
    cidadeUf = estado;
  }

  if (cidadeUf && !enderecoLower.includes(cidade.toLowerCase())) {
    partes.push(cidadeUf);
  }

  return removerDuplicadosEndereco(partes).join(", ");
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
  let count = 2; // base count (e.g. comprador + vendedor, or locador + locatario, or aceitante + imobiliaria)

  // Spouses
  if (tipoContrato === 'aceite') {
    const aceitanteSpouse = getSpouseDataPDF(parteAceitante, 'comprador', dados);
    if (aceitanteSpouse.nome) count++;
  } else if (tipoContrato === 'locacao_temporaria') {
    const locadorSpouse = getSpouseDataPDF(dados.locador, 'locador', dados);
    if (locadorSpouse.nome) count++;
    const locatarioSpouse = getSpouseDataPDF(dados.locatario, 'locatario', dados);
    if (locatarioSpouse.nome) count++;
    if (dados.fiador && dados.fiador.nome) count++;
  } else {
    const compSpouse = getSpouseDataPDF(dados.proponente || dados.comprador, 'comprador', dados);
    if (compSpouse.nome) count++;
    const vendSpouse = getSpouseDataPDF(dados.vendedor || dados.proprietario, 'vendedor', dados);
    if (vendSpouse.nome) count++;
  }

  // Corretor
  const corretorNome = contract.corretorResponsavel || dados.corretorResponsavel || contract.dados?.corretorResponsavel || (contract as any).corretorNome || "";
  if (corretorNome) count++;

  // Imobiliária (always present)
  count++;

  // Testemunhas
  const t1 = dados.assinaturas?.testemunha1 || contract.dados?.assinaturas?.testemunha1 || "";
  if (t1) count++;
  const t2 = dados.assinaturas?.testemunha2 || contract.dados?.assinaturas?.testemunha2 || "";
  if (t2) count++;

  const numRows = Math.ceil(count / 2);
  return 28 + (numRows * 34);
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
}

export const PdfSection: React.FC<PdfSectionProps> = ({ title, children }) => {
  return (
    <section className="section avoid-break mb-2.5">
      <h3 className="section-title text-[12.5px] uppercase font-black text-black mb-1 px-1 py-0.5 bg-gray-50/50 border-l border-gold/40 tracking-wider">
        {title}
      </h3>
      {children}
    </section>
  );
};

interface PdfFieldGridProps {
  children: React.ReactNode;
  cols?: number;
}

export const PdfFieldGrid: React.FC<PdfFieldGridProps> = ({ children, cols = 2 }) => {
  const gridClass = cols === 3 ? 'grid grid-cols-3' : 'grid grid-cols-2';
  return (
    <div className={`${gridClass} gap-y-1 gap-x-6 text-[12px] leading-normal pt-0.5 text-gray-800`}>
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
}

export const PdfPropertyBlock: React.FC<PdfPropertyBlockProps> = ({ 
  imovel, 
  tipoContrato, 
  valorAlternativo, 
  dataAlternativa,
  contract = {}
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
  const address = imovParsed.endereco || "Não informado";
  const bairro = imovParsed.bairro || "Não informado";
  
  let cidadeUf = "Bali/SC"; // fallback
  if (imovParsed.cidade && imovParsed.estado) {
    if (imovParsed.cidade.toLowerCase() === imovParsed.estado.toLowerCase()) {
      cidadeUf = imovParsed.cidade;
    } else {
      cidadeUf = `${imovParsed.cidade}/${imovParsed.estado}`;
    }
  } else if (imovParsed.cidade) {
    cidadeUf = imovParsed.cidade;
  } else if (imovParsed.estado) {
    cidadeUf = imovParsed.estado;
  } else {
    cidadeUf = "Balneário Camboriú/SC";
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
    <div className="bg-gray-50/55 border border-gray-150 rounded-xl p-2.5 grid grid-cols-2 gap-y-1 gap-x-6 text-[12px] leading-normal property-block avoid-break">
      <p><strong>Edifício / Imóvel:</strong> {safeText(titulo)}</p>
      <p><strong>Código do Imóvel:</strong> {safeText(codigo)}</p>
      <p className="col-span-2"><strong>Endereço:</strong> {address}</p>
      <p><strong>Bairro:</strong> {safeText(bairro)}</p>
      <p><strong>Cidade/UF:</strong> {safeText(cidadeUf)}</p>
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
}

export const PdfPaymentBlock: React.FC<PdfPaymentBlockProps> = ({
  dados,
  tipoContrato,
  totalValor,
  metodosDePagamento = [],
  formaPagamentoSimple = "",
  contract = {}
}) => {
  const rawDetalhes = getTextoPagamentoPDF(dados, contract);
  const rawOutras = getOutrasCondicoesPDF(dados, contract);

  const showDetalhes = rawDetalhes.trim() !== "";
  const showOutras = rawOutras.trim() !== "" && !textosIguaisPDF(rawOutras, rawDetalhes);

  const valorExtenso = totalValor ? valorMonetarioPorExtenso(totalValor) : '';
  
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
    <PdfSection title={sectionTitle}>
      {tipoContrato === 'aceite' ? (
        <div className="text-[12px] text-gray-800 leading-normal space-y-1.5">
          <p><strong>Valor do Aceite:</strong> <span className="font-bold">{safeMoney(totalValor)}</span> {valorExtenso ? `(${valorExtenso})` : ''}</p>
          {formaPagamentoSimple && (
            <p><strong>Forma de Pagamento:</strong> {safeText(formaPagamentoSimple)}</p>
          )}
          {showDetalhes && (
            <div className="p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[11.5px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify mt-1">
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700 mb-0.5">Detalhes / Condições de Pagamento:</p>
              <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawDetalhes}</p>
            </div>
          )}
          {showOutras && (
            <div className="p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[11.5px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify mt-1">
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700 mb-0.5">Outras Condições:</p>
              <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawOutras}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {tipoContrato !== 'locacao_temporaria' && tipoContrato !== 'arras_confirmatorios' && (
            <p className="text-justify text-[12px] leading-normal mb-1.5 text-gray-800">
              O valor total da transação é de <strong>{safeMoney(totalValor)}</strong> ({valorExtenso ? `${valorExtenso}` : 'Não informado'}).
            </p>
          )}

          {tipoContrato === 'arras_confirmatorios' && (
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[12px] text-gray-800 leading-normal mb-1.5">
              <p><strong>Valor Total do Negócio:</strong> {safeMoney(totalValor)}</p>
              <p><strong>Valor do Sinal/Arras:</strong> {safeMoney(Number(dados.arras?.valorArras || 0))}</p>
              <p><strong>Forma do Sinal:</strong> {safeText(dados.arras?.formaPagamentoArras || "Não informado")}</p>
              <p><strong>Vencimento do Sinal:</strong> {safeDate(dados.arras?.dataPagamentoArras)}</p>
              {dados.arras?.condicoesDevolucao && (
                <p className="col-span-2 text-[11px] text-gray-700 bg-gray-50/50 p-1.5 rounded border border-gray-150 mt-1">
                  <strong>Condições de devolução do sinal:</strong> {safeText(dados.arras.condicoesDevolucao)}
                </p>
              )}
              {dados.arras?.observacoes && (
                <p className="col-span-2 text-[11px] text-gray-700 mt-1">
                  <strong>Observações Gerais:</strong> {safeText(dados.arras.observacoes)}
                </p>
              )}
            </div>
          )}

          {tipoContrato === 'locacao_temporaria' && (
            <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-[12px] text-gray-800 leading-normal mb-1.5">
              <p><strong>Valor da Diária:</strong> {safeMoney(dados.valores?.valorDiaria || 0)}</p>
              <p><strong>Subtotal Diárias:</strong> {safeMoney(dados.valores?.subtotalDiarias || 0)}</p>
              <p><strong>Taxa de Limpeza:</strong> {safeMoney(dados.valores?.taxaLimpeza || 0)}</p>
              <p><strong>Taxa Caução/Garantia:</strong> {safeMoney(dados.valores?.taxaCaucao || 0)}</p>
              <p className="col-span-2 text-primary-black font-extrabold text-[12.5px] border-t border-gray-100 pt-0.5">
                TOTAL GERAL DA LOCAÇÃO: {safeMoney(dados.valores?.valorTotalLocacao || 0)}
              </p>
            </div>
          )}

          {formaPagamentoSimple && (
            <p className="text-[12px] text-gray-800 mb-1.5">
              <strong>Forma de Pagamento Principal:</strong> {safeText(formaPagamentoSimple)}
            </p>
          )}

          {metodosDePagamento && metodosDePagamento.length > 0 && (
            <div className="mb-2 pl-2">
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700 mb-0.5">Condições de Pagamento de Preferência:</p>
              {metodosDePagamento.map((item: any, index: number) => {
                const subValue = Number(item.valor) || 0;
                return (
                  <div key={index} className="text-[11.5px] text-gray-800 leading-normal pl-2 my-0.5 relative border-l border-gold/30">
                    • <strong>{safeText(item.tipo || 'Parcela')}</strong>: {safeMoney(subValue)}
                    {item.vencimento && ` com vencimento em ${safeDate(item.vencimento)}`}
                    {item.observacao && ` (${safeText(item.observacao)})`}
                  </div>
                );
              })}
            </div>
          )}

          {showDetalhes && (
            <div className="p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[11.5px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify mt-1.5">
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700 mb-0.5">Detalhes / Condições de Pagamento:</p>
              <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawDetalhes}</p>
            </div>
          )}

          {showOutras && (
            <div className="mt-1.5 p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[11.5px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify">
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700 mb-0.5">Outras Condições:</p>
              <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawOutras}</p>
            </div>
          )}
        </>
      )}
    </PdfSection>
  );
};

interface PdfClausesBlockProps {
  clausulas: Array<{ id?: string; titulo: string; texto: string }>;
  sectionTitle?: string;
  startIndex?: number;
}

export const PdfClausesBlock: React.FC<PdfClausesBlockProps> = ({
  clausulas = [],
  sectionTitle = "Cláusulas e Condições Gerais",
  startIndex = 1
}) => {
  const filteredClauses = clausulas.filter(c => c && c.texto && c.texto.trim() !== "");

  if (filteredClauses.length === 0) return null;

  return (
    <>
      {filteredClauses.map((c, idx) => {
        const numClausula = startIndex + idx;
        return (
          <section key={c.id || idx} className="section mt-2 avoid-break leading-relaxed text-[11.5px] text-gray-800 clause-block">
            {idx === 0 && (
              <h3 className="section-title text-[12.5px] uppercase font-black text-black mb-1.5 pb-0.5">
                {sectionTitle}
              </h3>
            )}
            <div className="text-justify">
              <p className="font-bold mb-0.5 text-[12px] text-black">
                Cláusula {numClausula}ª - {c.titulo || 'Cláusula Adicional'}:
              </p>
              <p className="whitespace-pre-wrap text-gray-700">
                {safeText(c.texto)}
              </p>
            </div>
          </section>
        );
      })}
    </>
  );
};

interface PdfSignaturesProps {
  dados: any;
  tipoContrato: string;
  contract: any;
  empresa: any;
  parteAceitante?: any;
}

export const PdfSignatures: React.FC<PdfSignaturesProps> = ({
  dados,
  tipoContrato,
  contract,
  empresa,
  parteAceitante
}) => {
  if (tipoContrato === 'aceite') {
    const nomeAceitante = parteAceitante?.nome || 'ACEITANTE / INTERESSADO';
    return (
      <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[11.5px]">
        <div className="flex flex-col justify-end pt-12">
          <div className="pdf-signature-line text-black font-bold">
            {safeText(nomeAceitante)}
          </div>
          <div className="pdf-signature-role">Parte Aceitante</div>
        </div>
        <div className="flex flex-col justify-end pt-12">
          <div className="pdf-signature-line text-black font-bold">
            {safeText(empresa.nome)}
          </div>
          <div className="pdf-signature-role">Imobiliária Intermediadora</div>
        </div>
      </div>
    );
  }

  if (tipoContrato === 'locacao_temporaria') {
    const nomeLocador = dados.locador?.nome || 'LOCADOR';
    const nomeLocatario = dados.locatario?.nome || 'LOCATÁRIO';
    return (
      <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[11.5px]">
        <div className="flex flex-col justify-end pt-12">
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(nomeLocador)}
          </div>
          <div className="pdf-signature-role">LOCADOR (Proprietário)</div>
        </div>
        <div className="flex flex-col justify-end pt-12">
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(nomeLocatario)}
          </div>
          <div className="pdf-signature-role">LOCATÁRIO (Hóspede/Inquilino)</div>
        </div>
        {dados.fiador?.nome && (
          <div className="flex flex-col justify-end pt-12">
            <div className="pdf-signature-line text-black font-bold max-w-full truncate">
              {safeText(dados.fiador.nome)}
            </div>
            <div className="pdf-signature-role">Fiador</div>
          </div>
        )}
        <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-4 pt-12">
          <div className="pdf-signature-line text-gray-700 font-bold max-w-full truncate">
            {safeText(empresa.nome)}
          </div>
          <div className="pdf-signature-role">INTERMEDIADORA</div>
        </div>
      </div>
    );
  }

  const compName = contract.nomeCliente || dados.comprador?.nome || dados.proponente?.nome || 'COMPRADOR';
  const vendName = contract.nomeVendedor || dados.vendedor?.nome || dados.proprietario?.nome || (parteAceitante?.nome) || 'VENDEDOR';

  return (
    <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[11.5px]">
      <div className="flex flex-col justify-end pt-12">
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(compName)}
        </div>
        <div className="pdf-signature-role">Comprador / Proponente</div>
      </div>
      <div className="flex flex-col justify-end pt-12">
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(vendName)}
        </div>
        <div className="pdf-signature-role">Vendedor / Proprietário</div>
      </div>
      <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-4 pt-12">
        <div className="pdf-signature-line text-gray-800 font-bold max-w-full truncate">
          {safeText(empresa.nome)}
        </div>
        <div className="pdf-signature-role">Intermediadora / Testemunha</div>
      </div>
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

export const ContractA4Preview: React.FC<ContractA4PreviewProps> = ({ contract: originalContract, printRef }) => {
  const contract = originalContract as any;
  const { tipoContrato, dados = {} } = contract;
  const { settings } = useSettings();
  const empresa = (settings.empresa || {}) as any;

  const isCompact = tipoContrato !== 'locacao_temporaria';

  // HELPER Functions
  const getCleanVal = (val: any): string => (typeof val === 'string' ? val.trim() : '');

  const formatFullAddress = (obj: any): string => {
    if (!obj) return 'Não informado';
    if (typeof obj === 'string') return obj;
    const street = obj.endereco || obj.address || obj.street || (typeof obj.heading === 'string' ? obj.heading : '') || (typeof obj.headings === 'string' ? obj.headings : '');
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
      if (typeof obj.enderecoImovel === 'string' && obj.enderecoImovel) return obj.enderecoImovel;
      return 'Não informado';
    }

    let result = cleanParts.join(', ');
    if (cep) {
      result += ` - CEP: ${cep}`;
    }
    return result;
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
      <div className="flex items-center justify-between border-b-2 border-primary-black pb-2 mb-4 gap-4 w-full">
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

  const renderCompactHeader = () => {
    const logoUrl = empresa.logoCabecalhoUrl || '/logo.png';
    const addressLine = [
      empresa.endereco,
      empresa.bairro,
      empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : (empresa.cidade || empresa.estado),
      empresa.cep ? `CEP: ${empresa.cep}` : ''
    ].filter(Boolean).join(' - ');

    return (
      <div className="pdf-compact-header">
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
  };

  const renderFooter = (pageNumber: number, totalPages?: number) => {
    const footerCustom = empresa.rodapeContratos || '';
    return (
      <div className="mt-auto pt-3 border-t border-gray-150 flex items-end justify-between text-[9.5px] text-gray-400 font-medium w-full">
        <div className="max-w-[75%] leading-tight">
          <p className="font-bold text-gray-500 mb-0.5">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[9.5px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-500 font-bold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
        </div>
      </div>
    );
  };

  const renderCompactFooter = (pageNumber: number, totalPages?: number) => {
    const footerCustom = empresa.rodapeContratos || '';
    return (
      <div className="pdf-footer">
        <div className="max-w-[75%] leading-tight text-left">
          <p className="font-bold text-gray-500 mb-0.5 text-gray-400">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[9.5px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-600 font-extrabold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
        </div>
      </div>
    );
  };

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
  const estimateHeight = (text: string, divisor: number = 56, mmPerLine: number = 5.0): number => {
    if (!text) return 0;
    const lines = text.split('\n');
    let totalLines = 0;
    lines.forEach(line => {
      totalLines += Math.max(1, Math.ceil(line.length / divisor));
    });
    return totalLines * mmPerLine;
  };

  // Dynamic Blocks Compiler based on Contract Types
  const buildContractPages = () => {
    const blocks: { render: () => React.JSX.Element; estimatedHeight: number; isSignature?: boolean }[] = [];

    // estimatedHeight is now only a lightweight change-detector for the
    // measurement effect; real layout uses measured DOM heights.
    const addBlock = (element: React.JSX.Element, height: number, isSignature?: boolean) => {
      blocks.push({ render: () => element, estimatedHeight: height, isSignature });
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

      const metodosDePagamento = dados.pagamento?.metodos || dados.termos?.metodos || (contract as any).formasPagamento || [];

      // 1. Title Block
      addBlock(
        <div className="pdf-document-title font-display font-black text-black">
          {isContra ? "CONTRAPROPOSTA DE COMPRA E VENDA" : "PROPOSTA DE COMPRA E VENDA DE IMÓVEL"}
        </div>,
        10
      );

      // 2. Proponente Block
      const firstSectionHeight = compradorSpouse.nome || vendedorSpouse.nome ? 52 : 32;
      addBlock(
        <PdfSection title={isContra ? "I - Proprietário Vendedor" : "I - Proponente Comprador"}>
          {isContra ? (
            <PdfFieldGrid>
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
            <PdfFieldGrid>
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
          <PdfSection title="Dados do Comprador">
            <PdfFieldGrid>
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
        <PdfSection title="II - Identificação do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
          <p className="mt-1.5 text-justify text-[11.5px] italic text-gray-500 leading-normal">
            O imóvel objeto desta {isContra ? 'contraproposta' : 'proposta'} é aceito pelo proponente nas condições físicas em que se encontra, declarando ter vistoriado o mesmo.
          </p>
        </PdfSection>,
        32
      );

      // 5. Pagamento Block
      // Busca o valor total em todos os nomes de campo possíveis. O formulário
      // grava "Valor Total Negociado" em chaves que variam (valorTotalNegociado,
      // valorNegociado, valorTotal em dados/pagamento/termos, etc.), então
      // percorremos todas as variantes conhecidas em vez de só 3 caminhos.
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
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={totalValor} metodosDePagamento={metodosDePagamento} contract={contract} />,
        25 + (metodosDePagamento.length * 3.8) + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause
      const vSinal = parseValorNum(dados.valorSinal || contract.valorSinal || dados.pagamento?.valorSinal || dados.termos?.valorSinal || dados.arras?.valorArras || 0);
      if (vSinal > 0) {
        const vSinalExtenso = valorMonetarioPorExtenso(vSinal).toLowerCase();
        const formattedSinal = vSinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const clauseText = `O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de R$ ${formattedSinal} (${vSinalExtenso}), a título de sinal de negócio, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).`;
        addBlock(
          <PdfSection title="CLÁUSULA – SINAL DO NEGÓCIO">
            <p className="text-justify text-[11.5px] text-gray-800 leading-relaxed bg-white p-2 border border-gray-150 rounded">
              O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de <strong>R$ {formattedSinal} ({vSinalExtenso})</strong>, a título de <strong>sinal de negócio</strong>, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).
            </p>
          </PdfSection>,
          14 + estimateHeight(clauseText)
        );
      }

      // 6. Selected Clauses
      const listClauses = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listClauses.length > 0) {
        listClauses.forEach((c: any, idx: number) => {
          const estimatedClauseHeight = estimateHeight(c.texto || '') + 8;
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas e Condições Gerais" : ""} startIndex={idx + 1} />,
            estimatedClauseHeight
          );
        });
      }

      // 6.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasText = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClause = 
          textosIguaisPDF(customClausulasText, rawDetalhes) || 
          textosIguaisPDF(customClausulasText, rawOutras);
      if (customClausulasText && !isDuplicateCustomClause) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[11.5px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasText}</p>
          </PdfSection>,
          14 + estimateHeight(customClausulasText)
        );
      }

      // 7. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa, contraParteAceitante);
      addBlock(
        <div className="pdf-date-signatures mt-3 avoid-break signature-block text-[11.5px]">
          <div className="text-right font-bold text-[12.5px] text-black pt-1 mb-3">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={contraParteAceitante} />
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
        <div className="pdf-document-title font-display font-black text-black">
          CONTRATO DE ARRAS CONFIRMATÓRIAS E COMPROMISSO DE COMPRA E VENDA
        </div>,
        12
      );

      // 2. Comprador
      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">I - Comprador / Proponente</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[11px]">
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
          </div>
        </section>,
        compradorSpouse.nome ? 34 : 20
      );

      // 3. Vendedor
      addBlock(
        <PdfSection title="II - Vendedor / Proprietário">
          <PdfFieldGrid>
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
        <PdfSection title="III - Identificação do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
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
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={valorTotal} contract={contract} />,
        28 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause
      const vSinalArras = parseValorNum(dados.valorSinal || contract.valorSinal || dados.pagamento?.valorSinal || dados.termos?.valorSinal || dados.arras?.valorArras || 0);
      if (vSinalArras > 0) {
        const vSinalExtenso = valorMonetarioPorExtenso(vSinalArras).toLowerCase();
        const formattedSinal = vSinalArras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const clauseText = `O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de R$ ${formattedSinal} (${vSinalExtenso}), a título de sinal de negócio, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).`;
        addBlock(
          <PdfSection title="CLÁUSULA – SINAL DO NEGÓCIO">
            <p className="text-justify text-[11.5px] text-gray-800 leading-relaxed bg-white p-2 border border-gray-150 rounded">
              O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de <strong>R$ {formattedSinal} ({vSinalExtenso})</strong>, a título de <strong>sinal de negócio</strong>, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).
            </p>
          </PdfSection>,
          14 + estimateHeight(clauseText)
        );
      }

      // 6. Selected Clauses (Individualized Blocks)
      const listClausesArras = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listClausesArras.length > 0) {
        listClausesArras.forEach((c: any, idx: number) => {
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas e Condições Gerais" : ""} startIndex={idx + 1} />,
            estimateHeight(c.texto || '') + 8
          );
        });
      }

      // 6.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasTextArras = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClauseArras = 
        textosIguaisPDF(customClausulasTextArras, rawDetalhes) || 
        textosIguaisPDF(customClausulasTextArras, rawOutras);
      if (customClausulasTextArras && !isDuplicateCustomClauseArras) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[11.5px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasTextArras}</p>
          </PdfSection>,
          14 + estimateHeight(customClausulasTextArras)
        );
      }

      // 7. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className="pdf-date-signatures mt-4 avoid-break signature-block text-[11.5px]">
          <div className="text-right font-bold text-[12.5px] text-black mb-3">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} />
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
        <div className="text-center space-y-0.5 mb-2">
          <h1 className="text-[16px] font-bold uppercase tracking-tight border-b border-gray-200 pb-1 text-black">CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL</h1>
        </div>,
        10
      );

      // 2. Intro Text
      addBlock(
        <p className="text-justify indent-6 text-[10.5px] text-gray-800 mt-2 leading-relaxed">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>,
        10
      );

      // 3. Locador Block
      const locadorSpouse = getSpouseDataPDF(l, 'locador', dados);
      addBlock(
        <PdfSection title="I - Dados do Locador (Proprietário)">
          <PdfFieldGrid>
            <p className="col-span-2"><strong>Nome/Razão Social:</strong> {safeText(l.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(l.cpfCnpj || l.cpf || l.cnpj)}</p>
            <p><strong>RG/IE:</strong> {safeText(l.rgIe || l.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(l.telefone || l.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(l.email)}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(l)}</p>
            <p className="col-span-2"><strong>Dados Bancários:</strong> {safeText(l.dadosBancarios || l.banco || 'Não informado')}</p>
            <p><strong>Comissão Imobiliária:</strong> {percComissao}% ({safeMoney(valorComissao)})</p>
            <p><strong>Líquido de Repasse:</strong> {safeMoney(valorRepasse)}</p>
            
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
        locadorSpouse.nome ? 36 : 24
      );

      // 4. Locatario Block
      const locatarioSpouse = getSpouseDataPDF(t, 'locatario', dados);
      addBlock(
        <PdfSection title="II - Dados do Locatário (Hóspede/Inquilino)">
          <PdfFieldGrid>
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(t.nome)}</p>
            <p><strong>CPF:</strong> {safeText(t.cpf || t.documento)}</p>
            <p><strong>RG:</strong> {safeText(t.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(t.telefone || t.celular || t.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(t.email)}</p>
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
        locatarioSpouse.nome ? 34 : 20
      );

      // 5. Fiador (Optional)
      if (dados.fiador && dados.fiador.nome) {
        addBlock(
          <PdfSection title="II.1 - Dados do Fiador">
            <PdfFieldGrid>
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
        <PdfSection title="III - Dados do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
        </PdfSection>,
        26
      );

      // 7. Prazo Locacao
      addBlock(
        <PdfSection title="IV - Prazo da Locação">
          <PdfFieldGrid>
            <p><strong>Início:</strong> {safeDate(p.dataInicio)} às {safeText(p.horarioEntrada || '14:00')}</p>
            <p><strong>Término:</strong> {safeDate(p.dataTermino)} às {safeText(p.horarioSaida || '10:00')}</p>
            <p className="col-span-2 font-bold text-[11.5px] text-gray-600">Total de diárias: {Number(p.totalDiarias) || 0} diária(s)</p>
          </PdfFieldGrid>
        </PdfSection>,
        18
      );

      // 8. Valores e Detalhamento
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={0} contract={contract} />,
        28 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // 9. Standard static locacao clauses
      const clausesList = [
        { title: "Cláusula 1ª - Da Destinação", text: "O imóvel locado destina-se exclusivamente a uso residencial temporário (turismo), sendo vedada a sublocação, cessão ou empréstimo, total ou parcial, sob pena de rescisão contratual imediata e multa." },
        { title: "Cláusula 2ª - Das Limitações de Hóspedes", text: `O limite máximo de pessoas no imóvel é de ${safeText(r.limiteHospedes || 'Não informado')} hóspede(s). A permanência de pessoas acima do limite estipulado acarretará em multa diária adicional de 20% do valor da diária acumulada por pessoa excedente.` },
        { title: "Cláusula 3ª - Das Obrigações do Locatário", text: "O LOCATÁRIO obriga-se a manter o imóvel nas mesmas condições de higiene, limpeza e conservação em que o recebeu, respeitando as normas internas e regulamento do condomínio, inclusive horários of silêncio (lei de contravenções penais)." },
        { title: "Cláusula 4ª - Das Vistorias e Danos", text: "Caso ocorra qualquer dano estrutural, em móvel, eletrodoméstico ou utente decorrente de dolo ou culpa, o LOCATÁRIO autoriza o desconto correspondente do valor da caução descrita no item V ou indenização direta imediatamente." },
        { title: "Cláusula 5ª - Da Desocupação", text: "O LOCATÁRIO desocupará o imóvel impreterivelmente na data e horários estabelecidos sob pena de multa de 1 (uma) diária cheia para cada hora de atraso, mais as diárias correntes." }
      ];

      clausesList.forEach((c) => {
        addBlock(
          <div className="text-justify leading-relaxed text-[11.5px] text-gray-800 mt-1.5 p-2 rounded border border-gray-150 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100 pb-0.5 mb-1 text-[12px]">{c.title}</strong>
            <p>{c.text}</p>
          </div>,
          16
        );
      });

      // Optional Caucao Cláusula
      if (Number(v.taxaCaucao) > 0) {
        addBlock(
          <div className="text-justify leading-relaxed text-[11.5px] text-gray-800 mt-1.5 p-1.5 rounded border border-gray-150 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100 pb-0.5 mb-1 text-[12px]">Cláusula 6ª - Da Caução/Garantia</strong>
            <p>O LOCATÁRIO prestou a título de garantia e reembolso de eventuais perdas e danos, caução no valor de {safeMoney(v.taxaCaucao)}, que será devolvido integralmente em até 48 hours úteis após a vistoria de saída, caso nenhum dano seja verificado.</p>
          </div>,
          17
        );
      }

      // 10. Additional text Clauses (clausulas)
      if (dados.clausulas && dados.clausulas.trim()) {
        const customClausesTextLoc = dados.clausulas.trim();
        const isDuplicateCustomClauseLoc = 
          textosIguaisPDF(customClausesTextLoc, rawDetalhes) || 
          textosIguaisPDF(customClausesTextLoc, rawOutras);
        if (!isDuplicateCustomClauseLoc) {
          addBlock(
            <PdfSection title="Cláusulas Adicionais do Contrato">
              <p className="text-justify text-[11.5px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausesTextLoc}</p>
            </PdfSection>,
            16 + estimateHeight(customClausesTextLoc)
          );
        }
      }

      // 11. Selected database Clauses (Individualized Blocks)
      const listSelection = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listSelection.length > 0) {
        const startIdx = Number(v.taxaCaucao) > 0 ? 7 : 6;
        listSelection.forEach((c: any, idx: number) => {
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas e Condições do Acervo" : ""} startIndex={startIdx + idx} />,
            estimateHeight(c.texto || '') + 8
          );
        });
      }

      // 12. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa);
      addBlock(
        <div className="pdf-date-signatures mt-4 avoid-break signature-block text-[11.5px]">
          <div className="text-right font-bold text-[12.5px] text-black border-t border-gray-100 pt-2 mb-3">
            {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} />
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
        <div className="pdf-document-title font-display font-black text-black">
          ACEITE DE TERMOS DE PROPOSTA
        </div>,
        10
      );

      // 1. Identificacao
      const parteSpouse = getSpouseDataPDF(parte, 'comprador', dados);
      const hasConjuge = !!(parteSpouse.nome || parte.hasConjuge || parte.conjugeNome);
      addBlock(
        <PdfSection title="I - Identificação da Parte que Manifesta o Aceite">
          <PdfFieldGrid>
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
            <div className="mt-1.5 pt-1.5 border-t border-gray-100">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-gray-700 mb-1">Cônjuge / Companheiro(a)</h4>
              <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-[10px] leading-normal text-gray-600">
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

      let dataDocumentoBase = "";
      if (mergedDados.dataProposta) {
        dataDocumentoBase = formatarDataBR(mergedDados.dataProposta);
      } else if (mergedDados.criadoEm) {
        dataDocumentoBase = formatarDataBR(mergedDados.criadoEm);
      } else if (mergedDados.data) {
        dataDocumentoBase = mergedDados.data;
      } else {
        dataDocumentoBase = format(new Date(), "dd/MM/yyyy");
      }

      const formaPag = 
        mergedDados.formaPagamento || 
        (Array.isArray(mergedDados.formasPagamento) ? mergedDados.formasPagamento.join(", ") : "") || 
        mergedDados.dados?.pagamento?.formaPagamento ||
        "Não informada";

      // 2. Objeto (strictly clean)
      addBlock(
        <PdfSection title="II - Objeto e Efeitos do Aceite">
          <p className="text-justify text-[11.5px] leading-normal mb-1.5 text-gray-700">
            A parte qualificada no Item I manifesta o seu inequívoco e pelo <strong>ACEITE</strong> aos termos e condições de pagamento propostos para a transação imobiliária do bem imóvel especificado abaixo:
          </p>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
        </PdfSection>,
        32
      );

      // 3. Condições / Pagamento Block
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={vAceite} formaPagamentoSimple={formaPag} contract={contract} />,
        24 + (showDetalhes ? estimateHeight(rawDetalhes) + 8 : 0) + (showOutras ? estimateHeight(rawOutras) + 8 : 0)
      );

      // Sinal do Negócio Clause
      const vSinalAceite = parseValorNum(dados.valorSinal || contract.valorSinal || dados.pagamento?.valorSinal || dados.termos?.valorSinal || dados.arras?.valorArras || 0);
      if (vSinalAceite > 0) {
        const vSinalExtenso = valorMonetarioPorExtenso(vSinalAceite).toLowerCase();
        const formattedSinal = vSinalAceite.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const clauseText = `O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de R$ ${formattedSinal} (${vSinalExtenso}), a título de sinal de negócio, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).`;
        addBlock(
          <PdfSection title="CLÁUSULA – SINAL DO NEGÓCIO">
            <p className="text-justify text-[11.5px] text-gray-800 leading-relaxed bg-white p-2 border border-gray-150 rounded">
              O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de <strong>R$ {formattedSinal} ({vSinalExtenso})</strong>, a título de <strong>sinal de negócio</strong>, por meio da forma de pagamento convencionada pelas partes, servindo este valor como confirmação irrevogável do fechamento da transação imobiliária, sob pena de perda do sinal em caso de desistência imotivada do(a) COMPRADOR(A) ou devolução em dobro em caso de desistência imotivada do(a) VENDEDOR(A).
            </p>
          </PdfSection>,
          14 + estimateHeight(clauseText)
        );
      }

      // 4. database Clauses
      const listSelectionAceite = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listSelectionAceite.length > 0) {
        listSelectionAceite.forEach((c: any, idx: number) => {
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas Vinculadas" : ""} startIndex={idx + 1} />,
            estimateHeight(c.texto || '') + 8
          );
        });
      }

      // 4.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasTextAceite = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      const isDuplicateCustomClauseAceite = 
        textosIguaisPDF(customClausulasTextAceite, rawDetalhes) || 
        textosIguaisPDF(customClausulasTextAceite, rawOutras);
      if (customClausulasTextAceite && !isDuplicateCustomClauseAceite) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[11.5px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasTextAceite}</p>
          </PdfSection>,
          14 + estimateHeight(customClausulasTextAceite)
        );
      }

      // 5. Date & Signatures Block (Combined so they flow together and never break across pages)
      const sigHeight = estimateSignatureHeight(dados, tipoContrato, contract, empresa, parte);
      addBlock(
        <div className="pdf-date-signatures mt-3 avoid-break signature-block text-[11.5px]">
          <div className="text-right font-bold text-[12.5px] text-black pt-1 mb-3">
            {safeText(mergedDados.local || 'Balneário Camboriú')}, {safeText(mergedDados.data || (mergedDados.dataProposta ? formatarDataBR(mergedDados.dataProposta) : "") || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </div>
          <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={parte} />
        </div>,
        sigHeight,
        true
      );
    }

    // Return the flat block list. Real pagination is done by measuring the
    // rendered DOM (see the measurement layer in the component body), which is
    // the only reliable way — character-based mm estimates never match the
    // actual rendered height and were the root cause of both the signature
    // clipping and the huge blank gaps between pages.
    const totalEstimated = blocks.reduce((sum, b) => sum + b.estimatedHeight, 0);
    return { blocks, totalEstimated };
  };

  const { blocks, totalEstimated } = buildContractPages();

  // ---- Real-DOM pagination via measurement ----------------------------------
  // Usable content height per page, in CSS px (96dpi). A4 = 1122.5px tall.
  // We subtract page padding + header + footer to get the printable band.
  const PX_PER_MM = 96 / 25.4;
  const PAGE_PX = 295 * PX_PER_MM;                 // matches the .pdf-page height
  const FIRST_HEADER_PX = 92;                      // logo/company header on page 1
  const SUB_HEADER_PX = 34;                        // slim running header on pages 2+
  const FOOTER_PX = 46;                            // footer band
  const V_PADDING_PX = 30 + 24;                    // top + bottom page padding (~compact)
  const USABLE_FIRST = PAGE_PX - V_PADDING_PX - FIRST_HEADER_PX - FOOTER_PX;
  const USABLE_SUB = PAGE_PX - V_PADDING_PX - SUB_HEADER_PX - FOOTER_PX;

  const measureRef = useRef<HTMLDivElement | null>(null);
  // Each entry = measured height (px) of the block with the same index.
  const [measuredHeights, setMeasuredHeights] = useState<number[] | null>(null);
  // Compact mode is only turned on if, even after normal layout, the whole
  // thing would overflow into an almost-empty extra page. Decided post-measure.
  const [shouldUseCompactMode, setShouldUseCompactMode] = useState(false);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const nodes = Array.from(
      measureRef.current.querySelectorAll<HTMLElement>('[data-measure-block]')
    );
    if (nodes.length !== blocks.length) return;

    const heights = nodes.map((n) => n.getBoundingClientRect().height);

    // Simulate pagination with the REAL heights to see how many pages result
    // and how full the last page is.
    const simulate = (scale: number, first: number, sub: number) => {
      const pages: number[][] = [[]];
      let h = 0;
      heights.forEach((rawH, i) => {
        const bh = rawH * scale;
        const isFirst = pages.length === 1;
        const limit = isFirst ? first : sub;
        const isSig = !!blocks[i].isSignature;
        const breakHere =
          (isSig && limit - h < bh + 8) || (h + bh > limit);
        if (breakHere && pages[pages.length - 1].length > 0) {
          pages.push([i]);
          h = bh;
        } else {
          pages[pages.length - 1].push(i);
          h += bh;
        }
      });
      return { pages, lastH: h };
    };

    const normal = simulate(1, USABLE_FIRST, USABLE_SUB);
    // Only switch to compact mode when the document spills onto an extra page
    // whose tail is nearly empty (e.g. just the signature block). In that case
    // a slight squeeze pulls everything back up and removes the blank page.
    const lastIsThin = normal.lastH < USABLE_SUB * 0.4;
    const useCompact = normal.pages.length >= 2 && lastIsThin;

    setShouldUseCompactMode(useCompact);
    setMeasuredHeights(heights);
  }, [totalEstimated, blocks.length]);

  // Build the final pages from measured heights (falls back to a single page
  // with everything before measurement completes, then re-renders).
  const buildPagesFromMeasured = (): number[][] => {
    if (!measuredHeights) {
      // Pre-measure pass: put everything on one page so it can be measured.
      return [blocks.map((_, i) => i)];
    }
    const scale = shouldUseCompactMode ? 0.9 : 1;
    const firstLimit = (shouldUseCompactMode ? USABLE_FIRST + 40 : USABLE_FIRST);
    const subLimit = (shouldUseCompactMode ? USABLE_SUB + 40 : USABLE_SUB);

    const pages: number[][] = [[]];
    let h = 0;
    measuredHeights.forEach((rawH, i) => {
      const bh = rawH * scale;
      const isFirst = pages.length === 1;
      const limit = isFirst ? firstLimit : subLimit;
      const isSig = !!blocks[i].isSignature;
      const breakHere =
        (isSig && limit - h < bh + 8) || (h + bh > limit);
      if (breakHere && pages[pages.length - 1].length > 0) {
        pages.push([i]);
        h = bh;
      } else {
        pages[pages.length - 1].push(i);
        h += bh;
      }
    });
    return pages;
  };

  const pageIndexGroups = buildPagesFromMeasured();
  const pages = pageIndexGroups.map((group) => group.map((i) => blocks[i]));

  return (
    <div 
      id="contrato-pdf" 
      ref={printRef} 
      className={`pdf-export-container font-sans bg-transparent mx-auto ${isCompact ? 'pdf-compact' : ''} ${shouldUseCompactMode ? 'pdf-compact-mode' : ''}`}
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
        className="no-print"
        style={{
          position: 'absolute',
          left: '-99999px',
          top: 0,
          width: shouldUseCompactMode ? 'calc(210mm - 20mm)' : '126mm',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {blocks.map((block, i) => (
          <div data-measure-block key={i}>
            {block.render()}
          </div>
        ))}
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <div 
          key={pageIndex}
          className={`pdf-page bg-white relative flex flex-col justify-between print:shadow-none print:m-0`}
          style={{
            width: '210mm',
            height: '295mm', // Slightly below 297 to strictly prevent any page count overflows during physical print
            padding: shouldUseCompactMode ? '8mm 10mm 12mm 10mm' : (isCompact ? '24px 42px 30px 42px' : '15mm 14mm 20mm 14mm'),
            boxSizing: 'border-box',
            position: 'relative',
            pageBreakAfter: 'always',
            breakAfter: 'page',
            margin: '0 auto 24px auto',
            minHeight: '295mm'
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
            (shouldUseCompactMode || isCompact) ? renderCompactHeader() : renderHeader()
          ) : (
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-3 text-[9.5px] uppercase tracking-wider text-gray-400 select-none no-print">
              <span>{safeText(contract.dados?.proponente?.nome || contract.nomeCliente || 'Contrato')}</span>
              <span>{safeText(empresa.nome || 'Menta Imóveis')}</span>
            </div>
          )}

          {/* Content Block Wrapper — overflow visible so nothing is ever
              silently clipped; correct page breaks come from measurement. */}
          <div className="flex-grow flex flex-col justify-start overflow-visible relative z-10">
            {pageBlocks.map((block, bIndex) => (
              <React.Fragment key={bIndex}>
                {block.render()}
              </React.Fragment>
            ))}
          </div>

          {/* Footer on each page */}
          {(shouldUseCompactMode || isCompact) ? renderCompactFooter(pageIndex + 1, pages.length) : renderFooter(pageIndex + 1, pages.length)}
        </div>
      ))}

      {/* Styled Sheets for perfect PDF outputs and preview displays */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-page {
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 295mm !important;
            min-height: 295mm !important;
          }
          .no-print {
            display: none !important;
          }
        }

        .pdf-page {
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f2f4;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .pdf-compact p {
          margin: 2.5px 0 !important;
          line-height: 1.4 !important;
        }
        .pdf-compact h1,
        .pdf-compact h2,
        .pdf-compact h3 {
          margin: 3px 0 5px 0 !important;
          line-height: 1.15 !important;
        }
        .pdf-compact .section {
          margin-bottom: 5px !important;
        }
        .pdf-compact .section-title {
          font-size: 13px !important;
          font-weight: 800 !important;
          margin: 5px 0 3px 0 !important;
          padding-bottom: 1.5px !important;
          text-transform: uppercase !important;
          color: #000000 !important;
          letter-spacing: 0.5px !important;
        }
        .pdf-compact-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 2px solid #111827;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .pdf-compact-header img {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .pdf-compact-header .company-name {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .pdf-compact-header .company-info {
          font-size: 11px;
          line-height: 1.35;
          color: #4b5563;
        }
        .pdf-document-title {
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin: 8px 0 12px 0;
          text-transform: uppercase;
        }
        .pdf-signatures {
          margin-top: 16px;
          padding-top: 4px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 40px;
          align-items: end;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .pdf-signature-line {
          border-top: 1.2px solid #111827;
          padding-top: 8px;
          margin-top: 4px;
          text-align: center;
          font-size: 12.5px;
          font-weight: 700;
          line-height: 1.4;
          overflow: visible;
        }
        .pdf-signature-role {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .pdf-footer {
          position: absolute;
          left: 42px;
          right: 42px;
          bottom: 14px;
          border-top: 1px solid #e5e7eb;
          padding-top: 4px;
          font-size: 10px;
          color: #6b7280;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          width: 55%;
          max-width: 380px;
          object-fit: contain;
        }
        .pdf-compact-content {
          font-size: 9.5px !important;
          line-height: 1.25 !important;
          color: #111827;
        }
        .pdf-compact-content section {
          margin-bottom: 4px !important;
        }
        .avoid-break,
        .clause-block,
        .signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-top: 18px !important;
          position: relative !important;
          page-break-before: auto !important;
          break-before: auto !important;
        }

        /* Dynamic Compact Mode Overrides */
        .pdf-compact-mode {
          font-size: 10.5px !important;
        }
        
        .pdf-compact-mode p,
        .pdf-compact-mode div,
        .pdf-compact-mode span,
        .pdf-compact-mode td,
        .pdf-compact-mode strong,
        .pdf-compact-mode li {
          font-size: 10.5px !important;
          line-height: 1.32 !important;
        }

        .pdf-compact-mode .section {
          margin-bottom: 3px !important;
        }
        
        .pdf-compact-mode .section-title {
          font-size: 12px !important;
          margin: 3px 0 2px 0 !important;
          padding-bottom: 1px !important;
        }

        .pdf-compact-mode .clause-block {
          margin-bottom: 2px !important;
          padding-bottom: 1.5px !important;
        }

        .pdf-compact-mode .clause-block p {
          line-height: 1.32 !important;
          font-size: 10.5px !important;
        }

        .pdf-compact-mode .signature-block {
          margin-top: 8px !important;
        }

        .pdf-compact-mode .pdf-signatures {
          margin-top: 12px !important;
          gap: 14px 32px !important;
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
        }

        .pdf-compact-mode .pdf-signature-line {
          font-size: 11.5px !important;
          border-top: 1px solid #111827 !important;
          padding-top: 6px !important;
          margin-top: 3px !important;
          line-height: 1.4 !important;
        }

        .pdf-compact-mode .pdf-signature-role {
          font-size: 10px !important;
          margin-top: 2px !important;
        }

        .pdf-compact-mode .pdf-watermark {
          opacity: 0.012 !important;
        }
        .pdf-compact-mode .pdf-watermark img {
          width: 45% !important;
        }

        .pdf-compact-mode .pdf-page {
          padding: 8mm 10mm 12mm 10mm !important;
        }

        .pdf-compact-mode .pdf-document-title {
          font-size: 15px !important;
          margin: 6px 0 8px 0 !important;
        }

        .pdf-compact-mode .grid-cols-2 {
          gap: 2.5px 14px !important;
        }

        /* Assinaturas nunca herdam o gap apertado do grid genérico */
        .pdf-compact-mode .pdf-signatures {
          gap: 14px 32px !important;
        }
      `}</style>
    </div>
  );
};
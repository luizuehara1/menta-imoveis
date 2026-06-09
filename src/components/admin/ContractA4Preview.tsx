import React from 'react';
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

const estimateHeight = (text: string, divisor: number = 95, mmPerLine: number = 3.0): number => {
  if (!text) return 0;
  const lines = text.split('\n');
  let totalLines = 0;
  lines.forEach(line => {
    totalLines += Math.max(1, Math.ceil(line.length / divisor));
  });
  return totalLines * mmPerLine;
};

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
            <p className="m-0 text-gray-500 text-[8px]">
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
      <div className="flex-grow text-right text-[8.5px] text-gray-700 font-bold uppercase tracking-widest leading-normal">
        <h2 className="text-xs font-display font-black text-primary-black uppercase tracking-[0.1em] mb-0.5">
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
      <h3 className="section-title text-[9px] uppercase font-black text-black mb-1 px-1 py-0.5 bg-gray-50/50 border-l border-gold/40 tracking-wider">
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
    <div className={`${gridClass} gap-y-1 gap-x-6 text-[8.5px] leading-normal pt-0.5 text-gray-800`}>
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
  const titulo = imovel.titulo || imovel.nomeEdificio || imovel.buildingName || contract.imovelTitulo || contract.imovelNomeEdificio ||"Imóvel";
  const codigo = imovel.codigo || contract.imovelCodigo || contract.codigoImovel || "Não informado";
  
  const address = formatFullAddress(imovel || { endereco: contract.enderecoImovel });
  const bairro = imovel.bairro || contract.imovelBairro || "Não informado";
  const cidadeUf = imovel.cidade && imovel.estado 
    ? `${imovel.cidade} / ${imovel.estado}` 
    : (imovel.cidade || contract.imovelCidade || "Balneário Camboriú / SC");

  const matricula = imovel.matricula || contract.imovelMatricula || contract.matriculaImovel || "Não informada";
  const cri = imovel.cri || imovel.criImovel || imovel.cartorioRegistroImoveis || imovel.cartorioRegistro || contract.imovelCri || "Não informado";

  let labelValor = "Valor do Imóvel:";
  if (tipoContrato === 'aceite') labelValor = "Valor do Aceite:";
  else if (tipoContrato === 'proposta') labelValor = "Valor da Proposta:";
  else if (tipoContrato === 'contraproposta') labelValor = "Valor da Contraproposta:";
  else if (tipoContrato === 'arras_confirmatorios') labelValor = "Valor Total do Negócio:";
  else if (tipoContrato === 'locacao_temporaria') labelValor = "Valor Total da Locação:";

  return (
    <div className="bg-gray-50/55 border border-gray-150 rounded-xl p-2.5 grid grid-cols-2 gap-y-1 gap-x-6 text-[8.5px] leading-normal property-block avoid-break">
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
}

export const PdfPaymentBlock: React.FC<PdfPaymentBlockProps> = ({
  dados,
  tipoContrato,
  totalValor,
  metodosDePagamento = [],
  formaPagamentoSimple = ""
}) => {
  const rawDetalhes = getCleanVal(
    dados.detalhesPagamento ||
    dados.pagamento?.detalhesPagamento ||
    dados.termos?.detalhesPagamento ||
    dados.detalhesPagamentoContraproposta ||
    dados.pagamento?.detalhesPagamentoContraproposta ||
    dados.termos?.detalhesPagamentoContraproposta ||
    dados.condicoesFinal ||
    dados.condicoesPagamento ||
    dados.pagamento?.condicoesPagamento ||
    dados.termos?.condicoesPagamento ||
    ''
  );

  const rawOutras = getCleanVal(
    dados.outrasCondicoes ||
    dados.pagamento?.outrasCondicoes ||
    dados.termos?.outrasCondicoes ||
    ''
  );

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
      {tipoContrato !== 'locacao_temporaria' && tipoContrato !== 'arras_confirmatorios' && (
        <p className="text-justify text-[8.5px] leading-normal mb-1.5 text-gray-800">
          O valor total da transação é de <strong>{safeMoney(totalValor)}</strong> ({valorExtenso ? `${valorExtenso}` : 'Não informado'}).
        </p>
      )}

      {tipoContrato === 'arras_confirmatorios' && (
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[8.5px] text-gray-800 leading-normal mb-1.5">
          <p><strong>Valor Total do Negócio:</strong> {safeMoney(totalValor)}</p>
          <p><strong>Valor do Sinal/Arras:</strong> {safeMoney(Number(dados.arras?.valorArras || 0))}</p>
          <p><strong>Forma do Sinal:</strong> {safeText(dados.arras?.formaPagamentoArras || "Não informado")}</p>
          <p><strong>Vencimento do Sinal:</strong> {safeDate(dados.arras?.dataPagamentoArras)}</p>
          {dados.arras?.condicoesDevolucao && (
            <p className="col-span-2 text-[8px] text-gray-700 bg-gray-50/50 p-1.5 rounded border border-gray-150 mt-1">
              <strong>Condições de devolução do sinal:</strong> {safeText(dados.arras.condicoesDevolucao)}
            </p>
          )}
          {dados.arras?.observacoes && (
            <p className="col-span-2 text-[8px] text-gray-700 mt-1">
              <strong>Observações Gerais:</strong> {safeText(dados.arras.observacoes)}
            </p>
          )}
        </div>
      )}

      {tipoContrato === 'locacao_temporaria' && (
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-[8.5px] text-gray-800 leading-normal mb-1.5">
          <p><strong>Valor da Diária:</strong> {safeMoney(dados.valores?.valorDiaria || 0)}</p>
          <p><strong>Subtotal Diárias:</strong> {safeMoney(dados.valores?.subtotalDiarias || 0)}</p>
          <p><strong>Taxa de Limpeza:</strong> {safeMoney(dados.valores?.taxaLimpeza || 0)}</p>
          <p><strong>Taxa Caução/Garantia:</strong> {safeMoney(dados.valores?.taxaCaucao || 0)}</p>
          <p className="col-span-2 text-primary-black font-extrabold text-[9px] border-t border-gray-100 pt-0.5">
            TOTAL GERAL DA LOCAÇÃO: {safeMoney(dados.valores?.valorTotalLocacao || 0)}
          </p>
        </div>
      )}

      {formaPagamentoSimple && tipoContrato === 'aceite' && (
        <p className="text-[8.5px] text-gray-800 mb-1.5">
          <strong>Forma de Pagamento Principal:</strong> {safeText(formaPagamentoSimple)}
        </p>
      )}

      {metodosDePagamento && metodosDePagamento.length > 0 && (
        <div className="mb-2 pl-2">
          <p className="font-bold text-[8px] uppercase tracking-wider text-gray-700 mb-0.5">Condições de Pagamento de Preferência:</p>
          {metodosDePagamento.map((item: any, index: number) => {
            const subValue = Number(item.valor) || 0;
            return (
              <div key={index} className="text-[8px] text-gray-800 leading-normal pl-2 my-0.5 relative border-l border-gold/30">
                • <strong>{safeText(item.tipo || 'Parcela')}</strong>: {safeMoney(subValue)}
                {item.vencimento && ` com vencimento em ${safeDate(item.vencimento)}`}
                {item.observacao && ` (${safeText(item.observacao)})`}
              </div>
            );
          })}
        </div>
      )}

      {showDetalhes && (
        <div className="p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[8px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify mt-1.5">
          <p className="font-bold text-[8px] uppercase tracking-wider text-gray-700 mb-0.5">Detalhes / Condições de Pagamento:</p>
          <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawDetalhes}</p>
        </div>
      )}

      {showOutras && (
        <div className="mt-1.5 p-2 bg-gray-50/55 rounded border border-gray-150/80 leading-normal text-[8px] text-gray-800 whitespace-pre-wrap overflow-visible h-auto max-h-none text-justify">
          <p className="font-bold text-[8px] uppercase tracking-wider text-gray-700 mb-0.5">Outras Condições:</p>
          <p className="text-justify whitespace-pre-wrap tracking-tight break-words">{rawOutras}</p>
        </div>
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
          <section key={c.id || idx} className="section mt-1.5 pt-1.5 border-t border-gray-150 avoid-break leading-relaxed text-[8px] text-gray-800 clause-block">
            {idx === 0 && (
              <h3 className="section-title text-[8.5px] uppercase font-black text-black mb-1.5 border-b border-gray-200 pb-0.5">
                {sectionTitle}
              </h3>
            )}
            <div className="text-justify">
              <p className="font-bold mb-0.5 text-[8.5px] text-black">
                Cláusula {numClausula}ª - {c.titulo || 'Cláusula Adicional'}:
              </p>
              <p className="whitespace-pre-wrap pl-2 border-l border-gold/25 text-gray-700">
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
      <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[8.5px]">
        <div className="flex flex-col justify-end pt-5">
          <div className="pdf-signature-line text-black font-bold">
            {safeText(nomeAceitante)}
          </div>
          <div className="pdf-signature-role">Parte Aceitante</div>
        </div>
        <div className="flex flex-col justify-end pt-5">
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
      <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[8.5px]">
        <div className="flex flex-col justify-end pt-5">
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(nomeLocador)}
          </div>
          <div className="pdf-signature-role">LOCADOR (Proprietário)</div>
        </div>
        <div className="flex flex-col justify-end pt-5">
          <div className="pdf-signature-line text-black font-bold max-w-full truncate">
            {safeText(nomeLocatario)}
          </div>
          <div className="pdf-signature-role">LOCATÁRIO (Hóspede/Inquilino)</div>
        </div>
        {dados.fiador?.nome && (
          <div className="flex flex-col justify-end pt-5">
            <div className="pdf-signature-line text-black font-bold max-w-full truncate">
              {safeText(dados.fiador.nome)}
            </div>
            <div className="pdf-signature-role">Fiador</div>
          </div>
        )}
        <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-3 pt-5">
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
    <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block text-[8.5px]">
      <div className="flex flex-col justify-end pt-5">
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(compName)}
        </div>
        <div className="pdf-signature-role">Comprador / Proponente</div>
      </div>
      <div className="flex flex-col justify-end pt-5">
        <div className="pdf-signature-line text-black font-bold max-w-full truncate">
          {safeText(vendName)}
        </div>
        <div className="pdf-signature-role">Vendedor / Proprietário</div>
      </div>
      <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-3 pt-5">
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
        <div className="flex flex-col items-end gap-0.5 text-[7.5px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-600 font-extrabold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-3 border-t border-gray-150 flex items-end justify-between text-[7.5px] text-gray-400 font-medium w-full select-none">
      <div className="max-w-[75%] leading-tight">
        <p className="font-bold text-gray-500 mb-0.5">
          {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
        </p>
        <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[7.5px] uppercase tracking-widest opacity-60">
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
        <div className="flex-grow text-right text-[8.5px] text-gray-700 font-bold uppercase tracking-widest leading-normal">
          <h2 className="text-xs font-display font-black text-primary-black uppercase tracking-[0.1em] mb-0.5">
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
            <p className="m-0 text-gray-500 text-[8px]">
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
      <div className="mt-auto pt-3 border-t border-gray-150 flex items-end justify-between text-[7.5px] text-gray-400 font-medium w-full">
        <div className="max-w-[75%] leading-tight">
          <p className="font-bold text-gray-500 mb-0.5">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[7.5px] uppercase tracking-widest opacity-60">
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
        <div className="flex flex-col items-end gap-0.5 text-[7.5px] uppercase tracking-widest opacity-60">
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
  const estimateHeight = (text: string, divisor: number = 95, mmPerLine: number = 3.0): number => {
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
    const blocks: { render: () => React.JSX.Element; estimatedHeight: number }[] = [];

    const addBlock = (element: React.JSX.Element, height: number) => {
      blocks.push({ render: () => element, estimatedHeight: height });
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

      const spouseNome = p.compradorConjugeNome || p.conjugeNome || dados.compradorConjugeNome || "";
      const spouseCpf = p.compradorConjugeCpf || p.conjugeCpf || dados.compradorConjugeCpf || "";
      const spouseRg = p.compradorConjugeRg || p.conjugeRg || dados.compradorConjugeRg || "";
      const spouseProfissao = p.compradorConjugeProfissao || p.conjugeProfissao || dados.compradorConjugeProfissao || "";
      const spouseEmail = p.compradorConjugeEmail || p.conjugeEmail || dados.compradorConjugeEmail || "";
      const spouseTelefone = p.compradorConjugeTelefone || p.conjugeTelefone || dados.compradorConjugeTelefone || "";
      const spouseEstadoCivil = p.compradorConjugeEstadoCivil || p.conjugeEstadoCivil || dados.compradorConjugeEstadoCivil || "";
      const spouseEndereco = p.compradorConjugeEndereco || p.conjugeEndereco || dados.compradorConjugeEndereco || "";

      const vendedorConjugeNome = dados.vendedorConjugeNome || (contract as any).vendedorConjugeNome || dados.proprietarioConjugeNome || (contract as any).proprietarioConjugeNome || "";
      const vendedorConjugeCpf = dados.vendedorConjugeCpf || (contract as any).vendedorConjugeCpf || dados.proprietarioConjugeCpf || (contract as any).proprietarioConjugeCpf || "";
      const vendedorConjugeRg = dados.vendedorConjugeRg || (contract as any).vendedorConjugeRg || dados.proprietarioConjugeRg || (contract as any).proprietarioConjugeRg || "";
      const vendedorConjugeProfissao = dados.vendedorConjugeProfissao || (contract as any).vendedorConjugeProfissao || dados.proprietarioConjugeProfissao || (contract as any).proprietarioConjugeProfissao || "";

      const metodosDePagamento = dados.pagamento?.metodos || dados.termos?.metodos || (contract as any).formasPagamento || [];

      // 1. Title Block
      addBlock(
        <div className="pdf-document-title font-display font-black text-black">
          {isContra ? "CONTRAPROPOSTA DE COMPRA E VENDA" : "PROPOSTA DE COMPRA E VENDA DE IMÓVEL"}
        </div>,
        10
      );

      // 2. Proponente Block
      const firstSectionHeight = spouseNome || vendedorConjugeNome ? 34 : 20;
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
              
              {vendedorConjugeNome && (
                <>
                  <p><strong>Cônjuge:</strong> {vendedorConjugeNome}</p>
                  <p><strong>CPF Cônjuge:</strong> {vendedorConjugeCpf || "Não informado"}</p>
                  {vendedorConjugeRg && <p><strong>RG Cônjuge:</strong> {vendedorConjugeRg}</p>}
                  {vendedorConjugeProfissao && <p><strong>Profissão Cônjuge:</strong> {vendedorConjugeProfissao}</p>}
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
              
              {spouseNome && (
                <>
                  <p><strong>Cônjuge:</strong> {spouseNome}</p>
                  <p><strong>CPF Cônjuge:</strong> {spouseCpf || "Não informado"}</p>
                  {spouseRg && <p><strong>RG Cônjuge:</strong> {spouseRg}</p>}
                  {spouseProfissao && <p><strong>Profissão Cônjuge:</strong> {spouseProfissao}</p>}
                  {spouseTelefone && <p><strong>Telefone Cônjuge:</strong> {spouseTelefone}</p>}
                  {spouseEmail && <p><strong>E-mail Cônjuge:</strong> {spouseEmail}</p>}
                  {spouseEstadoCivil && <p><strong>Estado Civil Cônjuge:</strong> {spouseEstadoCivil}</p>}
                  {spouseEndereco && <p className="col-span-2"><strong>Endereço Cônjuge:</strong> {spouseEndereco}</p>}
                </>
              )}
            </PdfFieldGrid>
          )}
        </PdfSection>,
        firstSectionHeight
      );

      // 3. Comprador details block (only if isContra)
      if (isContra) {
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
              
              {spouseNome && (
                <>
                  <p><strong>Cônjuge do Comprador:</strong> {spouseNome}</p>
                  <p><strong>CPF Cônjuge:</strong> {spouseCpf || "Não informado"}</p>
                  {spouseRg && <p><strong>RG Cônjuge:</strong> {spouseRg}</p>}
                  {spouseProfissao && <p><strong>Profissão Cônjuge:</strong> {spouseProfissao}</p>}
                </>
              )}
            </PdfFieldGrid>
          </PdfSection>,
          spouseNome ? 34 : 20
        );
      }

      // 4. Imovel Block
      addBlock(
        <PdfSection title="II - Identificação do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
          <p className="mt-1.5 text-justify text-[8px] italic text-gray-500 leading-normal">
            O imóvel objeto desta {isContra ? 'contraproposta' : 'proposta'} é aceito pelo proponente nas condições físicas em que se encontra, declarando ter vistoriado o mesmo.
          </p>
        </PdfSection>,
        22
      );

      // 5. Pagamento Block
      const totalValor = Number(dados.pagamento?.valorTotal || dados.termos?.valorTotal || contract.valorContrato || 0);
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={totalValor} metodosDePagamento={metodosDePagamento} />,
        18 + (metodosDePagamento.length * 2.8) + (showDetalhes ? estimateHeight(rawDetalhes, 95, 3.0) + 6 : 0) + (showOutras ? estimateHeight(rawOutras, 95, 3.0) + 6 : 0)
      );

      // 6. Selected Clauses
      const listClauses = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listClauses.length > 0) {
        listClauses.forEach((c: any, idx: number) => {
          const estimatedClauseHeight = estimateHeight(c.texto || '', 95, 3.0) + 6;
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas e Condições Gerais" : ""} startIndex={idx + 1} />,
            estimatedClauseHeight
          );
        });
      }

      // 6.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasText = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      if (customClausulasText) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasText}</p>
          </PdfSection>,
          10 + estimateHeight(customClausulasText, 95, 3.0)
        );
      }

      // 7. Date Place
      addBlock(
        <div className="mt-3 text-right font-bold text-[9px] text-black pt-1">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        8
      );

      // 8. Signatures Block
      addBlock(
        <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={contraParteAceitante} />,
        24
      );

    } else if (tipoContrato === 'arras_confirmatorios') {
      const comp = dados.proponente || {};
      const vend = dados.vendedor || (contract as any).vendedor || {};
      const arr = dados.arras || {};
      const imov = dados.imovel || {};

      const spouseNome = comp.compradorConjugeNome || comp.conjugeNome || "";
      const spouseCpf = comp.compradorConjugeCpf || comp.conjugeCpf || "";
      const spouseRg = comp.compradorConjugeRg || comp.conjugeRg || "";

      const vendSpouseNome = vend.vendedorConjugeNome || vend.conjugeNome || "";
      const vendSpouseCpf = vend.vendedorConjugeCpf || vend.conjugeCpf || "";
      const vendSpouseRg = vend.vendedorConjugeRg || vend.conjugeRg || "";

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
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
            <p><strong>Nome:</strong> {safeText(contract.nomeCliente || comp.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(comp.cpf || comp.cpfCnpj || (contract as any).comprador?.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(comp.rg || (contract as any).comprador?.rg || "---")}</p>
            <p><strong>Estado Civil:</strong> {safeText(comp.estadoCivil || (contract as any).comprador?.estadoCivil || "---")}</p>
            <p><strong>Profissão:</strong> {safeText(comp.profissao || (contract as any).comprador?.profissao || "---")}</p>
            <p><strong>Telefone:</strong> {safeText(comp.telefone || (contract as any).comprador?.telefone || "---")}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(comp.email || (contract as any).comprador?.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(comp || (contract as any).comprador)}</p>
            
            {spouseNome && (
              <>
                <p><strong>Cônjuge Comprador:</strong> {spouseNome}</p>
                <p><strong>CPF Cônjuge:</strong> {spouseCpf || "Não informado"}</p>
                {spouseRg && <p><strong>RG Cônjuge:</strong> {spouseRg}</p>}
              </>
            )}
          </div>
        </section>,
        spouseNome ? 34 : 20
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
            
            {vendSpouseNome && (
              <>
                <p><strong>Cônjuge Vendedor:</strong> {vendSpouseNome}</p>
                <p><strong>CPF Cônjuge:</strong> {vendSpouseCpf || "Não informado"}</p>
                {vendSpouseRg && <p><strong>RG Cônjuge:</strong> {vendSpouseRg}</p>}
              </>
            )}
          </PdfFieldGrid>
        </PdfSection>,
        vendSpouseNome ? 34 : 20
      );

      // 4. Imovel
      addBlock(
        <PdfSection title="III - Identificação do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
        </PdfSection>,
        18
      );

      // 5. Arras e Condicoes
      const valorTotal = Number(arr.valorTotalNegocio || contract.valorContrato || 0);
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={valorTotal} />,
        22 + (showDetalhes ? estimateHeight(rawDetalhes, 95, 3.0) + 6 : 0) + (showOutras ? estimateHeight(rawOutras, 95, 3.0) + 6 : 0)
      );

      // 6. Selected Clauses (Individualized Blocks)
      const listClauses = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listClauses.length > 0) {
        listClauses.forEach((c: any, idx: number) => {
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas e Condições Gerais" : ""} startIndex={idx + 1} />,
            estimateHeight(c.texto || '', 95, 3.0) + 6
          );
        });
      }

      // 6.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasText = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      if (customClausulasText) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasText}</p>
          </PdfSection>,
          10 + estimateHeight(customClausulasText, 95, 3.0)
        );
      }

      // 7. Date Block
      addBlock(
        <div className="mt-4 text-right font-bold text-[10px] text-black">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        8
      );

      // 8. Signatures Block
      addBlock(
        <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} />,
        24
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
          <h1 className="text-xs font-bold uppercase tracking-tight border-b border-gray-200 pb-1 text-black">CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL</h1>
        </div>,
        10
      );

      // 2. Intro Text
      addBlock(
        <p className="text-justify indent-6 text-[8.5px] text-gray-800 mt-2 leading-relaxed">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>,
        10
      );

      // 3. Locador Block
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
          </PdfFieldGrid>
        </PdfSection>,
        24
      );

      // 4. Locatario Block
      addBlock(
        <PdfSection title="II - Dados do Locatário (Hóspede/Inquilino)">
          <PdfFieldGrid>
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(t.nome)}</p>
            <p><strong>CPF:</strong> {safeText(t.cpf || t.documento)}</p>
            <p><strong>RG:</strong> {safeText(t.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(t.telefone || t.celular || t.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(t.email)}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {formatFullAddress(t)}</p>
          </PdfFieldGrid>
        </PdfSection>,
        20
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
          16
        );
      }

      // 6. Imovel Locacao
      addBlock(
        <PdfSection title="III - Dados do Imóvel">
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
        </PdfSection>,
        16
      );

      // 7. Prazo Locacao
      addBlock(
        <PdfSection title="IV - Prazo da Locação">
          <PdfFieldGrid>
            <p><strong>Início:</strong> {safeDate(p.dataInicio)} às {safeText(p.horarioEntrada || '14:00')}</p>
            <p><strong>Término:</strong> {safeDate(p.dataTermino)} às {safeText(p.horarioSaida || '10:00')}</p>
            <p className="col-span-2 font-bold text-[8px] text-gray-600">Total de diárias: {Number(p.totalDiarias) || 0} diária(s)</p>
          </PdfFieldGrid>
        </PdfSection>,
        12
      );

      // 8. Valores e Detalhamento
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={0} />,
        22 + (showDetalhes ? estimateHeight(rawDetalhes, 95, 3.0) + 6 : 0) + (showOutras ? estimateHeight(rawOutras, 95, 3.0) + 6 : 0)
      );

      // 9. Standard static locacao clauses
      const clausesList = [
        { title: "Cláusula 1ª - Da Destinação", text: "O imóvel locado destina-se exclusivamente a uso residencial temporário (turismo), sendo vedada a sublocação, cessão ou empréstimo, total ou parcial, sob pena de rescisão contratual imediata e multa." },
        { title: "Cláusula 2ª - Das Limitações de Hóspedes", text: `O limite máximo de pessoas no imóvel é de ${safeText(r.limiteHospedes || 'Não informado')} hóspede(s). A permanência de pessoas acima do limite estipulado acarretará em multa diária adicional de 20% do valor da diária acumulada por pessoa excedente.` },
        { title: "Cláusula 3ª - Das Obrigações do Locatário", text: "O LOCATÁRIO obriga-se a manter o imóvel nas mesmas condições de higiene, limpeza e conservação em que o recebeu, respeitando as normas internas e regulamento do condomínio, inclusive horários de silêncio (lei de contravenções penais)." },
        { title: "Cláusula 4ª - Das Vistorias e Danos", text: "Caso ocorra qualquer dano estrutural, em móvel, eletrodoméstico ou utente decorrente de dolo ou culpa, o LOCATÁRIO autoriza o desconto correspondente do valor da caução descrita no item V ou indenização direta imediatamente." },
        { title: "Cláusula 5ª - Da Desocupação", text: "O LOCATÁRIO desocupará o imóvel impreterivelmente na data e horários estabelecidos sob pena de multa de 1 (uma) diária cheia para cada hora de atraso, mais as diárias correntes." }
      ];

      clausesList.forEach((c) => {
        addBlock(
          <div className="text-justify leading-relaxed text-[8px] text-gray-800 mt-1.5 p-2 rounded border border-gray-150 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100 pb-0.5 mb-1 text-[8.5px]">{c.title}</strong>
            <p>{c.text}</p>
          </div>,
          10
        );
      });

      // Optional Caucao Cláusula
      if (Number(v.taxaCaucao) > 0) {
        addBlock(
          <div className="text-justify leading-relaxed text-[8px] text-gray-800 mt-1.5 p-1.5 rounded border border-gray-150 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100 pb-0.5 mb-1 text-[8.5px]">Cláusula 6ª - Da Caução/Garantia</strong>
            <p>O LOCATÁRIO prestou a título de garantia e reembolso de eventuais perdas e danos, caução no valor de {safeMoney(v.taxaCaucao)}, que será devolvido integralmente em até 48 hours úteis após a vistoria de saída, caso nenhum dano seja verificado.</p>
          </div>,
          11
        );
      }

      // 10. Additional text Clauses (clausulas)
      if (dados.clausulas && dados.clausulas.trim()) {
        const customClausesText = dados.clausulas.trim();
        addBlock(
          <PdfSection title="Cláusulas Adicionais do Contrato">
            <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausesText}</p>
          </PdfSection>,
          10 + estimateHeight(customClausesText, 95, 3.0)
        );
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
            estimateHeight(c.texto || '', 95, 3.0) + 6
          );
        });
      }

      // 12. Date Block
      addBlock(
        <div className="mt-4 text-right font-bold text-[10px] text-black border-t border-gray-100 pt-2">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        8
      );

      // 13. Signatures
      addBlock(
        <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} />,
        24
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

          {parte.hasConjuge && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-100">
              <h4 className="font-bold text-[8px] uppercase tracking-wider text-gray-700 mb-1">Cônjuge / Companheiro(a)</h4>
              <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-[8px] leading-normal text-gray-600">
                <p><strong>Nome Completo:</strong> {safeText(parte.conjugeNome || "Não informado")}</p>
                <p><strong>CPF:</strong> {safeText(parte.conjugeCpf || "Não informado")}</p>
                <p><strong>RG:</strong> {safeText(parte.conjugeRg || "Não informado")}</p>
                <p><strong>Telefone:</strong> {safeText(parte.conjugeTelefone || "Não informado")}</p>
                <p><strong>E-mail:</strong> {safeText(parte.conjugeEmail || "Não informado")}</p>
                <p><strong>Profissão:</strong> {safeText(parte.conjugeProfissao || "Não informado")}</p>
              </div>
            </div>
          )}
        </PdfSection>,
        parte.hasConjuge ? 30 : 20
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
          <p className="text-justify text-[8.5px] leading-normal mb-1.5 text-gray-700">
            A parte qualificada no Item I manifesta o seu inequívoco e pelo <strong>ACEITE</strong> aos termos e condições de pagamento propostos para a transação imobiliária do bem imóvel especificado abaixo:
          </p>
          <PdfPropertyBlock imovel={imov} tipoContrato={tipoContrato} contract={contract} />
        </PdfSection>,
        22
      );

      // 3. Condições / Pagamento Block
      addBlock(
        <PdfPaymentBlock dados={dados} tipoContrato={tipoContrato} totalValor={vAceite} formaPagamentoSimple={formaPag} />,
        18 + (showDetalhes ? estimateHeight(rawDetalhes, 95, 3.0) + 6 : 0) + (showOutras ? estimateHeight(rawOutras, 95, 3.0) + 6 : 0)
      );

      // 4. database Clauses
      const listSelection = (dados.clausulasSelecionadas || []).filter(
        (c: any) => c && c.texto && c.texto.trim() !== ""
      );
      if (listSelection.length > 0) {
        listSelection.forEach((c: any, idx: number) => {
          addBlock(
            <PdfClausesBlock clausulas={[c]} sectionTitle={idx === 0 ? "Cláusulas Vinculadas" : ""} startIndex={idx + 1} />,
            estimateHeight(c.texto || '', 95, 3.0) + 6
          );
        });
      }

      // 4.5. Cláusulas Adicionais / Personalizadas (Custom text box content)
      const customClausulasText = getCleanVal(dados.clausulas || dados.clausulasPersonalizadas || '');
      if (customClausulasText) {
        addBlock(
          <PdfSection title="Cláusulas Adicionais">
            <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausulasText}</p>
          </PdfSection>,
          10 + estimateHeight(customClausulasText, 95, 3.0)
        );
      }

      // 5. Date Block
      addBlock(
        <div className="mt-3 text-right font-bold text-[9px] text-black pt-1">
          {safeText(mergedDados.local || 'Balneário Camboriú')}, {safeText(mergedDados.data || (mergedDados.dataProposta ? formatarDataBR(mergedDados.dataProposta) : "") || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        8
      );

      // 6. Signatures
      addBlock(
        <PdfSignatures dados={dados} tipoContrato={tipoContrato} contract={contract} empresa={empresa} parteAceitante={parte} />,
        24
      );
    }

    // --- Dynamic Slicing/Pagination Algorithm ---
    const pages: { render: () => React.JSX.Element; estimatedHeight: number }[][] = [[]];
    let currentPageHeight = 0;

    // Available target heights in mm (extremely safe & defensive to prevent any sub-pixel/rounding browser overflow)
    const MAX_HEIGHT_FIRST = 225; // 297mm (Total) - 14mm (MarginTop) - 20mm (MarginBottom) - 34mm (Header) - 24mm (Padding & Footer space)
    const MAX_HEIGHT_SUBSEQUENT = 248; // 297mm (Total) - 14mm (MarginTop) - 20mm (MarginBottom) - 10mm (Mini Header) - 23mm (Padding & Footer space)

    blocks.forEach((block) => {
      const isFirstPage = pages.length === 1;
      const spaceLimit = isFirstPage ? MAX_HEIGHT_FIRST : MAX_HEIGHT_SUBSEQUENT;

      if (currentPageHeight + block.estimatedHeight > spaceLimit) {
        // Start a fresh new page
        pages.push([block]);
        currentPageHeight = block.estimatedHeight;
      } else {
        pages[pages.length - 1].push(block);
        currentPageHeight += block.estimatedHeight;
      }
    });

    return pages;
  };

  const pages = buildContractPages();

  return (
    <div 
      id="contrato-pdf" 
      ref={printRef} 
      className={`pdf-export-container font-sans bg-transparent mx-auto ${isCompact ? 'pdf-compact' : ''}`}
      style={{
        boxSizing: 'border-box'
      }}
    >
      {pages.map((pageBlocks, pageIndex) => (
        <div 
          key={pageIndex}
          className={`pdf-page bg-white relative flex flex-col justify-between print:shadow-none print:m-0`}
          style={{
            width: '210mm',
            height: '295mm', // Slightly below 297 to strictly prevent any page count overflows during physical print
            padding: isCompact ? '24px 42px 30px 42px' : '15mm 14mm 20mm 14mm',
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
            isCompact ? renderCompactHeader() : renderHeader()
          ) : (
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-3 text-[7.5px] uppercase tracking-wider text-gray-400 select-none no-print">
              <span>{safeText(contract.dados?.proponente?.nome || contract.nomeCliente || 'Contrato')}</span>
              <span>{safeText(empresa.nome || 'Menta Imóveis')}</span>
            </div>
          )}

          {/* Content Block Wrapper */}
          <div className="flex-grow flex flex-col justify-start overflow-hidden relative z-10">
            {pageBlocks.map((block, bIndex) => (
              <React.Fragment key={bIndex}>
                {block.render()}
              </React.Fragment>
            ))}
          </div>

          {/* Footer on each page */}
          {isCompact ? renderCompactFooter(pageIndex + 1, pages.length) : renderFooter(pageIndex + 1, pages.length)}
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
          margin: 2px 0 !important;
          line-height: 1.25 !important;
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
          font-size: 9.5px !important;
          font-weight: 800 !important;
          margin: 5px 0 3px 0 !important;
          padding-bottom: 1.5px !important;
          border-bottom: 1.1px solid #e1e3e7 !important;
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
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .pdf-compact-header .company-info {
          font-size: 7.5px;
          line-height: 1.25;
          color: #4b5563;
        }
        .pdf-document-title {
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin: 6px 0 8px 0;
          text-transform: uppercase;
        }
        .pdf-signatures {
          margin-top: auto;
          padding-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .pdf-signature-line {
          border-top: 1px solid #111827;
          padding-top: 3px;
          text-align: center;
          font-size: 9px;
          font-weight: 750;
        }
        .pdf-signature-role {
          font-size: 7.5px;
          color: #4b5563;
          margin-top: 0.5px;
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
          padding-top: 3px;
          font-size: 7.5px;
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
          opacity: 0.035;
        }
        .pdf-watermark img {
          width: 75%;
          max-width: 500px;
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
        }
      `}</style>
    </div>
  );
};

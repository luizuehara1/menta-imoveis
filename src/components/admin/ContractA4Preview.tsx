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

  if (rawDetalhes) {
    showDetalhes = true;
    if (rawOutras && rawOutras.toLowerCase() !== rawDetalhes.toLowerCase()) {
      showOutras = true;
    }
  } else if (rawOutras) {
    showOutras = true;
  }

  // Text height estimator (in mm)
  const estimateHeight = (text: string, divisor: number = 85, mmPerLine: number = 4.2): number => {
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

      const imovelMatricula = (contract as any).imovelMatricula || imov.matricula || "Matrícula não informada";
      const imovelCriRaw = (contract as any).imovelCri || imov.cri || imov.criImovel || imov.cartorioRegistroImoveis || imov.cartorioRegistro || imov.cartorioImovel || "";
      const imovelCri = String(imovelCriRaw).trim() || "Não informado";
      const imovelTituloRaw = (contract as any).imovelTitulo || (contract as any).imovelNomeEdificio || imov.titulo || imov.buildingName || imov.nomeEdificio || imov.condoName || "";
      const tituloFinal = (imovelTituloRaw && imovelTituloRaw !== "Imóvel") ? imovelTituloRaw : "Imóvel";

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
        15
      );

      // 2. Proponente Block
      const firstSectionHeight = spouseNome || vendedorConjugeNome ? 55 : 34;
      addBlock(
        <section className="section avoid-break">
          {isContra ? (
            <>
              <h3 className="section-title">I - Proprietário Vendedor</h3>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
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
              </div>
            </>
          ) : (
            <>
              <h3 className="section-title">I - Proponente Comprador</h3>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
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
              </div>
            </>
          )}
        </section>,
        firstSectionHeight
      );

      // 3. Comprador details block (only if isContra)
      if (isContra) {
        addBlock(
          <section className="section avoid-break">
            <h3 className="section-title">Dados do Comprador</h3>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
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
            </div>
          </section>,
          spouseNome ? 55 : 34
        );
      }

      // 4. Imovel Block
      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">II - Identificação do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
            <p className="col-span-2"><strong>Nome/Empreendimento:</strong> {safeText(tituloFinal)}</p>
            <p className="col-span-2"><strong>Endereço do Imóvel:</strong> {formatFullAddress(imov || { endereco: contract.enderecoImovel })}</p>
            <p><strong>Matrícula nº:</strong> {safeText(imovelMatricula)}</p>
            <p><strong>Origem/CRI:</strong> {safeText(imovelCri)}</p>
            <p><strong>Inscrição Imobiliária/Cadastro:</strong> {safeText(imov.inscricaoImobiliaria || imov.cadastroImobiliario || (contract as any).cadastroImobiliario || "Não informado")}</p>
            <p><strong>Código do Imóvel:</strong> {safeText(imov.codigo || contract.codigoImovel || "Não informado")}</p>
          </div>
          <p className="mt-2 text-justify text-[9px] italic text-gray-600 leading-normal">
            O imóvel objeto desta {isContra ? 'contraproposta' : 'proposta'} é aceito pelo proponente nas condições físicas em que se encontra, declarando ter vistoriado o mesmo.
          </p>
        </section>,
        38
      );

      // 5. Pagamento Block
      const totalValor = Number(dados.pagamento?.valorTotal || dados.termos?.valorTotal || contract.valorContrato || 0);
      const valorExtenso = totalValor ? valorMonetarioPorExtenso(totalValor) : '';

      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">III - Valor e Forma de Pagamento</h3>
          <p className="text-justify text-[9.5px] leading-relaxed">
            O proponente oferece pelo imóvel acima descrito o valor total de <strong>{safeMoney(totalValor)}</strong> ({valorExtenso ? `${valorExtenso}` : 'Não informado'}), que será pago conforme as condições e prazos abaixo descritos:
          </p>

          {metodosDePagamento && metodosDePagamento.length > 0 && (
            <div className="mt-2 space-y-1 pl-4">
              {metodosDePagamento.map((item: any, index: number) => {
                const subValue = Number(item.valor) || 0;
                return (
                  <div key={index} className="text-[9px] text-gray-800 list-item list-disc">
                    <strong>{safeText(item.tipo || 'Parcela')}</strong>: {safeMoney(subValue)}
                    {item.vencimento && ` com vencimento em ${safeDate(item.vencimento)}`}
                    {item.observacao && ` (${safeText(item.observacao)})`}
                  </div>
                );
              })}
            </div>
          )}

          {showDetalhes && (
            <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[9px] uppercase text-gray-700 border-b border-gray-200 pb-0.5 mb-1">Detalhes do pagamento / contraproposta</h4>
              <p className="text-justify text-[9px] text-gray-800 whitespace-pre-wrap leading-relaxed">{rawDetalhes}</p>
            </div>
          )}

          {showOutras && (
            <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[9px] uppercase text-gray-700 border-b border-gray-200 pb-0.5 mb-1">Outras Condições</h4>
              <p className="text-justify text-[9px] text-gray-800 whitespace-pre-wrap leading-relaxed">{rawOutras}</p>
            </div>
          )}
        </section>,
        25 + (metodosDePagamento.length * 4) + (showDetalhes ? estimateHeight(rawDetalhes) + 12 : 0) + (showOutras ? estimateHeight(rawOutras) + 12 : 0)
      );

      // 6. Selected Clauses (Each clause rendered as a separate block to ensure zero text cutoffs across pages!)
      const listClauses = dados.clausulasSelecionadas || [];
      if (listClauses.length > 0) {
        listClauses.forEach((c: any, idx: number) => {
          const cText = c.texto || '';
          const estimatedClauseHeight = estimateHeight(cText) + 12;

          addBlock(
            <section className="section mt-2 pt-2 border-t border-gray-150 avoid-break leading-relaxed text-[9px] text-gray-800">
              {idx === 0 && (
                <h3 className="section-title text-[9.5px] uppercase font-black text-black mb-2 border-b border-gray-200 pb-0.5">
                  Cláusulas e Condições Gerais
                </h3>
              )}
              <div className="text-justify">
                <p className="font-bold mb-0.5 text-[9.5px]">Cláusula {idx + 1}ª - {c.titulo || 'Cláusula Adicional'}:</p>
                <p className="whitespace-pre-wrap pl-2 border-l border-gold/25 text-gray-700">{safeText(cText)}</p>
              </div>
            </section>,
            estimatedClauseHeight
          );
        });
      }

      // 7. Date Place
      addBlock(
        <div className="mt-4 text-right font-bold text-[10px] text-black">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        12
      );

      // 8. Signatures Block (Forced as a single block)
      addBlock(
        <div className="pdf-signatures mt-6 pb-2 avoid-break">
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(contract.nomeCliente || p.nome || comp.nome || 'COMPRADOR')}
            </div>
            <div className="pdf-signature-role">Comprador / Proponente</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(contract.nomeVendedor || vend.nome || contraParteAceitante.nome || 'VENDEDOR')}
            </div>
            <div className="pdf-signature-role">Vendedor / Proprietário</div>
          </div>
          <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-3">
            <div className="pdf-signature-line text-gray-800 font-bold">
              {safeText(empresa.nome)}
            </div>
            <div className="pdf-signature-role">Intermediadora / Testemunha</div>
          </div>
        </div>,
        45
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
        15
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
        spouseNome ? 55 : 34
      );

      // 3. Vendedor
      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">II - Vendedor / Proprietário</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
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
          </div>
        </section>,
        vendSpouseNome ? 55 : 34
      );

      // 4. Imovel
      const imovelMatricula = imov.matricula || (contract as any).imovelMatricula || "Não informada";
      const cartorioCompleto = imov.cri || imov.cartorioRegistroImoveis || "Não informado";
      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">III - Identificação do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
            <p className="col-span-2"><strong>Imóvel/Endereço:</strong> {formatFullAddress(imov || { heading: contract.enderecoImovel })}</p>
            <p><strong>Matrícula nº:</strong> {safeText(imovelMatricula)}</p>
            <p><strong>CRI/Cartório:</strong> {safeText(cartorioCompleto)}</p>
            <p><strong>Inscrição Cadastral:</strong> {safeText(imov.inscricaoImobiliaria || (contract as any).cadastroImobiliario || "Não informado")}</p>
            <p><strong>Código do Imóvel:</strong> {safeText(imov.codigo || contract.codigoImovel || "Não informado")}</p>
          </div>
        </section>,
        30
      );

      // 5. Arras e Condicoes
      const valorTotal = Number(arr.valorTotalNegocio || contract.valorContrato || 0);
      const valorArras = Number(arr.valorArras || 0);
      const devExtenso = arr.condicoesDevolucao || '';
      const obsText = arr.observacoes || '';

      addBlock(
        <section className="section avoid-break">
          <h3 className="section-title">IV - Das Arras e Condições do Negócio</h3>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[9.5px]">
            <p><strong>Valor Total do Negócio:</strong> {safeMoney(valorTotal)}</p>
            <p><strong>Valor do Sinal/Arras:</strong> {safeMoney(valorArras)}</p>
            <p><strong>Forma do Sinal:</strong> {safeText(arr.formaPagamentoArras || "Não informado")}</p>
            <p><strong>Vencimento do Sinal:</strong> {safeDate(arr.dataPagamentoArras)}</p>
          </div>

          {devExtenso && (
            <div className="mt-2 text-[9px] text-gray-700 bg-gray-50 p-2 rounded border border-gray-150">
              <strong className="text-[9.5px] block text-gray-800 uppercase mb-0.5">Condições de devolução do sinal:</strong> 
              {safeText(devExtenso)}
            </div>
          )}

          {obsText && (
            <div className="mt-2 text-[9px] text-gray-700 whitespace-pre-wrap leading-relaxed">
              <strong>Observações Gerais:</strong> {safeText(obsText)}
            </div>
          )}

          {showDetalhes && (
            <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[9px] uppercase text-gray-750 pb-0.5 mb-1 border-b border-gray-200">Detalhes do pagamento</h4>
              <p className="text-justify text-[9px] text-gray-800 whitespace-pre-wrap leading-relaxed">{rawDetalhes}</p>
            </div>
          )}

          {showOutras && (
            <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[9px] uppercase text-gray-750 pb-0.5 mb-1 border-b border-gray-200">Outras Condições</h4>
              <p className="text-justify text-[9px] text-gray-800 whitespace-pre-wrap leading-relaxed">{rawOutras}</p>
            </div>
          )}
        </section>,
        35 + (devExtenso ? estimateHeight(devExtenso) + 8 : 0) + (obsText ? estimateHeight(obsText) + 8 : 0) + (showDetalhes ? estimateHeight(rawDetalhes) + 12 : 0) + (showOutras ? estimateHeight(rawOutras) + 12 : 0)
      );

      // 6. Selected Clauses (Individualized Blocks)
      const listClauses = dados.clausulasSelecionadas || [];
      if (listClauses.length > 0) {
        listClauses.forEach((c: any, idx: number) => {
          const cText = c.texto || '';
          addBlock(
            <section className="section avoid-break mt-2 pt-2 border-t border-gray-150 text-[9px] text-gray-800">
              {idx === 0 && <h3 className="section-title text-[9.5px] uppercase font-black text-black mb-2 border-b border-gray-200 pb-0.5">Cláusulas e Condições Gerais</h3>}
              <div className="text-justify leading-relaxed">
                <p className="font-bold mb-0.5">Cláusula {idx + 1}ª - {c.titulo}:</p>
                <p className="whitespace-pre-wrap pl-2 border-l border-gold/25 text-gray-700">{safeText(cText)}</p>
              </div>
            </section>,
            estimateHeight(cText) + 12
          );
        });
      }

      // 7. Date Block
      addBlock(
        <div className="mt-4 text-right font-bold text-[10px] text-black">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        12
      );

      // 8. Signatures Block
      addBlock(
        <div className="pdf-signatures mt-6 pb-2 avoid-break">
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(contract.nomeCliente || comp.nome || 'COMPRADOR')}
            </div>
            <div className="pdf-signature-role">Comprador</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(contract.nomeVendedor || vend.nome || 'VENDEDOR')}
            </div>
            <div className="pdf-signature-role">Vendedor / Proprietário</div>
          </div>
          <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-3">
            <div className="pdf-signature-line text-gray-800 font-bold">
              {safeText(empresa.nome)}
            </div>
            <div className="pdf-signature-role">Intermediadora / Testemunha</div>
          </div>
        </div>,
        45
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
        14
      );

      // 2. Intro Text
      addBlock(
        <p className="text-justify indent-6 text-[9.5px] text-gray-800 mt-2 leading-relaxed">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>,
        15
      );

      // 3. Locador Block
      addBlock(
        <section className="space-y-1 mt-2 avoid-break">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">I - Dados do Locador (Proprietário)</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
            <p className="col-span-2"><strong>Nome/Razão Social:</strong> {safeText(l.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(l.cpfCnpj || l.cpf || l.cnpj)}</p>
            <p><strong>RG/IE:</strong> {safeText(l.rgIe || l.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(l.telefone || l.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(l.email)}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(l)}</p>
            <p className="col-span-2"><strong>Dados Bancários:</strong> {safeText(l.dadosBancarios || l.banco || 'Não informado')}</p>
            <p><strong>Comissão Imobiliária:</strong> {percComissao}% ({safeMoney(valorComissao)})</p>
            <p><strong>Líquido de Repasse:</strong> {safeMoney(valorRepasse)}</p>
          </div>
        </section>,
        34
      );

      // 4. Locatario Block
      addBlock(
        <section className="space-y-1 mt-2 avoid-break">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">II - Dados do Locatário (Hóspede/Inquilino)</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(t.nome)}</p>
            <p><strong>CPF:</strong> {safeText(t.cpf || t.documento)}</p>
            <p><strong>RG:</strong> {safeText(t.rg)}</p>
            <p><strong>Telefone:</strong> {safeText(t.telefone || t.celular || t.phone)}</p>
            <p><strong>E-mail:</strong> {safeText(t.email)}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {formatFullAddress(t)}</p>
          </div>
        </section>,
        30
      );

      // 5. Fiador (Optional)
      if (dados.fiador && dados.fiador.nome) {
        addBlock(
          <section className="space-y-1 mt-2 avoid-break">
            <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">II.1 - Dados do Fiador</h3>
            <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
              <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(dados.fiador.nome)}</p>
              <p><strong>CPF/CNPJ:</strong> {safeText(dados.fiador.cpfCnpj)}</p>
              <p><strong>Telefone:</strong> {safeText(dados.fiador.telefone)}</p>
              <p><strong>E-mail:</strong> {safeText(dados.fiador.email)}</p>
              <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(dados.fiador)}</p>
            </div>
          </section>,
          25
        );
      }

      // 6. Imovel Locacao
      addBlock(
        <section className="space-y-1 mt-2 avoid-break">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">III - Dados do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
            <p className="col-span-2"><strong>Imóvel/Endereço:</strong> {formatFullAddress(imov || { headings: contract.enderecoImovel })}</p>
            <p><strong>Tipo:</strong> {safeText(imov.tipo || 'Não informado')} (Cód: {safeText(imov.codigo)})</p>
            <p><strong>Mobiliado:</strong> {safeText(imov.mobiliado || 'Sim')}</p>
            {imov.itensInclusos && <p className="col-span-2"><strong>Itens inclusos:</strong> {safeText(imov.itensInclusos)}</p>}
          </div>
        </section>,
        25
      );

      // 7. Prazo Locacao
      addBlock(
        <section className="space-y-1 mt-2 avoid-break">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">IV - Prazo da Locação</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
            <p><strong>Início:</strong> {safeDate(p.dataInicio)} às {safeText(p.horarioEntrada || '14:00')}</p>
            <p><strong>Término:</strong> {safeDate(p.dataTermino)} às {safeText(p.horarioSaida || '10:00')}</p>
            <p className="col-span-2 font-bold text-[9px] text-gray-600">Total de diárias: {Number(p.totalDiarias) || 0} diária(s)</p>
          </div>
        </section>,
        18
      );

      // 8. Valores e Detalhamento
      addBlock(
        <section className="space-y-1 mt-2 avoid-break">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">V - Valores e Detalhamento</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 text-[9.5px] text-gray-800">
            <p><strong>Valor da Diária:</strong> {safeMoney(v.valorDiaria || 0)}</p>
            <p><strong>Subtotal Diárias:</strong> {safeMoney(v.subtotalDiarias || 0)}</p>
            <p><strong>Taxa de Limpeza:</strong> {safeMoney(v.taxaLimpeza || 0)}</p>
            <p><strong>Taxa Caução/Garantia:</strong> {safeMoney(v.taxaCaucao || 0)}</p>
            <p className="col-span-2 text-primary-black font-extrabold text-[10px]">TOTAL GERAL DA LOCAÇÃO: {safeMoney(v.valorTotalLocacao || 0)}</p>
            {v.condicoesPagamento && <p className="col-span-2 text-[9px] text-gray-600"><strong>Condições de Pagamento:</strong> {safeText(v.condicoesPagamento)}</p>}
          </div>

          {showDetalhes && (
            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-150 text-[9px] text-gray-800">
              <strong className="block text-gray-700 uppercase mb-0.5">Detalhes adicionais de pagamento:</strong>
              <p className="whitespace-pre-wrap">{rawDetalhes}</p>
            </div>
          )}

          {showOutras && (
            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-150 text-[9px] text-gray-800">
              <strong className="block text-gray-700 uppercase mb-0.5">Outras Condições:</strong>
              <p className="whitespace-pre-wrap">{rawOutras}</p>
            </div>
          )}
        </section>,
        35 + (showDetalhes ? estimateHeight(rawDetalhes) + 12 : 0) + (showOutras ? estimateHeight(rawOutras) + 12 : 0)
      );

      // 9. Standard static locacao clauses (each paragraph rendered individually to avoid overlaps)
      const clausesList = [
        { title: "Cláusula 1ª - Da Destinação", text: "O imóvel locado destina-se exclusivamente a uso residencial temporário (turismo), sendo vedada a sublocação, cessão ou empréstimo, total ou parcial, sob pena de rescisão contratual imediata e multa." },
        { title: "Cláusula 2ª - Das Limitações de Hóspedes", text: `O limite máximo de pessoas no imóvel é de ${safeText(r.limiteHospedes || 'Não informado')} hóspede(s). A permanência de pessoas acima do limite estipulado acarretará em multa diária adicional de 20% do valor da diária acumulada por pessoa excedente.` },
        { title: "Cláusula 3ª - Das Obrigações do Locatário", text: "O LOCATÁRIO obriga-se a manter o imóvel nas mesmas condições de higiene, limpeza e conservação em que o recebeu, respeitando as normas internas e regulamento do condomínio, inclusive horários de silêncio (lei de contravenções penais)." },
        { title: "Cláusula 4ª - Das Vistorias e Danos", text: "Caso ocorra qualquer dano estrutural, em móvel, eletrodoméstico ou utente decorrente de dolo ou culpa, o LOCATÁRIO autoriza o desconto correspondente do valor da caução descrita no item V ou indenização direta imediatamente." },
        { title: "Cláusula 5ª - Da Desocupação", text: "O LOCATÁRIO desocupará o imóvel impreterivelmente na data e horários estabelecidos sob pena de multa de 1 (uma) diária cheia para cada hora de atraso, mais as diárias correntes." }
      ];

      clausesList.forEach((c) => {
        addBlock(
          <div className="text-justify leading-relaxed text-[9px] text-gray-800 mt-2 p-2 rounded border border-gray-100/50 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100/80 pb-0.5 mb-1">{c.title}</strong>
            <p>{c.text}</p>
          </div>,
          15
        );
      });

      // Optional Caucao Cláusula
      if (Number(v.taxaCaucao) > 0) {
        addBlock(
          <div className="text-justify leading-relaxed text-[9px] text-gray-800 mt-2 p-2 rounded border border-gray-100/50 avoid-break bg-gray-50/20">
            <strong className="block text-gray-900 border-b border-gray-100/80 pb-0.5 mb-1">Cláusula 6ª - Da Caução/Garantia</strong>
            <p>O LOCATÁRIO prestou a título de garantia e reembolso de eventuais perdas e danos, caução no valor de {safeMoney(v.taxaCaucao)}, que será devolvido integralmente em até 48 horas úteis após a vistoria de saída, caso nenhum dano seja verificado.</p>
          </div>,
          16
        );
      }

      // 10. Additional text Clauses (clausulas)
      if (dados.clausulas && dados.clausulas.trim()) {
        const customClausesText = dados.clausulas.trim();
        addBlock(
          <section className="space-y-1 mt-2 avoid-break">
            <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px] text-black">Cláusulas Adicionais do Contrato</h3>
            <p className="text-justify text-[9px] text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-2 border border-gray-150 rounded">{customClausesText}</p>
          </section>,
          12 + estimateHeight(customClausesText)
        );
      }

      // 11. Selected database Clauses (Individualized Blocks)
      const listSelection = dados.clausulasSelecionadas || [];
      if (listSelection.length > 0) {
        listSelection.forEach((c: any, idx: number) => {
          const cText = c.texto || '';
          addBlock(
            <section className="section avoid-break mt-2 pt-2 border-t border-gray-150 text-[9px] text-gray-800">
              {idx === 0 && <h3 className="section-title text-[9.5px] uppercase font-black text-black mb-2 border-b border-gray-200 pb-0.5">Cláusulas e Condições do Acervo</h3>}
              <div className="text-justify leading-relaxed">
                <p className="font-bold mb-0.5">Cláusula {idx + 6}ª - {c.titulo}:</p>
                <p className="whitespace-pre-wrap pl-2 border-l border-gold/25 text-gray-700">{safeText(cText)}</p>
              </div>
            </section>,
            estimateHeight(cText) + 12
          );
        });
      }

      // 12. Date Block
      addBlock(
        <div className="mt-4 text-right font-bold text-[10px] text-black border-t border-gray-100 pt-2">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        14
      );

      // 13. Signatures
      addBlock(
        <div className="pdf-signatures mt-6 pb-2 avoid-break text-[9.5px]">
          <div className="border-t border-black pt-1 block text-center">
            <p className="font-bold text-black">{safeText(l.nome || 'LOCADOR')}</p>
            <p className="text-[7.5px] uppercase text-gray-500">LOCADOR</p>
          </div>
          <div className="border-t border-black pt-1 block text-center">
            <p className="font-bold text-black">{safeText(t.nome || 'LOCATÁRIO')}</p>
            <p className="text-[7.5px] uppercase text-gray-500">LOCATÁRIO</p>
          </div>
          <div className="border-t border-black pt-1 block text-center col-span-2 max-w-[200px] mx-auto w-full">
            <p className="font-bold text-gray-700">{safeText(empresa.nome)}</p>
            <p className="text-[7.5px] uppercase text-gray-500">INTERMEDIADORA</p>
          </div>
        </div>,
        45
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
        estado: dados.imovel?.estado || contract.imovelEstado || dados.estado || "",
        matricula: dados.imovel?.matricula || contract.imovelMatricula || contract.matriculaImovel || dados.matriculaImovel || dados.numeroMatricula || dados.matricula || "",
        cri: dados.imovel?.cri || contract.imovelCri || contract.criImovel || dados.criImovel || dados.cri || "",
        codigo: dados.imovel?.codigo || contract.imovelCodigo || contract.codigoImovel || dados.codigoImovel || ""
      };

      // 1. Title Block
      addBlock(
        <div className="pdf-document-title font-display font-black text-black">
          ACEITE DE TERMOS DE PROPOSTA
        </div>,
        14
      );

      // 2. Parte Aceitante Block
      addBlock(
        <section className="section avoid-break clause-block">
          <h3 className="section-title">I - Identificação da Parte que Manifesta o Aceite</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-[8.5px] leading-normal pt-1">
            <p><strong>Nome Completo:</strong> {safeText(parte.nome || "Não informado")}</p>
            <p><strong>CPF:</strong> {safeText(parte.cpf || "Não informado")}</p>
            <p><strong>RG:</strong> {safeText(parte.rg || "Não informado")}</p>
            <p><strong>Estado Civil:</strong> {safeText(parte.estadoCivil || "Não informado")}</p>
            <p><strong>Profissão:</strong> {safeText(parte.profissao || "Não informado")}</p>
            <p><strong>Telefone:</strong> {safeText(parte.telefone || "Não informado")}</p>
            <p><strong>E-mail:</strong> {safeText(parte.email || "Não informado")}</p>
            <p><strong>WhatsApp:</strong> {safeText(parte.whatsapp || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(parte)}</p>
          </div>

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
        </section>,
        parte.hasConjuge ? 42 : 28
      );

      // 3. Objeto Aceite Block
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

      addBlock(
        <section className="section avoid-break clause-block">
          <h3 className="section-title">II - Objeto e Efeitos do Aceite</h3>
          <p className="text-justify text-[8.5px] leading-normal mb-1.5 text-gray-700">
            A parte qualificada no Item I manifesta o seu inequívoco e pleno <strong>ACEITE</strong> aos termos e condições de pagamento propostos para a transação imobiliária do bem imóvel especificado abaixo:
          </p>
          <div className="bg-gray-50/55 border border-gray-150 rounded-xl p-2.5 grid grid-cols-2 gap-y-1 gap-x-6 text-[8.5px] leading-normal">
            <p><strong>Edifício / Imóvel:</strong> {safeText(imov.titulo || "Não informado")}</p>
            <p><strong>Código do Imóvel:</strong> {safeText(imov.codigo || "Não informado")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(imov || { heading: contract.enderecoImovel })}</p>
            <p><strong>Bairro:</strong> {safeText(imov.bairro || "Não informado")}</p>
            <p><strong>Cidade/UF:</strong> {safeText(imov.cidade && imov.estado ? `${imov.cidade}/${imov.estado}` : imov.cidade || "Balneário Camboriú")}</p>
            <p><strong>Matrícula:</strong> {safeText(imov.matricula || "Não informada")}</p>
            <p><strong>CRI Registratório:</strong> {safeText(imov.cri || "Não informado")}</p>
            <p className="col-span-2"><strong>Valor do Aceite:</strong> <span className="font-bold text-black">{safeMoney(vAceite)}</span> ({vAceite ? `${valorMonetarioPorExtenso(vAceite)}` : "Não informado"})</p>
            <p><strong>Data Proposta Base:</strong> {safeText(dataDocumentoBase)}</p>
            <p><strong>Forma de Pagamento:</strong> {safeText(formaPag)}</p>
          </div>
        </section>,
        42
      );

      // 4. Termos e condicoes (Deduplicated)
      const condsFinal = 
        dados.condicoesFinal || 
        dados.condicoesPagamento || 
        dados.detalhesPagamento || 
        dados.pagamento?.condicoesPagamento || 
        dados.pagamento?.detalhesPagamento || 
        dados.termos?.condicoesPagamento || 
        dados.termos?.detalhesPagamento || 
        contract.condicoesPagamento || 
        contract.detalhesPagamento || 
        '';

      const cleanConds = getCleanVal(condsFinal);
      const cleanDetalhes = getCleanVal(rawDetalhes);
      const cleanOutras = getCleanVal(rawOutras);

      let finalCondsToRender = cleanConds;
      let finalDetalhesToRender = "";
      let finalOutrasToRender = "";

      if (cleanDetalhes && cleanDetalhes.toLowerCase() !== cleanConds.toLowerCase()) {
        finalDetalhesToRender = cleanDetalhes;
      }
      if (cleanOutras && 
          cleanOutras.toLowerCase() !== cleanConds.toLowerCase() && 
          cleanOutras.toLowerCase() !== cleanDetalhes.toLowerCase()) {
        finalOutrasToRender = cleanOutras;
      }

      addBlock(
        <section className="section avoid-break clause-block">
          <h3 className="section-title">III - Termos e Condições da Proposta Aceita</h3>
          {finalCondsToRender ? (
            <div className="p-2 bg-gray-50 border border-gray-150 rounded text-[8px] text-gray-800 whitespace-pre-wrap text-justify leading-relaxed">
              {safeText(finalCondsToRender)}
            </div>
          ) : (
            <p className="text-[8px] text-gray-400 italic">Condições de pagamento não detalhadas.</p>
          )}

          {finalDetalhesToRender && (
            <div className="mt-1.5 p-1.5 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[8px] uppercase text-gray-700 pb-0.5 mb-1 border-b border-gray-150">Detalhes Adicionais de Pagamento</h4>
              <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed">{finalDetalhesToRender}</p>
            </div>
          )}

          {finalOutrasToRender && (
            <div className="mt-1.5 p-1.5 bg-gray-50 rounded border border-gray-150">
              <h4 className="font-bold text-[8px] uppercase text-gray-700 pb-0.5 mb-1 border-b border-gray-150">Outras Condições</h4>
              <p className="text-justify text-[8px] text-gray-800 whitespace-pre-wrap leading-relaxed">{finalOutrasToRender}</p>
            </div>
          )}
        </section>,
        15 + 
        (finalCondsToRender ? estimateHeight(finalCondsToRender, 95, 3.8) + 8 : 0) + 
        (finalDetalhesToRender ? estimateHeight(finalDetalhesToRender, 95, 3.8) + 8 : 0) + 
        (finalOutrasToRender ? estimateHeight(finalOutrasToRender, 95, 3.8) + 8 : 0)
      );

      // 5. Selected database Clauses (Individualized Blocks)
      const listSelection = dados.clausulasSelecionadas || [];
      if (listSelection.length > 0) {
        listSelection.forEach((c: any, idx: number) => {
          const cText = c.texto || '';
          addBlock(
            <section className="section avoid-break mt-1.5 pt-1.5 border-t border-gray-150 text-[8px] text-gray-800 clause-block">
              {idx === 0 && <h3 className="section-title text-[8.5px] uppercase font-black text-black mb-1.5 border-b border-gray-200 pb-0.5">Cláusulas Vinculadas</h3>}
              <div className="text-justify leading-relaxed">
                <p className="font-bold mb-0.5 text-black">Cláusula {idx + 1}ª - {c.titulo}:</p>
                <p className="whitespace-pre-wrap pl-2 border-l border-gold/25 text-gray-700">{safeText(cText)}</p>
              </div>
            </section>,
            estimateHeight(cText, 95, 3.8) + 8
          );
        });
      }

      // 6. Date Block
      addBlock(
        <div className="mt-3 text-right font-bold text-[9px] text-black pt-1">
          {safeText(mergedDados.local || 'Balneário Camboriú')}, {safeText(mergedDados.data || (mergedDados.dataProposta ? formatarDataBR(mergedDados.dataProposta) : "") || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>,
        10
      );

      // 7. Signatures
      addBlock(
        <div className="pdf-signatures mt-4 pb-2 avoid-break signature-block">
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(parte.nome || 'ACEITANTE / INTERESSADO')}
            </div>
            <div className="pdf-signature-role">Parte Aceitante</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line text-black font-bold">
              {safeText(empresa.nome)}
            </div>
            <div className="pdf-signature-role">Imobiliária Intermediadora</div>
          </div>
        </div>,
        35
      );
    }

    // --- Dynamic Slicing/Pagination Algorithm ---
    const pages: { render: () => React.JSX.Element; estimatedHeight: number }[][] = [[]];
    let currentPageHeight = 0;

    // Available target heights in mm (extremely safe & defensive to prevent any sub-pixel/rounding browser overflow)
    const MAX_HEIGHT_FIRST = 205; // 297mm (Total) - 14mm (MarginTop) - 20mm (MarginBottom) - 34mm (Header) - 24mm (Padding & Footer space)
    const MAX_HEIGHT_SUBSEQUENT = 230; // 297mm (Total) - 14mm (MarginTop) - 20mm (MarginBottom) - 10mm (Mini Header) - 23mm (Padding & Footer space)

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
        .property-block,
        .party-block,
        .payment-block,
        .signature-block,
        .section-block,
        .section {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>
    </div>
  );
};

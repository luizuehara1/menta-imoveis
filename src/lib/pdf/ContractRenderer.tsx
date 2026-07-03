import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  safeText, 
  safeMoney, 
  safeDate, 
  isValidImageUrl
} from '../utils';
import { A4PaginationContainer } from './A4PaginationContainer';

interface ContractRendererProps {
  contract: any;
  company: any;
}

export const ContractRenderer: React.FC<ContractRendererProps> = ({ contract, company }) => {
  const { tipoContrato, dados = {} } = contract;
  
  // Parties resolution
  const p = dados.proponente || dados.comprador || dados.locatario || {};
  const vend = dados.vendedor || dados.locador || {};
  const imov = dados.imovel || {};
  const pag = dados.pagamento || dados.valores || {};
  
  const isLocacao = tipoContrato === 'locacao_temporaria';
  const isArras = tipoContrato === 'arras_confirmatorios';
  
  const title = isLocacao 
    ? "CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL" 
    : isArras 
      ? "CONTRATO DE ARRAS CONFIRMATÓRIOS E PROMESSA DE COMPRA E VENDA"
      : "CONTRATO DE PROMESSA DE COMPRA E VENDA DE IMÓVEL";

  const labelLocatario = isLocacao ? "LOCATÁRIO" : "COMPRADOR";
  const labelLocador = isLocacao ? "LOCADOR" : "VENDEDOR";

  const listClauses = (dados.clausulasSelecionadas || []).filter(
    (c: any) => c && c.texto && c.texto.trim() !== ""
  );
  
  const customClausesText = dados.clausulasAdicionais || dados.customClausulasText || contract?.customClausulasText || "";

  const formatFullAddress = (obj: any): string => {
    if (!obj) return 'Não informado';
    if (typeof obj === 'string') return obj;
    const parts = [
      obj.endereco || obj.address || obj.street || '',
      obj.numero ? `Nº ${obj.numero}` : '',
      obj.complemento || '',
      obj.bairro || obj.district || '',
      obj.cidade || obj.city || '',
      obj.estado || obj.state || ''
    ];
    const clean = parts.map(s => String(s || '').trim()).filter(Boolean);
    if (clean.length === 0) return 'Não informado';
    let result = clean.join(', ');
    if (obj.cep) result += ` - CEP: ${obj.cep}`;
    return result;
  };

  const logoUrl = company?.logoCabecalhoUrl || '/logo.png';
  const addressLine = [
    company?.endereco,
    company?.bairro,
    company?.cidade && company?.estado ? `${company?.cidade}/${company?.estado}` : (company?.cidade || company?.estado),
    company?.cep ? `CEP: ${company?.cep}` : ''
  ].filter(Boolean).join(' - ');

  // Common Header component for pages
  const RenderHeader = () => (
    <div className="pdf-header flex items-center justify-between border-b border-slate-300 pb-2 mb-4 gap-6 select-none">
      {logoUrl && isValidImageUrl(logoUrl) ? (
        <img 
          src={logoUrl} 
          alt={safeText(company?.nome)} 
          className="h-12 w-auto object-contain shrink-0" 
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="h-8 w-8 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400">LOGO</div>
      )}
      <div className="text-right text-[9pt] text-slate-600 leading-normal font-medium">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-0.5">
          {safeText(company?.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
        </h2>
        <p className="m-0 text-[8pt]">
          {company?.razaoSocial ? `${safeText(company.razaoSocial)} | ` : ''}
          {company?.cnpj ? `CNPJ: ${safeText(company.cnpj)}` : ''}
          {company?.creciPj ? ` | CRECI PJ: ${safeText(company.creciPj)}` : ''}
        </p>
      </div>
    </div>
  );

  // Common Footer component for pages
  const RenderFooter: React.FC<{ pageNumber: number; totalPages: number }> = ({ pageNumber, totalPages }) => (
    <div className="pdf-footer pt-2 border-t border-slate-300 flex items-start justify-between text-[8.5pt] text-slate-500 leading-normal select-none">
      <div className="max-w-[75%]">
        <p className="font-bold text-slate-800 m-0 text-[9pt]">
          {safeText(company?.nome)} | CNPJ: {safeText(company?.cnpj)} | CRECI PJ: {safeText(company?.creciPj)}
        </p>
        <p className="m-0 text-slate-400 text-[8pt]">
          {addressLine ? `${addressLine}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className="block font-bold text-slate-700">Página {pageNumber} de {totalPages}</span>
        <span className="text-[7.5pt] text-slate-400">Emitido eletronicamente em {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
      </div>
    </div>
  );

  // Watermark Component
  const RenderWatermark = () => (
    <div className="pdf-watermark-overlay select-none">
      {company?.marcaDaguaUrl && isValidImageUrl(company.marcaDaguaUrl) && (
        <img 
          src={company.marcaDaguaUrl} 
          alt="Watermark" 
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );

  const blocks: BlockDefinition[] = [
    {
      id: 'title_intro',
      render: () => (
        <div className="w-full">
          {/* TITLE */}
          <div className="text-center my-3">
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-950">
              {title}
            </h1>
          </div>

          {/* INTRO */}
          <p className="text-justify text-[11.5pt] text-slate-900 leading-relaxed mb-4 indent-6">
            Pelo presente instrumento particular de contrato, de um lado a parte qualificada no Item I, doravante denominada simplesmente como <strong>{labelLocador}</strong>, e de outro lado a parte qualificada no Item II, doravante denominada simplesmente como <strong>{labelLocatario}</strong>, têm entre si justo e acordado o presente instrumento, que se regerá pelas cláusulas e condições mutuamente aceitas e especificadas a seguir.
          </p>
        </div>
      )
    },
    {
      id: 'seller',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            I - DO(A) {labelLocador}
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal">
            <p><strong>Nome Completo:</strong> {safeText(vend.nome || 'Não informado')}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(vend.cpf || vend.cnpj || vend.cpfCnpj || 'Não informado')}</p>
            <p><strong>RG:</strong> {safeText(vend.rg || 'Não informado')}</p>
            <p><strong>Estado Civil:</strong> {safeText(vend.estadoCivil || 'Não informado')}</p>
            <p><strong>Telefone:</strong> {safeText(vend.telefone || 'Não informado')}</p>
            <p><strong>Profissão:</strong> {safeText(vend.profissao || 'Não informado')}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(vend.email || 'Não informado')}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(vend)}</p>
          </div>
        </div>
      )
    },
    {
      id: 'buyer',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            II - DO(A) {labelLocatario}
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal">
            <p><strong>Nome Completo:</strong> {safeText(p.nome || contract.nomeCliente || 'Não informado')}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(p.cpf || p.cnpj || p.cpfCnpj || 'Não informado')}</p>
            <p><strong>RG:</strong> {safeText(p.rg || 'Não informado')}</p>
            <p><strong>Estado Civil:</strong> {safeText(p.estadoCivil || 'Não informado')}</p>
            <p><strong>Telefone:</strong> {safeText(p.telefone || 'Não informado')}</p>
            <p><strong>Profissão:</strong> {safeText(p.profissao || 'Não informado')}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(p.email || 'Não informado')}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {formatFullAddress(p)}</p>
          </div>
        </div>
      )
    },
    {
      id: 'property',
      render: () => (
        <div className="section-block mb-4 mt-1 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            III - OBJETO DO CONTRATO (IDENTIFICAÇÃO DO IMÓVEL)
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal">
            <p><strong>Código/Referência:</strong> {safeText(imov.codigoImovel || imov.codigo || imov.id || 'Não informado')}</p>
            <p><strong>Tipo de Imóvel:</strong> {safeText(imov.tipo || imov.categoria || 'Não informado')}</p>
            <p><strong>Finalidade:</strong> {safeText(imov.finalidade || 'Não informado')}</p>
            <p><strong>Status:</strong> {safeText(imov.status || 'Não informado')}</p>
            <p><strong>Área Privativa:</strong> {imov.areaPrivativa || imov.area ? `${safeText(imov.areaPrivativa || imov.area)} m²` : 'Não informada'}</p>
            <p><strong>Dormitórios/Suítes:</strong> {safeText(imov.dormitorios || imov.quartos || '0')} / {safeText(imov.suites || '0')}</p>
            <p className="col-span-2"><strong>Endereço Completo:</strong> {formatFullAddress(imov)}</p>
            <p><strong>Matrícula:</strong> {safeText(imov.matricula || imov.matriculaImovel || 'Não informado')}</p>
            <p><strong>Registro (CRI):</strong> {safeText(imov.cri || imov.criImovel || 'Não informado')}</p>
          </div>
        </div>
      )
    },
    {
      id: 'values',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            IV - DOS VALORES E CONDIÇÕES DA NEGOCIAÇÃO
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal mb-2">
            <p className="col-span-2 text-[12pt] font-bold text-slate-950">
              Valor Total do Contrato: {safeMoney(pag.valorTotal || contract.valorContrato || 0)}
            </p>
            
            {isLocacao ? (
              <>
                <p><strong>Data de Início:</strong> {safeDate(dados.dataInicio)}</p>
                <p><strong>Data de Término:</strong> {safeDate(dados.dataTermino)}</p>
                <p><strong>Check-in / Out:</strong> {safeText(dados.horarioEntrada || '14:00')} / {safeText(dados.horarioSaida || '10:00')}</p>
                <p><strong>Total de Diárias:</strong> {Number(dados.totalDiarias) || 0} diária(s)</p>
                <p><strong>Taxa de Limpeza:</strong> {safeMoney(pag.taxaLimpeza || 0)}</p>
                <p><strong>Caução/Garantia:</strong> {safeMoney(pag.taxaCaucao || 0)}</p>
              </>
            ) : (
              <>
                <p><strong>Sinal de Negócio (Arras):</strong> {safeMoney(pag.valorSinal || pag.entrada || 0)}</p>
                <p><strong>Financiamento Bancário:</strong> {safeMoney(pag.valorFinanciamento || 0)}</p>
                <p><strong>FGTS:</strong> {safeMoney(pag.valorFgts || 0)}</p>
                <p><strong>Parcelamento Direto:</strong> {safeMoney(pag.valorParcelas || 0)}</p>
              </>
            )}
          </div>
          
          {pag.detalhesPagamento && (
            <div className="text-[11.5pt] text-slate-900 leading-normal mb-2">
              <strong>Forma de Pagamento e Detalhes de Quitação:</strong>
              <p className="text-justify whitespace-pre-wrap mt-0.5 text-slate-800 text-[11.5pt]">{pag.detalhesPagamento}</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'clauses_heading_and_clause_1',
      render: () => (
        <div className="section-block w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            V - DAS CLÁUSULAS E CONDIÇÕES CONTRATUAIS
          </h3>
          {isLocacao ? (
            <div className="text-justify text-[11.5pt] leading-normal">
              <p className="font-bold text-slate-950 mb-0.5">CLÁUSULA 1ª - DA DESTINAÇÃO DO IMÓVEL</p>
              <p className="text-slate-800">O imóvel locado destina-se exclusivamente para fins residenciais temporários de temporada, sendo vedada sublocação.</p>
            </div>
          ) : (
            <div className="text-justify text-[11.5pt] leading-normal">
              <p className="font-bold text-slate-950 mb-0.5">CLÁUSULA 1ª - DA IRREVOGABILIDADE</p>
              <p className="text-slate-800">A presente promessa de compra e venda é celebrada em caráter irrevogável e irretratável, obrigando as partes por si e herdeiros.</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'clause_2',
      render: () => (
        <div className="section-block text-justify text-[11.5pt] leading-normal w-full">
          {isLocacao ? (
            <div>
              <p className="font-bold text-slate-950 mb-0.5">CLÁUSULA 2ª - DA CONSERVAÇÃO E VISTORIA</p>
              <p className="text-slate-800">O LOCATÁRIO obriga-se a devolver o imóvel e móveis no mesmo estado de conservação em que os recebeu.</p>
            </div>
          ) : (
            <div>
              <p className="font-bold text-slate-950 mb-0.5">CLÁUSULA 2ª - DA IMISSÃO NA POSSE</p>
              <p className="text-slate-800">A imissão na posse do imóvel dar-se-á mediante a assinatura da escritura pública definitiva e quitação integral dos valores.</p>
            </div>
          )}
        </div>
      )
    }
  ];

  // Dynamic additional clauses blocks
  if (listClauses.length > 0 || customClausesText) {
    const clausesToRender: { title: string; text: string }[] = [];
    listClauses.forEach((c: any, index: number) => {
      clausesToRender.push({
        title: `CLÁUSULA ${index + 3}ª - ${safeText(c.titulo)}`,
        text: c.texto
      });
    });
    
    if (customClausesText) {
      const paragraphs = customClausesText.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
      paragraphs.forEach((p: string, idx: number) => {
        clausesToRender.push({
          title: idx === 0 ? "OUTRAS DISPOSIÇÕES" : "",
          text: p
        });
      });
    }

    if (clausesToRender.length > 0) {
      // First additional clause gets the header + clause rendered together
      blocks.push({
        id: `add_clause_heading_and_0`,
        render: () => (
          <div className="section-block w-full">
            <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
              CLÁUSULAS ADICIONAIS E CONDIÇÕES ESPECIAIS
            </h3>
            <div className="text-justify text-[11.5pt] leading-normal">
              {clausesToRender[0].title && <p className="font-bold text-slate-950 mb-0.5">{clausesToRender[0].title}</p>}
              <p className="text-slate-800">{clausesToRender[0].text}</p>
            </div>
          </div>
        )
      });

      // Subsequent additional clauses get individual blocks
      for (let idx = 1; idx < clausesToRender.length; idx++) {
        const c = clausesToRender[idx];
        blocks.push({
          id: `add_clause_${idx}`,
          render: () => (
            <div className="section-block text-justify text-[11.5pt] leading-normal w-full">
              {c.title && <p className="font-bold text-slate-950 mb-0.5">{c.title}</p>}
              <p className="text-slate-800">{c.text}</p>
            </div>
          )
        });
      }
    }
  }

  // Signature Block
  blocks.push({
    id: 'signatures',
    isSignature: true,
    render: () => (
      <div className="signature-block w-full mt-4">
        <div className="text-right text-[11.5pt] font-medium text-slate-900 mb-8">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-center mt-4">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(vend.nome || 'LOCADOR / VENDEDOR')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">{labelLocador}</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(p.nome || contract.nomeCliente || 'LOCATÁRIO / COMPRADOR')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">{labelLocatario}</div>
          </div>

          <div className="flex flex-col items-center pt-2">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(contract.corretorName || company?.nome || 'IMOBILIÁRIA')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">
              Corretor Credenciado {contract.corretorCreci ? `(CRECI: ${contract.corretorCreci})` : ''}
            </div>
          </div>

          <div className="flex flex-col items-center pt-2">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(company?.nome || 'Menta Negócios Imobiliários')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">
              Imobiliária Intermediadora {company?.creciPj ? `(CRECI PJ: ${company.creciPj})` : ''}
            </div>
          </div>

          {/* Testemunhas */}
          <div className="flex flex-col items-center pt-2">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-500 text-[11.5pt]">
              Assinatura
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">Testemunha 1 (Nome/CPF)</div>
          </div>

          <div className="flex flex-col items-center pt-2">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-500 text-[11.5pt]">
              Assinatura
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">Testemunha 2 (Nome/CPF)</div>
          </div>
        </div>
      </div>
    )
  });

  interface BlockDefinition {
    id: string;
    render: () => React.ReactNode;
    forcePageBreak?: boolean;
    isSignature?: boolean;
  }

  return (
    <A4PaginationContainer
      blocks={blocks}
      company={company}
      RenderHeader={RenderHeader}
      RenderFooter={RenderFooter}
      RenderWatermark={RenderWatermark}
    />
  );
};

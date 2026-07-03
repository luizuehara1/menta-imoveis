import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  safeText, 
  safeMoney, 
  isValidImageUrl
} from '../utils';
import { A4PaginationContainer } from './A4PaginationContainer';

interface VisitReportRendererProps {
  visit: any;
  property: any;
  settings: any;
}

export const VisitReportRenderer: React.FC<VisitReportRendererProps> = ({ visit, property, settings }) => {
  const company = settings?.empresa || {};
  const logoUrl = company?.logoCabecalhoUrl || settings?.aparencia?.logoUrl || '/logo.png';
  
  const addressLine = [
    company?.endereco,
    company?.bairro,
    company?.cidade && company?.estado ? `${company?.cidade}/${company?.estado}` : (company?.cidade || company?.estado),
    company?.cep ? `CEP: ${company?.cep}` : ''
  ].filter(Boolean).join(' - ');

  // Get main property photo
  const getMainImage = () => {
    if (!property) return null;
    const p = property;
    const url = (
      p.mainImage || 
      p.imagemPrincipal || 
      p.capa || 
      p.coverImage || 
      (p.images && p.images.length > 0 ? p.images[0] : null) ||
      (p.fotos && p.fotos.length > 0 ? p.fotos[0] : null) ||
      (p.galeria && p.galeria.length > 0 ? p.galeria[0] : null)
    );
    return url;
  };

  const mainImage = getMainImage();

  // Common Header component for pages
  const RenderHeader = () => (
    <div className="pdf-header flex items-center justify-between border-b border-slate-300 pb-3 mb-4 gap-6 select-none">
      {logoUrl && isValidImageUrl(logoUrl) ? (
        <img 
          src={logoUrl} 
          alt={safeText(company?.nome)} 
          className="h-14 w-auto object-contain shrink-0" 
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center text-[8px] text-slate-400">LOGO</div>
      )}
      <div className="text-right text-[9.5pt] text-slate-600 leading-normal font-medium">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-0.5">
          {safeText(company?.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
        </h2>
        <p className="m-0 text-[8.5pt]">
          {company?.razaoSocial ? `${safeText(company.razaoSocial)} | ` : ''}
          {company?.cnpj ? `CNPJ: ${safeText(company.cnpj)}` : ''}
          {company?.creciPj ? ` | CRECI PJ: ${safeText(company.creciPj)}` : ''}
        </p>
        <p className="m-0 text-[8.5pt]">
          {company?.telefone ? `Tel/Whats: ${safeText(company.telefone)}` : ''}
          {company?.email ? ` | E-mail: ${safeText(company.email)}` : ''}
          {company?.site ? ` | Site: ${safeText(company.site)}` : ''}
        </p>
      </div>
    </div>
  );

  // Common Footer component for pages
  const RenderFooter: React.FC<{ pageNumber: number; totalPages: number }> = ({ pageNumber, totalPages }) => (
    <div className="pdf-footer pt-3 border-t border-slate-300 flex items-start justify-between text-[9pt] text-slate-500 leading-normal select-none">
      <div className="max-w-[75%]">
        <p className="font-bold text-slate-800 m-0 text-[9.5pt]">
          {safeText(company?.nome)} | CNPJ: {safeText(company?.cnpj)} | CRECI PJ: {safeText(company?.creciPj)}
        </p>
        <p className="m-0 text-slate-400 text-[8.5pt]">
          {addressLine ? `${addressLine}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className="block font-bold text-slate-700">Página {pageNumber} de {totalPages}</span>
        <span className="text-[8pt] text-slate-400">Emitido em {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
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
          <div className="text-center my-4">
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-950">
              FICHA DE VISITA E ATENDIMENTO DE CLIENTE
            </h1>
          </div>

          {/* INTRO */}
          <p className="text-justify text-[11.5pt] text-slate-900 leading-relaxed mb-4 indent-6">
            Pelo presente termo de visita, o visitante qualificado no Item I declara ter visitado, nesta data, sob a intermediação exclusiva da imobiliária qualificada no cabeçalho, acompanhado pelo corretor de imóveis credenciado, o imóvel descrito no Item II, assumindo o compromisso de idoneidade e confidencialidade sobre as informações recebidas.
          </p>
        </div>
      )
    },
    {
      id: 'visitor',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            I - IDENTIFICAÇÃO DO VISITANTE
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal">
            <p><strong>Nome do Cliente:</strong> {safeText(visit.nomeCliente || 'Não informado')}</p>
            <p><strong>CPF:</strong> {safeText(visit.cpfCliente || visit.cpf || 'Não informado')}</p>
            <p><strong>RG:</strong> {safeText(visit.rgCliente || visit.rg || 'Não informado')}</p>
            <p><strong>Estado Civil:</strong> {safeText(visit.estadoCivilCliente || 'Não informado')}</p>
            <p><strong>Telefone:</strong> {safeText(visit.telefone || 'Não informado')}</p>
            <p><strong>E-mail:</strong> {safeText(visit.email || 'Não informado')}</p>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {safeText(visit.enderecoCliente || 'Não informado')}</p>
          </div>
        </div>
      )
    },
    {
      id: 'details',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            II - DETALHES DO ATENDIMENTO
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal">
            <p><strong>Data da Visita:</strong> {visit.dataVisita ? format(new Date(visit.dataVisita), "dd/MM/yyyy", { locale: ptBR }) : 'Não informada'}</p>
            <p><strong>Horário:</strong> {safeText(visit.horarioVisita || 'Não informado')}</p>
            <p><strong>Corretor Responsável:</strong> {safeText(visit.nomeCorretor || 'Não informado')}</p>
            <p><strong>CRECI Corretor:</strong> {safeText(visit.creciCorretor || '---')}</p>
          </div>
        </div>
      )
    }
  ];

  if (property) {
    blocks.push({
      id: 'property_visited',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            III - IMÓVEL VISITADO
          </h3>
          
          <div className="grid grid-cols-12 gap-6 items-start mt-2">
            {/* Optional small property photo */}
            {mainImage && isValidImageUrl(mainImage) && (
              <div className="col-span-3">
                <img 
                  src={mainImage} 
                  alt="Property Preview" 
                  className="w-full h-auto object-cover rounded border border-slate-200"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            
            <div className={`${mainImage ? 'col-span-9' : 'col-span-12'} grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5pt] leading-normal`}>
              <p className="col-span-2"><strong>Título do Imóvel:</strong> {safeText(property.title || property.titulo || 'Não informado')}</p>
              <p><strong>Código/Referência:</strong> {safeText(property.code || property.codigo || 'Não informado')}</p>
              <p><strong>Tipo/Categoria:</strong> {safeText(property.propertyType || property.tipo || 'Não informado')}</p>
              <p><strong>Modalidade:</strong> {safeText(property.businessType || 'Venda')}</p>
              <p><strong>Valor Anunciado:</strong> {safeMoney(property.businessType === 'Locação' ? property.priceLocacao : property.priceVenda)}</p>
              <p><strong>Dormitórios/Suítes:</strong> {safeText(property.bedrooms || '0')} quartos / {safeText(property.suites || '0')} suíte(s)</p>
              <p><strong>Vagas de Garagem:</strong> {safeText(property.garageSpaces || '0')}</p>
              <p className="col-span-2"><strong>Endereço do Imóvel:</strong> {safeText(property.address || 'Não informado')}, {safeText(property.neighborhood || '---')}, {safeText(property.city || '---')} - {safeText(property.state || 'SC')}</p>
            </div>
          </div>
        </div>
      )
    });
  }

  blocks.push({
    id: 'agreement',
    render: () => (
      <div className="section-block mb-4 w-full">
        <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-1.5">
          IV - TERMO DE COMPROMISSO E CONFIDENCIALIDADE
        </h3>
        <ol className="list-decimal pl-4 text-[11pt] text-slate-800 space-y-1 text-justify">
          <li>O visitante reconhece que a apresentação do imóvel acima discriminado foi realizada única e exclusivamente pela imobiliária intermediadora qualificada no cabeçalho.</li>
          <li>O visitante obriga-se, sob as penas da lei (Código Civil Brasileiro, Art. 725 a 727), a não realizar transação direta de compra, venda ou locação deste imóvel com seus proprietários ou representantes sem a expressa e formal intermediação da referida imobiliária.</li>
        </ol>
      </div>
    )
  });

  blocks.push({
    id: 'signatures',
    isSignature: true,
    render: () => (
      <div className="signature-block w-full mt-4">
        <div className="text-right text-[11.5pt] font-medium text-slate-900 mb-6">
          {safeText(company?.cidade || 'Balneário Camboriú')}, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-center mt-4">
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(visit.nomeCliente || 'VISITANTE / CLIENTE')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">Cliente Visitante</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full border-t border-slate-400 pt-1 text-slate-900 font-bold text-[11.5pt] truncate">
              {safeText(visit.nomeCorretor || 'CORRETOR CREDENCIADO')}
            </div>
            <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">Corretor de Imóveis</div>
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

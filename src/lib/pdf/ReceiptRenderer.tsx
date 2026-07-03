import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  safeText, 
  safeMoney, 
  isValidImageUrl
} from '../utils';
import { A4PaginationContainer } from './A4PaginationContainer';

interface ReceiptRendererProps {
  receiptData: any;
  type: 'locatario' | 'locador';
  company: any;
}

export const ReceiptRenderer: React.FC<ReceiptRendererProps> = ({ receiptData, type, company }) => {
  const isLocatario = type === 'locatario';
  const r = receiptData || {};

  const logoUrl = company?.logoCabecalhoUrl || '/logo.png';
  const addressLine = [
    company?.endereco,
    company?.bairro,
    company?.cidade && company?.estado ? `${company?.cidade}/${company?.estado}` : (company?.cidade || company?.estado),
    company?.cep ? `CEP: ${company?.cep}` : ''
  ].filter(Boolean).join(' - ');

  const title = isLocatario ? "RECIBO DE PAGAMENTO (LOCATÁRIO)" : "RECIBO DE REPASSE (LOCADOR)";

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
              {title}
            </h1>
          </div>

          {/* RECEIPT CONTENT */}
          <div className="section-block mb-4 text-[11.5pt] leading-relaxed text-justify">
            <p className="indent-6">
              Declaramos para os devidos fins que, em relação ao contrato de locação do imóvel localizado no endereço <strong>{safeText(r.enderecoImovel || 'Não informado')}</strong> (Código: {safeText(r.codigoImovel || '---')}), {isLocatario ? 'recebemos de' : 'repassamos para'} <strong>{safeText(r.nomePagadorRecebedor || 'Não informado')}</strong>, inscrito(a) sob o CPF/CNPJ <strong>{safeText(r.cpfCnpj || '---')}</strong>, a importância total líquida de <strong>{safeMoney(r.valorTotal || 0)}</strong>, conforme o detalhamento discriminado abaixo.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'property_details',
      render: () => {
        if (!isLocatario) return null;
        
        // Helper to format dates safely
        const formatDateString = (dateStr?: string) => {
          if (!dateStr) return '---';
          try {
            // If dateStr is YYYY-MM-DD
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
          } catch (e) {
            return dateStr;
          }
        };

        const tipoText = [r.tipoImovel, r.tituloImovel].filter(Boolean).join(' - ');

        // Format address nicely
        const fullAddressParts = [
          r.enderecoImovel,
          r.numeroImovel ? `Nº ${r.numeroImovel}` : '',
          r.complementoImovel ? `(${r.complementoImovel})` : ''
        ].filter(Boolean).join(', ');

        return (
          <div className="section-block mb-4 w-full">
            <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
              DADOS DO IMÓVEL LOCADO
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11.5pt] leading-relaxed bg-slate-50/30 p-3 rounded-lg border border-slate-200">
              <p><strong>Código:</strong> {safeText(r.codigoImovel || '---')}</p>
              <p><strong>Imóvel:</strong> {safeText(tipoText || '---')}</p>
              <p className="col-span-2"><strong>Endereço:</strong> {safeText(fullAddressParts || r.enderecoImovel || '---')}</p>
              <p><strong>Bairro:</strong> {safeText(r.bairroImovel || '---')}</p>
              <p><strong>Cidade/UF:</strong> {safeText(r.cidadeEstadoImovel || '---')}</p>
              <p><strong>CEP:</strong> {safeText(r.cepImovel || '---')}</p>
              <p className="col-span-2"><strong>Locador:</strong> {safeText(r.nomeLocador || '---')}</p>
              <p className="col-span-2"><strong>Locatário:</strong> {safeText(r.nomeLocatario || '---')}</p>
              
              <div className="col-span-2 border-t border-slate-200 mt-1 pt-1 grid grid-cols-3 gap-2">
                <p><strong>Competência:</strong> {safeText(r.mesReferencia || '---')}</p>
                <p><strong>Data Vencimento:</strong> {formatDateString(r.dataVencimento)}</p>
                <p><strong>Data Pagamento:</strong> {formatDateString(r.dataPagamento)}</p>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      id: 'details',
      render: () => (
        <div className="section-block mb-4 w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            DETALHAMENTO DOS VALORES
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11.5pt] leading-relaxed">
            {Number(r.valorAluguel) > 0 && <p><strong>Valor do Aluguel:</strong> {safeMoney(r.valorAluguel)}</p>}
            {Number(r.valorCondominio) > 0 && <p><strong>Condomínio:</strong> {safeMoney(r.valorCondominio)}</p>}
            {Number(r.valorIptu) > 0 && <p><strong>IPTU:</strong> {safeMoney(r.valorIptu)}</p>}
            {Number(r.valorTaxaLixo) > 0 && <p><strong>Taxa de Lixo:</strong> {safeMoney(r.valorTaxaLixo)}</p>}
            {Number(r.valorTaxaGas) > 0 && <p><strong>Gás:</strong> {safeMoney(r.valorTaxaGas)}</p>}
            {Number(r.valorTaxaAgua) > 0 && <p><strong>Água:</strong> {safeMoney(r.valorTaxaAgua)}</p>}
            {Number(r.valorTaxaLuz) > 0 && <p><strong>Luz:</strong> {safeMoney(r.valorTaxaLuz)}</p>}
            {Number(r.valorSeguroIncendio) > 0 && <p><strong>Seguro Incêndio:</strong> {safeMoney(r.valorSeguroIncendio)}</p>}
            {Number(r.valorGarantiaCaucao) > 0 && <p><strong>Garantia Caução:</strong> {safeMoney(r.valorGarantiaCaucao)}</p>}
            {Number(r.valorOutros) > 0 && <p><strong>Outras Taxas:</strong> {safeMoney(r.valorOutros)}</p>}
            {Number(r.valorDesconto) > 0 && <p className="text-emerald-700"><strong>Desconto Concedido:</strong> - {safeMoney(r.valorDesconto)}</p>}
            
            {!isLocatario && Number(r.valorComissaoImobiliaria) > 0 && (
              <p className="text-rose-700"><strong>Taxa de Administração (Imobiliária):</strong> - {safeMoney(r.valorComissaoImobiliaria)}</p>
            )}

            <div className="col-span-2 border-t border-slate-300 mt-2 pt-2 grid grid-cols-2">
              <p className="text-[12pt] font-bold text-slate-950">
                Total Pago/Repassado: {safeMoney(r.valorTotal || 0)}
              </p>
              <p><strong>Forma de Recebimento:</strong> {safeText(r.formaPagamento || 'Não informado')}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pix_payment',
      render: () => {
        if (!isLocatario) return null;
        return (
          <div className="section-block mb-4 w-full border border-slate-300 rounded-xl p-4 bg-slate-50/50">
            <h4 className="text-[11pt] font-bold text-slate-950 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              INFORMAÇÕES DE PAGAMENTO - VIA PIX
            </h4>
            <div className="flex gap-6 items-center">
              <div className="flex-1 text-[11pt] text-slate-800 leading-relaxed">
                <p className="mb-2">
                  Para efetuar o pagamento do seu aluguel com agilidade e total segurança, abra o aplicativo do seu banco de preferência, selecione a opção <strong>Pagar com Pix / Ler QR Code</strong> e aponte a câmera para o código ao lado.
                </p>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 my-3 inline-block">
                  <p className="m-0 text-[10.5pt]">
                    <strong>Chave PIX (CNPJ):</strong> <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded select-all">63.572.479/0001-50</span>
                  </p>
                </div>
                <p className="text-[9.5pt] text-slate-500 font-medium italic">
                  * Certifique-se de conferir os dados, o beneficiário e o valor final antes de confirmar a transferência bancária.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center shrink-0 border border-slate-200 rounded-2xl bg-white p-4 shadow-sm w-44">
                <p className="text-[8.5pt] font-extrabold text-slate-700 uppercase tracking-wider mb-2.5 text-center leading-none">
                  QR CODE PIX
                </p>
                <div className="w-32 h-32 flex items-center justify-center overflow-hidden bg-slate-50 rounded-lg border border-slate-100">
                  <img 
                    src="https://i.postimg.cc/DfC6y2PQ/Design-sem-nome-(2).png"
                    alt="QR Code PIX para Pagamento"
                    className="w-full h-full object-contain block mx-auto"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  ];

  if (r.observacoes || r.textoExtra || r.garantiaLocaticia) {
    blocks.push({
      id: 'additional',
      render: () => (
        <div className="section-block mb-4 text-[11.5pt] leading-relaxed w-full">
          <h3 className="text-[11.5pt] font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-2">
            INFORMAÇÕES ADICIONAIS
          </h3>
          {r.garantiaLocaticia && <p className="mb-1"><strong>Garantia Locatícia vinculada:</strong> {safeText(r.garantiaLocaticia)}</p>}
          {r.observacoes && <p className="text-justify text-slate-700 mt-1 whitespace-pre-wrap">{r.observacoes}</p>}
          {r.textoExtra && <p className="text-justify text-slate-700 mt-1 whitespace-pre-wrap">{r.textoExtra}</p>}
        </div>
      )
    });
  }

  blocks.push({
    id: 'signatures',
    isSignature: true,
    render: () => (
      <div className="signature-block w-full mt-4">
        <div className="text-right text-[11.5pt] font-medium text-slate-900 mb-6">
          {safeText(r.cidadeData || 'Balneário Camboriú, SC')}, {r.dataPagamento ? format(new Date(r.dataPagamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>

        <div className="flex flex-col items-center justify-center text-center mt-6">
          <div className="w-[300px] border-t border-slate-400 pt-1.5 text-slate-900 font-bold text-[11.5pt] truncate">
            {safeText(r.emitenteAssinatura || company?.nome || 'Menta Negócios Imobiliários')}
          </div>
          <div className="text-[8.5pt] text-slate-500 uppercase tracking-wider">
            {isLocatario ? 'Imobiliária Emitente' : 'Responsável pelo Repasse'}
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

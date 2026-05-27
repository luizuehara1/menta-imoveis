import React from 'react';
import { Contract, ContractType } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, isValidImageUrl, safeText, safeMoney, safeDate } from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';

interface ContractA4PreviewProps {
  contract: Contract;
  printRef?: React.RefObject<HTMLDivElement>;
}

export const ContractA4Preview: React.FC<ContractA4PreviewProps> = ({ contract, printRef }) => {
  const { tipoContrato, dados } = contract;
  const { settings } = useSettings();
  const empresa = settings.empresa;

  const isCompact = tipoContrato !== 'locacao_temporaria';

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
            className="h-20 w-auto object-contain shrink-0" 
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-grow text-right text-[9px] text-gray-700 font-bold uppercase tracking-widest leading-normal">
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
            {empresa.site ? ` | ${safeText(empresa.site)}` : ''}
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
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-grow text-right">
          <h2 className="company-name text-primary-black uppercase leading-none mb-1">
            {safeText(empresa.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS')}
          </h2>
          <div className="company-info">
            {empresa.razaoSocial && <span className="block mb-0.5 font-bold uppercase">{safeText(empresa.razaoSocial)}</span>}
            <p className="m-0 text-gray-500">
              {empresa.cnpj ? `CNPJ: ${safeText(empresa.cnpj)}` : ''}
              {empresa.creciPj ? ` | CRECI PJ: ${safeText(empresa.creciPj)}` : ''}
              {addressLine ? ` | ${addressLine}` : ''}
            </p>
            <p className="m-0 text-gray-500">
              {empresa.telefone ? `Tel: ${safeText(empresa.telefone)}` : ''}
              {empresa.email ? ` | ${safeText(empresa.email)}` : ''}
              {empresa.site ? ` | ${safeText(empresa.site)}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = (pageNumber: number, totalPages?: number) => {
    const footerCustom = empresa.rodapeContratos || '';
    return (
      <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between text-[8px] text-gray-400 font-medium w-full">
        <div className="max-w-[75%] leading-tight">
          <p className="font-bold text-gray-500 mb-0.5">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)} • {safeText(empresa.site)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[8px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-500 font-bold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
          <p>Emitido por Menta Imóveis</p>
        </div>
      </div>
    );
  };

  const renderCompactFooter = (pageNumber: number, totalPages?: number) => {
    const footerCustom = empresa.rodapeContratos || '';
    return (
      <div className="pdf-footer">
        <div className="max-w-[75%] leading-tight text-left">
          <p className="font-bold text-gray-500 mb-0.5 animate-pulse text-gray-400">
            {footerCustom || `${safeText(empresa.nome)} | CNPJ: ${safeText(empresa.cnpj)} | CRECI PJ: ${safeText(empresa.creciPj)}`}
          </p>
          <p>{safeText(empresa.razaoSocial)} • {safeText(empresa.endereco)} • {safeText(empresa.site)}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[8px] uppercase tracking-widest opacity-60">
          <div className="px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100 text-gray-500 font-bold">
            Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
          </div>
          <p>Emitido por Menta Imóveis</p>
        </div>
      </div>
    );
  };

  const renderWatermark = () => {
    const url = empresa.marcaDaguaUrl || '/watermark.png';
    if (isCompact) {
      return (
        <div className="pdf-watermark">
          <img 
            src={url} 
            alt="Marca d'água" 
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = '/watermark.png';
            }}
          />
        </div>
      );
    }
    return (
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden z-0">
        {[0, 1, 2, 3, 4, 5].map((pageIndex) => (
          <div 
            key={pageIndex}
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{ 
              top: `${pageIndex * 297}mm`, 
              height: '297mm',
              opacity: 0.06 
            }}
          >
            <img 
              src={url} 
              alt="Marca d'água" 
              className="w-[85%] max-w-[650px] h-auto object-contain"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/watermark.png';
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderClausulasSelecionadas = () => {
    const list = dados.clausulasSelecionadas || [];
    if (list.length === 0) return null;

    return (
      <section className="section prevent-page-break mt-4 pt-3 border-t border-gray-150">
        <h3 className="section-title text-[9.5px] uppercase font-black text-black">Cláusulas e Condições Gerais</h3>
        <div className="space-y-3 mt-2">
          {list.map((c: any, idx: number) => (
            <div key={c.id || idx} className="text-justify leading-relaxed text-[9px] text-gray-800">
              <p className="font-bold mb-0.5">Cláusula {idx + 1}ª - {c.titulo}:</p>
              <p className="whitespace-pre-wrap pl-2 border-l border-gold/20">{safeText(c.texto)}</p>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderLocacaoTemporaria = () => {
    const l = dados.locador || {};
    const t = dados.locatario || {};
    const i = dados.imovel || {};
    const p = dados.prazo || {};
    const v = dados.valores || {};
    const r = dados.regras || {};
    const a = dados.assinaturas || {};

    // Standardize commissions
    const percComissao = v.percentualComissaoImobiliaria ?? 20;
    const valorComissao = v.valorComissaoImobiliaria ?? ((Number(v.valorTotalLocacao) || 0) * percComissao / 100);
    const valorRepasse = v.valorRepassadoProprietario ?? v.valorRepasseLocador ?? ((Number(v.valorTotalLocacao) || 0) - valorComissao);

    return (
      <div className="space-y-3 text-black font-sans leading-relaxed text-[10.5px] relative z-10">
        <div className="text-center space-y-0.5 mb-2">
          <h1 className="text-sm font-bold uppercase tracking-tight border-b border-gray-100 pb-1">CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL</h1>
        </div>

        <p className="text-justify indent-6 leading-normal">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>

        {/* SECTION I - LOCADOR */}
        <section className="space-y-1">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">I - Dados do Locador (Proprietário)</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Nome/Razão Social:</strong> {safeText(l.nome)}</p>
            <div className="flex gap-4">
              <p><strong>CPF/CNPJ:</strong> {safeText(l.cpfCnpj || l.cpf || l.cnpj)}</p>
              <p><strong>RG/IE:</strong> {safeText(l.rgIe || l.rg)}</p>
            </div>
            <div className="flex gap-4">
              <p><strong>Telefone:</strong> {safeText(l.telefone || l.phone)}{l.whatsapp ? ` / WhatsApp: ${safeText(l.whatsapp)}` : ''}</p>
              <p><strong>E-mail:</strong> {safeText(l.email)}</p>
            </div>
            <p className="col-span-2"><strong>Endereço:</strong> {safeText(l.endereco || 'Não informado')}{l.cep ? ` - CEP: ${safeText(l.cep)}` : ''}{l.cidade ? ` - ${safeText(l.cidade)}/${safeText(l.estado || '')}` : ''}</p>
            <p className="col-span-2"><strong>Dados Bancários para Repasse:</strong> {safeText(l.dadosBancarios || l.banco || 'Não informado')}</p>
            <div className="flex gap-4">
              <p><strong>Comissão Imobiliária:</strong> {percComissao}% ({safeMoney(valorComissao)})</p>
              <p><strong>Valor Líquido de Repasse:</strong> {safeMoney(valorRepasse)}</p>
            </div>
            <div className="flex gap-4 text-gray-500">
              <p><strong>Data Prevista de Repasse:</strong> {safeDate(v.dataPrevistaRepasseLocador || p.dataPrevistaRepasse || 'Não definida')}</p>
              <p><strong>Status do Repasse:</strong> <span className="uppercase font-bold text-xs">{safeText(v.statusRepasseLocador || 'pendente')}</span></p>
            </div>
          </div>
        </section>

        {/* SECTION II - LOCATÁRIO */}
        <section className="space-y-1">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">II - Dados do Locatário (Hóspede/Inquilino)</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(t.nome)}</p>
            <div className="flex gap-4">
              <p><strong>CPF:</strong> {safeText(t.cpf || t.documento)}</p>
              <p><strong>RG:</strong> {safeText(t.rg)}</p>
            </div>
            <div className="flex gap-4">
              <p><strong>Telefone:</strong> {safeText(t.telefone || t.celular || t.phone)}{t.whatsapp ? ` / WhatsApp: ${safeText(t.whatsapp)}` : ''}</p>
              <p><strong>E-mail:</strong> {safeText(t.email)}</p>
            </div>
            <p className="col-span-2"><strong>Endereço Residencial:</strong> {safeText(t.endereco || 'Não informado')}{t.cep ? ` - CEP: ${safeText(t.cep)}` : ''}{t.cidade ? ` - ${safeText(t.cidade)}/${safeText(t.estado || '')}` : ''}</p>
            <div className="flex gap-4">
              <p><strong>Status Pagamento Locatário:</strong> <span className="uppercase font-bold text-xs">{safeText(v.statusPagamentoLocatario || 'pendente')}</span></p>
              <p><strong>Saldo em Aberto Locatário:</strong> {safeMoney(v.saldoAbertoLocatario || 0)}</p>
            </div>
          </div>
        </section>

        {/* SECTION II.1 - FIADOR (Opcional - Se Houver) */}
        {dados.fiador?.nome && (
          <section className="space-y-1">
            <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">II.1 - Dados do Fiador</h3>
            <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2">
              <p className="col-span-2"><strong>Nome Completo:</strong> {safeText(dados.fiador.nome)}</p>
              <div className="flex gap-4">
                <p><strong>CPF/CNPJ:</strong> {safeText(dados.fiador.cpfCnpj)}</p>
                <p><strong>Telefone:</strong> {safeText(dados.fiador.telefone)}</p>
              </div>
              <div className="flex gap-4">
                <p><strong>E-mail:</strong> {safeText(dados.fiador.email)}</p>
                <p><strong>Endereço:</strong> {safeText(dados.fiador.endereco || 'Não informado')}</p>
              </div>
            </div>
          </section>
        )}

        {/* SECTION III - IMÓVEL */}
        <section className="space-y-1">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">III - Dados do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Imóvel/Endereço:</strong> {safeText(contract.enderecoImovel)}</p>
            <p><strong>Tipo:</strong> {safeText(i.tipo || 'Não informado')} (Cód: {safeText(i.codigo)})</p>
            <p><strong>Mobiliado:</strong> {safeText(i.mobiliado || 'Sim')}</p>
            {i.itensInclusos && <p className="col-span-2"><strong>Itens inclusos:</strong> {safeText(i.itensInclusos)}</p>}
          </div>
        </section>

        {/* SECTION IV - PRAZO */}
        <section className="space-y-1">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">IV - Prazo da Locação</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2">
            <div className="flex gap-4 col-span-2">
              <p><strong>Início:</strong> {safeDate(p.dataInicio)} às {safeText(p.horarioEntrada || '14:00')}</p>
              <p><strong>Término:</strong> {safeDate(p.dataTermino)} às {safeText(p.horarioSaida || '10:00')}</p>
            </div>
            <p><strong>Duração:</strong> {safeText(p.quantidadeDias || '0')} dias</p>
            <p><strong>Finalidade:</strong> {safeText(p.finalidade || 'Temporada')}</p>
          </div>
        </section>

        {/* SECTION V - VALORES */}
        <section className="space-y-1">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-0.5 border-l-2 border-primary-black text-[9px]">V - Valores e Detalhamento</h3>
          <div className="grid grid-cols-2 gap-y-0.5 gap-x-4 pl-2 bg-gray-50/50 p-1.5 rounded-lg border border-gray-100">
            <p><strong>Valor Diária:</strong> {safeMoney(v.valorDiario)}</p>
            <p><strong>Subtotal Diárias ({safeText(p.quantidadeDias || '0')} dias):</strong> {safeMoney(v.valorTotalLocacao)}</p>
            <p><strong>Taxa de Limpeza:</strong> {safeMoney(v.taxaLimpeza)}</p>
            <p><strong>Caução (Garantia):</strong> {safeMoney(v.taxaCaucao)}</p>
            {Number(v.taxasAdicionais) > 0 && <p><strong>Taxas Adicionais/Outros:</strong> {safeMoney(v.taxasAdicionais)}</p>}
            {Number(v.desconto) > 0 && <p className="text-red-500"><strong>Desconto Especial:</strong> - {safeMoney(v.desconto)}</p>}
            <p className="text-xs font-bold text-primary-black col-span-2 border-t border-gray-200 mt-1 pt-1 flex justify-between">
              <span>VALOR TOTAL PAGO PELO LOCATÁRIO:</span>
              <span>{safeMoney(v.valorFinal)}</span>
            </p>
            <p className="col-span-2 mt-0.5"><strong>Forma de Pagamento:</strong> {safeText(v.formaPagamento)}</p>
            {v.condicoesPagamento && <p className="col-span-2"><strong>Condições:</strong> {safeText(v.condicoesPagamento)}</p>}
          </div>
        </section>
        
        {/* CLAUSES TEXT BASE */}
        <div className="space-y-1.5 text-justify leading-snug">
          <p><strong>Cláusula 1ª - Do Objeto:</strong> O presente contrato tem como objeto a locação temporária do imóvel identificado neste instrumento, destinado exclusivamente à finalidade informada pelas partes.</p>
          <p><strong>Cláusula 2ª - Do Prazo:</strong> A locação terá início na data informada no campo “Data de início” e término na data informada no campo “Data de término”, devendo o LOCATÁRIO desocupar o imóvel até o horário de saída estabelecido.</p>
          <p><strong>Cláusula 3ª - Do Valor:</strong> O LOCATÁRIO pagará ao LOCADOR o valor total informado neste contrato, composto pelo valor da diária, quantidade de dias, taxas adicionais, caução, taxa de limpeza e eventuais descontos.</p>
          <p><strong>Cláusula 4ª - Da Conservação:</strong> O LOCATÁRIO declara receber o imóvel em boas condições de uso e conservação, comprometendo-se a devolvê-lo no mesmo estado, salvo desgastes naturais decorrente do uso normal.</p>
          <p><strong>Cláusula 5ª - Das Regras de Uso:</strong> O LOCATÁRIO compromete-se a respeitar as regras descritas neste contrato, incluindo limites de hóspedes, horários, regras de condomínio, proibição de eventos, animais ou outras condições específicas, quando aplicáveis.</p>
        </div>

        {/* CUSTOM CLAUSES IF ANY */}
        {dados.clausulas && (
           <div className="space-y-1 text-justify pt-1.5 border-t border-gray-100">
             <h3 className="font-bold uppercase text-[9px]">Cláusulas Adicionais</h3>
             <p className="whitespace-pre-wrap leading-normal text-[10px] bg-gray-50/50 p-1.5 rounded">{safeText(dados.clausulas)}</p>
           </div>
        )}

        {renderClausulasSelecionadas()}

        {/* ASSINATURAS */}
        <div className="pt-6 space-y-6">
          <p className="text-right font-medium text-[9.5px]">
            {safeText(contract.local || empresa.cidade || 'Balneário Camboriú')}, {safeText(contract.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </p>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-[9.5px]">
            <div className="border-t border-black pt-1 block text-center">
              <p className="font-bold">{safeText(l.nome || 'LOCADOR')}</p>
              <p className="text-[8px] uppercase text-gray-500">LOCADOR</p>
            </div>
            <div className="border-t border-black pt-1 block text-center">
              <p className="font-bold">{safeText(t.nome || 'LOCATÁRIO')}</p>
              <p className="text-[8px] uppercase text-gray-500">LOCATÁRIO</p>
            </div>
            <div className="border-t border-black pt-1 block text-center col-span-2 max-w-[200px] mx-auto w-full">
              <p className="font-bold text-transparent select-none leading-[1px]">_</p>
              <p className="font-bold text-gray-700">{safeText(empresa.nome)}</p>
              <p className="text-[8px] uppercase text-gray-500">INTERMEDIADORA</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProposta = () => (
    <div className="pdf-compact-content relative z-10 w-full">
      <div className="pdf-document-title">
        PROPOSTA DE COMPRA E VENDA DE IMÓVEL
      </div>

      <section className="section avoid-break">
        <h3 className="section-title">I - Proponente Comprador</h3>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          <p><strong>Nome:</strong> {dados.proponente?.nome || contract.nomeCliente}</p>
          <p><strong>CPF:</strong> {dados.proponente?.cpf}</p>
          <p><strong>RG:</strong> {dados.proponente?.rg}</p>
          <p><strong>Estado Civil:</strong> {dados.proponente?.estadoCivil}</p>
          <p><strong>Profissão:</strong> {dados.proponente?.profissao}</p>
          <p><strong>Telefone:</strong> {dados.proponente?.telefone}{dados.proponente?.whatsapp ? ` / WhatsApp: ${dados.proponente?.whatsapp}` : ''}</p>
          <p className="col-span-2"><strong>E-mail:</strong> {dados.proponente?.email || '---'}</p>
          <p className="col-span-2"><strong>Endereço:</strong> {dados.proponente?.endereco || '---'}{dados.proponente?.cep ? ` - CEP: ${dados.proponente?.cep}` : ''}{dados.proponente?.cidade ? ` - ${dados.proponente?.cidade}/${dados.proponente?.estado || ''}` : ''}</p>
          
          {dados.proponente?.estadoCivil === 'Casado(a)' && (
            <>
              <p><strong>Cônjuge:</strong> {dados.proponente?.conjugeNome}</p>
              <p><strong>CPF Cônjuge:</strong> {dados.proponente?.conjugeCpf}</p>
            </>
          )}
        </div>
      </section>

      <section className="section avoid-break">
        <h3 className="section-title">II - Identificação do Imóvel</h3>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          <p className="col-span-2"><strong>Endereço:</strong> {contract.enderecoImovel}</p>
          <p><strong>Matrícula nº:</strong> {dados.imovel?.matricula}</p>
          <p><strong>CRI:</strong> {dados.imovel?.cri}</p>
          <p><strong>Tipo:</strong> {dados.imovel?.tipo}</p>
          <p className="col-span-2"><strong>Descrição:</strong> {dados.imovel?.descricao}</p>
        </div>
      </section>

      <section className="section prevent-page-break">
        <h3 className="section-title">III - Valor e Forma de Pagamento</h3>
        <div className="space-y-1">
          <p>O proponente oferece pelo imóvel acima descrito o valor de <strong>{formatCurrency(contract.valor)}</strong> ({dados.pagamento?.valorExtenso}).</p>
          {dados.pagamento?.metodos && dados.pagamento.metodos.length > 0 && (
            <div className="leading-tight">
              <p className="font-semibold text-gray-800">Condições de Pagamento de Preferência:</p>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {dados.pagamento?.metodos?.map((m: string) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {dados.pagamento?.outrasCondicoes && (
            <div className="bg-gray-50/50 p-1.5 rounded border border-gray-100/80 mt-1">
              <strong>Outras Condições:</strong> {dados.pagamento.outrasCondicoes}
            </div>
          )}
        </div>
      </section>

      {renderClausulasSelecionadas()}

      <div className="mt-4 text-right font-bold text-[9.5px]">
        {dados.local}, {dados.data}
      </div>

      <div className="pdf-signatures shrink-0">
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {dados.proponente?.nome || contract.nomeCliente}
          </div>
          <div className="pdf-signature-role">Proponente Comprador</div>
        </div>
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {safeText(empresa.nome)}
          </div>
          <div className="pdf-signature-role">Intermediadora / Testemunha</div>
        </div>
      </div>
    </div>
  );

  const renderContraproposta = () => (
    <div className="pdf-compact-content relative z-10 w-full">
      <div className="pdf-document-title">
        CONTRAPROPOSTA DE COMPRA E VENDA
      </div>

      <section className="section avoid-break">
        <h3 className="section-title">I - Identificação do Proprietário Vendedor</h3>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          <p><strong>Nome:</strong> {dados.vendedor?.nome || contract.nomeVendedor}</p>
          <p><strong>CPF:</strong> {dados.vendedor?.cpf}</p>
          <p><strong>RG:</strong> {dados.vendedor?.rg}</p>
          <p><strong>Estado Civil:</strong> {dados.vendedor?.estadoCivil}</p>
          <p><strong>Profissão:</strong> {dados.vendedor?.profissao}</p>
          <p><strong>Telefone:</strong> {dados.vendedor?.telefone}{dados.vendedor?.whatsapp ? ` / WhatsApp: ${dados.vendedor?.whatsapp}` : ''}</p>
          <p className="col-span-2"><strong>E-mail:</strong> {dados.vendedor?.email || '---'}</p>
          <p className="col-span-2"><strong>Endereço:</strong> {dados.vendedor?.endereco || '---'}{dados.vendedor?.cep ? ` - CEP: ${dados.vendedor?.cep}` : ''}{dados.vendedor?.cidade ? ` - ${dados.vendedor?.cidade}/${dados.vendedor?.estado || ''}` : ''}</p>
        </div>
      </section>

      <section className="section avoid-break">
        <h3 className="section-title">II - Referência à Proposta Apresentada</h3>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          <p><strong>Data da Proposta:</strong> {dados.referencia?.dataProposta}</p>
          <p><strong>Nome do Proponente:</strong> {contract.nomeCliente}</p>
          <p className="col-span-2"><strong>Imóvel Referência:</strong> {contract.enderecoImovel}</p>
        </div>
      </section>

      <section className="section prevent-page-break">
        <h3 className="section-title">III - Termos e Condições Adicionais da Contraproposta</h3>
        <div className="space-y-1">
          <p>O proprietário vendedor apresenta contraproposta no valor de <strong>{formatCurrency(contract.valor)}</strong>.</p>
          {dados.termos?.metodos && dados.termos.metodos.length > 0 && (
            <div className="leading-tight">
              <p className="font-semibold text-gray-800">Forma de Pagamento Proposta:</p>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {dados.termos?.metodos?.map((m: string) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {renderClausulasSelecionadas()}

      <div className="mt-4 text-right font-bold text-[9.5px]">
        {dados.local}, {dados.data}
      </div>

      <div className="pdf-signatures shrink-0">
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {dados.vendedor?.nome || contract.nomeVendedor}
          </div>
          <div className="pdf-signature-role">Proprietário Vendedor</div>
        </div>
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {safeText(empresa.nome)}
          </div>
          <div className="pdf-signature-role">Intermediadora / Testemunha</div>
        </div>
      </div>
    </div>
  );

  const renderAceite = () => (
    <div className="pdf-compact-content relative z-10 w-full bg-white">
      <div className="pdf-document-title">
        ACEITE DE TERMOS DE PROPOSTA
      </div>

      <section className="section avoid-break">
        <h3 className="section-title">I - Identificação da Parte que Manifesta o Aceite</h3>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          <p><strong>Nome Completo:</strong> {dados.aceitante?.nome || '---'}</p>
          <p><strong>CPF:</strong> {dados.aceitante?.cpf || '---'}</p>
          <p><strong>RG:</strong> {dados.aceitante?.rg || '---'}</p>
          <p><strong>Estado Civil:</strong> {dados.aceitante?.estadoCivil || '---'}</p>
          <p><strong>Profissão:</strong> {dados.aceitante?.profissao || '---'}</p>
          <p><strong>Telefone:</strong> {dados.aceitante?.telefone || '---'}{dados.aceitante?.whatsapp ? ` / WhatsApp: ${dados.aceitante?.whatsapp}` : ''}</p>
          <p className="col-span-2"><strong>E-mail:</strong> {dados.aceitante?.email || '---'}</p>
          <p className="col-span-2"><strong>Endereço Residencial:</strong> {dados.aceitante?.endereco || '---'}{dados.aceitante?.cep ? ` - CEP: ${dados.aceitante?.cep}` : ''}{dados.aceitante?.cidade ? ` - ${dados.aceitante?.cidade}/${dados.aceitante?.estado || ''}` : ''}</p>
        </div>
      </section>

      <section className="section avoid-break">
        <h3 className="section-title">II - Objeto e Efeitos do Aceite</h3>
        <div className="space-y-2">
          <p className="font-bold text-xs p-1.5 bg-gray-50 rounded text-center border border-dashed border-gray-300 uppercase leading-none">
            {dados.objeto?.tipoAceite === 'proposta' 
              ? "ACEITA INTEGRALMENTE A PROPOSTA APRESENTADA" 
              : "ACEITA INTEGRALMENTE A CONTRAPROPOSTA APRESENTADA"}
          </p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
            <p><strong>Valor do Aceite:</strong> {formatCurrency(contract.valor)}</p>
            <p><strong>Data do Documento Base:</strong> {dados.objeto?.dataDocumentoBase}</p>
            <p className="col-span-2"><strong>Imóvel Referência:</strong> {contract.enderecoImovel}</p>
          </div>
        </div>
      </section>

      {renderClausulasSelecionadas()}

      <div className="mt-8 text-right font-bold text-[9.5px]">
        {dados.local}, {dados.data}
      </div>

      <div className="pdf-signatures shrink-0">
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {dados.aceitante?.nome}
          </div>
          <div className="pdf-signature-role">Assinatura da Parte Aceitante</div>
        </div>
        <div className="flex flex-col justify-end">
          <div className="pdf-signature-line">
            {safeText(empresa.nome)}
          </div>
          <div className="pdf-signature-role">Intermediadora / Testemunha</div>
        </div>
      </div>
    </div>
  );

  const renderArrasConfirmatorios = () => {
    const comp = dados.proponente || {};
    const vend = dados.vendedor || (contract as any).vendedor || {};
    const arr = dados.arras || {};
    const imov = dados.imovel || {};

    return (
      <div className="pdf-compact-content relative z-10 w-full">
        <div className="pdf-document-title font-display font-black text-black">
          CONTRATO DE ARRAS CONFIRMATÓRIAS E COMPROMISSO DE COMPRA E VENDA
        </div>

        {/* COMPRADOR */}
        <section className="section avoid-break">
          <h3 className="section-title">I - Comprador / Proponente</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6">
            <p><strong>Nome:</strong> {safeText(contract.nomeCliente || comp.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(comp.cpf || comp.cpfCnpj || (contract as any).comprador?.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(comp.rg || (contract as any).comprador?.rg || "---")}</p>
            <p><strong>Estado Civil:</strong> {safeText(comp.estadoCivil || (contract as any).comprador?.estadoCivil || "---")}</p>
            <p><strong>Profissão:</strong> {safeText(comp.profissao || (contract as any).comprador?.profissao || "---")}</p>
            <p><strong>Telefone:</strong> {safeText(comp.telefone || (contract as any).comprador?.telefone || "---")}{comp.whatsapp ? ` / WhatsApp: ${safeText(comp.whatsapp)}` : ''}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(comp.email || (contract as any).comprador?.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {safeText(comp.endereco || (contract as any).comprador?.endereco || "---")}{comp.cep ? ` - CEP: ${safeText(comp.cep)}` : ''}{comp.cidade ? ` - ${safeText(comp.cidade)}/${safeText(comp.estado || '')}` : ''}</p>
          </div>
        </section>

        {/* VENDEDOR */}
        <section className="section avoid-break">
          <h3 className="section-title">II - Vendedor / Proprietário</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6">
            <p><strong>Nome:</strong> {safeText(contract.nomeVendedor || vend.nome)}</p>
            <p><strong>CPF/CNPJ:</strong> {safeText(vend.cpf || vend.cpfCnpj || (contract as any).vendedor?.documento || "---")}</p>
            <p><strong>RG:</strong> {safeText(vend.rg || (contract as any).vendedor?.rg || "---")}</p>
            <p><strong>Estado Civil:</strong> {safeText(vend.estadoCivil || (contract as any).vendedor?.estadoCivil || "---")}</p>
            <p><strong>Profissão:</strong> {safeText(vend.profissao || (contract as any).vendedor?.profissao || "---")}</p>
            <p><strong>Telefone:</strong> {safeText(vend.telefone || (contract as any).vendedor?.telefone || "---")}{vend.whatsapp ? ` / WhatsApp: ${safeText(vend.whatsapp)}` : ''}</p>
            <p className="col-span-2"><strong>E-mail:</strong> {safeText(vend.email || (contract as any).vendedor?.email || "---")}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {safeText(vend.endereco || (contract as any).vendedor?.endereco || "---")}{vend.cep ? ` - CEP: ${safeText(vend.cep)}` : ''}{vend.cidade ? ` - ${safeText(vend.cidade)}/${safeText(vend.estado || '')}` : ''}</p>
          </div>
        </section>

        {/* IMÓVEL */}
        <section className="section avoid-break">
          <h3 className="section-title">III - Identificação do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6">
            <p className="col-span-2"><strong>Endereço:</strong> {safeText(contract.enderecoImovel || imov.endereco || "Não informado")}</p>
            <p><strong>Matrícula nº:</strong> {safeText(imov.matricula || "Não informada")}</p>
            <p><strong>CRI:</strong> {safeText(imov.cri || "Não informado")}</p>
            <p><strong>Tipo:</strong> {safeText(imov.tipo || "Não informado")}</p>
            <p className="col-span-2"><strong>Descrição:</strong> {safeText(imov.descricao || imov.titulo || "")}</p>
          </div>
        </section>

        {/* DADOS DAS ARRAS */}
        <section className="section avoid-break">
          <h3 className="section-title">IV - Condições das Arras e do Negócio</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-6 bg-gray-50/50 p-2 rounded border border-gray-100">
            <p><strong>Valor Total do Imóvel:</strong> {safeMoney(arr.valorImovel || contract.valorImovel || contract.valor)}</p>
            <p><strong>Valor das Arras / Sinal:</strong> {safeMoney(arr.valorArras || (contract as any).valorArras)}</p>
            <p><strong>Forma de Pagamento:</strong> {safeText(arr.formaPagamentoArras || (contract as any).formaPagamentoArras || "Não informada")}</p>
            <p><strong>Data do Pagamento:</strong> {safeText(arr.dataPagamentoArras || (contract as any).dataPagamentoArras || "Não informada")}</p>
            <p><strong>Prazo Contrato Definitivo:</strong> {safeText(arr.prazoContratoDefinitivo || (contract as any).prazoContratoDefinitivo || "Não informado")}</p>
            <p><strong>Prazo para Escritura:</strong> {safeText(arr.prazoEscritura || (contract as any).prazoEscritura || "Não informado")}</p>
            {arr.condicoesDevolucao && <p className="col-span-2"><strong>Condições para Devolução:</strong> {safeText(arr.condicoesDevolucao)}</p>}
            {arr.condicoesDesistenciaComprador && <p className="col-span-2"><strong>Desistência do Comprador:</strong> {safeText(arr.condicoesDesistenciaComprador)}</p>}
            {arr.condicoesDesistenciaVendedor && <p className="col-span-2"><strong>Desistência do Vendedor:</strong> {safeText(arr.condicoesDesistenciaVendedor)}</p>}
            {contract.observacoes && <p className="col-span-2"><strong>Observações Adicionais:</strong> {safeText(contract.observacoes)}</p>}
          </div>
        </section>

        {renderClausulasSelecionadas()}

        <div className="mt-4 text-right font-bold text-[9.5px]">
          {safeText(dados.local || 'Balneário Camboriú')}, {safeText(dados.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        </div>

        <div className="pdf-signatures shrink-0">
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line">
              {safeText(contract.nomeCliente || comp.nome || 'COMPRADOR')}
            </div>
            <div className="pdf-signature-role">Comprador</div>
          </div>
          <div className="flex flex-col justify-end">
            <div className="pdf-signature-line">
              {safeText(contract.nomeVendedor || vend.nome || 'VENDEDOR')}
            </div>
            <div className="pdf-signature-role">Vendedor / Proprietário</div>
          </div>
          <div className="flex flex-col justify-end col-span-2 max-w-[200px] mx-auto w-full mt-2">
            <div className="pdf-signature-line">
              {safeText(empresa.nome)}
            </div>
            <div className="pdf-signature-role">Intermediadora / Testemunha</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="contrato-pdf"
      ref={printRef}
      className={`pdf-export bg-white mx-auto print:shadow-none print:m-0 print:p-0 relative flex flex-col ${isCompact ? 'pdf-compact' : ''}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: isCompact ? '28px 42px 36px 42px' : '14mm',
        boxShadow: 'none',
        boxSizing: 'border-box'
      }}
    >
      {renderWatermark()}
      {isCompact ? renderCompactHeader() : renderHeader()}
      
      <div className="flex-grow">
        {tipoContrato === 'proposta' && renderProposta()}
        {tipoContrato === 'contraproposta' && renderContraproposta()}
        {tipoContrato === 'aceite' && renderAceite()}
        {tipoContrato === 'locacao_temporaria' && renderLocacaoTemporaria()}
        {tipoContrato === 'arras_confirmatorios' && renderArrasConfirmatorios()}
      </div>

      {isCompact ? renderCompactFooter(1) : renderFooter(1)}
      
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }

        .pdf-compact p {
          margin: 3px 0 !important;
          line-height: 1.25 !important;
        }
        .pdf-compact h1,
        .pdf-compact h2,
        .pdf-compact h3 {
          margin: 4px 0 6px 0 !important;
          line-height: 1.15 !important;
        }
        .pdf-compact .section {
          margin-bottom: 6px !important;
        }
        .pdf-compact .section-title {
          font-size: 10px !important;
          font-weight: 700 !important;
          margin: 6px 0 4px 0 !important;
          padding-bottom: 2px !important;
          border-bottom: 1px solid #e5e7eb !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .pdf-compact ul {
          margin: 2px 0 2px 12px !important;
          padding: 0 !important;
        }
        .pdf-compact li {
          margin: 1px 0 !important;
        }
        .pdf-compact-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .pdf-compact-header img {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }
        .pdf-compact-header .company-name {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .pdf-compact-header .company-info {
          font-size: 8px;
          line-height: 1.25;
          color: #6b7280;
        }
        .pdf-document-title {
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin: 8px 0 10px 0;
          text-transform: uppercase;
        }
        .pdf-signatures {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .pdf-signature-line {
          border-top: 1px solid #111827;
          padding-top: 4px;
          text-align: center;
          font-size: 9.5px;
          font-weight: 600;
        }
        .pdf-signature-role {
          font-size: 8px;
          color: #6b7280;
          margin-top: 1px;
          text-align: center;
        }
        .pdf-footer {
          position: absolute;
          left: 42px;
          right: 42px;
          bottom: 16px;
          border-top: 1px solid #e5e7eb;
          padding-top: 4px;
          font-size: 8px;
          color: #9ca3af;
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
          opacity: 0.04;
        }
        .pdf-watermark img {
          width: 80%;
          max-width: 580px;
          object-fit: contain;
        }
        .pdf-compact-content {
          font-size: 10px !important;
          line-height: 1.25 !important;
          color: #111827;
        }
        .pdf-compact-content section {
          margin-bottom: 5px !important;
        }
        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>
    </div>
  );
};

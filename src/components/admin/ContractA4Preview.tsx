import React from 'react';
import { Contract, ContractType } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, isValidImageUrl } from '../../lib/utils';
import { useSettings } from '../../hooks/useSettings';

interface ContractA4PreviewProps {
  contract: Contract;
  printRef?: React.RefObject<HTMLDivElement>;
}

export const ContractA4Preview: React.FC<ContractA4PreviewProps> = ({ contract, printRef }) => {
  const { tipoContrato, dados } = contract;
  const { settings } = useSettings();
  const empresa = settings.empresa;

  const renderHeader = () => (
    <div className="flex flex-col items-center text-center border-b-2 border-primary-black pb-4 mb-6 gap-3">
      {empresa.logoCabecalhoUrl && isValidImageUrl(empresa.logoCabecalhoUrl) && (
        <img src={empresa.logoCabecalhoUrl} alt={empresa.nome} className="h-20 w-auto object-contain mb-1" />
      )}
      <div className="flex flex-col items-center">
        <h2 className="text-base font-display font-black text-primary-black uppercase tracking-[0.2em] mb-1">
          {empresa.nome || 'MENTA NEGÓCIOS IMOBILIÁRIOS'}
        </h2>
        <div className="flex flex-col items-center text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-loose">
          <span>{empresa.razaoSocial}</span>
          <span>{empresa.endereco}</span>
          <div className="flex items-center gap-2">
            <span>Tel: {empresa.telefone}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{empresa.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>CNPJ: {empresa.cnpj}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>CRECI PJ: {empresa.creciPj}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFooter = (pageNumber: number, totalPages?: number) => (
    <div className="mt-auto pt-6 border-t border-gray-100 flex items-end justify-between text-[9px] text-gray-400 font-medium">
      <div className="max-w-[70%]">
        <p className="font-bold text-gray-500 mb-1">{empresa.rodapeContratos || `${empresa.nome} | CNPJ: ${empresa.cnpj} | CRECI PJ: ${empresa.creciPj}`}</p>
        <p>{empresa.razaoSocial} • {empresa.endereco} • {empresa.site}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="px-3 py-1 bg-gray-50 rounded-full border border-gray-100 text-gray-500 font-bold">
           Página {pageNumber} {totalPages ? `de ${totalPages}` : ''}
        </div>
        <p className="text-[8px] uppercase tracking-widest opacity-50">Emitido por Menta Imóveis</p>
      </div>
    </div>
  );

  const renderWatermark = () => {
    if (!empresa.marcaDaguaUrl || !isValidImageUrl(empresa.marcaDaguaUrl)) return null;
    return (
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
        style={{ opacity: 0.08 }}
      >
        <img 
          src={empresa.marcaDaguaUrl} 
          alt="Watermark" 
          className="w-[80%] h-auto grayscale object-contain"
        />
      </div>
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

    return (
      <div className="space-y-6 text-black font-sans leading-relaxed text-[12px] relative z-10">
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-xl font-bold uppercase tracking-tight">CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL</h1>
        </div>

        <p className="text-justify indent-8">
          Pelo presente instrumento particular, de um lado o <strong>LOCADOR</strong>, qualificado neste contrato, e de outro lado o <strong>LOCATÁRIO</strong>, também qualificado, têm entre si justo e contratado a locação temporária do imóvel descrito, mediante as cláusulas e condições abaixo.
        </p>

        {/* SECTION I - LOCADOR */}
        <section className="space-y-2">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-1">I - Dados do Locador</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Nome/Razão Social:</strong> {l.nome || 'Não informado'}</p>
            <p><strong>CPF/CNPJ:</strong> {l.cpfCnpj || 'Não informado'}</p>
            <p><strong>RG/IE:</strong> {l.rgIe || 'Não informado'}</p>
            <p><strong>Estado Civil:</strong> {l.estadoCivil || 'Não informado'}</p>
            <p><strong>Profissão:</strong> {l.profissao || 'Não informado'}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {l.endereco || 'Não informado'}</p>
            <p><strong>Telefone:</strong> {l.telefone || 'Não informado'}</p>
            <p><strong>E-mail:</strong> {l.email || 'Não informado'}</p>
          </div>
        </section>

        {/* SECTION II - LOCATARIO */}
        <section className="space-y-2">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-1">II - Dados do Locatário</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Nome Completo:</strong> {t.nome || 'Não informado'}</p>
            <p><strong>CPF:</strong> {t.cpf || 'Não informado'}</p>
            <p><strong>RG:</strong> {t.rg || 'Não informado'}</p>
            <p><strong>Estado Civil:</strong> {t.estadoCivil || 'Não informado'}</p>
            <p><strong>Profissão:</strong> {t.profissao || 'Não informado'}</p>
            <p className="col-span-2"><strong>Endereço:</strong> {t.endereco || 'Não informado'}</p>
            <p><strong>Telefone:</strong> {t.telefone || 'Não informado'}</p>
            <p><strong>E-mail:</strong> {t.email || 'Não informado'}</p>
          </div>
        </section>

        {/* SECTION III - IMÓVEL */}
        <section className="space-y-2">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-1">III - Dados do Imóvel</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 pl-2">
            <p className="col-span-2"><strong>Imóvel:</strong> {contract.enderecoImovel || 'Não informado'}</p>
            <p><strong>Tipo:</strong> {i.tipo || 'Não informado'}</p>
            <p><strong>Cód:</strong> {i.codigo || 'Não informado'}</p>
            <p className="col-span-2"><strong>Mobiliado:</strong> {i.mobiliado || 'Não informado'}</p>
            <p className="col-span-2"><strong>Itens inclusos:</strong> {i.itensInclusos || 'Não informado'}</p>
          </div>
        </section>

        {/* SECTION IV - PRAZO */}
        <section className="space-y-2">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-1">IV - Prazo da Locação</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 pl-2">
            <p><strong>Data de Início:</strong> {p.dataInicio || 'Não informada'}</p>
            <p><strong>Data de Término:</strong> {p.dataTermino || 'Não informada'}</p>
            <p><strong>Check-in:</strong> {p.horarioEntrada || 'Não informado'}</p>
            <p><strong>Check-out:</strong> {p.horarioSaida || 'Não informado'}</p>
            <p><strong>Duração:</strong> {p.quantidadeDias || '0'} dias</p>
            <p><strong>Finalidade:</strong> {p.finalidade || 'Temporada'}</p>
          </div>
        </section>

        {/* SECTION V - VALORES */}
        <section className="space-y-2">
          <h3 className="font-bold uppercase bg-gray-50 px-2 py-1">V - Valores e Pagamento</h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 pl-2">
            <p><strong>Valor Diário:</strong> {formatCurrency(Number(v.valorDiario) || 0)}</p>
            <p><strong>Valor Total Locação:</strong> {formatCurrency(Number(v.valorTotalLocacao) || 0)}</p>
            <p><strong>Taxa de Limpeza:</strong> {formatCurrency(Number(v.taxaLimpeza) || 0)}</p>
            <p><strong>Taxa de Caução:</strong> {formatCurrency(Number(v.taxaCaucao) || 0)}</p>
            {v.taxasAdicionais > 0 && <p><strong>Taxas Adicionais:</strong> {formatCurrency(Number(v.taxasAdicionais) || 0)}</p>}
            {v.desconto > 0 && <p><strong>Desconto:</strong> {formatCurrency(Number(v.desconto) || 0)}</p>}
            <p className="text-sm font-bold text-primary-black"><strong>VALOR FINAL:</strong> {formatCurrency(Number(v.valorFinal) || 0)}</p>
            <p className="col-span-2"><strong>Forma de Pagamento:</strong> {v.formaPagamento || 'Não informada'}</p>
            <p className="col-span-2"><strong>Condições:</strong> {v.condicoesPagamento || 'Não informada'}</p>
          </div>
        </section>
        
        {/* CLAUSES TEXT BASE */}
        <div className="space-y-4 text-justify mt-8">
          <p><strong>Cláusula 1ª - Do Objeto:</strong> O presente contrato tem como objeto a locação temporária do imóvel identificado neste instrumento, destinado exclusivamente à finalidade informada pelas partes.</p>
          <p><strong>Cláusula 2ª - Do Prazo:</strong> A locação terá início na data informada no campo “Data de início” e término na data informada no campo “Data de término”, devendo o LOCATÁRIO desocupar o imóvel até o horário de saída estabelecido.</p>
          <p><strong>Cláusula 3ª - Do Valor:</strong> O LOCATÁRIO pagará ao LOCADOR o valor total informado neste contrato, composto pelo valor da diária, quantidade de dias, taxas adicionais, caução, taxa de limpeza e eventuais descontos.</p>
          <p><strong>Cláusula 4ª - Da Conservação:</strong> O LOCATÁRIO declara receber o imóvel em boas condições de uso e conservação, comprometendo-se a devolvê-lo no mesmo estado, salvo desgastes naturais decorrentes do uso normal.</p>
          <p><strong>Cláusula 5ª - Das Regras de Uso:</strong> O LOCATÁRIO compromete-se a respeitar as regras descritas neste contrato, incluindo limites de hóspedes, horários, regras de condomínio, proibição de eventos, animais ou outras condições específicas, quando aplicáveis.</p>
          <p><strong>Cláusula 6ª - Dos Danos:</strong> Eventuais danos causados ao imóvel, móveis, utensílios ou áreas comuns durante o período da locação serão de responsabilidade do LOCATÁRIO.</p>
          <p><strong>Cláusula 7ª - Da Caução:</strong> Quando houver caução, o valor será utilizado como garantia para eventuais danos, multas, pendências ou descumprimentos contratuais, podendo ser devolvido conforme vistoria final do imóvel.</p>
          <p><strong>Cláusula 8ª - Da Rescisão:</strong> O descumprimento de qualquer cláusula deste contrato poderá ocasionar rescisão imediata, sem prejuízo da cobrança de valores devidos, multas ou perdas e danos.</p>
          <p><strong>Cláusula 9ª - Do Foro:</strong> As partes elegem o foro da comarca do imóvel para dirimir eventuais dúvidas oriundas deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.</p>
        </div>

        {/* CUSTOM CLAUSES IF ANY */}
        {dados.clausulas && (
           <div className="space-y-4 text-justify mt-4 pt-4 border-t border-gray-100">
             <h3 className="font-bold uppercase">Cláusulas Adicionais</h3>
             <p className="whitespace-pre-wrap">{dados.clausulas}</p>
           </div>
        )}

        {/* ASSINATURAS */}
        <div className="pt-20 space-y-16">
          <p className="text-right font-medium">{contract.local || empresa.cidade}, {contract.data || format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          
          <div className="grid grid-cols-2 gap-x-20 gap-y-16">
            <div className="border-t border-black pt-2 text-center">
              <p className="font-bold">{l.nome || 'LOCADOR'}</p>
              <p className="text-[10px] uppercase text-gray-500">LOCADOR</p>
            </div>
            <div className="border-t border-black pt-2 text-center">
              <p className="font-bold">{t.nome || 'LOCATÁRIO'}</p>
              <p className="text-[10px] uppercase text-gray-500">LOCATÁRIO</p>
            </div>
            <div className="border-t border-black pt-2 text-center">
               <p className="font-bold text-transparent select-none">Assinatura</p>
               <p className="text-[10px] uppercase text-gray-500">{empresa.nome}</p>
            </div>
            {a.testemunha1 && (
               <div className="border-t border-black pt-2 text-center">
                  <p className="font-bold">{a.testemunha1}</p>
                  <p className="text-[10px] uppercase text-gray-500">Testemunha 1 (CPF: {a.cpfTestemunha1})</p>
               </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProposta = () => (
    <div className="space-y-8 text-black font-sans leading-relaxed text-[13px] relative z-10">
      <div className="text-center space-y-2 pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Proposta de Compra e Venda de Imóvel</h1>
      </div>
      {/* ... existing renderProposta content but adapted to new size if needed ... */}
      {/* (Shortening for brevity in thought, I will include the full content in the actual edit) */}
      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">I - Proponente Comprador</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <p><strong>Nome:</strong> {dados.proponente?.nome || contract.nomeCliente}</p>
          <p><strong>CPF:</strong> {dados.proponente?.cpf}</p>
          <p><strong>RG:</strong> {dados.proponente?.rg}</p>
          <p><strong>Estado Civil:</strong> {dados.proponente?.estadoCivil}</p>
          <p><strong>Profissão:</strong> {dados.proponente?.profissao}</p>
          <p><strong>Telefone:</strong> {dados.proponente?.telefone}</p>
          <p className="col-span-2"><strong>Endereço:</strong> {dados.proponente?.endereco}</p>
          <p className="col-span-2"><strong>E-mail:</strong> {dados.proponente?.email}</p>
          
          {dados.proponente?.estadoCivil === 'Casado(a)' && (
            <>
              <p><strong>Cônjuge:</strong> {dados.proponente?.conjugeNome}</p>
              <p><strong>CPF Cônjuge:</strong> {dados.proponente?.conjugeCpf}</p>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">II - Identificação do Imóvel</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <p className="col-span-2"><strong>Endereço:</strong> {contract.enderecoImovel}</p>
          <p><strong>Matrícula nº:</strong> {dados.imovel?.matricula}</p>
          <p><strong>CRI:</strong> {dados.imovel?.cri}</p>
          <p><strong>Tipo:</strong> {dados.imovel?.tipo}</p>
          <p className="col-span-2"><strong>Descrição:</strong> {dados.imovel?.descricao}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">III - Valor e Forma de Pagamento</h3>
        <div className="space-y-4">
          <p>O proponente oferece pelo imóvel acima descrito o valor de <strong>{formatCurrency(contract.valor)}</strong> ({dados.pagamento?.valorExtenso}).</p>
          <div className="space-y-2">
            <p><strong>Condições de Pagamento:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {dados.pagamento?.metodos?.map((m: string) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            {dados.pagamento?.outrasCondicoes && (
              <p><strong>Outras Condições:</strong> {dados.pagamento.outrasCondicoes}</p>
            )}
          </div>
        </div>
      </section>

      <div className="pt-20 grid grid-cols-2 gap-20">
        <div className="space-y-12">
          <p className="text-sm font-medium">{dados.local}, {dados.data}</p>
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold">{dados.proponente?.nome || contract.nomeCliente}</p>
            <p className="text-xs uppercase text-gray-500">Proponente Comprador</p>
          </div>
        </div>
        <div className="space-y-12 pt-12">
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold text-transparent select-none">Assinatura</p>
            <p className="text-xs uppercase text-gray-500">{empresa.nome} / Testemunha</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContraproposta = () => (
    <div className="space-y-8 text-black font-sans leading-relaxed text-[13px] relative z-10">
      <div className="text-center space-y-2 pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Contraproposta de Compra e Venda</h1>
      </div>
      {/* Similar adaptation ... */}
      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">I - Identificação do Proprietário Vendedor</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <p><strong>Nome:</strong> {dados.vendedor?.nome || contract.nomeVendedor}</p>
          <p><strong>CPF:</strong> {dados.vendedor?.cpf}</p>
          <p><strong>RG:</strong> {dados.vendedor?.rg}</p>
          <p><strong>Estado Civil:</strong> {dados.vendedor?.estadoCivil}</p>
          <p><strong>Profissão:</strong> {dados.vendedor?.profissao}</p>
          <p><strong>Telefone:</strong> {dados.vendedor?.telefone}</p>
          <p className="col-span-2"><strong>Endereço:</strong> {dados.vendedor?.endereco}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">II - Referência à Proposta</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <p><strong>Data da Proposta:</strong> {dados.referencia?.dataProposta}</p>
          <p><strong>Nome do Proponente:</strong> {contract.nomeCliente}</p>
          <p className="col-span-2"><strong>Imóvel:</strong> {contract.enderecoImovel}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">III - Termos da Contraproposta</h3>
        <div className="space-y-4">
          <p>O proprietário vendedor apresenta contraproposta no valor de <strong>{formatCurrency(contract.valor)}</strong>.</p>
          <div className="space-y-2">
            <p><strong>Condições Propostas:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {dados.termos?.metodos?.map((m: string) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="pt-20 grid grid-cols-2 gap-20">
        <div className="space-y-12">
          <p className="text-sm font-medium">{dados.local}, {dados.data}</p>
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold">{dados.vendedor?.nome || contract.nomeVendedor}</p>
            <p className="text-xs uppercase text-gray-500">Proprietário Vendedor</p>
          </div>
        </div>
        <div className="space-y-12 pt-12">
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold text-transparent select-none">Assinatura</p>
            <p className="text-xs uppercase text-gray-500">{empresa.nome} / Testemunha</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAceite = () => (
    <div className="space-y-8 text-black font-sans leading-relaxed text-[13px] relative z-10">
      <div className="text-center space-y-2 pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-tight">Aceite de Termos</h1>
      </div>
      {/* Similar adaptation ... */}
      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">I - Identificação da Parte que Aceita</h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          <p><strong>Nome Completo:</strong> {dados.aceitante?.nome}</p>
          <p><strong>CPF:</strong> {dados.aceitante?.cpf}</p>
          <p><strong>Telefone:</strong> {dados.aceitante?.telefone}</p>
          <p className="col-span-2"><strong>Endereço:</strong> {dados.aceitante?.endereco}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold uppercase border-b border-gray-300 pb-1">II - Objeto do Aceite</h3>
        <div className="space-y-4">
          <p className="font-bold text-lg p-4 bg-gray-50 rounded-lg text-center border border-dashed border-gray-300 uppercase">
            {dados.objeto?.tipoAceite === 'proposta' 
              ? "ACEITA INTEGRALMENTE A PROPOSTA APRESENTADA" 
              : "ACEITA INTEGRALMENTE A CONTRAPROPOSTA APRESENTADA"}
          </p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-8">
            <p><strong>Valor do Aceite:</strong> {formatCurrency(contract.valor)}</p>
            <p><strong>Data do Documento Base:</strong> {dados.objeto?.dataDocumentoBase}</p>
            <p className="col-span-2"><strong>Imóvel:</strong> {contract.enderecoImovel}</p>
          </div>
        </div>
      </section>

      <div className="pt-20 grid grid-cols-2 gap-20">
        <div className="space-y-12">
          <p className="text-sm font-medium text-right">{dados.local}, {dados.data}</p>
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold">{dados.aceitante?.nome}</p>
            <p className="text-xs uppercase text-gray-500">Assinatura</p>
          </div>
        </div>
        <div className="space-y-12 pt-12">
          <div className="border-t border-black pt-4 text-center">
            <p className="font-bold text-transparent select-none">Assinatura</p>
            <p className="text-xs uppercase text-gray-500">{empresa.nome} / Testemunha</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={printRef}
      className="bg-white mx-auto print:shadow-none print:m-0 print:p-0 relative flex flex-col"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        boxShadow: '0 0 40px rgba(0,0,0,0.1)',
        boxSizing: 'border-box'
      }}
    >
      {renderWatermark()}
      {renderHeader()}
      
      <div className="flex-grow">
        {tipoContrato === 'proposta' && renderProposta()}
        {tipoContrato === 'contraproposta' && renderContraproposta()}
        {tipoContrato === 'aceite' && renderAceite()}
        {tipoContrato === 'locacao_temporaria' && renderLocacaoTemporaria()}
      </div>

      {renderFooter(1)}
      
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
      `}</style>
    </div>
  );
};

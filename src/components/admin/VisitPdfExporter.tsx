import React from 'react';
import { Visit, Property, SiteConfig } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSafeImageUrl, formatOptionWithQuantity, pluralizeLabel } from '../../lib/utils';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  Home, 
  Maximize, 
  Bed, 
  Bath, 
  Car, 
  Info,
  Check,
  Grid,
  Sparkles,
  Waves,
  FileText
} from 'lucide-react';

interface VisitPdfTemplateProps {
  visit: Visit;
  property: Property | null;
  settings: SiteConfig;
}

export const VisitPdfTemplate = React.forwardRef<HTMLDivElement, VisitPdfTemplateProps>(({ visit, property, settings }, ref) => {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null || value === 0) return '---';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Get main image with exhaustive fallbacks
  const getMainImage = () => {
    if (!property) return null;
    const p = property as any;
    const url = (
      p.mainImage || 
      p.imagemPrincipal || 
      p.capa || 
      p.coverImage || 
      (p.images && p.images.length > 0 ? p.images[0] : null) ||
      (p.fotos && p.fotos.length > 0 ? p.fotos[0] : null) ||
      (p.galeria && p.galeria.length > 0 ? p.galeria[0] : null)
    );
    return getSafeImageUrl(url);
  };

  // Safe text handling
  const safeText = (value: any, fallback = '---') => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value.nome || value.label || JSON.stringify(value);
    return String(value);
  };

  const formatCompanyAddress = () => {
    const parts = [
      settings.empresa.endereco,
      settings.empresa.numero ? `Nº ${settings.empresa.numero}` : '',
      settings.empresa.complemento || '',
    ].filter(Boolean).join(', ');
    return safeText(parts, 'Av. Brasil, 2636');
  };

  // Fallback company data
  const company = {
    nome: safeText(settings.empresa.nome, 'Menta Negócios Imobiliários'),
    razaoSocial: safeText(settings.empresa.razaoSocial, 'A & E Negócios Imobiliários Ltda'),
    endereco: formatCompanyAddress(),
    telefone: safeText(settings.empresa.telefone, '(47) 99291-4069'),
    email: safeText(settings.empresa.email, 'contato@mentaimoveis.com.br'),
    cnpj: safeText(settings.empresa.cnpj, '63.572.479/0001-50'),
    creciPj: safeText(settings.empresa.creciPj, '11255PJ'),
    logoUrl: settings.empresa.logoCabecalhoUrl || settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png",
    marcaDaguaUrl: settings.empresa.marcaDaguaUrl || "/watermark.png"
  };

  // List normalization
  const formatList = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean).map((item) => {
        if (typeof item === "string") return item;
        return item.nome || item.label || item.value || item.titulo || item.text || String(item);
      }).filter(Boolean);
    }
    if (typeof value === "object") {
      return Object.entries(value).filter(([, val]) => val === true || val === "true" || val === 1 || val === "Sim").map(([key]) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
      });
    }
    if (typeof value === "string") {
      if (value.includes(",")) return value.split(",").map((item) => item.trim()).filter(Boolean);
      if (value.includes(";")) return value.split(";").map((item) => item.trim()).filter(Boolean);
      return [value];
    }
    return [];
  };

  const normalizeList = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map((item, index) => {
      if (typeof item === "string") {
        const safeName = item.replace(/\s+/g, '-').toLowerCase();
        return { id: `item-${safeName}-${index}`, nome: item };
      }
      return {
        id: item.id || item.value || `${item.nome || item.label || "item"}-${index}`,
        nome: item.nome || item.label || item.value || item.text || String(item)
      };
    });
  };

  const getSafeKey = (item: any, index: number, prefix = "item") => {
    const itemIdentifier = item?.id || item?.nome || item?.label || index;
    return `${prefix}-${itemIdentifier}-${index}`;
  };

  const mainImage = getMainImage();
  const p = property as any;

  const formatCharacteristicPDF = (char: string, property: any) => {
    const allObjects = [
      ...(property?.ambientes || []),
      ...(property?.caracteristicasApartamento || []),
      ...(property?.lazer_objects || []),
      ...(property?.caracteristicasEmpreendimento || []),
      ...(property?.instalacoes_objects || []),
      ...(property?.acabamentos_objects || []),
      ...(property?.localizacao || [])
    ];

    const matched = allObjects.find(
      (o: any) => String(o.label || o.nome || '').trim().toLowerCase() === char.trim().toLowerCase()
    );

    if (matched && matched.quantidade !== undefined && matched.quantidade !== null) {
      const qty = Number(matched.quantidade);
      if (qty > 0) {
        return formatOptionWithQuantity(matched);
      }
    }

    // Fallback to direct field matching
    if (char === 'Dormitórios' && (property?.dormitorios || property?.bedrooms)) {
      const qty = Number(property.dormitorios || property.bedrooms);
      return formatOptionWithQuantity({ label: 'Dormitório', quantidade: qty });
    }
    if (char === 'Suítes' && property?.suites) {
      const qty = Number(property.suites);
      return formatOptionWithQuantity({ label: 'Suíte', quantidade: qty });
    }
    if (char === 'Número de salas' && property?.salas) {
      const qty = Number(property.salas);
      return formatOptionWithQuantity({ label: 'Sala', quantidade: qty });
    }
    if (char === 'Número de vagas' && (property?.vagas || property?.garageSpaces)) {
      const qty = Number(property.vagas || property.garageSpaces);
      return formatOptionWithQuantity({ label: 'Vaga', quantidade: qty });
    }
    if (char === 'Lavabo' && (property?.lavabos || property?.lavabo)) {
      const qty = Number(property.lavabos || property.lavabo);
      return formatOptionWithQuantity({ label: 'Lavabo', quantidade: qty });
    }
    if (char === 'WC social' && property?.bathrooms) {
      const qty = Number(property.bathrooms);
      return formatOptionWithQuantity({ label: 'WC social', quantidade: qty });
    }

    return char;
  };

  const rawCharacteristics = normalizeList(formatList(p?.caracteristicas || p?.features || p?.item || p?.itens));
  const allCharacteristics = rawCharacteristics.map((item) => ({
    ...item,
    nome: formatCharacteristicPDF(item.nome, p)
  }));

  const rawLeisure = normalizeList(formatList(p?.lazer || p?.leisure || p?.comodidades || p?.amenities || p?.areasComuns));
  const allLeisure = rawLeisure.map((item) => {
    const qtyObj = (p?.lazer_objects || p?.caracteristicasEmpreendimento || []).find(
      (o: any) => (o.label || o.nome) === item.nome
    ) || item.nome;
    return {
      ...item,
      nome: formatOptionWithQuantity(qtyObj)
    };
  });

  const allProximities = normalizeList(formatList(p?.proximidades || p?.proximities));
  const allDiferenciais = normalizeList(formatList(p?.diferenciais || p?.extras || p?.facilidades || p?.infraestrutura || p?.opcoesMarcadas));
  
  const rawInstallations = normalizeList(formatList(p?.instalacoes || p?.installations));
  const allInstallations = rawInstallations.map((item) => {
    const qtyObj = (p?.instalacoes_objects || []).find(
      (o: any) => (o.label || o.nome) === item.nome
    ) || item.nome;
    return {
      ...item,
      nome: formatOptionWithQuantity(qtyObj)
    };
  });

  const rawFinishes = normalizeList(formatList(p?.acabamentos || p?.finishes));
  const allFinishes = rawFinishes.map((item) => {
    const qtyObj = (p?.acabamentos_objects || []).find(
      (o: any) => (o.label || o.nome) === item.nome
    );
    const qty = qtyObj?.quantidade;
    return {
      ...item,
      nome: formatOptionWithQuantity(qtyObj || { label: item.nome, quantidade: qty })
    };
  });
  
  const rules = formatList(p?.regras || p?.regrasLocacao);
  const observations = safeText(p?.observacoes || p?.internalNotes || p?.notas, '');
  const description = safeText(property?.fullDescription || property?.shortDescription || p?.description || p?.descricao || p?.descricaoDetalhada || p?.descricaoCurta, '');

  return (
    <div 
      ref={ref}
      className="bg-white p-10 w-[210mm] min-h-[297mm] mx-auto text-primary-black font-sans relative pdf-safe ficha-cliente-pdf"
      style={{ boxSizing: 'border-box', backgroundColor: '#ffffff', height: 'auto' }}
    >
      <style>
        {`
          .pdf-safe, .pdf-safe * {
            color: #111827 !important;
            background-color: transparent !important;
            border-color: #e5e7eb !important;
            box-shadow: none !important;
            text-shadow: none !important;
            page-break-inside: avoid;
          }
          .pdf-safe {
            background-color: #ffffff !important;
          }
          .pdf-safe .bg-primary-black {
            background-color: #111827 !important;
            color: #ffffff !important;
          }
          .pdf-safe .bg-primary-black * {
            color: #ffffff !important;
          }
          .pdf-safe .bg-gold\\/5 {
            background-color: #fcf9f2 !important;
          }
          .pdf-safe .text-gold {
            color: #b45309 !important;
          }
          .pdf-safe .bg-gold {
            background-color: #b45309 !important;
          }
          .pdf-safe .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          .pdf-safe .bg-emerald-50 {
            background-color: #ecfdf5 !important;
          }
          .pdf-safe .text-emerald-700 {
            color: #047857 !important;
          }
          .pdf-safe .border-emerald-100 {
            border-color: #d1fae5 !important;
          }
          .pdf-safe .border-gold\\/20 {
            border-color: #fde68a !important;
          }
          .list-chip {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            padding: 2px 5px;
            background-color: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 4px;
            font-size: 8.5px;
            font-weight: 600;
          }
          .list-chip-gold {
            background-color: #fcf9f2 !important;
            border-color: #fde68a !important;
            color: #b45309 !important;
          }
          .list-chip-emerald {
            background-color: #ecfdf5 !important;
            border-color: #d1fae5 !important;
            color: #047857 !important;
          }
        `}
      </style>
      
      {/* Hidden Watermark for URL retrieval in Visits.tsx */}
      {company.marcaDaguaUrl && (
        <img 
          id="pdf-watermark-source"
          src={company.marcaDaguaUrl} 
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Header */}
      <div className="flex flex-col items-center text-center border-b border-primary-black pb-4 mb-6 gap-2 relative z-10">
        <div className="flex items-center gap-8">
          {company.logoUrl && (
            <img 
              src={company.logoUrl} 
              alt={company.nome} 
              className="h-16 w-auto object-contain" 
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <div className="flex flex-col items-center text-left">
            <h2 className="text-lg font-display font-black text-primary-black uppercase tracking-[0.1em]">
              {company.nome}
            </h2>
            <div className="flex flex-col text-[8px] text-gray-700 font-bold uppercase tracking-widest leading-relaxed">
              <span>{company.razaoSocial} • CNPJ: {company.cnpj}</span>
              <span>{company.endereco} • CRECI PJ: {company.creciPj}</span>
              <div className="flex items-center gap-2">
                <span>Tel: {company.telefone}</span>
                <span>•</span>
                <span>{company.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 w-full">
          <h1 className="text-xl font-display font-black text-primary-black uppercase tracking-[0.2em]">
            FICHA DE ATENDIMENTO DO CLIENTE
          </h1>
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        {/* TOP SECTION: IMAGE & MAIN INFO */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
             <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-gray-100 bg-gray-50 flex items-center justify-center">
                {mainImage ? (
                  <img 
                    src={mainImage} 
                    alt="Property" 
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Home size={32} />
                    <span className="text-[8px] font-black uppercase tracking-widest">SEM FOTO</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-primary-black/80 backdrop-blur-md px-2 py-1 rounded-full">
                  <span className="text-[7px] font-black text-white uppercase tracking-widest">
                    {property?.propertyType || 'Imóvel'}
                  </span>
                </div>
             </div>
          </div>

          <div className="col-span-8 space-y-3">
            <div>
               <span className="text-[8px] font-black text-gold uppercase tracking-[0.2em]">Imóvel Selecionado</span>
               <h2 className="text-2xl font-display font-bold text-primary-black leading-tight line-clamp-2">{safeText(property?.title, 'Título não informado')}</h2>
               <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px] font-bold italic">
                 <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">CÓD: {safeText(property?.code, 'N/I')}</span>
                 <span>•</span>
                 <span>{safeText(property?.businessType, 'Negócio')}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valor de {property?.businessType || 'Negócio'}</p>
                <p className="text-lg font-display font-bold text-primary-black">
                  {formatCurrency(property?.businessType === 'Locação' ? property?.priceLocacao : property?.priceVenda)}
                  {property?.businessType === 'Locação' && <span className="text-xs font-medium"> / mês</span>}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex flex-col justify-center">
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-gray-400 uppercase">Condomínio</span>
                  <span>{formatCurrency(property?.condoFee)}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-gray-400 uppercase">IPTU</span>
                  <span>{formatCurrency(property?.iptu)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
               {[
                 { icon: Maximize, value: `${property?.usefulArea || 0}m²`, label: 'Útil' },
                 { icon: Grid, value: `${property?.areaConstruida || 0}m²`, label: 'Const.' },
                 { icon: Bed, value: property?.bedrooms || 0, label: 'Quartos' },
                 { icon: Car, value: property?.garageSpaces || 0, label: 'Vagas' },
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                    <item.icon size={12} className="text-gold mb-0.5" />
                    <span className="text-xs font-bold text-primary-black leading-none">{item.value}</span>
                    <span className="text-[6px] font-black text-gray-400 uppercase tracking-tighter">{item.label}</span>
                 </div>
               ))}
            </div>

            <div className="flex items-start gap-2 pt-1">
               <MapPin size={14} className="text-gold mt-0.5 shrink-0" />
               <div>
                  <p className="font-bold text-gray-600 text-[10px] leading-tight">
                    {property?.address ? `${property?.address}, ` : ''}
                    {property?.neighborhood ? `${property?.neighborhood}, ` : ''}
                    {property?.city || 'Não informada'} - {property?.state || 'UF'}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* DATA GRID: VISIT & CLIENT */}
        <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-5">
           <div className="space-y-2">
              <div className="flex items-center gap-2 text-gold">
                <User size={14} />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em]">Dados do Interessado</h3>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-2">
                 <div>
                    <p className="text-[7px] font-black text-gray-400 uppercase">Nome Completo</p>
                    <p className="font-bold text-sm text-primary-black leading-tight">{safeText(visit.nomeCliente)}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                       <p className="text-[7px] font-black text-gray-400 uppercase">Contato</p>
                       <p className="font-bold text-xs text-primary-black">{safeText(visit.telefone)}</p>
                    </div>
                    <div>
                       <p className="text-[7px] font-black text-gray-400 uppercase">CPF/Doc</p>
                       <p className="font-bold text-xs text-primary-black">{safeText(visit.clientCpf)}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-2">
              <div className="flex items-center gap-2 text-gold">
                <Calendar size={14} />
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em]">Detalhes da Visita</h3>
              </div>
              <div className="bg-primary-black text-white p-3 rounded-xl space-y-2">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                       <Calendar size={10} className="text-gold" />
                       <span className="font-bold text-[10px]">{visit.date || '---'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Clock size={10} className="text-gold" />
                       <span className="font-bold text-[10px]">{visit.horario || '---'}</span>
                    </div>
                 </div>
                 <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <div>
                       <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Corretor</p>
                       <p className="text-[10px] font-bold text-gold leading-none">{visit.brokerName || 'Atendimento Oficial'}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black uppercase bg-gold text-primary-black px-1.5 py-0.5 rounded-md">{visit.status || 'Confirmada'}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* CHARACTERISTICS & DIFFERENTIALS */}
        {(allLeisure.length > 0 || allCharacteristics.length > 0 || allDiferenciais.length > 0 || allInstallations.length > 0 || allFinishes.length > 0 || allProximities.length > 0) && (
          <div className="space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 text-gold">
              <Sparkles size={14} />
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em]">Características e Diferenciais</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 items-start">
              {allLeisure.length > 0 && (
                <div className="space-y-1.5 col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Waves size={10} className="text-emerald-700" />
                    <h4 className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Lazer e Comodidades</h4>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allLeisure.map((item, i) => (
                      <div key={getSafeKey(item, i, 'leisure')} className="list-chip list-chip-emerald">
                        <Check size={8} />
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allCharacteristics.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Características</h4>
                  <div className="flex flex-wrap gap-1">
                    {allCharacteristics.map((item, i) => (
                      <div key={getSafeKey(item, i, 'char')} className="list-chip">
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allDiferenciais.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Diferenciais</h4>
                  <div className="flex flex-wrap gap-1">
                    {allDiferenciais.map((item, i) => (
                      <div key={getSafeKey(item, i, 'diff')} className="list-chip">
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allInstallations.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Instalações</h4>
                  <div className="flex flex-wrap gap-1">
                    {allInstallations.map((item, i) => (
                      <div key={getSafeKey(item, i, 'inst')} className="list-chip">
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allFinishes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Acabamentos</h4>
                  <div className="flex flex-wrap gap-1">
                    {allFinishes.map((item, i) => (
                      <div key={getSafeKey(item, i, 'finish')} className="list-chip">
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allProximities.length > 0 && (
                <div className="space-y-1.5 col-span-2">
                  <h4 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Proximidades</h4>
                  <div className="flex flex-wrap gap-1">
                    {allProximities.map((item, i) => (
                      <div key={getSafeKey(item, i, 'prox')} className="list-chip list-chip-gold">
                        <MapPin size={8} />
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DESCRIPTION */}
        {description && description.trim() !== '' && (
          <div className="space-y-2 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 text-gold">
               <FileText size={14} />
               <h3 className="text-[9px] font-black uppercase tracking-[0.2em]">Descrição Adicional</h3>
            </div>
            <div className="bg-gray-50/30 p-3 rounded-xl border border-gray-100">
               <p className="text-[9px] text-gray-600 leading-relaxed text-justify whitespace-pre-wrap">
                 {description}
               </p>
            </div>
          </div>
        )}

        {/* RULES AND OBSERVATIONS */}
        {(rules.length > 0 || (observations && observations.trim() !== '')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-5">
            {rules.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[8px] font-black text-red-600 uppercase tracking-widest border-l-2 border-red-500 pl-2">Regras de Locação</h3>
                <div className="flex flex-col gap-1">
                  {rules.map((rule, i) => (
                    <div key={`rule-${i}`} className="flex items-center gap-1.5 bg-red-50/30 text-red-600 px-2 py-1.5 rounded-lg border border-red-100/50 text-[8px] font-bold">
                      <Info size={9} className="shrink-0" />
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {observations && observations.trim() !== '' && (
              <div className="space-y-2">
                <h3 className="text-[8px] font-black text-primary-black uppercase tracking-widest border-l-2 border-gold pl-2">Observações</h3>
                <div className="bg-gold/5 p-3 rounded-lg border border-gold/10 font-medium italic text-gray-500 text-[8px] leading-relaxed">
                  {observations}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SIGNATURES */}
        <div className="pt-8 mt-auto">
           <div className="grid grid-cols-2 gap-8">
              <div className="text-center space-y-2">
                 <div className="border-t border-primary-black/30 w-full pt-2" />
                 <p className="text-[7px] font-black uppercase text-gray-400">Interessado</p>
                 <p className="text-[9px] font-bold text-primary-black leading-none">{safeText(visit.nomeCliente)}</p>
                 <p className="text-[7px] text-gray-400">CPF: {safeText(visit.clientCpf || '---')}</p>
              </div>
              <div className="text-center space-y-2">
                 <div className="border-t border-primary-black/30 w-full pt-2" />
                 <p className="text-[7px] font-black uppercase text-gray-400">Corretor Responsável</p>
                 <p className="text-[9px] font-bold text-primary-black leading-none">{safeText(visit.brokerName, 'Atendimento Oficial')}</p>
                 <p className="text-[7px] text-gray-400">CRECI: {safeText(visit.brokerCreci || '---')}</p>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-1 relative z-10">
          <div className="flex items-center justify-center gap-3 text-[7px] font-black text-gray-400 uppercase tracking-[0.1em]">
            <span>{company.nome}</span>
            <span>•</span>
            <span>CNPJ: {company.cnpj}</span>
            <span>•</span>
            <span>CRECI PJ: {company.creciPj}</span>
          </div>
          <div className="flex justify-between w-full text-[6.5px] font-bold text-gray-300 uppercase tracking-widest px-4">
             <span>Documento gerado em {today} • Sistema Menta Imóveis</span>
             <span className="pagination-info"></span>
          </div>
        </div>
      </div>
    </div>
  );
});

VisitPdfTemplate.displayName = 'VisitPdfTemplate';

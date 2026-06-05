import React from 'react';
import { 
  formatCurrency, 
  normalizeTipoNegocio, 
  getValorMensal, 
  toNumber, 
  isImovelAlugado,
  isImovelVendido
} from '../../lib/utils';

interface PropertyPriceBadgeProps {
  imovel: any;
}

export function PropertyPriceBadge({ imovel }: PropertyPriceBadgeProps) {
  if (!imovel) return null;

  const tipo = normalizeTipoNegocio(imovel.businessType || imovel.tipoNegocio || imovel.tipo_negocio || '');
  const valorVenda = toNumber(imovel.priceVenda || imovel.valorVenda || imovel.valor_venda || 0);
  const valorMensal = getValorMensal(imovel);
  const alugado = isImovelAlugado(imovel);

  if (isImovelVendido(imovel)) {
    return (
      <div className="absolute left-4 bottom-4 bg-[#dc2626] rounded-[10px] p-[10px_14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-10 max-w-[85%] flex flex-col gap-1">
        <strong className="text-white font-extrabold text-[13px] block tracking-wide">
          VENDIDO
        </strong>
      </div>
    );
  }

  // Se tipo = Venda
  if (tipo === 'Venda') {
    return (
      <div className="absolute left-4 bottom-4 bg-[#ffffff] rounded-[10px] p-[10px_14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-10 max-w-[85%] flex flex-col gap-1">
        <strong className="text-[#065f46] font-extrabold text-[13px] block">
          VENDA: {valorVenda > 0 ? formatCurrency(valorVenda) : "Sob consulta"}
        </strong>
      </div>
    );
  }

  // Se tipo = Locação
  if (tipo === 'Locação') {
    return (
      <div className="absolute left-4 bottom-4 bg-[#ffffff] rounded-[10px] p-[10px_14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-10 max-w-[85%] flex flex-col gap-1">
        {alugado ? (
          <strong className="text-[#dc2626] font-extrabold text-[13px] block">
            JÁ ALUGADO
          </strong>
        ) : (
          <strong className="text-[#065f46] font-extrabold text-[13px] block">
            MENSAL: {valorMensal > 0 ? `${formatCurrency(valorMensal)}/mês` : "Sob consulta"}
          </strong>
        )}
      </div>
    );
  }

  // Se tipo = Venda e Locação
  if (tipo === 'Venda e Locação') {
    return (
      <div className="absolute left-4 bottom-4 bg-[#ffffff] rounded-[10px] p-[10px_14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-10 max-w-[85%] flex flex-col gap-1">
        {alugado ? (
          <>
            <strong className="text-[#065f46] font-extrabold text-[13px] block">
              VENDA: {valorVenda > 0 ? formatCurrency(valorVenda) : "Sob consulta"}
            </strong>
            <span className="text-gray-500 text-[10px] leading-tight block font-bold">
              Imóvel alugado atualmente, disponível para venda
            </span>
          </>
        ) : (
          <>
            <strong className="text-[#065f46] font-extrabold text-[13px] block leading-none">
              VENDA: {valorVenda > 0 ? formatCurrency(valorVenda) : "Sob consulta"}
            </strong>
            <span className="text-[#111827] text-[12px] font-bold block leading-none mt-0.5">
              MENSAL: {valorMensal > 0 ? `${formatCurrency(valorMensal)}/mês` : "Sob consulta"}
            </span>
          </>
        )}
      </div>
    );
  }

  return null;
}

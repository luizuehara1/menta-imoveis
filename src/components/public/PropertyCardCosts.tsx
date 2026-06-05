import React from 'react';
import { formatCurrency, getCondominio, getIptuMensal, getTaxaLixoMensal } from '../../lib/utils';

interface PropertyCardCostsProps {
  imovel: any;
  className?: string;
}

export function PropertyCardCosts({ imovel, className = "" }: PropertyCardCostsProps) {
  if (!imovel) return null;

  const condominio = getCondominio(imovel);
  const iptuMensal = getIptuMensal(imovel);
  const lixoMensal = getTaxaLixoMensal(imovel);

  if (condominio === 0 && iptuMensal === 0 && lixoMensal === 0) return null;

  return (
    <div className={`flex gap-3 flex-wrap mt-2 pt-2 border-t border-gray-100 ${className}`}>
      {condominio > 0 && (
        <p className="text-[10px] font-bold text-gray-400">
          Cond: {formatCurrency(condominio)}
        </p>
      )}

      {iptuMensal > 0 && (
        <p className="text-[10px] font-bold text-gray-400">
          IPTU: {formatCurrency(iptuMensal)}/mês
        </p>
      )}

      {lixoMensal > 0 && (
        <p className="text-[10px] font-bold text-gray-400">
          Lixo: {formatCurrency(lixoMensal)}/mês
        </p>
      )}
    </div>
  );
}

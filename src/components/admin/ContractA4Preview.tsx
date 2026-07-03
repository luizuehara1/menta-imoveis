import React from 'react';
import { Contract } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { ProposalRenderer } from '../../lib/pdf/ProposalRenderer';
import { CounterProposalRenderer } from '../../lib/pdf/CounterProposalRenderer';
import { ContractRenderer } from '../../lib/pdf/ContractRenderer';

interface ContractA4PreviewProps {
  contract: Contract;
  printRef?: React.RefObject<HTMLDivElement>;
}

export const ContractA4Preview: React.FC<ContractA4PreviewProps> = ({ contract, printRef }) => {
  const { settings } = useSettings();
  const company = settings?.empresa || {};

  const renderSelectedDocument = () => {
    const tipo = contract?.tipoContrato;
    if (tipo === 'proposta') {
      return <ProposalRenderer contract={contract} company={company} />;
    } else if (tipo === 'contraproposta') {
      return <CounterProposalRenderer contract={contract} company={company} />;
    } else {
      return <ContractRenderer contract={contract} company={company} />;
    }
  };

  return (
    <div 
      id="contrato-pdf" 
      ref={printRef} 
      className="pdf-export-container bg-transparent mx-auto select-none"
      style={{ boxSizing: 'border-box' }}
    >
      {renderSelectedDocument()}
    </div>
  );
};

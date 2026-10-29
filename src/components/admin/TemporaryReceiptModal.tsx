import React, { useRef, useState } from 'react';
import { Printer, Download, X, Share2, CheckCircle2, Building2, Calendar, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TemporaryReceipt } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, formatarDataBR } from '../../lib/utils';
import { SafeImage } from '../ui/SafeImage';

interface TemporaryReceiptModalProps {
  receipt: TemporaryReceipt;
  isOpen: boolean;
  onClose: () => void;
}

export const TemporaryReceiptModal: React.FC<TemporaryReceiptModalProps> = ({ receipt, isOpen, onClose }) => {
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Recibo_${receipt.numeroRecibo.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF do recibo:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*RECIBO DE PAGAMENTO - MENTA NEGÓCIOS IMOBILIÁRIOS*\n` +
      `Número: ${receipt.numeroRecibo}\n` +
      `Data: ${formatarDataBR(receipt.dataEmissao)}\n\n` +
      `Recebemos de: *${receipt.pagadorNome}*` + (receipt.pagadorCpf ? ` (CPF: ${receipt.pagadorCpf})` : '') + `\n` +
      `A quantia de: *${formatCurrency(receipt.valorRecebido)}* (${receipt.valorPorExtenso})\n` +
      `Referente a: ${receipt.descricao}\n` +
      `Imóvel: ${receipt.imovelTitulo} (${receipt.imovelCodigo})\n` +
      `Período: ${receipt.periodoHospedagem}\n` +
      `Forma de Pagamento: ${receipt.formaPagamento}\n` +
      `Valor Total da Reserva: ${formatCurrency(receipt.valorTotalReserva)}\n` +
      `Saldo Restante: ${formatCurrency(receipt.saldoRestante)}\n\n` +
      `Menta Negócios Imobiliários • Balneário Camboriú/SC`;
    
    const phone = (receipt.pagadorTelefone || '').replace(/\D/g, '');
    const url = phone 
      ? `https://wa.me/55${phone.replace(/^55/, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isQuitado = receipt.saldoRestante <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 print:shadow-none print:max-w-none print:w-full print:rounded-none print:border-none print:max-h-none">
        
        {/* Action Header - Hidden on Print */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/80 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-primary-black">Recibo de Pagamento de Locação Temporária</h3>
              <p className="text-xs text-gray-400">Emissão oficial para o consumidor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
              title="Compartilhar pelo WhatsApp"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-primary-black hover:bg-gold/90 text-xs font-black transition-colors shadow-md disabled:opacity-50"
              title="Baixar arquivo PDF direto no dispositivo"
            >
              <Download size={16} />
              <span>{isDownloading ? 'Gerando...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-black text-gold hover:bg-black text-xs font-bold transition-colors shadow-md"
              title="Imprimir ou Salvar PDF"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable A4 Content */}
        <div className="overflow-y-auto p-6 sm:p-12 print:p-8 bg-white flex-grow" ref={printRef}>
          <div className="max-w-3xl mx-auto border-2 border-gold/30 rounded-3xl p-8 sm:p-12 relative overflow-hidden print:border-gray-300 print:p-6 print:rounded-xl">
            
            {/* Header / Imobiliária */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b-2 border-gold/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-black rounded-2xl flex items-center justify-center p-2 border border-gold/30">
                  <SafeImage
                    src={settings.aparencia?.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"}
                    alt={settings.empresa?.nome || "Menta Imóveis"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-display font-black text-primary-black uppercase tracking-tight">
                    {settings.empresa?.razaoSocial || settings.empresa?.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS"}
                  </h1>
                  <p className="text-xs text-gray-500 font-medium">
                    CNPJ: {settings.empresa?.cnpj || "00.000.000/0001-00"} • CRECI: {settings.empresa?.creci || settings.empresa?.creciPj || "Não informado"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {settings.empresa?.endereco || "Balneário Camboriú - SC"} • Tel: {settings.empresa?.telefone || "(47) 99999-9999"}
                  </p>
                </div>
              </div>
              <div className="sm:text-right w-full sm:w-auto p-4 bg-gold/5 rounded-2xl border border-gold/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-gold block">Recibo Nº</span>
                <span className="text-lg font-mono font-bold text-primary-black">{receipt.numeroRecibo}</span>
                <span className="text-xs text-gray-500 block mt-1">Data: {formatarDataBR(receipt.dataEmissao)}</span>
              </div>
            </div>

            {/* Receipt Main Value Banner */}
            <div className="my-8 p-6 rounded-2xl bg-gradient-to-r from-gray-50 via-gold/5 to-gray-50 border border-gold/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-1">Valor Efetivamente Recebido</span>
                <span className="text-3xl font-display font-black text-emerald-700">
                  {formatCurrency(receipt.valorRecebido)}
                </span>
                <p className="text-xs text-gray-600 font-semibold italic mt-1">
                  ({receipt.valorPorExtenso})
                </p>
              </div>
              <div className="sm:text-right">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isQuitado 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  <CheckCircle2 size={14} />
                  {isQuitado ? 'Quitação Integral' : 'Pagamento Parcial'}
                </span>
                <span className="text-[11px] text-gray-500 block mt-2">
                  Forma: <strong>{receipt.formaPagamento}</strong> em {formatarDataBR(receipt.dataPagamento)}
                </span>
              </div>
            </div>

            {/* Declaration Text */}
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed font-normal">
              <p>
                Declaramos para os devidos fins que recebemos de <strong>{receipt.pagadorNome}</strong>
                {receipt.pagadorCpf ? `, inscrito(a) no CPF/MF sob o nº ${receipt.pagadorCpf}` : ''}, 
                a quantia líquida e certa de <strong>{formatCurrency(receipt.valorRecebido)}</strong> ({receipt.valorPorExtenso}), 
                referente a <strong>{receipt.descricao}</strong>.
              </p>

              {/* Property & Stay Box */}
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Imóvel Administrado</span>
                  <p className="font-bold text-primary-black text-sm">{receipt.imovelTitulo}</p>
                  <p className="text-xs text-gray-600">Código: <strong>{receipt.imovelCodigo}</strong></p>
                  {receipt.imovelNomeEdificio && (
                    <p className="text-xs text-gray-600">Edifício: {receipt.imovelNomeEdificio}</p>
                  )}
                  {receipt.imovelEndereco && (
                    <p className="text-xs text-gray-600">{receipt.imovelEndereco}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Período da Hospedagem</span>
                  <p className="font-bold text-primary-black text-sm">{receipt.periodoHospedagem}</p>
                  <p className="text-xs text-gray-600">Duração: <strong>{receipt.quantidadeDiarias} diárias</strong></p>
                  <p className="text-xs text-gray-600">Entrada: {formatarDataBR(receipt.dataEntrada)} • Saída: {formatarDataBR(receipt.dataSaida)}</p>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 px-4 text-gray-700">Valor Total Negociado da Reserva ({receipt.codigoReserva})</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(receipt.valorTotalReserva)}</td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="py-2.5 px-4 font-bold text-emerald-900">
                        Valor Efetivamente Pago / Recebido neste Recibo
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-800 text-sm">
                        {formatCurrency(receipt.valorRecebido)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-gray-700">
                        {isQuitado ? 'Saldo Restante (Quitação Completa)' : 'Saldo Pendente de Pagamento'}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold ${isQuitado ? 'text-gray-500' : 'text-amber-700 font-bold'}`}>
                        {formatCurrency(receipt.saldoRestante)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Clarification Note */}
              <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 italic border-l-4 border-gold">
                {isQuitado ? (
                  <span>
                    Com a liquidação do valor acima, conferimos a plena e geral quitação para a locação temporária especificada.
                  </span>
                ) : (
                  <span>
                    <strong>Atenção:</strong> Este recibo comprova unicamente o recebimento do valor parcial de <strong>{formatCurrency(receipt.valorRecebido)}</strong>, permanecendo o saldo pendente de <strong>{formatCurrency(receipt.saldoRestante)}</strong> a ser adimplido conforme as condições acordadas.
                  </span>
                )}
              </div>
            </div>

            {/* Signature & Date */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="text-center sm:text-left text-xs text-gray-500">
                <p>Balneário Camboriú/SC, {formatarDataBR(receipt.dataEmissao)}.</p>
                <p className="text-[10px] text-gray-400 mt-1">Documento emitido eletronicamente via Sistema Menta Imóveis.</p>
              </div>
              <div className="text-center">
                <div className="w-56 border-b border-primary-black mb-2" />
                <p className="font-bold text-xs uppercase text-primary-black">
                  {settings.empresa?.razaoSocial || settings.empresa?.nome || "MENTA NEGÓCIOS IMOBILIÁRIOS"}
                </p>
                <p className="text-[10px] text-gray-500">Administradora / Emissor</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

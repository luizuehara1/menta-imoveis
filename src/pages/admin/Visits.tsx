import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, updateDoc, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle, 
  XCircle, 
  FileText,
  Search,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Loader2,
  Printer,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Visit, Property } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { useSettings } from '../../hooks/useSettings';
import { VisitPdfTemplate } from '../../components/admin/VisitPdfExporter';

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50">
    <td className="p-8 pl-12">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gray-100" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-2 bg-gray-50 rounded w-20" />
        </div>
      </div>
    </td>
    <td className="p-8">
      <div className="space-y-2">
        <div className="h-2 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-50 rounded w-24" />
      </div>
    </td>
    <td className="p-8">
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-28" />
        <div className="h-3 bg-gray-50 rounded w-20" />
      </div>
    </td>
    <td className="p-8"><div className="h-6 bg-gray-50 rounded-xl w-24" /></td>
    <td className="p-8 pr-12"><div className="h-10 bg-gray-50 rounded-2xl w-28 ml-auto" /></td>
  </tr>
);

export default function AdminVisits() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todas');
  
  // Confirmation Modal Fields
  const [brokerData, setBrokerData] = useState({ name: '', creci: '', phone: '' });
  const [clientData, setClientData] = useState({ cpf: '' });

  const { settings } = useSettings();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<{ visit: Visit | null, property: Property | null }>({
    visit: null,
    property: null
  });

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'visitas'));
      setVisits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'visitas', id), { status });
      setVisits(visits.map(v => v.id === id ? { ...v, status } : v));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const debugOklabColors = (el: HTMLElement) => {
    const allElements = [el, ...Array.from(el.querySelectorAll("*"))];
    allElements.forEach((elem) => {
      const computed = window.getComputedStyle(elem);
      const props = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor"
      ];
      props.forEach((prop) => {
        const value = (computed as any)[prop];
        if (
          value &&
          (
            value.includes("oklab") ||
            value.includes("oklch") ||
            value.includes("color-mix")
          )
        ) {
          console.warn("Cor incompatível encontrada no PDF:", {
            tagName: elem.tagName,
            id: elem.id,
            prop,
            value,
            className: elem.className
          });
        }
      });
    });
  };

  const sanitizePdfColors = (el: HTMLElement) => {
    if (!el) return;
    const allElements = [el, ...Array.from(el.querySelectorAll("*"))];
    allElements.forEach((elem) => {
      const htmlEl = elem as HTMLElement;
      htmlEl.style.color = "#111827";
      htmlEl.style.backgroundColor = htmlEl.style.backgroundColor || "transparent";
      htmlEl.style.borderColor = "#e5e7eb";
      htmlEl.style.boxShadow = "none";

      const computed = window.getComputedStyle(htmlEl);
      const props = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "outlineColor",
        "textDecorationColor"
      ];

      props.forEach((prop) => {
        const value = (computed as any)[prop];
        if (
          value &&
          (
            value.includes("oklab") ||
            value.includes("oklch") ||
            value.includes("color-mix")
          )
        ) {
          (htmlEl.style as any)[prop] = prop === "backgroundColor"
            ? "#ffffff"
            : "#111827";
        }
      });
    });
  };

  const generatePDF = async (visit: Visit, action: 'download' | 'print' | 'preview' = 'download') => {
    setGeneratingPdf(visit.id || 'new');

    const company = {
      nome: settings?.empresa?.nome || 'Menta Negócios Imobiliários',
      razaoSocial: settings?.empresa?.razaoSocial || 'A & E Negócios Imobiliários Ltda',
      endereco: settings?.empresa?.endereco || 'Av. Brasil, 2636',
      telefone: settings?.empresa?.telefone || '(47) 99291-4069',
      email: settings?.empresa?.email || 'contato@mentaimoveis.com.br',
      cnpj: settings?.empresa?.cnpj || '63.572.479/0001-50',
      creciPj: settings?.empresa?.creciPj || '11255PJ'
    };
    
    try {
      // Fetch Property Data
      let propertyData = null;
      if (visit.imovelId) {
        const propSnap = await getDoc(doc(db, 'imoveis', visit.imovelId));
        if (propSnap.exists()) {
          propertyData = { id: propSnap.id, ...propSnap.data() } as Property;
        }
      }

      // Set data for template
      setPdfData({ visit, property: propertyData });

      // Wait for state to update and images to load in the template
      // We use a longer timeout to ensure images are rendered for html2canvas
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (pdfRef.current) {
        debugOklabColors(pdfRef.current);
        sanitizePdfColors(pdfRef.current);
        try {
          const canvas = await html2canvas(pdfRef.current, {
            scale: 2, // Higher quality
            useCORS: true, // Allow external images
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true,
                    onclone: (clonedDoc) => {
                       const pdfElement = clonedDoc.querySelector(".ficha-cliente-pdf") as HTMLElement;
                       const watermarkSource = clonedDoc.getElementById("pdf-watermark-source") as HTMLImageElement;

                       if (pdfElement && watermarkSource?.src) {
                          const containerHeight = pdfElement.offsetHeight;
                          const pageHeightPx = (297 * pdfElement.offsetWidth) / 210; // Calculate A4 height in pixels based on current width
                          const numPages = Math.ceil(containerHeight / pageHeightPx);

                          for (let i = 0; i < numPages; i++) {
                            const watermarkImg = clonedDoc.createElement('img');
                            watermarkImg.src = watermarkSource.src;
                            watermarkImg.style.position = 'absolute';
                            watermarkImg.style.top = `${(i * pageHeightPx) + (pageHeightPx / 2)}px`;
                            watermarkImg.style.left = '50%';
                            watermarkImg.style.transform = 'translate(-50%, -50%)';
                            watermarkImg.style.opacity = '0.04';
                            watermarkImg.style.width = '100mm';
                            watermarkImg.style.zIndex = '0';
                            watermarkImg.style.pointerEvents = 'none';
                            pdfElement.insertBefore(watermarkImg, pdfElement.firstChild);
                          }

                          // Fix for OKLCH and other modern CSS colors that html2canvas doesn't support
                          const allElements = pdfElement.querySelectorAll("*");
                          allElements.forEach((el) => {
                             const htmlEl = el as HTMLElement;
                             const style = window.getComputedStyle(el);
                             const properties = ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke'];
                             
                             properties.forEach(prop => {
                               const value = (style as any)[prop];
                               if (value && (
                                 value.includes("oklab") || 
                                 value.includes("oklch") || 
                                 value.includes("color-mix") || 
                                 value.includes("lab(") || 
                                 value.includes("lch(")
                               )) {
                                 if (prop.toLowerCase().includes('background')) {
                                   htmlEl.style.setProperty(prop, "#ffffff", "important");
                                 } else if (prop.toLowerCase().includes('color')) {
                                   htmlEl.style.setProperty(prop, "#111827", "important");
                                 } else if (prop.toLowerCase().includes('border')) {
                                   htmlEl.style.setProperty(prop, "#e5e7eb", "important");
                                 } else {
                                   htmlEl.style.setProperty(prop, "inherit", "important");
                                 }
                               }
                             });
                          });
                       }
                    }
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate the height of the image on the PDF while maintaining aspect ratio
          const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;
          
          let heightLeft = imgHeightInPdf;
          let position = 0;

          // Function to add footer and watermark to each page
          const addPageDecorations = (pageNum: number, totalPages: number) => {
            pdf.setFontSize(8);
            pdf.setTextColor(180, 180, 180);
            const footerText = `${company.nome} • CNPJ: ${company.cnpj} • CRECI PJ: ${company.creciPj}`;
            const pageText = `Página ${pageNum} de ${totalPages}`;
            
            pdf.text(footerText, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
            pdf.text(pageText, pdfWidth - 15, pdfHeight - 10, { align: 'right' });
          };

          // Calculate total pages
          const totalPages = Math.ceil(imgHeightInPdf / pdfHeight);

          // First page
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
          addPageDecorations(1, totalPages);
          heightLeft -= pdfHeight;

          // Add additional pages
          let currentPage = 2;
          while (heightLeft > 0) {
            position = heightLeft - imgHeightInPdf;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            addPageDecorations(currentPage, totalPages);
            heightLeft -= pdfHeight;
            currentPage++;
          }
          
          const safeClientName = (visit.nomeCliente || (visit as any).clientName || 'cliente')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/gi, "-") // Replace non-alphanumeric with hyphen
            .toLowerCase();
          
          const propertyCode = (propertyData?.code || visit.codigoImovel || 'imovel').replace(/[^a-z0-9]/gi, "-");
          
          const fileName = `ficha-cliente-${safeClientName}-${propertyCode}.pdf`;

          if (action === 'download') {
            pdf.save(fileName);
          } else if (action === 'print') {
            pdf.autoPrint();
            window.open(pdf.output('bloburl'), '_blank');
          } else if (action === 'preview') {
            window.open(pdf.output('bloburl'), '_blank');
          }

          // Record in Firestore if not already recorded (optional, but keep for history)
          await addDoc(collection(db, 'fichas_visita'), {
            visitId: visit.id,
            propertyCode: propertyCode,
            clientName: visit.nomeCliente || (visit as any).clientName || 'Cliente',
            brokerName: visit.brokerName || brokerData.name || 'Atendimento Direto',
            createdAt: serverTimestamp(),
            action: action
          });

        } catch (err) {
          console.error("Error during canvas capture:", err);
          alert("Erro ao capturar dados para o PDF. Verifique se as imagens estão acessíveis.");
        } finally {
          setGeneratingPdf(null);
        }
      } else {
        setGeneratingPdf(null);
        alert("Template do PDF não encontrado.");
      }

    } catch (error) {
      console.error("Error fetching data for PDF:", error);
      alert("Erro ao processar dados do imóvel. Verifique a conexão.");
      setGeneratingPdf(null);
    }
  };

  const sendWhatsAppMsg = (visit: any) => {
    const clientPhone = (visit.telefone || visit.clientPhone || "").replace(/\D/g, '');
    const propertyLink = `${window.location.origin}/imovel/${visit.imovelId}`;
    const message = `Olá ${visit.nomeCliente || visit.clientName}! Falamos da Menta Imóveis sobre sua solicitação de visita ao imóvel ${visit.codigoImovel || ""}.\n\nPara facilitar, aqui está o link do imóvel:\n${propertyLink}\n\nConseguimos confirmar para ${visit.date} às ${visit.horario || visit.time}?`;
    window.open(`https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleConfirm = async () => {
    if (!selectedVisit) return;
    try {
      const confirmData = {
        status: 'confirmada',
        brokerName: brokerData.name,
        brokerCreci: brokerData.creci,
        brokerPhone: brokerData.phone,
        clientCpf: clientData.cpf,
        confirmadoEm: serverTimestamp(),
        pdfGerado: true,
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'visitas', selectedVisit.id), confirmData);
      
      // Update local state first to reflect changes in template
      const updatedVisit = { ...selectedVisit, ...confirmData };
      
      alert("Visita confirmada com sucesso. Gerando PDF...");
      
      // Pass the updated visit object to generatePDF
      generatePDF(updatedVisit, 'preview');
      
      setShowConfirmModal(false);
      fetchVisits();
    } catch (error) {
      console.error("Error confirming visit:", error);
      alert("Erro ao confirmar visita no banco de dados.");
    }
  };

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10"
    >
      <motion.div 
        variants={slideUp}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Operations Management</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">Gestão de Visitas</h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">Monitore solicitações, organize a agenda dos corretores e emita fichas de visita premium.</p>
        </div>
      </motion.div>

      <motion.div 
        variants={slideUp}
        className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden"
      >
        <div className="p-10 border-b border-gray-50 flex flex-col xl:flex-row gap-6 bg-gray-50/30">
          <div className="relative flex-grow group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gold transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou imóvel..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-white border border-transparent rounded-2xl focus:ring-4 focus:ring-gold/10 focus:border-gold/20 outline-none transition-all shadow-sm font-medium text-sm placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ rotate: 180 }}
              onClick={fetchVisits}
              className="p-5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gold transition-all shadow-sm"
            >
              <RefreshCcw size={20} />
            </motion.button>
            <div className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded-2xl shadow-sm">
               <span className="text-[10px] font-black uppercase text-gray-300 ml-4 tracking-widest leading-none">Filtro:</span>
               <select 
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="bg-transparent border-none rounded-lg text-xs font-black uppercase tracking-widest px-4 py-3 outline-none text-primary-black"
               >
                  <option value="Todas">Todas</option>
                  <option value="pendente">Pendentes</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="cancelada">Canceladas</option>
               </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.table 
                key="loading"
                {...fadeIn}
                className="w-full"
              >
                <tbody>
                   {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                </tbody>
              </motion.table>
            ) : (
              (() => {
                const filteredVisits = visits.filter(v => {
                  const matchesSearch = 
                    (v.nomeCliente || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (v.codigoImovel || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (v.telefone || '').includes(searchQuery);
                  
                  const matchesStatus = filterStatus === 'Todas' || v.status?.toLowerCase() === filterStatus.toLowerCase();
                  
                  return matchesSearch && matchesStatus;
                });

                if (filteredVisits.length === 0) {
                  return (
                    <motion.div 
                      key="empty"
                      {...fadeIn}
                      className="p-32 text-center flex flex-col items-center"
                    >
                       <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                         <Calendar size={40} className="text-gray-200" />
                       </div>
                       <p className="text-lg font-display font-medium text-gray-400">Nenhum agendamento encontrado.</p>
                    </motion.div>
                  );
                }

                return (
                  <motion.table 
                    key="table"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="w-full"
                  >
                    <thead>
                      <tr className="text-left bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                        <th className="p-8 pl-12">Cliente / Contato</th>
                        <th className="p-8">Imóvel</th>
                        <th className="p-8">Agenda</th>
                        <th className="p-8">Status</th>
                        <th className="p-8 text-right pr-12">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredVisits.map(visit => {
                    const clientName = visit.nomeCliente || visit.clientName;
                    const clientPhone = visit.telefone || visit.clientPhone;
                    const propertyCode = visit.codigoImovel || visit.propertyCode;
                    const hour = visit.horario || visit.time;
                    const city = visit.cidade || 'Balneário Camboriú';

                    return (
                      <motion.tr 
                        key={visit.id} 
                        variants={slideUp}
                        className="hover:bg-gray-50/40 transition-all group"
                      >
                        <td className="p-8 pl-12">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-3 mb-1">
                               <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                 <User size={14} className="text-gray-400 group-hover:text-gold transition-colors" />
                               </div>
                               <span className="font-bold text-lg text-primary-black tracking-tight leading-none">{clientName}</span>
                             </div>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-11 flex items-center gap-2">
                               <Phone size={10} className="text-gold" /> {clientPhone}
                             </span>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex flex-col">
                             <span className="font-black text-[10px] uppercase tracking-widest text-gold mb-1">CÓD: {propertyCode}</span>
                             <div className="flex items-center gap-2 text-primary-black">
                               <MapPin size={14} className="text-gray-300" />
                               <span className="text-xs font-bold leading-none">{city}</span>
                             </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl bg-gold/5 flex items-center justify-center shrink-0">
                                 <Calendar size={14} className="text-gold" />
                               </div>
                               <span className="text-xs font-black text-primary-black tracking-widest leading-none">{visit.date}</span>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                 <Clock size={14} className="text-gray-400" />
                               </div>
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">{hour}</span>
                             </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                            visit.status?.toLowerCase() === 'pendente' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-100/50' :
                            visit.status?.toLowerCase() === 'confirmada' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-100/50' :
                            visit.status?.toLowerCase() === 'cancelada' ? 'bg-red-50 text-red-600 border-red-200 shadow-sm shadow-red-100/50' :
                            'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>
                            {visit.status}
                          </span>
                        </td>
                        <td className="p-8 pr-12 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                             {visit.status?.toLowerCase() === 'pendente' && (
                               <>
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   onClick={() => { setSelectedVisit(visit); setShowConfirmModal(true); }}
                                   className="w-11 h-11 flex items-center justify-center bg-white text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-black/5 group/btn"
                                   title="Confirmar"
                                 >
                                   <CheckCircle size={20} className="transition-transform group-hover/btn:scale-110" />
                                 </motion.button>
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   onClick={() => updateStatus(visit.id, 'cancelada')}
                                   className="w-11 h-11 flex items-center justify-center bg-white text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-black/5 group/btn"
                                   title="Cancelar"
                                 >
                                   <XCircle size={20} className="transition-transform group-hover/btn:scale-110" />
                                 </motion.button>
                               </>
                             )}
                             {visit.status?.toLowerCase() === 'confirmada' && (
                               <>
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   disabled={generatingPdf === visit.id}
                                   onClick={() => generatePDF(visit, 'preview')}
                                   className="w-11 h-11 flex items-center justify-center bg-white text-gold rounded-2xl hover:bg-gold hover:text-white transition-all shadow-xl shadow-black/5 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                   title="Visualizar FICHA COMPLETA"
                                 >
                                   {generatingPdf === visit.id ? (
                                     <Loader2 size={20} className="animate-spin" />
                                   ) : (
                                     <Sparkles size={18} className="transition-transform group-hover/btn:scale-110" />
                                   )}
                                 </motion.button>
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   disabled={generatingPdf === visit.id}
                                   onClick={() => generatePDF(visit, 'download')}
                                   className="w-11 h-11 flex items-center justify-center bg-white text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-black/5 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                   title="Baixar PDF"
                                 >
                                   {generatingPdf === visit.id ? (
                                     <Loader2 size={20} className="animate-spin" />
                                   ) : (
                                     <Download size={20} className="transition-transform group-hover/btn:scale-110" />
                                   )}
                                 </motion.button>
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   disabled={generatingPdf === visit.id}
                                   onClick={() => generatePDF(visit, 'print')}
                                   className="w-11 h-11 flex items-center justify-center bg-white text-amber-500 rounded-2xl hover:bg-amber-600 hover:text-white transition-all shadow-xl shadow-black/5 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                   title="Imprimir"
                                 >
                                   {generatingPdf === visit.id ? (
                                     <Loader2 size={20} className="animate-spin" />
                                   ) : (
                                     <Printer size={20} className="transition-transform group-hover/btn:scale-110" />
                                   )}
                                 </motion.button>
                               </>
                             )}
                             <motion.button 
                               whileHover={{ scale: 1.1 }}
                               onClick={() => sendWhatsAppMsg(visit)}
                               className="w-11 h-11 flex items-center justify-center bg-white text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-black/5 group/btn"
                             >
                               <MessageCircle size={20} className="transition-transform group-hover/btn:scale-110" />
                             </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </motion.table>
            );
          })()
        )}
      </AnimatePresence>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              {...fadeIn}
              className="absolute inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div 
              {...scaleIn}
              className="bg-white max-w-2xl w-full rounded-[3rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-12 border-b border-gray-50 bg-primary-black text-white relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full" />
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><Sparkles size={20} className="text-gold" /></div>
                    <h3 className="text-3xl font-display font-bold tracking-tight">Confirmar Consultoria</h3>
                 </div>
                 <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-sm">Insira as credenciais profissionais para a emissão oficial da ficha de visita.</p>
              </div>
              
              <div className="p-12 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Nome do Corretor</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                        placeholder="Nome Profissional" 
                        value={brokerData.name} 
                        onChange={e => setBrokerData({...brokerData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">CRECI Registro</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                        placeholder="Ex: 11255 FJ" 
                        value={brokerData.creci} 
                        onChange={e => setBrokerData({...brokerData, creci: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">WhatsApp do Corretor</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                        placeholder="(00) 00000-0000" 
                        value={brokerData.phone} 
                        onChange={e => setBrokerData({...brokerData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">CPF do Cliente (Obrigatório para o PDF)</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-sm font-bold focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                        placeholder="000.000.000-00" 
                        value={clientData.cpf} 
                        onChange={e => setClientData({...clientData, cpf: e.target.value})}
                      />
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-gray-50 flex items-center justify-end gap-6 border-t border-gray-100">
                 <button onClick={() => setShowConfirmModal(false)} className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] hover:text-primary-black transition-colors">Voltar</button>
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={handleConfirm}
                   className="btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-[2rem] !py-6 !px-12 shadow-2xl shadow-primary-black/10 text-[10px] font-black uppercase tracking-[0.3em]"
                 >
                   Confirmar Agenda & PDF
                 </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden PDF Template for Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {pdfData.visit && (
          <VisitPdfTemplate 
            ref={pdfRef}
            visit={pdfData.visit}
            property={pdfData.property}
            settings={settings}
          />
        )}
      </div>
    </motion.div>
  );
}

import React, { useEffect, useState } from 'react';
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
  MoreVertical,
  ChevronRight,
  Filter,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Visit } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

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
  
  // Confirmation Modal Fields
  const [brokerData, setBrokerData] = useState({ name: '', creci: '' });
  const [clientData, setClientData] = useState({ cpf: '' });

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

  const generatePDF = async (visit: any) => {
    const doc = new jsPDF();
    const primaryColor = '#003030';
    const goldColor = '#E5BC53';

    const clientName = visit.nomeCliente || visit.clientName;
    const clientEmail = visit.email || visit.clientEmail;
    const clientPhone = visit.telefone || visit.clientPhone;
    const propertyCode = visit.codigoImovel || visit.propertyCode;
    const propertyTitle = visit.tituloImovel || visit.title || 'Imóvel';
    const city = visit.cidade || 'Balneário Camboriú';
    const hour = visit.horario || visit.time;

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MENTA', 20, 20);
    
    doc.setFontSize(8);
    doc.setTextColor(goldColor);
    doc.text('NEGÓCIOS IMOBILIÁRIOS', 20, 26);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Av Brasil 2636 - Centro, Balneário Camboriú - SC', 190, 15, { align: 'right' });
    doc.text('47 99291-4069 | 41 98818-711', 190, 22, { align: 'right' });
    doc.text('CRECI: 11255 PJ', 190, 29, { align: 'right' });

    // Title
    doc.setTextColor(primaryColor);
    doc.setFontSize(18);
    doc.text('FICHA DE VISITA DE IMÓVEL', 105, 55, { align: 'center' });
    doc.setDrawColor(goldColor);
    doc.setLineWidth(1);
    doc.line(80, 58, 130, 58);

    // Metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${visit.date}`, 20, 70);
    doc.text(`Horário: ${hour}`, 190, 70, { align: 'right' });

    // Client Data
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 80, 170, 45, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 25, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${clientName}`, 25, 100);
    doc.text(`CPF: ${clientData.cpf || '____.____.____-____'}`, 25, 107);
    doc.text(`E-mail: ${clientEmail}`, 25, 114);
    doc.text(`Telefone: ${clientPhone}`, 120, 114);

    // Broker Data
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 130, 170, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CORRETOR', 25, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Corretor: ${brokerData.name || visit.brokerName || '________________'}`, 25, 150);
    doc.text(`CRECI: ${brokerData.creci || '________________'}`, 120, 150);

    // Property Data
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 165, 170, 35, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO IMÓVEL', 25, 175);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${propertyCode}`, 25, 185);
    doc.text(`Imóvel: ${propertyTitle}`, 25, 192);
    doc.text(`Localização: ${city}`, 100, 192);

    // Term
    doc.setFontSize(9);
    doc.text('TERMO DE CIÊNCIA E VISITA:', 20, 215);
    doc.setFontSize(8);
    doc.text('Declaro que visitei o imóvel acima descrito acompanhado pelo corretor responsável da Menta Negócios Imobiliários.', 20, 222);
    doc.text('Comprometo-me a tratar qualquer negociação futura referente a este imóvel exclusivamente através desta imobiliária.', 20, 227);

    // Signatures
    doc.line(20, 260, 90, 260);
    doc.text('Assinatura do Cliente', 40, 265);
    
    doc.line(120, 260, 190, 260);
    doc.text('Assinatura do Corretor', 140, 265);

    doc.save(`Ficha_Visita_${propertyCode}_${clientName}.pdf`);
    
    // Save to Firestore
    await addDoc(collection(db, 'fichas_visita'), {
      visitId: visit.id,
      propertyCode: propertyCode,
      clientName: clientName,
      brokerName: brokerData.name,
      createdAt: serverTimestamp()
    });
  };

  const handleConfirm = async () => {
    if (!selectedVisit) return;
    try {
      await updateDoc(doc(db, 'visitas', selectedVisit.id), {
        status: 'confirmada',
        brokerName: brokerData.name,
        brokerCreci: brokerData.creci,
        clientCpf: clientData.cpf,
      });
      
      generatePDF(selectedVisit);
      setShowConfirmModal(false);
      fetchVisits();
    } catch (error) {
      console.error("Error confirming visit:", error);
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
               <select className="bg-transparent border-none rounded-lg text-xs font-black uppercase tracking-widest px-4 py-3 outline-none text-primary-black">
                  <option>Todas</option>
                  <option value="pendente">Pendentes</option>
                  <option value="confirmada">Confirmadas</option>
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
            ) : visits.length === 0 ? (
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
            ) : (
              <motion.table 
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
                  {visits.map(visit => {
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
                               <motion.button 
                                 whileHover={{ scale: 1.1 }}
                                 onClick={() => generatePDF(visit)}
                                 className="w-11 h-11 flex items-center justify-center bg-white text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-black/5 group/btn"
                                 title="Gerar PDF"
                               >
                                 <FileText size={20} className="transition-transform group-hover/btn:scale-110" />
                               </motion.button>
                             )}
                             <motion.a 
                               whileHover={{ scale: 1.1 }}
                               href={`https://wa.me/${clientPhone.replace(/\D/g, '')}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="w-11 h-11 flex items-center justify-center bg-white text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-black/5 group/btn"
                             >
                               <MessageCircle size={20} className="transition-transform group-hover/btn:scale-110" />
                             </motion.a>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </motion.table>
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
    </motion.div>
  );
}

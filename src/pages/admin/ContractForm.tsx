import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Download, 
  Printer, 
  Search,
  Check,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  FileText,
  Building2,
  User,
  CreditCard,
  MapPin,
  Calendar,
  AlertCircle,
  Home,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, ContractType, ContractStatus, Property } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskCurrency, parseCurrencyToNumber, formatCurrency } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { ContractA4Preview } from '../../components/admin/ContractA4Preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Step = 'tipo' | 'dados' | 'pagamento' | 'revisao';

export default function AdminContractForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreviewOnly = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(id ? true : false);
  const [step, setStep] = useState<Step>(isPreviewOnly ? 'revisao' : 'tipo');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [contract, setContract] = useState<Partial<Contract>>({
    tipoContrato: 'proposta',
    status: 'rascunho',
    nomeCliente: '',
    nomeVendedor: '',
    enderecoImovel: '',
    valor: 0,
    local: 'São Luís - MA',
    data: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    dados: {
      proponente: { estadoCivil: 'Solteiro(a)' },
      vendedor: { estadoCivil: 'Solteiro(a)' },
      aceitante: { estadoCivil: 'Solteiro(a)' },
      locador: { estadoCivil: 'Solteiro(a)' },
      locatario: { estadoCivil: 'Solteiro(a)' },
      prazo: { finalidade: 'Temporada' },
      valores: { valorDiario: 0, taxaLimpeza: 0, taxaCaucao: 0, taxasAdicionais: 0, desconto: 0 },
      regras: {},
      assinaturas: {},
      imovel: {},
      pagamento: { metodos: [] },
      termos: { metodos: [] },
      objeto: { tipoAceite: 'proposta' }
    }
  });

  const diffInDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    try {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return 1;
    }
  };

  useEffect(() => {
    if (contract.tipoContrato === 'locacao_temporaria') {
       const v = contract.dados?.valores || {};
       const p = contract.dados?.prazo || {};
       
       const start = p.dataInicio;
       const end = p.dataTermino;
       
       if (start && end) {
         const days = diffInDays(start, end);
         const daily = Number(v.valorDiario) || 0;
         const totalLease = days * daily;
         const cleaning = Number(v.taxaLimpeza) || 0;
         const security = Number(v.taxaCaucao) || 0;
         const additional = Number(v.taxasAdicionais) || 0;
         const discount = Number(v.desconto) || 0;
         const final = totalLease + cleaning + security + additional - discount;
         
         const percComissao = v.percentualComissaoImobiliaria ?? 20;
         const comissao = totalLease * percComissao / 100;
         const repasse = totalLease - comissao;
         
         if (p.quantidadeDias !== days || v.valorTotalLocacao !== totalLease || v.valorFinal !== final || contract.valor !== final || v.valorComissaoImobiliaria !== comissao) {
           setContract(prev => ({
             ...prev,
             valor: final,
             dados: {
               ...prev.dados,
               prazo: { ...prev.dados.prazo, quantidadeDias: days },
               valores: { 
                 ...prev.dados.valores, 
                 valorTotalLocacao: totalLease, 
                 valorFinal: final,
                 percentualComissaoImobiliaria: percComissao,
                 valorComissaoImobiliaria: comissao,
                 valorRepassadoProprietario: repasse
               }
             }
           }));
         }
       }
    }
  }, [
    contract.tipoContrato,
    contract.dados?.prazo?.dataInicio, 
    contract.dados?.prazo?.dataTermino, 
    contract.dados?.valores?.valorDiario, 
    contract.dados?.valores?.taxaLimpeza, 
    contract.dados?.valores?.taxaCaucao, 
    contract.dados?.valores?.taxasAdicionais, 
    contract.dados?.valores?.desconto
  ]);

  useEffect(() => {
    const fetchProperties = async () => {
      const q = query(collection(db, 'imoveis'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[]);
    };

    const fetchContract = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'contratos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContract({ id: docSnap.id, ...docSnap.data() } as Contract);
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchProperties();
    fetchContract();
  }, [id]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setContract(prev => ({
      ...prev,
      imovelId: property.id,
      enderecoImovel: `${property.address}, ${property.number} - ${property.neighborhood}, ${property.city}`,
      nomeVendedor: property.ownerName || '',
      valor: prev.tipoContrato === 'proposta' ? (property.priceVenda || property.priceLocacao || 0) : prev.valor,
      dados: {
        ...prev.dados,
        imovel: {
          ...prev.dados.imovel,
          matricula: '',
          cri: '',
          tipo: property.propertyType,
          descricao: property.shortDescription || property.title
        }
      }
    }));
  };

  const saveContract = async (finalizar = false) => {
    if (!contract.nomeCliente || !contract.valor) {
      alert('Por favor, preencha o nome do cliente e o valor.');
      return;
    }

    if (contract.tipoContrato === 'locacao_temporaria') {
      const days = contract.dados?.prazo?.quantidadeDias || 0;
      if (days > 90) {
        alert('A locação temporária não pode ultrapassar 90 dias.');
        return;
      }
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...contract,
        status: finalizar ? 'finalizado' : (contract.status || 'rascunho'),
        atualizadoEm: serverTimestamp(),
        criadoPor: user?.uid
      };

      if (finalizar) {
        dataToSave.finalizadoEm = serverTimestamp();
      }

      if (!id) {
        dataToSave.criadoEm = serverTimestamp();
        const docRef = await addDoc(collection(db, 'contratos'), dataToSave);
        if (finalizar) {
           alert('Contrato finalizado, salvo e PDF gerado com sucesso.');
           // Wait a bit to ensure Firestore update is propagated if needed for preview
           setTimeout(() => downloadPDF(), 500);
        }
      } else {
        await updateDoc(doc(db, 'contratos', id), dataToSave);
        if (finalizar) {
           alert('Contrato finalizado, salvo e PDF gerado com sucesso.');
           setTimeout(() => downloadPDF(), 500);
        }
      }

      if (!finalizar) {
        navigate('/admin/contratos');
      }
    } catch (error) {
      console.error("Error saving contract:", error);
      alert('Erro ao salvar contrato.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current) return;
    
    setLoading(true);
    try {
      // Small timeout to ensure all components are fully rendered and styles applied
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll("*");
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const bg = window.getComputedStyle(el).backgroundColor;
            if (bg.includes("oklab") || bg.includes("oklch") || bg.includes("color-mix") || bg.includes("lab(") || bg.includes("lch(")) {
              htmlEl.style.backgroundColor = "#ffffff";
            }
            const color = window.getComputedStyle(el).color;
            if (color.includes("oklab") || color.includes("oklch") || color.includes("color-mix")) {
              htmlEl.style.color = "#111827";
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        format: 'a4',
        unit: 'mm'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Contrato_${contract.nomeCliente}_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert('Erro ao gerar PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateDados = (section: string, field: string, value: any) => {
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev.dados,
        [section]: {
          ...prev.dados[section],
          [field]: value
        }
      }
    }));
  };

  const toggleMetodo = (section: 'pagamento' | 'termos', metodo: string) => {
    const currentMetodos = [...(contract.dados[section].metodos || [])];
    const index = currentMetodos.indexOf(metodo);
    if (index > -1) {
      currentMetodos.splice(index, 1);
    } else {
      currentMetodos.push(metodo);
    }
    updateDados(section, 'metodos', currentMetodos);
  };

  if (fetching) {
    return (
      <div className="h-96 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Carregando dados do contrato...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/admin/contratos')}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-primary-black hover:shadow-xl transition-all border border-gray-100 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-black tracking-tight">{id ? 'Editar' : 'Novo'} Contrato</h1>
            <p className="text-gray-400 font-medium">Preencha os dados para gerar o documento oficial.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {step === 'revisao' && (
            <>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-4 bg-white text-gray-600 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all"
              >
                <Printer size={18} />
                <span>Imprimir</span>
              </button>
              <button 
                onClick={downloadPDF}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-4 bg-white text-gray-600 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all disabled:opacity-50"
              >
                <Download size={18} />
                <span>PDF</span>
              </button>
              <button 
                onClick={() => saveContract(true)}
                disabled={loading}
                className="btn-gold !py-4 px-8 flex items-center gap-3 shadow-xl shadow-gold/20 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-primary-black border-t-transparent rounded-full animate-spin" /> : <Check size={18} />}
                <span>Finalizar e Salvar</span>
              </button>
            </>
          )}
          <button 
            onClick={() => saveContract(false)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-4 bg-white text-gray-500 rounded-2xl font-bold border border-gray-100 shadow-sm hover:shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
            <span>Salvar Rascunho</span>
          </button>
        </div>
      </div>

      {/* Stepper */}
      {!isPreviewOnly && (
        <div className="flex items-center justify-between max-w-2xl mx-auto print:hidden">
          {(['tipo', 'dados', 'pagamento', 'revisao'] as Step[]).map((s, idx) => {
            const isActive = step === s;
            const isCompleted = ['tipo', 'dados', 'pagamento', 'revisao'].indexOf(step) > idx;
            
            return (
              <React.Fragment key={s}>
                <button 
                  onClick={() => setStep(s)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isActive ? 'bg-gold text-primary-black ring-4 ring-gold/20 scale-110' : 
                    isCompleted ? 'bg-primary-black text-gold' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <Check size={16} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-primary-black' : 'text-gray-400'}`}>
                    {s}
                  </span>
                </button>
                {idx < 3 && <div className={`flex-grow h-px mx-4 ${['tipo', 'dados', 'pagamento', 'revisao'].indexOf(step) > idx ? 'bg-gold' : 'bg-gray-100'}`} />}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Form Content */}
      <div className="print:m-0">
        <AnimatePresence mode="wait">
          {step === 'tipo' && (
            <motion.div 
              key="tipo"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { id: 'proposta', title: 'Proposta de Compra', icon: FileText, desc: 'Primeiro contato com oferta de valor e condições.' },
                { id: 'contraproposta', title: 'Contraproposta', icon: AlertCircle, desc: 'Resposta do vendedor com novos termos.' },
                { id: 'aceite', title: 'Aceite de Termos', icon: Check, desc: 'Formalização final do acordo entre as partes.' },
                { id: 'locacao_temporaria', title: 'Locação Temporária', icon: Calendar, desc: 'Contrato para aluguéis de temporada e curtos períodos.' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setContract(prev => ({ ...prev, tipoContrato: t.id as ContractType }));
                    setStep('dados');
                  }}
                  className={`p-10 rounded-[2.5rem] border-2 text-left transition-all ${
                    contract.tipoContrato === t.id ? 'bg-white border-gold shadow-2xl shadow-gold/10' : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-gray-100 hover:shadow-xl'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                    contract.tipoContrato === t.id ? 'bg-primary-black text-gold' : 'bg-white text-gray-400'
                  }`}>
                    <t.icon size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-primary-black mb-3">{t.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">{t.desc}</p>
                </button>
              ))}
            </motion.div>
          )}

          {step === 'dados' && (
            <motion.div 
              key="dados"
              variants={fadeIn}
              className="space-y-8"
            >
              {contract.tipoContrato === 'locacao_temporaria' ? (
                <>
                  {/* Locação Temporária - Dados do Imóvel */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">1. Objeto e Imóvel</h3>
                        <p className="text-sm text-gray-400">Escolha o imóvel para locação.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selecionar Imóvel</label>
                        <select 
                          className="input-field"
                          onChange={(e) => {
                            const p = properties.find(prop => prop.id === e.target.value);
                            if (p) handlePropertySelect(p);
                          }}
                          value={contract.imovelId || ''}
                        >
                          <option value="">-- Selecione um imóvel --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                        <input type="text" className="input-field" value={contract.enderecoImovel} onChange={e => setContract({...contract, enderecoImovel: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tipo</label>
                        <input type="text" className="input-field" value={contract.dados.imovel?.tipo || ''} onChange={e => updateDados('imovel', 'tipo', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mobiliado</label>
                        <select className="input-field" value={contract.dados.imovel?.mobiliado || 'Sim'} onChange={e => updateDados('imovel', 'mobiliado', e.target.value)}>
                          <option value="Sim">Sim</option>
                          <option value="Não">Não</option>
                          <option value="Parcialmente">Parcialmente</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Código</label>
                        <input type="text" className="input-field" value={contract.dados.imovel?.codigo || ''} onChange={e => updateDados('imovel', 'codigo', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Locador e Locatário */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">2. Dados das Partes</h3>
                        <p className="text-sm text-gray-400">Identificação do Locador e Locatário.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Locador (Proprietário)</h4>
                        <div className="space-y-4">
                          <input type="text" className="input-field" placeholder="Nome Completo / Razão Social" value={contract.dados.locador?.nome || ''} onChange={e => {
                            updateDados('locador', 'nome', e.target.value);
                            setContract(prev => ({ ...prev, nomeVendedor: e.target.value }));
                          }} />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="CPF / CNPJ" value={contract.dados.locador?.cpfCnpj || ''} onChange={e => updateDados('locador', 'cpfCnpj', e.target.value)} />
                            <input type="text" className="input-field" placeholder="RG / IE" value={contract.dados.locador?.rgIe || ''} onChange={e => updateDados('locador', 'rgIe', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <select className="input-field" value={contract.dados.locador?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('locador', 'estadoCivil', e.target.value)}>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a)">Casado(a)</option>
                              <option value="Divorciado(a)">Divorciado(a)</option>
                            </select>
                            <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.locador?.profissao || ''} onChange={e => updateDados('locador', 'profissao', e.target.value)} />
                          </div>
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locador?.endereco || ''} onChange={e => updateDados('locador', 'endereco', e.target.value)} />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Locatário (Hóspede)</h4>
                        <div className="space-y-4">
                          <input type="text" className="input-field" placeholder="Nome Completo" value={contract.dados.locatario?.nome || ''} onChange={e => {
                            updateDados('locatario', 'nome', e.target.value);
                            setContract(prev => ({ ...prev, nomeCliente: e.target.value }));
                          }} />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="CPF" value={contract.dados.locatario?.cpf || ''} onChange={e => updateDados('locatario', 'cpf', e.target.value)} />
                            <input type="text" className="input-field" placeholder="RG" value={contract.dados.locatario?.rg || ''} onChange={e => updateDados('locatario', 'rg', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <select className="input-field" value={contract.dados.locatario?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('locatario', 'estadoCivil', e.target.value)}>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a)">Casado(a)</option>
                              <option value="Divorciado(a)">Divorciado(a)</option>
                            </select>
                            <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.locatario?.profissao || ''} onChange={e => updateDados('locatario', 'profissao', e.target.value)} />
                          </div>
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locatario?.endereco || ''} onChange={e => updateDados('locatario', 'endereco', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Prazo */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">3. Período da Locação</h3>
                        <p className="text-sm text-gray-400">Prazos e horários de entrada e saída.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Data de Início</label>
                        <input type="date" className="input-field" value={contract.dados.prazo?.dataInicio || ''} onChange={e => updateDados('prazo', 'dataInicio', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Data de Término</label>
                        <input type="date" className="input-field" value={contract.dados.prazo?.dataTermino || ''} onChange={e => updateDados('prazo', 'dataTermino', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Horário Check-in</label>
                        <input type="time" className="input-field" value={contract.dados.prazo?.horarioEntrada || '14:00'} onChange={e => updateDados('prazo', 'horarioEntrada', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Horário Check-out</label>
                        <input type="time" className="input-field" value={contract.dados.prazo?.horarioSaida || '10:00'} onChange={e => updateDados('prazo', 'horarioSaida', e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-8 p-6 bg-gold/5 rounded-2xl border border-gold/10">
                       <p className="text-lg font-display font-bold text-primary-black">Duração: <span className="text-gold">{contract.dados.prazo?.quantidadeDias || 0} dias</span></p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* ... Existing Steps for Proposta/Contraproposta ... */}
                  {/* Imóvel Selection Component */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Vincular Imóvel</h3>
                        <p className="text-sm text-gray-400">Selecione um imóvel do sistema ou preencha manualmente.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Escolher do Sistema</label>
                        <select 
                          className="input-field"
                          onChange={(e) => {
                            const p = properties.find(prop => prop.id === e.target.value);
                            if (p) handlePropertySelect(p);
                          }}
                          value={contract.imovelId || ''}
                        >
                          <option value="">-- Selecione ou preencha abaixo --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.address}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Completo</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.enderecoImovel} 
                          onChange={e => setContract({...contract, enderecoImovel: e.target.value})}
                          placeholder="Ex: Rua das Flores, 123 - Centro"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partes Envolvidas */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Partes Envolvidas</h3>
                        <p className="text-sm text-gray-400">Identificação clara do comprador e vendedor.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Comprador/Proponente */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-gold uppercase tracking-[0.2em] mb-4">Comprador / Proponente</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={contract.nomeCliente} 
                              onChange={e => setContract({...contract, nomeCliente: e.target.value})} 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cpf || ''} onChange={e => updateDados('proponente', 'cpf', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.rg || ''} onChange={e => updateDados('proponente', 'rg', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                              <select className="input-field" value={contract.dados.proponente?.estadoCivil || 'Solteiro(a)'} onChange={e => updateDados('proponente', 'estadoCivil', e.target.value)}>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                                <option value="Viúvo(a)">Viúvo(a)</option>
                                <option value="União Estável">União Estável</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.profissao || ''} onChange={e => updateDados('proponente', 'profissao', e.target.value)} />
                            </div>
                          </div>
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.proponente?.endereco || ''} onChange={e => updateDados('proponente', 'endereco', e.target.value)} />
                        </div>
                      </div>

                      {/* Vendedor */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-gold uppercase tracking-[0.2em] mb-4">Vendedor / Parte Aceitante</h4>
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Nome Completo"
                            value={contract.nomeVendedor} 
                            onChange={e => setContract({...contract, nomeVendedor: e.target.value})} 
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="CPF" value={contract.dados.vendedor?.cpf || contract.dados.aceitante?.cpf || ''} onChange={e => {
                              updateDados('vendedor', 'cpf', e.target.value);
                              updateDados('aceitante', 'cpf', e.target.value);
                            }} />
                            <input type="text" className="input-field" placeholder="RG" value={contract.dados.vendedor?.rg || contract.dados.aceitante?.rg || ''} onChange={e => {
                              updateDados('vendedor', 'rg', e.target.value);
                              updateDados('aceitante', 'rg', e.target.value);
                            }} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <select className="input-field" value={contract.dados.vendedor?.estadoCivil || contract.dados.aceitante?.estadoCivil || 'Solteiro(a)'} onChange={e => {
                              updateDados('vendedor', 'estadoCivil', e.target.value);
                              updateDados('aceitante', 'estadoCivil', e.target.value);
                            }}>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a)">Casado(a)</option>
                              <option value="Divorciado(a)">Divorciado(a)</option>
                            </select>
                            <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.vendedor?.profissao || contract.dados.aceitante?.profissao || ''} onChange={e => {
                              updateDados('vendedor', 'profissao', e.target.value);
                              updateDados('aceitante', 'profissao', e.target.value);
                            }} />
                          </div>
                          <input type="text" className="input-field" placeholder="Endereço" value={contract.dados.vendedor?.endereco || contract.dados.aceitante?.endereco || ''} onChange={e => {
                            updateDados('vendedor', 'endereco', e.target.value);
                            updateDados('aceitante', 'endereco', e.target.value);
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            
              <div className="flex justify-end pt-8">
                <button 
                  onClick={() => setStep('pagamento')}
                  className="btn-gold !py-4 px-10 flex items-center gap-3 shadow-xl"
                >
                  <span className="font-bold">Próxima Etapa</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'pagamento' && (
            <motion.div 
              key="pagamento"
              variants={fadeIn}
              className="space-y-8"
            >
              {contract.tipoContrato === 'locacao_temporaria' ? (
                <>
                  {/* Locação Temporária - Valores */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">4. Valores e Regras</h3>
                        <p className="text-sm text-gray-400">Configuração financeira e regras da locação.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor da Diária (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.valorDiario || '')}
                          onChange={e => updateDados('valores', 'valorDiario', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Taxa de Limpeza (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxaLimpeza || '')}
                          onChange={e => updateDados('valores', 'taxaLimpeza', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor Caução (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxaCaucao || '')}
                          onChange={e => updateDados('valores', 'taxaCaucao', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Outras Taxas (R$)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={maskCurrency(contract.dados.valores?.taxasAdicionais || '')}
                          onChange={e => updateDados('valores', 'taxasAdicionais', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-red-500">Desconto (R$)</label>
                        <input 
                          type="text" 
                          className="input-field text-red-500 font-bold" 
                          value={maskCurrency(contract.dados.valores?.desconto || '')}
                          onChange={e => updateDados('valores', 'desconto', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                      <div className="bg-primary-black p-6 rounded-2xl flex flex-col justify-center shadow-2xl">
                         <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1">Valor Total do Contrato</p>
                         <p className="text-3xl font-display font-bold text-white">{formatCurrency(contract.valor || 0)}</p>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Comissão Imobiliária (20%)</p>
                          <div className="flex items-center gap-3">
                             <input 
                               type="number" 
                               className="w-20 bg-white border border-gray-200 rounded-lg py-1 px-2 text-xs font-bold" 
                               value={contract.dados.valores?.percentualComissaoImobiliaria || 20}
                               onChange={e => updateDados('valores', 'percentualComissaoImobiliaria', parseFloat(e.target.value))}
                             />
                             <span className="text-lg font-bold text-primary-black">{formatCurrency(contract.dados.valores?.valorComissaoImobiliaria || 0)}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2 font-medium italic">* Calculado sobre o valor total das diárias.</p>
                       </div>
                       <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Repasse Proprietário</p>
                          <p className="text-lg font-bold text-emerald-700">{formatCurrency(contract.dados.valores?.valorRepassadoProprietario || 0)}</p>
                          <p className="text-[10px] text-emerald-600/60 mt-2 font-medium italic">* Valor bruto das diárias menos comissão.</p>
                       </div>
                       <div className="bg-gold/5 p-6 rounded-2xl border border-gold/10">
                          <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-2">Valor Total das Diárias</p>
                          <p className="text-lg font-bold text-primary-black">{formatCurrency(contract.dados.valores?.valorTotalLocacao || 0)}</p>
                          <p className="text-[10px] text-gold/60 mt-2 font-medium italic">* {contract.dados.prazo?.quantidadeDias || 0} dias x {formatCurrency(contract.dados.valores?.valorDiario || 0)}</p>
                       </div>
                    </div>
                  </div>

                  {/* Locação Temporária - Condições de Pagamento e Assinaturas */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">5. Local, Data e Assinaturas</h3>
                        <p className="text-sm text-gray-400">Localização e testemunhas.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade - UF</label>
                          <input type="text" className="input-field" value={contract.local || ''} onChange={e => setContract({...contract, local: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data</label>
                          <input type="text" className="input-field" value={contract.data || ''} onChange={e => setContract({...contract, data: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Testemunha 1</label>
                          <input type="text" className="input-field" placeholder="Nome completo" value={contract.dados.assinaturas?.testemunha1 || ''} onChange={e => updateDados('assinaturas', 'testemunha1', e.target.value)} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF Testemunha 1</label>
                          <input type="text" className="input-field" value={contract.dados.assinaturas?.cpfTestemunha1 || ''} onChange={e => updateDados('assinaturas', 'cpfTestemunha1', e.target.value)} />
                       </div>
                    </div>

                    <div className="mt-8 space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cláusulas Adicionais Personalizadas</label>
                       <textarea 
                        className="input-field min-h-[150px] py-4" 
                        placeholder="Adicione cláusulas extras se necessário..."
                        value={contract.dados.clausulas || ''}
                        onChange={e => setContract(prev => ({ ...prev, dados: { ...prev.dados, clausulas: e.target.value } }))}
                       />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* ... Existing Pagamento Step for Proposta ... */}
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Condições Financeiras</h3>
                        <p className="text-sm text-gray-400">Detalhe como será efetuado o pagamento.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-gold">Valor Total Negociado (R$)</label>
                          <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-transparent rounded-[1.5rem] py-5 px-7 text-2xl font-display font-bold text-primary-black focus:ring-4 focus:ring-gold/10 focus:border-gold/20 focus:bg-white outline-none transition-all"
                            value={maskCurrency(contract.valor || '')}
                            onChange={e => setContract({...contract, valor: parseCurrencyToNumber(e.target.value)})}
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Formas de Pagamento</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['À vista', 'Financiamento', 'FGTS', 'Parcelamento Direto', 'Sinal', 'Permuta', 'Outras'].map(m => (
                              <button
                                key={m}
                                onClick={() => toggleMetodo(contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos', m)}
                                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${
                                  (contract.dados[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos'].metodos || []).includes(m)
                                    ? 'bg-gold text-primary-black border-gold shadow-lg shadow-gold/20'
                                    : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor por Extenso</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={contract.dados[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']?.valorExtenso || ''} 
                            onChange={e => updateDados(contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos', 'valorExtenso', e.target.value)}
                            placeholder="Ex: Quinhentos mil reais"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Detalhes do Pagamento / Contraproposta</label>
                          <textarea 
                            rows={4}
                            className="input-field py-4 min-h-[120px]" 
                            value={contract.dados[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']?.outrasCondicoes || ''} 
                            onChange={e => updateDados(contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos', 'outrasCondicoes', e.target.value)}
                            placeholder="Descreva detalhadamente prazos, parcelas, ou termos da contraproposta..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-bold text-primary-black">Local e Data</h3>
                        <p className="text-sm text-gray-400">Dados que sairão no rodapé do documento.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade - UF</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.local || ''} 
                          onChange={e => setContract(prev => ({ ...prev, local: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data (por extenso)</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={contract.data || ''} 
                          onChange={e => setContract(prev => ({ ...prev, data: e.target.value }))} 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <button 
                  onClick={() => setStep('dados')}
                  className="px-10 py-4 bg-white text-gray-400 font-bold rounded-2xl border border-gray-100 flex items-center gap-3 hover:text-primary-black hover:shadow-xl transition-all"
                >
                  <ChevronLeft size={18} />
                  <span>Voltar</span>
                </button>
                <button 
                  onClick={() => setStep('revisao')}
                  className="btn-gold !py-4 px-10 flex items-center gap-3 shadow-xl"
                >
                  <span className="font-bold">Gerar Documento</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'revisao' && (
            <motion.div 
              key="revisao"
              variants={fadeIn}
              className="space-y-10"
            >
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                      <Eye size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-black">Prévia do Documento Oficial</h3>
                      <p className="text-sm text-gray-400">Verifique os dados cuidadosamente antes de finalizar.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-xl text-gold font-bold text-[10px] uppercase tracking-widest border border-gold/20">
                     <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                     Modo de Revisão
                  </div>
                </div>

                {/* A4 Preview Container */}
                <div className="flex justify-center bg-gray-50/50 -m-10 p-10 overflow-hidden lg:overflow-visible min-h-[500px]">
                  <ContractA4Preview contract={contract as Contract} printRef={printRef} />
                </div>
              </div>

              {!isPreviewOnly && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-primary-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center text-primary-black shadow-lg">
                      <FileCheck size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-bold text-white">Tudo pronto para finalizar?</h4>
                      <p className="text-gray-400 text-sm">Ao finalizar, o contrato será bloqueado para edições e o status passará para <span className="text-gold font-bold">Finalizado</span>.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                    <button 
                      onClick={() => setStep('pagamento')}
                      className="flex-1 md:flex-none px-10 py-5 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      <ChevronLeft size={18} />
                      <span>Voltar e Ajustar</span>
                    </button>
                    <button 
                      onClick={() => saveContract(true)}
                      disabled={loading}
                      className="flex-1 md:flex-none btn-gold !py-5 px-12 flex items-center justify-center gap-3 shadow-2xl shadow-gold/20 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <div className="w-6 h-6 border-3 border-primary-black border-t-transparent rounded-full animate-spin" /> : <Check size={20} />}
                      <span className="text-lg">Finalizar e Salvar</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

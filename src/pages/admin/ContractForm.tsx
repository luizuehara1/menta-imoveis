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
  Clock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import { Contract, ContractType, ContractStatus, Property } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskCurrency, parseCurrencyToNumber, formatCurrency, valorMonetarioPorExtenso } from '../../lib/utils';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';
import { ContractA4Preview } from '../../components/admin/ContractA4Preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function isDomElement(value: any): boolean {
  return (
    typeof HTMLElement !== "undefined" &&
    value instanceof HTMLElement
  );
}

function isReactEvent(value: any): boolean {
  return (
    value &&
    typeof value === "object" &&
    ("nativeEvent" in value || "target" in value || "currentTarget" in value)
  );
}

function cleanSerializableData(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (isDomElement(value)) return undefined;
  if (isReactEvent(value)) return undefined;

  if (typeof value === "function") return undefined;
  if (typeof value === "symbol") return undefined;

  if (typeof File !== "undefined" && value instanceof File) return undefined;
  if (typeof Blob !== "undefined" && value instanceof Blob) return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (Array.isArray(value)) {
    return value
      .map(cleanSerializableData)
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
      return value;
    }

    const cleaned: any = {};

    Object.entries(value).forEach(([key, val]) => {
      if (
        key.startsWith("__react") ||
        key === "_owner" ||
        key === "ref" ||
        key === "current" ||
        key === "target" ||
        key === "currentTarget" ||
        key === "nativeEvent"
      ) {
        return;
      }

      const cleanedValue = cleanSerializableData(val);

      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    });

    return cleaned;
  }

  return value;
}

function getValorVendaImovel(imovel: any): number {
  return Number(
    imovel?.priceVenda ||
    imovel?.valorVenda ||
    imovel?.precoVenda ||
    imovel?.preco ||
    imovel?.valor ||
    0
  );
}

function getMatriculaImovel(imovel: any): string {
  return (
    imovel?.imovelMatricula ||
    imovel?.matriculaImovel ||
    imovel?.matricula ||
    imovel?.numeroMatricula ||
    imovel?.numeroMatriculaImovel ||
    imovel?.dados?.imovel?.matricula ||
    ""
  );
}

function getCriImovel(imovel: any): string {
  return (
    imovel?.imovelCri ||
    imovel?.criImovel ||
    imovel?.cri ||
    imovel?.cartorioRegistroImoveis ||
    imovel?.cartorioRegistro ||
    imovel?.cartorioImovel ||
    imovel?.dados?.imovel?.cri ||
    ""
  );
}

function getTituloImovel(imovel: any): string {
  return (
    imovel?.nomeEdificio ||
    imovel?.edificio ||
    imovel?.nomeEmpreendimento ||
    imovel?.empreendimento ||
    imovel?.condominioNome ||
    imovel?.nomeCondominio ||
    imovel?.condoName ||
    imovel?.buildingName ||
    imovel?.tituloAnuncio ||
    imovel?.titulo ||
    imovel?.nome ||
    "Imóvel"
  );
}

function getCodigoImovel(imovel: any): string {
  return (
    imovel?.codigoImovel ||
    imovel?.codigo ||
    imovel?.code ||
    imovel?.codImovel ||
    imovel?.referencia ||
    imovel?.id ||
    ""
  );
}

function montarEnderecoImovel(imovel: any): string {
  return [
    imovel?.endereco || imovel?.address,
    imovel?.numero || imovel?.number,
    imovel?.complemento || imovel?.complement,
    imovel?.bairro || imovel?.neighborhood,
    imovel?.cidade || imovel?.city,
    imovel?.estado || imovel?.state
  ].filter(Boolean).join(", ");
}

async function buscarImovelPorCodigoOuId(codigoOuId: string) {
  const codigoLimpo = String(codigoOuId || "").trim();

  if (!codigoLimpo) return null;

  const imoveisRef = collection(db, "imoveis");

  const campos = ["code", "codigo", "codigoImovel", "codImovel", "referencia"];

  for (const campo of campos) {
    const q = query(imoveisRef, where(campo, "==", codigoLimpo));
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
    } catch (e) {
      console.error("Erro ao buscar imovel por campo " + campo, e);
    }
  }

  try {
    const docSnap = await getDoc(doc(db, "imoveis", codigoLimpo));
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
  } catch (e) {
    console.error("Erro ao buscar imovel por ID " + codigoLimpo, e);
  }

  return null;
}

type Step = 'tipo' | 'dados' | 'pagamento' | 'revisao';

export default function AdminContractForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreviewOnly = searchParams.get('preview') === 'true';
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const lastConvertedValueRef = useRef<number | null>(null);

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
    local: 'Balneário Camboriú - SC',
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

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const clausulasPadrao: Record<string, Array<{id: string, titulo: string, texto: string, ordem: number}>> = {
    proposta: [
      {
        id: "fallback-prop-1",
        titulo: "Do Objeto e Caráter Irretratável",
        texto: "A presente proposta tem por objeto manifestar o interesse inequívoco na aquisição/locação do imóvel, em caráter irrevogável e irretratável após o aceite do vendedor/locador.",
        ordem: 1
      },
      {
        id: "fallback-prop-2",
        titulo: "Da Validade da Proposta",
        texto: "Esta proposta é válida por 5 (cinco) dias úteis a contar de sua assinatura, findo os quais decairá sem ônus adicionais se não aceita expressamente.",
        ordem: 2
      }
    ],
    temporada: [
      {
        id: "fallback-temp-1",
        titulo: "Da Destinação do Imóvel",
        texto: "O imóvel locado destinar-se exclusivamente para fins residenciais por temporada, sendo expressamente proibida a sublocação, cessão ou uso comercial.",
        ordem: 1
      },
      {
        id: "fallback-temp-2",
        titulo: "Das Regras de Convivência e Danos",
        texto: "O locatário compromete-se a respeitar as convenções de condomínio e devolver o imóvel nas mesmas condições recebidas, respondendo integralmente por eventuais avarias.",
        ordem: 2
      }
    ],
    aluguel: [
      {
        id: "fallback-alug-1",
        titulo: "Da Vigência e Reajuste",
        texto: "A locação residencial terá o prazo pactuado nas condições gerais, sendo o aluguel reajustado anualmente com base na variação positiva do IPCA/IBGE ou outro índice oficial.",
        ordem: 1
      },
      {
        id: "fallback-alug-2",
        titulo: "Dos Encargos e Multas por Atraso",
        texto: "O pagamento do aluguel após a data do vencimento ensejará multa moratória de 10% (dez por cento) acrescida de juros de 1% ao mês pró-rata.",
        ordem: 2
      }
    ],
    venda: [
      {
        id: "fallback-venda-1",
        titulo: "Do Preço e Condições de Pagamento",
        texto: "O preço certo e ajustado da transação imobiliária dar-se-á nos estritos termos pactuados, com quitação formal descrita nos métodos de pagamento aprovados.",
        ordem: 1
      },
      {
        id: "fallback-venda-2",
        titulo: "Da Outorga da Escritura",
        texto: "A escritura definitiva de compra e venda será outorgada em favor do comprador após a quitação integral do preço ora estabelecido.",
        ordem: 2
      }
    ],
    arras_confirmatorios: [
      {
        id: "fallback-arras-1",
        titulo: "CLÁUSULA 1ª - DO OBJETO",
        texto: "O presente instrumento tem por objeto a formalização do pagamento de arras confirmatórias referente à intenção de compra e venda do imóvel descrito neste contrato.",
        ordem: 1
      },
      {
        id: "fallback-arras-2",
        titulo: "CLÁUSULA 2ª - DO IMÓVEL",
        texto: "O imóvel objeto deste instrumento é aquele identificado pelas partes, contendo suas características, localização, matrícula, cadastro e demais informações constantes neste contrato.",
        ordem: 2
      },
      {
        id: "fallback-arras-3",
        titulo: "CLÁUSULA 3ª - DO VALOR TOTAL DO NEGÓCIO",
        texto: "As partes ajustam que o valor total da negociação do imóvel será aquele informado neste instrumento, podendo ser pago conforme as condições acordadas entre comprador e vendedor.",
        ordem: 3
      },
      {
        id: "fallback-arras-4",
        titulo: "CLÁUSULA 4ª - DAS ARRAS CONFIRMATÓRIAS",
        texto: "O comprador entrega ao vendedor, neste ato ou na data indicada neste instrumento, o valor defined como arras confirmatórias, servindo como sinal de confirmação do negócio e princípio de pagamento.",
        ordem: 4
      },
      {
        id: "fallback-arras-5",
        titulo: "CLÁUSULA 5ª - DA FORMA DE PAGAMENTO DAS ARRAS",
        texto: "O pagamento das arras será realizado conforme forma, data e condições informadas neste instrumento, mediante comprovação pelas partes.",
        ordem: 5
      },
      {
        id: "fallback-arras-6",
        titulo: "CLÁUSULA 6ª - DA DESISTÊNCIA DO COMPRADOR",
        texto: "Em caso de desistência injustificada por parte do comprador, este poderá perder em favor do vendedor o valor pago a título de arras, salvo disposição diversa acordada entre as partes.",
        ordem: 6
      },
      {
        id: "fallback-arras-7",
        titulo: "CLÁUSULA 7ª - DA DESISTÊNCIA DO VENDEDOR",
        texto: "Em caso de desistência injustificada por parte do vendedor, este deverá restituir ao comprador o valor recebido a título de arras, podendo incidir devolução em dobro quando aplicável, conforme legislação vigente e condições pactuadas.",
        ordem: 7
      },
      {
        id: "fallback-arras-8",
        titulo: "CLÁUSULA 8ª - DO CONTRATO DEFINITIVO",
        texto: "As partes se comprometem a formalizar o contrato definitivo de compra e venda ou escritura pública dentro do prazo ajustado neste instrumento, desde que cumpridas as condições estabelecidas.",
        ordem: 8
      },
      {
        id: "fallback-arras-9",
        titulo: "CLÁUSULA 9ª - DAS OBRIGAÇÕES DAS PARTES",
        texto: "Comprador e vendedor comprometem-se a fornecer documentos, informações e assinaturas necessárias para conclusão da negociação, agindo com boa-fé e transparência.",
        ordem: 9
      },
      {
        id: "fallback-arras-10",
        titulo: "CLÁUSULA 10ª - DA INTERMEDIAÇÃO IMOBILIÁRIA",
        texto: "As partes reconhecem a participação da imobiliária/intermediadora na aproximação e formalização do negócio, conforme condições comerciais previamente acordadas.",
        ordem: 10
      },
      {
        id: "fallback-arras-11",
        titulo: "CLÁUSULA 11ª - DAS DISPOSIÇÕES GERAIS",
        texto: "Este instrumento obriga as partes, seus herdeiros e sucessores, sendo firmado em comum acordo, após leitura e compreensão de todas as condições.",
        ordem: 11
      },
      {
        id: "fallback-arras-12",
        titulo: "CLÁUSULA 12ª - DO FORO",
        texto: "Fica eleito o foro da comarca competente para dirimir eventuais dúvidas ou controvérsias decorrentes deste instrumento.",
        ordem: 12
      }
    ]
  };

  const [allSysClauses, setAllSysClauses] = useState<any[]>([]);

  useEffect(() => {
    const fetchSysClauses = async () => {
      console.log("Carregando cláusulas de clausulasContratos...");
      try {
        const q = query(collection(db, 'clausulasContratos'), orderBy('ordem', 'asc'));
        const snap = await getDocs(q);
        const list = snap.docs.map(dSnapshot => ({ id: dSnapshot.id, ...dSnapshot.data() }));
        console.log("Cláusulas carregadas da collection oficial:", list.length);
        
        if (list.length === 0) {
          console.log("Nenhuma cláusula cadastrada. Aplicando fallbacks padrão de cláusulas...");
          const fallbacks = Object.entries(clausulasPadrao).flatMap(([tipo, clauses]) => 
            clauses.map(c => ({
              id: c.id,
              titulo: c.titulo,
              texto: c.texto,
              ordem: c.ordem,
              ativo: true,
              obrigatorio: true,
              tipo: tipo
            }))
          );
          setAllSysClauses(fallbacks);
        } else {
          setAllSysClauses(list);
        }
      } catch (e: any) {
        console.error("Erro ao carregar cláusulas de clausulasContratos (permissão ou falha):", e?.code, e?.message, e);
        console.log("Aplicando fallbacks padrão devido à falha na leitura das cláusulas.");
        const fallbacks = Object.entries(clausulasPadrao).flatMap(([tipo, clauses]) => 
          clauses.map(c => ({
            id: c.id,
            titulo: c.titulo,
            texto: c.texto,
            ordem: c.ordem,
            ativo: true,
            obrigatorio: true,
            tipo: tipo
          }))
        );
        setAllSysClauses(fallbacks);
      }
    };
    fetchSysClauses();
  }, [contract.tipoContrato]);

  useEffect(() => {
    if (allSysClauses.length === 0) return;
    
    // Check if contract already has selected clauses
    if (contract.dados?.clausulasSelecionadas && contract.dados.clausulasSelecionadas.length > 0) {
      return;
    }

    // Auto-select mandatory clauses for the current contract type
    const mandatory = allSysClauses
      .filter(c => c.ativo && c.obrigatorio && (c.tipo === 'todos' || c.tipo === contract.tipoContrato))
      .map(c => ({
        id: c.id,
        titulo: c.titulo,
        texto: c.texto,
        ordem: c.ordem
      }));

    if (mandatory.length > 0) {
      setContract(prev => ({
        ...prev,
        dados: {
          ...prev.dados,
          clausulasSelecionadas: mandatory
        }
      }));
    }
  }, [contract.tipoContrato, allSysClauses, contract.dados?.clausulasSelecionadas]);

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

  // Preencher automaticamente o valor por extenso conforme o valor total negociado
  useEffect(() => {
    const valor = Number(contract.valor || 0);
    const section = contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos';
    const currentExtenso = contract.dados?.[section]?.valorExtenso || '';

    if (valor > 0 && (currentExtenso === '' || lastConvertedValueRef.current !== valor)) {
      const extensoGerado = valorMonetarioPorExtenso(valor);
      lastConvertedValueRef.current = valor;

      setContract(prev => {
        const currentSectionData = prev.dados?.[section] || {};
        if (currentSectionData.valorExtenso === extensoGerado) {
          return prev;
        }
        return {
          ...prev,
          dados: {
            ...prev.dados,
            [section]: {
              ...currentSectionData,
              valorExtenso: extensoGerado
            }
          }
        };
      });
    }
  }, [contract.valor, contract.tipoContrato]);

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
          const data = docSnap.data() as any;
          if (data.tipoContrato === 'arras_confirmatorios') {
            if (!data.dados) data.dados = {};
            if (!data.dados.proponente) data.dados.proponente = {};
            if (!data.dados.vendedor) data.dados.vendedor = {};
            if (!data.dados.arras) data.dados.arras = {};
            
            if (data.comprador) {
              data.dados.proponente = {
                ...data.dados.proponente,
                cpf: data.comprador.documento || data.dados.proponente.cpf,
                cpfCnpj: data.comprador.documento || data.dados.proponente.cpfCnpj,
                rg: data.comprador.rg || data.dados.proponente.rg,
                estadoCivil: data.comprador.estadoCivil || data.dados.proponente.estadoCivil,
                profissao: data.comprador.profissao || data.dados.proponente.profissao,
                telefone: data.comprador.telefone || data.dados.proponente.telefone,
                whatsapp: data.comprador.whatsapp || data.dados.proponente.whatsapp,
                email: data.comprador.email || data.dados.proponente.email,
                endereco: data.comprador.endereco || data.dados.proponente.endereco,
              };
            }
            if (data.vendedor) {
              data.dados.vendedor = {
                ...data.dados.vendedor,
                cpf: data.vendedor.documento || data.dados.vendedor.cpf,
                cpfCnpj: data.vendedor.documento || data.dados.vendedor.cpfCnpj,
                rg: data.vendedor.rg || data.dados.vendedor.rg,
                estadoCivil: data.vendedor.estadoCivil || data.dados.vendedor.estadoCivil,
                profissao: data.vendedor.profissao || data.dados.vendedor.profissao,
                telefone: data.vendedor.telefone || data.dados.vendedor.telefone,
                whatsapp: data.vendedor.whatsapp || data.dados.vendedor.whatsapp,
                email: data.vendedor.email || data.dados.vendedor.email,
                endereco: data.vendedor.endereco || data.dados.vendedor.endereco,
              };
            }
            
            data.valorImovel = data.valorImovel || data.dados.arras?.valorImovel || 0;
            data.valorArras = data.valorArras || data.dados.arras?.valorArras || 0;
            data.formaPagamentoArras = data.formaPagamentoArras || data.dados.arras?.formaPagamentoArras || "";
            data.dataPagamentoArras = data.dataPagamentoArras || data.dados.arras?.dataPagamentoArras || "";
            data.prazoContratoDefinitivo = data.prazoContratoDefinitivo || data.dados.arras?.prazoContratoDefinitivo || "";
            data.prazoEscritura = data.prazoEscritura || data.dados.arras?.prazoEscritura || "";

            data.dados.arras = {
              ...data.dados.arras,
              valorImovel: data.valorImovel,
              valorArras: data.valorArras,
              formaPagamentoArras: data.formaPagamentoArras,
              dataPagamentoArras: data.dataPagamentoArras,
              prazoContratoDefinitivo: data.prazoContratoDefinitivo,
              prazoEscritura: data.prazoEscritura
            };
          }
          setContract({ id: docSnap.id, ...data } as Contract);
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

  useEffect(() => {
    const handleUrlParam = async () => {
      const imovelParam = searchParams.get('imovel') || searchParams.get('imovelId');
      if (imovelParam && !id) {
        setLoading(true);
        try {
          const foundImovel = await buscarImovelPorCodigoOuId(imovelParam);
          if (foundImovel) {
            handlePropertySelect(foundImovel as any);
          }
        } catch (error) {
          console.error("Erro ao buscar imóvel do parâmetro da URL:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    handleUrlParam();
  }, [searchParams, id]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setContract(prev => {
      const isArras = prev.tipoContrato === 'arras_confirmatorios';
      const defaultVal = isArras 
        ? (getValorVendaImovel(property) || 0) 
        : (prev.tipoContrato === 'proposta' ? (getValorVendaImovel(property) || 0) : prev.valor);
      
      const updatedDados = {
        ...prev.dados,
        imovel: {
          ...prev.dados?.imovel,
          matricula: getMatriculaImovel(property),
          cri: getCriImovel(property),
          tipo: property.propertyType || (property as any).tipoImovel || '',
          descricao: property.shortDescription || property.title || getTituloImovel(property),
          codigo: getCodigoImovel(property),
          titulo: getTituloImovel(property),
          endereco: montarEnderecoImovel(property),
          bairro: property.neighborhood || (property as any).bairro || '',
          cidade: property.city || (property as any).cidade || '',
          estado: property.state || (property as any).estado || '',
          valorVenda: getValorVendaImovel(property),
          valorCondominio: property.condoFee || (property as any).valorCondominio || (property as any).condominio || "",
          valorIptu: property.iptu || (property as any).valorIptu || (property as any).iptu || ""
        }
      };

      if (isArras) {
        if (!updatedDados.vendedor) updatedDados.vendedor = {};
        updatedDados.vendedor = {
          ...updatedDados.vendedor,
          nome: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || '',
          telefone: property.ownerPhone || '',
          email: property.ownerEmail || ''
        };
        if (!updatedDados.arras) updatedDados.arras = {};
        updatedDados.arras = {
          ...updatedDados.arras,
          valorImovel: getValorVendaImovel(property)
        };
      }

      return {
        ...prev,
        // Root attributes as requested
        imovelId: property.id,
        imovelCodigo: getCodigoImovel(property),
        imovelTitulo: getTituloImovel(property) || "Imóvel",
        imovelNomeEdificio: (property as any).nomeEdificio || (property as any).edificio || (property as any).nomeEmpreendimento || (property as any).empreendimento || (property as any).condoName || (property as any).buildingName || "",
        imovelTipo: property.propertyType || (property as any).tipoImovel || "",
        imovelTipoNegocio: (property as any).tipoNegocio || property.businessType || "",
        imovelEndereco: montarEnderecoImovel(property),
        imovelBairro: property.neighborhood || (property as any).bairro || "",
        imovelCidade: property.city || (property as any).cidade || "",
        imovelEstado: property.state || (property as any).estado || "",
        imovelMatricula: getMatriculaImovel(property),
        imovelCri: getCriImovel(property),

        valorImovel: getValorVendaImovel(property),
        valorVenda: getValorVendaImovel(property),
        valorCondominio: property.condoFee || (property as any).valorCondominio || (property as any).condominio || "",
        valorIptu: property.iptu || (property as any).valorIptu || (property as any).iptu || "",

        proprietario: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || "",
        corretorResponsavel: (property as any).corretorResponsavel || (property as any).brokerName || "",

        enderecoImovel: montarEnderecoImovel(property),
        nomeVendedor: property.ownerName || (property as any).proprietario || (property as any).nomeProprietario || '',
        valor: defaultVal,
        dados: updatedDados
      };
    });
  };

  const saveContract = async (finalizar = false) => {
    if (!isAdmin) {
      showToast('Usuário sem permissão administrativa.', 'error');
      return;
    }
    if (!contract.nomeCliente || !contract.valor) {
      showToast('Por favor, preencha o nome do cliente e o valor.', 'error');
      return;
    }

    if (contract.tipoContrato === 'proposta') {
      const im_id = contract.imovelId || '';
      const im_matricula = (contract as any).imovelMatricula || contract.dados?.imovel?.matricula || '';
      const im_cri = (contract as any).imovelCri || contract.dados?.imovel?.cri || '';
      const val_proposta = Number((contract as any).valorProposta || contract.valor || 0);

      if (!im_id) {
        alert("Selecione um imóvel para criar a proposta.");
        return;
      }
      if (!im_matricula) {
        alert("Informe o número da matrícula do imóvel.");
        return;
      }
      if (!im_cri) {
        alert("Informe o CRI do imóvel.");
        return;
      }
      if (!val_proposta || val_proposta <= 0) {
        alert("Informe o valor da proposta.");
        return;
      }
    }

    const propertyWarranty = selectedProperty?.leaseWarrantyType || (selectedProperty as any)?.garantiaLocaticia || contract.dados?.imovel?.leaseWarrantyType || contract.dados?.imovel?.garantiaLocaticia || '';
    const isCaucao = propertyWarranty === 'Caução' || propertyWarranty === 'Depósito Caução' || propertyWarranty === 'Depósito antecipado';
    const caucaoValue = Number(contract.dados?.valores?.taxaCaucao || 0);
    if (isCaucao && caucaoValue <= 0) {
      alert("Atenção: A modalidade de garantia do imóvel selecionado é Caução, mas o valor correspondente (Valor Caução) não foi preenchido!");
      return;
    }

    if (contract.tipoContrato === 'locacao_temporaria') {
      const days = contract.dados?.prazo?.quantidadeDias || 0;
      if (days > 90) {
        showToast('A locação temporária não pode ultrapassar 90 dias.', 'error');
        return;
      }
    }

    setLoading(true);
    
    // Clean data from undefined/NaN values to prevent Firestore crashes
    const cleanFirestoreData = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj
          .map(cleanFirestoreData)
          .filter(item => item !== undefined);
      }

      if (obj && typeof obj === 'object') {
        // Safe check for special Firestore FieldValue objects or custom SDK types
        if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
          return obj;
        }
        
        const cleaned: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          if (value === undefined) return;
          if (typeof value === 'number' && !Number.isFinite(value)) {
            cleaned[key] = 0;
            return;
          }
          if (value && typeof value === 'object') {
            cleaned[key] = cleanFirestoreData(value);
            return;
          }
          cleaned[key] = value;
        });
        return cleaned;
      }
      return obj;
    };

    try {
      const dadosContrato = {
        ...contract,
        status: finalizar ? 'finalizado' : (contract.status || 'rascunho'),
        imovelId: contract.imovelId || selectedProperty?.id || '',
        imovelCodigo: selectedProperty?.code || contract.imovelCodigo || '',
        imovelTitulo: (contract as any).imovelTitulo || selectedProperty?.title || getTituloImovel(selectedProperty) || '',
        imovelNomeEdificio: (contract as any).imovelNomeEdificio || (selectedProperty as any)?.nomeEdificio || (selectedProperty as any)?.buildingName || "",
        imovelMatricula: (contract as any).imovelMatricula || contract.dados?.imovel?.matricula || '',
        imovelCri: (contract as any).imovelCri || contract.dados?.imovel?.cri || '',
        valorTotalNegociado: Number(contract.valor || 0),
        valorPorExtenso: contract.dados?.[contract.tipoContrato === 'proposta' ? 'pagamento' : 'termos']?.valorExtenso || valorMonetarioPorExtenso(Number(contract.valor || 0)),
        locadorNome: contract.dados?.locador?.nome || contract.nomeVendedor || '',
        locadorDocumento: contract.dados?.locador?.cpf || '',
        locatarioNome: contract.nomeCliente || '',
        locatarioDocumento: contract.dados?.locatario?.cpf || contract.dados?.proponente?.cpf || '',
        valorAluguel: contract.valor || 0,
        valorTotalLocatario: contract.valor || 0,
        valorRepasseLocador: contract.valor || 0,
        clausulasAplicadas: contract.dados?.clausulasSelecionadas || [],
        atualizadoEm: serverTimestamp(),
        criadoPor: user?.uid || null
      } as any;

      if (contract.tipoContrato === 'proposta') {
        dadosContrato.imovelId = contract.imovelId || '';
        dadosContrato.imovelCodigo = (contract as any).imovelCodigo || '';
        dadosContrato.imovelTitulo = (contract as any).imovelTitulo || (contract as any).imovelNomeEdificio || (selectedProperty as any)?.nomeEdificio || (selectedProperty as any)?.buildingName || getTituloImovel(selectedProperty) || 'Imóvel';
        dadosContrato.imovelNomeEdificio = (contract as any).imovelNomeEdificio || (selectedProperty as any)?.nomeEdificio || (selectedProperty as any)?.buildingName || '';
        dadosContrato.imovelEndereco = (contract as any).imovelEndereco || '';
        dadosContrato.imovelBairro = (contract as any).imovelBairro || '';
        dadosContrato.imovelCidade = (contract as any).imovelCidade || '';
        dadosContrato.imovelEstado = (contract as any).imovelEstado || '';
        dadosContrato.imovelMatricula = (contract as any).imovelMatricula || contract.dados?.imovel?.matricula || '';
        dadosContrato.imovelCri = (contract as any).imovelCri || contract.dados?.imovel?.cri || '';
        dadosContrato.valorImovel = Number((contract as any).valorImovel || 0);
        dadosContrato.valorProposta = Number((contract as any).valorProposta || contract.valor || 0);
        
        const p = contract.dados?.proponente || {};
        const v = contract.dados?.vendedor || {};

        dadosContrato.comprador = {
          nome: contract.nomeCliente || "",
          documento: p.cpf || p.cpfCnpj || p.documento || "",
          rg: p.rg || "",
          estadoCivil: p.estadoCivil || "",
          profissao: p.profissao || "",
          telefone: p.telefone || "",
          whatsapp: p.whatsapp || "",
          email: p.email || "",
          endereco: p.endereco || ""
        };

        dadosContrato.vendedor = {
          nome: contract.nomeVendedor || "",
          documento: v.cpf || v.cpfCnpj || v.documento || "",
          rg: v.rg || "",
          estadoCivil: v.estadoCivil || "",
          profissao: v.profissao || "",
          telefone: v.telefone || "",
          whatsapp: v.whatsapp || "",
          email: v.email || "",
          endereco: v.endereco || ""
        };

        dadosContrato.formaPagamento = contract.dados?.pagamento?.outrasCondicoes || contract.dados?.pagamento?.descricao || "";
        dadosContrato.observacoes = contract.dados?.pagamento?.observacoes || contract.dados?.observacoes || "";
        
        dadosContrato.status = contract.status || "Pendente";
      }

      if (contract.tipoContrato === 'arras_confirmatorios') {
        const d = contract.dados || {};
        const p = d.proponente || {};
        const v = d.vendedor || {};
        const a = d.arras || {};
        
        dadosContrato.tipoContratoLabel = "Arras Confirmatórios";
        dadosContrato.valorImovel = Number(a.valorImovel || contract.valorImovel || contract.valor || 0);
        dadosContrato.valorArras = Number(a.valorArras || 0);
        dadosContrato.formaPagamentoArras = a.formaPagamentoArras || "";
        dadosContrato.dataPagamentoArras = a.dataPagamentoArras || "";
        dadosContrato.prazoContratoDefinitivo = a.prazoContratoDefinitivo || "";
        dadosContrato.prazoEscritura = a.prazoEscritura || "";

        dadosContrato.comprador = {
          nome: contract.nomeCliente || "",
          documento: p.cpf || p.cpfCnpj || p.documento || "",
          rg: p.rg || "",
          estadoCivil: p.estadoCivil || "",
          profissao: p.profissao || "",
          telefone: p.telefone || "",
          whatsapp: p.whatsapp || "",
          email: p.email || "",
          endereco: p.endereco || ""
        };

        dadosContrato.vendedor = {
          nome: contract.nomeVendedor || "",
          documento: v.cpf || v.cpfCnpj || v.documento || "",
          rg: v.rg || "",
          estadoCivil: v.estadoCivil || "",
          profissao: v.profissao || "",
          telefone: v.telefone || "",
          whatsapp: v.whatsapp || "",
          email: v.email || "",
          endereco: v.endereco || ""
        };
      }

      if (finalizar) {
        (dadosContrato as any).finalizadoEm = serverTimestamp();
      }

      const cleanedData = cleanFirestoreData(dadosContrato);
      console.log("Salvando contrato final/rascunho no Firestore:", cleanedData);

      let savedId = id;
      if (!id) {
        cleanedData.criadoEm = serverTimestamp();
        const docRef = await addDoc(collection(db, 'contratos'), cleanedData);
        savedId = docRef.id;
        console.log("Contrato novo criado com sucesso. ID gerado:", savedId);
        
        if (contract.tipoContrato === 'proposta') {
          await setDoc(doc(db, 'propostas', savedId), cleanedData);
          console.log("Cópia da proposta salva na coleção 'propostas' ID:", savedId);
        }
      } else {
        await updateDoc(doc(db, 'contratos', id), cleanedData);
        console.log("Contrato existente atualizado com sucesso. ID:", id);
        
        if (contract.tipoContrato === 'proposta') {
          await setDoc(doc(db, 'propostas', id), cleanedData, { merge: true });
          console.log("Cópia da proposta atualizada na coleção 'propostas' ID:", id);
        }
      }

      showToast(finalizar ? 'Contrato finalizado e salvo com sucesso!' : 'Contrato salvo como rascunho com sucesso!', 'success');

      if (finalizar) {
         console.log("Iniciando geração automática do PDF pós salvamento...");
         if (!id && savedId) {
           navigate(`/admin/contratos/editar/${savedId}?preview=true`);
         }
         setTimeout(() => {
           downloadPDF();
         }, 1000);
      } else {
        setTimeout(() => {
          navigate('/admin/contratos');
        }, 1500);
      }
    } catch (error: any) {
      console.error("Erro ao salvar contrato no Firestore (Caminho: contratos):", error?.code, error?.message, error);
      showToast(`Erro ao finalizar contrato: ${error?.message || error}`, 'error');
    } finally {
      setLoading(false);
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

  const downloadPDF = async () => {
    const element = document.getElementById("contrato-pdf") || printRef.current;
    if (!element) {
      console.error("Elemento #contrato-pdf não encontrado.");
      showToast("Elemento do contrato não encontrado para gerar PDF.", "error");
      return;
    }
    
    setLoading(true);
    const companyName = settings?.empresa?.nome || 'Menta Negócios Imobiliários';
    const companyCnpj = settings?.empresa?.cnpj || '63.572.479/0001-50';
    const companyCreci = settings?.empresa?.creciPj || '11255PJ';

    console.log("Iniciando geração do PDF do contrato...");
    const safeContract = cleanSerializableData(contract);
    console.log("Contrato:", safeContract);
    console.log("Dados do contrato:", safeContract?.dados);
    console.log("Elemento PDF encontrado:", !!element, "ID:", element?.id);

    try {
      JSON.stringify(safeContract);
      console.log("Dados do contrato serializáveis OK");
    } catch (err: any) {
      console.error("Ainda existe estrutura circular em safeContract:", err);
    }

    try {
      // Small timeout to ensure all components are fully rendered and styles applied
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      debugOklabColors(element);
      sanitizePdfColors(element);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll("*");
          elements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const style = window.getComputedStyle(el);
            const properties = ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'fill', 'stroke'];
            
            properties.forEach(prop => {
              try {
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
              } catch (e) {}
            });
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate the total height of the image on the PDF while maintaining aspect ratio
      const imgHeightInPdf = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeightInPdf;
      let position = 0;

      // Function to add footer to each page
      const addPageDecorations = (pageNum: number, totalPages: number) => {
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        const footerText = `${companyName} • CNPJ: ${companyCnpj} • CRECI PJ: ${companyCreci}`;
        const pageText = `Página ${pageNum} de ${totalPages}`;
        
        pdf.text(footerText, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
        pdf.text(pageText, pdfWidth - 15, pdfHeight - 10, { align: 'right' });
      };

      const totalPages = Math.ceil(imgHeightInPdf / (pdfHeight - 20)) || 1; // Subtract margin

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
      addPageDecorations(1, totalPages);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      let currentPage = 2;
      while (heightLeft > 0 && currentPage <= totalPages) {
        position = (currentPage - 1) * -pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        addPageDecorations(currentPage, totalPages);
        heightLeft -= pdfHeight;
        currentPage++;
      }
      
      pdf.save(`Contrato_${contract.nomeCliente || 'Pendente'}_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
    } catch (error: any) {
      console.error("Erro real ao gerar PDF do contrato:", error);
      console.error("Mensagem:", error?.message);
      console.error("Stack:", error?.stack);
      showToast(`Erro ao gerar PDF: ${error?.message || error}`, 'error');
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

  const handleAddClauseFromSys = (sysClause: any) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const exists = selectedClauses.some((c: any) => c.id === sysClause.id);
    if (exists) return;

    const updated = [...selectedClauses, {
      id: sysClause.id,
      titulo: sysClause.titulo,
      texto: sysClause.texto,
      ordem: selectedClauses.length + 1
    }];
    
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleRemoveClause = (clauseId: string, idx: number) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.filter((c: any, i: number) => c.id !== clauseId && i !== idx);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleClauseTextChange = (idx: number, newText: string) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.map((c: any, i: number) => i === idx ? { ...c, texto: newText } : c);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleClauseTitleChange = (idx: number, newTitle: string) => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = selectedClauses.map((c: any, i: number) => i === idx ? { ...c, titulo: newTitle } : c);
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleAddCustomClause = () => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const updated = [...selectedClauses, {
      id: 'custom-' + Date.now(),
      titulo: 'Nova Cláusula Personalizada',
      texto: '',
      ordem: selectedClauses.length + 1
    }];
    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: updated
      }
    }));
  };

  const handleMoveClause = (idx: number, direction: 'up' | 'down') => {
    const selectedClauses = contract.dados?.clausulasSelecionadas || [];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedClauses.length) return;

    const copy = [...selectedClauses];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;

    setContract(prev => ({
      ...prev,
      dados: {
        ...prev?.dados,
        clausulasSelecionadas: copy
      }
    }));
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
    <div className="space-y-10 pb-20 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            notification.type === 'success' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
          }`}>
            <Check size={12} />
          </div>
          <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      )}

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
                onClick={() => downloadPDF()}
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[
                { id: 'proposta', title: 'Proposta de Compra', icon: FileText, desc: 'Primeiro contato com oferta de valor e condições.' },
                { id: 'contraproposta', title: 'Contraproposta', icon: AlertCircle, desc: 'Resposta do vendedor com novos termos.' },
                { id: 'aceite', title: 'Aceite de Termos', icon: Check, desc: 'Formalização final do acordo entre as partes.' },
                { id: 'locacao_temporaria', title: 'Locação Temporária', icon: Calendar, desc: 'Contrato para aluguéis de temporada e curtos períodos.' },
                { id: 'arras_confirmatorios', title: 'Arras Confirmatórios', icon: CreditCard, desc: 'Instrumento para formalizar sinal de pagamento e compromisso entre comprador e vendedor.' }
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
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.locador?.telefone || ''} onChange={e => updateDados('locador', 'telefone', e.target.value)} />
                            <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.locador?.whatsapp || ''} onChange={e => updateDados('locador', 'whatsapp', e.target.value)} />
                          </div>
                          <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.locador?.email || ''} onChange={e => updateDados('locador', 'email', e.target.value)} />
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locador?.endereco || ''} onChange={e => updateDados('locador', 'endereco', e.target.value)} />
                          <div className="grid grid-cols-3 gap-4">
                            <input type="text" className="col-span-1 input-field" placeholder="CEP" value={contract.dados.locador?.cep || ''} onChange={e => updateDados('locador', 'cep', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Cidade" value={contract.dados.locador?.cidade || ''} onChange={e => updateDados('locador', 'cidade', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Estado" value={contract.dados.locador?.estado || ''} onChange={e => updateDados('locador', 'estado', e.target.value)} />
                          </div>
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
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.locatario?.telefone || ''} onChange={e => updateDados('locatario', 'telefone', e.target.value)} />
                            <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.locatario?.whatsapp || ''} onChange={e => updateDados('locatario', 'whatsapp', e.target.value)} />
                          </div>
                          <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.locatario?.email || ''} onChange={e => updateDados('locatario', 'email', e.target.value)} />
                          <input type="text" className="input-field" placeholder="Endereço Residencial" value={contract.dados.locatario?.endereco || ''} onChange={e => updateDados('locatario', 'endereco', e.target.value)} />
                          <div className="grid grid-cols-3 gap-4">
                            <input type="text" className="col-span-1 input-field" placeholder="CEP" value={contract.dados.locatario?.cep || ''} onChange={e => updateDados('locatario', 'cep', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Cidade" value={contract.dados.locatario?.cidade || ''} onChange={e => updateDados('locatario', 'cidade', e.target.value)} />
                            <input type="text" className="col-span-1 input-field" placeholder="Estado" value={contract.dados.locatario?.estado || ''} onChange={e => updateDados('locatario', 'estado', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fiador (Opcional - Se Houver) */}
                    <div className="border-t border-gray-100 pt-8 mt-8 space-y-6">
                      <h4 className="text-xs font-black text-gold uppercase tracking-widest border-b border-gray-100 pb-2">Fiador (Opcional - Se Houver)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo do Fiador</label>
                            <input type="text" className="input-field" placeholder="Nome Completo" value={contract.dados.fiador?.nome || ''} onChange={e => updateDados('fiador', 'nome', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF / CNPJ</label>
                              <input type="text" className="input-field" placeholder="Documento" value={contract.dados.fiador?.cpfCnpj || ''} onChange={e => updateDados('fiador', 'cpfCnpj', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.fiador?.telefone || ''} onChange={e => updateDados('fiador', 'telefone', e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.fiador?.email || ''} onChange={e => updateDados('fiador', 'email', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial do Fiador</label>
                            <input type="text" className="input-field" placeholder="Endereço Completo" value={contract.dados.fiador?.endereco || ''} onChange={e => updateDados('fiador', 'endereco', e.target.value)} />
                          </div>
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
                            <option key={p.id} value={p.id}>
                              {getCodigoImovel(p)} - {getTituloImovel(p)} ({p.neighborhood || (p as any).bairro || "Sem bairro Check"} - R$ {getValorVendaImovel(p) ? formatCurrency(getValorVendaImovel(p)) : "Sob Consulta"})
                            </option>
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

                    {contract.imovelId && (
                      <div className="mt-8 p-6 bg-gold/5 rounded-2xl border border-gold/10 space-y-4">
                        <h4 className="text-sm font-black text-gold uppercase tracking-wider">Resumo do Imóvel Selecionado</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Código:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelCodigo || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Título:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelTitulo || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Endereço:</span>
                            <span className="text-gray-900 font-semibold">{(contract as any).imovelEndereco || contract.enderecoImovel || "Não informado"}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Bairro / Cidade:</span>
                            <span className="text-gray-900 font-semibold">
                              {(contract as any).imovelBairro || ""}{(contract as any).imovelCidade ? ` / ${(contract as any).imovelCidade}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Valor de Venda (R$):</span>
                            <span className="text-gray-900 font-semibold">
                              {(contract as any).valorVenda ? formatCurrency(Number((contract as any).valorVenda)) : "Sob Consulta"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">Matrícula do Imóvel:</span>
                            {getMatriculaImovel(contract) ? (
                              <span className="text-gray-900 font-semibold">{getMatriculaImovel(contract)}</span>
                            ) : (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  className="input-field py-1 text-xs"
                                  placeholder="Preencher matrícula obrigatoriamente *"
                                  value={(contract as any).imovelMatricula || ""}
                                  onChange={(e) => {
                                    setContract(prev => ({
                                      ...prev,
                                      imovelMatricula: e.target.value,
                                      dados: {
                                        ...prev.dados,
                                        imovel: {
                                          ...prev.dados?.imovel,
                                          matricula: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-[10px] text-red-500 mt-0.5">A matrícula é obrigatória para gerar esta proposta.</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-400 uppercase block">CRI do Imóvel:</span>
                            {getCriImovel(contract) ? (
                              <span className="text-gray-900 font-semibold">{getCriImovel(contract)}</span>
                            ) : (
                              <div className="mt-1">
                                <input
                                  type="text"
                                  className="input-field py-1 text-xs"
                                  placeholder="Preencher CRI obrigatoriamente *"
                                  value={(contract as any).imovelCri || ""}
                                  onChange={(e) => {
                                    setContract(prev => ({
                                      ...prev,
                                      imovelCri: e.target.value,
                                      dados: {
                                        ...prev.dados,
                                        imovel: {
                                          ...prev.dados?.imovel,
                                          cri: e.target.value
                                        }
                                      }
                                    }));
                                  }}
                                />
                                <p className="text-[10px] text-red-500 mt-0.5">O CRI é obrigatório para gerar esta proposta.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.telefone || ''} onChange={e => updateDados('proponente', 'telefone', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.whatsapp || ''} onChange={e => updateDados('proponente', 'whatsapp', e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" value={contract.dados.proponente?.email || ''} onChange={e => updateDados('proponente', 'email', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço Residencial</label>
                            <input type="text" className="input-field" value={contract.dados.proponente?.endereco || ''} onChange={e => updateDados('proponente', 'endereco', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CEP</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cep || ''} onChange={e => updateDados('proponente', 'cep', e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.cidade || ''} onChange={e => updateDados('proponente', 'cidade', e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado</label>
                              <input type="text" className="input-field" value={contract.dados.proponente?.estado || ''} onChange={e => updateDados('proponente', 'estado', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vendedor */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-gold uppercase tracking-[0.2em] mb-4">Vendedor / Parte Aceitante</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="Nome Completo"
                              value={contract.nomeVendedor} 
                              onChange={e => setContract({...contract, nomeVendedor: e.target.value})} 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CPF</label>
                              <input type="text" className="input-field" placeholder="CPF" value={contract.dados.vendedor?.cpf || contract.dados.aceitante?.cpf || ''} onChange={e => {
                                updateDados('vendedor', 'cpf', e.target.value);
                                updateDados('aceitante', 'cpf', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">RG</label>
                              <input type="text" className="input-field" placeholder="RG" value={contract.dados.vendedor?.rg || contract.dados.aceitante?.rg || ''} onChange={e => {
                                updateDados('vendedor', 'rg', e.target.value);
                                updateDados('aceitante', 'rg', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado Civil</label>
                              <select className="input-field" value={contract.dados.vendedor?.estadoCivil || contract.dados.aceitante?.estadoCivil || 'Solteiro(a)'} onChange={e => {
                                updateDados('vendedor', 'estadoCivil', e.target.value);
                                updateDados('aceitante', 'estadoCivil', e.target.value);
                              }}>
                                <option value="Solteiro(a)">Solteiro(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Divorciado(a)">Divorciado(a)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Profissão</label>
                              <input type="text" className="input-field" placeholder="Profissão" value={contract.dados.vendedor?.profissao || contract.dados.aceitante?.profissao || ''} onChange={e => {
                                updateDados('vendedor', 'profissao', e.target.value);
                                updateDados('aceitante', 'profissao', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Telefone</label>
                              <input type="text" className="input-field" placeholder="Telefone" value={contract.dados.vendedor?.telefone || contract.dados.aceitante?.telefone || ''} onChange={e => {
                                updateDados('vendedor', 'telefone', e.target.value);
                                updateDados('aceitante', 'telefone', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                              <input type="text" className="input-field" placeholder="WhatsApp" value={contract.dados.vendedor?.whatsapp || contract.dados.aceitante?.whatsapp || ''} onChange={e => {
                                updateDados('vendedor', 'whatsapp', e.target.value);
                                updateDados('aceitante', 'whatsapp', e.target.value);
                              }} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input type="email" className="input-field" placeholder="E-mail" value={contract.dados.vendedor?.email || contract.dados.aceitante?.email || ''} onChange={e => {
                              updateDados('vendedor', 'email', e.target.value);
                              updateDados('aceitante', 'email', e.target.value);
                            }} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Endereço</label>
                            <input type="text" className="input-field" placeholder="Endereço" value={contract.dados.vendedor?.endereco || contract.dados.aceitante?.endereco || ''} onChange={e => {
                              updateDados('vendedor', 'endereco', e.target.value);
                              updateDados('aceitante', 'endereco', e.target.value);
                            }} />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">CEP</label>
                              <input type="text" className="input-field" placeholder="CEP" value={contract.dados.vendedor?.cep || contract.dados.aceitante?.cep || ''} onChange={e => {
                                updateDados('vendedor', 'cep', e.target.value);
                                updateDados('aceitante', 'cep', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cidade</label>
                              <input type="text" className="input-field" placeholder="Cidade" value={contract.dados.vendedor?.cidade || contract.dados.aceitante?.cidade || ''} onChange={e => {
                                updateDados('vendedor', 'cidade', e.target.value);
                                updateDados('aceitante', 'cidade', e.target.value);
                              }} />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Estado</label>
                              <input type="text" className="input-field" placeholder="Estado" value={contract.dados.vendedor?.estado || contract.dados.aceitante?.estado || ''} onChange={e => {
                                updateDados('vendedor', 'estado', e.target.value);
                                updateDados('aceitante', 'estado', e.target.value);
                              }} />
                            </div>
                          </div>
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
                  {contract.tipoContrato === 'arras_confirmatorios' ? (
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-primary-black">Dados das Arras Confirmatórias</h3>
                          <p className="text-sm text-gray-400">Preencha os valores, prazos e condições do sinal.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Valor do Imóvel (R$)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={maskCurrency(contract.dados?.arras?.valorImovel ?? contract.valorImovel ?? contract.valor ?? '')}
                            onChange={e => {
                              const num = parseCurrencyToNumber(e.target.value);
                              setContract(prev => ({ ...prev, valor: num, valorImovel: num }));
                              updateDados('arras', 'valorImovel', num);
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gold uppercase tracking-widest pl-1">Valor das Arras / Sinal (R$)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            value={maskCurrency(contract.dados?.arras?.valorArras ?? '')}
                            onChange={e => updateDados('arras', 'valorArras', parseCurrencyToNumber(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Forma de Pagamento das Arras</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: PIX / Transferência"
                            value={contract.dados?.arras?.formaPagamentoArras || ''}
                            onChange={e => updateDados('arras', 'formaPagamentoArras', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Data do Pagamento das Arras</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: Até 05/06/2026 ou Na assinatura"
                            value={contract.dados?.arras?.dataPagamentoArras || ''}
                            onChange={e => updateDados('arras', 'dataPagamentoArras', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Prazo Contrato Definitivo</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: 30 dias"
                            value={contract.dados?.arras?.prazoContratoDefinitivo || ''}
                            onChange={e => updateDados('arras', 'prazoContratoDefinitivo', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Prazo para Escritura</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Ex: 60 dias"
                            value={contract.dados?.arras?.prazoEscritura || ''}
                            onChange={e => updateDados('arras', 'prazoEscritura', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Condições para Devolução</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições para devolução do sinal..."
                            value={contract.dados?.arras?.condicoesDevolucao || ''}
                            onChange={e => updateDados('arras', 'condicoesDevolucao', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Desistência do Comprador</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições em caso de desistência do comprador..."
                            value={contract.dados?.arras?.condicoesDesistenciaComprador || ''}
                            onChange={e => updateDados('arras', 'condicoesDesistenciaComprador', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Desistência do Vendedor</label>
                          <textarea 
                            rows={3}
                            className="input-field py-4 min-h-[90px]" 
                            placeholder="Condições em caso de desistência do vendedor..."
                            value={contract.dados?.arras?.condicoesDesistenciaVendedor || ''}
                            onChange={e => updateDados('arras', 'condicoesDesistenciaVendedor', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Observações Adicionais</label>
                        <textarea 
                          rows={2}
                          className="input-field py-4 min-h-[60px]" 
                          placeholder="Observações adicionais para o contrato..."
                          value={contract.observacoes || ''}
                          onChange={e => setContract(prev => ({ ...prev, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
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
                  )}

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

              {/* DYNAMIC CONTRACT CLAUSES MANAGER */}
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 mt-10">
                <div className="flex items-center gap-4 mb-6 text-left">
                  <div className="w-12 h-12 bg-primary-black text-gold rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText size={24} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-display font-bold text-primary-black">Cláusulas do Contrato</h3>
                    <p className="text-sm text-gray-400">Selecione, ordene ou personalize cláusulas dinâmicas oficiais da imobiliária para este documento.</p>
                  </div>
                </div>

                {/* System-wide active template clauses selector */}
                {allSysClauses.length > 0 && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100/50 text-left">
                    <p className="text-[10px] font-black uppercase text-gold tracking-widest mb-3 select-none">Ativar Clausulas do Banco de Dados</p>
                    <div className="flex flex-wrap gap-2">
                      {allSysClauses
                        .filter(sys => sys.ativo && (sys.tipo === 'todos' || sys.tipo === contract.tipoContrato))
                        .map(sys => {
                          const isSelected = (contract.dados?.clausulasSelecionadas || []).some((c: any) => c.id === sys.id);
                          return (
                            <button
                              key={sys.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  const idx = (contract.dados?.clausulasSelecionadas || []).findIndex((c: any) => c.id === sys.id);
                                  if (idx !== -1) handleRemoveClause(sys.id, idx);
                                } else {
                                  handleAddClauseFromSys(sys);
                                }
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                                isSelected 
                                  ? 'bg-gold/10 text-gold border-gold/30' 
                                  : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-150 shadow-sm'
                              }`}
                            >
                              <span>{sys.titulo}</span>
                              {isSelected ? <Check size={14} className="text-gold" /> : <Plus size={14} />}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Edit list of selected clauses for current contract */}
                <div className="space-y-4">
                  {(contract.dados?.clausulasSelecionadas || []).length === 0 ? (
                    <p className="text-sm text-center text-gray-400 py-10 border border-dashed border-gray-150 rounded-3xl bg-gray-50/20">
                      Nenhuma cláusula dinâmica ativa neste documento. Use os botões acima ou adicione uma cláusula personalizada abaixo.
                    </p>
                  ) : (
                    (contract.dados?.clausulasSelecionadas || []).map((clause: any, idx: number) => (
                      <div key={clause.id || idx} className="p-6 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-3xl transition-all space-y-3 text-left">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-grow">
                            <span className="w-6 h-6 bg-gold/15 text-gold text-xs font-black rounded-full flex items-center justify-center select-none">
                              {idx + 1}
                            </span>
                            <input 
                              type="text"
                              className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gold focus:outline-none font-bold text-sm text-primary-black py-0.5 flex-grow font-sans"
                              value={clause.titulo}
                              onChange={(e) => handleClauseTitleChange(idx, e.target.value)}
                              placeholder="Título da cláusula..."
                            />
                          </div>
                          
                          {/* Actions and order controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveClause(idx, 'up')}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-35 shadow-sm"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (contract.dados?.clausulasSelecionadas || []).length - 1}
                              onClick={() => handleMoveClause(idx, 'down')}
                              className="w-8 h-8 rounded-xl bg-white border border-gray-100 hover:border-gray-200 flex items-center justify-center text-gray-400 disabled:opacity-35 shadow-sm"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveClause(clause.id, idx)}
                              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <textarea 
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs text-gray-650 leading-relaxed font-serif focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all"
                          rows={4}
                          value={clause.texto}
                          onChange={(e) => handleClauseTextChange(idx, e.target.value)}
                          placeholder="Teor descritivo e legal da cláusula..."
                        />
                      </div>
                    ))
                  )}

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={handleAddCustomClause}
                      className="flex items-center gap-2 px-5 py-2.5 border border-dashed border-gold/30 text-gold hover:border-gold hover:bg-gold/5 rounded-2xl text-xs font-bold transition-all bg-white"
                    >
                      <Plus size={14} />
                      <span>Adicionar Cláusula Personalizada</span>
                    </button>

                    <div className="text-[10px] font-bold text-gray-400 select-none">
                      {(contract.dados?.clausulasSelecionadas || []).length} Cláusula(s) Aplicada(s)
                    </div>
                  </div>

                  {/* Additional General Clause box */}
                  <div className="w-full pt-6 border-t border-gray-100 space-y-2 text-left">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Anotações e Observações Gerais Extras</label>
                     <textarea 
                       className="input-field min-h-[100px] py-4 text-xs font-serif" 
                       placeholder="Adicionalmente, você pode escrever observações gerais extras aqui..."
                       value={contract.dados.clausulas || ''}
                       onChange={e => setContract(prev => ({ ...prev, dados: { ...prev.dados, clausulas: e.target.value } }))}
                     />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-10">
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

import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  CheckSquare, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  Save,
  Copy,
  Eye,
  Sparkles,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { staggerContainer, slideUp, fadeIn, scaleIn } from '../../constants/animations';

export interface ContractClause {
  id: string;
  titulo: string;
  texto: string;
  tipo: 'todos' | 'proposta' | 'contraproposta' | 'aceite' | 'locacao_temporaria' | 'administracao_temporaria' | 'compra_venda' | 'locacao' | 'arras_confirmatorios';
  ordem: number;
  ativo: boolean;
  obrigatorio: boolean;
  campoVinculado?: string;
  variaveis?: string[];
  criadoEm?: any;
  atualizadoEm?: any;
  atualizadoPor?: string;
}

export const TEXTO_OFICIAL_SINAL_PADRAO = `O(A) COMPRADOR(A) pagará à imobiliária intermediadora **{{valor_sinal}}** ({{valor_sinal_extenso}}), a título de adiantamento, sem natureza de arras confirmatórias ou penitenciais. Concretizado o negócio, esse valor será integralmente abatido do preço total do imóvel.

Caso o negócio não seja concretizado, o valor será devolvido ao(à) COMPRADOR(A), descontadas exclusivamente as despesas efetivamente realizadas e previamente autorizadas pelo(a) COMPRADOR(A) com elaboração do contrato, emissão de certidões negativas e demais documentos necessários à negociação, mediante apresentação de notas fiscais ou recibos e prestação de contas discriminada. O desconto ficará limitado ao valor adiantado, sendo vedada a retenção de valores a título de multa, arras ou comissão de corretagem com fundamento nesta cláusula.`;

export const CLAUSULAS_PADRAO_OFICIAIS = [
  // As 6 Cláusulas Oficiais da Menta Imóveis para Proposta de Compra e Venda e Contraproposta
  {
    titulo: "CLÁUSULA 1ª — DO VALOR, DA FORMA DE PAGAMENTO E DA POSSE",
    texto: "O valor total da transação é de R$ 840.000,00 (oitocentos e quarenta mil reais), sendo R$ 50.000,00 (cinquenta mil reais) pagos na assinatura do contrato e o saldo remanescente na assinatura da escritura e do contrato de financiamento bancário, ocasião em que ocorrerão a entrega das chaves e a transmissão da posse do imóvel à compradora.",
    ordem: 1,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA 2ª — DO SINAL DO NEGÓCIO",
    texto: "O(A) COMPRADOR(A) pagará à imobiliária intermediadora a quantia de R$ 5.000,00 (cinco mil reais), a título de adiantamento para despesas iniciais e reserva do imóvel, valor este que será integralmente abatido do montante total negociado.",
    ordem: 2,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA 3ª — DO FINANCIAMENTO BANCÁRIO",
    texto: "O saldo remanescente de R$ 790.000,00 (setecentos e noventa mil reais) será quitado por meio de financiamento bancário a ser obtido pelo(a) COMPRADOR(A) junto à instituição financeira de sua preferência, ficando a eficácia plena do presente negócio condicionada à respectiva aprovação e liberação do crédito.",
    ordem: 3,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA 4ª — DA DOCUMENTAÇÃO E DOS DÉBITOS",
    texto: "O(A) VENDEDOR(A) obriga-se a apresentar toda a documentação necessária à concretização do negócio e à aprovação do financiamento imobiliário, garantindo que o bem se encontra livre e desembaraçado de quaisquer ônus, dívidas fiscais, condominiais ou gravames judiciais e extrajudiciais até a presente data.",
    ordem: 4,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA 5ª — DA VALIDADE DA PROPOSTA",
    texto: "A presente proposta tem prazo de validade de 5 (cinco) dias úteis contados de sua assinatura, período durante o qual o(a) VENDEDOR(A) poderá manifestar seu aceite formal, findo o qual, sem manifestação expressa, o negócio será considerado desfeito sem qualquer penalidade para as partes.",
    ordem: 5,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA 6ª — DO OBJETO E DO CARÁTER IRRETRATÁVEL",
    texto: "O presente instrumento tem por objeto a formalização de proposta firme para aquisição do imóvel discriminado, assumindo caráter irrevogável e irretratável após a anuência e assinatura de ambas as partes, obrigando-as por si, seus herdeiros e sucessores a qualquer título.",
    ordem: 6,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const
  },
  {
    titulo: "CLÁUSULA – ADIANTAMENTO REEMBOLSÁVEL E DESPESAS INICIAIS",
    texto: TEXTO_OFICIAL_SINAL_PADRAO,
    ordem: 7,
    obrigatorio: false,
    ativo: true,
    tipo: 'proposta' as const,
    campoVinculado: 'valorSinalNegocio',
    variaveis: ['{{valor_sinal}}', '{{valor_sinal_extenso}}']
  },

  // 2. Compra e Venda
  {
    titulo: "Do Objeto e Caráter Irretratável",
    texto: "O presente compromisso tem por objeto a compra e venda do imóvel descrito neste instrumento, sendo firmado em caráter estritamente irrevogável e irretratável, nos termos dos artigos 417 a 420 do Código Civil Brasileiro, obrigando as partes contratantes, seus herdeiros e sucessores a qualquer título.",
    ordem: 1,
    obrigatorio: true,
    ativo: true,
    tipo: 'compra_venda' as const
  },
  {
    titulo: "Do Preço e Condições de Pagamento",
    texto: "O preço certo e ajustado da transação imobiliária dar-se-á nos estritos termos pactuados, com quitação formal descrita nos métodos de pagamento aprovados neste instrumento.",
    ordem: 2,
    obrigatorio: true,
    ativo: true,
    tipo: 'compra_venda' as const
  },
  {
    titulo: "Da Imissão na Posse",
    texto: "A posse direta e precária do imóvel será transmitida ao promitente comprador na data convencionada ou na quitação integral das obrigações assumidas, livre e desembaraçado de pessoas e coisas.",
    ordem: 3,
    obrigatorio: true,
    ativo: true,
    tipo: 'compra_venda' as const
  },
  {
    titulo: "Da Outorga da Escritura Definitiva",
    texto: "A escritura definitiva de compra e venda será outorgada em favor do comprador após a quitação integral do preço ora estabelecido, correndo por conta exclusiva do comprador as custas de transferência, ITBI e registro cartorário.",
    ordem: 4,
    obrigatorio: true,
    ativo: true,
    tipo: 'compra_venda' as const
  },
  {
    titulo: "Da Evicção e Desembaraço Jurídico",
    texto: "O(s) promitente(s) vendedor(es) responde(m) pela evicção de direito e declaram sob as penas da lei que o imóvel encontra-se livre e desembaraçado de quaisquer ônus reais, judiciais ou extrajudiciais, dívidas condominiais ou tributárias.",
    ordem: 5,
    obrigatorio: true,
    ativo: true,
    tipo: 'compra_venda' as const
  },
  {
    titulo: "CLÁUSULA – ADIANTAMENTO REEMBOLSÁVEL E DESPESAS INICIAIS",
    texto: TEXTO_OFICIAL_SINAL_PADRAO,
    ordem: 6,
    obrigatorio: false,
    ativo: true,
    tipo: 'compra_venda' as const,
    campoVinculado: 'valorSinalNegocio',
    variaveis: ['{{valor_sinal}}', '{{valor_sinal_extenso}}']
  },

  // 3. Locação por Temporada
  {
    titulo: "Da Destinação Exclusiva Residencial por Temporada",
    texto: "O imóvel locado destina-se exclusivamente para estadias temporárias e lazer residencial do locatário e seus acompanhantes autorizados, sendo expressamente vedada a sublocação, cessão ou uso comercial.",
    ordem: 1,
    obrigatorio: true,
    ativo: true,
    tipo: 'locacao_temporaria' as const
  },
  {
    titulo: "Do Limite de Ocupantes e Convivência Condominial",
    texto: "O locatário compromete-se a respeitar o limite máximo de hóspedes acordado e cumprir integralmente o regulamento interno e convenção do condomínio, observando rigorosamente as normas de silêncio e boa convivência.",
    ordem: 2,
    obrigatorio: true,
    ativo: true,
    tipo: 'locacao_temporaria' as const
  },
  {
    titulo: "Da Vistoria de Entrada e Devolução",
    texto: "O imóvel é entregue higienizado, com todos os seus móveis, utensílios e equipamentos em perfeito funcionamento, obrigando-se o locatário a restituí-lo no mesmo estado de conservação no término do período.",
    ordem: 3,
    obrigatorio: true,
    ativo: true,
    tipo: 'locacao_temporaria' as const
  },

  // 4. Administração Temporária
  {
    titulo: "Da Identificação das Partes e Qualificação",
    texto: "O presente contrato é celebrado entre o(a) PROPRIETÁRIO(A) CONTRATANTE e a IMOBILIÁRIA ADMINISTRADORA, sociedade empresária especializada em gestão e intermediação imobiliária.",
    ordem: 1,
    obrigatorio: true,
    ativo: true,
    tipo: 'administracao_temporaria' as const
  },
  {
    titulo: "Do Objeto e Poderes de Administração",
    texto: "O(A) PROPRIETÁRIO(A) confere à ADMINISTRADORA a gestão, representação e administração exclusiva para fins de locação por temporada do imóvel, outorgando-lhe poderes para promover a publicidade, intermediar estadias e formalizar locações temporárias.",
    ordem: 2,
    obrigatorio: true,
    ativo: true,
    tipo: 'administracao_temporaria' as const
  },
  {
    titulo: "Da Remuneração e Prestação de Contas",
    texto: "Pelos serviços prestados, a ADMINISTRADORA perceberá a remuneração estipulada, prestando contas de todas as receitas e repassando os valores líquidos pertencentes ao proprietário nos prazos convencionados.",
    ordem: 3,
    obrigatorio: true,
    ativo: true,
    tipo: 'administracao_temporaria' as const
  },

  // 5. Arras Confirmatórias
  {
    titulo: "Do Objeto das Arras",
    texto: "O presente instrumento tem por objeto a formalização do pagamento de arras confirmatórias referente à intenção irrevogável de compra e venda do imóvel descrito neste contrato.",
    ordem: 1,
    obrigatorio: true,
    ativo: true,
    tipo: 'arras_confirmatorios' as const
  },
  {
    titulo: "Das Consequências em Caso de Desistência",
    texto: "Em caso de desistência imotivada do comprador, este perderá o valor dado em arras em favor do vendedor. Caso a desistência imotivada parta do vendedor, este restituirá ao comprador o valor recebido em arras acrescido do seu equivalente (em dobro), nos termos do art. 418 do Código Civil.",
    ordem: 2,
    obrigatorio: true,
    ativo: true,
    tipo: 'arras_confirmatorios' as const
  },

  // 6. Aceite de Proposta
  {
    titulo: "Da Manifestação Expressa de Aceite",
    texto: "A parte manifesta o seu inequívoco e pleno aceite aos exatos termos e condições comerciais propostas para a transação imobiliária do bem especificado neste instrumento.",
    ordem: 1,
    obrigatorio: true,
    ativo: true,
    tipo: 'aceite' as const
  }
];

export const CLAUSULAS_PADRAO_ADMINISTRACAO_TEMPORARIA = CLAUSULAS_PADRAO_OFICIAIS.filter(c => c.tipo === 'administracao_temporaria');

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  todos: 'Todos os Contratos',
  proposta: 'Proposta / Contraproposta',
  contraproposta: 'Contraproposta',
  aceite: 'Aceite de Termos',
  compra_venda: 'Compra e Venda',
  locacao_temporaria: 'Locação Temporária',
  administracao_temporaria: 'Administração Temporária',
  arras_confirmatorios: 'Arras Confirmatórios',
  locacao: 'Locatício Anual'
};

export const CONTRACT_TYPE_APPLIES_TO: Record<string, string> = {
  todos: 'Propostas, Contrapropostas, Compra e Venda e demais modelos',
  proposta: 'Proposta de Compra e Venda, Contraproposta e Compra e Venda',
  contraproposta: 'Contraproposta e Proposta de Compra e Venda',
  aceite: 'Termo de Aceite de Proposta',
  compra_venda: 'Contrato de Compra e Venda de Imóvel',
  locacao_temporaria: 'Contrato de Locação por Temporada',
  administracao_temporaria: 'Contrato de Gestão e Administração',
  arras_confirmatorios: 'Contrato de Sinal e Arras Confirmatórias',
  locacao: 'Contrato de Locação Residencial Anual'
};

// Available dynamic placeholders that administrators can insert into clauses
export const VARIAVEIS_DINAMICAS = [
  { key: '{nome_cliente}', label: 'Nome do Cliente / Comprador' },
  { key: '{cpf_cliente}', label: 'CPF do Cliente' },
  { key: '{rg_cliente}', label: 'RG do Cliente' },
  { key: '{telefone_cliente}', label: 'Telefone do Cliente' },
  { key: '{email_cliente}', label: 'E-mail do Cliente' },
  { key: '{nome_vendedor}', label: 'Nome do Vendedor / Proprietário' },
  { key: '{cpf_vendedor}', label: 'CPF do Vendedor' },
  { key: '{imovel_titulo}', label: 'Título / Edifício do Imóvel' },
  { key: '{imovel_codigo}', label: 'Código do Imóvel' },
  { key: '{imovel_endereco}', label: 'Endereço Completo do Imóvel' },
  { key: '{imovel_matricula}', label: 'Matrícula do Imóvel' },
  { key: '{imovel_cri}', label: 'CRI do Imóvel' },
  { key: '{valor_total}', label: 'Valor Total Negociado' },
  { key: '{valor_extenso}', label: 'Valor por Extenso' },
  { key: '{{valor_sinal}}', label: 'Valor do Sinal Numérico (ex: R$ 10.000,00)' },
  { key: '{{valor_sinal_extenso}}', label: 'Valor do Sinal por Extenso (ex: dez mil reais)' },
  { key: '{data_atual}', label: 'Data Atual Formatada' },
  { key: '{cidade}', label: 'Cidade do Contrato' }
];

export default function ContractClauses() {
  const { user } = useAuth();
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos_filtros');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'ativas' | 'inativas'>('todas');
  
  // Form State for Adding / Editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<ContractClause['tipo']>('todos');
  const [ordem, setOrdem] = useState(1);
  const [ativo, setAtivo] = useState(true);
  const [obrigatorio, setObrigatorio] = useState(false);
  const [campoVinculado, setCampoVinculado] = useState<string>('');

  // Preview Modal State
  const [previewClause, setPreviewClause] = useState<ContractClause | null>(null);

  // Delete Confirmation Modal State
  const [deletingClause, setDeletingClause] = useState<ContractClause | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchClauses();
  }, []);

  const fetchClauses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'clausulasContratos'), orderBy('ordem', 'asc'));
      const querySnapshot = await getDocs(q);
      const data: ContractClause[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as ContractClause);
      });

      // Auto-seed official default clauses if Firestore collection is completely empty
      if (data.length === 0) {
        console.log("Inicializando cláusulas oficiais no Firestore...");
        const adminEmail = user?.email || user?.displayName || 'Sistema';
        const created: ContractClause[] = [];
        
        for (const padrao of CLAUSULAS_PADRAO_OFICIAIS) {
          const payload = {
            ...padrao,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
            atualizadoPor: adminEmail
          };
          const docRef = await addDoc(collection(db, 'clausulasContratos'), payload);
          created.push({ id: docRef.id, ...payload });
        }
        setClauses(created);
        showToast("Cláusulas oficiais inicializadas com sucesso no banco de dados!");
      } else {
        // Ensure the official Sinal clause is registered in Firestore without duplicate
        const hasSinalClause = data.some(c => 
          (c.titulo && (c.titulo.toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL') || c.titulo === 'CLÁUSULA – ADIANTAMENTO REEMBOLSÁVEL E DESPESAS INICIAIS')) ||
          c.campoVinculado === 'valorSinalNegocio'
        );

        if (!hasSinalClause) {
          const adminEmail = user?.email || user?.displayName || 'Sistema';
          const maxOrder = data.length > 0 ? Math.max(...data.map(c => Number(c.ordem) || 0)) : 0;
          const sinalPayload = {
            titulo: "CLÁUSULA – ADIANTAMENTO REEMBOLSÁVEL E DESPESAS INICIAIS",
            texto: TEXTO_OFICIAL_SINAL_PADRAO,
            ordem: maxOrder + 1,
            obrigatorio: false,
            ativo: true,
            tipo: 'proposta' as const,
            campoVinculado: 'valorSinalNegocio',
            variaveis: ['{{valor_sinal}}', '{{valor_sinal_extenso}}'],
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
            atualizadoPor: adminEmail
          };
          try {
            const docRef = await addDoc(collection(db, 'clausulasContratos'), sinalPayload);
            data.push({ id: docRef.id, ...sinalPayload } as ContractClause);
            console.log("Cláusula oficial de sinal persistida no Firestore:", docRef.id);
          } catch (err) {
            console.error("Erro ao registrar cláusula oficial de sinal:", err);
          }
        }

        setClauses(data);
      }
    } catch (e: any) {
      console.error("Erro ao carregar cláusulas do Firestore:", e);
      showToast("Erro ao carregar cláusulas do banco de dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setTitulo('');
    setTexto('');
    setTipo('todos');
    const maxOrder = clauses.length > 0 ? Math.max(...clauses.map(c => Number(c.ordem) || 0)) : 0;
    setOrdem(maxOrder + 1);
    setAtivo(true);
    setObrigatorio(false);
    setCampoVinculado('');
    setIsFormOpen(true);
  };

  const handleEdit = (clause: ContractClause) => {
    setEditingId(clause.id);
    setTitulo(clause.titulo);
    setTexto(clause.texto);
    setTipo(clause.tipo);
    setOrdem(clause.ordem);
    setAtivo(clause.ativo);
    setObrigatorio(clause.obrigatorio || false);
    setCampoVinculado(clause.campoVinculado || (clause.titulo?.toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL') ? 'valorSinalNegocio' : ''));
    setIsFormOpen(true);
  };

  // Duplicate Clause feature
  const handleDuplicate = async (clause: ContractClause) => {
    setLoading(true);
    try {
      const adminEmail = user?.email || user?.displayName || 'Administrador';
      const maxOrder = clauses.length > 0 ? Math.max(...clauses.map(c => Number(c.ordem) || 0)) : 0;
      
      const payload = {
        titulo: `${clause.titulo} (Cópia)`,
        texto: clause.texto,
        tipo: clause.tipo,
        ordem: maxOrder + 1,
        ativo: true,
        obrigatorio: false,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        atualizadoPor: adminEmail
      };

      const docRef = await addDoc(collection(db, 'clausulasContratos'), payload);
      showToast(`Cláusula duplicada com sucesso! (ID: ${docRef.id})`);
      fetchClauses();
    } catch (err: any) {
      console.error("Erro ao duplicar cláusula:", err);
      showToast("Erro ao duplicar cláusula.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Insert dynamic variable at cursor position
  const handleInsertVariable = (varKey: string) => {
    if (!textareaRef.current) {
      setTexto(prev => prev + ' ' + varKey);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = texto;
    const updated = current.substring(0, start) + varKey + current.substring(end);
    setTexto(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + varKey.length, start + varKey.length);
      }
    }, 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !texto.trim()) {
      showToast("Preencha o título e o texto completo da cláusula.", "error");
      return;
    }

    setLoading(true);
    try {
      const adminEmail = user?.email || user?.displayName || 'Administrador';
      
      // Extract any dynamic placeholders used
      const matchedVars = VARIAVEIS_DINAMICAS
        .map(v => v.key)
        .filter(key => texto.includes(key));
      
      if (campoVinculado === 'valorSinalNegocio') {
        if (!matchedVars.includes('{{valor_sinal}}')) matchedVars.push('{{valor_sinal}}');
        if (!matchedVars.includes('{{valor_sinal_extenso}}')) matchedVars.push('{{valor_sinal_extenso}}');
      }

      const payload: any = {
        titulo: titulo.trim(),
        texto: texto.trim(),
        tipo,
        ordem: Number(ordem) || 1,
        ativo,
        obrigatorio,
        campoVinculado: campoVinculado || '',
        variaveis: matchedVars,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: adminEmail
      };

      if (editingId) {
        await setDoc(doc(db, 'clausulasContratos', editingId), payload, { merge: true });
        showToast("Cláusula atualizada no banco de dados!");
      } else {
        payload.criadoEm = serverTimestamp();
        await addDoc(collection(db, 'clausulasContratos'), payload);
        showToast("Cláusula cadastrada com sucesso!");
      }
      
      setIsFormOpen(false);
      fetchClauses();
    } catch (err) {
      console.error("Error saving clause:", err);
      showToast("Erro ao salvar cláusula no Firestore.", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteClause = async () => {
    if (!deletingClause?.id) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'clausulasContratos', deletingClause.id));
      showToast("Cláusula excluída com sucesso!");
      setDeletingClause(null);
      fetchClauses();
    } catch (e) {
      console.error("Erro ao excluir cláusula:", e);
      showToast("Erro ao excluir cláusula do banco de dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (clause: ContractClause) => {
    try {
      const adminEmail = user?.email || user?.displayName || 'Administrador';
      await setDoc(doc(db, 'clausulasContratos', clause.id), { 
        ativo: !clause.ativo,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: adminEmail
      }, { merge: true });

      showToast(`Cláusula ${!clause.ativo ? 'ativada' : 'desativada'} com sucesso.`);
      setClauses(prev => prev.map(c => c.id === clause.id ? { ...c, ativo: !c.ativo } : c));
    } catch (e) {
      console.error("Erro ao alterar status da cláusula:", e);
      showToast("Erro ao alterar status da cláusula.", "error");
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clauses.length) return;

    const clauseA = clauses[index];
    const clauseB = clauses[targetIndex];

    try {
      const orderA = clauseA.ordem;
      const orderB = clauseB.ordem;

      // Update in memory first
      setClauses(prev => {
        const copy = [...prev];
        copy[index] = { ...clauseA, ordem: orderB };
        copy[targetIndex] = { ...clauseB, ordem: orderA };
        return copy.sort((a, b) => a.ordem - b.ordem);
      });

      // Update in Firestore
      await setDoc(doc(db, 'clausulasContratos', clauseA.id), { ordem: orderB, atualizadoEm: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'clausulasContratos', clauseB.id), { ordem: orderA, atualizadoEm: serverTimestamp() }, { merge: true });
      showToast("Ordem das cláusulas atualizada!");
    } catch (e) {
      console.error("Erro ao reordenar cláusula:", e);
      showToast("Erro ao reordenar cláusula.", "error");
    }
  };

  // Filter & Search Logic
  const filteredClauses = clauses.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          c.texto.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'todos_filtros' || c.tipo === filterType;
    const isAtivo = c.ativo !== false && (c.ativo as any) !== 'false';
    const matchesStatus = filterStatus === 'todas' 
      ? true 
      : filterStatus === 'ativas' 
        ? isAtivo 
        : !isAtivo;
    return matchesSearch && matchesFilter && matchesStatus;
  });

  const totalAtivas = clauses.filter(c => c.ativo !== false && (c.ativo as any) !== 'false').length;
  const totalInativas = clauses.filter(c => c.ativo === false || (c.ativo as any) === 'false').length;

  return (
    <motion.div 
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border ${
              notification.type === 'success' 
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800' 
                : 'bg-red-950 text-red-100 border-red-800'
            }`}
          >
            {notification.type === 'success' ? <Check className="text-emerald-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
            <span className="text-sm font-bold tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <motion.div 
        variants={slideUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
             <div className="w-10 h-[1px] bg-gold/30" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Corporate Governance</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight select-none">
            Cláusulas dos Contratos
          </h1>
          <p className="text-gray-400 mt-2 text-base font-medium leading-relaxed max-w-3xl">
            Gerenciamento oficial de cláusulas contratuais da Menta Imóveis. Cadastre, edite, ative ou desative cláusulas para Propostas, Compra e Venda, Locações e Arras.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenNew}
          className="btn-gold shadow-2xl shadow-gold/20 flex items-center gap-2 self-start md:self-auto !rounded-2xl px-7 py-4 cursor-pointer"
        >
          <Plus size={20} />
          <span className="text-xs uppercase font-extrabold tracking-widest leading-none">Nova Cláusula</span>
        </motion.button>
      </motion.div>

      {/* Search and filter toolbar */}
      <motion.div 
        variants={slideUp} 
        className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col lg:flex-row gap-5 items-stretch lg:items-center justify-between"
      >
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar cláusulas por título ou termo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white transition-all text-primary-black"
          />
        </div>

        {/* Status Filter Tabs (Todas, Ativas, Inativas) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-gray-100/80 rounded-2xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setFilterStatus('todas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filterStatus === 'todas'
                  ? 'bg-white text-primary-black shadow-sm'
                  : 'text-gray-500 hover:text-primary-black'
              }`}
            >
              Todas ({clauses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ativas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'ativas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-emerald-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterStatus === 'ativas' ? 'bg-white' : 'bg-emerald-500'}`} />
              Ativas ({totalAtivas})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('inativas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'inativas'
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterStatus === 'inativas' ? 'bg-white' : 'bg-gray-400'}`} />
              Inativas ({totalInativas})
            </button>
          </div>

          {/* Model filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white cursor-pointer"
            >
              <option value="todos_filtros">Exibir Todos os Modelos</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([k, label]) => {
                const count = clauses.filter(c => c.tipo === k).length;
                return (
                  <option key={k} value={k}>{label} ({count})</option>
                );
              })}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Main clauses listing view */}
      {loading && clauses.length === 0 ? (
        <div className="flex items-center justify-center p-20">
          <div className="relative flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Sincronizando com o Firestore...</p>
          </div>
        </div>
      ) : filteredClauses.length === 0 ? (
        <motion.div 
          variants={fadeIn}
          className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[2.5rem] p-16 text-center"
        >
          <div className="w-20 h-20 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-display font-bold text-primary-black mb-1">Nenhuma cláusula encontrada</h3>
          <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
            {search || filterType !== 'todos_filtros' 
              ? "Experimente mudar os parâmetros do filtro ou buscar por outro termo." 
              : "Clique em 'Nova Cláusula' para cadastrar regras contratuais, juros, garantias e termos personalizados."}
          </p>
          {search || filterType !== 'todos_filtros' ? (
            <button 
              onClick={() => { setSearch(''); setFilterType('todos_filtros'); }}
              className="mt-6 text-xs uppercase font-extrabold tracking-wider text-gold hover:text-primary-black transition-colors cursor-pointer"
            >
              Limpar Filtros
            </button>
          ) : (
            <button 
              onClick={handleOpenNew}
              className="mt-6 px-6 py-3 bg-primary-black text-white hover:bg-gold hover:text-primary-black rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-500 cursor-pointer"
            >
              Adicionar primeira cláusula
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          variants={fadeIn}
          className="grid grid-cols-1 gap-6"
        >
          {filteredClauses.map((clause, index) => (
            <motion.div
              layoutId={`clause-card-${clause.id}`}
              key={clause.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/30 flex flex-col md:flex-row md:items-start justify-between gap-6 ${
                clause.ativo ? 'border-gray-100 shadow-md' : 'border-gray-200 opacity-60 bg-gray-50/30'
              }`}
            >
              <div className="space-y-4 flex-grow max-w-4xl text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gold bg-gold/10 px-3 py-1 border border-gold/20 rounded-full select-none">
                    Ordem {clause.ordem}
                  </span>
                  <span className="text-[10px] font-black uppercase text-gray-700 bg-gray-100 px-3 py-1 rounded-full select-none">
                    {CONTRACT_TYPE_LABELS[clause.tipo] || clause.tipo}
                  </span>
                  {clause.ativo ? (
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full select-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Ativa
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-gray-600 bg-gray-200 border border-gray-300 px-3 py-1 rounded-full select-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Desativada (Oculta na criação)
                    </span>
                  )}
                  {clause.obrigatorio && (
                    <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-3 py-1 border border-rose-200 rounded-full select-none flex items-center gap-1">
                      <CheckSquare size={11} />
                      Obrigatória no Modelo
                    </span>
                  )}
                  {clause.variaveis && clause.variaveis.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full select-none border border-blue-100">
                      {clause.variaveis.length} variável(is) dinâmica(s)
                    </span>
                  )}
                  {(clause.campoVinculado === 'valorSinalNegocio' || clause.titulo?.toUpperCase().includes('ADIANTAMENTO REEMBOLSÁVEL')) && (
                    <span className="text-[10px] font-black uppercase text-gold bg-gold/15 px-3 py-1 border border-gold/30 rounded-full select-none flex items-center gap-1 shadow-2xs">
                      <Sparkles size={11} className="text-gold" />
                      Vínculo: Sinal do Negócio (Automático)
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-display font-bold text-primary-black">
                    {clause.titulo}
                  </h3>
                  <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                    <FileText size={12} className="text-gold shrink-0" />
                    <span className="font-semibold text-gray-700">Modelos compatíveis:</span> {CONTRACT_TYPE_APPLIES_TO[clause.tipo] || CONTRACT_TYPE_LABELS[clause.tipo]}
                  </div>
                  <p className="text-gray-700 font-normal leading-relaxed whitespace-pre-wrap text-xs sm:text-sm mt-3 font-serif bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                    {clause.texto}
                  </p>
                </div>
              </div>

              {/* Controls and order adjusters */}
              <div className="flex sm:flex-row md:flex-col items-center justify-end gap-3 shrink-0 self-start md:self-auto w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-50 md:border-none">
                {/* Positional controls */}
                <div className="flex items-center gap-1 sm:mr-auto md:mr-0">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveOrder(index, 'up')}
                    className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors disabled:opacity-30 disabled:hover:bg-gray-50 cursor-pointer"
                    title="Mover para cima"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    disabled={index === filteredClauses.length - 1}
                    onClick={() => handleMoveOrder(index, 'down')}
                    className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors disabled:opacity-30 disabled:hover:bg-gray-50 cursor-pointer"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Edit, Duplicate, Preview, Status and Delete actions */}
                <div className="flex items-center gap-2">
                  {/* Preview full text */}
                  <button
                    onClick={() => setPreviewClause(clause)}
                    title="Visualizar texto completo antes de utilizar"
                    className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 transition-all cursor-pointer"
                  >
                    <Eye size={16} />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(clause)}
                    title="Duplicar cláusula para criar nova versão"
                    className="w-10 h-10 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-all cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleAtivo(clause)}
                    title={clause.ativo ? "Desativar Cláusula" : "Ativar Cláusula"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                      clause.ativo 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-150'
                    }`}
                  >
                    {clause.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(clause)}
                    title="Editar cláusula oficial"
                    className="w-10 h-10 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-xl flex items-center justify-center text-gold transition-colors cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeletingClause(clause)}
                    title="Excluir cláusula oficial"
                    className="w-10 h-10 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClause && (
        <div className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 space-y-5 text-left"
          >
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-gray-900">Excluir Cláusula Oficial?</h3>
                <p className="text-xs text-gray-400">Esta ação remove a cláusula do repositório oficial do Firestore.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 space-y-1.5 text-xs text-gray-700">
              <p><strong>Título:</strong> {deletingClause.titulo}</p>
              <p><strong>Modelo:</strong> {CONTRACT_TYPE_LABELS[deletingClause.tipo] || deletingClause.tipo}</p>
              <p><strong>Ordem:</strong> {deletingClause.ordem}</p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Contratos existentes que já utilizaram esta cláusula anteriormente permanecerão intactos, pois possuem cópia própria salva no documento contratual.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingClause(null)}
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClause}
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal: Visualizar texto completo antes de utilizar */}
      {previewClause && (
        <div className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-gray-100 space-y-5 text-left"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Pré-Visualização Oficial</span>
                  <h3 className="text-lg font-display font-bold text-gray-900">{previewClause.titulo}</h3>
                </div>
              </div>
              <button 
                onClick={() => setPreviewClause(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 font-bold text-gray-700">
                Modelo: {CONTRACT_TYPE_LABELS[previewClause.tipo] || previewClause.tipo}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold/15 font-bold text-primary-black">
                Ordem sugerida: {previewClause.ordem}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                previewClause.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {previewClause.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>

            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl max-h-[50vh] overflow-y-auto">
              <p className="text-sm font-serif leading-relaxed text-gray-800 whitespace-pre-wrap">
                {previewClause.texto}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewClause(null)}
                className="py-2.5 px-6 bg-primary-black hover:bg-gray-800 text-gold font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Slide-over or Popup Form Panel for Adding / Editing */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-primary-black backdrop-blur-sm cursor-pointer"
            />

            {/* Form body */}
            <motion.div
              initial={{ scale: 0.95, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden relative border border-gray-100 z-10"
            >
              <div className="bg-primary-black p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -mr-16 -mt-16 blur-xl" />
                <h3 className="text-2xl font-display font-bold text-white relative z-10">
                  {editingId ? "Editar Cláusula Oficial" : "Nova Cláusula Contratual"}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 relative z-10 leading-relaxed">
                  Cadastre ou edite regras normativas salvas diretamente no Firestore para novos contratos.
                </p>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 text-left max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">
                      Título da Cláusula <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Da Responsabilidade por Avarias e Vistoria"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white text-sm text-primary-black font-semibold"
                    />
                  </div>

                  {/* Contract Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">
                      Categoria / Tipo de Contrato <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white text-sm text-primary-black font-semibold cursor-pointer"
                    >
                      {Object.entries(CONTRACT_TYPE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Order Selector */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">
                      Ordem de Exibição <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={ordem}
                      onChange={(e) => setOrdem(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white text-sm text-primary-black font-semibold"
                    />
                  </div>

                  {/* Campo Vinculado (Opcional - ex: Sinal de Negócio) */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500 flex items-center justify-between">
                      <span>Vínculo a Campo do Formulário</span>
                      <span className="text-[10px] text-gold font-bold">Opcional</span>
                    </label>
                    <select
                      value={campoVinculado}
                      onChange={(e) => setCampoVinculado(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white text-sm text-primary-black font-semibold cursor-pointer"
                    >
                      <option value="">Nenhum vínculo automático (Cláusula Padrão/Geral)</option>
                      <option value="valorSinalNegocio">Sinal do Negócio (valorSinalNegocio - ativa dinamicamente)</option>
                    </select>
                    {campoVinculado === 'valorSinalNegocio' && (
                      <p className="text-[11px] text-gold font-medium">
                        Esta cláusula será acionada automaticamente nos contratos de compra e venda e propostas sempre que o campo de sinal for preenchido com valor &gt; 0. As variáveis &#123;&#123;valor_sinal&#125;&#125; e &#123;&#123;valor_sinal_extenso&#125;&#125; serão preenchidas em tempo real.
                      </p>
                    )}
                  </div>

                  {/* Dynamic Variables Selector Helper */}
                  <div className="md:col-span-2 p-4 bg-gold/5 border border-gold/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-primary-black text-xs font-bold uppercase tracking-wider">
                      <Sparkles size={15} className="text-gold" />
                      <span>Variáveis Dinâmicas Disponíveis (clique para inserir no texto)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {VARIAVEIS_DINAMICAS.map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertVariable(v.key)}
                          className="px-2.5 py-1 bg-white hover:bg-gold hover:text-primary-black border border-gold/30 rounded-lg text-[11px] font-mono font-bold text-gray-800 transition-colors shadow-2xs cursor-pointer"
                          title={`Inserir ${v.label}`}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text normativo */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase font-extrabold tracking-wider text-gray-500">
                      Texto Completo da Cláusula <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      ref={textareaRef}
                      required
                      rows={6}
                      placeholder="Insira as regras, termos e condições completas da cláusula. Você pode utilizar quebras de linha e as variáveis dinâmicas acima..."
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-gold/10 focus:bg-white text-xs sm:text-sm font-serif leading-relaxed text-gray-800"
                    />
                  </div>

                  {/* Switches */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 md:col-span-2 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="form-ativo"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        className="w-4 h-4 rounded text-gold focus:ring-gold cursor-pointer"
                      />
                      <label htmlFor="form-ativo" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                        Cláusula Ativa no Sistema
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="form-obrigatorio"
                        checked={obrigatorio}
                        onChange={(e) => setObrigatorio(e.target.checked)}
                        className="w-4 h-4 rounded text-gold focus:ring-gold cursor-pointer"
                      />
                      <label htmlFor="form-obrigatorio" className="text-xs font-bold text-gray-700 cursor-pointer select-none flex items-center gap-1">
                        Inserir Automaticamente por Padrão
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="btn-gold !px-8 !py-3.5 flex items-center gap-2 cursor-pointer shadow-lg shadow-gold/20"
                  >
                    <Save size={16} />
                    <span className="text-xs font-black uppercase tracking-widest leading-none">Salvar no Banco</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

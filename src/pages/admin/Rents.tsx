import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Lease, Property } from "../../types";
import {
  Home,
  User as UserIcon,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Search,
  Filter,
  X,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Calculator,
  Printer,
  FileText,
  CreditCard,
  Building,
  MapPin,
  Eye,
  Edit,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  maskCurrency,
  parseCurrencyToNumber,
  formatCurrency,
  safeText,
  safeMoney,
  safeDate,
} from "../../lib/utils";
import { useSettings } from "../../hooks/useSettings";
import {
  staggerContainer,
  slideUp,
  fadeIn,
  scaleIn,
} from "../../constants/animations";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getWatermarkData = (
  url: string,
  opacity: number = 0.07,
): Promise<{ base64: string; aspectRatio: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0);
          resolve({
            base64: canvas.toDataURL("image/png"),
            aspectRatio: img.height / img.width,
          });
          return;
        }
      } catch (e) {
        console.error("Error creating watermark canvas:", e);
      }
      resolve({ base64: url, aspectRatio: 1 });
    };
    img.onerror = () => {
      if (url !== "/watermark.png") {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = fallbackImg.width;
            canvas.height = fallbackImg.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.globalAlpha = opacity;
              ctx.drawImage(fallbackImg, 0, 0);
              resolve({
                base64: canvas.toDataURL("image/png"),
                aspectRatio: fallbackImg.height / fallbackImg.width,
              });
              return;
            }
          } catch (e) {}
          resolve({ base64: "/watermark.png", aspectRatio: 1 });
        };
        fallbackImg.onerror = () => {
          resolve({ base64: "/watermark.png", aspectRatio: 1 });
        };
        fallbackImg.src = "/watermark.png";
      } else {
        resolve({ base64: "/watermark.png", aspectRatio: 1 });
      }
    };
    img.src = url;
  });
};

export default function AdminRents() {
  const { settings } = useSettings();
  const empresa = (settings?.empresa || {}) as any;
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  // Form states
  const [leaseForm, setLeaseForm] = useState<Partial<Lease>>({
    propertyId: "",
    propertyCode: "",
    propertyTitle: "",
    propertyAddress: "",
    propertyNeighborhood: "",
    propertyCity: "",
    tenantName: "",
    tenantPhone: "",
    tenantCpf: "",
    valorAluguel: 0,
    valorIptu: 0,
    valorTaxaLixo: 0,
    valorTaxaGas: 0,
    valorCondominio: 0,
    valorOutros: 0,
    valorDesconto: 0,
    valorTotalPagar: 0,
    percentualComissaoImobiliaria: 10,
    valorComissaoImobiliaria: 0,
    valorRepassadoProprietario: 0,
    dueDay: 10,
    startDate: new Date().toISOString().split("T")[0],
    statusPagamento: "Pendente",
    statusLocacao: "Ativa",
    observacoes: "",
    active: true,
  });

  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    value: 0,
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const leaseSnap = await getDocs(
        query(collection(db, "locacoes"), orderBy("createdAt", "desc")),
      );
      const leaseData = leaseSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Lease,
      );
      setLeases(leaseData);

      const propSnap = await getDocs(
        query(
          collection(db, "imoveis"),
          where("businessType", "==", "Locação"),
        ),
      );
      setProperties(
        propSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Property),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate total
  useEffect(() => {
    const total =
      (leaseForm.valorAluguel || 0) +
      (leaseForm.valorIptu || 0) +
      (leaseForm.valorTaxaLixo || 0) +
      (leaseForm.valorTaxaGas || 0) +
      (leaseForm.valorCondominio || 0) +
      (leaseForm.valorOutros || 0) -
      (leaseForm.valorDesconto || 0);

    const percComissao = leaseForm.percentualComissaoImobiliaria ?? 10;
    const comissao = ((leaseForm.valorAluguel || 0) * percComissao) / 100;
    const repasse = (leaseForm.valorAluguel || 0) - comissao;

    setLeaseForm((prev) => ({
      ...prev,
      valorTotalPagar: total,
      valorComissaoImobiliaria: comissao,
      valorRepassadoProprietario: repasse,
    }));
  }, [
    leaseForm.valorAluguel,
    leaseForm.valorIptu,
    leaseForm.valorTaxaLixo,
    leaseForm.valorTaxaGas,
    leaseForm.valorCondominio,
    leaseForm.valorOutros,
    leaseForm.valorDesconto,
    leaseForm.percentualComissaoImobiliaria,
  ]);

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (property) {
      setLeaseForm((prev) => ({
        ...prev,
        propertyId,
        propertyCode: property.code,
        propertyTitle: property.title,
        propertyAddress: `${property.address || ""}, ${property.number || ""} ${property.complement ? `- ${property.complement}` : ""}`,
        propertyNeighborhood: property.neighborhood,
        propertyCity: property.city,
        valorAluguel: property.priceLocacao || 0,
        valorIptu: property.iptu || 0,
        valorCondominio: property.condoFee || 0,
        valorTaxaLixo: Number(property.valorTaxaLixo ?? property.taxaLixo ?? 0),
        valorTaxaGas: Number(property.valorTaxaGas ?? property.taxaGas ?? 0),
      }));
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...leaseForm,
        value: leaseForm.valorTotalPagar, // Keep for compatibility
        createdAt: isEditing ? leaseForm.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let leaseId = selectedLease?.id || "";

      if (isEditing && selectedLease?.id) {
        await updateDoc(doc(db, "locacoes", selectedLease.id), payload);
      } else {
        const docRef = await addDoc(collection(db, "locacoes"), payload);
        leaseId = docRef.id;
      }

      if (leaseForm.propertyId) {
        const statusLoc = String(payload.statusLocacao || "").trim();
        if (statusLoc === "Ativa") {
          // Determine if we should maintain it published or not on the public site
          const manterPub = leaseForm.manterPublicado !== false;
          await updateDoc(doc(db, "imoveis", leaseForm.propertyId), {
            status: "Alugado",
            imovelAlugado: true,
            disponivelParaVisita: false,
            availableForVisit: "Não",
            rented: true,
            publicadoNoSite: manterPub,
            publicado: manterPub,
            ativo: manterPub,
            locacaoAtivaId: leaseId,
            dataInicioLocacao: leaseForm.startDate || "",
            dataFimLocacao: "",
            atualizadoEm: serverTimestamp(),
          });
        } else {
          // Encerrada, Cancelada or Finalizada
          const confirmarVal = confirm(
            "Deseja alterar o status do imóvel vinculado para 'Disponível' e torná-lo disponível para visitas?",
          );
          if (confirmarVal) {
            await updateDoc(doc(db, "imoveis", leaseForm.propertyId), {
              status: "Disponível",
              imovelAlugado: false,
              disponivelParaVisita: true,
              availableForVisit: "Sim",
              rented: false,
              locacaoAtivaId: null,
              atualizadoEm: serverTimestamp(),
            });
          } else {
            // just decouple the active lease without changing status
            await updateDoc(doc(db, "imoveis", leaseForm.propertyId), {
              locacaoAtivaId: null,
              atualizadoEm: serverTimestamp(),
            });
          }
        }
      }

      setShowModal(false);
      setIsEditing(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving lease:", error);
    }
  };

  const resetForm = () => {
    setLeaseForm({
      propertyId: "",
      propertyCode: "",
      propertyTitle: "",
      propertyAddress: "",
      propertyNeighborhood: "",
      propertyCity: "",
      tenantName: "",
      tenantPhone: "",
      tenantCpf: "",
      valorAluguel: 0,
      valorIptu: 0,
      valorTaxaLixo: 0,
      valorTaxaGas: 0,
      valorCondominio: 0,
      valorOutros: 0,
      valorDesconto: 0,
      valorTotalPagar: 0,
      percentualComissaoImobiliaria: 10,
      valorComissaoImobiliaria: 0,
      valorRepassadoProprietario: 0,
      dueDay: 10,
      startDate: new Date().toISOString().split("T")[0],
      statusPagamento: "Pendente",
      statusLocacao: "Ativa",
      observacoes: "",
      active: true,
    });
    setSelectedLease(null);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLease) return;

    try {
      // 1. Create finance entry
      await addDoc(collection(db, "financeiro"), {
        tipo: "entrada",
        data: paymentForm.date,
        descricao: `Aluguel - ${selectedLease.propertyCode} - ${selectedLease.tenantName} (${paymentForm.month})`,
        categoria: "Aluguel recebido",
        valor: paymentForm.value,
        imovelId: selectedLease.propertyId,
        codigoImovel: selectedLease.propertyCode,
        locacaoId: selectedLease.id,
        status: "confirmado",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      // 2. Update lease status
      await updateDoc(doc(db, "locacoes", selectedLease.id!), {
        lastPaymentDate: paymentForm.date,
        lastPaymentMonth: paymentForm.month,
        statusPagamento: "Pago",
        updatedAt: serverTimestamp(),
      });

      setShowPaymentModal(false);
      setSelectedLease(null);
      fetchData();
    } catch (error) {
      console.error("Error registering payment:", error);
    }
  };

  const handleMarkStatus = async (
    lease: Lease,
    status: "Pago" | "Atrasado" | "Pendente",
  ) => {
    try {
      await updateDoc(doc(db, "locacoes", lease.id!), {
        statusPagamento: status,
        lastPaymentDate:
          status === "Pago"
            ? new Date().toISOString().split("T")[0]
            : lease.lastPaymentDate,
        lastPaymentMonth:
          status === "Pago"
            ? new Date().toISOString().slice(0, 7)
            : lease.lastPaymentMonth,
        updatedAt: serverTimestamp(),
      });
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteLease = async (lease: Lease) => {
    if (
      confirm(
        "Deseja realmente remover esta locação? Isto não excluirá o histórico de pagamentos.",
      )
    ) {
      try {
        await deleteDoc(doc(db, "locacoes", lease.id!));

        const confirmarVal = confirm(
          "Deseja também alterar o status do imóvel vinculado para 'Disponível' e torná-lo disponível para visitas?",
        );
        const updatePayload: any = {};
        if (confirmarVal) {
          updatePayload.status = "Disponível";
          updatePayload.imovelAlugado = false;
          updatePayload.disponivelParaVisita = true;
          updatePayload.availableForVisit = "Sim";
          updatePayload.rented = false;
          updatePayload.locacaoAtivaId = null;
          updatePayload.atualizadoEm = serverTimestamp();
        } else {
          updatePayload.locacaoAtivaId = null;
          updatePayload.atualizadoEm = serverTimestamp();
        }
        await updateDoc(doc(db, "imoveis", lease.propertyId), updatePayload);

        fetchData();
      } catch (error) {
        console.error("Error deleting lease:", error);
      }
    }
  };

  const generateReceipt = async (
    lease: Lease,
    type: "locatario" | "locador" = "locatario",
  ) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Resolve watermark image
      const watermarkUrl =
        empresa.marcaDaguaUrl || empresa.logoCabecalhoUrl || "/watermark.png";
      try {
        const { base64, aspectRatio } = await getWatermarkData(
          watermarkUrl,
          0.11,
        ); // medium-low opacity watermark (11%)
        const wWidth = 140; // occupies a good portion of the sheet
        const wHeight = wWidth * aspectRatio;
        const wX = (pageWidth - wWidth) / 2;
        const wY = (pageHeight - wHeight) / 2;
        doc.addImage(base64, "PNG", wX, wY, wWidth, wHeight);
      } catch (watermarkError) {
        console.error(
          "Error drawing logo watermark, resolving to simple light watermark text:",
          watermarkError,
        );
        // Fallback to text watermark
        const watermarkText = safeText(empresa.nome || "MENTA IMÓVEIS");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.setTextColor(245, 245, 245);
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.25, {
          align: "center",
          angle: 30,
        });
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.55, {
          align: "center",
          angle: 30,
        });
        doc.text(watermarkText, pageWidth / 2, pageHeight * 0.85, {
          align: "center",
          angle: 30,
        });
      }

      // 2. Headings with brand details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text(safeText(empresa.nome || "MENTA IMÓVEIS"), 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      const headerLine2 = `${safeText(empresa.razaoSocial || "Menta Negócios Imobiliários Ltda")} | CNPJ: ${safeText(empresa.cnpj || "---")}`;
      const headerLine3 = `${safeText(empresa.endereco || "---")} | CRECI PJ: ${safeText(empresa.creciPj || "---")}`;
      doc.text(headerLine2, 20, 25);
      doc.text(headerLine3, 20, 29);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(201, 161, 82); // Gold
      doc.text("RECIBO DE PAGAMENTO", pageWidth - 20, 22, { align: "right" });

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Nº RECIBO: ${safeText(lease.id?.slice(-8).toUpperCase())}`,
        pageWidth - 20,
        29,
        { align: "right" },
      );

      // Solid grey line separating header
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.5);
      doc.line(20, 33, pageWidth - 20, 33);

      // Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      doc.text(`Recebemos de:`, 20, 44);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(
        `${safeText(lease.tenantName)} (CPF: ${safeText(lease.tenantCpf)})`,
        20,
        49,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`A importância líquida de:`, 20, 57);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(30, 80, 50); // Emerald
      doc.text(safeMoney(lease.valorTotalPagar), 20, 64);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Referente à locação do imóvel localizado em:`, 20, 74);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(
        `${safeText(lease.propertyAddress)}, ${safeText(lease.propertyNeighborhood)}, ${safeText(lease.propertyCity)}`,
        20,
        80,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Código do Imóvel: ${safeText(lease.propertyCode)}`, 20, 86);

      // Extract optional cleaning and security deposit values if they exist on the object
      const cleaningVal = Number(
        (lease as any).valorLimpeza ||
          (lease as any).taxaLimpeza ||
          (lease as any).limpeza ||
          0,
      );
      const depositVal = Number(
        (lease as any).valorCaucao || (lease as any).caucao || 0,
      );
      const fireInsuranceVal = Number(
        (lease as any).valorSeguroIncendio ||
          (lease as any).fireInsurance ||
          (lease as any).seguroIncendio ||
          0,
      );

      // Breakdown Table
      const tableHead =
        type === "locatario"
          ? [["Deduções / Encargos do Aluguel", "Valor"]]
          : [["Dedução / Encargo do Aluguel", "Valor"]];

      const tableBody =
        type === "locatario"
          ? [
              ["Aluguel Mensal Base", safeMoney(lease.valorAluguel)],
              ["IPTU", safeMoney(lease.valorIptu)],
              ["Taxa de Lixo", safeMoney(lease.valorTaxaLixo)],
              ["Taxa de Gás", safeMoney((lease as any).valorTaxaGas || 0)],
              ["Condomínio", safeMoney(lease.valorCondominio)],
              ...(fireInsuranceVal > 0
                ? [["Seguro Incêndio", safeMoney(fireInsuranceVal)]]
                : []),
              ["Outras Taxas / Serviços", safeMoney(lease.valorOutros)],
              ...(cleaningVal > 0
                ? [["Taxa de Limpeza", safeMoney(cleaningVal)]]
                : []),
              ...(depositVal > 0 ? [["Caução", safeMoney(depositVal)]] : []),
              ["Desconto Concedido", `- ${safeMoney(lease.valorDesconto)}`],
              ["TOTAL PAGO PELO LOCATÁRIO", safeMoney(lease.valorTotalPagar)],
            ]
          : [
              ["Aluguel Mensal Base", safeMoney(lease.valorAluguel)],
              ["IPTU", safeMoney(lease.valorIptu)],
              ["Taxa de Lixo", safeMoney(lease.valorTaxaLixo)],
              ["Taxa de Gás", safeMoney((lease as any).valorTaxaGas || 0)],
              ["Condomínio", safeMoney(lease.valorCondominio)],
              ...(fireInsuranceVal > 0
                ? [["Seguro Incêndio", safeMoney(fireInsuranceVal)]]
                : []),
              ["Outras Taxas / Serviços", safeMoney(lease.valorOutros)],
              ...(cleaningVal > 0
                ? [["Taxa de Limpeza", safeMoney(cleaningVal)]]
                : []),
              ...(depositVal > 0 ? [["Caução", safeMoney(depositVal)]] : []),
              ["Desconto Concedido", `- ${safeMoney(lease.valorDesconto)}`],
              ["TOTAL PAGO PELO LOCATÁRIO", safeMoney(lease.valorTotalPagar)],
              [
                "Comissão da Imobiliária",
                safeMoney(lease.valorComissaoImobiliaria),
              ],
              [
                "Valor Repassado ao Proprietário",
                safeMoney(lease.valorRepassadoProprietario),
              ],
            ];

      autoTable(doc, {
        startY: 92,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        theme: "grid",
        styles: { fontSize: 8.5 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;

      // Date
      const today = new Date();
      const dateStr = today.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(
        `${safeText(lease.propertyCity || empresa.cidade || "Balneário Camboriú")}, ${dateStr}`,
        pageWidth / 2,
        finalY,
        { align: "center" },
      );

      // Signature lines
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 4, finalY + 25, (pageWidth / 4) * 3, finalY + 25);
      doc.setFont("helvetica", "bold");
      doc.text(
        safeText(empresa.nome || "Menta Negócios Imobiliários"),
        pageWidth / 2,
        finalY + 30,
        { align: "center" },
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "Imobiliária Intermediadora - Recibo Emitido Eletronicamente",
        pageWidth / 2,
        finalY + 34,
        { align: "center" },
      );

      // Save/Print
      const suffix = type === "locatario" ? "Locatario" : "Locador";
      doc.save(
        `Recibo_Aluguel_${suffix}_${safeText(lease.propertyCode)}_${safeText(lease.tenantName).replace(/\s+/g, "_")}.pdf`,
      );
    } catch (e) {
      console.error("Erro ao gerar recibo de pagamento do aluguel:", e);
      alert(
        "Não foi possível gerar o recibo. Verifique os dados e tente novamente.",
      );
    }
  };

  const stats = useMemo(() => {
    const active = leases.filter((l) => l.statusLocacao === "Ativa").length;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const paidThisMonth = leases.filter(
      (l) =>
        l.statusPagamento === "Pago" && l.lastPaymentMonth === currentMonth,
    ).length;
    const pendingOrLate = leases.filter(
      (l) =>
        l.statusLocacao === "Ativa" &&
        (l.statusPagamento === "Pendente" || l.statusPagamento === "Atrasado"),
    ).length;
    const revenue = leases
      .filter((l) => l.statusLocacao === "Ativa")
      .reduce((acc, l) => acc + (l.valorTotalPagar || 0), 0);

    return { active, paidThisMonth, pendingOrLate, revenue };
  }, [leases]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-10 pb-20"
    >
      <motion.div
        variants={slideUp}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 text-gold mb-3">
            <div className="w-10 h-[1px] bg-gold/30" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              Lease Management
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-black tracking-tight">
            Gestão de Locações
          </h1>
          <p className="text-gray-400 mt-2 text-lg font-light leading-relaxed">
            Controle datas de vencimento, recebíveis e histórico de contratos
            vigentes.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsEditing(false);
              resetForm();
              setShowModal(true);
            }}
            className="btn-gold !rounded-2xl !py-4 !px-8 shadow-xl shadow-gold/10"
          >
            <Plus size={22} />
            <span className="uppercase text-xs font-black tracking-widest leading-none">
              Nova Locação
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Contratos Ativos
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold text-primary-black">
              {stats.active}
            </h3>
            <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold">
              <FileText size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Pagos este mês
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold text-emerald-500">
              {stats.paidThisMonth}
            </h3>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Pendentes / Atrasados
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold text-red-500">
              {stats.pendingOrLate}
            </h3>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Receita Mensal Prevista
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-primary-black">
              {formatCurrency(stats.revenue)}
            </h3>
            <div className="w-12 h-12 bg-primary-black/5 rounded-2xl flex items-center justify-center text-primary-black/40">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Leases List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                <th className="p-8 pl-10">Imóvel / Código</th>
                <th className="p-8">Locatário</th>
                <th className="p-8">Valor / Venc.</th>
                <th className="p-8">Status Pgto</th>
                <th className="p-8">Último Pgto</th>
                <th className="p-8 pr-10 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-20 text-center animate-pulse text-gray-400"
                  >
                    Carregando carteira de locação...
                  </td>
                </tr>
              ) : leases.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-20 text-center text-gray-400 font-medium"
                  >
                    Nenhum contrato de locação ativo.
                  </td>
                </tr>
              ) : (
                leases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="p-8 pl-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gold uppercase tracking-widest mb-1">
                          {lease.propertyCode}
                        </span>
                        <span className="font-bold text-primary-black truncate max-w-xs">
                          {lease.propertyTitle}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {lease.propertyNeighborhood}, {lease.propertyCity}
                        </span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary-black">
                          {lease.tenantName}
                        </span>
                        <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
                          <Phone size={12} />
                          <span>{lease.tenantPhone}</span>
                        </div>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">
                          CPF: {lease.tenantCpf || "---"}
                        </span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary-green">
                          {formatCurrency(lease.valorTotalPagar)}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">
                          Dia {lease.dueDay}
                        </span>
                      </div>
                    </td>
                    <td className="p-8">
                      {lease.statusPagamento === "Pago" ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          <CheckCircle size={12} /> Pago
                        </span>
                      ) : lease.statusPagamento === "Atrasado" ? (
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                          <AlertCircle size={12} /> Atrasado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-500">
                          {lease.lastPaymentDate || "---"}
                        </span>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                          {lease.lastPaymentMonth || "---"}
                        </span>
                      </div>
                    </td>
                    <td className="p-8 pr-10 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedLease(lease);
                            setShowViewModal(true);
                          }}
                          className="p-2.5 text-gray-400 hover:text-primary-black hover:bg-gray-100 rounded-xl transition-all"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLease(lease);
                            setLeaseForm({ ...lease });
                            setIsEditing(true);
                            setShowModal(true);
                          }}
                          className="p-2.5 text-gray-400 hover:text-gold hover:bg-gold/10 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLease(lease);
                            setPaymentForm({
                              ...paymentForm,
                              value: lease.valorTotalPagar,
                            });
                            setShowPaymentModal(true);
                          }}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          title="Lançar Pagamento"
                        >
                          <DollarSign size={18} />
                        </button>
                        <button
                          onClick={() => generateReceipt(lease, "locatario")}
                          className="p-2.5 bg-primary-black text-white hover:bg-gold hover:text-primary-black rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          title="Gerar Recibo do Locatário (Inquilino)"
                        >
                          <Printer size={16} />
                          <span className="text-[9px] font-black uppercase tracking-wider">
                            Recibo Locatário
                          </span>
                        </button>
                        <button
                          onClick={() => generateReceipt(lease, "locador")}
                          className="p-2.5 bg-gold/10 text-gold hover:bg-gold hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          title="Gerar Recibo do Locador (Proprietário)"
                        >
                          <Printer size={16} />
                          <span className="text-[9px] font-black uppercase tracking-wider">
                            Recibo Locador
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteLease(lease)}
                          className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New/Edit Lease Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div
              {...fadeIn}
              className="fixed inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              {...scaleIn}
              className="bg-white max-w-5xl w-full rounded-[3rem] shadow-2xl relative z-10 my-auto"
            >
              <div className="p-10 bg-primary-black text-white flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-display font-bold">
                    {isEditing ? "Editar Locação" : "Cadastrar Nova Locação"}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Defina os termos do contrato e valores mensais para o
                    locatário.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-3 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateLease} className="p-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    {/* Section: Property Info */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-gold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <Building size={14} /> Dados do Imóvel
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Selecione o Imóvel de Locação
                          </label>
                          <select
                            required
                            disabled={isEditing}
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all disabled:opacity-50"
                            value={leaseForm.propertyId}
                            onChange={(e) =>
                              handlePropertySelect(e.target.value)
                            }
                          >
                            <option value="">Selecione...</option>
                            {properties
                              .filter((p) =>
                                isEditing ? true : p.status === "Disponível",
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.title} ({p.neighborhood})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section: Tenant Info */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-gold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <UserIcon size={14} /> Dados do Locatário
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Nome Completo
                          </label>
                          <input
                            required
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.tenantName}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                tenantName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            CPF
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="000.000.000-00"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.tenantCpf}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                tenantCpf: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Celular / WhatsApp
                          </label>
                          <input
                            required
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.tenantPhone}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                tenantPhone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Contract Terms */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-gold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <Calendar size={14} /> Termos do Contrato
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Data Início
                          </label>
                          <input
                            required
                            type="date"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.startDate}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                startDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Dia de Vencimento Mensal
                          </label>
                          <input
                            required
                            type="number"
                            min="1"
                            max="31"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.dueDay}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                dueDay: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section: Values Calculation */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-gold uppercase tracking-[0.3em] flex items-center gap-3">
                          <CreditCard size={14} /> Composição de Valores
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Aluguel (R$)
                          </label>
                          <input
                            required
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(leaseForm.valorAluguel ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorAluguel: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            IPTU Mensal (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(leaseForm.valorIptu ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorIptu: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Taxa de Lixo (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(leaseForm.valorTaxaLixo ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorTaxaLixo: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Taxa de Gás (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(leaseForm.valorTaxaGas ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorTaxaGas: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Condomínio (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(
                              leaseForm.valorCondominio ?? "",
                            )}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorCondominio: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Outros Valor (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={maskCurrency(leaseForm.valorOutros ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorOutros: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 text-red-400">
                            Desconto (R$)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-red-50/50 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-red-400/10 outline-none transition-all text-red-500"
                            value={maskCurrency(leaseForm.valorDesconto ?? "")}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                valorDesconto: parseCurrencyToNumber(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gold uppercase tracking-widest pl-1">
                            Comissão Imobiliária (%)
                          </label>
                          <input
                            type="number"
                            className="w-full bg-gold/5 border border-transparent rounded-2xl py-4 px-6 text-sm font-bold focus:ring-4 focus:ring-gold/10 outline-none transition-all"
                            value={leaseForm.percentualComissaoImobiliaria}
                            onChange={(e) =>
                              setLeaseForm({
                                ...leaseForm,
                                percentualComissaoImobiliaria: parseFloat(
                                  e.target.value,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const total =
                              (leaseForm.valorAluguel || 0) +
                              (leaseForm.valorIptu || 0) +
                              (leaseForm.valorTaxaLixo || 0) +
                              (leaseForm.valorTaxaGas || 0) +
                              (leaseForm.valorCondominio || 0) +
                              (leaseForm.valorOutros || 0) -
                              (leaseForm.valorDesconto || 0);
                            setLeaseForm((prev) => ({
                              ...prev,
                              valorTotalPagar: total,
                            }));
                          }}
                          className="flex items-center gap-2 text-[10px] font-black text-gold uppercase tracking-[0.2em] hover:text-gold/80 transition-all bg-gold/5 px-4 py-2 rounded-xl"
                        >
                          <Calculator size={14} />
                          Calcular Total
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col h-full sticky top-0">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                        Resumo da Locação
                      </h4>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Aluguel:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorAluguel || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">IPTU:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorIptu || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Taxa Lixo:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorTaxaLixo || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Taxa Gás:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorTaxaGas || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Condomínio:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorCondominio || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Outros:</span>
                          <span className="font-bold text-primary-black">
                            {formatCurrency(leaseForm.valorOutros || 0)}
                          </span>
                        </div>
                        {leaseForm.valorDesconto! > 0 && (
                          <div className="flex justify-between text-sm text-red-500 font-bold italic">
                            <span>Desconto:</span>
                            <span>
                              - {formatCurrency(leaseForm.valorDesconto || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/50 rounded-2xl p-6 border border-gold/20 mb-8 mt-6">
                        <p className="text-[10px] font-black text-gold uppercase tracking-widest mb-4">
                          Resumo da Comissão
                        </p>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">
                              Comissão (
                              {leaseForm.percentualComissaoImobiliaria}%):
                            </span>
                            <span className="font-bold text-primary-black">
                              {formatCurrency(
                                leaseForm.valorComissaoImobiliaria || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">
                              Repasse Proprietário:
                            </span>
                            <span className="font-bold text-emerald-600">
                              {formatCurrency(
                                leaseForm.valorRepassadoProprietario || 0,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-8 border-t border-gray-200">
                        <div className="flex flex-col items-center mb-10">
                          <p className="text-[9px] font-black text-gold uppercase tracking-[0.4em] mb-4">
                            Total a pagar pelo cliente
                          </p>
                          <h2 className="text-5xl font-display font-black text-primary-black">
                            {formatCurrency(leaseForm.valorTotalPagar || 0)}
                          </h2>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                              Status Pagamento
                            </label>
                            <select
                              className="input-field"
                              value={leaseForm.statusPagamento}
                              onChange={(e) =>
                                setLeaseForm({
                                  ...leaseForm,
                                  statusPagamento: e.target.value as any,
                                })
                              }
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Pago">Pago</option>
                              <option value="Atrasado">Atrasado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                              Status Locação
                            </label>
                            <select
                              className="input-field"
                              value={leaseForm.statusLocacao}
                              onChange={(e) =>
                                setLeaseForm({
                                  ...leaseForm,
                                  statusLocacao: e.target.value as any,
                                })
                              }
                            >
                              <option value="Ativa">Ativa</option>
                              <option value="Encerrada">Encerrada</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>

                            {leaseForm.statusLocacao === "Ativa" && (
                              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mt-3 space-y-2 text-xs text-amber-900 shadow-sm">
                                <p className="font-bold flex items-center gap-1.5">
                                  <span>ℹ️</span> Este imóvel será exibido no site como "Já Alugado".
                                </p>
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-800 hover:text-amber-950 transition-colors select-none">
                                  <input
                                    type="checkbox"
                                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500/30 h-4 w-4 bg-white"
                                    checked={leaseForm.manterPublicado !== false}
                                    onChange={(e) =>
                                      setLeaseForm({
                                        ...leaseForm,
                                        manterPublicado: e.target.checked,
                                      })
                                    }
                                  />
                                  <span>Manter imóvel publicado no site como alugado</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !rounded-2xl !py-6 !px-10 shadow-2xl text-[10px] font-black uppercase tracking-widest mt-10"
                        >
                          {isEditing ? "Salvar Alterações" : "Efetivar Aluguel"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View/Details Modal */}
      <AnimatePresence>
        {showViewModal && selectedLease && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              {...fadeIn}
              className="fixed inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowViewModal(false)}
            />
            <motion.div
              {...scaleIn}
              className="bg-white max-w-2xl w-full rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-10 bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-gold uppercase tracking-[0.3em]">
                    {selectedLease.propertyCode}
                  </span>
                  <h3 className="text-3xl font-display font-bold text-primary-black mt-1">
                    Detalhes da Locação
                  </h3>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-3 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Locatário
                    </p>
                    <p className="font-bold text-primary-black text-lg">
                      {selectedLease.tenantName}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {selectedLease.tenantPhone}
                    </p>
                    <p className="text-gray-400 text-sm">
                      CPF: {selectedLease.tenantCpf || "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Imóvel
                    </p>
                    <p className="font-bold text-primary-black">
                      {selectedLease.propertyTitle}
                    </p>
                    <p className="text-gray-400 text-xs italic">
                      {selectedLease.propertyAddress}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-4">
                      Total Mensal
                    </p>
                    <h2 className="text-4xl font-display font-black text-emerald-600 leading-none">
                      {formatCurrency(selectedLease.valorTotalPagar)}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-3 italic">
                      Vencimento
                    </p>
                    <span className="p-4 bg-white rounded-2xl font-black text-emerald-600 shadow-sm border border-emerald-50">
                      TODO DIA {selectedLease.dueDay}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Resumo Financeiro
                  </p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400 text-xs">
                        Aluguel Base
                      </span>
                      <span className="font-bold text-primary-black">
                        {formatCurrency(selectedLease.valorAluguel)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400 text-xs">IPTU</span>
                      <span className="font-bold text-primary-black">
                        {formatCurrency(selectedLease.valorIptu)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400 text-xs">Condomínio</span>
                      <span className="font-bold text-primary-black">
                        {formatCurrency(selectedLease.valorCondominio)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400 text-xs">Taxa Lixo</span>
                      <span className="font-bold text-primary-black">
                        {formatCurrency(selectedLease.valorTaxaLixo)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-400 text-xs">Taxa Gás</span>
                      <span className="font-bold text-primary-black">
                        {formatCurrency(selectedLease.valorTaxaGas ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setLeaseForm({ ...selectedLease });
                      setIsEditing(true);
                      setShowModal(true);
                    }}
                    className="flex-grow btn-gold !bg-primary-black !text-white hover:!bg-gold hover:!text-primary-black !py-4"
                  >
                    Editar Locação
                  </button>
                  <button
                    onClick={() => generateReceipt(selectedLease, "locatario")}
                    className="px-4 py-3 bg-primary-black text-white hover:bg-gold hover:text-primary-black rounded-2xl flex items-center gap-1.5 transition-all shadow-md text-[11px] font-bold"
                    title="Recibo Locatário"
                  >
                    <Printer size={15} /> Recibo Locatário
                  </button>
                  <button
                    onClick={() => generateReceipt(selectedLease, "locador")}
                    className="px-4 py-3 bg-gold/10 text-gold rounded-2xl hover:bg-gold hover:text-white flex items-center gap-1.5 transition-all shadow-sm text-[11px] font-bold"
                    title="Recibo Locador"
                  >
                    <Printer size={15} /> Recibo Locador
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedLease && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              {...fadeIn}
              className="fixed inset-0 bg-primary-black/60 backdrop-blur-md"
              onClick={() => setShowPaymentModal(false)}
            />
            <motion.div
              {...scaleIn}
              className="bg-white max-w-xl w-full rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-10 bg-emerald-600 text-white">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                  Recebimento de Aluguel
                </span>
                <h3 className="text-3xl font-display font-bold mt-2">
                  Lançar Pagamento
                </h3>
              </div>

              <form onSubmit={handleRegisterPayment} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Mês de Referência
                    </label>
                    <input
                      required
                      type="month"
                      className="input-field"
                      value={paymentForm.month}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          month: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Data do Pagamento
                    </label>
                    <input
                      required
                      type="date"
                      className="input-field"
                      value={paymentForm.date}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Valor Recebido (R$)
                    </label>
                    <input
                      required
                      type="text"
                      className="input-field text-emerald-600 font-bold text-lg"
                      value={maskCurrency(paymentForm.value)}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          value: parseCurrencyToNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="text-xs font-bold uppercase text-gray-400 tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-gold !bg-emerald-600 !text-white hover:!bg-emerald-700"
                  >
                    Confirmar Pagamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

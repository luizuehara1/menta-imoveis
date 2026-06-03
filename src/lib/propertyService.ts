import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchPublicImoveis(): Promise<any[]> {
  console.log("-----------------------------------------");
  console.log("[DEBUG] INICIANDO REQUISIÇÃO DE IMÓVEIS");
  console.log("Firebase projectId:", db.app.options.projectId);
  console.log("Firebase authDomain:", db.app.options.authDomain);
  console.log("Origem atual:", window.location.origin);
  console.log("URL atual:", window.location.href);
  console.log("Buscando imóveis da coleção imoveis...");

  try {
    const snap = await getDocs(collection(db, "imoveis"));
    
    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as any
    }));

    console.log("Total bruto Firestore:", lista.length);
    console.log("Imóveis brutos:", lista);

    const publicos = lista.filter((imovel) =>
      imovel?.publicadoNoSite === true ||
      imovel?.publicado === true
    );

    console.log("Total imóveis publicados:", publicos.length);
    console.log("Imóveis publicados:", publicos);
    console.log("[DEBUG] REQUISIÇÃO CONCLUÍDA COM SUCESSO");
    console.log("-----------------------------------------");

    return publicos;
  } catch (error: any) {
    console.error("-----------------------------------------");
    console.error("[DEBUG] FALHA AO BUSCAR IMÓVEIS DO FIRESTORE");
    console.error("Código do erro:", error?.code);
    console.error("Mensagem do erro:", error?.message);
    console.error("Objeto error completo:", error);
    console.error("-----------------------------------------");
    throw error;
  }
}

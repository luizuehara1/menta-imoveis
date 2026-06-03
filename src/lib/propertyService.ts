import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchPublicImoveis(): Promise<any[]> {
  console.log("-----------------------------------------");
  console.log("[DEBUG] INICIANDO REQUISIÇÃO DE IMÓVEIS");
  console.log("Firebase projectId:", db.app.options.projectId);
  console.log("Firebase authDomain:", db.app.options.authDomain);
  console.log("Origem atual:", window.location.origin);
  console.log("URL atual:", window.location.href);
  console.log("Buscando imóveis públicos da coleção imoveis...");

  try {
    const imoveisRef = collection(db, "imoveis");

    const qPublicadoNoSite = query(
      imoveisRef,
      where("publicadoNoSite", "==", true)
    );

    const qPublicado = query(
      imoveisRef,
      where("publicado", "==", true)
    );

    const [snapPublicadoNoSite, snapPublicado] = await Promise.all([
      getDocs(qPublicadoNoSite),
      getDocs(qPublicado)
    ]);

    const map = new Map<string, any>();

    snapPublicadoNoSite.docs.forEach((docSnap) => {
      map.set(docSnap.id, {
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    snapPublicado.docs.forEach((docSnap) => {
      map.set(docSnap.id, {
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    const lista = Array.from(map.values());

    console.log("Total imóveis publicados (deduplicados):", lista.length);
    console.log("Imóveis publicados:", lista);
    console.log("[DEBUG] REQUISIÇÃO CONCLUÍDA COM SUCESSO");
    console.log("-----------------------------------------");

    return lista;
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

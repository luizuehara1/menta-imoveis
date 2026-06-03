import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchPublicImoveis(): Promise<any[]> {
  console.log("Buscando imóveis da coleção imoveis...");
  const snap = await getDocs(collection(db, "imoveis"));
  
  const lista = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data() as any
  }));

  const publicos = lista.filter((imovel) =>
    imovel?.publicadoNoSite === true ||
    imovel?.publicado === true
  );

  return publicos;
}

import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SiteConfig, OptionItem } from '../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../constants/defaultSettings';

export function useSettings() {
  const [settings, setSettings] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: stop loading after 3 seconds no matter what for better speed
    const timer = setTimeout(() => {
      setLoading(false);
      console.warn("[useSettings] Safety timeout reached.");
    }, 3000);

    const unsub = onSnapshot(doc(db, 'siteSettings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Requirement: support both nested and flat fields redundancy
        // Mapping flat fields from user "Expected Fields" to our SiteConfig structure
        const mappedData = {
          ...DEFAULT_SITE_CONFIG,
          ...data,
          hero: {
            ...DEFAULT_SITE_CONFIG.hero,
            tituloPrincipal: data.heroTitulo || data.hero?.tituloPrincipal || DEFAULT_SITE_CONFIG.hero.tituloPrincipal,
            subtitulo: data.heroSubtitulo || data.hero?.subtitulo || DEFAULT_SITE_CONFIG.hero.subtitulo,
            heroBadge: data.heroBadge || data.hero?.heroBadge || DEFAULT_SITE_CONFIG.hero.heroBadge,
            imagemFundoUrl: data.heroImagemUrl || data.hero?.imagemFundoUrl || DEFAULT_SITE_CONFIG.hero.imagemFundoUrl,
            textoBotaoPrincipal: data.heroBotaoPrincipalTexto || data.hero?.textoBotaoPrincipal || DEFAULT_SITE_CONFIG.hero.textoBotaoPrincipal,
            linkBotaoPrincipal: data.heroBotaoPrincipalLink || data.hero?.linkBotaoPrincipal || DEFAULT_SITE_CONFIG.hero.linkBotaoPrincipal,
            textoBotaoSecundario: data.heroBotaoSecundarioTexto || data.hero?.textoBotaoSecundario || DEFAULT_SITE_CONFIG.hero.textoBotaoSecundario,
            linkBotaoSecundario: data.heroBotaoSecundarioLink || data.hero?.linkBotaoSecundario || DEFAULT_SITE_CONFIG.hero.linkBotaoSecundario,
          },
          empresa: {
            ...DEFAULT_SITE_CONFIG.empresa,
            nome: data.empresaNome || data.empresa?.nome || DEFAULT_SITE_CONFIG.empresa.nome,
            razaoSocial: data.empresaRazaoSocial || data.empresa?.razaoSocial || DEFAULT_SITE_CONFIG.empresa.razaoSocial,
            cnpj: data.empresaCnpj || data.empresa?.cnpj || DEFAULT_SITE_CONFIG.empresa.cnpj,
            creciPj: data.empresaCreciPj || data.empresa?.creciPj || DEFAULT_SITE_CONFIG.empresa.creciPj,
            telefone: data.empresaTelefone || data.empresa?.telefone || DEFAULT_SITE_CONFIG.empresa.telefone,
            whatsapp: data.empresaWhatsapp || data.empresa?.whatsapp || DEFAULT_SITE_CONFIG.empresa.whatsapp,
            email: data.empresaEmail || data.empresa?.email || DEFAULT_SITE_CONFIG.empresa.email,
            endereco: data.empresaEndereco || data.empresa?.endereco || DEFAULT_SITE_CONFIG.empresa.endereco,
            logoCabecalhoUrl: data.empresaLogoCabecalhoUrl || data.logoUrl || data.empresa?.logoCabecalhoUrl || DEFAULT_SITE_CONFIG.empresa.logoCabecalhoUrl,
            marcaDaguaUrl: data.empresaMarcaDaguaUrl || data.marcaDaguaUrl || data.empresa?.marcaDaguaUrl || DEFAULT_SITE_CONFIG.empresa.marcaDaguaUrl,
          },
          aparencia: {
            ...DEFAULT_SITE_CONFIG.aparencia,
            logoUrl: data.logoUrl || data.aparencia?.logoUrl || DEFAULT_SITE_CONFIG.aparencia.logoUrl,
            logoNavbarUrl: data.logoNavbarUrl || data.aparencia?.logoNavbarUrl || DEFAULT_SITE_CONFIG.aparencia.logoNavbarUrl,
            logoFooterUrl: data.logoFooterUrl || data.aparencia?.logoFooterUrl || DEFAULT_SITE_CONFIG.aparencia.logoFooterUrl,
            faviconUrl: data.faviconUrl || data.aparencia?.faviconUrl || DEFAULT_SITE_CONFIG.aparencia.faviconUrl,
          }
        };
        setSettings(mappedData as SiteConfig);
      } else {
        setSettings(DEFAULT_SITE_CONFIG);
      }
      setLoading(false);
      clearTimeout(timer);
    }, (error) => {
      console.error("Error fetching settings:", error);
      setSettings(DEFAULT_SITE_CONFIG);
      setLoading(false);
      clearTimeout(timer);
    });

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  return { settings, loading };
}

export function useOptions() {
  const [options, setOptions] = useState<Record<string, OptionItem[]>>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout
    const timer = setTimeout(() => {
      setLoading(false);
      console.warn("[useOptions] Safety timeout reached.");
    }, 5000);

    const categories = [
      'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 
      'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
      'lazer', 'localizacoes'
    ];

    const unsubs = categories.map(category => {
      // Fetch from opcoes_imoveis/{category}
      const docRef = doc(db, 'opcoes_imoveis', category);
      
      const unsub = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.itens || [];
          setOptions(prev => ({
            ...prev,
            [category]: items.length > 0 ? items : (DEFAULT_OPTIONS[category] || [])
          }));
        } else {
          // If document doesn't exist, use defaults
          setOptions(prev => ({
            ...prev,
            [category]: DEFAULT_OPTIONS[category] || []
          }));

          // AUTO-SEED: If admin is logged in, create the document
          // We check for auth.currentUser directly. Security rules will protect if not a real admin.
          if (auth.currentUser) {
            try {
              const defaultItems = DEFAULT_OPTIONS[category] || [];
              if (defaultItems.length > 0) {
                console.log(`[useOptions] SEEDING (${category}): Creating missing doc with defaults.`);
                const { serverTimestamp } = await import('firebase/firestore');
                await setDoc(docRef, {
                  itens: defaultItems,
                  updatedAt: serverTimestamp(),
                  seeding: true
                }, { merge: true });
              }
            } catch (e) {
              // Silently fail if permissions prevent it
            }
          }
        }
      }, (error) => {
        // Fallback silently to defaults on error to avoid console noise for public users
        console.warn(`[useOptions] Falling back to defaults for ${category}: ${error.message}`);
        setOptions(prev => ({
          ...prev,
          [category]: DEFAULT_OPTIONS[category] || []
        }));
      });

      return unsub;
    });

    // Also fetch from top-level bairros collection
    const unsubBairros = onSnapshot(collection(db, 'bairros'), (snap) => {
      const b = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
      setOptions(prev => ({ ...prev, bairros: b as any }));
    }, (error) => {
      console.warn(`[useOptions] Error fetching bairros:`, error.message);
      setOptions(prev => ({ ...prev, bairros: [] }));
    });

    setLoading(false);

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubBairros();
    };
  }, []);

  return { options, loading };
}

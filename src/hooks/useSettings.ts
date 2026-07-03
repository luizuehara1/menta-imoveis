import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SiteConfig, OptionItem } from '../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../constants/defaultSettings';

// Global cache to avoid redundant reads and layout shift/loading flicker
let globalSettings: SiteConfig | null = null;
let settingsLoading = true;
const settingsListeners = new Set<(state: { settings: SiteConfig; loading: boolean }) => void>();
let settingsUnsub: (() => void) | null = null;

function notifySettingsListeners() {
  const state = { settings: globalSettings || DEFAULT_SITE_CONFIG, loading: settingsLoading };
  settingsListeners.forEach(l => l(state));
}

// Global options cache
let globalOptions: Record<string, OptionItem[]> | null = null;
let optionsLoading = true;
const optionsListeners = new Set<(state: { options: Record<string, OptionItem[]>; loading: boolean }) => void>();
let optionsUnsubs: (() => void)[] = [];

function notifyOptionsListeners() {
  const state = { options: globalOptions || DEFAULT_OPTIONS, loading: optionsLoading };
  optionsListeners.forEach(l => l(state));
}

export function useSettings() {
  const [state, setState] = useState({
    settings: globalSettings || DEFAULT_SITE_CONFIG,
    loading: globalSettings ? false : settingsLoading
  });

  useEffect(() => {
    const handleUpdate = (updatedState: { settings: SiteConfig; loading: boolean }) => {
      setState(updatedState);
    };

    settingsListeners.add(handleUpdate);

    if (settingsListeners.size === 1 && !settingsUnsub) {
      const timer = setTimeout(() => {
        settingsLoading = false;
        notifySettingsListeners();
        console.warn("[useSettings] Safety timeout reached.");
      }, 3000);

      settingsUnsub = onSnapshot(doc(db, 'siteSettings', 'main'), (docSnap) => {
        clearTimeout(timer);
        settingsLoading = false;
        if (docSnap.exists()) {
          const data = docSnap.data();
          
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
              creciResponsavel: data.empresaCreciResponsavel || data.empresa?.creciResponsavel || DEFAULT_SITE_CONFIG.empresa.creciResponsavel,
              telefone: data.empresaTelefone || data.empresa?.telefone || DEFAULT_SITE_CONFIG.empresa.telefone,
              whatsapp: data.empresaWhatsapp || data.empresa?.whatsapp || DEFAULT_SITE_CONFIG.empresa.whatsapp,
              email: data.empresaEmail || data.empresa?.email || DEFAULT_SITE_CONFIG.empresa.email,
              site: data.empresaSite || data.empresa?.site || DEFAULT_SITE_CONFIG.empresa.site,
              endereco: data.empresaEndereco || data.empresa?.endereco || DEFAULT_SITE_CONFIG.empresa.endereco,
              bairro: data.empresaBairro || data.empresa?.bairro || DEFAULT_SITE_CONFIG.empresa.bairro,
              cidade: data.empresaCidade || data.empresa?.cidade || DEFAULT_SITE_CONFIG.empresa.cidade,
              estado: data.empresaEstado || data.empresa?.estado || DEFAULT_SITE_CONFIG.empresa.estado,
              cep: data.empresaCep || data.empresa?.cep || DEFAULT_SITE_CONFIG.empresa.cep,
              logoCabecalhoUrl: data.empresaLogoCabecalhoUrl || data.logoUrl || data.empresa?.logoCabecalhoUrl || DEFAULT_SITE_CONFIG.empresa.logoCabecalhoUrl,
              marcaDaguaUrl: data.empresaMarcaDaguaUrl || data.marcaDaguaUrl || data.empresa?.marcaDaguaUrl || DEFAULT_SITE_CONFIG.empresa.marcaDaguaUrl,
              rodapeContratos: data.empresaRodapeContratos || data.empresa?.rodapeContratos || DEFAULT_SITE_CONFIG.empresa.rodapeContratos,
            },
            aparencia: {
              ...DEFAULT_SITE_CONFIG.aparencia,
              logoUrl: data.logoUrl || data.aparencia?.logoUrl || DEFAULT_SITE_CONFIG.aparencia.logoUrl,
              logoNavbarUrl: data.logoNavbarUrl || data.aparencia?.logoNavbarUrl || DEFAULT_SITE_CONFIG.aparencia.logoNavbarUrl,
              logoFooterUrl: data.logoFooterUrl || data.aparencia?.logoFooterUrl || DEFAULT_SITE_CONFIG.aparencia.logoFooterUrl,
              faviconUrl: data.faviconUrl || data.aparencia?.faviconUrl || DEFAULT_SITE_CONFIG.aparencia.faviconUrl,
            }
          };
          globalSettings = mappedData as SiteConfig;
        } else {
          globalSettings = DEFAULT_SITE_CONFIG;
        }
        notifySettingsListeners();
      }, (error) => {
        clearTimeout(timer);
        console.error("Error fetching settings:", error);
        globalSettings = DEFAULT_SITE_CONFIG;
        settingsLoading = false;
        notifySettingsListeners();
      });
    } else {
      // If already fetching or fetched, immediately notify of current status
      handleUpdate({
        settings: globalSettings || DEFAULT_SITE_CONFIG,
        loading: globalSettings ? false : settingsLoading
      });
    }

    return () => {
      settingsListeners.delete(handleUpdate);
      // We keep settingsUnsub active as a persistent listener for real-time site settings updates,
      // but we can clean it up if desired. For max speed, we keep it alive to preserve cache warmness.
    };
  }, []);

  return { settings: state.settings, loading: state.loading };
}

export function useOptions() {
  const [state, setState] = useState({
    options: globalOptions || DEFAULT_OPTIONS,
    loading: globalOptions ? false : optionsLoading
  });

  useEffect(() => {
    const handleUpdate = (updatedState: { options: Record<string, OptionItem[]>; loading: boolean }) => {
      setState(updatedState);
    };

    optionsListeners.add(handleUpdate);

    if (optionsListeners.size === 1 && optionsUnsubs.length === 0) {
      const timer = setTimeout(() => {
        optionsLoading = false;
        notifyOptionsListeners();
        console.warn("[useOptions] Safety timeout reached.");
      }, 5000);

      const categories = [
        'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 
        'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
        'lazer', 'localizacoes', 'ambientes', 'caracteristicasApartamento',
        'caracteristicasEmpreendimento', 'localizacao'
      ];

      // Local state accumulator during snapshot setups
      if (!globalOptions) {
        globalOptions = { ...DEFAULT_OPTIONS };
      }

      const categoryUnsubs = categories.map(category => {
        const docRef = doc(db, 'opcoes_imoveis', category);
        
        return onSnapshot(docRef, async (docSnap) => {
          let items = docSnap.exists() ? (docSnap.data().itens || []) : [];
          if (category === 'tiposNegocio') {
            items = items.map((item: any) => {
              const labelLower = String(item.label || item.nome || '').trim().toLowerCase();
              if (labelLower === 'comprar' || labelLower === 'venda') {
                return {
                  ...item,
                  nome: 'Venda',
                  label: 'Venda',
                  valor: 'venda',
                  value: 'venda'
                };
              }
              return item;
            });
          }

          if (globalOptions) {
            globalOptions[category] = items.length > 0 ? items : (DEFAULT_OPTIONS[category] || []);
          }

          // Trigger update notification
          optionsLoading = false;
          notifyOptionsListeners();

          // SEEDING logic if logged in admin
          if (!docSnap.exists() && auth.currentUser) {
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
              // Silently ignore
            }
          }
        }, (error) => {
          console.warn(`[useOptions] Falling back for ${category}: ${error.message}`);
          if (globalOptions) {
            globalOptions[category] = DEFAULT_OPTIONS[category] || [];
          }
          notifyOptionsListeners();
        });
      });

      // Bairros collection snapshot
      const bairrosUnsub = onSnapshot(collection(db, 'bairros'), (snap) => {
        const b = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
        if (globalOptions) {
          globalOptions.bairros = b as any;
        }
        clearTimeout(timer);
        optionsLoading = false;
        notifyOptionsListeners();
      }, (error) => {
        console.warn(`[useOptions] Error fetching bairros:`, error.message);
        if (globalOptions) {
          globalOptions.bairros = [];
        }
        notifyOptionsListeners();
      });

      optionsUnsubs = [...categoryUnsubs, bairrosUnsub];
    } else {
      handleUpdate({
        options: globalOptions || DEFAULT_OPTIONS,
        loading: globalOptions ? false : optionsLoading
      });
    }

    return () => {
      optionsListeners.delete(handleUpdate);
    };
  }, []);

  return { options: state.options, loading: state.loading };
}

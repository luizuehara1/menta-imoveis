import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteConfig, OptionItem } from '../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../constants/defaultSettings';

export function useSettings() {
  const [settings, setSettings] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteSettings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...DEFAULT_SITE_CONFIG, ...docSnap.data() } as SiteConfig);
      } else {
        setSettings(DEFAULT_SITE_CONFIG);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching settings:", error);
      setSettings(DEFAULT_SITE_CONFIG); // Fallback explicitly
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { settings, loading };
}

export function useOptions() {
  const [options, setOptions] = useState<Record<string, OptionItem[]>>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categories = [
      'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 
      'faixasPreco', 'caracteristicas', 'instalacoes', 'acabamentos', 
      'lazer', 'localizacoes'
    ];

    const unsubs = categories.map(category => {
      const path = `opcoes_imoveis/${category}`;
      return onSnapshot(doc(db, 'opcoes_imoveis', category), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.itens || [];
          setOptions(prev => ({
            ...prev,
            [category]: items.length > 0 ? items : (DEFAULT_OPTIONS[category] || [])
          }));
        } else {
          setOptions(prev => ({
            ...prev,
            [category]: DEFAULT_OPTIONS[category] || []
          }));
        }
      }, (error) => {
        console.error(`Error fetching options for ${category}:`, error);
        setOptions(prev => ({
          ...prev,
          [category]: DEFAULT_OPTIONS[category] || []
        }));
      });
    });

    // Also fetch from top-level bairros collection
    const unsubBairros = onSnapshot(collection(db, 'bairros'), (snap) => {
      const b = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.ativo);
      setOptions(prev => ({ ...prev, bairros: b as any }));
    });

    setLoading(false);

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubBairros();
    };
  }, []);

  return { options, loading };
}

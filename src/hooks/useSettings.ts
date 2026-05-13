import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteConfig, OptionItem } from '../types';
import { DEFAULT_SITE_CONFIG, DEFAULT_OPTIONS } from '../constants/defaultSettings';

export function useSettings() {
  const [settings, setSettings] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracoes', 'site'), (docSnap) => {
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
      'tiposImovel', 'tiposNegocio', 'statusImovel', 'cidades', 'bairros', 
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
          // If doc doesn't exist, use default for this category
          setOptions(prev => ({
            ...prev,
            [category]: DEFAULT_OPTIONS[category] || []
          }));
        }
      }, (error) => {
        console.error(`Error fetching options for ${category}:`, error);
        // On error, ensure we have the default for this category at least
        setOptions(prev => ({
          ...prev,
          [category]: DEFAULT_OPTIONS[category] || []
        }));
      });
    });

    setLoading(false);

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  return { options, loading };
}

import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
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

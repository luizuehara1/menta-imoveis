import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Instagram, MessageCircle, Phone, Mail } from 'lucide-react';
import { cleanPhoneForWhatsapp } from '../../lib/utils';
import { useSEO } from '../../hooks/useSEO';

export default function Brokers() {
  useSEO({
    title: "Corretores Especialistas | Menta Imóveis",
    description: "Conheça nossa equipe de corretores imobiliários parceiros e especialistas prontos para ajudar você a encontrar o imóvel ideal em Balneário Camboriú e região."
  });

  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const q = query(collection(db, 'corretores'), where('active', '==', true));
        const snap = await getDocs(q);
        setBrokers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrokers();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
           <span className="text-gold font-bold uppercase tracking-widest text-xs mb-2 block">Nossa Equipe</span>
           <h1 className="section-title">Corretores <span className="text-gold">Especialistas</span></h1>
           <p className="text-gray-500 max-w-2xl mx-auto mt-4">Nossa equipe é formada por profissionais altamente qualificados e comprometidos com o seu sucesso.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {loading ? (
             [1,2,3,4].map(n => <div key={n} className="h-96 bg-gray-200 animate-pulse rounded-2xl" />)
          ) : (
            brokers.map(broker => (
              <div key={broker.id} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group text-center">
                 <div className="w-24 h-24 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                    {broker.name.charAt(0)}
                 </div>
                 <h3 className="text-xl font-bold text-primary-black mb-1">{broker.name}</h3>
                 <p className="text-gold text-xs font-bold uppercase mb-6 tracking-widest">CRECI {broker.creci}</p>
                 
                 <div className="flex items-center justify-center gap-4 border-t pt-6">
                    <a href={`tel:${broker.phone}`} className="p-2 text-gray-400 hover:text-gold transition-colors"><Phone size={20} /></a>
                    <a href={`https://wa.me/55${cleanPhoneForWhatsapp(broker.whatsapp)}`} target="_blank" className="p-2 text-gray-400 hover:text-emerald-500 transition-colors" rel="noopener noreferrer"><MessageCircle size={20} /></a>
                    <a href={`mailto:${broker.email}`} className="p-2 text-gray-400 hover:text-primary-green transition-colors"><Mail size={20} /></a>
                    {broker.instagram && (
                      <a href={`https://instagram.com/${broker.instagram}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-pink-500 transition-colors"><Instagram size={20} /></a>
                    )}
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

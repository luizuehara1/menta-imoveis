import React from 'react';
import { Check, Mail, Phone, MapPin } from 'lucide-react';
import { PremiumHeroBackground } from '../../components/three/PremiumHeroBackground';
import { LuxuryShapeCanvas } from '../../components/three/AbstractLuxuryShape';
import { SafeImage } from '../../components/ui/SafeImage';
import { useSEO } from '../../hooks/useSEO';

export default function About() {
  useSEO({
    title: "Sobre Nós | Menta Imóveis",
    description: "A Menta Negócios Imobiliários nasceu com o propósito de transformar o mercado imobiliário em Balneário Camboriú através de um atendimento Boutique e Exclusivo."
  });

  return (
    <div className="bg-white">
      <section className="bg-primary-green py-32 text-white text-center relative overflow-hidden">
         <PremiumHeroBackground />
         <div className="max-w-4xl mx-auto px-8 relative z-10">
            <span className="text-gold font-bold uppercase tracking-widest text-xs mb-4 block">Desde 2011</span>
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-8">Nossa História</h1>
            <p className="text-emerald-100 text-lg opacity-80 leading-relaxed">
              A Menta Negócios Imobiliários nasceu com o propósito de transformar o mercado imobiliário em Balneário Camboriú através de um atendimento Boutique e Exclusivo.
            </p>
         </div>
      </section>

      <section className="max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
         <div className="space-y-6">
            <h2 className="section-title">Nossa <span className="text-gold">Missão</span></h2>
            <p className="text-gray-500 leading-relaxed">
              Atuar com excelência no mercado de luxo, proporcionando segurança jurídica e emocional em cada transação. Entendemos que um imóvel não é apenas um endereço, mas sim a materialização de um sonho e um pilar de investimento.
            </p>
            <div className="space-y-4">
               {['Transparência absoluta', 'Foco no cliente', 'Segurança jurídica', 'Conhecimento técnico'].map(item => (
                 <div key={item} className="flex items-center gap-3">
                    <Check size={20} className="text-gold" />
                    <span className="font-bold text-primary-black">{item}</span>
                 </div>
               ))}
               <div className="pt-8 pl-1">
                 <LuxuryShapeCanvas size={0.6} color="#003030" />
               </div>
            </div>
         </div>
         <div className="relative">
            <SafeImage 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000" 
              className="rounded-2xl shadow-2xl overflow-hidden h-96 w-full" 
              alt="Escritório" 
            />
            <div className="absolute -bottom-8 -left-8 bg-gold p-8 rounded-2xl shadow-xl hidden md:block">
               <h4 className="font-display text-4xl font-bold text-primary-black">15+</h4>
               <p className="text-primary-black/60 text-xs font-bold uppercase">Anos de Mercado</p>
            </div>
         </div>
      </section>
    </div>
  );
}

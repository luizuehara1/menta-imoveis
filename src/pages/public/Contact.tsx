import React from 'react';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

export default function Contact() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-24">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            <div className="space-y-12">
               <div>
                  <span className="text-gold font-bold uppercase tracking-widest text-xs mb-2 block">Contato</span>
                  <h1 className="section-title">Fale Conosco</h1>
                  <p className="text-gray-500 mt-6 leading-relaxed">
                    Estamos prontos para atender você com exclusividade e sigilo. Seja para vender seu imóvel ou encontrar o novo endereço dos seus sonhos.
                  </p>
               </div>

               <div className="space-y-6">
                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
                        <Phone size={24} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Atendimento Comercial</p>
                        <p className="text-lg font-bold text-primary-black">{import.meta.env.VITE_WHATSAPP_NUMBER || '(47) 99291-4069'}</p>
                     </div>
                  </div>

                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                        <MessageCircle size={24} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Plantão WhatsApp</p>
                        <p className="text-lg font-bold text-primary-black">{import.meta.env.VITE_WHATSAPP_NUMBER || '(41) 98818-711'}</p>
                     </div>
                  </div>

                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                        <MapPin size={24} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Endereço Físico</p>
                        <p className="text-lg font-bold text-primary-black">Av Brasil 2636 - Centro, Balneário Camboriú - SC</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-gray-50 p-10 rounded-3xl border border-gray-100 shadow-xl">
               <h3 className="text-2xl font-display font-bold text-primary-black mb-8">Envie uma Mensagem</h3>
               <form className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                     <input type="text" className="input-field border-none shadow-sm" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                        <input type="tel" className="input-field border-none shadow-sm" required />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                        <input type="email" className="input-field border-none shadow-sm" required />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase">Assunto</label>
                     <select className="input-field border-none shadow-sm">
                        <option>Quero vender meu imóvel</option>
                        <option>Quero comprar um imóvel</option>
                        <option>Aluguel de temporada</option>
                        <option>Dúvidas gerais</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase">Mensagem</label>
                     <textarea className="input-field border-none shadow-sm h-32" required />
                  </div>
                  <button className="w-full btn-gold !py-4 shadow-xl shadow-gold/20">Enviar Mensagem</button>
               </form>
            </div>
         </div>
      </div>
      
      {/* Map Placeholder */}
      <div className="h-96 w-full bg-gray-100">
         <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover grayscale opacity-50" alt="Mapa" />
      </div>
    </div>
  );
}

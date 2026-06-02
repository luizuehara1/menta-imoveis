import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';

export default function NotFound() {
  useSEO({
    title: "Página Não Encontrada | Menta Imóveis",
    description: "Desculpe, a página que você está procurando não existe.",
    noIndex: true
  });

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-8 py-24 text-center">
      <span className="text-gold font-mono font-bold tracking-widest text-lg mb-4">ERRO 404</span>
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 text-primary-gray">Página Não Encontrada</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
        Não conseguimos encontrar a página que você está procurando. Certifique-se de que o link inserido está correto ou volte para à página inicial.
      </p>
      <Link 
        to="/" 
        className="px-8 py-4 bg-primary-green hover:bg-opacity-95 text-white font-bold transition-all uppercase tracking-widest text-xs rounded-lg"
      >
        Voltar para a Home
      </Link>
    </div>
  );
}

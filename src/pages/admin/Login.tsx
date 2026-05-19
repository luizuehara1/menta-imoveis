import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SafeImage } from '../../components/ui/SafeImage';
import { useSettings } from '../../hooks/useSettings';

export default function AdminLogin() {
  const { login, logout, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async () => {
    setError(null);
    try {
      await login();
    } catch (err: any) {
      console.error("Login component error:", err);
      setError(err?.message || 'Falha na autenticação. Tente novamente.');
    }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Verificando sessão...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-black p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-dark-green/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 p-8 md:p-12">
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center mb-8">
            <SafeImage 
              src={settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
              alt={settings.empresa.nome} 
              priority
              className="w-24 h-24 object-contain mb-4" 
            />
            <span className="font-display text-4xl font-bold tracking-tighter text-primary-black leading-tight">
              {settings.empresa.nome.split(' ')[0].toUpperCase()}
            </span>
            <span className="text-xs font-medium tracking-[0.3em] text-gold -mt-1 uppercase">
              {settings.empresa.nome.split(' ').slice(1).join(' ').toUpperCase() || 'Negócios Imobiliários'}
            </span>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-primary-black mb-2 text-center">
            Acesso Administrativo
          </h2>
          <p className="text-gray-500 text-sm text-center">
            Faça login para gerenciar sua imobiliária
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm">
            <ShieldAlert size={20} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {user && !isAdmin ? (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4 text-red-600 text-sm">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Acesso Negado</p>
                <p>O e-mail <strong>{user.email}</strong> não possui permissões administrativas.</p>
              </div>
            </div>
            
            <button
              onClick={() => logout()}
              className="w-full btn-outline-gold !py-4"
            >
              Tentar com outro e-mail
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="w-full bg-primary-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:bg-black/90 active:scale-[0.98] shadow-lg mb-4"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 rounded-sm" />
            Entrar com Google
          </button>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Apenas usuários cadastrados pela diretoria podem acessar este ambiente.
        </p>
      </div>
    </div>
  );
}

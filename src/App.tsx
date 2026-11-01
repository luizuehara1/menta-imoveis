import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import app from './lib/firebase';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Direct imports of primary public pages prevent dynamic module fetch errors
import Home from './pages/public/Home';
import PropertyList from './pages/public/PropertyList';
import PropertyDetail from './pages/public/PropertyDetail';
import About from './pages/public/About';
import Brokers from './pages/public/Brokers';
import Contact from './pages/public/Contact';
import NotFound from './pages/public/NotFound';
import AdminLogin from './pages/admin/Login';

// Safe sessionStorage helper that never throws in sandboxed iframes
const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {}
  }
};

// Resilient dynamic loader with automatic retry on network hiccup or stale dev server chunks
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      console.warn('[lazyWithRetry] Falha ao importar módulo dinâmico, tentando novamente...', error);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        return await factory();
      } catch (retryError: any) {
        const errorMsg = String(retryError);
        const isModuleFetchError = 
          errorMsg.includes('Failed to fetch dynamically imported module') ||
          errorMsg.includes('Importing a module script failed');

        if (isModuleFetchError) {
          const hasReloaded = safeSessionStorage.getItem('lazy_module_retry_reloaded');
          if (!hasReloaded && typeof window !== 'undefined') {
            safeSessionStorage.setItem('lazy_module_retry_reloaded', 'true');
            try {
              window.location.reload();
            } catch {}
          }
        }
        throw retryError;
      }
    }
  });
}

// Lazy load secondary admin management pages to support code splitting with auto-retry
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'));
const AdminPropertyList = lazyWithRetry(() => import('./pages/admin/PropertyList'));
const AdminPropertyForm = lazyWithRetry(() => import('./pages/admin/PropertyForm'));
const AdminVisits = lazyWithRetry(() => import('./pages/admin/Visits'));
const AdminBrokers = lazyWithRetry(() => import('./pages/admin/Brokers'));
const AdminFinance = lazyWithRetry(() => import('./pages/admin/Finance'));
const AdminRents = lazyWithRetry(() => import('./pages/admin/Rents'));
const AdminTemporaryRentals = lazyWithRetry(() => import('./pages/admin/TemporaryRentals'));
const AdminContracts = lazyWithRetry(() => import('./pages/admin/Contracts'));
const AdminContractForm = lazyWithRetry(() => import('./pages/admin/ContractForm'));
const AdminSiteSettings = lazyWithRetry(() => import('./pages/admin/SiteSettings'));
const AdminLeaseSettings = lazyWithRetry(() => import('./pages/admin/LeaseSettings'));
const AdminNeighborhoods = lazyWithRetry(() => import('./pages/admin/Neighborhoods'));
const AdminContractClauses = lazyWithRetry(() => import('./pages/admin/ContractClauses'));

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Erro capturado na aplicação:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0b0b0b] p-6 text-center text-white">
          <div className="max-w-md w-full bg-[#141414] rounded-3xl shadow-2xl border border-white/10 p-8 space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <img src="https://i.postimg.cc/kMZXNdCS/image.png" alt="Menta Imóveis" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white mb-2">Portal Menta Imóveis</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ocorreu uma instabilidade na renderização ou os módulos foram atualizados. Clique abaixo para restabelecer a interface.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="btn-gold !py-3 w-full text-xs uppercase tracking-wider font-black shadow-md cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => {
                  safeSessionStorage.removeItem('lazy_module_retry_reloaded');
                  try {
                    window.location.reload();
                  } catch {
                    window.location.href = '/';
                  }
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="block w-full text-[11px] font-bold text-gold/80 hover:text-gold uppercase tracking-widest pt-2 cursor-pointer"
              >
                Ir para o Início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoadingSpinner: React.FC = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50/50">
    <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="font-display font-medium text-primary-black animate-pulse tracking-widest text-[10px] uppercase text-center">
      Carregando...
    </p>
  </div>
);

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();

  console.log("[AdminRoute] Check:", { loading, user: user?.email, isAdmin });

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-display font-medium text-primary-black animate-pulse tracking-widest text-xs uppercase text-center px-4">Verificando acesso administrativo...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" />;
  }

  if (!isAdmin) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center animate-in fade-in zoom-in duration-300">
           <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
           </div>
           <h1 className="text-2xl font-display font-bold text-primary-black mb-4">Acesso Negado</h1>
           <p className="text-gray-500 leading-relaxed mb-8">
             Seu usuário <strong>{user.email}</strong> não tem permissão para acessar o painel administrativo.
           </p>
           <div className="space-y-4">
             <button 
               onClick={() => logout().then(() => navigate('/admin/login'))}
               className="w-full btn-gold !py-4 shadow-lg shadow-gold/20"
             >
               Sair e Entrar com Outra Conta
             </button>
             <Link to="/" className="block text-sm font-bold text-gray-400 hover:text-primary-black transition-colors uppercase tracking-widest">
               Voltar para o Site
             </Link>
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Router>
      <React.Suspense fallback={<PageLoadingSpinner />}>
        <Routes>
          {/* Public Site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/imoveis" element={<PropertyList />} />
            <Route path="/imovel/:id" element={<PropertyDetail />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/corretores" element={<Brokers />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Dashboard */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="imoveis" element={<AdminPropertyList />} />
            <Route path="imoveis/novo" element={<AdminPropertyForm />} />
            <Route path="imoveis/editar/:id" element={<AdminPropertyForm />} />
            <Route path="visitas" element={<AdminVisits />} />
            <Route path="corretores" element={<AdminBrokers />} />
            <Route path="locacoes" element={<AdminRents />} />
            <Route path="locacao-temporaria" element={<AdminTemporaryRentals />} />
            <Route path="financeiro" element={<AdminFinance />} />
            <Route path="contratos" element={<AdminContracts />} />
            <Route path="contratos/novo" element={<AdminContractForm />} />
            <Route path="contratos/editar/:id" element={<AdminContractForm />} />
            <Route path="propostas/nova" element={<AdminContractForm />} />
            <Route path="propostas/editar/:id" element={<AdminContractForm />} />
            <Route path="configuracoes-locacao" element={<AdminLeaseSettings />} />
            <Route path="bairros" element={<AdminNeighborhoods />} />
            <Route path="clausulas-contrato" element={<AdminContractClauses />} />
            <Route path="configuracoes-site" element={<AdminSiteSettings />} />
          </Route>
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default function App() {
  React.useEffect(() => {
    // DIAGNOSTICS AS REQUESTED BY USER
    if (typeof window !== 'undefined') {
      console.group("%c DIAGNÓSTICO DE AMBIENTE", "color: #E5BC53; font-weight: bold;");
      console.log("DOMÍNIO ATUAL:", window.location.hostname);
      console.log("FIREBASE PROJECT ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
      console.log("FIREBASE AUTH DOMAIN:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
      console.log("FIREBASE APP ID:", import.meta.env.VITE_FIREBASE_APP_ID);
      console.groupEnd();
    }
  }, []);

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

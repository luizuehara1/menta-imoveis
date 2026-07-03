import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import app from './lib/firebase';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Lazy load pages to support code splitting
const Home = React.lazy(() => import('./pages/public/Home'));
const PropertyList = React.lazy(() => import('./pages/public/PropertyList'));
const PropertyDetail = React.lazy(() => import('./pages/public/PropertyDetail'));
const About = React.lazy(() => import('./pages/public/About'));
const Brokers = React.lazy(() => import('./pages/public/Brokers'));
const Contact = React.lazy(() => import('./pages/public/Contact'));
const NotFound = React.lazy(() => import('./pages/public/NotFound'));

const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminPropertyList = React.lazy(() => import('./pages/admin/PropertyList'));
const AdminPropertyForm = React.lazy(() => import('./pages/admin/PropertyForm'));
const AdminVisits = React.lazy(() => import('./pages/admin/Visits'));
const AdminBrokers = React.lazy(() => import('./pages/admin/Brokers'));
const AdminFinance = React.lazy(() => import('./pages/admin/Finance'));
const AdminRents = React.lazy(() => import('./pages/admin/Rents'));
const AdminContracts = React.lazy(() => import('./pages/admin/Contracts'));
const AdminContractForm = React.lazy(() => import('./pages/admin/ContractForm'));
const AdminSiteSettings = React.lazy(() => import('./pages/admin/SiteSettings'));
const AdminLeaseSettings = React.lazy(() => import('./pages/admin/LeaseSettings'));
const AdminNeighborhoods = React.lazy(() => import('./pages/admin/Neighborhoods'));
const AdminContractClauses = React.lazy(() => import('./pages/admin/ContractClauses'));
const AdminLogin = React.lazy(() => import('./pages/admin/Login'));

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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

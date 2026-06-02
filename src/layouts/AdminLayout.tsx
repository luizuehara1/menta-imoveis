import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Home, 
  PlusCircle, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  Settings, 
  Settings2,
  MapPin,
  LogOut,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../components/ui/SafeImage';
import { useSettings } from '../hooks/useSettings';
import { staggerContainer, slideUp, fadeIn } from '../constants/animations';
import { useSEO } from '../hooks/useSEO';

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Imóveis', path: '/admin/imoveis', icon: Home },
    { name: 'Locações', path: '/admin/locacoes', icon: FileText },
    { name: 'Bairros', path: '/admin/bairros', icon: MapPin },
    { name: 'Cadastrar Imóvel', path: '/admin/imoveis/novo', icon: PlusCircle },
    { name: 'Visitas', path: '/admin/visitas', icon: Calendar },
    { name: 'Corretores', path: '/admin/corretores', icon: Users },
    { name: 'Financeiro', path: '/admin/financeiro', icon: DollarSign },
    { name: 'Contratos', path: '/admin/contratos', icon: FileText },
    { name: 'Cláusulas', path: '/admin/clausulas-contrato', icon: Settings2 },
    { name: 'Config. Locação', path: '/admin/configuracoes-locacao', icon: Settings2 },
    { name: 'Aparência Site', path: '/admin/configuracoes-site', icon: Settings },
  ];

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      await logout();
      navigate('/admin/login');
    }
  };

  const { settings } = useSettings();

  return (
    <div className="h-full flex flex-col bg-primary-black text-white w-[300px] shrink-0 overflow-y-auto border-r border-white/5 relative z-[60]">
      <div className="p-10 border-b border-white/5">
        <Link to="/admin" className="flex items-center gap-4 mb-4 group">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -5 }}
            className="bg-primary-black w-14 h-14 flex items-center justify-center rounded-xl shadow-xl transition-all p-2 border border-gold/10"
          >
            <SafeImage 
              src={settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
              alt={settings.empresa.nome} 
              priority
              className="w-full h-full object-contain" 
            />
          </motion.div>
          <div className="flex flex-col items-start">
            <span className="font-display text-2xl font-bold tracking-tighter text-white leading-tight group-hover:text-gold transition-colors">
              MENTA
            </span>
            <span className="text-[10px] font-black tracking-[0.3em] text-white/40 -mt-1 uppercase group-hover:text-white transition-colors">
              ADMIN
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-grow p-8">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <motion.div key={item.path} variants={slideUp}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-4 py-4 px-6 rounded-2xl transition-all duration-500 relative group overflow-hidden ${
                    isActive 
                      ? 'bg-gold text-primary-black font-bold shadow-2xl shadow-gold/20' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gold"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon size={22} className={`relative z-10 transition-transform duration-500 group-hover:scale-110 ${isActive ? 'text-primary-black' : 'text-gray-500 group-hover:text-gold'}`} />
                  <span className="relative z-10 text-sm font-bold tracking-tight">{item.name}</span>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="active-marker" 
                      className="absolute left-0 w-1.5 h-6 bg-primary-black rounded-r-full relative z-10" 
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </nav>

      <div className="p-8 border-t border-white/5 space-y-6">
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
           <p className="text-[10px] font-black uppercase text-gold/60 tracking-widest mb-1">Menta Evolution</p>
           <p className="text-xs text-gray-500 leading-relaxed font-medium">Sistema Premium <span className="text-white">v2.0</span></p>
        </div>
        <Link 
          to="/" 
          target="_blank"
          className="w-full flex items-center gap-4 py-4 px-6 rounded-2xl text-gold hover:bg-gold/10 transition-all font-bold group border border-gold/10"
        >
          <ExternalLink size={22} className="transition-transform group-hover:scale-110" />
          <span className="text-sm">Ver Site</span>
        </Link>

        <motion.button 
          whileHover={{ x: 5 }}
          onClick={handleLogout}
          className="w-full flex items-center gap-4 py-4 px-6 rounded-2xl text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold group"
        >
          <LogOut size={22} className="transition-transform group-hover:scale-110" />
          <span className="text-sm">Finalizar Sessão</span>
        </motion.button>
      </div>
    </div>
  );
};

export default function AdminLayout() {
  useSEO({
    title: "Painel Administrativo | Menta Imóveis",
    description: "Painel de controle administrativo.",
    noIndex: true
  });

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            {...fadeIn}
            className="fixed inset-0 bg-primary-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[110] lg:hidden"
          >
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 shrink-0 sticky top-0 z-40"
        >
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-3 text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="flex flex-col">
              <h2 className="text-lg font-bold font-display text-primary-black tracking-tight">
                Portal Administrativo
              </h2>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sistema Ativo</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              target="_blank"
              className="hidden sm:flex items-center gap-2 bg-primary-black text-gold px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gold/10"
            >
              <ExternalLink size={14} />
              Ver Site
            </Link>

            {/* Desktop User Info */}
            <div className="hidden md:flex items-center gap-4 bg-gray-50/50 p-2 pr-6 rounded-2xl border border-gray-100 group cursor-pointer hover:bg-white hover:shadow-xl hover:scale-105 transition-all">
              <div className="relative">
                {user?.photoURL ? (
                  <SafeImage src={user.photoURL} alt="User" className="w-10 h-10 rounded-xl border border-white shadow-sm object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary-black text-gold flex items-center justify-center font-bold shadow-lg">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 bg-gold rounded-full" />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-black text-primary-black uppercase tracking-tight">{user?.displayName || 'Administrador'}</span>
                <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Gestor Master</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <div className="flex-grow overflow-y-auto p-6 md:p-12">
          <motion.div
             key={location.pathname}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4 }}
             className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}

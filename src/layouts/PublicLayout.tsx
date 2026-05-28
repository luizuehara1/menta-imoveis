import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Phone, MessageCircle, Menu, X, Instagram, Mail, MapPin as MapPinIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../components/ui/SafeImage';
import { useSettings } from '../hooks/useSettings';
import { cleanPhoneForWhatsapp, buildPropertyWhatsAppMessage } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const Navbar = ({ whatsappUrl: customWhatsappUrl }: { whatsappUrl?: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const location = useLocation();
  const { settings } = useSettings();

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Imóveis', path: '/imoveis' },
    { name: 'Sobre', path: '/sobre' },
    { name: 'Corretores', path: '/corretores' },
    { name: 'Contato', path: '/contato' },
  ];
  
  const cleanNumber = cleanPhoneForWhatsapp(settings.empresa.whatsapp);
  const whatsappUrl = customWhatsappUrl || `https://wa.me/55${cleanNumber}`;

  // Analyze active route
  const isPropertyDetailPage = location.pathname.startsWith('/imovel/');
  const isPropertyListPage = location.pathname === '/imoveis' || location.pathname.startsWith('/imoveis/');

  // Determine navbar theme
  let navBgClass = '';
  let logoTitleClass = '';
  let logoSubClass = '';
  let linkClassGetter = (path: string) => '';
  let whatsappButtonClass = '';
  let mobileMenuButtonThemeClass = '';

  if (isPropertyDetailPage) {
    navBgClass = 'bg-white/96 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-b border-gray-150/70 py-3 md:py-4';
    logoTitleClass = 'text-slate-950 font-black';
    logoSubClass = 'text-gold-700 font-extrabold';
    linkClassGetter = (path: string) => 
      location.pathname === path 
        ? 'text-gold' 
        : 'text-slate-800 hover:text-gold';
    whatsappButtonClass = 'bg-[#050505] text-white hover:bg-gold hover:text-primary-black shadow-md font-bold hover:shadow-lg transition-all duration-300';
    mobileMenuButtonThemeClass = 'text-slate-900 bg-slate-100 hover:bg-slate-200';
  } else if (isPropertyListPage) {
    navBgClass = 'bg-[#050505]/82 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] border-b border-white/8 py-3 md:py-4';
    logoTitleClass = 'text-white font-bold';
    logoSubClass = 'text-[#e8c14f] font-bold';
    linkClassGetter = (path: string) => 
      location.pathname === path 
        ? 'text-[#e8c14f]' 
        : 'text-white/95 hover:text-[#e8c14f]';
    whatsappButtonClass = 'bg-white text-[#050505] font-black uppercase tracking-wider hover:bg-[#e8c14f] hover:text-[#050505] shadow-xl hover:-translate-y-0.5 duration-300';
    mobileMenuButtonThemeClass = 'text-white bg-white/10 border border-white/14 hover:bg-white/20';
  } else {
    // Default dynamic behavior
    navBgClass = scrolled 
      ? 'bg-white/90 backdrop-blur-lg shadow-xl py-3 border-b border-gray-100' 
      : 'bg-transparent py-5';
    logoTitleClass = scrolled ? 'text-primary-black font-bold' : 'text-white font-bold';
    logoSubClass = scrolled ? 'text-gold font-bold' : 'text-gold/80 font-semibold';
    linkClassGetter = (path: string) => 
      location.pathname === path 
        ? 'text-gold' 
        : scrolled ? 'text-primary-black hover:text-gold' : 'text-white hover:text-gold';
    whatsappButtonClass = scrolled 
      ? 'bg-primary-black text-white hover:bg-gold shadow-lg font-semibold' 
      : 'bg-white text-primary-black hover:bg-gold shadow-xl font-semibold';
    mobileMenuButtonThemeClass = scrolled ? 'text-primary-black hover:bg-gray-100' : 'text-white hover:bg-white/10';
  }

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${navBgClass}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <div className={`transition-all duration-500 group-hover:scale-105 flex items-center justify-center ${
            isPropertyListPage 
              ? 'bg-black/55 border border-white/10 rounded-2xl h-14 px-3 shadow-xl' 
              : isPropertyDetailPage 
                ? 'bg-[#0b0b0b] rounded-xl h-14 w-14 shadow-md border border-gold/10'
                : 'bg-primary-black rounded-xl h-14 w-14 shadow-2xl border border-gold/10'
          }`}>
            <SafeImage 
              src={settings.aparencia.logoNavbarUrl || settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
              alt={settings.empresa.nome} 
              priority
              className={`${
                isPropertyListPage 
                  ? 'h-10 w-auto max-w-[80px] object-contain'
                  : 'h-10 w-10 object-contain'
              }`} 
            />
          </div>
          <div className={`flex flex-col items-start border-l pl-4 ${isPropertyDetailPage ? 'border-slate-350/40' : 'border-white/20'}`}>
            <span className={`font-display text-2xl font-bold tracking-tighter leading-tight transition-colors ${logoTitleClass}`}>
              {settings.empresa.nome.split(' ')[0].toUpperCase()}
            </span>
            <span className={`text-[9px] font-bold tracking-[0.3em] -mt-1 uppercase transition-colors ${logoSubClass}`}>
              {settings.empresa.nome.split(' ').slice(1).join(' ').toUpperCase() || 'Negócios Imobiliários'}
            </span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-xs font-bold uppercase tracking-widest transition-all relative group ${linkClassGetter(link.path)}`}
            >
              {link.name}
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-gold transition-all duration-300 ${location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
            </Link>
          ))}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all active:scale-95 ${whatsappButtonClass}`}
          >
            <MessageCircle size={18} />
            <span className="text-xs uppercase tracking-widest">WhatsApp</span>
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button className={`md:hidden p-2.5 rounded-xl transition-all ${mobileMenuButtonThemeClass}`} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-primary-black z-[110] md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-primary-black w-12 h-12 flex items-center justify-center rounded-xl shadow-lg border border-gold/10">
                  <SafeImage 
                    src={settings.aparencia.logoNavbarUrl || settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
                    alt={settings.empresa.nome} 
                    priority
                    className="h-8 w-8 object-contain" 
                  />
                </div>
                <span className="font-display text-xl font-bold text-white">{settings.empresa.nome.split(' ')[0].toUpperCase()}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white p-2">
                <X size={32} />
              </button>
            </div>
            <div className="flex flex-col p-10 gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-4xl font-display font-bold transition-colors ${
                    location.pathname === link.path ? 'text-gold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="mt-auto p-10 border-t border-white/5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full !rounded-2xl"
              >
                <MessageCircle size={24} />
                WhatsApp Oficial
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => {
  const { settings } = useSettings();
  const cleanNumber = cleanPhoneForWhatsapp(settings.empresa.whatsapp);
  const whatsappUrl = `https://wa.me/55${cleanNumber}`;

  return (
    <footer className="bg-primary-black text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/10 pb-16">
        <div className="col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-4 mb-8 group">
            <div className="bg-primary-black w-24 h-24 flex items-center justify-center rounded-[2rem] shadow-xl shadow-black/40 group-hover:scale-105 transition-all overflow-hidden p-4 border border-gold/10">
              <SafeImage 
                src={settings.aparencia.logoFooterUrl || settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
                alt={settings.empresa.nome} 
                priority
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="flex flex-col items-start text-white border-l border-white/10 pl-3">
              <span className="font-display text-xl font-bold tracking-tighter leading-tight">
                {settings.empresa.nome.split(' ')[0].toUpperCase()}
              </span>
              <span className="text-[9px] font-medium tracking-[0.2em] text-gold -mt-1 uppercase opacity-80">
                {settings.empresa.nome.split(' ').slice(1).join(' ').toUpperCase() || 'Negócios Imobiliários'}
              </span>
            </div>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {settings.secoes.sobre.texto.substring(0, 150)}...
          </p>
          <p className="text-xs text-gray-500">CRECI: {settings.empresa.creci}</p>
        </div>

        <div>
          <h4 className="font-display text-lg font-bold mb-6 text-gold">Explorar</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><Link to="/imoveis" className="hover:text-white transition-colors">Ver Imóveis</Link></li>
            <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre Nós</Link></li>
            <li><Link to="/corretores" className="hover:text-white transition-colors">Nossos Corretores</Link></li>
            <li><Link to="/contato" className="hover:text-white transition-colors">Contato</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-bold mb-6 text-gold">Contato</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li className="flex items-start gap-3">
              <Phone size={18} className="text-gold shrink-0" />
              <span>{settings.empresa.whatsapp}</span>
            </li>
            <li className="flex items-start gap-3">
              <Mail size={18} className="text-gold shrink-0" />
              <span>{settings.empresa.email}</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPinIcon size={18} className="text-gold shrink-0" />
              <span>{settings.empresa.endereco}, {settings.empresa.cidadeEstado}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-bold mb-6 text-gold">Newsletter</h4>
          <p className="text-sm text-gray-400 mb-4">Receba as melhores oportunidades diretamente no seu e-mail.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="bg-white/5 border border-white/10 rounded-md py-2 px-4 text-sm w-full focus:border-gold outline-none"
            />
            <button className="bg-gold text-primary-black px-4 py-2 rounded-md font-bold text-xs">OK</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <SafeImage 
            src={settings.aparencia.logoFooterUrl || settings.aparencia.logoUrl || "https://i.postimg.cc/kMZXNdCS/image.png"} 
            alt="Menta" 
            priority
            className="h-6 w-auto object-contain opacity-40 grayscale" 
          />
          <p>© {new Date().getFullYear()} {settings.empresa.nome}. Todos os direitos reservados.</p>
        </div>
        <Link to="/admin/login" className="hover:text-gold transition-colors">Acesso Restrito</Link>
      </div>
    </footer>
  );
};

export default function PublicLayout() {
  const { settings } = useSettings();
  const location = useLocation();

  const isPropertyDetailPage = location.pathname.startsWith('/imovel/');
  const pathParts = location.pathname.split('/');
  const propertyId = pathParts[pathParts.length - 1];

  const [activeProperty, setActiveProperty] = React.useState<any>(null);
  const [resolvedBrokerWhatsapp, setResolvedBrokerWhatsapp] = React.useState<string>("");

  React.useEffect(() => {
    if (isPropertyDetailPage && propertyId && propertyId !== "imoveis") {
      const getPropAndBroker = async () => {
        try {
          let p: any = null;
          const docSnap = await getDoc(doc(db, 'imoveis', propertyId));
          if (docSnap.exists()) {
            p = { id: docSnap.id, ...docSnap.data() };
          } else {
            // queries fallback
            const slugQuery = query(collection(db, 'imoveis'), where('slug', '==', propertyId));
            const slugSnap = await getDocs(slugQuery);
            if (!slugSnap.empty) {
              const matchedDoc = slugSnap.docs[0];
              p = { id: matchedDoc.id, ...matchedDoc.data() };
            } else {
              const codeQuery = query(collection(db, 'imoveis'), where('code', '==', propertyId));
              const codeSnap = await getDocs(codeQuery);
              if (!codeSnap.empty) {
                const matchedDoc = codeSnap.docs[0];
                p = { id: matchedDoc.id, ...matchedDoc.data() };
              }
            }
          }

          if (p) {
            setActiveProperty(p);

            // Fetch/Resolve Broker
            // 1. imovel.corretorResponsavel.whatsapp
            if (p.corretorResponsavel?.whatsapp) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.corretorResponsavel.whatsapp));
              return;
            }
            // 2. imovel.corretorResponsavel.telefone
            if (p.corretorResponsavel?.telefone) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.corretorResponsavel.telefone));
              return;
            }
            // Fallbacks
            if (p.brokerWhatsapp) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.brokerWhatsapp));
              return;
            }
            if (p.brokerPhone) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.brokerPhone));
              return;
            }
            if (p.broker?.whatsapp) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.broker.whatsapp));
              return;
            }
            if (p.broker?.telefone) {
              setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(p.broker.telefone));
              return;
            }

            // 3. corretor em corretores/{id}
            const brokerId = p.brokerId || p.corretorId || p.corretorResponsavel?.id || p.broker?.id;
            if (brokerId) {
              try {
                const brokerRef = doc(db, 'corretores', brokerId);
                const brokerSnap = await getDoc(brokerRef);
                if (brokerSnap.exists()) {
                  const brokerData = brokerSnap.data();
                  if (brokerData) {
                    const bPhone = brokerData.whatsapp || brokerData.phone || brokerData.telefone;
                    if (bPhone) {
                      setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(bPhone));
                      return;
                    }
                  }
                }
              } catch (e) {
                console.error("Error fetching broker in layout:", e);
              }
            }
          }
        } catch (e) {
          console.error("Error fetching and resolving layout property:", e);
        }
        
        // Failsafe / 4. WhatsApp da empresa
        setResolvedBrokerWhatsapp(cleanPhoneForWhatsapp(settings?.empresa?.whatsapp || ""));
      };

      getPropAndBroker();
    } else {
      setActiveProperty(null);
      setResolvedBrokerWhatsapp("");
    }
  }, [isPropertyDetailPage, propertyId, settings]);

  const cleanNumber = resolvedBrokerWhatsapp || cleanPhoneForWhatsapp(settings.empresa.whatsapp);
  const p = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
  
  const getWhatsappUrl = () => {
    if (activeProperty) {
      const message = buildPropertyWhatsAppMessage(activeProperty);
      return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/${p}`;
  };

  const whatsappUrl = getWhatsappUrl();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: settings.aparencia.corFundo, color: settings.aparencia.corTexto }}>
      <Navbar whatsappUrl={whatsappUrl} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      
      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 bg-[#25D366] text-white p-4 rounded-full shadow-lg z-50 hover:scale-110 transition-transform active:scale-95"
      >
        <MessageCircle size={32} />
      </a>
    </div>
  );
}

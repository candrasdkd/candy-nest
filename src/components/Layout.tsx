import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  FileText,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
  User,
  WifiOff,
  StickyNote,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearchModal from './GlobalSearchModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { to: '/savings', icon: Wallet, label: 'Pos' },
  { to: '/documents', icon: FileText, label: 'Dokumen' },
  { to: '/notes', icon: StickyNote, label: 'Catatan' },
  { to: '/planning', icon: Sparkles, label: 'Perencanaan' },
  { to: '/settings', icon: Settings, label: 'Pengaturan' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { userProfile, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { confirm, close } = useConfirmStore();
  const { isOnline } = useNetworkStatus();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    confirm({
      title: 'Keluar Aplikasi',
      message: 'Apakah Anda yakin ingin keluar dari akun?',
      confirmText: 'Keluar',
      variant: 'danger',
      onConfirm: async () => {
        await logout();
        close();
        navigate('/login');
      }
    });
  }

  const DesktopSidebar = () => (
    <aside className="flex flex-col h-full bg-sage-900 text-cream-100 shadow-[8px_0_32px_rgba(0,0,0,0.1)]">
      {/* Logo */}
      <div className="px-8 py-12 border-b border-sage-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-0.5 shadow-lg shadow-black/20 overflow-hidden">
            <img src="/logo.png" alt="CandyNest Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-tight text-white leading-none">CandyNest</h1>
            <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest mt-1">Family Hub</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <div className="px-4 py-6 border-b border-sage-800 space-y-4">
        <div className="p-4 rounded-[1.5rem] bg-sage-800/40 border border-sage-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-sage-800 border border-sage-700">
            <img
              src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${userProfile?.displayName || 'user'}`}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{userProfile?.displayName}</p>
            <p className="text-sage-400 text-[10px] font-bold uppercase tracking-wider">Online</p>
          </div>
        </div>

        {/* Spotlight Search Visual Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-sage-800/30 hover:bg-sage-800/70 border border-sage-800/60 text-sage-400 hover:text-white rounded-[1.25rem] text-xs font-bold transition-all group active:scale-95"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-sage-500 group-hover:text-rose-400 transition-colors" />
            <span>Cari apa saja...</span>
          </div>
          <kbd className="bg-sage-800/80 border border-sage-700/50 px-1.5 py-0.5 rounded text-[8px] font-black text-sage-500 group-hover:text-rose-300 transition-colors select-none">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all duration-300 relative group ${isActive
                ? 'text-white'
                : 'text-sage-400 hover:text-white hover:bg-sage-800/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-sage-800 rounded-2xl border border-sage-700 -z-10 shadow-lg shadow-black/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-rose-400' : 'text-sage-500 group-hover:text-sage-300'}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-sage-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm text-sage-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all w-full group"
        >
          <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          Keluar
        </button>
      </div>
    </aside>
  );

  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-2xl border-t border-sage-100 px-2 flex items-center justify-around z-[100] pb-[env(safe-area-inset-bottom)]">
      {navItems.slice(0, 4).map(({ to, icon: Icon, label }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1.5 relative group min-w-[52px]"
          >
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-sage-900 text-white shadow-lg shadow-sage-900/20' : 'text-sage-300'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-sage-900' : 'text-sage-300'}`}>
              {label === 'Dashboard' ? 'Home' : label}
            </span>
          </NavLink>
        );
      })}
      
      {/* Menu Trigger for Mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex flex-col items-center justify-center gap-1.5 relative group min-w-[52px]"
      >
        <div className={`p-2.5 rounded-xl transition-all duration-300 ${mobileOpen ? 'bg-sage-900 text-white shadow-lg shadow-sage-900/20' : 'text-sage-300'}`}>
          <Menu className="w-4 h-4" />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${mobileOpen ? 'text-sage-900' : 'text-sage-300'}`}>
          Menu
        </span>
      </button>
    </nav>
  );

  return (
    <div className="flex h-[100dvh] bg-sage-50/30 font-body overflow-hidden">
      {/* Desktop Sidebar & Mobile Drawer Overlay */}
      <div className="hidden md:flex md:w-64 lg:w-72 flex-shrink-0">
        <DesktopSidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[110] md:hidden flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sage-950/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full bg-white rounded-t-[3rem] p-8 pb-12 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] border-t border-sage-100"
            >
              {/* Handle */}
              <div className="w-12 h-1.5 bg-sage-200 rounded-full mx-auto mb-10" />
              
              <div className="grid grid-cols-4 gap-y-10">
                {navItems.slice(4).filter(item => item.to !== '/settings').map(({ to, icon: Icon, label }) => (
                  <button
                    key={to}
                    onClick={() => {
                      navigate(to);
                      setMobileOpen(false);
                    }}
                    className="flex flex-col items-center gap-3 group outline-none"
                  >
                    <motion.div 
                      whileTap={{ scale: 0.9 }}
                      className="w-16 h-16 rounded-full bg-sage-50 flex items-center justify-center text-sage-600 shadow-[0_8px_20px_rgba(0,0,0,0.04)] border border-sage-100 group-active:bg-sage-100 transition-colors"
                    >
                      <Icon className="w-7 h-7" />
                    </motion.div>
                    <span className="text-[11px] font-bold text-sage-600 tracking-tight text-center">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden h-16 bg-white/80 backdrop-blur-md border-b border-sage-100 px-4 flex items-center justify-between sticky top-0 z-[90]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-sm border border-sage-100 overflow-hidden">
              <img src="/logo.png" alt="CandyNest Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-display text-base text-sage-900 leading-none">CandyNest</h1>
              <p className="text-[7px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Family Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center border border-sage-100 text-sage-600 active:scale-95 transition-transform"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center border border-sage-100 overflow-hidden active:scale-95 transition-transform"
            >
              <img
                src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${userProfile?.displayName || 'user'}`}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 text-rose-500 active:scale-95 transition-transform"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          {/* Offline Banner */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-rose-500 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold">
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                  <span>Kamu sedang offline — data baru tidak akan tersimpan</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

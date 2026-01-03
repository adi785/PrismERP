
import React, { useState, useEffect, ErrorInfo, ReactNode, Component, FC } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  BookOpen, 
  PlusCircle, 
  Search,
  ChevronRight,
  Building2,
  BrainCircuit,
  Loader2,
  Plus,
  ChevronDown,
  LogOut,
  UserCircle,
  RefreshCw,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  ShoppingCart,
  BarChart3,
  Menu,
  X,
  Command,
  Scale,
  UploadCloud,
  TrendingUp,
  Database,
  Code2,
  Copy,
  Check,
  RotateCcw,
  Moon,
  Sun,
  Calendar
} from 'lucide-react';
import { useERPStore } from './store/useERPStore';
import Dashboard from './components/Dashboard';
import LedgerList from './components/LedgerList';
import StockList from './components/StockList';
import VoucherEntry from './components/VoucherEntry';
import DayBook from './components/DayBook';
import AIAnalyst from './components/AIAnalyst';
import Auth from './components/Auth';
import Billing from './components/Billing';
import Purchases from './components/Purchases';
import Reports from './components/Reports';
import StockAdjustment from './components/StockAdjustment';
import TaxCenter from './components/TaxCenter';
import CommandPalette from './components/CommandPalette';
import ImportCenter from './components/ImportCenter';
import FloatingAssistant from './components/FloatingAssistant';
import ProductReturns from './components/ProductReturns';

type View = 'dashboard' | 'ledgers' | 'stock' | 'vouchers' | 'daybook' | 'ai' | 'billing' | 'purchases' | 'returns' | 'reports' | 'stock-adjustment' | 'tax-center' | 'import-center';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ERP UI Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const isDbError = this.state.error?.message.includes("Database tables not found");
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center font-inter">
          <div className={`w-16 h-16 md:w-20 md:h-20 ${isDbError ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'} rounded-3xl flex items-center justify-center mb-6 shadow-xl animate-bounce`}>
            {isDbError ? <Database size={32} /> : <AlertTriangle size={32} />}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            {isDbError ? 'Database Setup Required' : 'Component Failure'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md font-medium text-sm md:text-base leading-relaxed">
            {isDbError 
              ? "The Supabase backend is connected, but the internal accounting tables haven't been created yet." 
              : "A critical module in the ERP suite has encountered an unexpected runtime error."}
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-xl">
              Restart Suite
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: FC = () => {
  const store = useERPStore();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  if (store.loading && !store.user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 gap-6">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-2xl animate-bounce">P</div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em]">Securing Connection...</p>
      </div>
    );
  }

  if (!store.user || !store.company) {
    return <Auth store={store} />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard store={store} />;
      case 'ledgers': return <LedgerList store={store} />;
      case 'stock': return <StockList store={store} />;
      case 'stock-adjustment': return <StockAdjustment store={store} onComplete={() => setCurrentView('stock')} />;
      case 'vouchers': return <VoucherEntry store={store} onComplete={() => setCurrentView('daybook')} />;
      case 'daybook': return <DayBook store={store} />;
      case 'billing': return <Billing store={store} onComplete={() => setCurrentView('daybook')} />;
      case 'purchases': return <Purchases store={store} onComplete={() => setCurrentView('daybook')} />;
      case 'returns': return <ProductReturns store={store} onComplete={() => setCurrentView('daybook')} />;
      case 'reports': return <Reports store={store} />;
      case 'tax-center': return <TaxCenter store={store} />;
      case 'import-center': return <ImportCenter store={store} onComplete={() => setCurrentView('ledgers')} />;
      case 'ai': return <AIAnalyst store={store} />;
      default: return <Dashboard store={store} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-inter text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {isCommandPaletteOpen && <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} setView={setCurrentView} store={store} />}
        
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 w-72 lg:w-64 bg-slate-900 dark:bg-slate-900 text-slate-300 flex flex-col shadow-xl z-50 transition-transform duration-300 no-print
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">P</div>
              <span className="text-xl font-bold text-white tracking-tight">Prism<span className="text-blue-500">ERP</span></span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-white"><X size={20} /></button>
          </div>

          <nav className="flex-1 py-6 overflow-y-auto px-4 space-y-1 custom-scrollbar">
            <NavGroup label="General">
              <NavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            </NavGroup>
            <NavGroup label="Operations">
              <NavItem active={currentView === 'billing'} onClick={() => setCurrentView('billing')} icon={<Receipt size={18} />} label="Sales Invoicing" />
              <NavItem active={currentView === 'purchases'} onClick={() => setCurrentView('purchases')} icon={<ShoppingCart size={18} />} label="Purchase Bills" />
              <NavItem active={currentView === 'returns'} onClick={() => setCurrentView('returns'} icon={<RotateCcw size={18} />} label="Returns" />
            </NavGroup>
            <NavGroup label="Compliance">
              <NavItem active={currentView === 'tax-center'} onClick={() => setCurrentView('tax-center')} icon={<Scale size={18} />} label="Tax Center" />
              <NavItem active={currentView === 'reports'} onClick={() => setCurrentView('reports')} icon={<BarChart3 size={18} />} label="Financials" />
              <NavItem active={currentView === 'daybook'} onClick={() => setCurrentView('daybook')} icon={<FileText size={18} />} label="Day Book" />
            </NavGroup>
            <NavGroup label="Master Data">
              <NavItem active={currentView === 'ledgers'} onClick={() => setCurrentView('ledgers')} icon={<BookOpen size={18} />} label="Ledgers" />
              <NavItem active={currentView === 'stock'} onClick={() => setCurrentView('stock')} icon={<Package size={18} />} label="Inventory" />
            </NavGroup>
            <NavGroup label="Tools">
              <NavItem active={currentView === 'vouchers'} onClick={() => setCurrentView('vouchers')} icon={<PlusCircle size={18} />} label="Voucher Entry" />
              <NavItem active={currentView === 'ai'} onClick={() => setCurrentView('ai')} icon={<BrainCircuit size={18} />} label="AI Analyst" />
            </NavGroup>
          </nav>

          <div className="p-4 bg-slate-950/50 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl cursor-pointer relative" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/20"><UserCircle size={20} className="text-blue-400" /></div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{store.user.name}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{store.user.role}</p>
              </div>
              {showUserMenu && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl p-2 animate-in slide-in-from-bottom-2 duration-200 z-[100]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); store.toggleTheme(); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700/50 rounded-lg mb-1 transition-colors"
                  >
                    {store.theme === 'light' ? <><Moon size={14} className="text-blue-400" /> Dark Mode</> : <><Sun size={14} className="text-amber-400" /> Light Mode</>}
                  </button>
                  <div className="h-px bg-slate-700 my-1 mx-2 opacity-50"></div>
                  <button onClick={() => store.logout()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg"><LogOut size={14} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 z-30 shrink-0 shadow-sm no-print">
            <div className="flex items-center gap-3 md:gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Menu size={24} /></button>
              <div className="hidden sm:flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                <Building2 size={18} className="text-blue-500" />
                <span className="truncate max-w-[100px] md:max-w-none">{store.company.name}</span>
              </div>
              
              <div className="relative">
                <button onClick={() => setShowQuickActions(!showQuickActions)} className="p-2 md:px-3 md:py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                  <Plus size={16} /> <span className="hidden sm:inline">New</span>
                </button>
                {showQuickActions && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2 z-[60] animate-in slide-in-from-top-2">
                    <QuickActionItem onClick={() => { setCurrentView('billing'); setShowQuickActions(false); }} label="Sales Invoice" icon={<Receipt size={14} />} />
                    <QuickActionItem onClick={() => { setCurrentView('purchases'); setShowQuickActions(false); }} label="Purchase Record" icon={<ShoppingCart size={14} />} />
                    <QuickActionItem onClick={() => { setCurrentView('vouchers'); setShowQuickActions(false); }} label="Manual Voucher" icon={<FileText size={14} />} />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group">
                <Calendar size={14} className="text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-blue-400 transition-colors leading-none mb-0.5">Fin Year</span>
                  <span className="text-xs font-bold tracking-tight">{store.company.financialYear}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </div>

              <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center p-2 md:px-4 md:py-2 bg-slate-50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-800 text-slate-400 rounded-xl text-sm transition-all group border border-slate-200 dark:border-slate-800 max-w-xs flex-1 shadow-inner">
                <Search size={18} className="group-hover:text-blue-500 shrink-0 transition-colors" />
                <span className="hidden md:inline font-bold ml-2 mr-6 truncate text-slate-400 dark:text-slate-500">Search (⌘K)</span>
              </button>
              
              <div className="hidden md:flex items-center gap-4 border-l pl-4 border-slate-200 dark:border-slate-800">
                 {store.isSyncing && <RefreshCw className="animate-spin text-blue-500" size={16} />}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar erp-main-content">
            {renderView()}
          </div>
          <FloatingAssistant store={store} />
        </main>
      </div>
    </ErrorBoundary>
  );
};

const NavGroup = ({ label, children }: { label: string, children?: ReactNode }) => (
  <div className="mb-4">
    <p className="px-2 pb-2 text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">{label}</p>
    <div className="space-y-1">{children}</div>
  </div>
);

const NavItem: FC<{ active: boolean, label: string, icon: ReactNode, onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>{icon}</span>
    <span className="flex-1 text-left truncate">{label}</span>
    {active && <ChevronRight size={14} className="opacity-50" />}
  </button>
);

const QuickActionItem: FC<{ onClick: () => void, label: string, icon: ReactNode }> = ({ onClick, label, icon }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-left transition-colors">{icon}{label}</button>
);

export default App;

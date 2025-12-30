
import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
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
  SlidersHorizontal,
  Command,
  Scale,
  UploadCloud,
  TrendingUp,
  Database,
  Code2,
  Copy,
  Check,
  RotateCcw
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

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
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
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-10 text-center font-inter">
          <div className={`w-20 h-20 ${isDbError ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'} rounded-3xl flex items-center justify-center mb-6 shadow-xl animate-bounce`}>
            {isDbError ? <Database size={40} /> : <AlertTriangle size={40} />}
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            {isDbError ? 'Database Setup Required' : 'Component Failure'}
          </h1>
          <p className="text-slate-500 mb-8 max-w-md font-medium leading-relaxed">
            {isDbError 
              ? "The Supabase backend is connected, but the internal accounting tables haven't been created yet." 
              : "A critical module in the ERP suite has encountered an unexpected runtime error."}
          </p>
          
          {isDbError ? (
            <DbSetupHelper />
          ) : (
            <div className="bg-slate-900 p-6 rounded-2xl text-left font-mono text-xs text-blue-400 mb-8 max-w-2xl overflow-auto border border-white/10 shadow-2xl">
              {this.state.error?.toString()}
            </div>
          )}
          
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
              Restart Suite
            </button>
            {isDbError && (
              <button 
                onClick={() => {
                  localStorage.setItem('prism_erp_force_local', 'true');
                  window.location.reload();
                }}
                className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
              >
                Switch to Local Mode
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DbSetupHelper = () => {
  const [copied, setCopied] = useState(false);
  const sql = `-- PRISMERP SQL SCHEMA
CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, name TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS public.companies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), name TEXT NOT NULL, gstin TEXT, financial_year TEXT, address TEXT, owner_id UUID REFERENCES auth.users(id));
CREATE TABLE IF NOT EXISTS public.ledgers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID REFERENCES companies(id) ON DELETE CASCADE, name TEXT NOT NULL, "group" TEXT NOT NULL, type TEXT NOT NULL, opening_balance DECIMAL DEFAULT 0, current_balance DECIMAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.stock_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID REFERENCES companies(id) ON DELETE CASCADE, name TEXT NOT NULL, sku TEXT NOT NULL, hsn TEXT, unit TEXT DEFAULT 'Nos', opening_stock DECIMAL DEFAULT 0, current_stock DECIMAL DEFAULT 0, purchase_price DECIMAL DEFAULT 0, sale_price DECIMAL DEFAULT 0, gst_rate DECIMAL DEFAULT 18);
CREATE TABLE IF NOT EXISTS public.vouchers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID REFERENCES companies(id) ON DELETE CASCADE, number TEXT NOT NULL, date DATE NOT NULL, type TEXT NOT NULL, narration TEXT, total_amount DECIMAL DEFAULT 0, gst_total DECIMAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.voucher_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE, ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE, debit DECIMAL DEFAULT 0, credit DECIMAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.inventory_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE, item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE, quantity DECIMAL NOT NULL, rate DECIMAL, amount DECIMAL, type TEXT);`;

  const copy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 mb-8 w-full max-w-2xl text-left shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-xs">
          <Code2 size={16} className="text-blue-600" />
          Setup SQL Script
        </div>
        <button 
          onClick={copy}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all"
        >
          {copied ? <><Check size={14} className="text-emerald-500" /> Copied</> : <><Copy size={14} /> Copy SQL</>}
        </button>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl font-mono text-[10px] text-slate-600 max-h-48 overflow-y-auto border border-slate-100 leading-relaxed">
        {sql}
      </div>
      <p className="mt-4 text-[10px] font-medium text-slate-400">
        Copy this code and paste it into the <strong>SQL Editor</strong> in your Supabase dashboard, then click "Run".
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const store = useERPStore();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (store.loading && !store.user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 gap-6">
        <div className="relative">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-2xl animate-bounce">P</div>
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg tracking-tight">PrismERP</h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] mt-1">Securing Connection...</p>
        </div>
      </div>
    );
  }

  if (!store.user || !store.company) {
    return <Auth store={store} />;
  }

  const role = store.user.role;

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
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-inter">
        {isCommandPaletteOpen && <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} setView={setCurrentView} store={store} />}
        
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 no-print">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">P</div>
            <span className="text-xl font-bold text-white tracking-tight">Prism<span className="text-blue-500">ERP</span></span>
          </div>

          <nav className="flex-1 py-6 overflow-y-auto px-4 space-y-1">
            <p className="px-2 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">General</p>
            <NavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            
            <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Operations</p>
            <NavItem active={currentView === 'billing'} onClick={() => setCurrentView('billing')} icon={<Receipt size={18} />} label="Sales Invoicing" />
            <NavItem active={currentView === 'purchases'} onClick={() => setCurrentView('purchases')} icon={<ShoppingCart size={18} />} label="Purchase Bills" />
            <NavItem active={currentView === 'returns'} onClick={() => setCurrentView('returns')} icon={<RotateCcw size={18} />} label="Returns & Notes" />
            
            <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Compliance</p>
            <NavItem active={currentView === 'tax-center'} onClick={() => setCurrentView('tax-center')} icon={<Scale size={18} />} label="Tax Center" />
            <NavItem active={currentView === 'reports'} onClick={() => setCurrentView('reports')} icon={<BarChart3 size={18} />} label="Financials" />
            <NavItem active={currentView === 'daybook'} onClick={() => setCurrentView('daybook')} icon={<FileText size={18} />} label="Day Book" />

            <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Master Data</p>
            <NavItem active={currentView === 'ledgers'} onClick={() => setCurrentView('ledgers')} icon={<BookOpen size={18} />} label="Ledgers" />
            <NavItem active={currentView === 'stock'} onClick={() => setCurrentView('stock')} icon={<Package size={18} />} label="Inventory" />
            <NavItem active={currentView === 'import-center'} onClick={() => setCurrentView('import-center')} icon={<UploadCloud size={18} />} label="Bulk Import" />
            
            <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tools</p>
            <NavItem active={currentView === 'vouchers'} onClick={() => setCurrentView('vouchers')} icon={<PlusCircle size={18} />} label="Voucher Entry" />
            <NavItem active={currentView === 'ai'} onClick={() => setCurrentView('ai')} icon={<BrainCircuit size={18} />} label="AI Analyst" />
          </nav>

          <div className="p-4 bg-slate-950/50">
            <div className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors relative" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/20"><UserCircle size={20} className="text-blue-400" /></div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5"><p className="text-sm font-bold text-white truncate">{store.user.name}</p>{role === 'Admin' && <ShieldCheck size={12} className="text-amber-500" />}</div>
                <p className="text-[10px] text-slate-500 truncate font-mono uppercase tracking-tighter">{role}</p>
              </div>
              {showUserMenu && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl p-2 animate-in slide-in-from-bottom-2 duration-200">
                  <button onClick={() => store.logout()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><LogOut size={14} /> Exit Session</button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shrink-0 shadow-sm no-print">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-blue-500" />{store.company.name}</h2>
              <div className="relative">
                <button onClick={() => setShowQuickActions(!showQuickActions)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"><Plus size={14} /> Quick Create <ChevronDown size={12} /></button>
                {showQuickActions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      <QuickActionItem onClick={() => { setCurrentView('billing'); setShowQuickActions(false); }} label="New Invoice" icon={<Receipt size={14} />} />
                      <QuickActionItem onClick={() => { setCurrentView('purchases'); setShowQuickActions(false); }} label="Record Bill" icon={<ShoppingCart size={14} />} />
                      <QuickActionItem onClick={() => { setCurrentView('vouchers'); setShowQuickActions(false); }} label="Record Voucher" icon={<PlusCircle size={14} />} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-400 rounded-xl text-sm transition-all group border border-slate-200/50">
                <Search size={16} className="group-hover:text-blue-500 transition-colors" />
                <span className="font-medium mr-10">Search anything...</span>
                <div className="flex items-center gap-1 opacity-60"><Command size={12} /><span className="text-[10px] font-bold">K</span></div>
              </button>
              <div className="flex items-center gap-4 border-l pl-6 border-slate-200">
                 <div className="text-right"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Financial Period</p><p className="text-xs font-bold text-slate-700">01-APR-24 to 31-MAR-25</p></div>
                 {store.isSyncing && <RefreshCw className="animate-spin text-blue-500" size={16} />}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar erp-main-content">{renderView()}</div>
          
          {/* Floating AI Assistant Integration */}
          <FloatingAssistant store={store} />
        </main>
      </div>
    </ErrorBoundary>
  );
};

const QuickActionItem: React.FC<{ onClick: () => void, label: string, icon: React.ReactNode }> = ({ onClick, label, icon }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all">{icon}{label}</button>
);

const NavItem: React.FC<{ active: boolean, label: string, icon: React.ReactNode, onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>{icon}</span>{label}{active && <ChevronRight size={14} className="ml-auto opacity-50" />}</button>
);

export default App;

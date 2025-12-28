
import React, { useState } from 'react';
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
  UserCircle
} from 'lucide-react';
import { useERPStore } from './store/useERPStore';
import Dashboard from './components/Dashboard';
import LedgerList from './components/LedgerList';
import StockList from './components/StockList';
import VoucherEntry from './components/VoucherEntry';
import DayBook from './components/DayBook';
import AIAnalyst from './components/AIAnalyst';
import Auth from './components/Auth';

type View = 'dashboard' | 'ledgers' | 'stock' | 'vouchers' | 'daybook' | 'ai';

const App: React.FC = () => {
  const store = useERPStore();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (store.loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium animate-pulse tracking-tight">Accessing Secure Vault...</p>
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
      case 'vouchers': return <VoucherEntry store={store} onComplete={() => setCurrentView('daybook')} />;
      case 'daybook': return <DayBook store={store} />;
      case 'ai': return <AIAnalyst store={store} />;
      default: return <Dashboard store={store} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-inter">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">P</div>
          <span className="text-xl font-bold text-white tracking-tight">Prism<span className="text-blue-500">ERP</span></span>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto px-4 space-y-1">
          <p className="px-2 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Navigation</p>
          <NavItem active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={18} />} label="Gateway of ERP" />
          
          <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Master Data</p>
          <NavItem active={currentView === 'ledgers'} onClick={() => setCurrentView('ledgers')} icon={<BookOpen size={18} />} label="Chart of Accounts" />
          <NavItem active={currentView === 'stock'} onClick={() => setCurrentView('stock')} icon={<Package size={18} />} label="Inventory" />
          
          <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Transactions</p>
          <NavItem active={currentView === 'vouchers'} onClick={() => setCurrentView('vouchers')} icon={<PlusCircle size={18} />} label="Voucher Entry" />
          <NavItem active={currentView === 'daybook'} onClick={() => setCurrentView('daybook')} icon={<FileText size={18} />} label="Day Book" />
          
          <p className="px-2 pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Advanced</p>
          <NavItem active={currentView === 'ai'} onClick={() => setCurrentView('ai')} icon={<BrainCircuit size={18} />} label="AI Auditor" />
        </nav>

        <div className="p-4 bg-slate-950/50">
          <div 
            className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors relative"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/20">
              <UserCircle size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{store.user.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono uppercase tracking-tighter">FY {store.company.financialYear}</p>
            </div>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl p-2 animate-in slide-in-from-bottom-2 duration-200">
                <button 
                  onClick={() => store.logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut size={14} /> Exit Session
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-30 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={20} className="text-blue-500" />
              {store.company.name}
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Live</span>
            </h2>
            <div className="relative">
              <button 
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                <Plus size={14} /> Quick Create <ChevronDown size={12} />
              </button>
              {showQuickActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    <QuickActionItem onClick={() => { setCurrentView('vouchers'); setShowQuickActions(false); }} label="Record Voucher" icon={<PlusCircle size={14} />} />
                    <QuickActionItem onClick={() => { setCurrentView('ledgers'); setShowQuickActions(false); }} label="Create Ledger" icon={<BookOpen size={14} />} />
                    <QuickActionItem onClick={() => { setCurrentView('stock'); setShowQuickActions(false); }} label="New Stock Item" icon={<Package size={14} />} />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Find ledger, voucher, item..." 
                className="bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm w-72 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-4 border-l pl-6 border-slate-200">
               <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Financial Period</p>
                <p className="text-xs font-bold text-slate-700">01-APR-24 to 31-MAR-25</p>
               </div>
               {store.loading && <Loader2 className="animate-spin text-blue-500" size={16} />}
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const QuickActionItem: React.FC<{ onClick: () => void, label: string, icon: React.ReactNode }> = ({ onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
  >
    {icon}
    {label}
  </button>
);

const NavItem: React.FC<{ active: boolean, label: string, icon: React.ReactNode, onClick: () => void }> = ({ active, label, icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
      active 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>{icon}</span>
    {label}
    {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
  </button>
);

export default App;

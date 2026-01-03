
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Command, ArrowRight, BookOpen, Package, Receipt, Plus, BarChart3, Calculator, BrainCircuit, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: any) => void;
  store: any;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, setView, store }) => {
  const [search, setSearch] = useState('');

  const commands = useMemo(() => [
    { id: 'v-dash', label: 'Go to Dashboard', icon: <BarChart3 size={16} />, action: () => setView('dashboard') },
    { id: 'v-bill', label: 'New Sales Invoice', icon: <Receipt size={16} />, action: () => setView('billing') },
    { id: 'v-purch', label: 'Record Purchase Bill', icon: <Plus size={16} />, action: () => setView('purchases') },
    { id: 'v-ledg', label: 'View Chart of Accounts', icon: <BookOpen size={16} />, action: () => setView('ledgers') },
    { id: 'v-stock', label: 'Open Inventory Master', icon: <Package size={16} />, action: () => setView('stock') },
    { id: 'v-tax', label: 'Open Tax Center', icon: <Calculator size={16} />, action: () => setView('tax-center') },
    { id: 'v-ai', label: 'Talk to AI Analyst', icon: <BrainCircuit size={16} />, action: () => setView('ai') },
  ], [setView]);

  const ledgerSearch = useMemo(() => 
    store.ledgers.map((l: any) => ({
      id: `l-${l.id}`,
      label: `View Ledger: ${l.name}`,
      icon: <BookOpen size={16} />,
      action: () => { /* Logic to open specific ledger could go here */ setView('ledgers'); }
    }))
  , [store.ledgers, setView]);

  const filteredItems = useMemo(() => {
    const all = [...commands, ...ledgerSearch];
    if (!search) return all.slice(0, 8);
    return all.filter(i => i.label.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  }, [commands, ledgerSearch, search]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 no-print">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/40 shadow-inner">
          <Search className="text-slate-400 group-focus-within:text-blue-500" size={24} />
          <input 
            autoFocus
            type="text" 
            placeholder="Search ledgers, commands, or reports..."
            className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-3 max-h-[400px] overflow-y-auto">
          {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
            <button 
              key={item.id}
              onClick={() => { item.action(); onClose(); }}
              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group text-left mb-1"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white/20 group-hover:text-white text-slate-400 transition-colors">
                  {item.icon}
                </div>
                <span className="font-bold text-sm tracking-tight text-slate-700 dark:text-slate-300 group-hover:text-white">{item.label}</span>
              </div>
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white" />
            </button>
          )) : (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No matching results found</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                    <Command size={10} /> <span>K</span>
                  </div>
                  <span>Global Search</span>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-700 ml-2">
                    <span>ESC</span>
                  </div>
                  <span>Close</span>
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Prism Intelligence Engine</p>
           </div>
           
           <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <ShortcutBadge label="Alt+D" action="Dash" />
              <ShortcutBadge label="Alt+S" action="Sales" />
              <ShortcutBadge label="Alt+P" action="Purch" />
              <ShortcutBadge label="Alt+I" action="Stock" />
              <ShortcutBadge label="Alt+L" action="Ledger" />
              <ShortcutBadge label="Alt+B" action="DayBook" />
           </div>
        </div>
      </div>
    </div>
  );
};

const ShortcutBadge: React.FC<{ label: string, action: string }> = ({ label, action }) => (
  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{label}</span>
    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{action}</span>
  </div>
);

export default CommandPalette;

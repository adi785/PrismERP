
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Filter, Download, MoreVertical, Wallet, Landmark, Users, Briefcase, X, ArrowLeft, Printer, FileSpreadsheet, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Ledger, AccountType, Voucher } from '../types';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const LedgerList: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ledger, direction: 'asc' | 'desc' } | null>(null);
  // Fix: Added missing isModalOpen state to resolve reference error in "New Ledger" button.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ name: '', group: '', type: 'Asset' as AccountType, openingBalance: 0 });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: keyof Ledger) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredLedgers = useMemo(() => {
    let items = store.ledgers.filter((l: Ledger) => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortConfig) {
      items = [...items].sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [store.ledgers, searchTerm, sortConfig]);

  const selectedLedger = useMemo(() => store.ledgers.find((l: Ledger) => l.id === selectedLedgerId), [selectedLedgerId, store.ledgers]);

  const ledgerTransactions = useMemo(() => {
    if (!selectedLedgerId) return [];
    let runningBalance = selectedLedger?.openingBalance || 0;
    const history: any[] = [{ date: 'Opening', type: '-', number: '-', narration: 'Balance B/F', debit: 0, credit: 0, balance: runningBalance }];
    [...store.vouchers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((v: Voucher) => {
      const entry = v.entries.find(e => e.ledgerId === selectedLedgerId);
      if (entry) {
        let change = entry.debit - entry.credit;
        if (selectedLedger && ['Liability', 'Income', 'Equity'].includes(selectedLedger.type)) change = entry.credit - entry.debit;
        runningBalance += change;
        history.push({ date: v.date, type: v.type, number: v.number, narration: v.narration, debit: entry.debit, credit: entry.credit, balance: runningBalance });
      }
    });
    return history.reverse();
  }, [selectedLedgerId, store.vouchers, selectedLedger]);

  if (selectedLedger) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button onClick={() => setSelectedLedgerId(null)} className="p-2.5 md:p-3 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl text-slate-500 border border-slate-200 dark:border-slate-700 no-print hover:bg-slate-50 dark:hover:bg-slate-700 w-fit transition-all"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-black dark:text-white text-slate-900">{selectedLedger.name}</h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedLedger.group} • {selectedLedger.type}</p>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={() => downloadCSV(ledgerTransactions, `Ledger_${selectedLedger.name}`)} className="px-3 md:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs dark:text-slate-300">CSV</button>
            <button onClick={triggerPrint} className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-lg md:rounded-xl font-bold text-[10px] md:text-xs shadow-xl">Print Statement</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 md:px-8 py-4 md:py-5">Date</th>
                  <th className="px-4 md:px-6 py-4 md:py-5">Particulars</th>
                  <th className="px-4 md:px-6 py-4 md:py-5 text-right">Debit (₹)</th>
                  <th className="px-4 md:px-6 py-4 md:py-5 text-right">Credit (₹)</th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledgerTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 md:px-8 py-4 md:py-5 text-xs md:text-sm font-bold whitespace-nowrap text-slate-700 dark:text-slate-300">{tx.date}</td>
                    <td className="px-4 md:px-6 py-4 md:py-5 text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px] font-medium">{tx.narration}</td>
                    <td className="px-4 md:px-6 py-4 md:py-5 text-right font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                    <td className="px-4 md:px-6 py-4 md:py-5 text-right font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                    <td className="px-6 md:px-8 py-4 md:py-5 text-right font-mono font-black text-xs md:text-sm text-slate-900 dark:text-white whitespace-nowrap">₹{Math.abs(tx.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Chart of Accounts</h2>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Master Ledger Inventory</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <Plus size={16} /> New Ledger
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Filter by name or group..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner" />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <SortHeader label="Account Name" active={sortConfig?.key === 'name'} dir={sortConfig?.direction} onClick={() => handleSort('name')} />
                <SortHeader label="Account Group" active={sortConfig?.key === 'group'} dir={sortConfig?.direction} onClick={() => handleSort('group')} />
                <SortHeader label="Class" active={sortConfig?.key === 'type'} dir={sortConfig?.direction} onClick={() => handleSort('type')} />
                <SortHeader label="Current Balance" active={sortConfig?.key === 'currentBalance'} dir={sortConfig?.direction} onClick={() => handleSort('currentBalance')} className="text-right" />
                <th className="px-8 py-5 no-print w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLedgers.map((l: Ledger) => (
                <tr key={l.id} onClick={() => setSelectedLedgerId(l.id)} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-colors">
                  <td className="px-8 py-5 font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">{l.name}</td>
                  <td className="px-6 py-5"><span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter whitespace-nowrap border border-slate-200 dark:border-slate-700">{l.group}</span></td>
                  <td className="px-6 py-5 text-[9px] md:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 whitespace-nowrap">{l.type}</td>
                  <td className={`px-6 py-5 text-right font-mono font-black text-xs md:text-sm whitespace-nowrap ${l.currentBalance < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>₹{Math.abs(l.currentBalance).toLocaleString()} {l.currentBalance >= 0 ? 'Dr' : 'Cr'}</td>
                  <td className="px-8 py-5 text-right no-print"><MoreVertical size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SortHeader = ({ label, active, dir, onClick, className = "" }: any) => (
  <th className={`px-8 py-4 md:py-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`} onClick={onClick}>
    <div className={`flex items-center gap-2 ${className.includes('right') ? 'justify-end' : ''} whitespace-nowrap`}>
      {label}
      {active ? (dir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />) : <ChevronDown size={12} className="text-slate-200 dark:text-slate-700" />}
    </div>
  </th>
);

export default LedgerList;

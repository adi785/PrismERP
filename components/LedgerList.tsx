
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Filter, Download, MoreVertical, Wallet, Landmark, Users, Briefcase, X, ArrowLeft, Printer, FileSpreadsheet, Copy, Edit3, Eye } from 'lucide-react';
import { Ledger, AccountType, Voucher } from '../types';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const ACCOUNT_GROUPS = [
  'Bank Accounts',
  'Cash-in-hand',
  'Sundry Debtors',
  'Sundry Creditors',
  'Sales Accounts',
  'Purchase Accounts',
  'Duties & Taxes',
  'Direct Expenses',
  'Indirect Expenses',
  'Fixed Assets',
  'Capital Account'
];

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const LedgerList: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    group: '',
    type: 'Asset' as AccountType,
    openingBalance: 0
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLedgers = store.ledgers.filter((l: Ledger) => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLedger = useMemo(() => 
    store.ledgers.find((l: Ledger) => l.id === selectedLedgerId),
    [selectedLedgerId, store.ledgers]
  );

  const ledgerTransactions = useMemo(() => {
    if (!selectedLedgerId) return [];
    const sortedVouchers = [...store.vouchers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = selectedLedger?.openingBalance || 0;
    const history: any[] = [];

    history.push({
      date: 'Opening Balance',
      type: '-',
      number: '-',
      narration: 'Opening balance of the account',
      debit: 0,
      credit: 0,
      balance: runningBalance
    });

    sortedVouchers.forEach((v: Voucher) => {
      const entry = v.entries.find(e => e.ledgerId === selectedLedgerId);
      if (entry) {
        let change = entry.debit - entry.credit;
        if (selectedLedger && ['Liability', 'Income', 'Equity'].includes(selectedLedger.type)) {
          change = entry.credit - entry.debit;
        }
        runningBalance += change;
        history.push({
          date: v.date,
          type: v.type,
          number: v.number,
          narration: v.narration,
          debit: entry.debit,
          credit: entry.credit,
          balance: runningBalance
        });
      }
    });

    return history.reverse();
  }, [selectedLedgerId, store.vouchers, selectedLedger]);

  const ledgerTotals = useMemo(() => {
    return ledgerTransactions.reduce((acc, curr) => {
      if (curr.date === 'Opening Balance') return acc;
      return {
        debit: acc.debit + (curr.debit || 0),
        credit: acc.credit + (curr.credit || 0)
      };
    }, { debit: 0, credit: 0 });
  }, [ledgerTransactions]);

  const handleExportCSV = () => {
    downloadCSV(store.ledgers, `Chart_of_Accounts_${store.company.name}`);
  };

  const handleExportStatement = () => {
    if (!selectedLedger) return;
    downloadCSV(ledgerTransactions, `Ledger_${selectedLedger.name}_Statement`);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'Asset': return <Landmark size={18} className="text-blue-500" />;
      case 'Liability': return <Users size={18} className="text-rose-500" />;
      case 'Income': return <Briefcase size={18} className="text-emerald-500" />;
      default: return <Wallet size={18} className="text-slate-500" />;
    }
  };

  const handleCreateLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.group) {
      alert("Please fill in all required fields.");
      return;
    }
    store.addLedger(formData);
    setFormData({ name: '', group: '', type: 'Asset', openingBalance: 0 });
    setIsModalOpen(false);
  };

  if (selectedLedger) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedLedgerId(null)}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-all no-print"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{selectedLedger.name}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">{selectedLedger.group}</span>
              <span>•</span>
              <span className="uppercase font-bold tracking-tighter text-[10px]">{selectedLedger.type}</span>
            </div>
          </div>
          <div className="flex gap-3 no-print">
            <button 
              onClick={handleExportStatement}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm"
            >
              <FileSpreadsheet size={16} /> Excel (CSV)
            </button>
            <button 
              onClick={triggerPrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold text-sm"
            >
              <Printer size={16} /> Print Statement
            </button>
          </div>
        </div>

        {/* Print Header (Only visible in print) */}
        <div className="print-only text-center mb-10 pb-6 border-b-2 border-slate-900">
          <h1 className="text-3xl font-bold uppercase">{store.company.name}</h1>
          <p className="text-sm font-medium">{store.company.address}</p>
          <p className="text-xs font-mono uppercase mt-2">GSTIN: {store.company.gstin}</p>
          <div className="mt-6 flex justify-between items-end border-t border-slate-200 pt-4">
            <div className="text-left">
              <p className="text-xs uppercase font-bold text-slate-500">Account Statement</p>
              <h3 className="text-xl font-black text-slate-900">{selectedLedger.name}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-bold text-slate-500">Statement Date</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center no-print">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/10">
                  <th className="px-8 py-4">Date</th>
                  <th className="px-6 py-4">Voucher</th>
                  <th className="px-6 py-4">Narration</th>
                  <th className="px-6 py-4 text-right">Debit (₹)</th>
                  <th className="px-6 py-4 text-right">Credit (₹)</th>
                  <th className="px-8 py-4 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 text-sm font-medium text-slate-600">{tx.date}</td>
                    <td className="px-6 py-4">
                      {tx.type !== '-' ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{tx.type}</span>
                          <span className="text-[10px] font-mono text-slate-400">{tx.number}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{tx.narration}</td>
                    <td className="px-6 py-4 text-right font-mono-erp text-sm text-slate-700">
                      {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono-erp text-sm text-slate-700">
                      {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                    </td>
                    <td className="px-8 py-4 text-right font-mono-erp font-bold text-slate-800">
                      ₹{Math.abs(tx.balance).toLocaleString()} {tx.balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/50 font-bold border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-8 py-4 text-right uppercase text-[10px] tracking-widest text-slate-400">Transaction Totals</td>
                  <td className="px-6 py-4 text-right font-mono-erp text-sm text-slate-800">₹{ledgerTotals.debit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono-erp text-sm text-slate-800">₹{ledgerTotals.credit.toLocaleString()}</td>
                  <td className="px-8 py-4 text-right font-mono-erp font-black text-slate-900">
                    ₹{Math.abs(selectedLedger.currentBalance).toLocaleString()} {selectedLedger.currentBalance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Chart of Accounts</h2>
          <p className="text-slate-500">Total {store.ledgers.length} primary and sub-ledgers</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={triggerPrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm"
          >
            <Printer size={16} /> Print Chart
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm"
          >
            <Download size={16} /> Export (CSV)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-bold text-sm"
          >
            <Plus size={18} /> Create Ledger
          </button>
        </div>
      </div>

      {/* Print Chart of Accounts Header */}
      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <h1 className="text-3xl font-black uppercase text-slate-900">{store.company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Master Chart of Accounts • {store.company.financialYear}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name or group..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="px-8 py-4">Particulars</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Balance (₹)</th>
                <th className="px-8 py-4 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedgers.map((l: Ledger) => (
                <tr 
                  key={l.id} 
                  className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedLedgerId(l.id)}
                >
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors no-print">
                        {getIcon(l.type)}
                      </div>
                      <span className="font-bold text-slate-800">{l.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                      {l.group}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500 uppercase tracking-tighter text-[10px] font-black">{l.type}</td>
                  <td className={`px-6 py-4 text-right font-mono-erp font-bold ${l.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    ₹{Math.abs(l.currentBalance).toLocaleString()} {l.currentBalance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                  <td className="px-8 py-4 text-right no-print relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === l.id ? null : l.id);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenuId === l.id && (
                      <div 
                        ref={menuRef}
                        className="absolute right-8 top-full z-50 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedLedgerId(l.id); setActiveMenuId(null); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                        >
                          <Eye size={14} /> View Statement
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">Create New Ledger</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white hover:shadow rounded-xl transition-all text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateLedger} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ledger Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. ICICI Bank Current A/c"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Group</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    required
                  >
                    <option value="">Select Group...</option>
                    {ACCOUNT_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Opening Balance (₹)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp"
                  value={formData.openingBalance || ''}
                  onChange={e => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                >
                  Create Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerList;

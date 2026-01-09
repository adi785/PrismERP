
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, ArrowRightLeft, Search, Printer, FileSpreadsheet, Calendar, ChevronDown, Filter, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const DayBook: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredVouchers = useMemo(() => {
    return store.vouchers.filter((v: any) => {
      const matchSearch = v.number.toLowerCase().includes(searchTerm.toLowerCase()) || v.narration?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = v.date >= startDate && v.date <= endDate;
      return matchSearch && matchDate;
    });
  }, [store.vouchers, searchTerm, startDate, endDate]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await store.deleteVoucher(id);
    } catch (err) {
      alert("Failed to delete voucher. Ensure network connection.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Print Only Header */}
      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">{store.company.name}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Daily Transaction Register (Day Book)</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Reporting Period</p>
            <p className="text-sm font-black font-mono">{startDate} to {endDate}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black dark:text-white text-slate-900 tracking-tight">Day Book</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Audit Trail & Daily Logs</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => triggerPrint()} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl"><Printer size={16} /> Print Daybook</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center gap-6 no-print">
        <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-2xl w-full lg:w-auto border border-slate-100 dark:border-slate-800 shadow-inner">
          <div className="flex items-center gap-2 px-3">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Period</span>
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold dark:text-white outline-none border border-slate-100 dark:border-slate-800 shadow-sm w-full md:w-auto" />
          <span className="text-slate-300 dark:text-slate-700 font-bold hidden md:inline">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold dark:text-white outline-none border border-slate-100 dark:border-slate-800 shadow-sm w-full md:w-auto" />
        </div>

        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search logs by narrative data or voucher identifiers..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold dark:text-white shadow-inner placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <th className="px-10 py-6">Date</th>
                <th className="px-6 py-6">Voucher #</th>
                <th className="px-6 py-6">Activity Type</th>
                <th className="px-6 py-6">Audit Particulars</th>
                <th className="px-10 py-6 text-right">Value (₹)</th>
                <th className="px-10 py-6 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVouchers.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-10 py-6 text-sm font-bold text-slate-700 dark:text-slate-300">{v.date}</td>
                  <td className="px-6 py-6 font-mono text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{v.number}</td>
                  <td className="px-6 py-6"><span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700">{v.type}</span></td>
                  <td className="px-6 py-6"><p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm">{v.narration || 'Manual Entry'}</p></td>
                  <td className="px-10 py-6 text-right font-mono font-black text-slate-900 dark:text-white">₹{v.totalAmount.toLocaleString()}</td>
                  <td className="px-10 py-6 text-center no-print">
                    <button 
                      onClick={() => setConfirmDeleteId(v.id)} 
                      disabled={deletingId === v.id}
                      className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all disabled:opacity-30"
                    >
                      {deletingId === v.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVouchers.length === 0 && (
                <tr><td colSpan={6} className="py-32 text-center text-slate-300 dark:text-slate-700 font-bold uppercase text-[10px] tracking-widest">No matching logs found in period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <AlertTriangle size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Delete Record?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed px-4">
                  This action is irreversible. It will remove the voucher and automatically reverse all associated ledger balances and stock levels.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Authorize Deletion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayBook;

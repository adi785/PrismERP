
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, ArrowRightLeft, Search, Printer, FileSpreadsheet, Calendar, ChevronDown, Filter } from 'lucide-react';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const DayBook: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredVouchers = useMemo(() => {
    return store.vouchers.filter((v: any) => {
      const matchSearch = v.number.toLowerCase().includes(searchTerm.toLowerCase()) || v.narration?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = v.date >= startDate && v.date <= endDate;
      return matchSearch && matchDate;
    });
  }, [store.vouchers, searchTerm, startDate, endDate]);

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
          <h2 className="text-2xl font-black dark:text-white text-slate-900">Day Book</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Audit Trail & Daily Logs</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => triggerPrint()} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl"><Printer size={16} /> Print Daybook</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center gap-6 no-print">
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl w-full lg:w-auto border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-2 px-3">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Period</span>
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold dark:text-white outline-none border border-slate-100 dark:border-slate-700 shadow-inner" />
          <span className="text-slate-300 font-bold">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold dark:text-white outline-none border border-slate-100 dark:border-slate-700 shadow-inner" />
        </div>

        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Filter logs by Narration or Voucher ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border-none text-sm font-bold dark:text-white shadow-inner" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                <th className="px-10 py-6">Date</th>
                <th className="px-6 py-6">Voucher #</th>
                <th className="px-6 py-6">Activity Type</th>
                <th className="px-6 py-6">Audit Particulars</th>
                <th className="px-10 py-6 text-right">Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVouchers.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-10 py-6 text-sm font-bold text-slate-700 dark:text-slate-300">{v.date}</td>
                  <td className="px-6 py-6 font-mono text-sm font-black text-blue-600 uppercase tracking-tighter">{v.number}</td>
                  <td className="px-6 py-6"><span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700">{v.type}</span></td>
                  <td className="px-6 py-6"><p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm">{v.narration || 'Manual Entry'}</p></td>
                  <td className="px-10 py-6 text-right font-mono font-black text-slate-900 dark:text-white">₹{v.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
              {filteredVouchers.length === 0 && (
                <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No matching logs found in period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DayBook;

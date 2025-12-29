import React, { useState, useEffect, useRef } from 'react';
import { FileText, ArrowRightLeft, CreditCard, Banknote, Landmark, MoreVertical, Search, Download, Printer, FileSpreadsheet, Trash2, Eye } from 'lucide-react';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const DayBook: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getVoucherIcon = (type: string) => {
    switch(type) {
      case 'Sales': return <ArrowRightLeft className="text-emerald-500" />;
      case 'Purchase': return <ArrowRightLeft className="text-rose-500" />;
      default: return <FileText className="text-slate-500" />;
    }
  };

  const filteredVouchers = store.vouchers.filter((v: any) => 
    v.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const exportData = store.vouchers.map((v: any) => ({
      Date: v.date, Voucher_No: v.number, Type: v.type, Total_Amount: v.totalAmount, Narration: v.narration
    }));
    downloadCSV(exportData, `Daybook_${store.company.name}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Day Book</h2>
          <p className="text-slate-500">Daily transaction log for {store.company.financialYear}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center gap-2"><FileSpreadsheet size={16} /> Export CSV</button>
          <button onClick={triggerPrint} className="px-4 py-2 bg-slate-900 text-white border border-slate-800 rounded-lg font-semibold text-sm hover:bg-slate-800 flex items-center gap-2 shadow-lg"><Printer size={16} /> Print Daybook</button>
        </div>
      </div>

      <div className="print-only mb-10 border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-black uppercase text-slate-900">{store.company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">AUDIT REPORT: DAY BOOK SUMMARY</p>
        <div className="flex justify-between items-end mt-8">
           <p className="text-xs font-mono font-bold">FY: {store.company.financialYear}</p>
           <p className="text-xs font-bold uppercase text-slate-400">Generated On: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Filter transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Date</th>
                <th className="px-6 py-5">Voucher No.</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Particulars</th>
                <th className="px-8 py-5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{v.date}</td>
                  <td className="px-6 py-5 font-mono text-sm font-black text-blue-600 uppercase tracking-tighter">{v.number}</td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-lg">{v.type}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="max-w-sm truncate">
                      <p className="text-sm font-bold text-slate-800 mb-0.5">{v.narration || 'Transactional Entry'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-black text-slate-900">
                    ₹{v.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="print-only mt-20 grid grid-cols-2 text-center">
         <div className="border-t-2 border-slate-900 pt-3 mx-20"><p className="text-[10px] font-black uppercase">Internal Audit</p></div>
         <div className="border-t-2 border-slate-900 pt-3 mx-20"><p className="text-[10px] font-black uppercase">Verified By</p></div>
      </div>
    </div>
  );
};

export default DayBook;
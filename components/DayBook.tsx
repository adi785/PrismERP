
import React, { useState, useEffect, useRef } from 'react';
import { FileText, ArrowRightLeft, CreditCard, Banknote, Landmark, MoreVertical, Search, Download, Printer, FileSpreadsheet, Trash2, Eye } from 'lucide-react';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const DayBook: React.FC<{ store: any }> = ({ store }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
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
      case 'Payment': return <CreditCard className="text-blue-500" />;
      case 'Receipt': return <Banknote className="text-emerald-500" />;
      case 'Contra': return <Landmark className="text-purple-500" />;
      default: return <FileText className="text-slate-500" />;
    }
  };

  const handleExportCSV = () => {
    const exportData = store.vouchers.map((v: any) => ({
      Date: v.date,
      Voucher_No: v.number,
      Type: v.type,
      Total_Amount: v.totalAmount,
      Narration: v.narration
    }));
    downloadCSV(exportData, `Daybook_${store.company.name}_${new Date().toISOString().split('T')[0]}`);
  };

  const filteredVouchers = store.vouchers.filter((v: any) => 
    v.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Day Book</h2>
          <p className="text-slate-500">Daily transaction log for {store.company.financialYear}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Excel (CSV)
          </button>
          <button 
            onClick={triggerPrint}
            className="px-4 py-2 bg-slate-900 text-white border border-slate-800 rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <Printer size={16} /> Print Daybook
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="print-only text-center mb-10 border-b-2 border-slate-900 pb-4">
        <h1 className="text-2xl font-black">{store.company.name}</h1>
        <p className="text-xs uppercase font-bold tracking-widest text-slate-500">Financial Year {store.company.financialYear}</p>
        <h2 className="text-xl font-bold mt-4 uppercase">Day Book Summary</h2>
        <p className="text-sm font-medium mt-1">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by voucher number or narration..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border-none"
            />
          </div>
        </div>

        {filteredVouchers.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Transactions Found</h3>
            <p className="text-slate-500">Start by recording a voucher entry from the sidebar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">Date</th>
                  <th className="px-6 py-4">Voucher No.</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4 text-right">Amount (₹)</th>
                  <th className="px-8 py-4 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4 text-sm font-medium text-slate-600">{v.date}</td>
                    <td className="px-6 py-4 font-mono-erp text-sm font-bold text-slate-800">{v.number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded group-hover:bg-white transition-colors">
                          {getVoucherIcon(v.type)}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight">{v.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate">
                        <p className="text-sm font-bold text-slate-800 mb-0.5">
                          {v.entries[0]?.ledgerId ? store.ledgers.find((l: any) => l.id === v.entries[0].ledgerId)?.name : 'Unknown Ledger'}
                        </p>
                        <p className="text-xs text-slate-400 italic truncate font-medium">"{v.narration || 'No narration'}"</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono-erp font-bold text-slate-800">
                      ₹{v.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-8 py-4 text-right no-print relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === v.id ? null : v.id)}
                        className="p-2 hover:bg-white hover:shadow rounded-lg transition-all text-slate-400 hover:text-slate-600"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === v.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-8 top-full z-50 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 animate-in fade-in slide-in-from-top-1 duration-200"
                        >
                          <button 
                            onClick={() => { alert("Voucher details view coming soon!"); setActiveMenuId(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button 
                            onClick={() => { triggerPrint(); setActiveMenuId(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                          >
                            <Printer size={14} /> Print Voucher
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button 
                            onClick={() => { 
                              if (confirm("Are you sure you want to delete this voucher? This cannot be undone.")) {
                                alert("Deletion is restricted for audited entries in this demo.");
                              }
                              setActiveMenuId(null); 
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"
                          >
                            <Trash2 size={14} /> Delete Entry
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayBook;

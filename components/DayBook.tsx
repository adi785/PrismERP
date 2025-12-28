
import React from 'react';
import { FileText, ArrowRightLeft, CreditCard, Banknote, Landmark, MoreVertical, Search, Download } from 'lucide-react';

const DayBook: React.FC<{ store: any }> = ({ store }) => {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Day Book</h2>
          <p className="text-slate-500">Daily transaction log for {store.company.financialYear}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download size={16} /> Print Daybook
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by voucher number or narration..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm border-none"
            />
          </div>
        </div>

        {store.vouchers.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Transactions Found</h3>
            <p className="text-slate-500">Start by recording a voucher entry from the sidebar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">Date</th>
                  <th className="px-6 py-4">Voucher No.</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4 text-right">Amount (₹)</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {store.vouchers.map((v: any) => (
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
                    <td className="px-8 py-4 text-right">
                      <button className="p-2 hover:bg-white hover:shadow rounded-lg transition-all text-slate-400">
                        <MoreVertical size={16} />
                      </button>
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

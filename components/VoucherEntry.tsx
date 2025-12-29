
import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Calculator, ShoppingCart, ArrowLeftRight, CheckCircle2, Printer, ArrowLeft } from 'lucide-react';
import { VoucherType, VoucherEntry as Entry, InventoryMovement } from '../types';
import { triggerPrint } from '../utils/exportUtils';

const VOUCHER_TYPES: VoucherType[] = ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal'];

const VoucherEntry: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [type, setType] = useState<VoucherType>('Sales');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [number, setNumber] = useState(`VCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [entries, setEntries] = useState<Entry[]>([
    { ledgerId: '', debit: 0, credit: 0 },
    { ledgerId: '', debit: 0, credit: 0 }
  ]);
  const [narration, setNarration] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit), 0);
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit), 0);
  const diff = totalDebit - totalCredit;

  const handleAddEntry = () => {
    setEntries([...entries, { ledgerId: '', debit: 0, credit: 0 }]);
  };

  const updateEntry = (index: number, field: keyof Entry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSave = () => {
    if (diff !== 0) {
      alert("Accounting entries must balance (Debit = Credit)");
      return;
    }
    if (entries.some(e => !e.ledgerId)) {
      alert("Please select ledgers for all entries");
      return;
    }

    const vch = {
      number,
      date,
      type,
      entries,
      narration,
      totalAmount: totalDebit,
      gstTotal: totalDebit * 0.18
    };

    store.addVoucher(vch);
    setIsSaved(true);
  };

  const VoucherPrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 border-2 border-slate-900 bg-white">
      <div className="flex justify-between items-start mb-10 pb-8 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black uppercase text-slate-900">{store.company.name}</h1>
          <p className="text-sm font-bold text-slate-600 mt-2 uppercase tracking-wide">{store.company.address}</p>
          <p className="text-xs font-black text-slate-500 mt-1 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-6 py-2 text-sm font-black uppercase tracking-[0.2em] mb-4">
            {type} Voucher
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">VCH NO: <span className="text-slate-900 font-mono text-sm">{number}</span></p>
            <p className="text-xs font-bold text-slate-400">DATE: <span className="text-slate-900 font-mono text-sm">{date}</span></p>
          </div>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <th className="py-3 text-left">Account Particulars / Ledger Name</th>
            <th className="py-3 text-right">Debit (₹)</th>
            <th className="py-3 text-right">Credit (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e, i) => (
            <tr key={i}>
              <td className="py-5 font-bold text-slate-800">
                {store.ledgers.find((l: any) => l.id === e.ledgerId)?.name || 'Account Not Specified'}
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5">
                  {store.ledgers.find((l: any) => l.id === e.ledgerId)?.group || ''}
                </p>
              </td>
              <td className="py-5 text-right font-mono text-slate-700">{e.debit > 0 ? e.debit.toLocaleString() : ''}</td>
              <td className="py-5 text-right font-mono text-slate-700">{e.credit > 0 ? e.credit.toLocaleString() : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900 bg-slate-50">
            <td className="py-6 font-black uppercase text-xs tracking-widest pl-4">Total Amount</td>
            <td className="py-6 text-right font-black text-lg pr-4">₹{totalDebit.toLocaleString()}</td>
            <td className="py-6 text-right font-black text-lg pr-4">₹{totalCredit.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mb-20">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Narration / Remarks</p>
        <div className="text-sm font-medium italic border-l-4 border-slate-200 pl-6 py-4 bg-slate-50/50 rounded-r-xl leading-relaxed">
          {narration || 'This transaction was recorded in the normal course of business.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mt-32">
        <div className="text-center">
          <div className="w-full border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest">Receiver's Signature</p>
          </div>
        </div>
        <div className="text-center">
          <div className="w-full border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest">Authorized Signatory</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{store.company.name}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
        <div className="no-print flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
            <CheckCircle2 size={48} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Voucher Recorded</h2>
          <p className="text-slate-500 mb-10 font-medium">Internal ledger synchronization complete.</p>
          
          <div className="flex gap-4">
            <button 
              onClick={onComplete}
              className="px-8 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <ArrowLeft size={18} /> Back to Daybook
            </button>
            <button 
              onClick={triggerPrint}
              className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20"
            >
              <Printer size={18} /> Print Voucher
            </button>
          </div>
        </div>
        <VoucherPrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden no-print">
        <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto">
          {VOUCHER_TYPES.map(v => (
            <button
              key={v}
              onClick={() => setType(v)}
              className={`px-8 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                type === v ? 'bg-white border-blue-600 text-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voucher No.</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 font-mono-erp text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2.5 font-mono-erp text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-end">
              <div className="w-full bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><Calculator size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Balanced State</p>
                  <p className={`text-sm font-bold ${diff === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {diff === 0 ? 'Transaction Balanced' : `Out of balance: ₹${Math.abs(diff)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 text-center font-mono-erp text-xs text-slate-400">{idx + 1}</div>
                <div className="col-span-5">
                  <select value={entry.ledgerId} onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Ledger...</option>
                    {store.ledgers.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="number" value={entry.debit || ''} placeholder="0.00" onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-right font-mono-erp text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={entry.credit || ''} placeholder="0.00" onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} className="w-full bg-slate-50 border-slate-200 rounded-lg px-4 py-2 text-right font-mono-erp text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            ))}
            <button onClick={handleAddEntry} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"><Plus size={16} /> Add Entry Line</button>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="grid grid-cols-12 gap-4 mb-8">
              <div className="col-span-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Narration</label>
                <textarea rows={2} placeholder="Enter transaction details..." value={narration} onChange={e => setNarration(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="col-span-6">
                <div className="bg-slate-900 rounded-2xl p-6 text-white ml-auto max-w-sm">
                  <div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-sm">Total Debits</span><span className="font-mono-erp">₹{totalDebit.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center mb-4"><span className="text-slate-400 text-sm">Total Credits</span><span className="font-mono-erp">₹{totalCredit.toFixed(2)}</span></div>
                  <div className="h-px bg-slate-800 mb-4"></div>
                  <div className="flex justify-between items-center"><span className="font-bold">Grand Total</span><span className="text-xl font-bold text-blue-400 font-mono-erp">₹{totalDebit.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => triggerPrint()} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                <Printer size={18} /> Print Draft
              </button>
              <button onClick={handleSave} disabled={diff !== 0} className={`flex items-center gap-2 px-10 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${diff === 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-slate-300 cursor-not-allowed'}`}><Save size={18} /> Record Voucher</button>
            </div>
          </div>
        </div>
      </div>
      <VoucherPrintTemplate />
    </div>
  );
};

export default VoucherEntry;

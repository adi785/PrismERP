import React, { useState, useEffect } from 'react';
// Fix: Added missing ChevronDown import from lucide-react to resolve 'Cannot find name' error on line 181.
import { Save, Plus, X, Calculator, ShoppingCart, ArrowLeftRight, CheckCircle2, Printer, ArrowLeft, ChevronDown } from 'lucide-react';
import { VoucherType, VoucherEntry as Entry, InventoryMovement } from '../types';
import { triggerPrint } from '../utils/exportUtils';

const VOUCHER_TYPES: VoucherType[] = ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal'];

const VoucherEntry: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [type, setType] = useState<VoucherType>('Journal');
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
      alert("Accounting Error: Voucher must balance (Debit = Credit)");
      return;
    }
    if (entries.some(e => !e.ledgerId)) {
      alert("Validation Error: Please select ledgers for all entries");
      return;
    }

    const vch = {
      number,
      date,
      type,
      entries,
      narration,
      totalAmount: totalDebit,
      gstTotal: 0 // Manual vouchers assume user records taxes as separate entries
    };

    store.addVoucher(vch);
    setIsSaved(true);
  };

  const VoucherPrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 border-2 border-slate-900 bg-white font-inter">
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">{store.company.name}</h1>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wide">{store.company.address}</p>
          <p className="text-xs font-black text-slate-900 mt-2 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-8 py-3 text-sm font-black uppercase tracking-[0.3em] mb-4">
            {type} Voucher
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Serial</p>
            <p className="text-lg font-black font-mono text-slate-900">{number}</p>
          </div>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50">
            <th className="py-4 px-4 text-left">Ledger Particulars</th>
            <th className="py-4 text-right">Debit (₹)</th>
            <th className="py-4 text-right pr-4">Credit (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e, i) => (
            <tr key={i}>
              <td className="py-6 px-4">
                <p className="text-sm font-black text-slate-800">{store.ledgers.find((l: any) => l.id === e.ledgerId)?.name || 'N/A'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{store.ledgers.find((l: any) => l.id === e.ledgerId)?.group || ''}</p>
              </td>
              <td className="py-6 text-right font-mono text-slate-700">{e.debit > 0 ? e.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
              <td className="py-6 text-right font-mono text-slate-700 pr-4">{e.credit > 0 ? e.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900 bg-slate-50">
            <td className="py-8 px-4 font-black uppercase text-xs tracking-[0.2em]">Transaction Total</td>
            <td className="py-8 text-right font-black text-xl">₹{totalDebit.toLocaleString()}</td>
            <td className="py-8 text-right font-black text-xl pr-4">₹{totalCredit.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mb-20 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Narration</p>
        <div className="text-sm font-bold italic text-slate-600 leading-relaxed">
          {narration || 'Internal ledger entry recorded for audit purposes.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mt-32">
        <div className="text-center pt-8 border-t border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest">Prepared By</p>
        </div>
        <div className="text-center pt-8 border-t-2 border-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Authorized Official</p>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="no-print flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 shadow-2xl">
            <CheckCircle2 size={56} className="text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Voucher Posted</h2>
          <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">Financial ledger successfully reconciled.</p>
          <div className="flex gap-4">
            <button onClick={onComplete} className="px-10 py-5 rounded-[2rem] border border-slate-200 text-slate-600 font-black flex items-center gap-2 hover:bg-slate-50 transition-all"><ArrowLeft size={18} /> Daybook</button>
            <button onClick={() => triggerPrint()} className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black hover:bg-slate-800 transition-all flex items-center gap-3 shadow-2xl"><Printer size={20} /> Print Voucher</button>
          </div>
        </div>
        <VoucherPrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden no-print">
        <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto p-1.5">
          {VOUCHER_TYPES.map(v => (
            <button key={v} onClick={() => setType(v)} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${type === v ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>{v}</button>
          ))}
        </div>

        <div className="p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Ref ID</label>
              <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 font-mono font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Entry Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
            </div>
            <div className="flex items-end">
              <div className={`w-full p-4 rounded-2xl border flex items-center gap-4 ${diff === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <Calculator size={24} className={diff === 0 ? 'text-emerald-500' : 'text-rose-500'} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Balance State</p>
                  <p className="text-sm font-black">{diff === 0 ? 'Balanced' : `Diff: ₹${Math.abs(diff)}`}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {entries.map((entry, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-6 items-center bg-slate-50/30 p-4 rounded-3xl border border-slate-50 group hover:border-blue-100 transition-colors">
                <div className="col-span-1 text-center font-black text-slate-300">#{idx + 1}</div>
                <div className="col-span-5 relative">
                  <select value={entry.ledgerId} onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none appearance-none">
                    <option value="">Select Ledger...</option>
                    {store.ledgers.map((l: any) => (<option key={l.id} value={l.id}>{l.name} ({l.group})</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                </div>
                <div className="col-span-3">
                  <input type="number" value={entry.debit || ''} placeholder="Debit ₹" onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-right font-mono font-black outline-none" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={entry.credit || ''} placeholder="Credit ₹" onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-right font-mono font-black outline-none" />
                </div>
              </div>
            ))}
            <button onClick={handleAddEntry} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-4 rounded-2xl bg-blue-50 transition-all"><Plus size={16} /> Add Line Item</button>
          </div>

          <div className="mt-16 pt-10 border-t border-slate-100">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-7">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Narration / Internal Note</label>
                <textarea rows={3} placeholder="Describe the transaction..." value={narration} onChange={e => setNarration(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 text-sm font-bold outline-none resize-none focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div className="col-span-5">
                <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl">
                  <div className="flex justify-between items-center mb-3 text-slate-500 text-[10px] font-black uppercase"><p>Debits</p><p className="font-mono text-white">₹{totalDebit.toLocaleString()}</p></div>
                  <div className="flex justify-between items-center mb-6 text-slate-500 text-[10px] font-black uppercase"><p>Credits</p><p className="font-mono text-white">₹{totalCredit.toLocaleString()}</p></div>
                  <div className="h-px bg-slate-900 mb-6"></div>
                  <div className="flex justify-between items-end"><p className="text-[10px] font-black text-blue-600 uppercase mb-2">Grand Total</p><p className="text-4xl font-black tracking-tighter text-white font-mono">₹{totalDebit.toLocaleString()}</p></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-5 mt-10">
              <button onClick={() => triggerPrint()} className="px-8 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-600 font-black text-xs uppercase hover:bg-slate-50 transition-all">Preview</button>
              <button onClick={handleSave} disabled={diff !== 0} className={`px-12 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest text-white shadow-2xl transition-all ${diff === 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-slate-300 cursor-not-allowed'}`}>Authorize & Post</button>
            </div>
          </div>
        </div>
      </div>
      <VoucherPrintTemplate />
    </div>
  );
};

export default VoucherEntry;
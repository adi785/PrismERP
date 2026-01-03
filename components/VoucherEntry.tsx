
import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Calculator, ShoppingCart, ArrowLeftRight, CheckCircle2, Printer, ArrowLeft, ChevronDown, Trash2 } from 'lucide-react';
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

  const removeEntry = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
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
      gstTotal: 0
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
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 px-4 text-center">
        <div className="no-print flex flex-col items-center">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-2xl">
            <CheckCircle2 size={40} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Voucher Posted</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 md:mb-12 font-bold uppercase tracking-widest text-[10px] md:text-xs">Financial ledger successfully reconciled.</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
            <button onClick={onComplete} className="px-8 py-4 rounded-xl md:rounded-[2rem] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><ArrowLeft size={18} /> Daybook</button>
            <button onClick={() => triggerPrint()} className="px-8 py-4 rounded-xl md:rounded-[2rem] bg-slate-900 dark:bg-blue-600 text-white font-black text-xs md:text-sm hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl"><Printer size={20} /> Print Receipt</button>
          </div>
        </div>
        <VoucherPrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden no-print">
        <div className="flex bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto p-1.5 custom-scrollbar">
          {VOUCHER_TYPES.map(v => (
            <button 
              key={v} 
              onClick={() => setType(v)} 
              className={`px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${type === v ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-8 md:mb-12">
            <div>
              <label className="block text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-3 ml-1">Ref ID</label>
              <input 
                type="text" 
                value={number} 
                onChange={e => setNumber(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl md:rounded-[1.5rem] px-4 md:px-6 py-3 md:py-4 font-mono font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-3 ml-1">Entry Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl md:rounded-[1.5rem] px-4 md:px-6 py-3 md:py-4 font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              />
            </div>
            <div className="flex items-end">
              <div className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl border flex items-center gap-3 md:gap-4 ${diff === 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'}`}>
                <Calculator size={20} className={diff === 0 ? 'text-emerald-500' : 'text-rose-500'} />
                <div className="min-w-0">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</p>
                  <p className={`text-xs md:text-sm font-black truncate ${diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {diff === 0 ? 'Balanced' : `Diff: ₹${Math.abs(diff)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="hidden md:grid grid-cols-12 gap-6 px-4 mb-2">
              <div className="col-span-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">#</div>
              <div className="col-span-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ledger</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Debit (₹)</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Credit (₹)</div>
            </div>

            {entries.map((entry, idx) => (
              <div key={idx} className="bg-slate-50/30 dark:bg-slate-800/30 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-50 dark:border-slate-800 group hover:border-blue-100 dark:hover:border-blue-900 transition-colors">
                <div className="hidden md:grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-1 text-center font-black text-slate-300 dark:text-slate-700">#{idx + 1}</div>
                  <div className="col-span-5 relative">
                    <select 
                      value={entry.ledgerId} 
                      onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none appearance-none text-slate-800 dark:text-white"
                    >
                      <option value="">Select Ledger...</option>
                      {store.ledgers.map((l: any) => (<option key={l.id} value={l.id}>{l.name} ({l.group})</option>))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" size={16} />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      value={entry.debit || ''} 
                      placeholder="Debit ₹" 
                      onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-right font-mono font-black outline-none text-slate-800 dark:text-white" 
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                    <input 
                      type="number" 
                      value={entry.credit || ''} 
                      placeholder="Credit ₹" 
                      onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-right font-mono font-black outline-none text-slate-800 dark:text-white" 
                    />
                    {entries.length > 2 && (
                      <button onClick={() => removeEntry(idx)} className="p-2 text-rose-300 hover:text-rose-600 dark:text-rose-900 dark:hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>

                <div className="md:hidden space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Line #{idx + 1}</span>
                    {entries.length > 2 && (
                      <button onClick={() => removeEntry(idx)} className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                    )}
                  </div>
                  <div className="relative">
                    <select 
                      value={entry.ledgerId} 
                      onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black outline-none appearance-none text-slate-800 dark:text-white"
                    >
                      <option value="">Select Ledger Account...</option>
                      {store.ledgers.map((l: any) => (<option key={l.id} value={l.id}>{l.name} ({l.group})</option>))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" size={16} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 ml-1">Debit Amount</p>
                      <input 
                        type="number" 
                        value={entry.debit || ''} 
                        placeholder="0.00" 
                        onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-right font-mono font-black outline-none text-slate-800 dark:text-white" 
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 ml-1">Credit Amount</p>
                      <input 
                        type="number" 
                        value={entry.credit || ''} 
                        placeholder="0.00" 
                        onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-right font-mono font-black outline-none text-slate-800 dark:text-white" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={handleAddEntry} 
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-4 rounded-xl md:rounded-2xl bg-blue-50 dark:bg-blue-900/20 transition-all"
            >
              <Plus size={16} /> Add Entry Line
            </button>
          </div>

          <div className="mt-8 md:mt-16 pt-8 md:pt-10 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
              <div className="lg:col-span-7">
                <label className="block text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Narration / Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe the transaction for auditing..." 
                  value={narration} 
                  onChange={e => setNarration(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl md:rounded-[2rem] px-6 md:px-8 py-4 md:py-6 text-sm font-bold text-slate-800 dark:text-white outline-none resize-none focus:ring-4 focus:ring-blue-500/10" 
                />
              </div>
              <div className="lg:col-span-5">
                <div className="bg-slate-950 dark:bg-slate-950/50 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-3 text-slate-500 text-[9px] md:text-[10px] font-black uppercase">
                    <p>Debits</p>
                    <p className="font-mono text-white">₹{totalDebit.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center mb-6 text-slate-500 text-[9px] md:text-[10px] font-black uppercase">
                    <p>Credits</p>
                    <p className="font-mono text-white">₹{totalCredit.toLocaleString()}</p>
                  </div>
                  <div className="h-px bg-slate-900 dark:bg-slate-800 mb-6"></div>
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase mb-2">Grand Total</p>
                    <p className="text-2xl md:text-4xl font-black tracking-tighter text-white font-mono">₹{totalDebit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-5 mt-8 md:mt-10">
              <button 
                onClick={() => triggerPrint()} 
                className="px-8 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-[1.5rem] text-slate-600 dark:text-slate-300 font-black text-xs uppercase hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Preview
              </button>
              <button 
                onClick={handleSave} 
                disabled={diff !== 0} 
                className={`px-10 py-3.5 rounded-xl md:rounded-[1.5rem] font-black text-xs md:text-sm uppercase tracking-widest text-white shadow-2xl transition-all ${diff === 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-slate-300 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'}`}
              >
                Authorize & Post
              </button>
            </div>
          </div>
        </div>
      </div>
      <VoucherPrintTemplate />
    </div>
  );
};

export default VoucherEntry;

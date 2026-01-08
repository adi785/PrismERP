
import React, { useState, useEffect } from 'react';
// Added AlertTriangle to the imports from lucide-react to resolve the reference error.
import { Save, Plus, X, Calculator, ShoppingCart, ArrowLeftRight, CheckCircle2, Printer, ArrowLeft, ChevronDown, Trash2, Receipt, CreditCard, Wallet, FileText, Landmark, Scale, AlertTriangle } from 'lucide-react';
import { VoucherType, VoucherEntry as Entry, InventoryMovement } from '../types';
import { triggerPrint } from '../utils/exportUtils';

const VOUCHER_METADATA: Record<VoucherType, { color: string, icon: React.ReactNode, desc: string }> = {
  Sales: { color: 'blue', icon: <Receipt size={16} />, desc: 'Outward taxable supply' },
  Purchase: { color: 'purple', icon: <ShoppingCart size={16} />, desc: 'Inward procurement' },
  Payment: { color: 'rose', icon: <CreditCard size={16} />, desc: 'Cash/Bank outflow' },
  Receipt: { color: 'emerald', icon: <Wallet size={16} />, desc: 'Cash/Bank inflow' },
  Contra: { color: 'amber', icon: <Landmark size={16} />, desc: 'Internal bank transfer' },
  Journal: { color: 'slate', icon: <Scale size={16} />, desc: 'Adjustment entry' }
};

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
  const diff = Number((totalDebit - totalCredit).toFixed(2));
  
  const activeColor = VOUCHER_METADATA[type].color;

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

  const handleSave = async () => {
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

    await store.addVoucher(vch);
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
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Audit Successful</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 md:mb-12 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">Ledger entry recognized and posted to books.</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
            <button onClick={onComplete} className="px-8 py-4 rounded-xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"><ArrowLeft size={18} /> Review Daybook</button>
            <button onClick={() => triggerPrint()} className="px-8 py-4 rounded-xl md:rounded-[2rem] bg-slate-900 dark:bg-blue-600 text-white font-black text-xs md:text-sm hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl"><Printer size={20} /> Print Copy</button>
          </div>
        </div>
        <VoucherPrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden no-print">
        
        {/* Navigation Selector */}
        <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 overflow-x-auto p-2 custom-scrollbar">
          {(Object.keys(VOUCHER_METADATA) as VoucherType[]).map(v => (
            <button 
              key={v} 
              onClick={() => setType(v)} 
              className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap mr-1 ${
                type === v 
                  ? `bg-white dark:bg-slate-800 text-${VOUCHER_METADATA[v].color}-600 dark:text-${VOUCHER_METADATA[v].color}-400 shadow-xl ring-1 ring-slate-100 dark:ring-slate-700` 
                  : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <span className={type === v ? `text-${VOUCHER_METADATA[v].color}-500` : 'opacity-40'}>{VOUCHER_METADATA[v].icon}</span>
              {v}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-12">
          {/* Header Data */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3 ml-1">Voucher Serial</label>
              <input 
                type="text" 
                value={number} 
                onChange={e => setNumber(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 font-mono font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all" 
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3 ml-1">Recognition Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all" 
              />
            </div>
            <div className="md:col-span-4 flex items-end">
              <div className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-colors ${diff === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800'}`}>
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${diff === 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}><Calculator size={18} /></div>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Audit Status</p>
                      <p className={`text-sm font-black truncate ${diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {diff === 0 ? 'Balanced' : `Unbalanced: ₹${Math.abs(diff)}`}
                      </p>
                   </div>
                </div>
                {diff !== 0 && <AlertTriangle size={20} className="text-rose-500 animate-pulse shrink-0" />}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-6">
            <div className="hidden md:grid grid-cols-12 gap-8 px-4 mb-2">
              <div className="col-span-6 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Ledger / Account Particulars</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] text-right">Debit Sum (₹)</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] text-right pr-12">Credit Sum (₹)</div>
            </div>

            {entries.map((entry, idx) => (
              <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/40 p-5 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 group hover:border-blue-400 dark:hover:border-blue-700 transition-all">
                <div className="hidden md:grid grid-cols-12 gap-8 items-center">
                  <div className="col-span-6 relative">
                    <select 
                      value={entry.ledgerId} 
                      onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} 
                      className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none appearance-none text-slate-800 dark:text-white focus:ring-4 focus:ring-${activeColor}-500/10 transition-all`}
                    >
                      <option value="">Select Account...</option>
                      {store.ledgers.map((l: any) => (<option key={l.id} value={l.id}>{l.name} • {l.group}</option>))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" size={20} />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      value={entry.debit || ''} 
                      placeholder="0.00" 
                      onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} 
                      className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-right font-mono font-black outline-none text-slate-800 dark:text-white focus:ring-4 focus:ring-${activeColor}-500/10 transition-all shadow-inner`} 
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-4">
                    <input 
                      type="number" 
                      value={entry.credit || ''} 
                      placeholder="0.00" 
                      onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} 
                      className={`w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-right font-mono font-black outline-none text-slate-800 dark:text-white focus:ring-4 focus:ring-${activeColor}-500/10 transition-all shadow-inner`} 
                    />
                    <button onClick={() => removeEntry(idx)} className="p-3 text-slate-300 hover:text-rose-500 transition-colors shrink-0"><Trash2 size={20} /></button>
                  </div>
                </div>

                <div className="md:hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Line #{idx + 1}</span>
                    <button onClick={() => removeEntry(idx)} className="text-rose-500"><Trash2 size={16} /></button>
                  </div>
                  <select 
                    value={entry.ledgerId} 
                    onChange={e => updateEntry(idx, 'ledgerId', e.target.value)} 
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white"
                  >
                    <option value="">Account...</option>
                    {store.ledgers.map((l: any) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={entry.debit || ''} placeholder="Debit" onChange={e => updateEntry(idx, 'debit', Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-white" />
                    <input type="number" value={entry.credit || ''} placeholder="Credit" onChange={e => updateEntry(idx, 'credit', Number(e.target.value))} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-white" />
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={handleAddEntry} 
              className={`flex items-center gap-2 text-${activeColor}-600 dark:text-${activeColor}-400 hover:opacity-80 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-5 rounded-2xl bg-${activeColor}-50 dark:bg-${activeColor}-900/10 transition-all shadow-sm border border-${activeColor}-100 dark:border-${activeColor}-900/30`}
            >
              <Plus size={16} /> Insert Record Line
            </button>
          </div>

          {/* Totals & Narration */}
          <div className="mt-12 md:mt-20 pt-10 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4 ml-1">Document Narration / External Reference</label>
                <textarea 
                  rows={4} 
                  placeholder="Summarize transaction for auditor review..." 
                  value={narration} 
                  onChange={e => setNarration(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] px-8 py-6 text-sm font-bold text-slate-800 dark:text-white outline-none resize-none focus:ring-4 focus:ring-blue-500/10 shadow-inner transition-all" 
                />
              </div>
              <div className="lg:col-span-5">
                <div className="bg-slate-950 dark:bg-black rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-2 h-full bg-${activeColor}-500 group-hover:w-4 transition-all`}></div>
                  <div className="flex justify-between items-center mb-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <span>Aggregate Debits</span>
                    <span className="font-mono text-white text-base">₹{totalDebit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-8 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    <span>Aggregate Credits</span>
                    <span className="font-mono text-white text-base">₹{totalCredit.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-slate-900 dark:bg-slate-800 mb-8"></div>
                  <div>
                    <p className={`text-[11px] font-black text-${activeColor}-500 uppercase tracking-[0.3em] mb-3`}>Voucher Grand Total</p>
                    <div className="flex items-end justify-between">
                       <p className="text-4xl md:text-5xl font-black tracking-tighter text-white font-mono">₹{totalDebit.toLocaleString()}</p>
                       <span className="text-[10px] font-black uppercase text-slate-600 mb-2">INR BASE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12">
              <button 
                onClick={() => triggerPrint()} 
                className="px-10 py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
              >
                Snapshot Preview
              </button>
              <button 
                onClick={handleSave} 
                disabled={diff !== 0 || entries.some(e => !e.ledgerId)} 
                className={`px-12 py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] text-white shadow-2xl transition-all ${
                  diff === 0 && !entries.some(e => !e.ledgerId)
                    ? `bg-${activeColor}-600 hover:bg-${activeColor}-700 shadow-${activeColor}-500/30 scale-100 hover:scale-105 active:scale-95` 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed grayscale'
                }`}
              >
                Authenticate & Finalize Entry
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


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  CheckCircle2, 
  ArrowLeft, 
  Package, 
  User, 
  Calculator, 
  Search, 
  X, 
  ChevronDown, 
  Loader2, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { StockItem, Ledger } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface ReturnLineItem {
  id: string;
  itemId: string;
  name: string;
  sku: string;
  hsn: string;
  quantity: number;
  rate: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalWithTax: number;
  availableStock: number;
}

const ProductReturns: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [returnType, setReturnType] = useState<'Sales Return' | 'Purchase Return'>('Sales Return');
  const [party, setParty] = useState({ name: '', ledgerId: '', address: '' });
  const [items, setItems] = useState<ReturnLineItem[]>([]);
  const [reason, setReason] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [docNo, setDocNo] = useState('');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextNo = store.vouchers.filter((v: any) => v.type === 'Journal' || v.type === 'Contra').length + 1;
    const prefix = returnType === 'Sales Return' ? 'CN' : 'DN';
    setDocNo(`${prefix}-${new Date().getFullYear()}-${nextNo.toString().padStart(4, '0')}`);
  }, [returnType, store.vouchers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateLineItem = (item: ReturnLineItem): ReturnLineItem => {
    const taxableAmount = Number((item.quantity * item.rate).toFixed(2));
    const gstAmount = Number(((taxableAmount * item.gstRate) / 100).toFixed(2));
    const totalWithTax = Number((taxableAmount + gstAmount).toFixed(2));
    return { ...item, taxableAmount, gstAmount, totalWithTax };
  };

  const totals = useMemo(() => {
    const taxable = items.reduce((sum, item) => sum + item.taxableAmount, 0);
    const gst = items.reduce((sum, item) => sum + item.gstAmount, 0);
    const total = items.reduce((sum, item) => sum + item.totalWithTax, 0);
    const hasDeficit = returnType === 'Purchase Return' && items.some(i => i.itemId && i.quantity > i.availableStock);
    return { taxable, gst, total, hasDeficit };
  }, [items, returnType]);

  const addItem = () => {
    const newItem: ReturnLineItem = { 
      id: Date.now().toString(), 
      itemId: '', 
      name: '', 
      sku: '', 
      hsn: '', 
      quantity: 1, 
      rate: 0, 
      taxableAmount: 0, 
      gstRate: 18, 
      gstAmount: 0, 
      totalWithTax: 0,
      availableStock: 0
    };
    setItems([...items, newItem]);
    setTimeout(() => setActiveSearchId(newItem.id), 50);
  };

  const updateItem = (id: string, updates: Partial<ReturnLineItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updated = { ...item, ...updates };
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) {
            updated.name = stock.name; 
            updated.sku = stock.sku; 
            updated.hsn = stock.hsn || '';
            updated.rate = returnType === 'Sales Return' ? stock.salePrice : stock.purchasePrice;
            updated.gstRate = stock.gstRate;
            updated.availableStock = stock.currentStock;
          }
        }
        return calculateLineItem(updated);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (totals.hasDeficit) {
      alert("Inventory Shortage: You cannot return more items than currently in stock.");
      return;
    }
    if (!party.name || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Validation Error: Please select a party and at least one stock item.");
      return;
    }

    setIsSaving(true);
    try {
      const isSalesReturn = returnType === 'Sales Return';
      const inventory = items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.taxableAmount,
        type: (isSalesReturn ? 'In' : 'Out') as 'In' | 'Out'
      }));

      const cgst = Number((totals.gst / 2).toFixed(2));
      const sgst = totals.gst - cgst;

      const entries = isSalesReturn ? [
        { ledgerId: 'l-sales', debit: totals.taxable, credit: 0 },
        { ledgerId: 'l-cgst', debit: cgst, credit: 0 },
        { ledgerId: 'l-sgst', debit: sgst, credit: 0 },
        { ledgerId: party.ledgerId || 'l-cash', debit: 0, credit: totals.total }
      ] : [
        { ledgerId: party.ledgerId || 'l-cash', debit: totals.total, credit: 0 },
        { ledgerId: 'l-purchase', debit: 0, credit: totals.taxable },
        { ledgerId: 'l-cgst', debit: 0, credit: cgst },
        { ledgerId: 'l-sgst', debit: 0, credit: sgst }
      ];

      await store.addVoucher({
        number: docNo,
        date,
        type: 'Journal',
        entries,
        inventory,
        narration: `${returnType}: ${reason || 'Goods returned due to quality check.'} Party: ${party.name}`,
        totalAmount: totals.total,
        gstTotal: totals.gst
      });
      setIsSaved(true);
    } catch (err: any) {
      alert(err.message || "Failed to finalize return voucher.");
    } finally {
      setIsSaving(false);
    }
  };

  const ReturnPrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 bg-white border-2 border-slate-900 font-inter text-slate-900">
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{store.company.name}</h1>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase">{store.company.address}</p>
          <p className="text-xs font-black mt-2 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-8 py-2.5 text-sm font-black uppercase tracking-[0.3em] mb-4">
            {returnType === 'Sales Return' ? 'Credit Note' : 'Debit Note'}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Document ID</p>
            <p className="text-lg font-black font-mono">{docNo}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Dated</p>
            <p className="text-sm font-black">{date}</p>
          </div>
        </div>
      </div>

      <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Party Details:</h3>
        <p className="text-base font-black uppercase">{party.name}</p>
        <p className="text-xs font-bold text-slate-500 mt-1">Adjustment Reason: <span className="font-black text-slate-900 underline">{reason || 'Standard Returns'}</span></p>
      </div>

      <table className="w-full mb-10">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[9px] font-black uppercase tracking-widest bg-slate-50">
            <th className="py-4 px-4 text-left">Item Description</th>
            <th className="py-4 text-center">HSN</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Unit Rate</th>
            <th className="py-4 text-right pr-4">Taxable Amt (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-4 px-4">
                <p className="text-sm font-black uppercase">{item.name}</p>
                <p className="text-[9px] text-slate-400">SKU: {item.sku}</p>
              </td>
              <td className="py-4 text-center text-xs font-mono">{item.hsn}</td>
              <td className="py-4 text-center text-sm font-bold">{item.quantity}</td>
              <td className="py-4 text-right text-sm font-mono">₹{item.rate.toLocaleString()}</td>
              <td className="py-4 text-right text-sm font-black pr-4">₹{item.taxableAmount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 bg-slate-50">
          <tr>
            <td colSpan={3} className="py-8 px-6 align-top">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Adjusted Amount in Words</p>
              <p className="text-xs font-black italic max-w-xs">{numberToWords(totals.total)}</p>
            </td>
            <td colSpan={2} className="py-8 px-8 text-right space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Taxable Total</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.taxable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>GST Reversal</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.gst.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-200 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Adjusted Value</span>
                <span className="text-4xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-24 grid grid-cols-2 gap-20">
        <div className="text-center pt-8 border-t border-slate-200">
          <p className="text-[10px] font-black uppercase text-slate-400">Prepared By</p>
        </div>
        <div className="text-center pt-8 border-t-2 border-slate-900">
          <p className="text-[10px] font-black uppercase text-slate-900">Authorized Official</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {isSaved ? (
        <div className="flex flex-col items-center py-20 animate-in zoom-in-95 duration-500">
          <div className="no-print flex flex-col items-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8 shadow-2xl">
              <CheckCircle2 size={56} className="text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{returnType} Recorded</h2>
            <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">Inventory levels and balances synchronized.</p>
            <div className="flex gap-4">
              <button onClick={onComplete} className="px-10 py-5 rounded-[2rem] border border-slate-200 text-slate-600 font-black flex items-center gap-2 hover:bg-slate-50 transition-all"><ArrowLeft size={18} /> Daybook</button>
              <button onClick={() => triggerPrint()} className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-2xl"><Printer size={20} /> Print Note</button>
            </div>
          </div>
          <ReturnPrintTemplate />
        </div>
      ) : (
        <div className="no-print space-y-6 md:space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
            <div className="flex items-center gap-6">
              <div className="p-4 md:p-5 bg-rose-600 text-white rounded-[2rem] shadow-xl">
                <RotateCcw size={28} md:size={40} />
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight">Returns & Credit Notes</h2>
                <p className="text-slate-500 font-bold text-xs md:text-sm uppercase tracking-widest mt-1 opacity-70">Inventory Reversal Engine</p>
              </div>
            </div>
            <div className="flex bg-white border-2 border-slate-200 p-2 rounded-[1.5rem] shadow-sm w-full md:w-auto">
              <button 
                onClick={() => setReturnType('Sales Return')} 
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${returnType === 'Sales Return' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sales Return
              </button>
              <button 
                onClick={() => setReturnType('Purchase Return')} 
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${returnType === 'Purchase Return' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Purchase Return
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-10">
            <div className="flex-1 space-y-10">
              <div className="bg-white rounded-[3.5rem] p-6 md:p-12 border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Party / Customer Name</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      <input 
                        type="text" 
                        placeholder="Search ledger or type party name..."
                        className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-lg" 
                        value={party.name} 
                        onChange={e => setParty({...party, name: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Voucher Number</label>
                    <input 
                      type="text" 
                      disabled
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-100 border-2 border-slate-100 font-mono text-base font-black uppercase text-slate-400" 
                      value={docNo} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Reason for Return</label>
                    <select 
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none appearance-none"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    >
                      <option value="">Select Reason...</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Expired Product">Expired Product</option>
                      <option value="Incorrect Shipment">Incorrect Shipment</option>
                      <option value="Customer Cancellation">Customer Cancellation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-6 md:p-12 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8 md:mb-12">
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="p-3 md:p-4 bg-slate-900 text-white rounded-3xl"><Package size={20} md:size={28} /></div>
                    <h3 className="text-xs md:text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Items to Return</h3>
                  </div>
                  <button onClick={addItem} className="px-6 md:px-10 py-3 md:py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all"><Plus size={16} md:size={24} /> Add SKU</button>
                </div>

                <div className="space-y-6 md:space-y-8">
                  {items.map(item => {
                    const isOverReturn = returnType === 'Purchase Return' && item.itemId && item.quantity > item.availableStock;
                    return (
                      <div key={item.id} className={`p-6 md:p-8 rounded-[3rem] border group relative hover:shadow-xl transition-all ${isOverReturn ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-slate-100'}`} ref={activeSearchId === item.id ? searchRef : null}>
                        <div className="grid grid-cols-2 md:grid-cols-12 gap-6 items-end">
                          <div className="col-span-2 md:col-span-5 relative">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">SKU Lookup</label>
                            <input 
                              type="text" 
                              className="w-full px-6 md:px-8 py-4 md:py-5 rounded-2xl bg-white border-2 border-slate-100 font-black text-sm md:text-base outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                              placeholder={item.name || "Search Master Inventory..."}
                              value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                              onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} 
                              onChange={e => setSearchQuery(e.target.value)} 
                            />
                            {activeSearchId === item.id && (
                              <div className="absolute left-0 right-0 top-full mt-4 bg-white border-2 border-slate-200 shadow-2xl rounded-[2rem] z-[100] max-h-60 overflow-y-auto p-2">
                                {store.stockItems.filter((s:any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any) => (
                                  <button 
                                    key={s.id} 
                                    onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} 
                                    className="w-full px-6 py-4 text-left border-b border-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"
                                  >
                                    <p className="font-black text-sm">{s.name}</p>
                                    <p className="text-[9px] uppercase font-black opacity-50">Stock: {s.currentStock} {s.unit}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="col-span-1 md:col-span-2 text-center">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Qty</label>
                            <input 
                              type="number" 
                              className={`w-full px-4 py-4 md:py-5 rounded-2xl bg-white border-2 font-black text-sm md:text-base text-center outline-none ${isOverReturn ? 'border-rose-500' : 'border-slate-100'}`} 
                              value={item.quantity || ''} 
                              onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} 
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-right">Credit Rate (₹)</label>
                            <input 
                              type="number" 
                              className="w-full px-6 py-4 md:py-5 rounded-2xl bg-white border-2 border-slate-100 font-black text-sm md:text-base text-right font-mono outline-none" 
                              value={item.rate || ''} 
                              onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} 
                            />
                          </div>
                          <div className="col-span-2 md:col-span-2 flex justify-end pb-1.5">
                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-4 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={24} /></button>
                          </div>
                        </div>
                        {isOverReturn && (
                          <div className="mt-4 flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                            <AlertCircle size={14} /> Insufficient Stock: Only {item.availableStock} units available for return.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="w-full xl:w-96 shrink-0 space-y-10">
              <div className="bg-slate-900 p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150">
                  <Calculator size={200} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 md:mb-12 border-b border-white/5 pb-8">Impact Preview</h3>
                  <div className="space-y-8">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-xs font-black uppercase tracking-widest">Taxable Value</span>
                      <span className="font-mono text-xl text-white">₹{totals.taxable.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-xs font-black uppercase tracking-widest">Reversed GST</span>
                      <span className="font-mono text-xl text-blue-400">₹{totals.gst.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/5 my-10"></div>
                    <div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">Net Adjusted Value</p>
                      <p className="text-5xl md:text-6xl font-black tracking-tighter text-white">₹{totals.total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving || items.length === 0 || totals.hasDeficit} 
                className="w-full py-8 md:py-10 bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] font-black text-xl md:text-2xl flex items-center justify-center gap-5 transition-all shadow-[0_40px_80px_-20px_rgba(37,99,235,0.5)] group disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={32} /> : totals.hasDeficit ? 'Over-Return Forbidden' : <><ShieldCheck size={32} /> Finalize Note</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <ReturnPrintTemplate />
    </div>
  );
};

export default ProductReturns;

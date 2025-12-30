
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
  AlertTriangle 
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
    return { taxable, gst, total };
  }, [items]);

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
      totalWithTax: 0 
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
          }
        }
        return calculateLineItem(updated);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!party.name || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Validation Error: Please select a party and at least one stock item.");
      return;
    }

    setIsSaving(true);
    try {
      const isSalesReturn = returnType === 'Sales Return';
      
      // Inventory Movement: Sales Return = Inward, Purchase Return = Outward
      const inventory = items.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.taxableAmount,
        type: (isSalesReturn ? 'In' : 'Out') as 'In' | 'Out'
      }));

      // Vouchers: Journal used for Credit/Debit Notes
      const cgst = Number((totals.gst / 2).toFixed(2));
      const sgst = totals.gst - cgst;

      const entries = isSalesReturn ? [
        // Sales Return: Sales Dr, GST Dr, Customer Cr
        { ledgerId: 'l-sales', debit: totals.taxable, credit: 0 },
        { ledgerId: 'l-cgst', debit: cgst, credit: 0 },
        { ledgerId: 'l-sgst', debit: sgst, credit: 0 },
        { ledgerId: party.ledgerId || 'l-cash', debit: 0, credit: totals.total }
      ] : [
        // Purchase Return: Vendor Dr, Purchase Cr, GST Cr
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
    } catch (err) {
      alert("Failed to finalize return voucher.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <div className="flex flex-col items-center py-20 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <CheckCircle2 size={56} className="text-blue-600" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-2">{returnType} Recorded</h2>
        <p className="text-slate-500 mb-12 font-bold uppercase tracking-widest text-xs">Inventory levels and balances synchronized.</p>
        <div className="flex gap-4">
          <button onClick={onComplete} className="px-10 py-5 rounded-[2rem] border border-slate-200 text-slate-600 font-black flex items-center gap-2 hover:bg-slate-50 transition-all"><ArrowLeft size={18} /> Daybook</button>
          <button onClick={() => triggerPrint()} className="px-10 py-5 rounded-[2rem] bg-slate-900 text-white font-black hover:bg-slate-800 transition-all flex items-center gap-3 shadow-2xl"><Printer size={20} /> Print Note</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-rose-600 text-white rounded-[2rem] shadow-xl">
            <RotateCcw size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-950 tracking-tight">Returns & Credit Notes</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1 opacity-70">Inventory Reversal Engine</p>
          </div>
        </div>
        <div className="flex bg-white border-2 border-slate-200 p-2 rounded-[1.5rem] shadow-sm">
          <button 
            onClick={() => setReturnType('Sales Return')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${returnType === 'Sales Return' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Sales Return
          </button>
          <button 
            onClick={() => setReturnType('Purchase Return')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${returnType === 'Purchase Return' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Purchase Return
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
        <div className="xl:col-span-3 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="col-span-full">
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

          <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-900 text-white rounded-3xl"><Package size={28} /></div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Items to Return</h3>
              </div>
              <button onClick={addItem} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all"><Plus size={24} /> Add SKU</button>
            </div>

            <div className="space-y-8">
              {items.map(item => (
                <div key={item.id} className="p-8 bg-slate-50/50 rounded-[3rem] border border-slate-100 group relative hover:bg-white hover:shadow-xl transition-all" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-12 gap-8 items-end">
                    <div className="col-span-5 relative">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">SKU Lookup</label>
                      <input 
                        type="text" 
                        className="w-full px-8 py-5 rounded-2xl bg-white border-2 border-slate-100 font-black text-base outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
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
                    <div className="col-span-2 text-center">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Qty</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-5 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-center outline-none" 
                        value={item.quantity || ''} 
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} 
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-right">Credit Rate (₹)</label>
                      <input 
                        type="number" 
                        className="w-full px-6 py-5 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-right font-mono outline-none" 
                        value={item.rate || ''} 
                        onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} 
                      />
                    </div>
                    <div className="col-span-2 flex justify-end pb-1.5">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-4 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={24} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150">
              <Calculator size={200} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12 border-b border-white/5 pb-8">Impact Preview</h3>
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
                  <p className="text-6xl font-black tracking-tighter text-white">₹{totals.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving || items.length === 0} 
            className="w-full py-10 bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] font-black text-2xl flex items-center justify-center gap-5 transition-all shadow-2xl shadow-blue-600/30 group disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={32} /> : <><ShieldCheck size={32} /> Finalize Note</>}
          </button>
          
          <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 flex flex-col gap-6">
             <div className="flex items-center gap-4">
               <AlertTriangle className="text-amber-500" size={24} />
               <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Audit Notice</p>
             </div>
             <p className="text-xs text-slate-500 font-bold leading-relaxed italic opacity-75">
               "Returns directly impact your GSTR-1 (Credit Note section). Ensure the original invoice reference is archived."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductReturns;

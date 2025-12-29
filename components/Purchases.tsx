import React, { useState, useMemo, useEffect } from 'react';
import { Save, Plus, Trash2, Printer, ShoppingCart, IndianRupee, Building2, Package, Calculator, CheckCircle2, ArrowLeft, History } from 'lucide-react';
import { StockItem, Ledger } from '../types';
import { triggerPrint } from '../utils/exportUtils';

const Purchases: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [vendor, setVendor] = useState({ name: '', ledgerId: '', billNo: '' });
  const [items, setItems] = useState<{ id: string, itemId: string, qty: number, rate: number }[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + (i.qty * i.rate), 0), [items]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), itemId: '', qty: 1, rate: 0 }]);
  };

  const updateItem = (id: string, updates: any) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...updates };
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) updated.rate = stock.purchasePrice;
        }
        return updated;
      }
      return i;
    }));
  };

  const handleSave = async () => {
    if (!vendor.billNo || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Please provide vendor bill number and item details.");
      return;
    }

    const inventory = items.map(i => ({
      itemId: i.itemId,
      quantity: i.qty,
      rate: i.rate,
      amount: i.qty * i.rate,
      type: 'In' as const
    }));

    // Accounting: Debit Purchase, Credit Vendor/Cash
    const ledgerId = vendor.ledgerId || 'l-cash';
    await store.addVoucher({
      number: `PUR-${vendor.billNo}`,
      date,
      type: 'Purchase',
      entries: [
        { ledgerId: 'l-purchase', debit: totalAmount, credit: 0 },
        { ledgerId, debit: 0, credit: totalAmount }
      ],
      inventory,
      narration: `Purchase recorded from Bill #${vendor.billNo}. Items: ${items.length}`,
      totalAmount,
      gstTotal: totalAmount * 0.18
    });

    setIsSaved(true);
  };

  if (isSaved) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Purchase Recorded</h2>
        <p className="text-slate-500 mb-10 font-medium">Inventory incremented and ledger entries balanced.</p>
        <button 
          onClick={onComplete}
          className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
        >
          <ArrowLeft size={20} /> View Purchases in Daybook
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Procurement Entry</h2>
          <p className="text-slate-500 font-medium">Inventory Inwarding & Vendor Billing</p>
        </div>
        <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Date</p>
           <p className="text-sm font-bold text-slate-800 font-mono">{date}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Building2 size={20} /></div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Vendor Master Selection</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Vendor Bill No.</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={vendor.billNo}
                  onChange={e => setVendor({ ...vendor, billNo: e.target.value })}
                  placeholder="e.g. V-7892"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Vendor Ledger</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  value={vendor.ledgerId}
                  onChange={e => setVendor({ ...vendor, ledgerId: e.target.value })}
                >
                  <option value="">Cash Purchase</option>
                  {store.ledgers.filter((l: Ledger) => l.group === 'Sundry Creditors').map((l: Ledger) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package size={20} /></div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inward Goods</h3>
               </div>
               <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                 <Plus size={16} /> Add Item Row
               </button>
            </div>

            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center animate-in slide-in-from-right-2">
                  <div className="col-span-6">
                    <select 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-sm outline-none"
                      value={item.itemId}
                      onChange={e => updateItem(item.id, { itemId: e.target.value })}
                    >
                      <option value="">Select SKU...</option>
                      {store.stockItems.map((s: StockItem) => (
                        <option key={s.id} value={s.id}>{s.name} (Qty: {s.currentStock})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-sm text-center"
                      value={item.qty}
                      onChange={e => updateItem(item.id, { qty: Number(e.target.value) })}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-sm text-right font-mono"
                      value={item.rate}
                      onChange={e => updateItem(item.id, { rate: Number(e.target.value) })}
                      placeholder="Cost"
                    />
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Calculator size={120} />
              </div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Purchase Summary</p>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px]">
                       <span>Line Total</span>
                       <span className="text-white font-mono text-lg">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px]">
                       <span>Input GST (18%)</span>
                       <span className="text-blue-400 font-mono text-lg">₹{(totalAmount * 0.18).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-800 my-6"></div>
                    <div>
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Estimated Inward Value</p>
                       <p className="text-4xl font-black tracking-tighter text-white">₹{(totalAmount * 1.18).toLocaleString()}</p>
                    </div>
                 </div>
              </div>
           </div>

           <button 
             onClick={handleSave}
             disabled={items.length === 0}
             className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-600/30 group disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Save size={28} /> Record Purchase Bill
           </button>

           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><History size={28} /></div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inventory Audit Note</p>
                 <p className="text-xs font-bold text-slate-600 leading-relaxed">Purchases automatically update the SKU Master Data upon saving the voucher.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Printer, ShoppingCart, IndianRupee, Building2, Package, Calculator, CheckCircle2, ArrowLeft, History, Search, Check, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { StockItem, Ledger } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface PurchaseLineItem {
  id: string;
  itemId: string;
  name: string;
  sku: string;
  hsn: string;
  qty: number;
  rate: number;
}

const Purchases: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [vendor, setVendor] = useState({ name: '', ledgerId: '', billNo: '' });
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const totalAmount = useMemo(() => items.reduce((sum, i) => sum + (i.qty * i.rate), 0), [items]);
  const gstTotal = totalAmount * 0.18;
  const grandTotal = totalAmount + gstTotal;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveSearchId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = () => {
    const newItem: PurchaseLineItem = { id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', qty: 1, rate: 0 };
    setItems([...items, newItem]);
    setTimeout(() => { setActiveSearchId(newItem.id); setSearchQuery(''); }, 50);
  };

  const updateItem = (id: string, updates: Partial<PurchaseLineItem>) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...updates };
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) {
            updated.name = stock.name;
            updated.sku = stock.sku;
            updated.hsn = stock.hsn || '';
            updated.rate = stock.purchasePrice;
          }
        }
        return updated;
      }
      return i;
    }));
  };

  const filteredStock = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return store.stockItems.filter((s: StockItem) => 
      s.name.toLowerCase().includes(query) || s.sku.toLowerCase().includes(query)
    );
  }, [store.stockItems, searchQuery]);

  const handleSave = async () => {
    if (!vendor.billNo || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Verification Failed: Please provide vendor bill number and select valid inventory items.");
      return;
    }

    setIsSaving(true);
    try {
      const inventory = items.map(i => ({
        itemId: i.itemId,
        quantity: i.qty,
        rate: i.rate,
        amount: i.qty * i.rate,
        type: 'In' as const
      }));

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
        narration: `Procurement recorded from Bill #${vendor.billNo}.`,
        totalAmount,
        gstTotal: gstTotal
      });

      setIsSaved(true);
    } catch (err) {
      console.error("Save Error:", err);
      alert("Failed to save purchase bill. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const PurchasePrintTemplate = () => (
    <div className="print-only w-full bg-white text-slate-900 p-10 font-inter border-2 border-slate-900">
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{store.company.name}</h1>
          <p className="text-sm font-bold text-slate-600 max-w-sm">{store.company.address}</p>
          <p className="text-xs font-mono font-bold mt-2">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-slate-100 uppercase tracking-tighter mb-4">INWARD NOTE</h2>
          <div className="space-y-1">
            <p className="text-sm font-bold">DOC NO: <span className="font-mono text-base">{vendor.billNo}</span></p>
            <p className="text-sm font-bold">DATE: <span className="font-mono text-base">{date}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Supplier Details</p>
        <h3 className="text-xl font-black">{vendor.ledgerId ? store.ledgers.find((l:any) => l.id === vendor.ledgerId)?.name : 'Cash Supplier'}</h3>
      </div>

      <table className="w-full mb-10 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-left">
            <th className="py-4">Item & SKU</th>
            <th className="py-4 text-center">HSN</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Unit Rate</th>
            <th className="py-4 text-right pr-2">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx} className="text-sm">
              <td className="py-5 font-bold">
                {item.name}
                <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
              </td>
              <td className="py-5 text-center font-mono text-xs">{item.hsn}</td>
              <td className="py-5 text-center font-bold">{item.qty}</td>
              <td className="py-5 text-right font-mono">₹{item.rate.toLocaleString()}</td>
              <td className="py-5 text-right font-black font-mono pr-2">₹{(item.qty * item.rate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900">
          <tr>
            <td colSpan={3} className="py-6">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total in Words</p>
              <p className="text-xs font-black italic">{numberToWords(grandTotal)}</p>
            </td>
            <td className="py-6 text-right">
              <div className="space-y-2 text-[10px] font-black text-slate-400 uppercase pr-8">
                <p>Taxable</p>
                <p>GST (18%)</p>
                <p className="text-slate-900 text-sm pt-2">Total</p>
              </div>
            </td>
            <td className="py-6 text-right pr-2">
              <div className="space-y-2 text-sm font-bold font-mono">
                <p>₹{totalAmount.toLocaleString()}</p>
                <p>₹{gstTotal.toLocaleString()}</p>
                <p className="text-2xl text-blue-600 font-black pt-2">₹{grandTotal.toLocaleString()}</p>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-20 mt-32">
        <div className="text-center">
          <div className="w-full border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest">Store Keeper Signature</p>
          </div>
        </div>
        <div className="text-center">
          <div className="w-full border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase tracking-widest">Authorized By</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="no-print flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
            <CheckCircle2 size={56} className="text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Procurement Saved</h2>
          <p className="text-slate-500 mb-10 font-medium">Inventory reconciled and ledger updated successfully.</p>
          <div className="flex gap-4">
            <button onClick={() => triggerPrint()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"><Printer size={20} /> Print Document</button>
            <button onClick={onComplete} className="px-8 py-4 border border-slate-200 rounded-2xl font-black text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">Back to Daybook</button>
          </div>
        </div>
        <PurchasePrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Purchase Bill Entry</h2>
          <p className="text-slate-500 font-medium tracking-tight">Record material inward and vendor liability</p>
        </div>
        <button onClick={() => triggerPrint()} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
          <Printer size={18} /> Print Draft
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 no-print">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Supplier Bill #</label>
                <input type="text" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={vendor.billNo} onChange={e => setVendor({ ...vendor, billNo: e.target.value })} placeholder="e.g. TAX/2024/001" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vendor Account</label>
                <div className="relative">
                  <select className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500" value={vendor.ledgerId} onChange={e => setVendor({ ...vendor, ledgerId: e.target.value })}>
                    <option value="">Cash Purchase</option>
                    {store.ledgers.filter((l: Ledger) => l.group === 'Sundry Creditors').map((l: Ledger) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Table</h3>
              <button onClick={handleAddItem} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"><Plus size={18} /> Add Row</button>
            </div>
            <div className="space-y-6">
              {items.map(item => (
                <div key={item.id} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 space-y-6 relative group" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-5 relative">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">SKU Search</label>
                      <input type="text" className="w-full px-5 py-3.5 rounded-xl bg-white border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder={item.name || "Enter SKU..."} value={activeSearchId === item.id ? searchQuery : (item.name || '')} onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} onChange={e => setSearchQuery(e.target.value)} />
                      {activeSearchId === item.id && (
                        <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[100] max-h-48 overflow-y-auto">
                          {filteredStock.map(s => (
                            <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full px-6 py-4 text-left border-b border-slate-50 hover:bg-blue-50 font-bold text-sm">{s.name} ({s.sku})</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Qty</label>
                      <input type="number" className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 font-bold text-sm text-center outline-none focus:ring-2 focus:ring-blue-500" value={item.qty || ''} onChange={e => updateItem(item.id, { qty: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Cost Price (₹)</label>
                      <input type="number" className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 font-bold text-sm text-right font-mono outline-none focus:ring-2 focus:ring-blue-500" value={item.rate || ''} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 flex items-center justify-end pb-1">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3 text-rose-400 hover:text-rose-600 transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Financial Summary</h3>
              <div className="space-y-6">
                 <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest"><span>Subtotal</span><span className="text-white font-mono text-xl">₹{totalAmount.toLocaleString()}</span></div>
                 <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest"><span>GST 18%</span><span className="text-blue-400 font-mono text-xl">₹{gstTotal.toLocaleString()}</span></div>
                 <div className="h-px bg-slate-800 my-8"></div>
                 <div><p className="text-[10px] font-black text-blue-500 uppercase mb-2">Grand Total</p><p className="text-5xl font-black tracking-tighter">₹{grandTotal.toLocaleString()}</p></div>
              </div>
           </div>
           <button 
             onClick={handleSave} 
             disabled={isSaving || items.length === 0} 
             className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
           >
             {isSaving ? <Loader2 className="animate-spin" size={28} /> : <><Save size={28} className="group-hover:scale-110 transition-transform" /> Post Purchase</>}
           </button>
        </div>
      </div>
      <PurchasePrintTemplate />
    </div>
  );
};

export default Purchases;
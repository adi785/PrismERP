
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Printer, CheckCircle2, ChevronDown, FileText, Loader2, Search, Package, Building2, Calculator, ShoppingCart, Camera, Sparkles, AlertCircle, Calendar, Hash } from 'lucide-react';
import { StockItem, Ledger, InventoryMovement } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface PurchaseLineItem {
  id: string; itemId: string; name: string; sku: string; hsn: string; qty: number; rate: number; gstRate: number; taxableAmount: number; gstAmount: number; total: number; trackingType: 'none' | 'batch' | 'serial';
  trackingDetails: { identifier: string; expiry?: string; }[];
}

const Purchases: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [vendor, setVendor] = useState({ name: '', ledgerId: '', billNo: '' });
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const calculateLine = (item: Partial<PurchaseLineItem>): PurchaseLineItem => {
    const qty = Math.max(0, item.qty || 0);
    const rate = Math.max(0, item.rate || 0);
    const gstRate = Math.max(0, item.gstRate || 0);
    const taxableAmount = Number((qty * rate).toFixed(2));
    const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    const total = Number((taxableAmount + gstAmount).toFixed(2));
    return { ...item as PurchaseLineItem, qty, rate, gstRate, taxableAmount, gstAmount, total };
  };

  const totals = useMemo(() => ({ taxable: items.reduce((s, i) => s + i.taxableAmount, 0), gst: items.reduce((s, i) => s + i.gstAmount, 0), grand: items.reduce((s, i) => s + i.total, 0) }), [items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = () => {
    const newItem = calculateLine({ id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', qty: 1, rate: 0, gstRate: 18, trackingType: 'none', trackingDetails: [] });
    setItems([...items, newItem]);
    setTimeout(() => { setActiveSearchId(newItem.id); setSearchQuery(''); }, 50);
  };

  const updateItem = (id: string, updates: Partial<PurchaseLineItem>) => {
    setItems(items.map(i => {
      if (i.id === id) {
        let updated = { ...i, ...updates };
        if (updates.itemId) {
          const s = store.stockItems.find((stock: StockItem) => stock.id === updates.itemId);
          if (s) {
            updated.name = s.name; updated.sku = s.sku; updated.hsn = s.hsn || ''; updated.rate = s.purchasePrice; updated.gstRate = s.gstRate; updated.trackingType = s.trackingType;
            if (s.trackingType === 'batch') updated.trackingDetails = [{ identifier: '', expiry: '' }];
            else if (s.trackingType === 'serial') updated.trackingDetails = Array.from({ length: updated.qty }, () => ({ identifier: '' }));
          }
        }
        // Sync serial list length with quantity
        if (updates.qty !== undefined && updated.trackingType === 'serial') {
           updated.trackingDetails = Array.from({ length: updates.qty }, (_, idx) => updated.trackingDetails[idx] || { identifier: '' });
        }
        return calculateLine(updated);
      }
      return i;
    }));
  };

  const handleSave = async () => {
    if (!vendor.billNo.trim() || items.length === 0) return alert("Missing Vendor Details");
    
    // Validation for tracked items
    for (const item of items) {
      if (item.trackingType !== 'none' && item.trackingDetails.some(d => !d.identifier.trim())) {
        return alert(`Provide ${item.trackingType} identifiers for ${item.name}`);
      }
    }

    setIsSaving(true);
    try {
      const finalInventory: InventoryMovement[] = [];
      for (const item of items) {
        if (item.trackingType === 'none') {
          finalInventory.push({ itemId: item.itemId, quantity: item.qty, rate: item.rate, amount: item.taxableAmount, type: 'In' });
        } else if (item.trackingType === 'batch') {
          const trackId = await store.ensureTrackingRecord(item.itemId, item.trackingDetails[0].identifier, 'batch', item.trackingDetails[0].expiry);
          finalInventory.push({ itemId: item.itemId, trackingId: trackId, quantity: item.qty, rate: item.rate, amount: item.taxableAmount, type: 'In' });
        } else {
          for (const d of item.trackingDetails) {
            const trackId = await store.ensureTrackingRecord(item.itemId, d.identifier, 'serial');
            finalInventory.push({ itemId: item.itemId, trackingId: trackId, quantity: 1, rate: item.rate, amount: item.rate, type: 'In' });
          }
        }
      }

      await store.addVoucher({
        number: `PUR-${vendor.billNo}`, date, type: 'Purchase', narration: `Procurement Bill #${vendor.billNo}`, totalAmount: totals.grand, gstTotal: totals.gst,
        entries: [{ ledgerId: 'l-purchase', debit: totals.taxable, credit: 0 }, { ledgerId: 'l-cgst', debit: totals.gst/2, credit: 0 }, { ledgerId: 'l-sgst', debit: totals.gst/2, credit: 0 }, { ledgerId: vendor.ledgerId || 'l-cash', debit: 0, credit: totals.grand }],
        inventory: finalInventory
      });
      setIsSaved(true);
    } catch { alert("Failed to record procurement"); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in pb-20 no-print">
      {isSaved ? (
        <div className="text-center py-20"><div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><CheckCircle2 size={40}/></div><h2 className="text-4xl font-black mb-10">Purchase Recorded</h2><button onClick={onComplete} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black">View Daybook</button></div>
      ) : (
        <div className="space-y-10">
          <div className="flex justify-between items-center"><div className="flex items-center gap-6"><div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><ShoppingCart size={32}/></div><h2 className="text-3xl font-black tracking-tight">Inward Purchase Bill</h2></div></div>
          
          <div className="grid grid-cols-4 gap-10">
            <div className="col-span-3 space-y-10">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-10">
                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Bill Number</label><input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" value={vendor.billNo} onChange={e => setVendor({...vendor, billNo: e.target.value})}/></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Vendor</label><select className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black appearance-none outline-none" value={vendor.ledgerId} onChange={e => setVendor({...vendor, ledgerId: e.target.value})}><option value="">Cash / Direct</option>{store.ledgers.filter((l:Ledger)=>l.group==='Sundry Creditors').map((l:Ledger)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3"><Package size={20} className="text-blue-500" /> Manifest Lines</h3>
                  <button onClick={handleAddItem} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"><Plus size={16} /> Add Line</button>
                </div>
                {items.map(item => (
                  <div key={item.id} className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative group" ref={activeSearchId === item.id ? searchRef : null}>
                    <div className="grid grid-cols-12 gap-6 items-end">
                      <div className="col-span-5 relative">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Item Lookup</label>
                        <input className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black shadow-inner" placeholder={item.name || "Search Master SKU..."} value={activeSearchId === item.id ? searchQuery : item.name} onFocus={()=>{setActiveSearchId(item.id); setSearchQuery('')}} onChange={e=>setSearchQuery(e.target.value)}/>
                        {activeSearchId === item.id && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 p-2 max-h-60 overflow-y-auto">
                            {store.stockItems.filter((s:any)=>s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any)=><button key={s.id} onClick={()=>{updateItem(item.id, {itemId: s.id}); setActiveSearchId(null)}} className="w-full p-4 text-left font-black text-sm hover:bg-blue-600 hover:text-white rounded-xl transition-all">{s.name} ({s.sku})</button>)}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Qty</label><input type="number" className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-center" value={item.qty} onChange={e=>updateItem(item.id, {qty: Number(e.target.value)})}/></div>
                      <div className="col-span-3"><label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Unit Cost (₹)</label><input type="number" className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-right" value={item.rate} onChange={e=>updateItem(item.id, {rate: Number(e.target.value)})}/></div>
                      <div className="col-span-2 flex justify-end pb-1"><button onClick={()=>setItems(items.filter(i=>i.id!==item.id))} className="p-4 text-rose-300 hover:text-rose-600 transition-colors"><Trash2/></button></div>
                    </div>

                    {/* Tracking Detail Inputs */}
                    {item.trackingType !== 'none' && (
                      <div className="mt-8 pt-8 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <h4 className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-4 flex items-center gap-2"><Hash size={12}/> Required: {item.trackingType} Metadata</h4>
                        <div className="space-y-4">
                          {item.trackingType === 'batch' ? (
                            <div className="grid grid-cols-2 gap-6">
                              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Batch Number</label><input className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 font-black text-xs" value={item.trackingDetails[0]?.identifier} onChange={e=>{const d=[...item.trackingDetails]; d[0]={...d[0], identifier: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
                              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Expiry Date</label><input type="date" className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 font-black text-xs" value={item.trackingDetails[0]?.expiry} onChange={e=>{const d=[...item.trackingDetails]; d[0]={...d[0], expiry: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 gap-4">
                              {item.trackingDetails.map((td, idx) => (
                                <div key={idx}><label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Serial #{idx+1}</label><input className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] font-black" value={td.identifier} onChange={e=>{const d=[...item.trackingDetails]; d[idx]={identifier: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150"><Calculator size={180}/></div>
                <div className="relative z-10 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-6">Payment Summary</h3>
                  <div className="flex justify-between font-black uppercase text-xs text-slate-400"><span>Taxable</span><span className="text-white">₹{totals.taxable}</span></div>
                  <div className="flex justify-between font-black uppercase text-xs text-slate-400"><span>Consolidated GST</span><span className="text-white">₹{totals.gst}</span></div>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] font-black text-blue-500 uppercase mb-3">Grand Total</p>
                    <p className="text-5xl font-black tracking-tighter">₹{totals.grand.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving || items.length === 0} className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-4">{isSaving ? <Loader2 className="animate-spin" size={32}/> : <><Save size={24}/> Authorize Inward</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, Package, User, Calculator, Search, ChevronDown, Loader2, FileText, AlertCircle, ArrowLeft, Percent, IndianRupee, CreditCard, Wallet, FileCheck, ShieldCheck, Building, Landmark, Scale, Boxes, Hash, Check, X } from 'lucide-react';
import { StockItem, Ledger, TrackingDetail, InventoryMovement } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface BillingItem {
  id: string; itemId: string; name: string; sku: string; hsn: string; quantity: number; rate: number; discountType: 'percentage' | 'fixed'; discountValue: number; discountAmount: number; cgstRate: number; sgstRate: number; igstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number; amount: number; totalWithTax: number; availableStock: number;
  trackingType: 'none' | 'batch' | 'serial';
  assignedTracking: string[]; // List of tracking IDs
}

const Billing: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [party, setParty] = useState<{name: string, ledgerId: string}>({ name: '', ledgerId: '' });
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
  const [taxType, setTaxType] = useState<'Intra' | 'Inter'>('Intra');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Credit'>('Cash');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [showPartySearch, setShowPartySearch] = useState(false);
  
  const [trackingSelectorItem, setTrackingSelectorItem] = useState<BillingItem | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const partyRef = useRef<HTMLDivElement>(null);

  const calculateLineItem = (item: BillingItem, currentTaxType: 'Intra' | 'Inter'): BillingItem => {
    const gross = (item.quantity || 0) * (item.rate || 0);
    let disc = item.discountType === 'percentage' ? (gross * (item.discountValue || 0)) / 100 : (item.discountValue || 0);
    const discountAmount = Number(disc.toFixed(2));
    const amount = Number((gross - discountAmount).toFixed(2));
    const cgstAmount = Number(((amount * (item.cgstRate || 0)) / 100).toFixed(2));
    const sgstAmount = Number(((amount * (item.sgstRate || 0)) / 100).toFixed(2));
    const igstAmount = Number(((amount * (item.igstRate || 0)) / 100).toFixed(2));
    const taxSum = currentTaxType === 'Inter' ? igstAmount : (cgstAmount + sgstAmount);
    const totalWithTax = Number((amount + taxSum).toFixed(2));
    return { ...item, discountAmount, amount, cgstAmount, sgstAmount, igstAmount, totalWithTax };
  };

  useEffect(() => { if (items.length > 0) setItems(prev => prev.map(item => calculateLineItem(item, taxType))); }, [taxType]);

  const totals = useMemo(() => {
    const taxable = items.reduce((sum, item) => sum + item.amount, 0);
    const consolidatedGst = items.reduce((sum, item) => sum + (taxType === 'Inter' ? item.igstAmount : (item.cgstAmount + item.sgstAmount)), 0);
    const finalPayable = Math.round(taxable + consolidatedGst);
    const roundOff = Number((finalPayable - (taxable + consolidatedGst)).toFixed(2));
    const hasDeficit = items.some(i => i.itemId && i.quantity > i.availableStock);
    const trackingPending = items.some(i => i.trackingType !== 'none' && i.assignedTracking.length === 0);
    return { taxable, gstTotal: consolidatedGst, total: finalPayable, roundOff, hasDeficit, trackingPending };
  }, [items, taxType]);

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', quantity: 1, rate: 0, discountType: 'percentage', discountValue: 0, discountAmount: 0, cgstRate: 9, sgstRate: 9, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, amount: 0, totalWithTax: 0, availableStock: 0, trackingType: 'none', assignedTracking: [] };
    setItems([...items, calculateLineItem(newItem, taxType)]);
    setTimeout(() => setActiveSearchId(newItem.id), 50);
  };

  const updateItem = (id: string, updates: Partial<BillingItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updated = { ...item, ...updates };
        if (updates.itemId) {
          const s = store.stockItems.find((stock: StockItem) => stock.id === updates.itemId);
          if (s) {
            updated.name = s.name; updated.sku = s.sku; updated.hsn = s.hsn || ''; updated.rate = s.salePrice; updated.cgstRate = s.gstRate / 2; updated.sgstRate = s.gstRate / 2; updated.igstRate = s.gstRate; updated.availableStock = s.currentStock; updated.trackingType = s.trackingType; updated.assignedTracking = [];
          }
        }
        return calculateLineItem(updated, taxType);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!party.name || items.length === 0 || totals.trackingPending) return alert(totals.trackingPending ? "Assign batches/serials to all tracked items" : "Invalid Invoice State");
    setIsSaving(true);
    try {
      const finalInventory: InventoryMovement[] = [];
      for (const item of items) {
        if (item.trackingType === 'none') {
          finalInventory.push({ itemId: item.itemId, quantity: item.quantity, rate: item.rate, amount: item.amount, type: 'Out' });
        } else {
          for (const trackId of item.assignedTracking) {
             const qty = item.trackingType === 'serial' ? 1 : item.quantity;
             finalInventory.push({ itemId: item.itemId, trackingId: trackId, quantity: qty, rate: item.rate, amount: item.rate * qty, type: 'Out' });
          }
        }
      }

      await store.addVoucher({
        number: invoiceNo, date, type: 'Sales', narration: `Outward Invoice #${invoiceNo} to ${party.name}`, totalAmount: totals.total, gstTotal: totals.gstTotal,
        entries: [{ ledgerId: paymentMode === 'Cash' ? 'l-cash' : party.ledgerId || 'l-cash', debit: totals.total, credit: 0 }, { ledgerId: 'l-sales', debit: 0, credit: totals.taxable }],
        inventory: finalInventory
      });
      setIsSaved(true);
    } catch { alert("Failed to authorize invoice"); } finally { setIsSaving(false); }
  };

  const openTrackingSelection = (item: BillingItem) => setTrackingSelectorItem(item);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in pb-20 no-print">
      {isSaved ? (
        <div className="text-center py-20"><div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><FileCheck size={40}/></div><h2 className="text-4xl font-black mb-10 tracking-tight">Invoice Finalized</h2><div className="flex gap-4 justify-center"><button onClick={()=>triggerPrint()} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black">Print Invoice</button><button onClick={onComplete} className="px-10 py-5 border border-slate-200 rounded-3xl font-black">Daybook</button></div></div>
      ) : (
        <>
          <div className="flex justify-between items-center"><div className="flex items-center gap-6"><div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><FileText size={32}/></div><h2 className="text-3xl font-black tracking-tight">Sales Invoicing Suite</h2></div><div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800"><button onClick={()=>setTaxType('Intra')} className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${taxType==='Intra'?'bg-blue-600 text-white shadow-xl':'text-slate-400'}`}>Intra-State</button><button onClick={()=>setTaxType('Inter')} className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${taxType==='Inter'?'bg-blue-600 text-white shadow-xl':'text-slate-400'}`}>Inter-State</button></div></div>

          <div className="grid grid-cols-4 gap-10">
            <div className="col-span-3 space-y-10">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-10">
                <div className="col-span-1 relative"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Account</label><input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" placeholder="Select or Type Party..." value={party.name} onChange={e=>setParty({...party, name:e.target.value})}/></div>
                <div className="col-span-1 flex gap-6">
                  <div className="flex-1"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Settlement</label><div className="flex bg-slate-50 dark:bg-slate-950/40 p-1 rounded-2xl border dark:border-slate-800 h-14"><button onClick={()=>setPaymentMode('Cash')} className={`flex-1 rounded-xl font-black text-[10px] uppercase ${paymentMode==='Cash'?'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm':'text-slate-400'}`}>Cash</button><button onClick={()=>setPaymentMode('Credit')} className={`flex-1 rounded-xl font-black text-[10px] uppercase ${paymentMode==='Credit'?'bg-white dark:bg-slate-800 text-blue-600 shadow-sm':'text-slate-400'}`}>Credit</button></div></div>
                  <div className="flex-1"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Invoice #</label><input className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800 font-mono font-black text-sm" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}/></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-8"><h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3"><Package size={20} className="text-blue-500" /> Outward Manifest</h3><button onClick={addItem} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest"><Plus size={18} /> Add Line</button></div>
                <div className="space-y-8">
                  {items.map(item => (
                    <div key={item.id} className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group relative" ref={activeSearchId === item.id ? searchRef : null}>
                      <div className="grid grid-cols-12 gap-6 items-end">
                        <div className="col-span-4 relative">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Item Search</label>
                          <input className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black shadow-inner" placeholder={item.name || "Select SKU..."} value={activeSearchId === item.id ? searchQuery : item.name} onFocus={()=>{setActiveSearchId(item.id); setSearchQuery('')}} onChange={e=>setSearchQuery(e.target.value)}/>
                          {activeSearchId === item.id && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 p-2 max-h-60 overflow-y-auto">
                              {store.stockItems.filter((s:any)=>s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any)=><button key={s.id} onClick={()=>{updateItem(item.id, {itemId: s.id}); setActiveSearchId(null)}} className="w-full p-4 text-left font-black text-sm hover:bg-blue-600 hover:text-white rounded-xl transition-all">{s.name}</button>)}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Quantity</label><input type="number" className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-center" value={item.quantity} onChange={e=>updateItem(item.id, {quantity: Number(e.target.value)})}/></div>
                        <div className="col-span-3"><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Sale Rate (₹)</label><input type="number" className="w-full px-5 py-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-right" value={item.rate} onChange={e=>updateItem(item.id, {rate: Number(e.target.value)})}/></div>
                        <div className="col-span-3 flex items-center justify-end gap-3 pb-1">
                          {item.trackingType !== 'none' && (
                            <button onClick={()=>openTrackingSelection(item)} className={`px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${item.assignedTracking.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'}`}>
                              <Boxes size={16}/> {item.assignedTracking.length > 0 ? 'Assigned' : `Pick ${item.trackingType}`}
                            </button>
                          )}
                          <button onClick={()=>setItems(items.filter(i=>i.id!==item.id))} className="p-4 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={24}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150"><Calculator size={180}/></div>
                <div className="relative z-10 space-y-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-6">Checkout Summary</h4>
                  <div className="flex justify-between text-xs font-black text-slate-400 uppercase"><span>Taxable Base</span><span className="text-white">₹{totals.taxable}</span></div>
                  <div className="flex justify-between text-xs font-black text-slate-400 uppercase"><span>Consolidated GST</span><span className="text-white">₹{totals.gstTotal}</span></div>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] font-black text-blue-500 uppercase mb-3">Grand Total</p>
                    <p className="text-6xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving || items.length === 0 || totals.trackingPending} className="w-full py-10 bg-blue-600 text-white rounded-[3rem] font-black text-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 group">
                {isSaving ? <Loader2 className="animate-spin" size={32}/> : <><ShieldCheck size={28}/> Finalize & Authorize</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tracking Selection Modal */}
      {trackingSelectorItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
               <div><h2 className="text-2xl font-black tracking-tight">Assigment Node</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Item: {trackingSelectorItem.name}</p></div>
               <button onClick={()=>setTrackingSelectorItem(null)} className="p-2 hover:bg-white/10 rounded-lg"><X/></button>
             </div>
             <div className="p-10 space-y-6">
               <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl flex items-center justify-between border border-blue-100 dark:border-blue-800">
                 <div><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Quantity</p><p className="text-3xl font-black text-blue-700 dark:text-blue-400">{trackingSelectorItem.quantity} <span className="text-xs uppercase opacity-60">{trackingSelectorItem.unit}</span></p></div>
                 <div className="text-right"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Assigned</p><p className="text-3xl font-black text-emerald-600">{trackingSelectorItem.assignedTracking.length}</p></div>
               </div>

               <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                 {store.trackingData.filter((t:any)=>t.itemId === trackingSelectorItem.itemId && t.currentQty > 0).map((t:any) => {
                   const isSelected = trackingSelectorItem.assignedTracking.includes(t.id);
                   const canSelect = trackingSelectorItem.trackingType === 'serial' ? !isSelected && trackingSelectorItem.assignedTracking.length < trackingSelectorItem.quantity : !isSelected;
                   
                   return (
                     <button key={t.id} onClick={()=>{
                        const isBatch = trackingSelectorItem.trackingType === 'batch';
                        if (isSelected) {
                          updateItem(trackingSelectorItem.id, { assignedTracking: trackingSelectorItem.assignedTracking.filter(id => id !== t.id) });
                        } else if (canSelect) {
                          if (isBatch) updateItem(trackingSelectorItem.id, { assignedTracking: [t.id] }); // Multi-batch select logic would go here
                          else updateItem(trackingSelectorItem.id, { assignedTracking: [...trackingSelectorItem.assignedTracking, t.id] });
                        }
                     }} className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${isSelected ? 'bg-emerald-50 border-emerald-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-800/40 border-transparent hover:border-blue-500'}`}>
                       <div>
                         <p className="text-sm font-black dark:text-white flex items-center gap-2">{t.identifier} {t.expiryDate && <span className="text-[9px] font-black px-2 py-0.5 bg-rose-100 text-rose-600 rounded">Exp: {t.expiryDate}</span>}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Current Stock: {t.currentQty} units</p>
                       </div>
                       <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover:border-blue-500'}`}>{isSelected && <Check size={16}/>}</div>
                     </button>
                   );
                 })}
               </div>

               <button onClick={()=>setTrackingSelectorItem(null)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest mt-4">Confirm Assignments</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Billing;

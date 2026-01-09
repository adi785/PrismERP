
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Printer, CheckCircle2, ChevronDown, FileText, Loader2, Search, Package, Building2, Calculator, ShoppingCart, Camera, Sparkles, AlertCircle, Calendar, Hash } from 'lucide-react';
import { StockItem, Ledger, InventoryMovement } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';
import { GoogleGenAI } from "@google/genai";

interface PurchaseLineItem {
  id: string; 
  itemId: string; 
  name: string; 
  sku: string; 
  hsn: string; 
  qty: number; 
  rate: number; 
  gstRate: number; 
  taxableAmount: number; 
  gstAmount: number; 
  total: number; 
  trackingType: 'none' | 'batch' | 'serial';
  trackingDetails: { identifier: string; expiry?: string; }[];
}

const Purchases: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [vendor, setVendor] = useState({ name: '', ledgerId: '', billNo: '' });
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateLine = (item: Partial<PurchaseLineItem>): PurchaseLineItem => {
    const qty = Math.max(0, item.qty || 0);
    const rate = Math.max(0, item.rate || 0);
    const gstRate = Math.max(0, item.gstRate || 0);
    const taxableAmount = Number((qty * rate).toFixed(2));
    const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    const total = Number((taxableAmount + gstAmount).toFixed(2));
    return { ...item as PurchaseLineItem, qty, rate, gstRate, taxableAmount, gstAmount, total };
  };

  const totals = useMemo(() => ({ 
    taxable: items.reduce((s, i) => s + i.taxableAmount, 0), 
    gst: items.reduce((s, i) => s + i.gstAmount, 0), 
    grand: items.reduce((s, i) => s + i.total, 0) 
  }), [items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = () => {
    const newItem = calculateLine({ 
      id: Date.now().toString(), 
      itemId: '', 
      name: '', 
      sku: '', 
      hsn: '', 
      qty: 1, 
      rate: 0, 
      gstRate: 18, 
      trackingType: 'none', 
      trackingDetails: [] 
    });
    setItems([...items, newItem]);
    setTimeout(() => { setActiveSearchId(newItem.id); setSearchQuery(''); }, 50);
  };

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: `Extract data from this purchase invoice. Return ONLY JSON matching this structure: { "billNo": string, "vendorName": string, "items": Array<{ "name": string, "qty": number, "rate": number, "gstRate": number }> }. Context: ${JSON.stringify(store.stockItems.map((s:any) => ({id: s.id, name: s.name})))}` }
            ]
          }
        });

        let text = response.text || '{}';
        // Cleanup JSON markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(text);
        
        if (result.billNo) setVendor(v => ({ ...v, billNo: result.billNo }));
        
        if (result.items && Array.isArray(result.items)) {
          const newItems = result.items.map((aiItem: any) => {
            // Fuzzy match logic
            const matchedStock = store.stockItems.find((s: any) => 
              s.name.toLowerCase().includes(aiItem.name.toLowerCase()) ||
              aiItem.name.toLowerCase().includes(s.name.toLowerCase())
            );

            const base = {
              id: Math.random().toString(),
              itemId: matchedStock?.id || '',
              name: matchedStock?.name || aiItem.name,
              sku: matchedStock?.sku || 'AI-MAPPED',
              hsn: matchedStock?.hsn || '9999',
              qty: Math.max(0, aiItem.qty || 1),
              rate: Math.max(0, aiItem.rate || 0),
              gstRate: Math.max(0, aiItem.gstRate || matchedStock?.gstRate || 18),
              trackingType: matchedStock?.trackingType || 'none',
              trackingDetails: [] as any[]
            };

            if (base.trackingType === 'batch') base.trackingDetails = [{ identifier: '', expiry: '' }];
            else if (base.trackingType === 'serial') base.trackingDetails = Array.from({ length: base.qty }, () => ({ identifier: '' }));

            return calculateLine(base);
          });
          setItems(newItems);
        }
      };
    } catch (err) {
      console.error("AI Scan Failed:", err);
      alert("AI Scan failed. Ensure the image is clear and you have a valid internet connection.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateItem = (id: string, updates: Partial<PurchaseLineItem>) => {
    setItems(items.map(i => {
      if (i.id === id) {
        let updated = { ...i, ...updates };
        if (updates.itemId) {
          const s = store.stockItems.find((stock: StockItem) => stock.id === updates.itemId);
          if (s) {
            updated.name = s.name; 
            updated.sku = s.sku; 
            updated.hsn = s.hsn || ''; 
            updated.rate = s.purchasePrice; 
            updated.gstRate = s.gstRate; 
            updated.trackingType = s.trackingType;
            if (s.trackingType === 'batch') updated.trackingDetails = [{ identifier: '', expiry: '' }];
            else if (s.trackingType === 'serial') updated.trackingDetails = Array.from({ length: updated.qty }, () => ({ identifier: '' }));
          }
        }
        return calculateLine(updated);
      }
      return i;
    }));
  };

  const handleSave = async () => {
    if (!vendor.billNo.trim() || items.length === 0 || items.some(i => !i.itemId)) {
      return alert("Complete vendor details and item selection before authorizing.");
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
        number: `PUR-${vendor.billNo}`, 
        date, 
        type: 'Purchase', 
        narration: `Procurement Bill #${vendor.billNo} via ${vendor.ledgerId || 'Direct'}`, 
        totalAmount: totals.grand, 
        gstTotal: totals.gst,
        entries: [
          { ledgerId: 'l-purchase', debit: totals.taxable, credit: 0 }, 
          { ledgerId: 'l-cgst', debit: totals.gst/2, credit: 0 }, 
          { ledgerId: 'l-sgst', debit: totals.gst/2, credit: 0 }, 
          { ledgerId: vendor.ledgerId || 'l-cash', debit: 0, credit: totals.grand }
        ],
        inventory: finalInventory
      });
      setIsSaved(true);
    } catch (err: any) { 
      alert(err.message || "Failed to record procurement audit."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 animate-in fade-in pb-20 no-print">
      {isSaved ? (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 size={48}/>
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Voucher Authorized</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-10">Stock levels and ledger balances synced.</p>
          <button onClick={onComplete} className="px-12 py-5 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl transition-transform active:scale-95">View Daybook</button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="p-4 md:p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><ShoppingCart size={28} md:size={32}/></div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Inward Purchase Bill</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Audit-Ready Procurement Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAIScan} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all shadow-md group border-2 border-blue-200 dark:border-blue-800"
              >
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} className="animate-pulse" /> AI Scan Bill</>}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col xl:flex-row gap-10">
            <div className="flex-1 space-y-10">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest ml-1">Bill Number</label><input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-slate-800 dark:text-white" value={vendor.billNo} onChange={e => setVendor({...vendor, billNo: e.target.value})}/></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest ml-1">Vendor Account</label><select className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black appearance-none outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 dark:text-white" value={vendor.ledgerId} onChange={e => setVendor({...vendor, ledgerId: e.target.value})}><option value="">Cash / Local Direct</option>{store.ledgers.filter((l:Ledger)=>l.group==='Sundry Creditors').map((l:Ledger)=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-blue-500 shadow-inner"><Package size={20} /></div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Procurement Manifest</h3>
                  </div>
                  <button onClick={handleAddItem} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-transform active:scale-95"><Plus size={16} /> Add SKU</button>
                </div>
                {items.map(item => (
                  <div key={item.id} className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative group animate-in slide-in-from-left-4 duration-300" ref={activeSearchId === item.id ? searchRef : null}>
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-4 items-end">
                      <div className="col-span-2 md:col-span-5 relative">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Stock Item Lookup</label>
                        <input className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 dark:text-white" placeholder={item.name || "Select SKU..."} value={activeSearchId === item.id ? searchQuery : item.name} onFocus={()=>{setActiveSearchId(item.id); setSearchQuery('')}} onChange={e=>setSearchQuery(e.target.value)}/>
                        {activeSearchId === item.id && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar animate-in zoom-in-95">
                            {store.stockItems.filter((s:any)=>s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any)=><button key={s.id} onClick={()=>{updateItem(item.id, {itemId: s.id}); setActiveSearchId(null)}} className="w-full p-4 text-left font-black text-sm hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center justify-between"><span>{s.name}</span><span className="text-[9px] opacity-40 uppercase">{s.sku}</span></button>)}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-400 mb-2 text-center">Quantity</label><input type="number" className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-center outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 dark:text-white" value={item.qty || ''} onChange={e=>updateItem(item.id, {qty: Number(e.target.value)})}/></div>
                      <div className="col-span-1 md:col-span-3"><label className="block text-[10px] font-black uppercase text-slate-400 mb-2 text-right">Inward Cost (₹)</label><input type="number" className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-right outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 dark:text-white" value={item.rate || ''} onChange={e=>updateItem(item.id, {rate: Number(e.target.value)})}/></div>
                      <div className="col-span-2 md:col-span-2 flex justify-end pb-1"><button onClick={()=>setItems(items.filter(i=>i.id!==item.id))} className="p-3 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={20}/></button></div>
                    </div>

                    {item.trackingType !== 'none' && (
                      <div className="mt-8 pt-8 border-t border-dashed border-slate-200 dark:border-slate-700 animate-in fade-in">
                        <h4 className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-4 flex items-center gap-2"><Hash size={12}/> {item.trackingType} Metadata Required</h4>
                        <div className="space-y-4">
                          {item.trackingType === 'batch' ? (
                            <div className="grid grid-cols-2 gap-6">
                              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Batch Identifier</label><input className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" value={item.trackingDetails[0]?.identifier} onChange={e=>{const d=[...item.trackingDetails]; d[0]={...d[0], identifier: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
                              <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1">Expiry Control</label><input type="date" className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" value={item.trackingDetails[0]?.expiry} onChange={e=>{const d=[...item.trackingDetails]; d[0]={...d[0], expiry: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {item.trackingDetails.map((td, idx) => (
                                <div key={idx}><label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">Serial #{idx+1}</label><input className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500" value={td.identifier} onChange={e=>{const d=[...item.trackingDetails]; d[idx]={identifier: e.target.value}; updateItem(item.id, {trackingDetails: d})}}/></div>
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

            <div className="w-full xl:w-96 shrink-0 space-y-10">
              <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150 group-hover:scale-[1.8] transition-transform duration-700"><Calculator size={180}/></div>
                <div className="relative z-10 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-6">Payment Recognition</h3>
                  <div className="flex justify-between font-black uppercase text-xs text-slate-400"><span>Taxable Base</span><span className="text-white">₹{totals.taxable.toLocaleString()}</span></div>
                  <div className="flex justify-between font-black uppercase text-xs text-slate-400"><span>Consolidated GST</span><span className="text-white">₹{totals.gst.toLocaleString()}</span></div>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] font-black text-blue-500 uppercase mb-3">Voucher Grand Total</p>
                    <p className="text-4xl md:text-5xl font-black tracking-tighter">₹{totals.grand.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving || items.length === 0} className="w-full py-6 md:py-10 bg-blue-600 text-white rounded-[3rem] font-black text-lg md:text-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 group transition-transform active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={32}/> : <><Save size={24}/> Authorize Inward</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

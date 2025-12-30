import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Printer, CheckCircle2, ChevronDown, FileText, Loader2, Search, Package, Building2, Calculator, ShoppingCart, Camera, Sparkles } from 'lucide-react';
import { StockItem, Ledger } from '../types';
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
    const qty = item.qty || 0;
    const rate = item.rate || 0;
    const gstRate = item.gstRate || 0;
    const taxableAmount = Number((qty * rate).toFixed(2));
    const gstAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    const total = Number((taxableAmount + gstAmount).toFixed(2));
    return { ...item as PurchaseLineItem, qty, rate, gstRate, taxableAmount, gstAmount, total };
  };

  const totals = useMemo(() => {
    const taxable = items.reduce((s, i) => s + i.taxableAmount, 0);
    const gst = items.reduce((s, i) => s + i.gstAmount, 0);
    const grand = items.reduce((s, i) => s + i.total, 0);
    return { taxable, gst, grand };
  }, [items]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = () => {
    const newItem = calculateLine({ id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', qty: 1, rate: 0, gstRate: 18 });
    setItems([...items, newItem]);
    setTimeout(() => { setActiveSearchId(newItem.id); setSearchQuery(''); }, 50);
  };

  // AI BILL SCANNING LOGIC
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
              { text: `Extract data from this purchase invoice. Return ONLY JSON matching this structure: { "billNo": string, "vendorName": string, "items": Array<{ "name": string, "qty": number, "rate": number, "gstRate": number }> }. Try to map items to existing stock if possible. Context: ${JSON.stringify(store.stockItems.map((s:any) => ({id: s.id, name: s.name})))}` }
            ]
          }
        });

        let text = response.text || '{}';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(text);
        
        if (result.billNo) setVendor(v => ({ ...v, billNo: result.billNo }));
        
        if (result.items && Array.isArray(result.items)) {
          const newItems = result.items.map((aiItem: any) => {
            const matchedStock = store.stockItems.find((s: any) => 
              s.name.toLowerCase().includes(aiItem.name.toLowerCase()) ||
              aiItem.name.toLowerCase().includes(s.name.toLowerCase())
            );

            const base = {
              id: Math.random().toString(),
              itemId: matchedStock?.id || '',
              name: matchedStock?.name || aiItem.name,
              sku: matchedStock?.sku || 'AI-EXTRACTED',
              hsn: matchedStock?.hsn || '',
              qty: aiItem.qty || 1,
              rate: aiItem.rate || 0,
              gstRate: aiItem.gstRate || matchedStock?.gstRate || 18
            };
            return calculateLine(base);
          });
          setItems(newItems);
        }
      };
    } catch (err) {
      console.error("AI Scan Failed:", err);
      alert("AI Scan failed. Please enter details manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const updateItem = (id: string, updates: Partial<PurchaseLineItem>) => {
    setItems(items.map(i => {
      if (i.id === id) {
        let updated = { ...i, ...updates };
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) {
            updated.name = stock.name; updated.sku = stock.sku; updated.hsn = stock.hsn || '';
            updated.rate = stock.purchasePrice; updated.gstRate = stock.gstRate;
          }
        }
        return calculateLine(updated);
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
      alert("Validation Error: Please provide vendor bill number and select valid inventory items.");
      return;
    }
    setIsSaving(true);
    try {
      const inventory = items.map(i => ({ itemId: i.itemId, quantity: i.qty, rate: i.rate, amount: i.taxableAmount, type: 'In' as const }));
      const ledgerId = vendor.ledgerId || 'l-cash';
      const cgst = Number((totals.gst / 2).toFixed(2));
      const sgst = totals.gst - cgst;

      await store.addVoucher({
        number: `PUR-${vendor.billNo}`,
        date,
        type: 'Purchase',
        entries: [
          { ledgerId: 'l-purchase', debit: totals.taxable, credit: 0 },
          { ledgerId: 'l-cgst', debit: cgst, credit: 0 },
          { ledgerId: 'l-sgst', debit: sgst, credit: 0 },
          { ledgerId, debit: 0, credit: totals.grand }
        ],
        inventory,
        narration: `Inward procurement recorded. Bill #${vendor.billNo}.`,
        totalAmount: totals.grand,
        gstTotal: totals.gst
      });
      setIsSaved(true);
    } catch (err) {
      alert("Error posting purchase.");
    } finally {
      setIsSaving(false);
    }
  };

  const PurchasePrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 bg-white border-2 border-slate-900 font-inter">
      <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{store.company.name}</h1>
          <p className="text-xs font-bold text-slate-500 max-w-sm uppercase">{store.company.address}</p>
          <p className="text-xs font-black text-slate-900 mt-4 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter leading-none mb-6">Inward Bill</h2>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Vendor Invoice Ref</p>
            <p className="text-xl font-black font-mono tracking-tighter text-slate-900">{vendor.billNo}</p>
          </div>
        </div>
      </div>
      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-left bg-slate-50">
            <th className="py-4 px-4">Description</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Rate</th>
            <th className="py-4 text-right">GST</th>
            <th className="py-4 text-right pr-4">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-6 px-4">
                <p className="text-sm font-black text-slate-900 mb-1">{item.name}</p>
                <p className="text-[9px] font-black font-mono text-slate-400">SKU: {item.sku}</p>
              </td>
              <td className="py-6 text-center font-bold">{item.qty}</td>
              <td className="py-6 text-right font-mono">₹{item.rate.toLocaleString()}</td>
              <td className="py-6 text-right font-mono text-xs text-slate-500">{item.gstRate}%</td>
              <td className="py-6 text-right font-black pr-4">₹{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 bg-slate-50">
          <tr>
            <td colSpan={3} className="py-10 px-6 align-top">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Amount In Words</p>
              <p className="text-xs font-black italic max-w-xs">{numberToWords(totals.grand)}</p>
            </td>
            <td colSpan={2} className="py-10 px-8 text-right space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Taxable Amt</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.taxable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Total GST</span>
                <span className="text-blue-600 font-mono text-sm">₹{totals.gst.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-200 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Net Payable</span>
                <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{totals.grand.toLocaleString()}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {isSaved ? (
        <div className="flex flex-col items-center py-20">
          <div className="no-print text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl">
              <CheckCircle2 size={56} className="text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Purchase Successful</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => triggerPrint()} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all"><Printer size={24} /> Print Purchase Bill</button>
              <button onClick={onComplete} className="px-10 py-5 border border-slate-200 rounded-[2rem] font-black text-slate-600 hover:bg-slate-50 transition-all">Daybook</button>
            </div>
          </div>
          <PurchasePrintTemplate />
        </div>
      ) : (
        <div className="no-print space-y-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><ShoppingCart size={40} /></div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Purchase Bill Entry</h2>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1 opacity-70">Registering material inward for {store.company.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAIScan} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-3 px-8 py-4 bg-blue-50 text-blue-700 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all shadow-md group border-2 border-blue-200"
              >
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} className="animate-pulse" /> AI Scan Bill</>}
              </button>
              <button onClick={() => triggerPrint()} className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-[2rem] text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md">
                <Printer size={20} /> Print Draft
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-3 space-y-10">
              <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Vendor Invoice #</label>
                    <input type="text" className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-lg" placeholder="TAX-INV-001" value={vendor.billNo} onChange={e => setVendor({ ...vendor, billNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Vendor Account</label>
                    <div className="relative">
                      <select className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-900 appearance-none outline-none focus:ring-4 focus:ring-blue-500/10" value={vendor.ledgerId} onChange={e => setVendor({ ...vendor, ledgerId: e.target.value })}>
                        <option value="">Cash Purchase</option>
                        {store.ledgers.filter((l: Ledger) => l.group === 'Sundry Creditors').map((l: Ledger) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                      <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-950 text-white rounded-3xl"><Package size={28} /></div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Purchase Lines</h3>
                  </div>
                  <button onClick={handleAddItem} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all"><Plus size={24} /> Add SKU</button>
                </div>
                <div className="space-y-10">
                  {items.map(item => (
                    <div key={item.id} className="p-10 bg-slate-50/50 rounded-[3.5rem] border border-slate-100 space-y-10 relative group hover:bg-white hover:shadow-2xl transition-all duration-500" ref={activeSearchId === item.id ? searchRef : null}>
                      <div className="grid grid-cols-12 gap-10 items-end">
                        <div className="col-span-5 relative">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Product Master Search</label>
                          <input type="text" className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder={item.name || "Enter SKU..."} value={activeSearchId === item.id ? searchQuery : (item.name || '')} onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} onChange={e => setSearchQuery(e.target.value)} />
                          {activeSearchId === item.id && (
                            <div className="absolute left-0 right-0 top-full mt-5 bg-white border-2 border-slate-200 shadow-2xl rounded-[2.5rem] z-[100] max-h-72 overflow-y-auto p-3">
                              {filteredStock.map(s => (
                                <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full px-8 py-6 text-left border-b border-slate-50 hover:bg-blue-600 hover:text-white rounded-3xl transition-all font-black text-base">{s.name} ({s.sku})</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Qty</label>
                          <input type="number" className="w-full px-6 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-center outline-none" value={item.qty || ''} onChange={e => updateItem(item.id, { qty: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Cost Rate (₹)</label>
                          <input type="number" className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-right font-mono outline-none" value={item.rate || ''} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2 flex items-center justify-end pb-2">
                          <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={28} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 opacity-5 rotate-45 scale-125"><Calculator size={220} /></div>
                <div className="relative z-10">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-14 border-b border-slate-900 pb-8">Vendor Reconciliation</h3>
                  <div className="space-y-10">
                    <div className="flex justify-between items-center text-slate-400 font-black"><span className="text-sm uppercase tracking-widest">Taxable Value</span><span className="font-mono text-2xl text-white">₹{totals.taxable.toLocaleString()}</span></div>
                    <div className="flex justify-between items-center text-slate-400 font-black"><span className="text-sm uppercase tracking-widest">GST Total</span><span className="font-mono text-2xl text-blue-500">₹{totals.gst.toLocaleString()}</span></div>
                    <div className="h-px bg-slate-900 my-12"></div>
                    <div><p className="text-[11px] font-black text-blue-600 uppercase mb-4 tracking-widest">Net Payable</p><p className="text-7xl font-black text-white tracking-tighter">₹{totals.grand.toLocaleString()}</p></div>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving || items.length === 0} className="w-full py-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] font-black text-3xl flex items-center justify-center gap-5 transition-all shadow-[0_40px_80px_-20px_rgba(37,99,235,0.5)] group disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={40} /> : <><Save size={40} /> Finalize Procurement</>}
              </button>
            </div>
          </div>
          <PurchasePrintTemplate />
        </div>
      )}
    </div>
  );
};

export default Purchases;
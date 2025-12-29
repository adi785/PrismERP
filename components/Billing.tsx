import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, ArrowLeft, Package, User, Calculator, Search, X, ChevronDown, Loader2 } from 'lucide-react';
import { StockItem } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface BillingItem {
  id: string;
  itemId: string;
  name: string;
  sku: string;
  hsn: string;
  quantity: number;
  rate: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  amount: number; // Net amount after discount (before tax)
  totalWithTax: number;
}

const Billing: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [customer, setCustomer] = useState({ name: '', gstin: '', address: '' });
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [taxType, setTaxType] = useState<'Intra' | 'Inter'>('Intra');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const calculateLineItem = (item: BillingItem, currentTaxType: 'Intra' | 'Inter'): BillingItem => {
    const gross = (item.quantity || 0) * (item.rate || 0);
    let disc = item.discountType === 'percentage' ? (gross * (item.discountValue || 0)) / 100 : (item.discountValue || 0);
    const discountAmount = Number(disc.toFixed(2));
    const amount = Number((gross - discountAmount).toFixed(2));
    const cgstAmount = Number(((amount * (item.cgstRate || 0)) / 100).toFixed(2));
    const sgstAmount = Number(((amount * (item.sgstRate || 0)) / 100).toFixed(2));
    const igstAmount = Number(((amount * (item.igstRate || 0)) / 100).toFixed(2));
    const totalWithTax = Number((amount + (currentTaxType === 'Inter' ? igstAmount : (cgstAmount + sgstAmount))).toFixed(2));
    return { ...item, discountAmount, amount, cgstAmount, sgstAmount, igstAmount, totalWithTax };
  };

  useEffect(() => {
    const salesVouchers = store.vouchers.filter((v: any) => v.type === 'Sales');
    const nextNo = salesVouchers.length + 1;
    setInvoiceNo(`INV/${new Date().getFullYear()}/${nextNo.toString().padStart(4, '0')}`);
  }, [store.vouchers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = useMemo(() => {
    const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    const cgst = Number(items.reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2));
    const sgst = Number(items.reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2));
    const igst = Number(items.reduce((sum, item) => sum + item.igstAmount, 0).toFixed(2));
    const total = Number(items.reduce((sum, item) => sum + item.totalWithTax, 0).toFixed(2));
    return { subtotal, igst: taxType === 'Inter' ? igst : 0, cgst: taxType === 'Intra' ? cgst : 0, sgst: taxType === 'Intra' ? sgst : 0, total };
  }, [items, taxType]);

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', quantity: 1, rate: 0, discountType: 'percentage', discountValue: 0, discountAmount: 0, cgstRate: 9, sgstRate: 9, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, amount: 0, totalWithTax: 0 };
    setItems([...items, calculateLineItem(newItem, taxType)]);
    setTimeout(() => setActiveSearchId(newItem.id), 50);
  };

  const updateItem = (id: string, updates: Partial<BillingItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updated = { ...item, ...updates };
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) {
            updated.name = stock.name; updated.sku = stock.sku; updated.hsn = stock.hsn || ''; updated.rate = stock.salePrice;
            updated.cgstRate = stock.gstRate / 2; updated.sgstRate = stock.gstRate / 2; updated.igstRate = stock.gstRate;
          }
        }
        return calculateLineItem(updated, taxType);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!customer.name || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Validation Failed: Check customer name and items."); return;
    }
    setIsSaving(true);
    try {
      const taxEntries = taxType === 'Inter' ? [{ ledgerId: 'l-igst', debit: 0, credit: totals.igst }] : [{ ledgerId: 'l-cgst', debit: 0, credit: totals.cgst }, { ledgerId: 'l-sgst', debit: 0, credit: totals.sgst }];
      const entries = [{ ledgerId: 'l-cash', debit: totals.total, credit: 0 }, { ledgerId: 'l-sales', debit: 0, credit: totals.subtotal }, ...taxEntries];
      const inventory = items.map(item => ({ itemId: item.itemId, quantity: item.quantity, rate: item.rate, amount: item.amount, type: 'Out' as const }));
      await store.addVoucher({ number: invoiceNo, date, type: 'Sales', entries, inventory, narration: `Sales to ${customer.name}`, totalAmount: totals.total, gstTotal: taxType === 'Inter' ? totals.igst : (totals.cgst + totals.sgst) });
      setIsSaved(true);
    } catch (err) { alert("Failed to save."); } finally { setIsSaving(false); }
  };

  const InvoicePrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 bg-white border-2 border-slate-900">
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase">{store.company.name}</h1>
          <p className="text-sm font-bold text-slate-500 max-w-xs">{store.company.address}</p>
          <p className="text-xs font-mono font-bold mt-2">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-slate-100 uppercase mb-4 tracking-tighter">Tax Invoice</h2>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">INV NO: <span className="text-slate-900 font-mono text-base">{invoiceNo}</span></p>
            <p className="text-xs font-bold text-slate-400">DATE: <span className="text-slate-900 font-mono text-base">{date}</span></p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</p>
        <h3 className="text-xl font-black">{customer.name}</h3>
        <p className="text-sm font-medium text-slate-500">{customer.address}</p>
      </div>

      <table className="w-full mb-10">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-left">
            <th className="py-4">Description</th>
            <th className="py-4 text-center">HSN</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Rate</th>
            <th className="py-4 text-right pr-2">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx} className="text-sm">
              <td className="py-5 font-bold">{item.name}<p className="text-[10px] font-mono text-slate-400">{item.sku}</p></td>
              <td className="py-5 text-center font-mono text-xs">{item.hsn}</td>
              <td className="py-5 text-center">{item.quantity}</td>
              <td className="py-5 text-right font-mono">₹{item.rate.toLocaleString()}</td>
              <td className="py-5 text-right font-black pr-2">₹{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 bg-slate-50/50">
          <tr>
            <td colSpan={3} className="py-6 pl-4">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">In Words</p>
              <p className="text-xs font-black italic">{numberToWords(totals.total)}</p>
            </td>
            <td className="py-6 text-right font-black text-[10px] uppercase text-slate-400 pr-4">Taxable<br/>CGST<br/>SGST<br/>IGST<br/><span className="text-slate-900 text-sm">Total</span></td>
            <td className="py-6 text-right font-bold pr-2 font-mono">₹{totals.subtotal.toLocaleString()}<br/>₹{totals.cgst.toLocaleString()}<br/>₹{totals.sgst.toLocaleString()}<br/>₹{totals.igst.toLocaleString()}<br/><span className="text-2xl font-black text-blue-600">₹{totals.total.toLocaleString()}</span></td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-20 mt-32">
        <div className="text-center"><div className="w-full border-t border-slate-900 pt-3"><p className="text-[10px] font-black uppercase">Customer Signature</p></div></div>
        <div className="text-center"><div className="w-full border-t border-slate-900 pt-3"><p className="text-[10px] font-black uppercase">Authorized Signatory</p></div></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {isSaved ? (
        <div className="flex flex-col items-center py-20">
          <div className="no-print text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 mx-auto"><CheckCircle2 size={56} className="text-emerald-600" /></div>
            <h2 className="text-4xl font-black mb-10">Invoice posted successfully.</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => triggerPrint()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 shadow-xl"><Printer size={20} /> Print Invoice</button>
              <button onClick={onComplete} className="px-8 py-4 border border-slate-200 rounded-2xl font-black text-slate-600" >Back to Daybook</button>
            </div>
          </div>
          <InvoicePrintTemplate />
        </div>
      ) : (
        <div className="no-print space-y-8">
          <div className="flex justify-between items-center">
            <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Invoice Generator</h2><p className="text-slate-500 font-medium">Standard Sales Billing Workflow</p></div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setTaxType('Intra')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${taxType === 'Intra' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Intra-State</button>
              <button onClick={() => setTaxType('Inter')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${taxType === 'Inter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Inter-State</button>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Customer Name / Entity</label><input type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} /></div>
                  <div className="col-span-full"><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Full Billing Address</label><textarea className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} rows={2} /></div>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Invoiced Items</h3>
                  <button onClick={addItem} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"><Plus size={16} className="inline mr-1" /> Add Row</button>
                </div>
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl relative" ref={activeSearchId === item.id ? searchRef : null}>
                      <div className="col-span-6 relative">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Item Description</label>
                        <input type="text" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold" value={activeSearchId === item.id ? searchQuery : (item.name || '')} onFocus={() => setActiveSearchId(item.id)} onChange={e => setSearchQuery(e.target.value)} />
                        {activeSearchId === item.id && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 max-h-40 overflow-y-auto mt-1">
                            {store.stockItems.filter((s:any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any) => (
                              <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full p-2 text-left hover:bg-blue-50 text-xs font-bold">{s.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 block mb-1">Qty</label><input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center font-bold" value={item.quantity} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} /></div>
                      <div className="col-span-3"><label className="text-[10px] font-bold text-slate-400 block mb-1">Rate</label><input type="number" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right font-mono" value={item.rate} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} /></div>
                      <div className="col-span-1"><button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-rose-500 p-2"><Trash2 size={16} /></button></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-6">Total Impact</p>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-slate-400"><span>Taxable Value</span><span className="font-mono">₹{totals.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs text-slate-400"><span>Total GST</span><span className="font-mono">₹{(totals.cgst + totals.sgst + totals.igst).toLocaleString()}</span></div>
                  <div className="h-px bg-slate-800 my-4"></div>
                  <div><p className="text-[10px] text-blue-500 font-black mb-1">Payable</p><p className="text-4xl font-black">₹{totals.total.toLocaleString()}</p></div>
                </div>
              </div>
              <button onClick={handleSave} disabled={isSaving || items.length === 0} className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/20 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin mx-auto" /> : "Authorize & Post"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
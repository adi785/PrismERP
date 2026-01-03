
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, Package, User, Calculator, Search, ChevronDown, Loader2, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { StockItem } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface BillingItem {
  id: string; itemId: string; name: string; sku: string; hsn: string; quantity: number; rate: number; 
  discountType: 'percentage' | 'fixed'; discountValue: number; discountAmount: number;
  cgstRate: number; sgstRate: number; igstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number;
  amount: number; totalWithTax: number; availableStock: number;
}

const Billing: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [customer, setCustomer] = useState({ name: '', gstin: '', address: '' });
  const [items, setItems] = useState<BillingItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
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
    const taxSum = currentTaxType === 'Inter' ? igstAmount : (cgstAmount + sgstAmount);
    const totalWithTax = Number((amount + taxSum).toFixed(2));
    return { ...item, discountAmount, amount, cgstAmount, sgstAmount, igstAmount, totalWithTax };
  };

  useEffect(() => {
    if (items.length > 0) setItems(prev => prev.map(item => calculateLineItem(item, taxType)));
  }, [taxType]);

  const totals = useMemo(() => {
    const taxable = items.reduce((sum, item) => sum + item.amount, 0);
    const cgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    const gstTotal = taxType === 'Inter' ? igst : (cgst + sgst);
    const finalPayable = Math.round(taxable + gstTotal);
    const roundOff = Number((finalPayable - (taxable + gstTotal)).toFixed(2));
    const hasDeficit = items.some(i => i.itemId && i.quantity > i.availableStock);
    return { taxable, cgst, sgst, igst, gstTotal, roundOff, total: finalPayable, hasDeficit };
  }, [items, taxType]);

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', quantity: 1, rate: 0, discountType: 'percentage', discountValue: 0, discountAmount: 0, cgstRate: 9, sgstRate: 9, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, amount: 0, totalWithTax: 0, availableStock: 0 };
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
            updated.name = stock.name; updated.sku = stock.sku; updated.hsn = stock.hsn || ''; 
            updated.rate = stock.salePrice; updated.cgstRate = stock.gstRate / 2; 
            updated.sgstRate = stock.gstRate / 2; updated.igstRate = stock.gstRate;
            updated.availableStock = stock.currentStock;
          }
        }
        return calculateLineItem(updated, taxType);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!customer.name || items.length === 0) return alert("Select customer and items.");
    setIsSaving(true);
    try {
      const inventory = items.map(i => ({ itemId: i.itemId, quantity: i.quantity, rate: i.rate, amount: i.amount, type: 'Out' as const }));
      await store.addVoucher({
        number: invoiceNo, date, type: 'Sales', 
        entries: [
          { ledgerId: 'l-cash', debit: totals.total, credit: 0 }, 
          { ledgerId: 'l-sales', debit: 0, credit: totals.taxable },
          { ledgerId: 'l-cgst', debit: 0, credit: totals.cgst },
          { ledgerId: 'l-sgst', debit: 0, credit: totals.sgst }
        ],
        inventory, narration: `Sales to ${customer.name}`, totalAmount: totals.total, gstTotal: totals.gst
      });
      setIsSaved(true);
    } catch (e:any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const InvoicePrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto p-12 bg-white border-2 border-slate-900 font-inter text-slate-900">
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{store.company.name}</h1>
          <p className="text-xs font-bold text-slate-500 mt-2 uppercase">{store.company.address}</p>
          <p className="text-xs font-black mt-2 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-8 py-2.5 text-sm font-black uppercase tracking-[0.3em] mb-4">Tax Invoice</div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Invoice Number</p>
            <p className="text-lg font-black font-mono">{invoiceNo}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Dated</p>
            <p className="text-sm font-black">{date}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bill To:</h3>
          <p className="text-base font-black uppercase">{customer.name}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">{customer.address || 'Address not specified'}</p>
          {customer.gstin && <p className="text-xs font-black mt-2 uppercase">GSTIN: {customer.gstin}</p>}
        </div>
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Supply Details:</h3>
          <p className="text-xs font-bold">State of Supply: <span className="font-black uppercase">{taxType === 'Intra' ? 'Same State' : 'Inter-State'}</span></p>
          <p className="text-xs font-bold mt-1">Payment Mode: <span className="font-black">CASH/CREDIT</span></p>
        </div>
      </div>

      <table className="w-full mb-10">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[9px] font-black uppercase tracking-widest bg-slate-50">
            <th className="py-4 px-4 text-left">Description of Goods</th>
            <th className="py-4 text-center">HSN</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Rate</th>
            <th className="py-4 text-right">GST</th>
            <th className="py-4 text-right pr-4">Amount (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-4 px-4">
                <p className="text-sm font-black uppercase">{item.name}</p>
                <p className="text-[9px] text-slate-400 font-mono">SKU: {item.sku}</p>
              </td>
              <td className="py-4 text-center text-xs font-mono">{item.hsn}</td>
              <td className="py-4 text-center text-sm font-bold">{item.quantity}</td>
              <td className="py-4 text-right text-sm font-mono">{item.rate.toLocaleString()}</td>
              <td className="py-4 text-right text-[10px] font-bold text-slate-500">{taxType === 'Inter' ? item.igstRate : (item.cgstRate + item.sgstRate)}%</td>
              <td className="py-4 text-right text-sm font-black pr-4">{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 bg-slate-50">
          <tr>
            <td colSpan={4} className="py-8 px-6 align-top">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Invoice Amount in Words</p>
              <p className="text-xs font-black italic max-w-xs">{numberToWords(totals.total)}</p>
            </td>
            <td colSpan={2} className="py-8 px-8 text-right space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Taxable Value</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.taxable.toLocaleString()}</span>
              </div>
              {taxType === 'Intra' ? (
                <>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>CGST</span>
                    <span className="text-slate-900 font-mono text-sm">₹{totals.cgst.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>SGST</span>
                    <span className="text-slate-900 font-mono text-sm">₹{totals.sgst.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>IGST</span>
                  <span className="text-slate-900 font-mono text-sm">₹{totals.igst.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Round Off</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.roundOff}</span>
              </div>
              <div className="h-px bg-slate-200 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Invoice</span>
                <span className="text-4xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-20 mt-20">
        <div className="text-center pt-8 border-t border-slate-200">
          <p className="text-[10px] font-black uppercase text-slate-400">Receiver's Signature</p>
        </div>
        <div className="text-center pt-8 border-t-2 border-slate-900">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-8">For {store.company.name}</p>
          <p className="text-[10px] font-black uppercase">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="flex flex-col items-center py-10 md:py-20 animate-in zoom-in-95 duration-500">
        <div className="no-print flex flex-col items-center">
          <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
          <h2 className="text-3xl font-black mb-10 text-center text-slate-900 dark:text-white">Invoice Generated Successfully</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => triggerPrint()} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all"><Printer size={20} /> Print Tax Invoice</button>
            <button onClick={onComplete} className="px-10 py-5 border border-slate-200 rounded-[2rem] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Go to Daybook</button>
          </div>
        </div>
        <InvoicePrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl"><FileText size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sales Invoicing</h2>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tax Compliant Gateway</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm w-full sm:w-auto">
          <button onClick={() => setTaxType('Intra')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taxType === 'Intra' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Intra-State</button>
          <button onClick={() => setTaxType('Inter')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taxType === 'Inter' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Inter-State</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
        <div className="lg:col-span-3 space-y-6 md:space-y-10">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={20} />
                  <input type="text" placeholder="Legal name of client..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">GSTIN</label>
                <input type="text" placeholder="Optional" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold uppercase text-slate-900 dark:text-white" value={customer.gstin} onChange={e => setCustomer({...customer, gstin: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Invoice Ref</label>
                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">Billing Units</h3>
              <button onClick={addItem} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20"><Plus size={16} /> Add Line</button>
            </div>

            <div className="space-y-6">
              {items.map(item => (
                <div key={item.id} className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 relative group transition-all" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-end">
                    <div className="md:col-span-6 relative">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Select Item</label>
                      <input 
                        type="text" className="w-full px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white" 
                        placeholder={item.name || "Search SKU..."} value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                        onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} onChange={e => setSearchQuery(e.target.value)} 
                      />
                      {activeSearchId === item.id && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 max-h-60 overflow-y-auto p-2">
                          {store.stockItems.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s: any) => (
                            <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full px-4 py-3 text-left hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold truncate dark:text-slate-200">
                              {s.name} (Stock: {s.currentStock})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:col-span-5 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Qty</label>
                        <input type="number" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-center text-slate-900 dark:text-white" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Rate</label>
                        <input type="number" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-right text-slate-900 dark:text-white" value={item.rate || ''} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                  {item.itemId && item.quantity > item.availableStock && (
                    <div className="mt-3 flex items-center gap-2 text-rose-600 font-black text-[9px] uppercase"><AlertCircle size={14} /> Shortage: {item.availableStock} in stock</div>
                  )}
                </div>
              ))}
              {items.length === 0 && <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">No items added to invoice</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 border-b border-white/5 pb-6">Payment Summary</h3>
            <div className="space-y-6">
              <SummaryLine label="Taxable Amt" val={totals.taxable} />
              <SummaryLine label="GST Components" val={totals.gstTotal} highlight="text-blue-400" />
              <SummaryLine label="Round Off" val={totals.roundOff} />
              <div className="h-px bg-white/10 my-6"></div>
              <div>
                <p className="text-[9px] font-black text-blue-500 uppercase mb-2">Total Due</p>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave} disabled={isSaving || items.length === 0 || totals.hasDeficit} 
            className="w-full py-6 md:py-10 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] md:rounded-[3rem] font-black text-xl md:text-2xl shadow-2xl transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Finalize Sale'}
          </button>
        </div>
      </div>
      <InvoicePrintTemplate />
    </div>
  );
};

const SummaryLine = ({ label, val, highlight = "text-white" }: any) => (
  <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest">
    <span>{label}</span>
    <span className={`font-mono text-sm ${highlight}`}>₹{val.toLocaleString()}</span>
  </div>
);

export default Billing;

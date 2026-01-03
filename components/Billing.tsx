
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, Package, User, Calculator, Search, ChevronDown, Loader2, FileText, AlertCircle } from 'lucide-react';
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
    return { taxable, gstTotal, roundOff, total: finalPayable, hasDeficit };
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
        number: invoiceNo || `INV-${Date.now()}`, date, type: 'Sales', 
        entries: [{ ledgerId: 'l-cash', debit: totals.total, credit: 0 }, { ledgerId: 'l-sales', debit: 0, credit: totals.taxable }],
        inventory, narration: `Sales to ${customer.name}`, totalAmount: totals.total, gstTotal: totals.gstTotal
      });
      setIsSaved(true);
    } catch (e:any) { alert(e.message); } finally { setIsSaving(false); }
  };

  if (isSaved) {
    return (
      <div className="flex flex-col items-center py-10 md:py-20 animate-in zoom-in-95 duration-500">
        <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
        <h2 className="text-3xl font-black mb-10 text-center">Invoice Generated</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => triggerPrint()} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3"><Printer size={20} /> Print Invoice</button>
          <button onClick={onComplete} className="px-10 py-5 border border-slate-200 rounded-[2rem] font-black text-slate-600">Daybook</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl"><FileText size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Sales Invoicing</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Compliant Gateway</p>
          </div>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-full sm:w-auto">
          <button onClick={() => setTaxType('Intra')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taxType === 'Intra' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Intra-State</button>
          <button onClick={() => setTaxType('Inter')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taxType === 'Inter' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Inter-State</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
        <div className="lg:col-span-3 space-y-6 md:space-y-10">
          {/* Customer Card */}
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="Legal name of client..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">GSTIN</label>
                <input type="text" placeholder="Optional" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm font-bold uppercase" value={customer.gstin} onChange={e => setCustomer({...customer, gstin: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Invoice Ref</label>
                <input type="text" disabled className="w-full px-6 py-4 rounded-2xl bg-slate-100 border border-slate-200 font-mono text-sm font-bold text-slate-400" value={invoiceNo || 'Auto-generated'} />
              </div>
            </div>
          </div>

          {/* Line Items - Fully Responsive Card Stack */}
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">Billing Units</h3>
              <button onClick={addItem} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20"><Plus size={16} /> Add Line</button>
            </div>

            <div className="space-y-6">
              {items.map(item => (
                <div key={item.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group transition-all" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-end">
                    <div className="md:col-span-6 relative">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Select Item</label>
                      <input 
                        type="text" className="w-full px-5 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm" 
                        placeholder={item.name || "Search SKU..."} value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                        onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} onChange={e => setSearchQuery(e.target.value)} 
                      />
                      {activeSearchId === item.id && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 max-h-60 overflow-y-auto p-2">
                          {store.stockItems.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s: any) => (
                            <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full px-4 py-3 text-left hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold truncate">
                              {s.name} (Stock: {s.currentStock})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:col-span-5 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Qty</label>
                        <input type="number" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-center" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Rate</label>
                        <input type="number" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 font-bold text-sm text-right" value={item.rate || ''} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                  {item.itemId && item.quantity > item.availableStock && (
                    <div className="mt-3 flex items-center gap-2 text-rose-600 font-black text-[9px] uppercase"><AlertCircle size={14} /> Shortage: {item.availableStock} in stock</div>
                  )}
                </div>
              ))}
              {items.length === 0 && <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">No items added to invoice</p>}
            </div>
          </div>
        </div>

        {/* Floating/Stacked Summary Card */}
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

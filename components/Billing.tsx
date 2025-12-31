import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, ArrowLeft, Package, User, Calculator, Search, X, ChevronDown, Loader2, FileText, ShieldCheck, IndianRupee, AlertCircle, Percent, Banknote } from 'lucide-react';
import { StockItem, VoucherEntry } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface BillingItem {
  id: string;
  itemId: string;
  name: string;
  sku: string;
  hsn: string;
  quantity: number;
  rate: number;
  mrp: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  amount: number; 
  totalWithTax: number;
  availableStock: number;
}

const Billing: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [customer, setCustomer] = useState({ name: '', gstin: '', address: '', pan: '' });
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
    let disc = item.discountType === 'percentage' 
      ? (gross * (item.discountValue || 0)) / 100 
      : (item.discountValue || 0);
    
    const discountAmount = Number(disc.toFixed(2));
    const amount = Number((gross - discountAmount).toFixed(2));
    
    // CGST/SGST/IGST breakdown
    const cgstAmount = Number(((amount * (item.cgstRate || 0)) / 100).toFixed(2));
    const sgstAmount = Number(((amount * (item.sgstRate || 0)) / 100).toFixed(2));
    const igstAmount = Number(((amount * (item.igstRate || 0)) / 100).toFixed(2));
    
    const taxSum = currentTaxType === 'Inter' ? igstAmount : (cgstAmount + sgstAmount);
    const totalWithTax = Number((amount + taxSum).toFixed(2));
    
    return { ...item, discountAmount, amount, cgstAmount, sgstAmount, igstAmount, totalWithTax };
  };

  // EFFECT: Recalculate all tax components when taxType changes
  useEffect(() => {
    if (items.length > 0) {
      setItems(prevItems => prevItems.map(item => calculateLineItem(item, taxType)));
    }
  }, [taxType]);

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
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const discount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxable = items.reduce((sum, item) => sum + item.amount, 0);
    const cgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    
    const gstTotal = taxType === 'Inter' ? igst : (cgst + sgst);
    
    // ACCURATE PAYABLE LOGIC: Round the final sum, then calculate Round-off ledger entry
    const totalBeforeRounding = Number((taxable + gstTotal).toFixed(2));
    const finalPayable = Math.round(totalBeforeRounding);
    const roundOff = Number((finalPayable - totalBeforeRounding).toFixed(2));

    const hasDeficit = items.some(i => i.itemId && i.quantity > i.availableStock);

    return { 
      subtotal: Number(subtotal.toFixed(2)), 
      discount: Number(discount.toFixed(2)), 
      taxable: Number(taxable.toFixed(2)), 
      igst: Number(igst.toFixed(2)), 
      cgst: Number(cgst.toFixed(2)), 
      sgst: Number(sgst.toFixed(2)), 
      gstTotal: Number(gstTotal.toFixed(2)),
      roundOff,
      total: finalPayable,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0), 
      hasDeficit 
    };
  }, [items, taxType]);

  const addItem = () => {
    const newItem: BillingItem = { 
      id: Date.now().toString(), 
      itemId: '', 
      name: '', 
      sku: '', 
      hsn: '', 
      quantity: 1, 
      mrp: 0, 
      rate: 0, 
      discountType: 'percentage', 
      discountValue: 0, 
      discountAmount: 0, 
      cgstRate: 9, 
      sgstRate: 9, 
      igstRate: 18, 
      cgstAmount: 0, 
      sgstAmount: 0, 
      igstAmount: 0, 
      amount: 0, 
      totalWithTax: 0, 
      availableStock: 0 
    };
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
            updated.name = stock.name; 
            updated.sku = stock.sku; 
            updated.hsn = stock.hsn || ''; 
            updated.rate = stock.salePrice; 
            updated.mrp = stock.salePrice * 1.2; 
            updated.cgstRate = stock.gstRate / 2; 
            updated.sgstRate = stock.gstRate / 2; 
            updated.igstRate = stock.gstRate;
            updated.availableStock = stock.currentStock;
          }
        }
        return calculateLineItem(updated, taxType);
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (totals.hasDeficit) {
      alert("Inventory Shortage: You cannot authorize a sale exceeding current stock levels.");
      return;
    }
    if (!customer.name || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Validation Error: Please provide customer name and select items.");
      return;
    }

    setIsSaving(true);
    try {
      // Fix: Property 'qty' does not exist on type 'BillingItem'. Using 'quantity' instead.
      const inventory = items.map(i => ({ 
        itemId: i.itemId, 
        quantity: i.quantity, 
        rate: i.rate, 
        amount: i.amount, 
        type: 'Out' as const 
      }));

      // Construction of Balanced Voucher Entry
      const entries: any[] = [
        { ledgerId: 'l-cash', debit: totals.total, credit: 0 },
        { ledgerId: 'l-sales', debit: 0, credit: totals.taxable }
      ];

      // Round-off Handling
      if (totals.roundOff !== 0) {
        entries.push({
          ledgerId: 'l-roundoff',
          debit: totals.roundOff < 0 ? Math.abs(totals.roundOff) : 0,
          credit: totals.roundOff > 0 ? totals.roundOff : 0
        });
      }

      // GST Segregation
      if (taxType === 'Inter') {
        entries.push({ ledgerId: 'l-igst', debit: 0, credit: totals.igst });
      } else {
        entries.push({ ledgerId: 'l-cgst', debit: 0, credit: totals.cgst });
        entries.push({ ledgerId: 'l-sgst', debit: 0, credit: totals.sgst });
      }

      await store.addVoucher({
        number: invoiceNo,
        date,
        type: 'Sales',
        entries,
        inventory,
        narration: `Sales to ${customer.name}. Inv #${invoiceNo}`,
        totalAmount: totals.total,
        gstTotal: totals.gstTotal
      });
      setIsSaved(true);
    } catch (err: any) {
      alert("Billing Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStock = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return store.stockItems.filter((s: StockItem) => 
      s.name.toLowerCase().includes(query) || s.sku.toLowerCase().includes(query)
    );
  }, [store.stockItems, searchQuery]);

  const InvoicePrintTemplate = () => (
    <div className="print-only w-full max-w-5xl mx-auto p-12 bg-white border-2 border-slate-900 font-inter">
      <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">{store.company.name}</h1>
          <p className="text-xs font-bold text-slate-500 max-w-sm uppercase">{store.company.address}</p>
          <p className="text-xs font-black text-slate-900 mt-4 uppercase tracking-widest">GSTIN: {store.company.gstin}</p>
        </div>
        <div className="text-right">
          <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter leading-none mb-6">Tax Invoice</h2>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase">Invoice Number</p>
            <p className="text-xl font-black font-mono tracking-tighter text-slate-900">{invoiceNo}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mb-12">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Bill To</p>
          <p className="text-lg font-black text-slate-900 mb-1">{customer.name}</p>
          <p className="text-xs font-medium text-slate-500 mb-2">{customer.address || 'Address not provided'}</p>
          <p className="text-xs font-black text-slate-900">GSTIN: {customer.gstin || 'UNREGISTERED'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Invoice Details</p>
          <p className="text-xs font-bold text-slate-700">Date: {date}</p>
          <p className="text-xs font-bold text-slate-700">Place of Supply: {taxType === 'Inter' ? 'OUT OF STATE' : 'INTRA-STATE'}</p>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest text-left bg-slate-50">
            <th className="py-4 px-4">Description</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Rate</th>
            <th className="py-4 text-right pr-4">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-6 px-4">
                <p className="text-sm font-black text-slate-900 mb-1">{item.name}</p>
                <p className="text-[9px] font-black font-mono text-slate-400">SKU: {item.sku}</p>
              </td>
              <td className="py-6 text-center font-bold">{item.quantity}</td>
              <td className="py-6 text-right font-mono">₹{item.rate.toLocaleString()}</td>
              <td className="py-6 text-right font-black pr-4">₹{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 bg-slate-50">
          <tr>
            <td colSpan={2} className="py-10 px-6 align-top">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Amount In Words</p>
              <p className="text-xs font-black italic max-w-xs">{numberToWords(totals.total)}</p>
            </td>
            <td colSpan={2} className="py-10 px-8 text-right space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>Taxable Value</span>
                <span className="text-slate-900 font-mono text-sm">₹{totals.taxable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span>GST Total</span>
                <span className="text-blue-600 font-mono text-sm">₹{totals.gstTotal.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-200 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Net Payable</span>
                <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{totals.total.toLocaleString()}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-2 gap-20 mt-32">
        <div className="text-center pt-8 border-t border-slate-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receiver's Signature</p>
        </div>
        <div className="text-center pt-8 border-t-2 border-slate-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Authorized Signatory</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">FOR {store.company.name}</p>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="no-print text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl">
            <CheckCircle2 size={56} className="text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Invoice Generated</h2>
          <div className="flex gap-4 justify-center">
            <button onClick={() => triggerPrint()} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all"><Printer size={24} /> Print Tax Invoice</button>
            <button onClick={onComplete} className="px-10 py-5 border border-slate-200 rounded-[2rem] font-black text-slate-600 hover:bg-slate-50 transition-all">Go to Daybook</button>
          </div>
        </div>
        <InvoicePrintTemplate />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl"><FileText size={40} /></div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Sales Invoicing</h2>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1 opacity-70">Tax Compliant Billing Interface</p>
          </div>
        </div>
        <div className="flex bg-white border-2 border-slate-200 p-2 rounded-[1.5rem] shadow-sm">
          <button 
            onClick={() => setTaxType('Intra')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Intra' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Intra-State
          </button>
          <button 
            onClick={() => setTaxType('Inter')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Inter' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Inter-State
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="col-span-full">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                  <input 
                    type="text" 
                    placeholder="Enter customer legal name..."
                    className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-lg" 
                    value={customer.name} 
                    onChange={e => setCustomer({...customer, name: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Invoice Number</label>
                <input 
                  type="text" 
                  disabled
                  className="w-full px-8 py-6 rounded-[2rem] bg-slate-100 border-2 border-slate-100 font-mono text-base font-black uppercase text-slate-400" 
                  value={invoiceNo} 
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Customer GSTIN</label>
                <input 
                  type="text" 
                  placeholder="27AAACP1234A1Z5"
                  className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-mono text-base font-black uppercase text-slate-900 outline-none" 
                  value={customer.gstin} 
                  onChange={e => setCustomer({...customer, gstin: e.target.value.toUpperCase()})} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-950 text-white rounded-3xl"><Package size={28} /></div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Billing Items</h3>
              </div>
              <button onClick={addItem} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all"><Plus size={24} /> Add Line</button>
            </div>

            <div className="space-y-10">
              {items.map(item => (
                <div key={item.id} className="p-10 bg-slate-50/50 rounded-[3.5rem] border border-slate-100 space-y-10 relative group hover:bg-white hover:shadow-2xl transition-all duration-500" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-12 gap-10 items-end">
                    <div className="col-span-5 relative">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Product Search</label>
                      <input 
                        type="text" 
                        className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                        placeholder={item.name || "Start typing SKU or name..."}
                        value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                        onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} 
                        onChange={e => setSearchQuery(e.target.value)} 
                      />
                      {activeSearchId === item.id && (
                        <div className="absolute left-0 right-0 top-full mt-5 bg-white border-2 border-slate-200 shadow-2xl rounded-[2.5rem] z-[100] max-h-72 overflow-y-auto p-3">
                          {filteredStock.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} 
                              className="w-full px-8 py-6 text-left border-b border-slate-50 hover:bg-blue-600 hover:text-white rounded-3xl transition-all font-black text-base"
                            >
                              <p>{s.name}</p>
                              <p className="text-[10px] uppercase font-black opacity-50">Stock: {s.currentStock} {s.unit}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Qty</label>
                      <input 
                        type="number" 
                        className={`w-full px-6 py-6 rounded-2xl bg-white border-2 font-black text-base text-center outline-none ${item.itemId && item.quantity > item.availableStock ? 'border-rose-500 bg-rose-50' : 'border-slate-100'}`} 
                        value={item.quantity || ''} 
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} 
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 text-right">Sale Rate (₹)</label>
                      <input 
                        type="number" 
                        className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-right font-mono outline-none" 
                        value={item.rate || ''} 
                        onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} 
                      />
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
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-14 border-b border-slate-900 pb-8">Financial Summary</h3>
              <div className="space-y-10">
                <div className="flex justify-between items-center text-slate-400 font-black">
                  <span className="text-sm uppercase tracking-widest">Taxable Value</span>
                  <span className="font-mono text-2xl text-white">₹{totals.taxable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-black">
                  <span className="text-sm uppercase tracking-widest">GST Amount</span>
                  <span className="font-mono text-2xl text-blue-500">₹{totals.gstTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 font-black">
                  <span className="text-sm uppercase tracking-widest">Round Off</span>
                  <span className={`font-mono text-2xl ${totals.roundOff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{totals.roundOff.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-slate-900 my-12"></div>
                <div>
                  <p className="text-[11px] font-black text-blue-600 uppercase mb-4 tracking-widest">Total Payable</p>
                  <p className="text-7xl font-black text-white tracking-tighter">₹{totals.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving || items.length === 0 || totals.hasDeficit} 
            className="w-full py-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] font-black text-3xl flex items-center justify-center gap-5 transition-all shadow-[0_40px_80px_-20px_rgba(37,99,235,0.5)] group disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={40} /> : totals.hasDeficit ? 'Stock Deficit' : <><Save size={40} /> Finalize Invoice</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;
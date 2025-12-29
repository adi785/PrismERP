import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Printer, Mail, MessageCircle, Save, CheckCircle2, ArrowLeft, Package, User, Hash, Calculator, Building2, Globe, MapPin, Percent, IndianRupee } from 'lucide-react';
import { StockItem } from '../types';
import { triggerPrint } from '../utils/exportUtils';

interface BillingItem {
  id: string;
  itemId: string;
  name: string;
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
  const [invoiceNo, setInvoiceNo] = useState('');
  const [taxType, setTaxType] = useState<'Intra' | 'Inter'>('Intra');
  const [date] = useState(new Date().toISOString().split('T')[0]);

  // Generate Sequential Invoice Number
  useEffect(() => {
    const salesVouchers = store.vouchers.filter((v: any) => v.type === 'Sales');
    const nextNo = salesVouchers.length + 1;
    setInvoiceNo(`INV/${new Date().getFullYear()}/${nextNo.toString().padStart(4, '0')}`);
  }, [store.vouchers]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const cgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    
    // Calculate total by summing up individual line item totals to ensure precision
    const total = items.reduce((sum, item) => sum + item.totalWithTax, 0);
    
    return {
      subtotal,
      totalDiscount,
      igst: taxType === 'Inter' ? igst : 0,
      cgst: taxType === 'Intra' ? cgst : 0,
      sgst: taxType === 'Intra' ? sgst : 0,
      total
    };
  }, [items, taxType]);

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      itemId: '', 
      name: '', 
      quantity: 1, 
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
      totalWithTax: 0
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<BillingItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let updated = { ...item, ...updates };
        
        // Auto-fetch data from Stock Master if itemId changes
        if (updates.itemId) {
          const stock = store.stockItems.find((s: StockItem) => s.id === updates.itemId);
          if (stock) {
            updated.name = stock.name;
            updated.rate = stock.salePrice;
            updated.cgstRate = stock.gstRate / 2;
            updated.sgstRate = stock.gstRate / 2;
            updated.igstRate = stock.gstRate;
          }
        }
        
        // Calculate Line Totals
        const gross = updated.quantity * updated.rate;
        let disc = 0;
        if (updated.discountType === 'percentage') {
          disc = (gross * updated.discountValue) / 100;
        } else {
          disc = updated.discountValue;
        }
        
        updated.discountAmount = disc;
        updated.amount = gross - disc;

        // Calculate Tax Amounts based on (possibly edited) Rates
        updated.cgstAmount = (updated.amount * updated.cgstRate) / 100;
        updated.sgstAmount = (updated.amount * updated.sgstRate) / 100;
        updated.igstAmount = (updated.amount * updated.igstRate) / 100;

        // Update Total With Tax
        updated.totalWithTax = updated.amount + (taxType === 'Inter' ? updated.igstAmount : (updated.cgstAmount + updated.sgstAmount));
        
        return updated;
      }
      return item;
    }));
  };

  // Switch between Intra/Inter calculation
  useEffect(() => {
    setItems(prevItems => prevItems.map(item => {
      const cgst = (item.amount * item.cgstRate) / 100;
      const sgst = (item.amount * item.sgstRate) / 100;
      const igst = (item.amount * item.igstRate) / 100;
      return {
        ...item,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalWithTax: item.amount + (taxType === 'Inter' ? igst : (cgst + sgst))
      };
    }));
  }, [taxType]);

  const handleSave = async () => {
    if (!customer.name || items.length === 0 || items.some(i => !i.itemId)) {
      alert("Please provide customer name and select at least one item.");
      return;
    }

    const taxEntries = taxType === 'Inter' 
      ? [{ ledgerId: 'l-igst', debit: 0, credit: totals.igst }]
      : [
          { ledgerId: 'l-cgst', debit: 0, credit: totals.cgst },
          { ledgerId: 'l-sgst', debit: 0, credit: totals.sgst }
        ];

    const entries = [
      { ledgerId: 'l-cash', debit: totals.total, credit: 0 },
      { ledgerId: 'l-sales', debit: 0, credit: totals.subtotal },
      ...taxEntries
    ];

    await store.addVoucher({
      number: invoiceNo,
      date,
      type: 'Sales',
      entries,
      narration: `Invoice ${invoiceNo} issued to ${customer.name} (${taxType}-State). Net: ₹${totals.total.toLocaleString()}`,
      totalAmount: totals.total,
      gstTotal: taxType === 'Inter' ? totals.igst : (totals.cgst + totals.sgst)
    });

    setIsSaved(true);
  };

  const handleWhatsApp = () => {
    const message = `Hello ${customer.name},\n\nAttached is your Invoice ${invoiceNo} from ${store.company.name}.\nTotal Amount: ₹${totals.total.toLocaleString()}\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmail = () => {
    const subject = `Invoice ${invoiceNo} from ${store.company.name}`;
    const body = `Dear ${customer.name},\n\nPlease find your invoice details below:\nInvoice No: ${invoiceNo}\nDate: ${date}\nTotal: ₹${totals.total.toLocaleString()}\n\nRegards,\n${store.company.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const InvoicePrintView = () => (
    <div className="print-only w-full p-8 border border-slate-200 bg-white min-h-screen">
      <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">{store.company.name}</h1>
          <p className="text-sm font-medium text-slate-500 max-w-xs leading-relaxed">{store.company.address}</p>
          <div className="mt-4 p-2 bg-slate-50 inline-block rounded">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business GSTIN</p>
            <p className="text-xs font-bold text-slate-900">{store.company.gstin}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter mb-4">TAX INVOICE</h2>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">INVOICE NO: <span className="text-slate-900 font-mono text-sm">{invoiceNo}</span></p>
            <p className="text-xs font-bold text-slate-400">DATE: <span className="text-slate-900 font-mono text-sm">{date}</span></p>
            <p className="text-[10px] font-black text-blue-600 uppercase mt-2">{taxType === 'Inter' ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12 py-8 bg-slate-50/30 px-6 rounded-3xl">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bill To Customer</p>
          <h3 className="text-xl font-bold text-slate-900 mb-1">{customer.name || 'Walk-in Customer'}</h3>
          <p className="text-sm text-slate-500 mb-3">{customer.address || 'Address not provided'}</p>
          {customer.gstin && (
            <div className="text-xs font-bold text-slate-700 bg-white p-2 border border-slate-100 rounded inline-block">
              GSTIN: <span className="font-mono">{customer.gstin}</span>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col justify-end">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Place of Supply</p>
          <p className="text-sm font-bold text-slate-900">{taxType === 'Inter' ? 'Out of State' : 'Within Registered State'}</p>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="py-4 text-left">Particulars / Description</th>
            <th className="py-4 text-center">Qty</th>
            <th className="py-4 text-right">Rate</th>
            <th className="py-4 text-right">Disc.</th>
            <th className="py-4 text-center">Tax Split</th>
            <th className="py-4 text-right">Row Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx} className="text-sm">
              <td className="py-5 font-bold text-slate-800">
                {item.name}
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">HSN Code tracked: Service/Goods</p>
              </td>
              <td className="py-5 text-center font-bold">{item.quantity}</td>
              <td className="py-5 text-right font-mono text-slate-600">₹{item.rate.toLocaleString()}</td>
              <td className="py-5 text-right font-mono text-rose-500">
                {item.discountAmount > 0 ? `-₹${item.discountAmount.toLocaleString()}` : '0.00'}
              </td>
              <td className="py-5 text-center text-[10px] font-bold text-slate-500">
                {taxType === 'Inter' ? (
                  <div className="leading-tight">
                    <p>IGST {item.igstRate}%</p>
                    <p className="text-slate-800">₹{item.igstAmount.toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="leading-tight">
                    <p>C {item.cgstRate}% + S {item.sgstRate}%</p>
                    <p className="text-slate-800">₹{(item.cgstAmount + item.sgstAmount).toFixed(2)}</p>
                  </div>
                )}
              </td>
              <td className="py-5 text-right font-black text-slate-900 font-mono">₹{item.totalWithTax.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900">
            <td colSpan={4} className="py-6"></td>
            <td className="py-6 text-right">
              <div className="space-y-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">
                <p>Taxable Subtotal</p>
                <p className="text-emerald-600">Total Discounts</p>
                {taxType === 'Inter' ? (
                  <p>IGST Payable</p>
                ) : (
                  <>
                    <p>CGST Payable</p>
                    <p>SGST Payable</p>
                  </>
                )}
                <div className="h-px bg-slate-100 my-2"></div>
                <p className="text-lg text-slate-900 font-black pt-2">Net Invoice Total</p>
              </div>
            </td>
            <td className="py-6 text-right border-l border-slate-50 pl-6">
              <div className="space-y-3 text-sm font-bold text-slate-900 font-mono">
                <p>₹{totals.subtotal.toLocaleString()}</p>
                <p className="text-emerald-600">₹{totals.totalDiscount.toLocaleString()}</p>
                {taxType === 'Inter' ? (
                  <p>₹{totals.igst.toLocaleString()}</p>
                ) : (
                  <>
                    <p>₹{totals.cgst.toLocaleString()}</p>
                    <p>₹{totals.sgst.toLocaleString()}</p>
                  </>
                )}
                <div className="h-px bg-slate-100 my-2"></div>
                <p className="text-2xl text-blue-600 font-black pt-2">₹{totals.total.toLocaleString()}</p>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-auto pt-12">
        <div className="grid grid-cols-2 gap-12 items-end">
          <div className="max-w-md">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Terms, Conditions & Bank Details</p>
            <ul className="text-[10px] text-slate-500 list-disc pl-4 space-y-2">
              <li>Please make checks payable to <strong>{store.company.name}</strong>.</li>
              <li>GST input credit is subject to compliance and invoice appearing in GSTR-2B.</li>
              <li>Goods once sold will not be taken back or exchanged.</li>
              <li>This is a computer-generated invoice and does not require a physical signature.</li>
            </ul>
          </div>
          <div className="text-center">
            <div className="w-56 ml-auto border-t-2 border-slate-900 pt-4 px-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Authorized Signatory</p>
              <p className="text-xs font-bold text-slate-900">{store.company.name}</p>
              <div className="h-16 mt-2 flex items-center justify-center opacity-10">
                <Building2 size={40} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isSaved) {
    return (
      <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="no-print text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <CheckCircle2 size={56} className="text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">Invoice Generated</h2>
          <p className="text-slate-500 mb-10 font-medium">Business transaction recorded and synchronized.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <button onClick={triggerPrint} className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-blue-500 hover:shadow-xl transition-all group shadow-sm">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Printer size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Print / PDF</span>
            </button>
            <button onClick={handleWhatsApp} className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-emerald-500 hover:shadow-xl transition-all group shadow-sm">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><MessageCircle size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">WhatsApp</span>
            </button>
            <button onClick={handleEmail} className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-blue-400 hover:shadow-xl transition-all group shadow-sm">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-400 group-hover:text-white transition-colors"><Mail size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Mail Client</span>
            </button>
            <button onClick={onComplete} className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-slate-800 hover:shadow-xl transition-all group shadow-sm">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors"><ArrowLeft size={24} /></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Done</span>
            </button>
          </div>
        </div>

        <InvoicePrintView />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Invoice Generator</h2>
          <p className="text-slate-500 font-medium">Sequential Billing & GST Compliance</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={triggerPrint}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={18} /> Print Draft
          </button>
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Series</p>
              <p className="text-sm font-bold text-blue-600 font-mono">{invoiceNo}</p>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Date</p>
              <p className="text-sm font-bold text-slate-800 font-mono">{date}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-8">
          {/* Customer Section */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><User size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest text-xs">Customer Master Data</h3>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setTaxType('Intra')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Intra' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Intra-State
                </button>
                <button 
                  onClick={() => setTaxType('Inter')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Inter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Inter-State
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Billed To Entity</label>
                <input 
                  type="text" 
                  placeholder="Company or Individual Name"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                  value={customer.name}
                  onChange={e => setCustomer({...customer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Customer GSTIN</label>
                <input 
                  type="text" 
                  placeholder="Optional: 15-digit ID"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase transition-all"
                  value={customer.gstin}
                  onChange={e => setCustomer({...customer, gstin: e.target.value})}
                />
              </div>
              <div className="col-span-full">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Billing Address</label>
                <textarea 
                  rows={2}
                  placeholder="Registered address for tax documentation"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all resize-none"
                  value={customer.address}
                  onChange={e => setCustomer({...customer, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest text-xs">Service & Goods Inventory</h3>
              </div>
              <button onClick={addItem} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                <Plus size={16} /> Add Line
              </button>
            </div>

            <div className="space-y-6">
              {items.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <p className="text-slate-400 font-medium">No items added to this invoice yet.</p>
                </div>
              )}
              {items.map((item) => (
                <div key={item.id} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 animate-in slide-in-from-right-4">
                  <div className="grid grid-cols-12 gap-4 items-end mb-4">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Particulars</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        value={item.itemId}
                        onChange={e => updateItem(item.id, { itemId: e.target.value })}
                      >
                        <option value="">Select Item...</option>
                        {store.stockItems.map((s: StockItem) => (
                          <option key={s.id} value={s.id}>{s.name} (SKU: {s.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Qty</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rate (₹)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm text-right outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        value={item.rate}
                        onChange={e => updateItem(item.id, { rate: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Discount</label>
                      <div className="flex gap-1">
                        <input 
                          type="number" 
                          className="w-full px-3 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm text-right outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          value={item.discountValue || ''}
                          onChange={e => updateItem(item.id, { discountValue: Number(e.target.value) })}
                        />
                        <button 
                          onClick={() => updateItem(item.id, { discountType: item.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                          className={`p-3 rounded-xl border transition-all ${item.discountType === 'percentage' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:text-blue-600'}`}
                        >
                          {item.discountType === 'percentage' ? <Percent size={14} /> : <IndianRupee size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-6 items-end pt-6 border-t border-slate-200/50">
                    {taxType === 'Intra' ? (
                      <>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 ml-1">CGST Rate (%)</label>
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 font-black text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              value={item.cgstRate}
                              onChange={e => updateItem(item.id, { cgstRate: Number(e.target.value) })}
                            />
                            <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter italic">Amount: ₹{item.cgstAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 ml-1">SGST Rate (%)</label>
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 font-black text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              value={item.sgstRate}
                              onChange={e => updateItem(item.id, { sgstRate: Number(e.target.value) })}
                            />
                            <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter italic">Amount: ₹{item.sgstAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-6">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">IGST Rate (%)</label>
                        <div className="flex flex-col gap-1.5">
                          <input 
                            type="number" 
                            step="0.01"
                            className="w-full px-4 py-3 rounded-xl bg-white border border-indigo-100 font-black text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            value={item.igstRate}
                            onChange={e => updateItem(item.id, { igstRate: Number(e.target.value) })}
                          />
                          <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter italic">Integrated Amount: ₹{item.igstAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    <div className="col-span-6 flex items-center justify-end gap-8 pb-3">
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Row Total (Inc. Tax)</p>
                         <p className="text-2xl font-black text-blue-600 font-mono tracking-tighter">₹{item.totalWithTax.toLocaleString()}</p>
                       </div>
                       <button onClick={() => removeItem(item.id)} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all hover:rotate-12">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Totals & Summary */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Calculator size={140} />
             </div>
             <div className="relative z-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Financial Summary Ledger</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-slate-400 font-medium">
                    <span className="text-xs font-bold uppercase tracking-widest">Taxable Value</span>
                    <span className="font-mono text-xl text-white">₹{totals.subtotal.toLocaleString()}</span>
                  </div>
                  {taxType === 'Inter' ? (
                    <div className="flex justify-between items-center text-slate-400 font-medium animate-in slide-in-from-left-2">
                      <span className="text-xs font-bold uppercase tracking-widest">IGST Payable</span>
                      <span className="font-mono text-xl text-indigo-400">₹{totals.igst.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-slate-400 font-medium animate-in slide-in-from-left-2">
                        <span className="text-xs font-bold uppercase tracking-widest">CGST Payable</span>
                        <span className="font-mono text-xl text-blue-400">₹{totals.cgst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 font-medium animate-in slide-in-from-left-2">
                        <span className="text-xs font-bold uppercase tracking-widest">SGST Payable</span>
                        <span className="font-mono text-xl text-blue-400">₹{totals.sgst.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-slate-800 my-8"></div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Net Invoice Grand Total</p>
                      <h4 className="text-4xl font-black tracking-tighter text-white">₹{totals.total.toLocaleString()}</h4>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={items.length === 0}
            className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-600/30 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={28} className="group-hover:scale-110 transition-transform" /> Confirm Transaction
          </button>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col gap-5">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-inner"><Building2 size={28} /></div>
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">GSTR-1 Ready Output</h4>
             </div>
             <p className="text-xs text-slate-500 font-bold leading-relaxed">
               Modifying tax rates manually is logged for auditing. Ensure correct tax classification based on the HSN of the goods or services provided.
             </p>
          </div>
        </div>
      </div>

      <InvoicePrintView />
    </div>
  );
};

export default Billing;
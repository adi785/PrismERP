import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, Package, User, Calculator, Search, ChevronDown, Loader2, FileText, AlertCircle, ArrowLeft, Percent, IndianRupee, CreditCard, Wallet, FileCheck, ShieldCheck, Building, Landmark, Scale } from 'lucide-react';
import { StockItem, Ledger } from '../types';
import { triggerPrint, numberToWords } from '../utils/exportUtils';

interface BillingItem {
  id: string; itemId: string; name: string; sku: string; hsn: string; quantity: number; rate: number; 
  discountType: 'percentage' | 'fixed'; discountValue: number; discountAmount: number;
  cgstRate: number; sgstRate: number; igstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number;
  amount: number; totalWithTax: number; availableStock: number;
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

  useEffect(() => {
    if (items.length > 0) setItems(prev => prev.map(item => calculateLineItem(item, taxType)));
  }, [taxType]);

  const totals = useMemo(() => {
    const taxable = items.reduce((sum, item) => sum + item.amount, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const cgst = items.reduce((sum, item) => sum + item.cgstAmount, 0);
    const sgst = items.reduce((sum, item) => sum + item.sgstAmount, 0);
    const igst = items.reduce((sum, item) => sum + item.igstAmount, 0);
    const gstTotal = taxType === 'Inter' ? igst : (cgst + sgst);
    const finalPayable = Math.round(taxable + gstTotal);
    const roundOff = Number((finalPayable - (taxable + gstTotal)).toFixed(2));
    const hasDeficit = items.some(i => i.itemId && i.quantity > i.availableStock);
    return { taxable, totalDiscount, cgst, sgst, igst, gstTotal, roundOff, total: finalPayable, hasDeficit };
  }, [items, taxType]);

  const hsnSummary = useMemo(() => {
    const summary: Record<string, { taxable: number, gst: number, rate: number }> = {};
    items.forEach(item => {
      const hsn = item.hsn || '9999';
      if (!summary[hsn]) summary[hsn] = { taxable: 0, gst: 0, rate: item.igstRate };
      summary[hsn].taxable += item.amount;
      summary[hsn].gst += taxType === 'Inter' ? item.igstAmount : (item.cgstAmount + item.sgstAmount);
    });
    return summary;
  }, [items, taxType]);

  const addItem = () => {
    const newItem: BillingItem = { 
      id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', quantity: 1, rate: 0, 
      discountType: 'percentage', discountValue: 0, discountAmount: 0, 
      cgstRate: 9, sgstRate: 9, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, 
      amount: 0, totalWithTax: 0, availableStock: 0 
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
    if (!party.name || items.length === 0) return alert("Please select a customer and add items to the invoice.");
    if (totals.hasDeficit) return alert("Inventory Deficit: Cannot post invoice with shortage SKUs.");

    setIsSaving(true);
    try {
      const inventory = items.map(i => ({ itemId: i.itemId, quantity: i.quantity, rate: i.rate, amount: i.amount, type: 'Out' as const }));
      const entries = [
        { ledgerId: paymentMode === 'Cash' ? 'l-cash' : party.ledgerId || 'l-cash', debit: totals.total, credit: 0 }, 
        { ledgerId: 'l-sales', debit: 0, credit: totals.taxable }
      ];

      if (taxType === 'Intra') {
        entries.push({ ledgerId: 'l-cgst', debit: 0, credit: totals.cgst });
        entries.push({ ledgerId: 'l-sgst', debit: 0, credit: totals.sgst });
      } else {
        entries.push({ ledgerId: 'l-igst', debit: 0, credit: totals.igst });
      }

      if (Math.abs(totals.roundOff) > 0) {
        entries.push({ ledgerId: 'l-roundoff', debit: totals.roundOff > 0 ? totals.roundOff : 0, credit: totals.roundOff < 0 ? Math.abs(totals.roundOff) : 0 });
      }

      await store.addVoucher({
        number: invoiceNo, date, type: 'Sales', 
        entries,
        inventory, 
        narration: `Sales Invoice #${invoiceNo} to ${party.name} (${paymentMode}). Total Discount: ₹${totals.totalDiscount}`, 
        totalAmount: totals.total, 
        gstTotal: totals.gstTotal
      });
      setIsSaved(true);
    } catch (e:any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const InvoicePrintTemplate = () => (
    <div className="print-only w-full max-w-4xl mx-auto bg-white font-inter text-slate-900 border border-slate-200">
      <table className="w-full">
        <thead className="table-header-group">
          <tr>
            <td className="p-10 border-b-2 border-black">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">{store.company.name}</h1>
                  <p className="text-[10px] font-bold text-slate-600 max-w-sm uppercase leading-relaxed">{store.company.address}</p>
                  <p className="text-[11px] font-black mt-3 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded inline-block">GSTIN: {store.company.gstin}</p>
                </div>
                <div className="text-right">
                  <div className="bg-black text-white px-8 py-2 text-sm font-black uppercase tracking-[0.3em] mb-4">Tax Invoice</div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Document Serial</p>
                    <p className="text-lg font-black font-mono">{invoiceNo}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-2">Date of Supply</p>
                    <p className="text-sm font-black">{date}</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="p-10">
              <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Billed To (Party Details):</p>
                  <p className="text-base font-black uppercase">{party.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Payment Mode: <span className="text-black">{paymentMode}</span></p>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Logistics & Supply:</p>
                  <p className="text-xs font-bold uppercase">Place: <span className="font-black">{taxType === 'Intra' ? 'Local / Intra State' : 'Other / Inter State'}</span></p>
                  <p className="text-[10px] font-black mt-4 text-slate-400 uppercase">State Code: 27 (MAH)</p>
                </div>
              </div>

              <table className="w-full text-xs mb-10">
                <thead>
                  <tr className="border-y-2 border-black font-black uppercase tracking-widest bg-slate-100">
                    <th className="py-3 px-4 text-left">Nomenclature & SKU</th>
                    <th className="py-3 text-center">HSN</th>
                    <th className="py-3 text-center">Qty</th>
                    <th className="py-3 text-right">Rate</th>
                    <th className="py-3 text-right">Disc</th>
                    <th className="py-3 text-right">GST%</th>
                    <th className="py-3 text-right pr-4">Taxable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, i) => (
                    <tr key={i} className="page-break-avoid">
                      <td className="py-4 px-4">
                        <p className="font-black uppercase text-sm">{item.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono tracking-tighter">{item.sku}</p>
                      </td>
                      <td className="py-4 text-center font-mono text-[10px]">{item.hsn}</td>
                      <td className="py-4 text-center font-bold">{item.quantity}</td>
                      <td className="py-4 text-right font-mono">{item.rate.toLocaleString()}</td>
                      <td className="py-4 text-right text-slate-400 font-bold">{item.discountAmount > 0 ? `-${item.discountAmount}` : '—'}</td>
                      <td className="py-4 text-right font-bold text-slate-500">{taxType === 'Inter' ? item.igstRate : (item.cgstRate + item.sgstRate)}%</td>
                      <td className="py-4 text-right font-black pr-4">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10">
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Invoice Value in Words</p>
                    <p className="text-[11px] font-black italic text-slate-700 leading-relaxed uppercase">{numberToWords(totals.total)}</p>
                  </div>
                  
                  <div className="print-card p-6 border-2 border-slate-100 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">GST Component Summary</p>
                    <table className="w-full text-[9px] text-left">
                      <thead className="border-b border-slate-200 font-black uppercase text-slate-400">
                        <tr><th className="pb-2">HSN/SAC</th><th className="pb-2">Taxable</th><th className="pb-2 text-right">Rate</th><th className="pb-2 text-right">Tax Amt</th></tr>
                      </thead>
                      <tbody>
                        {/* Fix: Explicitly typing data from hsnSummary to resolve unknown type errors on line 227-229 */}
                        {Object.entries(hsnSummary).map(([hsn, data]: [string, { taxable: number, gst: number, rate: number }]) => (
                          <tr key={hsn} className="border-b border-slate-50">
                            <td className="py-2 font-mono">{hsn}</td>
                            <td className="py-2">₹{data.taxable.toLocaleString()}</td>
                            <td className="py-2 text-right">{data.rate}%</td>
                            <td className="py-2 text-right font-black">₹{data.gst.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                    <span>Gross Value (Taxable)</span>
                    <span className="text-black font-mono text-base">₹{totals.taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                    <span>Consolidated GST</span>
                    <span className="text-black font-mono text-base">₹{totals.gstTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                    <span>Rounding Differential</span>
                    <span className="text-black font-mono">₹{totals.roundOff}</span>
                  </div>
                  <div className="h-px bg-slate-300 my-4"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Net Payable Sum</span>
                    <span className="text-5xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-10 border-t border-slate-100 grid grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                    <Landmark size={14} /> Settlement Instructions
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 space-y-1">
                    <p>BANK: CENTRAL COMMERCIAL BANK</p>
                    <p>ACCOUNT NO: 99881122330044</p>
                    <p>IFSC CODE: CBIN0280631</p>
                    <p>BRANCH: REGIONAL HUB, MUMBAI</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                    <ShieldCheck size={14} /> Declarations & Terms
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 leading-relaxed italic">
                    1. Goods once sold will not be taken back. <br/>
                    2. Certified that the particulars given above are true and correct. <br/>
                    3. Final tax liability is calculated as per current GST rates.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>

        <tfoot className="table-footer-group">
          <tr>
            <td className="p-10 pt-0">
              <div className="grid grid-cols-2 gap-20 mt-10">
                <div className="text-center pt-8 border-t border-slate-200">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-8 tracking-widest">Customer Acknowledgement</p>
                  <div className="h-px w-32 mx-auto bg-slate-100"></div>
                </div>
                <div className="text-center pt-8 border-t-2 border-black">
                  <p className="text-[9px] font-black uppercase text-black mb-8 tracking-widest">Authorized Signatory for {store.company.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600">Digitally Authenticated Document</p>
                </div>
              </div>
              <div className="mt-10 pt-4 border-t border-slate-100 flex justify-between text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                <span>System ID: {invoiceNo}</span>
                <span>Page 1 of 1</span>
                <span>Powered by PrismERP BI Suite</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  if (isSaved) {
    return (
      <div className="flex flex-col items-center py-20 animate-in zoom-in-95 duration-500">
        <div className="no-print flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 shadow-2xl">
            <FileCheck size={40} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black mb-10 text-center text-slate-900 dark:text-white tracking-tight">Invoice # {invoiceNo} Finalized</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => triggerPrint()} className="px-10 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all"><Printer size={20} /> Print Tax Invoice</button>
            <button onClick={onComplete} className="px-10 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">View Daybook</button>
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
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sales Invoicing</h2>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Tax Compliant Outward Supply</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-sm transition-colors">
          <button onClick={() => setTaxType('Intra')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${taxType === 'Intra' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Intra-State</button>
          <button onClick={() => setTaxType('Inter')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${taxType === 'Inter' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Inter-State</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
        <div className="lg:col-span-3 space-y-6 md:space-y-10">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
              <div className="md:col-span-6 relative" ref={partyRef}>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Customer / Debtor Ledger</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search debtors or manual entry..." 
                    className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" 
                    value={party.name} 
                    onChange={e => { setParty({...party, name: e.target.value}); setPartySearchQuery(e.target.value); setShowPartySearch(true); }}
                    onFocus={() => setShowPartySearch(true)}
                  />
                  {showPartySearch && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-[110] max-h-60 overflow-y-auto p-2">
                       <button onClick={() => setShowPartySearch(false)} className="w-full text-left px-4 py-2 text-[10px] font-black text-blue-500 uppercase">System Ledgers</button>
                       {store.ledgers.filter((l: Ledger) => l.group === 'Sundry Debtors' && l.name.toLowerCase().includes(partySearchQuery.toLowerCase())).map((l: Ledger) => (
                         <button key={l.id} onClick={() => { setParty({name: l.name, ledgerId: l.id, address: ''}); setShowPartySearch(false); }} className="w-full px-4 py-3 text-left hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold truncate text-slate-700 dark:text-slate-200">
                           {l.name} (Bal: ₹{l.currentBalance})
                         </button>
                       ))}
                       <button onClick={() => setShowPartySearch(false)} className="w-full px-4 py-3 text-left bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase mt-1">Add as Manual Entry</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Payment Mode</label>
                <div className="flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-1 border border-slate-200 dark:border-slate-700 h-14">
                  <button onClick={() => setPaymentMode('Cash')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMode === 'Cash' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><Wallet size={14}/> Cash</button>
                  <button onClick={() => setPaymentMode('Credit')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMode === 'Credit' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}><CreditCard size={14}/> Credit</button>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Invoice ID</label>
                <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl"><Package size={20} /></div>
                <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">Inventory Manifest</h3>
              </div>
              <button onClick={addItem} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"><Plus size={18} /> Add Line Item</button>
            </div>

            <div className="space-y-6">
              {items.map(item => (
                <div key={item.id} className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group transition-all" ref={activeSearchId === item.id ? searchRef : null}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-4 relative">
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Stock Item (SKU)</label>
                      <input 
                        type="text" className="w-full px-5 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white transition-colors shadow-sm" 
                        placeholder={item.name || "Search master catalog..."} value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                        onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} onChange={e => setSearchQuery(e.target.value)} 
                      />
                      {activeSearchId === item.id && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl z-[120] max-h-60 overflow-y-auto p-2">
                          {store.stockItems.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s: any) => (
                            <button key={s.id} onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} className="w-full px-4 py-4 text-left hover:bg-blue-600 hover:text-white rounded-xl transition-all">
                              <p className="font-bold text-sm text-slate-700 dark:text-slate-200 group-hover:text-white">{s.name}</p>
                              <p className="text-[9px] font-black uppercase text-slate-400 group-hover:text-blue-200">SKU: {s.sku} • Stock: {s.currentStock}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Quantity</label>
                      <input type="number" className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-center text-slate-900 dark:text-white shadow-sm" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Sale Rate (₹)</label>
                      <input type="number" className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-right text-slate-900 dark:text-white shadow-sm" value={item.rate || ''} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Item Discount</label>
                      <div className="flex gap-1">
                        <input 
                          type="number" 
                          className="w-full px-4 py-3.5 rounded-l-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm text-right text-slate-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                          value={item.discountValue || ''} 
                          onChange={e => updateItem(item.id, { discountValue: Number(e.target.value) })} 
                          placeholder="0"
                        />
                        <button 
                          onClick={() => updateItem(item.id, { discountType: item.discountType === 'percentage' ? 'fixed' : 'percentage' })}
                          className={`px-4 py-3.5 rounded-r-xl border border-l-0 border-slate-200 dark:border-slate-700 font-black text-[10px] transition-all flex items-center justify-center gap-1 min-w-[50px] ${item.discountType === 'percentage' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                          {item.discountType === 'percentage' ? <Percent size={12} /> : <IndianRupee size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3.5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"><Trash2 size={22} /></button>
                    </div>
                  </div>
                  {item.itemId && item.quantity > item.availableStock && (
                    <div className="mt-3 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest"><AlertCircle size={14} /> Critical Shortage: Available stock is {item.availableStock} {item.availableStock === 1 ? 'unit' : 'units'}</div>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="text-center py-20 text-slate-300 dark:text-slate-700 font-bold uppercase text-[10px] tracking-[0.3em] border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">No entries in manifest</div>}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 dark:bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-12 border-b border-white/5 pb-8">Financial Overview</h3>
            <div className="space-y-6">
              <SummaryLine label="Taxable Base" val={totals.taxable} />
              <SummaryLine label="Disc. Applied" val={totals.totalDiscount} highlight="text-emerald-400" />
              <div className="h-px bg-white/5 my-4"></div>
              <div className="space-y-4">
                {taxType === 'Intra' ? (
                  <>
                    <SummaryLine label="CGST Component" val={totals.cgst} highlight="text-blue-400" />
                    <SummaryLine label="SGST Component" val={totals.sgst} highlight="text-blue-400" />
                  </>
                ) : (
                  <SummaryLine label="IGST Component" val={totals.igst} highlight="text-blue-400" />
                )}
              </div>
              <SummaryLine label="Round Off" val={totals.roundOff} />
              <div className="h-px bg-white/10 my-8"></div>
              <div>
                <p className="text-[9px] font-black text-blue-500 uppercase mb-3 tracking-[0.2em]">Grand Net Total</p>
                <p className="text-5xl font-black tracking-tighter">₹{totals.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave} disabled={isSaving || items.length === 0 || totals.hasDeficit} 
            className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[3rem] font-black text-2xl shadow-[0_20px_50px_-15px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isSaving ? <Loader2 className="animate-spin mx-auto" size={32} /> : totals.hasDeficit ? 'Deficit Blocking' : 'Authorize Sale'}
          </button>
          
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] flex items-start gap-4">
            <Calculator className="text-blue-500 shrink-0 mt-1" size={20} />
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">The invoice will automatically post double-entry records to the Sales, Tax, and {paymentMode === 'Cash' ? 'Cash' : 'Debtor'} ledgers.</p>
          </div>
        </div>
      </div>
      <InvoicePrintTemplate />
    </div>
  );
};

const SummaryLine = ({ label, val, highlight = "text-white" }: any) => (
  <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-widest">
    <span>{label}</span>
    <span className={`font-mono text-sm ${highlight}`}>₹{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
  </div>
);

export default Billing;
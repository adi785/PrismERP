import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, Save, CheckCircle2, ArrowLeft, Package, User, Calculator, Search, X, ChevronDown, Loader2, FileText, ShieldCheck, CreditCard, Building } from 'lucide-react';
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
  amount: number; // Taxable Amount
  totalWithTax: number;
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
    let disc = item.discountType === 'percentage' ? (gross * (item.discountValue || 0)) / 100 : (item.discountValue || 0);
    const discountAmount = Number(disc.toFixed(2));
    const amount = Number((gross - discountAmount).toFixed(2));
    
    // Calculate taxes based on taxable amount
    const cgstAmount = Number(((amount * (item.cgstRate || 0)) / 100).toFixed(2));
    const sgstAmount = Number(((amount * (item.sgstRate || 0)) / 100).toFixed(2));
    const igstAmount = Number(((amount * (item.igstRate || 0)) / 100).toFixed(2));
    
    const totalWithTax = Number((amount + (currentTaxType === 'Inter' ? igstAmount : (cgstAmount + sgstAmount))).toFixed(2));
    return { ...item, discountAmount, amount, cgstAmount, sgstAmount, igstAmount, totalWithTax };
  };

  useEffect(() => {
    const salesVouchers = store.vouchers.filter((v: any) => v.type === 'Sales');
    const nextNo = salesVouchers.length + 1;
    setInvoiceNo(`RGTW/${new Date().getFullYear()}/${nextNo.toString().padStart(4, '0')}`);
  }, [store.vouchers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setActiveSearchId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = useMemo(() => {
    const subtotal = Number(items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toFixed(2));
    const discount = Number(items.reduce((sum, item) => sum + item.discountAmount, 0).toFixed(2));
    const taxable = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    const cgst = Number(items.reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2));
    const sgst = Number(items.reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2));
    const igst = Number(items.reduce((sum, item) => sum + item.igstAmount, 0).toFixed(2));
    const total = Number(items.reduce((sum, item) => sum + item.totalWithTax, 0).toFixed(2));
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

    // GST Matrix grouping
    const gstClasses = [5, 12, 18, 28].map(rate => {
        const classItems = items.filter(i => (i.cgstRate + i.sgstRate) === rate || i.igstRate === rate);
        const classTaxable = classItems.reduce((s, i) => s + i.amount, 0);
        const classCGST = classItems.reduce((s, i) => s + i.cgstAmount, 0);
        const classSGST = classItems.reduce((s, i) => s + i.sgstAmount, 0);
        return { rate, taxable: classTaxable, cgst: classCGST, sgst: classSGST, total: classCGST + classSGST };
    });

    return { subtotal, discount, taxable, igst, cgst, sgst, total, totalQty, gstClasses };
  }, [items]);

  const addItem = () => {
    const newItem: BillingItem = { id: Date.now().toString(), itemId: '', name: '', sku: '', hsn: '', quantity: 1, mrp: 0, rate: 0, discountType: 'percentage', discountValue: 0, discountAmount: 0, cgstRate: 9, sgstRate: 9, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, amount: 0, totalWithTax: 0 };
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
            updated.rate = stock.salePrice; updated.mrp = stock.salePrice * 1.2; // Mock MRP
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
      const entries = [{ ledgerId: 'l-cash', debit: totals.total, credit: 0 }, { ledgerId: 'l-sales', debit: 0, credit: totals.taxable }, ...taxEntries];
      const inventory = items.map(item => ({ itemId: item.itemId, quantity: item.quantity, rate: item.rate, amount: item.amount, type: 'Out' as const }));
      await store.addVoucher({ number: invoiceNo, date, type: 'Sales', entries, inventory, narration: `Sales to ${customer.name}`, totalAmount: totals.total, gstTotal: taxType === 'Inter' ? totals.igst : (totals.cgst + totals.sgst) });
      setIsSaved(true);
    } catch (err) { alert("Failed to save."); } finally { setIsSaving(false); }
  };

  /**
   * CUSTOM INVOICE PRINT TEMPLATE (RADHE GOVIND TRADE WINGS STYLE)
   */
  const InvoicePrintTemplate = () => (
    <div className="print-only w-full max-w-[210mm] mx-auto bg-white p-[10mm] text-slate-900 text-[10px] leading-tight font-sans border border-slate-300">
      
      {/* 1. Main Header */}
      <div className="text-center mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest border-b border-slate-950 pb-1 mb-1">GST INVOICE</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">{store.company.name}</h1>
        <p className="text-[9px] font-bold">B-40, FIRST FLOOR,</p>
        <p className="text-[9px] font-bold">SIKAR HOUSE JAIPUR-302016 (RAJ.)</p>
        <p className="text-[9px] font-bold uppercase">STATE : RAJASTHAN, CODE : 08</p>
        <p className="text-[9px] font-bold">Phone : 7021132105, 8619059250</p>
        <p className="text-[9px] font-bold lowercase underline">E-Mail : rgtwkk@gmail.com</p>
      </div>

      {/* 2. Top Metadata Grid */}
      <div className="border border-slate-950 flex">
        <div className="w-1/2 border-r border-slate-950 p-1">
          <p className="font-bold">GSTIN : <span className="font-mono">{store.company.gstin}</span></p>
        </div>
        <div className="w-1/2 p-1">
          <p className="font-bold text-right">FOOD LIC NO. : <span className="font-mono text-[9px]">1222502600</span></p>
        </div>
      </div>

      <div className="border-l border-r border-slate-950 flex">
        <div className="w-1/2 border-r border-slate-950 p-2 min-h-[80px]">
          <p className="font-bold uppercase mb-1">M/S {customer.name || 'SHYAM CANTEEN'}</p>
          <p className="text-[9px] leading-relaxed uppercase whitespace-pre-wrap">{customer.address || 'EXCEL CARE HOSPITAL, JOSHI MARG, KAANTA, JHOT\nWARD JAIPUR\nSTATE CODE: 08-RAJASTHAN'}</p>
          <p className="mt-2 font-bold uppercase">PAN NO. : <span className="font-mono">{customer.pan || ''}</span></p>
        </div>
        <div className="w-1/2 p-2">
          <div className="grid grid-cols-2 gap-y-1">
            <p className="font-bold">Invoice No :</p><p className="font-mono text-right">{invoiceNo}</p>
            <p className="font-bold">L.R. No. :</p><p className="font-mono text-right">—</p>
            <p className="font-bold">Date :</p><p className="font-mono text-right font-bold">{date}</p>
            <p className="font-bold">Date :</p><p className="font-mono text-right">{date}</p>
            <p className="font-bold col-span-2 mt-1">Transport/Vehicle No. :</p>
            <p className="font-bold">E-Way No. :</p><p className="font-mono text-right"></p>
          </div>
        </div>
      </div>

      {/* 3. Transaction Type Label */}
      <div className="border border-slate-950 text-center py-0.5 bg-slate-50">
        <p className="font-black text-[12px] tracking-widest uppercase">CREDIT</p>
      </div>

      {/* 4. Main Table */}
      <table className="w-full border-l border-r border-b border-slate-950 table-fixed">
        <thead>
          <tr className="text-[8px] font-bold text-center border-b border-slate-950 bg-slate-50 uppercase">
            <th className="w-8 border-r border-slate-950 py-1">S N</th>
            <th className="w-40 border-r border-slate-950 py-1">Description Of Goods</th>
            <th className="w-16 border-r border-slate-950 py-1">HSN/SAC</th>
            <th className="w-10 border-r border-slate-950 py-1">Qty.</th>
            <th className="w-10 border-r border-slate-950 py-1">Unit</th>
            <th className="w-12 border-r border-slate-950 py-1">MRP</th>
            <th className="w-12 border-r border-slate-950 py-1">Rate</th>
            <th className="w-10 border-r border-slate-950 py-1">Dis 1%</th>
            <th className="w-10 border-r border-slate-950 py-1">Dis 2%</th>
            <th className="w-14 border-r border-slate-950 py-1">Taxable</th>
            <th className="w-10 border-r border-slate-950 py-1">SGST%</th>
            <th className="w-12 border-r border-slate-950 py-1">Amt</th>
            <th className="w-10 border-r border-slate-950 py-1">CGST%</th>
            <th className="w-12 border-r border-slate-950 py-1">Amt</th>
            <th className="w-20 py-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="text-[8px] border-b border-slate-100 align-top">
              <td className="border-r border-slate-950 text-center py-2">{idx + 1}</td>
              <td className="border-r border-slate-950 px-1 py-2 font-bold uppercase">{item.name}</td>
              <td className="border-r border-slate-950 text-center py-2 font-mono">{item.hsn}</td>
              <td className="border-r border-slate-950 text-center py-2 font-bold">{item.quantity}</td>
              <td className="border-r border-slate-950 text-center py-2 uppercase">PCS</td>
              <td className="border-r border-slate-950 text-right px-1 py-2 font-mono">{(item.mrp || item.rate * 1.2).toFixed(2)}</td>
              <td className="border-r border-slate-950 text-right px-1 py-2 font-mono font-bold">{item.rate.toFixed(2)}</td>
              <td className="border-r border-slate-950 text-center py-2 font-mono">0.00</td>
              <td className="border-r border-slate-950 text-center py-2 font-mono">0.00</td>
              <td className="border-r border-slate-950 text-right px-1 py-2 font-mono font-bold">{item.amount.toFixed(2)}</td>
              <td className="border-r border-slate-950 text-center py-2 font-mono">{(item.sgstRate || 0).toFixed(2)}</td>
              <td className="border-r border-slate-950 text-right px-1 py-2 font-mono">{item.sgstAmount.toFixed(2)}</td>
              <td className="border-r border-slate-950 text-center py-2 font-mono">{(item.cgstRate || 0).toFixed(2)}</td>
              <td className="border-r border-slate-950 text-right px-1 py-2 font-mono">{item.cgstAmount.toFixed(2)}</td>
              <td className="text-right px-1 py-2 font-bold font-mono">{item.totalWithTax.toFixed(2)}</td>
            </tr>
          ))}
          {/* Spacer rows */}
          {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
            <tr key={`pad-${i}`} className="h-4 border-b border-slate-50">
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td className="border-r border-slate-950"></td>
                <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Summary Section */}
      <div className="border-l border-r border-b border-slate-950 flex">
        <div className="w-[30%] border-r border-slate-950 p-1 flex items-center gap-2">
            <span className="font-bold text-[8px] uppercase">CESS 12% AMO</span>
            <span className="font-mono font-bold">0.00</span>
        </div>
        <div className="flex-1 flex justify-between items-center px-4 py-1">
            <p className="font-black text-[10px] uppercase">Total : <span className="font-mono">{totals.totalQty}</span></p>
            <div className="text-right space-y-0.5">
                <div className="flex justify-between gap-10 min-w-[200px]">
                    <p className="font-bold text-[8px] uppercase">SUB TOTAL</p>
                    <p className="font-mono font-bold">{(totals.subtotal).toFixed(2)}</p>
                </div>
                <div className="flex justify-between gap-10">
                    <p className="font-bold text-[8px] uppercase">DISCOUNT</p>
                    <p className="font-mono font-bold">{(totals.discount).toFixed(2)}</p>
                </div>
                <div className="flex justify-between gap-10">
                    <p className="font-bold text-[8px] uppercase">TAXABLE AMOUNT</p>
                    <p className="font-mono font-bold">{(totals.taxable).toFixed(2)}</p>
                </div>
                <div className="flex justify-between gap-10">
                    <p className="font-bold text-[8px] uppercase">GST PAYBLE</p>
                    <p className="font-mono font-bold">{(totals.cgst + totals.sgst).toFixed(2)}</p>
                </div>
                <div className="flex justify-between gap-10">
                    <p className="font-bold text-[8px] uppercase">ROUND OFF</p>
                    <p className="font-mono font-bold">0.00</p>
                </div>
            </div>
        </div>
      </div>

      {/* 6. GST Matrix Box */}
      <div className="flex border-l border-r border-b border-slate-950">
        <div className="w-[60%] border-r border-slate-950">
            <table className="w-full text-[7px] border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-950 font-black uppercase">
                        <th className="border-r border-slate-950 py-0.5 px-1 text-left">CLASS</th>
                        <th className="border-r border-slate-950 py-0.5 px-1 text-right">TOTAL</th>
                        <th className="border-r border-slate-950 py-0.5 px-1 text-right">SCH.</th>
                        <th className="border-r border-slate-950 py-0.5 px-1 text-right">DISC.</th>
                        <th className="border-r border-slate-950 py-0.5 px-1 text-right">SGST</th>
                        <th className="border-r border-slate-950 py-0.5 px-1 text-right">CGST</th>
                        <th className="py-0.5 px-1 text-right">TOTAL GST</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {totals.gstClasses.map(gc => (
                        <tr key={gc.rate} className="font-bold">
                            <td className="border-r border-slate-950 py-1 px-1">GST {gc.rate} %</td>
                            <td className="border-r border-slate-950 py-1 px-1 text-right font-mono">{gc.taxable.toFixed(2)}</td>
                            <td className="border-r border-slate-950 py-1 px-1 text-right font-mono">0.00</td>
                            <td className="border-r border-slate-950 py-1 px-1 text-right font-mono">0.00</td>
                            <td className="border-r border-slate-950 py-1 px-1 text-right font-mono">{gc.sgst.toFixed(2)}</td>
                            <td className="border-r border-slate-950 py-1 px-1 text-right font-mono">{gc.cgst.toFixed(2)}</td>
                            <td className="py-1 px-1 text-right font-mono">{gc.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex-1 p-2 bg-slate-50 flex flex-col justify-end">
            <div className="flex justify-between items-end border-t-2 border-slate-950 pt-2">
                <p className="font-black text-[12px] uppercase">GRAND TOTAL</p>
                <p className="font-mono text-xl font-black">{totals.total.toFixed(2)}</p>
            </div>
        </div>
      </div>

      {/* 7. Words Section */}
      <div className="border-l border-r border-b border-slate-950 p-1 bg-slate-50">
        <p className="font-bold uppercase text-[9px]">Rs. {numberToWords(totals.total)}</p>
      </div>

      {/* 8. Footer Section (Bank & Signatories) */}
      <div className="flex border-l border-r border-b border-slate-950 min-h-[140px]">
        <div className="w-[45%] p-2 border-r border-slate-950 relative">
          <p className="font-black text-[9px] uppercase underline mb-2 tracking-widest">Terms & Conditions</p>
          <ul className="text-[7.5px] font-bold space-y-0.5 uppercase leading-tight">
            <li>Goods once sold will not be taken back or exchanged</li>
            <li>Bills not paid due date will attract 24% interest</li>
            <li>All disputes subject to JAIPUR Jurisdiction only</li>
            <li>Prescribed Sales Tax declaration will be given</li>
          </ul>
          
          <div className="mt-4 flex gap-4">
             <div className="space-y-0.5">
                <p className="font-bold text-[8px] uppercase">Bank Detail : <span className="font-black">IDFC FIRST BANK</span></p>
                <p className="font-bold text-[8px] uppercase">Account No : <span className="font-mono">86190592509</span></p>
                <p className="font-bold text-[8px] uppercase">IFSC : <span className="font-mono">IDFB0043411</span></p>
                <p className="font-bold text-[8px] uppercase">Branch : <span className="font-black">TONK ROAD, JAIPUR</span></p>
             </div>
             <div className="w-12 h-12 bg-slate-200 flex items-center justify-center border border-slate-300">
                <span className="text-[6px] text-slate-400">QR CODE</span>
             </div>
          </div>
          
          <p className="absolute bottom-2 left-2 text-[7px] font-bold italic border-t border-slate-200 pt-1">Certified that the particulars given above are true and correct</p>
        </div>
        
        <div className="w-15% border-r border-slate-950 p-2 flex flex-col justify-between items-center">
            <p className="text-[8px] font-bold uppercase">Checked By</p>
            <div className="w-12 border-b border-slate-300"></div>
        </div>

        <div className="flex-1 p-2 flex flex-col items-center justify-between text-center">
            <p className="text-[8px] font-bold uppercase">Receiver</p>
            <div className="space-y-1">
                <p className="text-[9px] font-black uppercase">For {store.company.name}</p>
                <div className="h-10 flex items-center justify-center opacity-30 grayscale pointer-events-none">
                    <Building size={32} />
                </div>
                <p className="text-[8px] font-bold uppercase border-t border-slate-200 pt-1 px-4">Authorised Signatory</p>
            </div>
        </div>
      </div>

      {/* 9. Print Watermark / Footer Mark */}
      <div className="mt-4 flex justify-between items-center opacity-40 grayscale no-print-force">
        <p className="text-[7px] font-bold italic">MARG ERP NANO @ Rs 5400 | Manage Stock Accounts GST Barcoding | Call 9829214080</p>
        <p className="text-[7px] font-black uppercase">PrismERP Suite v4.0</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      {isSaved ? (
        <div className="flex flex-col items-center py-20 space-y-16">
          <div className="no-print text-center">
            <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-emerald-200/50 animate-bounce">
                <CheckCircle2 size={64} className="text-emerald-600" />
            </div>
            <h2 className="text-5xl font-black text-slate-950 tracking-tight mb-4">Transaction Certified</h2>
            <p className="text-slate-500 font-medium text-lg mb-12 max-w-xl mx-auto">The sales cycle is now complete. Financial records and inventory audit trails have been permanently updated.</p>
            <div className="flex gap-6 justify-center scale-110">
              <button 
                onClick={() => triggerPrint()} 
                className="px-12 py-6 bg-slate-950 text-white rounded-[2.5rem] font-black flex items-center gap-4 shadow-2xl shadow-slate-950/20 hover:bg-slate-800 transition-all"
              >
                <Printer size={28} /> Print Final Tax Invoice
              </button>
              <button 
                onClick={onComplete} 
                className="px-10 py-6 border-2 border-slate-200 rounded-[2.5rem] font-black text-slate-600 hover:bg-slate-50 transition-all"
              >
                Return to Daybook
              </button>
            </div>
          </div>
          {/* Final Invoice view for print engine */}
          <InvoicePrintTemplate />
        </div>
      ) : (
        <div className="no-print space-y-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-500/20">
                <FileText size={40} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-950 tracking-tight">Invoice Architect</h2>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1 opacity-70">Creating professional bill for {store.company.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex bg-white border-2 border-slate-200 p-2 rounded-[1.5rem] shadow-sm">
                <button onClick={() => setTaxType('Intra')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Intra' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Local (Intra)</button>
                <button onClick={() => setTaxType('Inter')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${taxType === 'Inter' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}>Inter-State</button>
              </div>
              {/* PRINT PREVIEW BUTTON */}
              <button 
                onClick={() => triggerPrint()} 
                className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-[2rem] text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md group"
              >
                <Printer size={20} className="group-hover:rotate-12 transition-transform" /> Print Preview
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
            <div className="xl:col-span-3 space-y-10">
              <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                  <User size={160} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                  <div className="col-span-full">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Customer Identity / Billing Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Global Business Solutions"
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-lg" 
                      value={customer.name} 
                      onChange={e => setCustomer({...customer, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">GSTIN Identification</label>
                    <input 
                      type="text" 
                      placeholder="27AAACXXXX..."
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-mono text-base font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                      value={customer.gstin} 
                      onChange={e => setCustomer({...customer, gstin: e.target.value.toUpperCase()})} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">PAN Identification</label>
                    <input 
                      type="text" 
                      placeholder="ABCDE1234F"
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-mono text-base font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                      value={customer.pan} 
                      onChange={e => setCustomer({...customer, pan: e.target.value.toUpperCase()})} 
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Physical Billing Address</label>
                    <textarea 
                      placeholder="Enter full legal address for documentation and tax compliance..."
                      className="w-full px-8 py-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none min-h-[120px] text-base" 
                      value={customer.address} 
                      onChange={e => setCustomer({...customer, address: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex justify-between items-center mb-12">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-950 text-white rounded-3xl shadow-xl shadow-slate-950/20"><Package size={28} /></div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em]">Itemized Supply</h3>
                  </div>
                  <button onClick={addItem} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 flex items-center gap-3 transition-all"><Plus size={24} /> New SKU Row</button>
                </div>

                <div className="space-y-10">
                  {items.length === 0 ? (
                    <div className="py-32 text-center border-4 border-dashed border-slate-50 rounded-[3.5rem]">
                       <Package size={72} className="mx-auto text-slate-200 mb-8" />
                       <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Awaiting inventory selection for billing</p>
                    </div>
                  ) : items.map(item => (
                    <div key={item.id} className="p-10 bg-slate-50/50 rounded-[3.5rem] border border-slate-100 space-y-10 relative group hover:bg-white hover:shadow-2xl transition-all duration-500" ref={activeSearchId === item.id ? searchRef : null}>
                      <div className="grid grid-cols-12 gap-10 items-end">
                        <div className="col-span-6 relative">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Product Lookup</label>
                          <input 
                            type="text" 
                            className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            placeholder={item.name || "Search Master Stock..."}
                            value={activeSearchId === item.id ? searchQuery : (item.name || '')} 
                            onFocus={() => { setActiveSearchId(item.id); setSearchQuery(''); }} 
                            onChange={e => setSearchQuery(e.target.value)} 
                          />
                          {activeSearchId === item.id && (
                            <div className="absolute left-0 right-0 top-full mt-5 bg-white border-2 border-slate-200 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] z-[100] max-h-72 overflow-y-auto animate-in slide-in-from-top-6 duration-300 p-3">
                              {store.stockItems.filter((s:any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.sku.toLowerCase().includes(searchQuery.toLowerCase())).map((s:any) => (
                                <button 
                                  key={s.id} 
                                  onClick={() => { updateItem(item.id, { itemId: s.id }); setActiveSearchId(null); }} 
                                  className="w-full px-8 py-6 text-left border-b border-slate-50 hover:bg-blue-600 hover:text-white rounded-3xl transition-all flex items-center justify-between group/btn"
                                >
                                  <div>
                                    <p className="font-black text-base">{s.name}</p>
                                    <p className="text-[10px] uppercase font-black text-slate-400 group-hover/btn:text-blue-100 tracking-widest">SKU: {s.sku}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black">₹{s.salePrice.toLocaleString()}</p>
                                    <p className="text-[10px] font-black text-emerald-500 group-hover/btn:text-white uppercase tracking-widest">Available: {s.currentStock}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Qty</label>
                          <input 
                            type="number" 
                            className="w-full px-6 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-center outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            value={item.quantity || ''} 
                            onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })} 
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Rate (₹)</label>
                          <input 
                            type="number" 
                            className="w-full px-8 py-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-base text-right font-mono outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            value={item.rate || ''} 
                            onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} 
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-end pb-2">
                          <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-5 text-rose-200 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={28} /></button>
                        </div>
                      </div>
                      
                      {item.itemId && (
                        <div className="flex items-center justify-between px-8 py-5 bg-white rounded-3xl border-2 border-slate-100 shadow-sm group-hover:border-blue-100 transition-colors">
                           <div className="flex gap-12">
                              <div><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1.5 block">Tax Mapping (HSN)</span><span className="text-sm font-black text-slate-700">{item.hsn}</span></div>
                              <div><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1.5 block">GST Rate</span><span className="text-sm font-black text-blue-600">{item.igstRate}% Bracket</span></div>
                              <div><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1.5 block">Discount</span><span className="text-sm font-black text-rose-500">-₹{item.discountAmount}</span></div>
                           </div>
                           <div className="text-right"><span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1.5 block">Net Taxable Line</span><span className="text-xl font-black text-slate-950 font-mono">₹{item.amount.toLocaleString()}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-[0_50px_100px_-20px_rgba(15,23,42,0.5)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-all duration-1000 rotate-45 scale-125">
                  <Calculator size={220} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-14 border-b border-slate-900 pb-8">Final Financial Reconciliation</h3>
                  <div className="space-y-10">
                    <div className="flex justify-between items-center text-slate-400 font-black">
                      <span className="text-sm uppercase tracking-[0.2em]">Gross Assessment</span>
                      <span className="font-mono text-2xl text-white">₹{totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 font-black">
                      <span className="text-sm uppercase tracking-[0.2em]">Calculated GST Total</span>
                      <span className="font-mono text-2xl text-blue-500">₹{(totals.cgst + totals.sgst + totals.igst).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-slate-900 my-12"></div>
                    <div>
                      <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Total Value of Supply</p>
                      <p className="text-7xl font-black tracking-tighter text-white">₹{totals.total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSaving || items.length === 0} 
                className="w-full py-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[4rem] font-black text-3xl flex items-center justify-center gap-5 transition-all shadow-[0_40px_80px_-20px_rgba(37,99,235,0.5)] group disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="animate-spin" size={40} /> : <><ShieldCheck size={40} className="group-hover:rotate-12 transition-transform duration-500" /> Authorize Invoicing</>}
              </button>
              
              <div className="bg-white rounded-[4rem] p-12 border-2 border-slate-50 shadow-sm flex flex-col gap-8">
                 <div className="flex items-center gap-5">
                   <div className="p-5 bg-amber-50 text-amber-600 rounded-3xl shadow-inner"><ShieldCheck size={28} /></div>
                   <p className="text-xs font-black text-slate-950 uppercase tracking-[0.2em] leading-tight">Auditor Compliance</p>
                 </div>
                 <p className="text-xs text-slate-500 font-bold leading-relaxed italic">"Upon authorization, this document will be serialized and mirrored in your tax liability report (GSTR-1)."</p>
              </div>
            </div>
          </div>
          {/* Print only template renders at the bottom */}
          <InvoicePrintTemplate />
        </div>
      )}
    </div>
  );
};

export default Billing;
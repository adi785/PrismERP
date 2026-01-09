
import React, { useState, useMemo } from 'react';
import { Scale, TrendingUp, TrendingDown, Receipt, ShoppingCart, Calculator, Printer, ShieldCheck, FileText, Landmark, CreditCard } from 'lucide-react';
import { triggerPrint } from '../utils/exportUtils';
import { Ledger } from '../types';

const TaxCenter: React.FC<{ store: any }> = ({ store }) => {
  const { vouchers, company, ledgers } = store;
  const [activeTab, setActiveTab] = useState<'GST' | 'TDS'>('GST');

  const taxMetrics = useMemo(() => {
    const salesVouchers = vouchers.filter((v: any) => v.type === 'Sales');
    const purchaseVouchers = vouchers.filter((v: any) => v.type === 'Purchase');

    const outputTax = salesVouchers.reduce((sum: number, v: any) => sum + (v.gstTotal || 0), 0);
    const inputTax = purchaseVouchers.reduce((sum: number, v: any) => sum + (v.gstTotal || 0), 0);
    const netTaxPayable = Math.max(0, outputTax - inputTax);
    const itcAvailable = Math.max(0, inputTax - outputTax);

    const salesTotal = salesVouchers.reduce((sum: number, v: any) => sum + v.totalAmount, 0);
    const purchaseTotal = purchaseVouchers.reduce((sum: number, v: any) => sum + v.totalAmount, 0);

    return { outputTax, inputTax, netTaxPayable, itcAvailable, salesTotal, purchaseTotal };
  }, [vouchers]);

  const tdsMetrics = useMemo(() => {
    // Filter ledgers that contain "TDS" in their name for automatic detection
    const tdsLedgers = ledgers.filter((l: Ledger) => l.name.toUpperCase().includes('TDS'));
    
    // Classify based on Account Type
    const payableLedgers = tdsLedgers.filter((l: Ledger) => 
      ['Liability', 'Duties & Taxes'].includes(l.type) || l.group === 'Duties & Taxes' || l.group === 'Current Liabilities'
    );
    const receivableLedgers = tdsLedgers.filter((l: Ledger) => 
      ['Asset', 'Current Assets'].includes(l.type) || l.type === 'Asset'
    );

    const totalPayable = payableLedgers.reduce((sum: number, l: Ledger) => sum + Math.abs(l.currentBalance), 0);
    const totalReceivable = receivableLedgers.reduce((sum: number, l: Ledger) => sum + Math.abs(l.currentBalance), 0);

    return { tdsLedgers, payableLedgers, receivableLedgers, totalPayable, totalReceivable };
  }, [ledgers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Tax Compliance Hub</h2>
          <p className="text-sm text-slate-500 font-medium">Unified GST & TDS Statutory Reporting</p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button 
                  onClick={() => setActiveTab('GST')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  GST Returns
                </button>
                <button 
                  onClick={() => setActiveTab('TDS')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TDS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  TDS / TCS
                </button>
             </div>
             <button onClick={triggerPrint} className="p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-xl hover:bg-slate-800 transition-all">
               <Printer size={20} />
             </button>
        </div>
      </div>

      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <h1 className="text-3xl font-black uppercase tracking-tight">{company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">{activeTab === 'GST' ? 'GST Reconciliation & Liability' : 'TDS Ledger Statement & Liability'}</p>
        <p className="text-xs font-mono font-bold mt-1 text-slate-400">GSTIN: {company.gstin} • FY: {company.financialYear}</p>
      </div>

      {activeTab === 'GST' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
            <TaxCard label="Output Tax (Sales)" amount={taxMetrics.outputTax} icon={<TrendingUp className="text-rose-500" />} subtitle="GSTR-1 Liability" />
            <TaxCard label="Input Tax (Purchases)" amount={taxMetrics.inputTax} icon={<TrendingDown className="text-emerald-500" />} subtitle="ITC Available" />
            <TaxCard label="Net Tax Payable" amount={taxMetrics.netTaxPayable} icon={<Calculator className="text-blue-500" />} subtitle="Pending Payment" />
            <TaxCard label="ITC Carry Forward" amount={taxMetrics.itcAvailable} icon={<ShieldCheck className="text-amber-500" />} subtitle="Tax Credit" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Outward Supplies (Sales)</h3>
                <Receipt className="text-rose-400" size={20} />
              </div>
              <div className="p-8 space-y-6">
                <TaxLineItem label="Total Taxable Sales" amount={taxMetrics.salesTotal - taxMetrics.outputTax} />
                <TaxLineItem label="Output CGST" amount={taxMetrics.outputTax / 2} />
                <TaxLineItem label="Output SGST" amount={taxMetrics.outputTax / 2} />
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest">Total Sales Tax</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{taxMetrics.outputTax.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inward Supplies (ITC)</h3>
                <ShoppingCart className="text-emerald-400" size={20} />
              </div>
              <div className="p-8 space-y-6">
                <TaxLineItem label="Total Taxable Purchases" amount={taxMetrics.purchaseTotal - taxMetrics.inputTax} />
                <TaxLineItem label="Input CGST" amount={taxMetrics.inputTax / 2} />
                <TaxLineItem label="Input SGST" amount={taxMetrics.inputTax / 2} />
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest">Total Input Credit</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{taxMetrics.inputTax.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Liability Calculation</p>
              <h2 className="text-4xl font-black tracking-tighter">Final Tax Position</h2>
            </div>
            <div className="text-right">
              <p className={`text-5xl font-black tracking-tighter ${taxMetrics.netTaxPayable > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₹{Math.abs(taxMetrics.netTaxPayable - taxMetrics.itcAvailable).toLocaleString()}
              </p>
              <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">
                {taxMetrics.netTaxPayable > 0 ? 'Due for Settlement' : 'Net Credit Carryover'}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 scale-150 transition-transform group-hover:scale-[1.6]">
                    <Landmark size={120} />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl"><Calculator size={24} /></div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">TDS Liability (Payable)</h3>
                    </div>
                    <p className="text-5xl font-black tracking-tighter text-rose-600 dark:text-rose-400">₹{tdsMetrics.totalPayable.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-400 mt-2">Deducted on payments, due to Govt.</p>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 scale-150 transition-transform group-hover:scale-[1.6]">
                    <CreditCard size={120} />
                 </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl"><ShieldCheck size={24} /></div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">TDS Asset (Receivable)</h3>
                    </div>
                    <p className="text-5xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">₹{tdsMetrics.totalReceivable.toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-400 mt-2">Deducted from our income (26AS)</p>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <FileText size={16} /> TDS Ledger Breakdown
                 </h3>
              </div>
              <div className="p-8">
                 {tdsMetrics.tdsLedgers.length > 0 ? (
                   <div className="space-y-4">
                      {tdsMetrics.tdsLedgers.map((l: Ledger) => (
                         <div key={l.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                               <p className="text-sm font-black text-slate-800 dark:text-slate-200">{l.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l.group}</p>
                            </div>
                            <div className="text-right">
                               <p className={`text-lg font-black font-mono ${l.type === 'Asset' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  ₹{Math.abs(l.currentBalance).toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{l.currentBalance >= 0 ? (l.type === 'Asset' ? 'Dr' : 'Cr') : (l.type === 'Asset' ? 'Cr' : 'Dr')}</span>
                               </p>
                            </div>
                         </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                      No Ledgers with 'TDS' in nomenclature found.
                      <br/>Create ledgers named like "TDS Payable" or "TDS on Rent" to see them here.
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TaxCard: React.FC<{ label: string, amount: number, icon: React.ReactNode, subtitle: string }> = ({ label, amount, icon, subtitle }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">{icon}</div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subtitle}</span>
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₹{amount.toLocaleString()}</h4>
  </div>
);

const TaxLineItem: React.FC<{ label: string, amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</span>
    <span className="font-mono font-bold text-slate-800 dark:text-white">₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
  </div>
);

export default TaxCenter;

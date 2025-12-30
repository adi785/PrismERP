import React, { useMemo } from 'react';
import { Scale, TrendingUp, TrendingDown, Receipt, ShoppingCart, Calculator, Printer, ShieldCheck } from 'lucide-react';
import { triggerPrint } from '../utils/exportUtils';

const TaxCenter: React.FC<{ store: any }> = ({ store }) => {
  const { vouchers, company } = store;

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tax Compliance Hub</h2>
          <p className="text-sm text-slate-500 font-medium">GST reconciliation and tax liability reporting</p>
        </div>
        <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
          <Printer size={16} /> Print Tax Report
        </button>
      </div>

      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <h1 className="text-3xl font-black uppercase tracking-tight">{company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Tax Reconciliation & GST Audit Statement</p>
        <p className="text-xs font-mono font-bold mt-1 text-slate-400">GSTIN: {company.gstin} • FY: {company.financialYear}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <TaxCard label="Output Tax (Sales)" amount={taxMetrics.outputTax} icon={<TrendingUp className="text-rose-500" />} subtitle="GSTR-1 Liability" />
        <TaxCard label="Input Tax (Purchases)" amount={taxMetrics.inputTax} icon={<TrendingDown className="text-emerald-500" />} subtitle="ITC Available" />
        <TaxCard label="Net Tax Payable" amount={taxMetrics.netTaxPayable} icon={<Calculator className="text-blue-500" />} subtitle="Pending Payment" />
        <TaxCard label="ITC Carry Forward" amount={taxMetrics.itcAvailable} icon={<ShieldCheck className="text-amber-500" />} subtitle="Tax Credit" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Outward Supplies (Sales)</h3>
            <Receipt className="text-rose-400" size={20} />
          </div>
          <div className="p-8 space-y-6">
            <TaxLineItem label="Total Taxable Sales" amount={taxMetrics.salesTotal - taxMetrics.outputTax} />
            <TaxLineItem label="Output CGST" amount={taxMetrics.outputTax / 2} />
            <TaxLineItem label="Output SGST" amount={taxMetrics.outputTax / 2} />
            <div className="pt-6 border-t flex justify-between items-center">
              <span className="font-black text-slate-900 text-xs uppercase tracking-widest">Total Sales Tax</span>
              <span className="text-2xl font-black text-rose-600">₹{taxMetrics.outputTax.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inward Supplies (ITC)</h3>
            <ShoppingCart className="text-emerald-400" size={20} />
          </div>
          <div className="p-8 space-y-6">
            <TaxLineItem label="Total Taxable Purchases" amount={taxMetrics.purchaseTotal - taxMetrics.inputTax} />
            <TaxLineItem label="Input CGST" amount={taxMetrics.inputTax / 2} />
            <TaxLineItem label="Input SGST" amount={taxMetrics.inputTax / 2} />
            <div className="pt-6 border-t flex justify-between items-center">
              <span className="font-black text-slate-900 text-xs uppercase tracking-widest">Total Input Credit</span>
              <span className="text-2xl font-black text-emerald-600">₹{taxMetrics.inputTax.toLocaleString()}</span>
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
    </div>
  );
};

const TaxCard: React.FC<{ label: string, amount: number, icon: React.ReactNode, subtitle: string }> = ({ label, amount, icon, subtitle }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-slate-50 rounded-xl">{icon}</div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{subtitle}</span>
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-black text-slate-900 tracking-tight">₹{amount.toLocaleString()}</h4>
  </div>
);

const TaxLineItem: React.FC<{ label: string, amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-bold text-slate-600">{label}</span>
    <span className="font-mono font-bold text-slate-800">₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
  </div>
);

export default TaxCenter;
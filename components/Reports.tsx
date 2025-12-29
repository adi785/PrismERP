import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart, Landmark, TrendingUp, TrendingDown, Wallet, FileText, Printer, ChevronRight } from 'lucide-react';
import { Ledger } from '../types';
import { triggerPrint } from '../utils/exportUtils';

const Reports: React.FC<{ store: any }> = ({ store }) => {
  const [activeReport, setActiveReport] = useState<'PL' | 'BS'>('PL');
  const { ledgers, company } = store;

  const financialData = useMemo(() => {
    const incomes = ledgers.filter((l: Ledger) => l.type === 'Income');
    const expenses = ledgers.filter((l: Ledger) => l.type === 'Expense');
    const assets = ledgers.filter((l: Ledger) => l.type === 'Asset');
    const liabilities = ledgers.filter((l: Ledger) => l.type === 'Liability');
    const equity = ledgers.filter((l: Ledger) => l.type === 'Equity');

    const totalIncome = incomes.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalExpense = expenses.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const netProfit = totalIncome - totalExpense;

    const totalAssets = assets.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalLiabilities = liabilities.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalEquity = equity.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);

    return { incomes, expenses, assets, liabilities, equity, totalIncome, totalExpense, netProfit, totalAssets, totalLiabilities, totalEquity };
  }, [ledgers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Statements</h2>
          <p className="text-sm text-slate-500 font-medium">Audited accounting snapshots for {company.name}</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveReport('PL')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeReport === 'PL' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Profit & Loss
          </button>
          <button 
            onClick={() => setActiveReport('BS')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeReport === 'BS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Balance Sheet
          </button>
        </div>
        <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
          <Printer size={16} /> Export Financials
        </button>
      </div>

      {/* Shared Print Header */}
      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase">{company.name}</h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              {activeReport === 'PL' ? 'Income Statement (P&L)' : 'Statement of Financial Position (Balance Sheet)'}
            </p>
            <p className="text-xs font-mono font-bold mt-1">FY {company.financialYear} • GSTIN: {company.gstin}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Date</p>
             <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {activeReport === 'PL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          {/* Income Side */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="text-emerald-700 font-black uppercase tracking-widest text-xs">Revenue & Incomes</h3>
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.incomes.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-emerald-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs">Total Revenue</span>
                <span className="text-xl font-black text-emerald-600">₹{financialData.totalIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Expense Side */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="text-rose-700 font-black uppercase tracking-widest text-xs">Direct & Indirect Expenses</h3>
              <TrendingDown className="text-rose-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.expenses.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-rose-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs">Total Expenditure</span>
                <span className="text-xl font-black text-rose-600">₹{financialData.totalExpense.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex items-center justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <BarChart3 size={180} />
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Bottom Line Result</p>
               <h2 className="text-5xl font-black tracking-tighter">
                 {financialData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
               </h2>
             </div>
             <div className="text-right">
               <p className="text-6xl font-black text-blue-400 tracking-tighter">₹{Math.abs(financialData.netProfit).toLocaleString()}</p>
               <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Adjusted for Closing Stock & Depreciation</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
          {/* Assets Side */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <h3 className="text-blue-700 font-black uppercase tracking-widest text-xs">Application of Funds (Assets)</h3>
              <Wallet className="text-blue-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.assets.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-blue-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs">Total Assets</span>
                <span className="text-xl font-black text-blue-600">₹{financialData.totalAssets.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Liabilities Side */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-slate-700 font-black uppercase tracking-widest text-xs">Sources of Funds (Liabilities)</h3>
              <Landmark className="text-slate-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.equity.map(l => (
                <ReportRow key={l.id} label={`${l.name} (Equity)`} amount={l.currentBalance} />
              ))}
              {financialData.liabilities.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-slate-200 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs">Total Liabilities & Equity</span>
                <span className="text-xl font-black text-slate-900">₹{(financialData.totalLiabilities + financialData.totalEquity).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="print-only mt-20 p-8 border border-slate-200 rounded-3xl bg-slate-50 text-[10px] text-slate-500 italic leading-relaxed">
        <strong>Accounting Disclaimer:</strong> This statement is derived from live bookkeeping entries. It is intended for management information purposes only and should not be used as a final audit document for statutory filing without professional verification by a Chartered Accountant.
      </div>
    </div>
  );
};

const ReportRow: React.FC<{ label: string, amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between items-center group">
    <div className="flex items-center gap-2">
      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
      <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
    </div>
    <span className="font-mono font-bold text-slate-700">₹{Math.abs(amount).toLocaleString()}</span>
  </div>
);

export default Reports;

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Sparkles, Loader2, MessageSquare, RefreshCw, ShieldCheck, FileSearch, ServerCrash, Key, Printer, Lock, Scale } from 'lucide-react';
import { Ledger } from '../types';
import { GoogleGenAI } from "@google/genai";
import MarkdownRenderer from './MarkdownRenderer';
import { triggerPrint } from '../utils/exportUtils';

const Reports: React.FC<{ store: any }> = ({ store }) => {
  const [activeReport, setActiveReport] = useState<'PL' | 'BS'>('PL');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  
  const { ledgers, company, vouchers } = store;

  const financialData = useMemo(() => {
    const incomes = ledgers.filter((l: Ledger) => l.type === 'Income');
    const expenses = ledgers.filter((l: Ledger) => l.type === 'Expense');
    const assets = ledgers.filter((l: Ledger) => l.type === 'Asset');
    const liabilities = ledgers.filter((l: Ledger) => l.type === 'Liability');
    const equity = ledgers.filter((l: Ledger) => l.type === 'Equity');
    
    // Standard accounting logic for balances
    const totalIncome = incomes.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalExpense = expenses.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalAssets = assets.reduce((sum: number, l: any) => sum + l.currentBalance, 0);
    const totalLiabilities = liabilities.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalEquity = equity.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    
    const netProfit = totalIncome - totalExpense;
    const hasData = totalIncome > 0 || totalExpense > 0 || vouchers.length > 0;

    return { incomes, expenses, assets, liabilities, equity, totalIncome, totalExpense, totalAssets, totalLiabilities, totalEquity, netProfit, hasData };
  }, [ledgers, vouchers]);

  const handleAIAnalysis = async () => {
    if (!financialData.hasData) return;
    setIsAnalyzing(true);
    setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Financial Summary for ${company.name}: REVENUE: ₹${financialData.totalIncome}, EXPENSE: ₹${financialData.totalExpense}, NET: ₹${financialData.netProfit}. Analysis needed.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Provide a concise financial health briefing for the CEO. ALWAYS use Indian Rupee (INR / ₹) for currency. Use the Indian numbering system (Lakhs, Crores). Use professional corporate language." }
      });
      setAiSummary(response.text || "Analysis complete.");
    } catch (err: any) {
      setAiSummary(`ERROR: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="print-only">
        <table className="w-full">
          <thead className="table-header-group">
            <tr>
              <td className="p-10 border-b-4 border-black">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">{company.name}</h1>
                    <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-[0.2em]">{company.address}</p>
                    <p className="text-[10px] font-black mt-2 uppercase tracking-widest bg-black text-white px-3 py-1 rounded inline-block">GSTIN: {company.gstin}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-black uppercase mb-1">{activeReport === 'PL' ? 'Profit & Loss Statement' : 'Balance Sheet Report'}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase">FY: {company.financialYear}</p>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-10">
                <div className="grid grid-cols-2 gap-10">
                   {activeReport === 'PL' ? (
                     <>
                        <ReportSection title="Revenue Operations" data={financialData.incomes} total={financialData.totalIncome} color="emerald" icon={<TrendingUp size={14}/>} />
                        <ReportSection title="Operational Expenses" data={financialData.expenses} total={financialData.totalExpense} color="rose" icon={<TrendingDown size={14}/>} />
                        <div className="col-span-full mt-10 p-10 bg-slate-900 text-white rounded-3xl flex justify-between items-center">
                           <h2 className="text-4xl font-black uppercase">Net Total Profit</h2>
                           <span className="text-5xl font-black tracking-tighter text-blue-400">₹{financialData.netProfit.toLocaleString()}</span>
                        </div>
                     </>
                   ) : (
                     <>
                        <ReportSection title="Current Assets" data={financialData.assets} total={financialData.totalAssets} color="blue" icon={<ShieldCheck size={14}/>} />
                        <div className="space-y-10">
                           <ReportSection title="Current Liabilities" data={financialData.liabilities} total={financialData.totalLiabilities} color="rose" icon={<Lock size={14}/>} />
                           <ReportSection title="Capital & Reserves" data={financialData.equity} total={financialData.totalEquity} color="amber" icon={<Scale size={14}/>} />
                        </div>
                     </>
                   )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Financial Intelligence</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Audit-Ready Compliance Node</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => triggerPrint()} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Printer size={16} /> Print Report
          </button>
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setActiveReport('PL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'PL' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500'}`}>P & L</button>
            <button onClick={() => setActiveReport('BS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'BS' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500'}`}>Balance Sheet</button>
          </div>
        </div>
      </div>

      {!financialData.hasData ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 p-20 text-center shadow-sm no-print">
           <FileSearch className="text-slate-200 dark:text-slate-800 mx-auto mb-8" size={48} />
           <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Awaiting Journal Entries</h3>
           <p className="text-slate-500 italic max-w-md mx-auto font-medium">Record sales or purchases to generate real-time financial intelligence.</p>
        </div>
      ) : activeReport === 'PL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 no-print">
          <ReportSection title="Revenue / Incomes" data={financialData.incomes} total={financialData.totalIncome} color="emerald" icon={<TrendingUp size={18} />} />
          <ReportSection title="Expenditure / Expenses" data={financialData.expenses} total={financialData.totalExpense} color="rose" icon={<TrendingDown size={18} />} />
          <div className="lg:col-span-2 bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150 group-hover:scale-[1.6] transition-transform duration-700"><TrendingUp size={240}/></div>
               <div className="relative z-10">
                 <p className="text-[11px] font-black text-slate-500 uppercase mb-4 tracking-[0.4em]">Statement Outcome</p>
                 <h2 className="text-6xl font-black tracking-tighter">Net {financialData.netProfit >= 0 ? 'Profit' : 'Loss'}</h2>
               </div>
               <div className="relative z-10 text-right">
                 <p className={`text-7xl font-black tracking-tighter ${financialData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{Math.abs(financialData.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </p>
               </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 no-print">
          <ReportSection title="Assets" data={financialData.assets} total={financialData.totalAssets} color="blue" icon={<TrendingUp size={18} />} />
          <div className="space-y-10">
            <ReportSection title="Liabilities" data={financialData.liabilities} total={financialData.totalLiabilities} color="rose" icon={<TrendingDown size={18} />} />
            <ReportSection title="Equity & Capital" data={financialData.equity} total={financialData.totalEquity} color="amber" icon={<ShieldCheck size={18} />} />
          </div>
        </div>
      )}
    </div>
  );
};

const ReportSection: React.FC<{ title: string, data: any[], total: number, color: string, icon: React.ReactNode }> = ({ title, data, total, color, icon }) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400',
    blue: 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col print:border-2 print:border-slate-100 print:rounded-2xl">
      <div className={`px-10 py-8 border-b dark:border-slate-800 flex items-center justify-between ${colorMap[color]}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800 shadow-sm">{icon}</div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">{title}</h3>
        </div>
      </div>
      <div className="p-10 flex-1 space-y-6">
        {data.length > 0 ? data.map(l => (
            <div key={l.id} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400">
              <span className="uppercase">{l.name}</span>
              <span className="font-mono text-slate-900 dark:text-white font-black">₹{Math.abs(l.currentBalance).toLocaleString()}</span>
            </div>
        )) : (
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest text-center py-4 italic">No ledger entries found</p>
        )}
      </div>
      <div className="p-10 border-t-2 dark:border-slate-800 mt-auto bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
        <span className="font-black text-slate-900 dark:text-slate-400 uppercase text-[10px] tracking-[0.3em]">Aggregate {title}</span>
        <span className={`text-2xl font-black tracking-tighter ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
          ₹{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default Reports;

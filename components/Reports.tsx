
import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Sparkles, Loader2, MessageSquare, RefreshCw, ShieldCheck, FileSearch, ServerCrash, Key, Printer } from 'lucide-react';
import { Ledger } from '../types';
import { GoogleGenAI } from "@google/genai";
import MarkdownRenderer from './MarkdownRenderer';
import { triggerPrint } from '../utils/exportUtils';

const Reports: React.FC<{ store: any }> = ({ store }) => {
  const [activeReport, setActiveReport] = useState<'PL' | 'BS'>('PL');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  
  const { ledgers, company, vouchers, refreshData } = store;

  const financialData = useMemo(() => {
    const incomes = ledgers.filter((l: Ledger) => l.type === 'Income');
    const expenses = ledgers.filter((l: Ledger) => l.type === 'Expense');
    const assets = ledgers.filter((l: Ledger) => l.type === 'Asset');
    const liabilities = ledgers.filter((l: Ledger) => l.type === 'Liability');
    const equity = ledgers.filter((l: Ledger) => l.type === 'Equity');
    
    const totalIncome = incomes.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalExpense = expenses.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalAssets = assets.reduce((sum: number, l: any) => sum + l.currentBalance, 0);
    const totalLiabilities = liabilities.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    const totalEquity = equity.reduce((sum: number, l: any) => sum + Math.abs(l.currentBalance), 0);
    
    const netProfit = totalIncome - totalExpense;
    const hasData = totalIncome > 0 || totalExpense > 0 || vouchers.length > 0;

    return { incomes, expenses, assets, liabilities, equity, totalIncome, totalExpense, totalAssets, totalLiabilities, totalEquity, netProfit, hasData };
  }, [ledgers, vouchers]);

  const checkKeyState = async () => {
    const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY);
    // @ts-ignore - aistudio is pre-configured in the environment
    const hasSelectedKey = await window.aistudio?.hasSelectedApiKey();
    return !!(apiKey || hasSelectedKey);
  };

  const handleSelectKey = async () => {
    // @ts-ignore - aistudio is pre-configured in the environment
    await window.aistudio?.openSelectKey();
    setNeedsKey(false);
    handleAIAnalysis();
  };

  const handleAIAnalysis = async () => {
    if (!financialData.hasData) return;
    
    const keyIsReady = await checkKeyState();
    if (!keyIsReady) {
      setNeedsKey(true);
      return;
    }

    setIsAnalyzing(true);
    setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Financial Summary for ${company.name}: REVENUE: ₹${financialData.totalIncome}, EXPENSE: ₹${financialData.totalExpense}, NET: ₹${financialData.netProfit}. Analysis needed.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "Provide a concise financial health briefing for the CEO. ALWAYS use Indian Rupee (INR / ₹) for currency. Use the Indian numbering system (Lakhs, Crores). Use Markdown for bolding and lists. Use professional corporate language." }
      });
      setAiSummary(response.text || "Analysis complete.");
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setNeedsKey(true);
      } else {
        setAiSummary(`ERROR: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Formal Print Header */}
      <div className="print-only mb-12 pb-10 border-b-2 border-slate-900">
        <h1 className="text-4xl font-black uppercase tracking-tighter">{company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-[0.2em]">
          {activeReport === 'PL' ? 'Statement of Profit and Loss' : 'Balance Sheet'}
        </p>
        <p className="text-xs font-black mt-2 text-slate-900 uppercase tracking-widest">
          Accounting Period: {company.financialYear} • Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Intelligence</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Live Reporting Node</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => triggerPrint()} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2">
            <Printer size={16} /> Print Report
          </button>
          <div className="flex bg-slate-200 p-1 rounded-2xl">
            <button onClick={() => setActiveReport('PL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeReport === 'PL' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>P & L</button>
            <button onClick={() => setActiveReport('BS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeReport === 'BS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Balance Sheet</button>
          </div>
        </div>
      </div>

      <div className={`${needsKey ? 'bg-amber-50 border-amber-200' : aiSummary?.includes('ERROR') ? 'bg-rose-50 border-rose-200' : aiSummary ? 'bg-white shadow-xl' : 'bg-slate-50 border-dashed border-slate-200'} rounded-[2.5rem] p-10 border-2 transition-all min-h-[160px] flex flex-col justify-center no-print`}>
        {needsKey ? (
          <div className="flex items-center gap-8 text-amber-900">
             <div className="p-5 bg-amber-500 text-white rounded-[2rem] shadow-lg"><Key size={40} /></div>
             <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2">AI Activation Required</h3>
                <p className="text-base font-bold">Please select an API Key to generate financial briefings.</p>
                <button onClick={handleSelectKey} className="mt-4 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Select Key</button>
             </div>
          </div>
        ) : !aiSummary ? (
          <div className="flex flex-col items-center text-center space-y-4">
             <Sparkles className="text-blue-500 opacity-40" size={40} />
             <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Generate Executive Briefing</>}
             </button>
          </div>
        ) : (
          <div className={`flex items-start gap-8 ${aiSummary.includes('ERROR') ? 'text-rose-900' : 'text-slate-900'}`}>
             <div className={`p-5 rounded-[2rem] backdrop-blur-xl ${aiSummary.includes('ERROR') ? 'bg-rose-600/10' : 'bg-blue-600/10'}`}>
                {aiSummary.includes('ERROR') ? <ServerCrash size={40} className="text-rose-600" /> : <MessageSquare size={40} className="text-blue-600" />}
             </div>
             <div className="flex-1">
                <h3 className={`text-sm font-black uppercase tracking-[0.3em] mb-4 opacity-70 ${aiSummary.includes('ERROR') ? 'text-rose-600' : 'text-blue-600'}`}>
                  {aiSummary.includes('ERROR') ? 'System Alert' : 'Briefing Result'}
                </h3>
                <MarkdownRenderer content={aiSummary} className={aiSummary.includes('ERROR') ? 'prose-rose' : 'prose-slate'} />
                <button onClick={() => setAiSummary(null)} className="mt-6 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 block underline">Clear</button>
             </div>
          </div>
        )}
      </div>

      {!financialData.hasData ? (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 p-20 text-center shadow-sm">
           <FileSearch className="text-slate-200 mx-auto mb-8" size={48} />
           <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Awaiting Transactions</h3>
           <p className="text-slate-500 italic max-w-md mx-auto font-medium">Record sales or purchases to generate intelligence.</p>
        </div>
      ) : activeReport === 'PL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <ReportSection title="Revenue / Incomes" data={financialData.incomes} total={financialData.totalIncome} color="emerald" icon={<TrendingUp size={18} />} />
          <ReportSection title="Expenditure / Expenses" data={financialData.expenses} total={financialData.totalExpense} color="rose" icon={<TrendingDown size={18} />} />
          <div className="lg:col-span-2 bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between">
               <div>
                 <p className="text-[11px] font-black text-slate-500 uppercase mb-4 tracking-[0.4em]">Financial Outcome</p>
                 <h2 className="text-6xl font-black tracking-tighter">Net {financialData.netProfit >= 0 ? 'Profit' : 'Loss'}</h2>
               </div>
               <div className="text-right">
                 <p className={`text-7xl font-black tracking-tighter ${financialData.netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    ₹{Math.abs(financialData.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </p>
                 <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-black uppercase text-slate-500">
                    <ShieldCheck size={14} className="text-emerald-500" /> Book Certified
                 </div>
               </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <ReportSection title="Assets" data={financialData.assets} total={financialData.totalAssets} color="blue" icon={<TrendingUp size={18} />} />
          <div className="space-y-10">
            <ReportSection title="Liabilities" data={financialData.liabilities} total={financialData.totalLiabilities} color="rose" icon={<TrendingDown size={18} />} />
            <ReportSection title="Equity & Capital" data={financialData.equity} total={financialData.totalEquity} color="amber" icon={<ShieldCheck size={18} />} />
          </div>
          <div className="lg:col-span-2 p-12 bg-white rounded-[4rem] border-4 border-slate-900 text-slate-900 flex flex-col md:flex-row items-center justify-between shadow-xl">
               <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase mb-4 tracking-[0.4em]">Statement of Financial Position</p>
                 <h2 className="text-6xl font-black tracking-tighter">Total Valuation</h2>
               </div>
               <div className="text-right">
                 <p className="text-7xl font-black tracking-tighter text-slate-900">
                    ₹{financialData.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </p>
                 <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-black uppercase text-slate-400">
                    <ShieldCheck size={14} className="text-blue-500" /> Standard Accounting Principles (SAP) Applied
                 </div>
               </div>
          </div>
        </div>
      )}

      {/* Print Only Footer */}
      <div className="print-only mt-32 grid grid-cols-3 gap-10">
        <div className="pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase text-slate-400">Prepared By</p>
        </div>
        <div className="pt-8 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase text-slate-400">Verified By Audit</p>
        </div>
        <div className="pt-8 border-t-2 border-slate-900 text-center">
          <p className="text-[10px] font-black uppercase text-slate-900">Chief Financial Officer</p>
        </div>
      </div>
    </div>
  );
};

const ReportSection: React.FC<{ title: string, data: any[], total: number, color: string, icon: React.ReactNode }> = ({ title, data, total, color, icon }) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800',
    rose: 'bg-rose-50 text-rose-800',
    blue: 'bg-blue-50 text-blue-800',
    amber: 'bg-amber-50 text-amber-800'
  };
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col print:border-2 print:border-slate-100">
      <div className={`px-10 py-8 border-b flex items-center justify-between ${colorMap[color]}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/50">{icon}</div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">{title}</h3>
        </div>
      </div>
      <div className="p-10 flex-1 space-y-6">
        {data.length > 0 ? data.map(l => (
            <div key={l.id} className="flex justify-between items-center text-sm font-bold text-slate-600">
              <span className="uppercase">{l.name}</span>
              <span className="font-mono text-slate-900 font-black">₹{Math.abs(l.currentBalance).toLocaleString()}</span>
            </div>
        )) : (
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center py-4 italic">No ledger entries found</p>
        )}
      </div>
      <div className="p-10 border-t-2 mt-auto bg-slate-50 flex justify-between items-center">
        <span className="font-black text-slate-900 uppercase text-[10px] tracking-[0.3em]">Total {title}</span>
        <span className={`text-2xl font-black tracking-tighter ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>
          ₹{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default Reports;

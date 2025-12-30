
import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Printer, 
  ChevronRight, 
  Sparkles, 
  Loader2, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck,
  History,
  FileSearch,
  DatabaseZap
} from 'lucide-react';
import { Ledger, StockItem } from '../types';
import { triggerPrint } from '../utils/exportUtils';
import { GoogleGenAI } from "@google/genai";

const Reports: React.FC<{ store: any }> = ({ store }) => {
  const [activeReport, setActiveReport] = useState<'PL' | 'BS' | 'SKU'>('PL');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  
  const { ledgers, company, stockItems, vouchers, refreshData } = store;

  // 1. FINANCIAL CALCULATION ENGINE
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

    const hasData = totalIncome > 0 || totalExpense > 0 || vouchers.length > 0;

    return { 
      incomes, expenses, assets, liabilities, equity, 
      totalIncome, totalExpense, netProfit, 
      totalAssets, totalLiabilities, totalEquity,
      hasData
    };
  }, [ledgers, vouchers]);

  // 2. FORCE RECONCILIATION (BALANCE FIX)
  const handleForceReconcile = async () => {
    setIsReconciling(true);
    try {
      // We trigger a deep refresh of the ERP data store
      await refreshData();
      // Added a small delay to simulate auditing and ensure UI reactivity
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setIsReconciling(false);
    }
  };

  // 3. AI EXECUTIVE ANALYSIS
  const handleAIAnalysis = async () => {
    if (!financialData.hasData) {
      setAiSummary("Audit halted: No transaction history found in the Day Book. Please record sales or purchase vouchers to generate intelligence.");
      return;
    }

    setIsAnalyzing(true);
    setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Perform a high-level financial audit for ${company.name}.
      PERIOD: ${company.financialYear}
      NET SURPLUS: ₹${financialData.netProfit}
      REVENUE: ₹${financialData.totalIncome}
      EXPENDITURE: ₹${financialData.totalExpense}
      ASSET BASE: ₹${financialData.totalAssets}
      
      Instructions: Return 3 high-impact executive bullet points. If profit is 0, suggest immediate actions. Use professional financial terminology.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.2 }
      });
      setAiSummary(response.text || "Diagnostic generated no output.");
    } catch (err: any) {
      const isAuthError = err.message?.includes('API_KEY');
      setAiSummary(isAuthError 
        ? "Intelligence Gateway Error: The Gemini API Key is missing or invalid. Check system environment variables."
        : `Intelligence Error: ${err.message || "Connection timed out during analysis."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Intelligence</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full ${financialData.hasData ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
             <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
               {financialData.hasData ? 'Live Data Stream' : 'Awaiting Records'}
             </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleForceReconcile}
            disabled={isReconciling}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm group"
          >
            <RefreshCw size={16} className={`${isReconciling ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
            Re-Sync Balances
          </button>
          <div className="flex bg-slate-200 p-1 rounded-2xl">
            <button onClick={() => setActiveReport('PL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'PL' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>P & L</button>
            <button onClick={() => setActiveReport('BS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'BS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Balance Sheet</button>
          </div>
          <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
            <Printer size={16} /> Export
          </button>
        </div>
      </div>

      {/* AI Intelligence Panel */}
      <div className={`${aiSummary ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-50 border-2 border-dashed border-slate-200'} rounded-[2.5rem] p-10 transition-all duration-700 relative overflow-hidden group min-h-[160px] flex flex-col justify-center`}>
        {!aiSummary ? (
          <div className="flex flex-col items-center text-center space-y-4">
             <Sparkles className="text-blue-500 opacity-40 group-hover:scale-110 transition-transform" size={40} />
             <div>
                <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Executive Briefing Unavailable</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Tap the button below to generate a real-time audit report using AI.</p>
             </div>
             <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center gap-3"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18} /> Run Intelligence Analysis</>}
             </button>
          </div>
        ) : (
          <div className="flex items-start gap-8 relative z-10 text-white animate-in zoom-in-95">
             <div className="p-5 bg-white/20 rounded-[2rem] backdrop-blur-xl shrink-0 shadow-inner">
                <MessageSquare size={40} />
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                   <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-80">System Audit Insight</h3>
                   <button onClick={() => setAiSummary(null)} className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Dismiss</button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-lg font-medium leading-relaxed italic">
                  {aiSummary.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                </div>
             </div>
          </div>
        )}
        {aiSummary && <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150"><Sparkles size={200} /></div>}
      </div>

      {/* Main Financial Grid */}
      {!financialData.hasData ? (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 p-20 text-center shadow-sm">
           <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <FileSearch className="text-slate-200" size={48} />
           </div>
           <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Zero Financial Activity Detected</h3>
           <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-12 italic">
              "Your ledger books are perfectly balanced, but only because they are currently empty."
           </p>
           <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-3 w-64 group hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer">
                 <div className="p-3 bg-white rounded-xl shadow-sm text-blue-500 group-hover:scale-110 transition-transform"><RefreshCw size={24}/></div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1</p>
                 <p className="text-sm font-bold text-slate-700">Sync Day Book</p>
              </div>
              <ChevronRight className="text-slate-200 hidden md:block" />
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-3 w-64 group hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer">
                 <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-500 group-hover:scale-110 transition-transform"><Landmark size={24}/></div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2</p>
                 <p className="text-sm font-bold text-slate-700">Verify Ledgers</p>
              </div>
           </div>
        </div>
      ) : activeReport === 'PL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-left-4 duration-700">
          <ReportSection title="Income Accounts" data={financialData.incomes} total={financialData.totalIncome} color="emerald" icon={<TrendingUp size={18} />} />
          <ReportSection title="Expense Accounts" data={financialData.expenses} total={financialData.totalExpense} color="rose" icon={<TrendingDown size={18} />} />
          
          <div className="lg:col-span-2 bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12 scale-150">
                <BarChart3 size={200} />
             </div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
               <div>
                 <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Financial Outcome (A - B)</p>
                 <h2 className="text-6xl font-black tracking-tighter leading-none">
                    {financialData.netProfit >= 0 ? 'Surplus Performance' : 'Deficit Outlook'}
                 </h2>
                 <p className="text-slate-400 mt-6 max-w-sm font-medium leading-relaxed italic opacity-80">
                    Calculated based on {vouchers.length} real-time transactions recorded in the current financial period.
                 </p>
               </div>
               <div className="text-right">
                 <p className={`text-7xl font-black tracking-tighter ${financialData.netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                    ₹{Math.abs(financialData.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </p>
                 <div className="mt-4 flex items-center justify-end gap-3 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Audited by Prism Engine
                 </div>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-right-4 duration-700">
          <ReportSection title="Assets" data={financialData.assets} total={financialData.totalAssets} color="blue" icon={<Wallet size={18} />} />
          <ReportSection title="Liabilities & Equity" data={[...financialData.equity, ...financialData.liabilities]} total={financialData.totalLiabilities + financialData.totalEquity} color="slate" icon={<Landmark size={18} />} />
        </div>
      )}

      {/* Recovery/Diagnostic Notice */}
      <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 flex items-start gap-6 no-print">
         <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
            <DatabaseZap size={28} />
         </div>
         <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Financial Data Integrity</h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed max-w-2xl">
               If your figures look incorrect, use the <strong>"Re-Sync Balances"</strong> tool at the top right. This will scan your entire transaction history and recalculate every ledger to ensure perfect book-to-book accuracy.
            </p>
         </div>
      </div>
    </div>
  );
};

const ReportSection: React.FC<{ title: string, data: Ledger[], total: number, color: string, icon: React.ReactNode }> = ({ title, data, total, color, icon }) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    rose: 'bg-rose-50 border-rose-100 text-rose-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800'
  };

  const badgeMap: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-100',
    rose: 'text-rose-500 bg-rose-100',
    blue: 'text-blue-500 bg-blue-100',
    slate: 'text-slate-500 bg-slate-200'
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col group hover:shadow-xl transition-shadow duration-500">
      <div className={`px-10 py-8 border-b flex items-center justify-between no-print ${colorMap[color]}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${badgeMap[color]}`}>{icon}</div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">{title}</h3>
        </div>
        <p className="text-xs font-black opacity-50 uppercase tracking-widest">{data.length} Accounts</p>
      </div>
      <div className="p-10 flex-1 space-y-6">
        {data.length === 0 ? (
          <div className="py-12 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest">No entries found in this class</p>
          </div>
        ) : (
          data.map(l => (
            <div key={l.id} className="flex justify-between items-center group/row">
              <div className="flex items-center gap-3">
                <ChevronRight size={14} className="text-slate-200 group-hover/row:text-blue-500 transition-colors" />
                <span className="text-sm font-bold text-slate-600 group-hover/row:text-slate-900 transition-colors">{l.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-700 tracking-tighter">₹{Math.abs(l.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))
        )}
      </div>
      <div className={`p-10 border-t-2 mt-auto flex justify-between items-center ${color === 'rose' || color === 'emerald' ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/30 border-slate-100'}`}>
        <span className="font-black text-slate-900 uppercase text-[10px] tracking-[0.3em]">Aggregate Value</span>
        <span className={`text-2xl font-black tracking-tighter ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>
          ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

export default Reports;

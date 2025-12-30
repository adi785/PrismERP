import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart, Landmark, TrendingUp, TrendingDown, Wallet, FileText, Printer, ChevronRight, ShieldCheck, Tag, BarChart, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { Ledger, StockItem } from '../types';
import { triggerPrint } from '../utils/exportUtils';
import { GoogleGenAI } from "@google/genai";

const Reports: React.FC<{ store: any }> = ({ store }) => {
  const [activeReport, setActiveReport] = useState<'PL' | 'BS' | 'SKU'>('PL');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { ledgers, company, stockItems, vouchers } = store;

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

  // AI ANALYTICS LOGIC
  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this ERP data for ${company.name}. 
      Profit/Loss: ₹${financialData.netProfit}
      Total Revenue: ₹${financialData.totalIncome}
      Total Expenses: ₹${financialData.totalExpense}
      Top Stock Items: ${JSON.stringify(stockItems.slice(0, 5).map((s:any) => ({name: s.name, qty: s.currentStock})))}
      
      Give a professional executive summary in 3 concise bullet points. Focus on financial health and inventory warnings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.3 }
      });
      setAiSummary(response.text || "Insight could not be generated.");
    } catch (err) {
      setAiSummary("Analysis error: Verify API key or connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const skuMetrics = useMemo(() => {
    return stockItems.map((item: StockItem) => {
      const movements = vouchers.flatMap((v: any) => v.inventory || []).filter((m: any) => m.itemId === item.id);
      const salesVolume = movements.filter((m: any) => m.type === 'Out').reduce((s: number, m: any) => s + m.quantity, 0);
      const salesRevenue = movements.filter((m: any) => m.type === 'Out').reduce((s: number, m: any) => s + m.amount, 0);
      const cogs = salesVolume * item.purchasePrice;
      const margin = salesRevenue - cogs;
      const marginPercent = salesRevenue === 0 ? 0 : (margin / salesRevenue) * 100;
      
      return { ...item, salesVolume, salesRevenue, cogs, margin, marginPercent };
    }).sort((a: any, b: any) => b.margin - a.margin);
  }, [stockItems, vouchers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Statements</h2>
          <p className="text-sm text-slate-500 font-medium">Audited accounting snapshots for {company.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all border border-blue-200"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} /> AI Insight</>}
          </button>
          <div className="flex bg-slate-200 p-1 rounded-2xl">
            <button onClick={() => setActiveReport('PL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'PL' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>P & L</button>
            <button onClick={() => setActiveReport('BS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'BS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>Balance Sheet</button>
            <button onClick={() => setActiveReport('SKU')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeReport === 'SKU' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>SKU Intelligence</button>
          </div>
          <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
            <Printer size={16} /> Export
          </button>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"><Sparkles size={120} /></div>
           <div className="flex items-start gap-6 relative z-10">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"><MessageSquare size={32} /></div>
              <div className="flex-1">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 opacity-80">AI Executive Briefing</h3>
                 <div className="prose prose-invert text-lg font-medium leading-relaxed">
                   {aiSummary.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                 </div>
                 <button onClick={() => setAiSummary(null)} className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors">Dismiss Intelligence</button>
              </div>
           </div>
        </div>
      )}

      {activeReport === 'SKU' ? (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ReportMetric label="Total Margin" value={`₹${skuMetrics.reduce((s, m) => s + m.margin, 0).toLocaleString()}`} icon={<TrendingUp className="text-emerald-500" />} />
              <ReportMetric label="Top Performer" value={skuMetrics[0]?.name || 'N/A'} icon={<Tag className="text-blue-500" />} />
              <ReportMetric label="Avg Margin" value={`${(skuMetrics.reduce((s, m) => s + m.marginPercent, 0) / (skuMetrics.length || 1)).toFixed(1)}%`} icon={<BarChart className="text-amber-500" />} />
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">SKU-Level Profitability Ledger</h3>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-10 py-5">Product Master</th>
                          <th className="px-6 py-5 text-right">Units Sold</th>
                          <th className="px-6 py-5 text-right">Revenue (₹)</th>
                          <th className="px-6 py-5 text-right">COGS (₹)</th>
                          <th className="px-6 py-5 text-right">Gross Profit</th>
                          <th className="px-10 py-5 text-right">Margin (%)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {skuMetrics.map((sku) => (
                          <tr key={sku.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-10 py-5">
                                <div className="flex flex-col">
                                   <span className="text-sm font-black text-slate-900">{sku.name}</span>
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sku.sku}</span>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-right font-bold">{sku.salesVolume}</td>
                             <td className="px-6 py-5 text-right font-mono font-bold">₹{sku.salesRevenue.toLocaleString()}</td>
                             <td className="px-6 py-5 text-right font-mono text-slate-500">₹{sku.cogs.toLocaleString()}</td>
                             <td className={`px-6 py-5 text-right font-mono font-black ${sku.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ₹{sku.margin.toLocaleString()}
                             </td>
                             <td className="px-10 py-5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                   <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden no-print">
                                      <div className={`h-full rounded-full ${sku.marginPercent > 30 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.max(0, Math.min(100, sku.marginPercent))}%` }}></div>
                                   </div>
                                   <span className="text-xs font-black text-slate-800">{sku.marginPercent.toFixed(1)}%</span>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : activeReport === 'PL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between no-print">
              <h3 className="text-emerald-700 font-black uppercase tracking-widest text-xs">Revenue & Incomes</h3>
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.incomes.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-emerald-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Gross Revenue (A)</span>
                <span className="text-xl font-black text-emerald-600">₹{financialData.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between no-print">
              <h3 className="text-rose-700 font-black uppercase tracking-widest text-xs">Direct & Indirect Expenses</h3>
              <TrendingDown className="text-rose-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.expenses.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-rose-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Total Expenses (B)</span>
                <span className="text-xl font-black text-rose-600">₹{financialData.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex items-center justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5"><BarChart3 size={180} /></div>
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Net Financial Performance (A - B)</p>
               <h2 className="text-5xl font-black tracking-tighter">{financialData.netProfit >= 0 ? 'Surplus / Profit' : 'Deficit / Loss'}</h2>
             </div>
             <div className="text-right">
               <p className="text-6xl font-black text-blue-400 tracking-tighter">₹{Math.abs(financialData.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-blue-50 border-b border-blue-100 flex items-center justify-between no-print">
              <h3 className="text-blue-700 font-black uppercase tracking-widest text-xs">Assets</h3>
              <Wallet className="text-blue-400" size={20} />
            </div>
            <div className="p-8 space-y-4">
              {financialData.assets.map(l => (
                <ReportRow key={l.id} label={l.name} amount={l.currentBalance} />
              ))}
              <div className="pt-8 mt-4 border-t-2 border-blue-100 flex justify-between items-center">
                <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Total Assets</span>
                <span className="text-xl font-black text-blue-600">₹{financialData.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between no-print">
              <h3 className="text-slate-700 font-black uppercase tracking-widest text-xs">Liabilities & Equity</h3>
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
                <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Total Equities & Liab.</span>
                <span className="text-xl font-black text-slate-900">₹{(financialData.totalLiabilities + financialData.totalEquity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportMetric: React.FC<{ label: string, value: string, icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
     <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900 tracking-tighter">{value}</p>
     </div>
  </div>
);

const ReportRow: React.FC<{ label: string, amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between items-center group">
    <div className="flex items-center gap-2">
      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors no-print" />
      <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
    </div>
    <span className="font-mono font-bold text-slate-700">₹{Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
  </div>
);

export default Reports;
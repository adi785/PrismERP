
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ServerCrash, 
  Database, 
  Activity,
  Lightbulb,
  ArrowRight,
  Key,
  Wallet,
  Scale
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

type ConnectionStatus = 'idle' | 'checking' | 'online' | 'error' | 'needs_key';

const SUGGESTIONS = [
  { icon: <Wallet size={14} />, text: "Analyze P&L efficiency by comparing expense groups vs total revenue in INR.", color: "text-emerald-400" },
  { icon: <ShieldCheck size={14} />, text: "Perform a deep dive into Sundry Debtors and identify collection risks in ₹.", color: "text-blue-400" },
  { icon: <TrendingUp size={14} />, text: "Analyze inventory health and identify dead stock or over-valuation in INR.", color: "text-purple-400" },
  { icon: <AlertCircle size={14} />, text: "Verify GST output vs input credit balance for potential audit flags in ₹.", color: "text-amber-400" },
  { icon: <Activity size={14} />, text: "Summarize top 5 asset valuations and their impact on the balance sheet.", color: "text-rose-400" },
  { icon: <Scale size={14} />, text: "Assess current liabilities vs bank balances for solvency forecasting in INR.", color: "text-cyan-400" }
];

const AIAnalyst: React.FC<{ store: any }> = ({ store }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runIntegrityCheck = async () => {
    setConnStatus('checking');
    setErrorMsg(null);
    
    // @ts-ignore - aistudio is pre-configured in the environment
    const hasSelectedKey = await window.aistudio?.hasSelectedApiKey();

    if (!process.env.API_KEY && !hasSelectedKey) {
      setConnStatus('needs_key');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'System check: respond with "ok"',
        config: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } }
      });
      if (result.text) setConnStatus('online');
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setConnStatus('needs_key');
      } else {
        setConnStatus('error');
        setErrorMsg(`Handshake failed: ${err.message || "Network error"}`);
      }
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore - aistudio is pre-configured in the environment
    await window.aistudio?.openSelectKey();
    setConnStatus('checking');
    runIntegrityCheck();
  };

  useEffect(() => {
    runIntegrityCheck();
  }, [store.ledgers.length]);

  const analyze = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResponse(null);
    
    // CONSTRUCT GRANULAR FINANCIAL DATA CONTEXT
    const { ledgers, stats, company, stockItems } = store;
    
    // 1. Grouped Ledger Summary (P&L and BS breakdown)
    const groups: Record<string, number> = {};
    ledgers.forEach((l: any) => {
      groups[l.group] = (groups[l.group] || 0) + l.currentBalance;
    });
    const groupSummary = Object.entries(groups)
      .map(([name, bal]) => `${name}: ₹${bal.toLocaleString()}`)
      .join(', ');

    // 2. Individual Top Ledger Balances
    const topLedgers = ledgers
      .sort((a: any, b: any) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))
      .slice(0, 12)
      .map((l: any) => `${l.name} (${l.group}): ₹${l.currentBalance.toLocaleString()}`)
      .join(', ');
    
    // 3. Granular Stock Valuation
    const stockValuationBreakdown = [...stockItems]
      .map((i: any) => ({ ...i, valuation: i.currentStock * i.purchasePrice }))
      .sort((a, b) => b.valuation - a.valuation)
      .slice(0, 10)
      .map((i: any) => `${i.name}: ₹${i.valuation.toLocaleString()} (${i.currentStock} ${i.unit} @ ₹${i.purchasePrice})`)
      .join(', ');

    const totalStockValue = stockItems.reduce((sum: number, item: any) => sum + (item.currentStock * item.purchasePrice), 0);

    const context = `
      COMPANY: ${company.name} (FY: ${company.financialYear})
      MACRO STATS: Total Sales ₹${stats.totalSales}, Total Purchases ₹${stats.totalPurchases}, Cash Balance ₹${stats.cashBalance}, Bank Balance ₹${stats.bankBalance}
      LEDGER GROUPS BREAKDOWN: ${groupSummary}
      TOP 12 INDIVIDUAL ACCOUNTS: ${topLedgers}
      INVENTORY SUMMARY: Total Market Value ₹${totalStockValue}
      TOP 10 STOCK ASSETS BY VALUATION: ${stockValuationBreakdown}
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `FINANCIAL DATA CONTEXT: ${context}\n\nUSER AUDIT QUERY: ${query}`,
        config: { 
          systemInstruction: "You are a specialized ERP AI Auditor for the Indian market. You have access to granular ledger groups and stock valuations. Analyze patterns such as Debt-to-Equity, Cash Flow health, and Inventory Turnover using the provided data. ALWAYS use Indian Rupee (INR / ₹). Use the Indian numbering system (Lakhs, Crores). Highlight potential accounting risks or optimization opportunities. Be professional, structured (use Markdown), and data-driven.",
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      setResponse(result.text || "Analysis report generated but contains no text.");
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setConnStatus('needs_key');
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IntegrityTile label="Intelligence" status={connStatus} icon={<BrainCircuit size={16} />} sub={connStatus === 'online' ? 'Gemini 3 Pro' : 'Checking...'} />
        <IntegrityTile label="Data Context" status={store.ledgers.length > 0 ? 'success' : 'warning'} icon={<Database size={16} />} sub={store.ledgers.length > 0 ? 'Granular Sync' : 'No Data'} />
        <IntegrityTile label="Currency" status="online" icon={<Wallet size={16} />} sub="INR (₹) Base" />
      </div>

      {connStatus === 'needs_key' && (
        <div className="bg-amber-50 border-2 border-amber-100 p-10 rounded-[2.5rem] flex items-start gap-8 shadow-xl">
          <div className="p-5 bg-amber-500 text-white rounded-[1.5rem] shadow-lg"><Key size={32} /></div>
          <div className="flex-1">
            <h4 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-2">AI Activation Required</h4>
            <p className="text-sm text-amber-700 font-bold mb-8 leading-relaxed">
              To enable the granular Financial Auditor and high-performance business intelligence in INR, you must select an API key from a paid GCP project.
            </p>
            <div className="flex items-center gap-4">
              <button onClick={handleSelectKey} className="flex items-center gap-3 px-8 py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 shadow-xl shadow-amber-600/20 transition-all">
                Select API Key
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] font-black uppercase text-amber-500 underline tracking-widest">Billing Documentation</a>
            </div>
          </div>
        </div>
      )}

      {errorMsg && connStatus !== 'needs_key' && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-xl">
          <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg"><ServerCrash size={32} /></div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-rose-900 uppercase tracking-tight mb-2">AI Connection Fault</h4>
            <p className="text-sm text-rose-700 font-bold mb-6">"{errorMsg}"</p>
            <button onClick={runIntegrityCheck} className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg">
              <RefreshCw size={14} className={connStatus === 'checking' ? 'animate-spin' : ''} /> Retry Handshake
            </button>
          </div>
        </div>
      )}

      {connStatus === 'online' && (
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 p-12 opacity-5"><BrainCircuit size={220} /></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-10">
              <div className="p-5 bg-blue-500 rounded-[2rem] shadow-2xl"><Sparkles size={32} /></div>
              <div>
                <h2 className="text-4xl font-black tracking-tight">Granular Auditor</h2>
                <p className="text-blue-300 font-bold uppercase text-[11px] tracking-[0.3em] mt-1">Deep Financial Analysis (INR)</p>
              </div>
            </div>

            <div className="mb-10 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contextual Audit Queries</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-2xl text-[11px] font-bold text-blue-50 transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <span className={s.color}>{s.icon}</span>
                    {s.text}
                    <ArrowRight size={12} className="opacity-40 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <input 
                type="text" 
                placeholder="Analyze P&L per group, stock health, or cash flow risks..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="w-full bg-white/10 border-2 border-white/10 rounded-[2rem] py-6 px-10 text-white placeholder-blue-200/40 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-xl font-medium"
              />
              <button onClick={analyze} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-blue-500 hover:bg-blue-400 text-white rounded-[1.5rem] transition-all">
                {loading ? <Loader2 className="animate-spin" size={28} /> : <Send size={28} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {response && (
        <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-xs tracking-widest">
              <ShieldCheck size={16} /> Precision Audit Report (₹)
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contextual Data Utilized</div>
          </div>
          <MarkdownRenderer content={response} />
        </div>
      )}
    </div>
  );
};

const IntegrityTile: React.FC<{ label: string, status: ConnectionStatus | 'success' | 'warning', icon: any, sub: string }> = ({ label, status, icon, sub }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-2xl ${
      status === 'online' || status === 'success' ? 'bg-emerald-50 text-emerald-600' :
      status === 'error' ? 'bg-rose-50 text-rose-600' :
      status === 'warning' || status === 'needs_key' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
    }`}>
      {status === 'checking' ? <Loader2 size={16} className="animate-spin" /> : icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[10px] font-black uppercase truncate max-w-[120px] text-slate-700">{sub}</p>
    </div>
  </div>
);

export default AIAnalyst;

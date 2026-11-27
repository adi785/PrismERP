
import React, { useState, useEffect } from 'react';
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
  Wallet,
  Scale
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { invokeAI } from '../services/ai';

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
    try {
      await invokeAI<{ ok: boolean }>('health');
      setConnStatus('online');
    } catch {
      setConnStatus('needs_key');
      setErrorMsg('Secure AI backend is not configured. Deploy the gemini-proxy Edge Function and set GEMINI_API_KEY in Supabase secrets.');
    }
  };

  useEffect(() => {
    void runIntegrityCheck();
  }, []);

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
    const topLedgers = [...ledgers]
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
      const result = await invokeAI<{ text: string }>('analyst', { query, context });
      setResponse(result.text || "Analysis report generated but contains no text.");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Secure AI service')) setConnStatus('needs_key');
      setErrorMsg(err instanceof Error ? err.message : 'AI analysis failed.');
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
        <IntegrityTile label="Intelligence" status={connStatus} icon={<BrainCircuit size={16} />} sub={connStatus === 'online' ? 'Secure Gemini service' : connStatus === 'checking' ? 'Checking...' : connStatus === 'needs_key' ? 'Backend setup required' : 'Unavailable'} />
        <IntegrityTile label="Data Context" status={store.ledgers.length > 0 ? 'success' : 'warning'} icon={<Database size={16} />} sub={store.ledgers.length > 0 ? 'Granular Sync' : 'No Data'} />
        <IntegrityTile label="Currency" status="online" icon={<Wallet size={16} />} sub="INR (₹) Base" />
      </div>

      {connStatus === 'needs_key' && (
        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl flex items-start gap-5">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl"><ServerCrash size={24} /></div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-amber-900 mb-2">Secure AI service unavailable</h4>
            <p className="text-sm text-amber-800 mb-4 leading-relaxed">AI requests run through an authenticated Supabase Edge Function. Deploy gemini-proxy and configure GEMINI_API_KEY as a Supabase function secret. Never add the Gemini key to browser or Vite environment variables.</p>
            <button onClick={runIntegrityCheck} className="px-5 py-2.5 bg-amber-700 text-white rounded-lg font-semibold text-xs hover:bg-amber-800">Retry connection</button>
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


import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ServerCrash, 
  Database, 
  Activity,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

type ConnectionStatus = 'idle' | 'checking' | 'online' | 'error';

const SUGGESTIONS = [
  { icon: <TrendingUp size={14} />, text: "Assess my company's current liquidity and cash flow health." },
  { icon: <ShieldCheck size={14} />, text: "Identify potential financial risks in my ledger balances." },
  { icon: <Activity size={14} />, text: "Provide a summary of my top-selling stock items vs purchase costs." },
  { icon: <AlertCircle size={14} />, text: "Audit my tax liability for the current financial year." },
  { icon: <BrainCircuit size={14} />, text: "Explain my current ratio and what it means for solvency." }
];

const AIAnalyst: React.FC<{ store: any }> = ({ store }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'config' | 'auth' | 'network' | null>(null);

  const getApiKey = () => {
    try {
      return (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : null;
    } catch (e) {
      return null;
    }
  };

  const runIntegrityCheck = async () => {
    setConnStatus('checking');
    setErrorMsg(null);
    setErrorType(null);
    
    const apiKey = getApiKey();

    if (!apiKey || apiKey === 'undefined') {
      setConnStatus('error');
      setErrorType('config');
      setErrorMsg("The system's 'API_KEY' is missing. Please ensure it is set in your environment variables.");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'System check: respond with "ok"',
        config: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } }
      });
      if (result.text) setConnStatus('online');
    } catch (err: any) {
      setConnStatus('error');
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes('api_key_invalid') || msg.includes('401') || msg.includes('unauthorized')) {
        setErrorType('auth');
        setErrorMsg("The Gemini API Key provided is invalid.");
      } else {
        setErrorType('network');
        setErrorMsg(`Network failure: ${err.message || "Could not reach Google AI."}`);
      }
    }
  };

  useEffect(() => {
    runIntegrityCheck();
  }, [store.ledgers.length]);

  const analyze = async () => {
    const apiKey = getApiKey();
    if (!query.trim() || !apiKey) return;
    
    setLoading(true);
    setResponse(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `CONTEXT: User is auditing ${store.company.name}. Ledgers: ${store.ledgers.length}, Vouchers: ${store.vouchers.length}. QUERY: ${query}`,
        config: { 
          systemInstruction: "You are a world-class ERP auditor. Analyze financial patterns and identify risks. Always use Markdown for structure (headers, lists, etc).",
          thinkingConfig: { thinkingBudget: 2000 }
        }
      });
      setResponse(result.text || "Report generated but empty.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    // Smooth scroll to input if needed
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IntegrityTile label="Intelligence" status={connStatus} icon={<BrainCircuit size={16} />} sub={connStatus === 'online' ? 'Gemini 3 Pro' : 'Checking...'} />
        <IntegrityTile label="Data Context" status={store.ledgers.length > 0 ? 'success' : 'warning'} icon={<Database size={16} />} sub={store.ledgers.length > 0 ? 'Live Sync' : 'No Data'} />
        <IntegrityTile label="System State" status="idle" icon={<Activity size={16} />} sub="Ready" />
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2.5rem] flex items-start gap-6 shadow-xl">
          <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-lg"><ServerCrash size={32} /></div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-rose-900 uppercase tracking-tight mb-2">AI Configuration Error</h4>
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
                <h2 className="text-4xl font-black tracking-tight">Financial Auditor</h2>
                <p className="text-blue-300 font-bold uppercase text-[11px] tracking-[0.3em] mt-1">AI-Powered Risk Assessment</p>
              </div>
            </div>

            {/* Smart Suggestions Panel */}
            <div className="mb-10 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Audit Scenarios</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 rounded-2xl text-xs font-bold text-blue-100 transition-all hover:scale-[1.02] active:scale-95 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <span className="opacity-60">{s.icon}</span>
                    {s.text}
                    <ArrowRight size={12} className="opacity-40 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <input 
                type="text" 
                placeholder="Ask about liquidity, debt, or stock health..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="w-full bg-white/10 border-2 border-white/10 rounded-[2rem] py-6 px-10 text-white placeholder-blue-200/40 outline-none focus:ring-4 focus:ring-blue-400/20 transition-all text-xl font-medium"
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
          <div className="flex items-center gap-2 mb-6 text-blue-600 font-black uppercase text-xs tracking-widest">
            <ShieldCheck size={16} /> Audit Summary
          </div>
          <MarkdownRenderer content={response} />
        </div>
      )}
    </div>
  );
};

const IntegrityTile: React.FC<{ label: string, status: any, icon: any, sub: string }> = ({ label, status, icon, sub }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-2xl ${
      status === 'online' || status === 'success' ? 'bg-emerald-50 text-emerald-600' :
      status === 'error' ? 'bg-rose-50 text-rose-600' :
      status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
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

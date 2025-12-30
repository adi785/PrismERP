import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BrainCircuit, Send, Sparkles, MessageSquare, ShieldCheck, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const AIAnalyst: React.FC<{ store: any }> = ({ store }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptContext = `
        Current ERP Context for ${store.company.name}:
        Ledgers: ${JSON.stringify(store.ledgers.map((l:any) => ({ name: l.name, balance: l.currentBalance })))}
        Recent Vouchers: ${JSON.stringify(store.vouchers.slice(0, 10))}
        Inventory Status: ${JSON.stringify(store.stockItems.map((i:any) => ({ name: i.name, stock: i.currentStock, rate: i.salePrice })))}

        User Question: ${query}
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptContext,
        config: {
          systemInstruction: "You are an expert ERP Auditor. Analyze the provided financial data. Be concise, professional, and data-driven. If the user asks about stock, look at inventory. If they ask about money, look at ledger balances.",
          thinkingConfig: { thinkingBudget: 0 }, // Optimized for latency
          temperature: 0.2,
        }
      });

      setResponse(result.text || "Analysis complete but no text was generated.");
    } catch (err) {
      console.error("AI Analyst Error:", err);
      setResponse("Intelligence engine temporarily unavailable. Verify API connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <BrainCircuit size={200} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-blue-500 rounded-3xl shadow-xl shadow-blue-500/20">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tight">Financial Intelligence</h2>
              <p className="text-blue-300 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Real-time ERP Audit Engine</p>
            </div>
          </div>
          <p className="text-blue-100 text-lg max-w-xl leading-relaxed mb-10">
            Query your business data using natural language. Get instant insights into cash flow, tax liability, and inventory health.
          </p>

          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <input 
                type="text" 
                placeholder="e.g. 'How much tax do I owe for this month?'" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="w-full bg-white/10 border border-white/20 rounded-[2rem] py-5 px-8 text-white placeholder-blue-200/50 outline-none focus:ring-4 focus:ring-blue-400/20 transition-all text-lg font-medium"
              />
              <button 
                onClick={analyze}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-blue-500 hover:bg-blue-400 text-white rounded-[1.5rem] transition-all shadow-xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SuggestionCard 
          icon={<ShieldCheck className="text-emerald-500" />} 
          label="GST Health" 
          desc="Verify if CGST/SGST ledger balances match sales." 
          onClick={() => {setQuery("Analyze my GST ledgers for potential reconciliation errors based on sales."); analyze();}}
        />
        <SuggestionCard 
          icon={<TrendingUp className="text-blue-500" />} 
          label="Liquidity Scan" 
          desc="Calculate current ratio and bank health." 
          onClick={() => {setQuery("Calculate my liquidity ratios and tell me if my cash-in-hand is sufficient for my current liabilities."); analyze();}}
        />
        <SuggestionCard 
          icon={<AlertCircle className="text-rose-500" />} 
          label="Stock Alert" 
          desc="Identify SKUs that are tying up too much capital." 
          onClick={() => {setQuery("Which inventory items have high value but zero sales in the last 10 transactions?"); analyze();}}
        />
      </div>

      {response && (
        <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800">Analyst Report</h3>
          </div>
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-lg">
            {response}
          </div>
          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified by Prism Intelligence</span>
            <button className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-[0.2em] transition-colors">Generate PDF Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SuggestionCard: React.FC<{ icon: any, label: string, desc: string, onClick: () => void }> = ({ icon, label, desc, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-8 rounded-[2.5rem] border border-slate-200 text-left hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group"
  >
    <div className="p-4 bg-slate-50 rounded-2xl mb-6 w-fit group-hover:bg-blue-50 transition-colors">{icon}</div>
    <h4 className="font-black text-slate-900 mb-2 text-lg">{label}</h4>
    <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">{desc}</p>
  </button>
);

export default AIAnalyst;
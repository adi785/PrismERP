
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BrainCircuit, Send, Sparkles, MessageSquare, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';

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
        Current ERP Context:
        Company: ${store.company.name}
        Ledgers: ${JSON.stringify(store.ledgers.map((l:any) => ({ name: l.name, balance: l.currentBalance })))}
        Recent Vouchers: ${JSON.stringify(store.vouchers.slice(0, 5))}
        Inventory: ${JSON.stringify(store.stockItems.map((i:any) => ({ name: i.name, stock: i.currentStock })))}

        User Question: ${query}
      `;

      // Switched to gemini-3-flash-preview for significantly faster response times
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptContext,
        config: {
          systemInstruction: "You are an expert ERP Auditor and Financial Advisor. Provide a concise, professional financial analysis or answer based on the provided ERP data. If suggesting improvements, be specific to the data.",
          temperature: 0.7,
        }
      });

      setResponse(result.text || "I couldn't generate a response. Please try rephrasing.");
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setResponse("System offline: AI Analysis requires a valid API configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <BrainCircuit size={180} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500 rounded-2xl">
              <Sparkles size={24} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">AI Financial Auditor</h2>
          </div>
          <p className="text-blue-100 text-lg max-w-xl leading-relaxed mb-8">
            Ask complex questions about your cash flow, inventory health, or potential tax liabilities. Powered by real-time business data.
          </p>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Ask e.g. 'Is my stock level healthy for sales?'" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-white placeholder-blue-200/50 outline-none focus:ring-2 focus:ring-blue-400 transition-all text-lg"
              />
              <button 
                onClick={analyze}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-all shadow-lg"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SuggestionCard 
          icon={<ShieldCheck className="text-emerald-500" />} 
          label="Compliance Check" 
          desc="Analyze GST entries for reconciliation errors." 
          onClick={() => setQuery("Check if my current GST ledger balances align with recent sales.")}
        />
        <SuggestionCard 
          icon={<TrendingUp className="text-blue-500" />} 
          label="Cash Flow Prediction" 
          desc="Forecast bank balance based on current debtors." 
          onClick={() => setQuery("Predict my bank balance for next month based on Sundry Debtors.")}
        />
        <SuggestionCard 
          icon={<AlertCircle className="text-amber-500" />} 
          label="Inventory Audit" 
          desc="Identify slow-moving stock items." 
          onClick={() => setQuery("Which stock items have low turnover relative to their purchase price?")}
        />
      </div>

      {response && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Analyst Insights</h3>
          </div>
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
            {response}
          </div>
          <div className="mt-8 flex gap-3 pt-6 border-t border-slate-100">
            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Mark as Resolved</button>
            <button className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest ml-auto">Share Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SuggestionCard: React.FC<{ icon: any, label: string, desc: string, onClick: () => void }> = ({ icon, label, desc, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-6 rounded-2xl border border-slate-200 text-left hover:border-blue-300 hover:shadow-md transition-all group"
  >
    <div className="p-2 bg-slate-50 rounded-xl mb-4 w-fit group-hover:bg-blue-50 transition-colors">{icon}</div>
    <h4 className="font-bold text-slate-800 mb-1">{label}</h4>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </button>
);

export default AIAnalyst;

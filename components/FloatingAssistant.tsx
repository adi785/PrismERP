
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Sparkles, Loader2, Bot, Minimize2, Maximize2, ShieldCheck, Key } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const FloatingAssistant: React.FC<{ store: any }> = ({ store }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [needsKey, setNeedsKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkKeyState = async () => {
    const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY);
    const hasSelectedKey = await window.aistudio?.hasSelectedApiKey();
    setNeedsKey(!apiKey && !hasSelectedKey);
  };

  useEffect(() => {
    checkKeyState();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const { ledgers, stats, company } = store;
    const topBalances = ledgers
      .sort((a: any, b: any) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))
      .slice(0, 8)
      .map((l: any) => `${l.name}: ₹${l.currentBalance.toLocaleString()}`)
      .join(', ');

    const context = `CONTEXT: ${company.name}. Sales: ₹${stats.totalSales}, Cash: ₹${stats.cashBalance}, Bank: ₹${stats.bankBalance}. Key Accounts: ${topBalances}.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => m.text), `REAL-TIME DATA: ${context}\n\nUSER: ${userMsg}`].join('\n'),
        config: {
          systemInstruction: `You are the PrismERP Virtual Assistant. You assist ${store.user?.name} (${store.user?.role}). ALWAYS use Indian Rupee (INR / ₹) for currency. Use the Indian numbering system (Lakhs, Crores). Be concise and professional. Use Markdown for formatting. If the user asks about balances, use the provided REAL-TIME DATA.`,
          temperature: 0.7,
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "No response." }]);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setNeedsKey(true);
        setMessages(prev => [...prev, { role: 'model', text: "AI requires a valid API Key. Please click the key icon above." }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: "Connection error: " + err.message }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKey = async () => {
    await window.aistudio?.openSelectKey();
    setNeedsKey(false);
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group">
        <Bot size={28} className="relative z-10 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 w-[400px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col transition-all z-50 overflow-hidden ${isMinimized ? 'h-20' : 'h-[600px]'}`}>
      <div className="bg-slate-900 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={20} className="text-white" /></div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Prism AI</h3>
            <span className={`text-[9px] font-black uppercase ${needsKey ? 'text-amber-500' : 'text-emerald-500'}`}>{needsKey ? 'Needs Key' : 'Online'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsKey && <button onClick={handleSelectKey} className="p-2 text-amber-400 hover:bg-white/10 rounded-lg"><Key size={16} /></button>}
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-400 hover:bg-white/10 rounded-lg">{isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-rose-400"><X size={20} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {needsKey && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                 <div className="p-4 bg-amber-50 rounded-2xl text-amber-600"><Key size={32} /></div>
                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">AI Setup Required</p>
                 <button onClick={handleSelectKey} className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Select Key</button>
              </div>
            )}
            {!needsKey && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                <Bot size={48} />
                <p className="text-xs font-black uppercase tracking-widest">Awaiting Command...</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>
                  {m.role === 'model' ? <MarkdownRenderer content={m.text} /> : m.text}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><Loader2 size={16} className="animate-spin text-blue-500" /></div>}
          </div>
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                placeholder={needsKey ? "Key required..." : "Ask about ₹ balances or tax..."}
                disabled={needsKey}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleSend()} 
                className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none disabled:opacity-50" 
              />
              <button onClick={handleSend} disabled={loading || !input.trim() || needsKey} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-30"><Send size={18} /></button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 opacity-50"><ShieldCheck size={10} /><span className="text-[9px] font-black uppercase tracking-widest">Secure INR AI Session</span></div>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingAssistant;

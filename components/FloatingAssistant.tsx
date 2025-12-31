
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Sparkles, Loader2, Bot, User, Minimize2, Maximize2, ShieldCheck } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const FloatingAssistant: React.FC<{ store: any }> = ({ store }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getApiKey = () => {
    try {
      return (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const apiKey = getApiKey();
    if (!input.trim() || !apiKey) {
      if (!apiKey) setMessages(prev => [...prev, { role: 'model', text: "Error: AI API Key not found in environment." }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages.map(m => m.text), userMsg].join('\n'),
        config: {
          systemInstruction: `You are the PrismERP Virtual Assistant. Use data from ${store.company?.name}. You assist ${store.user?.name} (${store.user?.role}). Be concise and professional. Use Markdown for formatting.`,
          temperature: 0.7,
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "No response." }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error: " + err.message }]);
    } finally {
      setLoading(false);
    }
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
            <span className="text-[9px] font-black text-emerald-500 uppercase">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-400 hover:bg-white/10 rounded-lg">{isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
          <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-rose-400"><X size={20} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                <Bot size={48} />
                <p className="text-xs font-black uppercase tracking-widest">Awaiting Command...</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>
                  {m.role === 'model' ? <MarkdownRenderer content={m.text} className={m.role === 'model' ? 'prose-slate' : 'prose-invert'} /> : m.text}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><Loader2 size={16} className="animate-spin text-blue-500" /></div>}
          </div>
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input type="text" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none" />
              <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-30"><Send size={18} /></button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 opacity-50"><ShieldCheck size={10} /><span className="text-[9px] font-black uppercase tracking-widest">Secure AI Session</span></div>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingAssistant;

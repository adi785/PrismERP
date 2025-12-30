
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User, Minimize2, Maximize2, ShieldCheck, Database } from 'lucide-react';

const FloatingAssistant: React.FC<{ store: any }> = ({ store }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session
  useEffect(() => {
    if (isOpen && !chatSession) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: `You are the PrismERP Virtual Assistant. You help users manage their business. 
          Current User: ${store.user?.name} (${store.user?.role})
          Active Company: ${store.company?.name}
          You have access to the ERP interface features like Billing, Daybook, and Tax Center.
          Be professional, helpful, and concise. Use markdown for tables or lists if needed.`,
          temperature: 0.7,
        },
      });
      setChatSession(chat);
    }
  }, [isOpen, chatSession, store.user, store.company]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "I couldn't process that request." }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Error connecting to Prism Intelligence. Please check your internet or API configuration." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center hover:scale-110 transition-all z-50 group"
      >
        <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl animate-pulse group-hover:bg-blue-500/40"></div>
        <Bot size={28} className="relative z-10 group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-8 right-8 w-[400px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-200 flex flex-col transition-all z-50 overflow-hidden ${isMinimized ? 'h-20' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="bg-slate-900 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Prism Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Pro AI Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm text-blue-500">
                  <Bot size={32} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Welcome to Prism Intelligence</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed mt-2 uppercase tracking-tighter">
                    Ask me to analyze your stock, help with an invoice, or explain your tax liability.
                  </p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-lg' 
                  : 'bg-white border border-slate-100 text-slate-700 rounded-bl-lg'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50 uppercase text-[8px] font-black tracking-widest">
                    {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    {m.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="prose prose-sm prose-slate">
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="How can I help you today?"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-30 disabled:shadow-none hover:bg-blue-700 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 opacity-50">
              <ShieldCheck size={10} />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Encrypted Enterprise Channel</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FloatingAssistant;

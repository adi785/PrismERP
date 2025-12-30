
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { BrainCircuit, Send, Sparkles, MessageSquare, ShieldCheck, TrendingUp, AlertCircle, Loader2, Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldAlert, Mic, MicOff, Volume2, Waves, StopCircle, Database, Lock, Activity } from 'lucide-react';

type ConnectionStatus = 'idle' | 'checking' | 'online' | 'error' | 'live';

const AIAnalyst: React.FC<{ store: any }> = ({ store }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'empty'>('connected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Live API States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  
  // Refs for Audio/Live Session
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionBuffer = useRef({ user: '', model: '' });

  const runIntegrityCheck = async () => {
    setConnStatus('checking');
    setErrorMsg(null);
    
    // 1. Check Data Context
    const hasData = store.ledgers.length > 0 || store.vouchers.length > 0;
    if (!hasData) {
      setDbStatus('empty');
    } else {
      setDbStatus('connected');
    }

    // 2. Test Gemini Connection
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } }
      });
      if (result.text) setConnStatus('online');
    } catch (err: any) {
      setConnStatus('error');
      setErrorMsg(err.message || "Intelligence Engine Handshake Failed.");
    }
  };

  useEffect(() => {
    runIntegrityCheck();
    return () => stopLiveSession();
  }, [store.ledgers.length, store.vouchers.length]);

  // --- Live API Helpers ---
  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }

  const startLiveSession = async () => {
    if (connStatus === 'error') {
      alert("Please resolve API connectivity issues before starting Live Mode.");
      return;
    }
    setLoading(true);
    setTranscriptions([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are an expert real-time ERP auditor. You have access to the business data of ${store.company.name}. Speak professionally but concisely. Help the user audit their ledgers, stock, and vouchers. Current Data Health: ${dbStatus}. Records Found: ${store.vouchers.length} vouchers, ${store.ledgers.length} ledgers.`
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
            setIsLiveActive(true);
            setLoading(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
              transcriptionBuffer.current.user += msg.serverContent.inputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') return [...prev.slice(0, -1), { role: 'user', text: transcriptionBuffer.current.user }];
                return [...prev, { role: 'user', text: transcriptionBuffer.current.user }];
              });
            }
            if (msg.serverContent?.outputTranscription) {
              transcriptionBuffer.current.model += msg.serverContent.outputTranscription.text;
              setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') return [...prev.slice(0, -1), { role: 'model', text: transcriptionBuffer.current.model }];
                return [...prev, { role: 'model', text: transcriptionBuffer.current.model }];
              });
            }
            if (msg.serverContent?.turnComplete) {
              transcriptionBuffer.current = { user: '', model: '' };
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error("Live Error:", e); stopLiveSession(); },
          onclose: () => stopLiveSession()
        }
      });
      liveSessionRef.current = await sessionPromise;
      
      const context = `ERP Context: ${JSON.stringify({ 
        company: store.company.name,
        ledgers: store.ledgers.map((l:any) => ({n: l.name, b: l.currentBalance})),
        vouchers: store.vouchers.slice(0, 5).map((v:any) => ({n: v.number, t: v.type, a: v.totalAmount}))
      })}`;
      liveSessionRef.current.sendRealtimeInput({ text: context });

    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start live session.");
      setLoading(false);
    }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) liveSessionRef.current.close();
    liveSessionRef.current = null;
    setIsLiveActive(false);
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();
  };

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptContext = `
        ERP Business Snapshot:
        Ledgers: ${store.ledgers.length} records
        Vouchers: ${store.vouchers.length} records
        Inventory: ${store.stockItems.length} SKUs
        
        Detailed Data: ${JSON.stringify({ ledgers: store.ledgers.slice(0, 20), stock: store.stockItems.slice(0, 20) })}
        
        Question: ${query}
      `;
      
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptContext,
        config: { 
          systemInstruction: "You are a professional Financial Auditor. Analyze the provided ERP data. If the data arrays are empty, explain that the audit cannot proceed without transaction records. Be data-driven and concise.",
          thinkingConfig: { thinkingBudget: 0 } 
        }
      });
      setResponse(result.text || "No intelligence report generated.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- INTEGRITY DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <IntegrityTile 
          label="Intelligence Engine" 
          status={connStatus === 'online' ? 'success' : connStatus === 'error' ? 'error' : 'loading'} 
          icon={<BrainCircuit size={16} />}
          sub={connStatus === 'online' ? 'Gemini 3 Pro Active' : 'Check API Key'}
        />
        <IntegrityTile 
          label="Database Bridge" 
          status={dbStatus === 'connected' ? 'success' : 'warning'} 
          icon={<Database size={16} />}
          sub={dbStatus === 'connected' ? 'Schema Verified' : 'Missing Records'}
        />
        <IntegrityTile 
          label="Microphone" 
          status="idle" 
          icon={<Mic size={16} />}
          sub="Ready for Live Audit"
        />
      </div>

      {/* --- ERROR ALERTS --- */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-start gap-4 animate-in slide-in-from-top-4">
          <ShieldAlert className="text-rose-600 shrink-0 mt-1" size={24} />
          <div>
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight mb-1">Diagnostic Alert</h4>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">{errorMsg}</p>
            <button onClick={runIntegrityCheck} className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-rose-600 hover:text-rose-800 transition-colors">
              <RefreshCw size={12} /> Retry Handshake
            </button>
          </div>
        </div>
      )}

      {dbStatus === 'empty' && !errorMsg && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertCircle className="text-amber-600 shrink-0 mt-1" size={24} />
          <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">Empty Context Warning</h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Your business database has 0 transaction records. The AI Auditor requires at least some vouchers or ledgers to provide a meaningful analysis. Please record some transactions or use the "Bulk Import" tool first.
            </p>
          </div>
        </div>
      )}

      {/* --- MAIN INTERFACE --- */}
      {isLiveActive ? (
        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden min-h-[550px] flex flex-col border border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]" />
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-12">
            <div className="relative">
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.5)] animate-pulse">
                <Volume2 size={48} className="text-white" />
              </div>
              <div className="absolute -inset-8 bg-blue-500/20 rounded-full blur-3xl animate-ping opacity-20"></div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight mb-2">Live Audit Session</h2>
              <div className="flex items-center justify-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <p className="text-blue-400 font-bold uppercase text-[10px] tracking-[0.2em]">Listening to Environment</p>
              </div>
            </div>
            <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 max-h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {transcriptions.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-5 py-3 rounded-2xl text-xs max-w-[85%] ${t.role === 'user' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 font-medium'}`}>
                    <span className="font-black opacity-40 block mb-1 uppercase tracking-widest text-[8px]">{t.role === 'user' ? 'Auditor (You)' : 'Prism Intel'}</span>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                </div>
              ))}
              {transcriptions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                   <Activity size={32} className="mb-4 animate-pulse" />
                   <p className="text-center text-[10px] font-black uppercase tracking-widest">Awaiting Voice Input</p>
                </div>
              )}
            </div>
            <button onClick={stopLiveSession} className="px-12 py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-[2rem] font-black flex items-center gap-3 transition-all shadow-2xl shadow-rose-600/20 active:scale-95">
              <StopCircle size={24} /> Terminate Audit
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <BrainCircuit size={220} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="p-5 bg-blue-500 rounded-[2rem] shadow-2xl shadow-blue-500/30">
                  <Sparkles size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight">Financial Intelligence</h2>
                  <p className="text-blue-300 font-bold uppercase text-[11px] tracking-[0.3em] mt-1">Audit Mode: Hybrid (Voice + Text)</p>
                </div>
              </div>
              <button 
                onClick={startLiveSession}
                className="flex items-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-[1.8rem] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl group"
              >
                <Mic size={20} className="group-hover:animate-bounce" /> Go Live
              </button>
            </div>
            
            <p className="text-blue-100 text-xl max-w-2xl leading-relaxed mb-12">
              Our auditor-grade intelligence analyzes your ledgers and stock levels in real-time. Ask about specific accounts or start a <strong>Live Session</strong>.
            </p>

            <div className="relative group">
              <input 
                type="text" 
                placeholder="Query your ledgers... (e.g. 'Summarize my GST liability')" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="w-full bg-white/10 border-2 border-white/10 rounded-[2rem] py-6 px-10 text-white placeholder-blue-200/40 outline-none focus:ring-4 focus:ring-blue-400/20 focus:border-white/20 transition-all text-xl font-medium"
              />
              <button 
                onClick={analyze}
                disabled={loading || connStatus !== 'online'}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-blue-500 hover:bg-blue-400 text-white rounded-[1.5rem] transition-all shadow-xl shadow-blue-500/20 disabled:opacity-20 disabled:grayscale"
              >
                {loading ? <Loader2 className="animate-spin" size={28} /> : <Send size={28} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Queries */}
      {!isLiveActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SuggestionCard 
            icon={<ShieldCheck className="text-emerald-500" />} 
            label="GST Reconciler" 
            desc="Verify Duties & Taxes vs Sales output." 
            onClick={() => {setQuery("Reconcile my GST ledgers against sales vouchers and flag any missing tax entries."); analyze();}}
          />
          <SuggestionCard 
            icon={<TrendingUp className="text-blue-500" />} 
            label="Liquidity Scan" 
            desc="Assess bank health and cash flow." 
            onClick={() => {setQuery("Calculate my liquidity ratios and suggest if my current cash-in-hand is sufficient for immediate liabilities."); analyze();}}
          />
          <SuggestionCard 
            icon={<AlertCircle className="text-rose-500" />} 
            label="Inventory Risk" 
            desc="Spot dead stock and value leaks." 
            onClick={() => {setQuery("Identify high-value inventory items that have zero sales movement in the last 10 days."); analyze();}}
          />
        </div>
      )}

      {response && !isLiveActive && (
        <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-5 mb-10 pb-8 border-b border-slate-50">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] shadow-inner">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Intelligence Report</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certified Analytical Output</p>
            </div>
          </div>
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-lg italic">
            {response}
          </div>
          <div className="mt-12 pt-8 border-t border-slate-50 flex items-center gap-3">
             <ShieldCheck size={14} className="text-emerald-500" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authenticated by Prism Audit Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};

const IntegrityTile: React.FC<{ label: string, status: 'success' | 'error' | 'loading' | 'warning' | 'idle', icon: any, sub: string }> = ({ label, status, icon, sub }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
    <div className={`p-3 rounded-2xl transition-colors ${
      status === 'success' ? 'bg-emerald-50 text-emerald-600' :
      status === 'error' ? 'bg-rose-50 text-rose-600' :
      status === 'warning' ? 'bg-amber-50 text-amber-600' :
      status === 'loading' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
    }`}>
      {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-[11px] font-black uppercase ${
        status === 'success' ? 'text-emerald-600' :
        status === 'error' ? 'text-rose-600' :
        status === 'warning' ? 'text-amber-600' :
        status === 'loading' ? 'text-blue-600' : 'text-slate-500'
      }`}>{sub}</p>
    </div>
  </div>
);

const SuggestionCard: React.FC<{ icon: any, label: string, desc: string, onClick: () => void }> = ({ icon, label, desc, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-left hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group active:scale-95"
  >
    <div className="p-4 bg-slate-50 rounded-2xl mb-8 w-fit group-hover:bg-blue-50 transition-colors shadow-inner">{icon}</div>
    <h4 className="font-black text-slate-900 mb-2 text-xl tracking-tight">{label}</h4>
    <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight opacity-70">{desc}</p>
  </button>
);

export default AIAnalyst;

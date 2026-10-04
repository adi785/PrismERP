
import React, { useState, useMemo } from 'react';
import { Mail, ArrowRight, Building2, Plus, LogOut, ChevronRight, ChevronDown, Hash, Calendar, MapPin, Loader2, UserCircle, X, Eye, EyeOff, Lock, User, AlertCircle, Info, Shield, CheckCircle2, MonitorOff, Send, Check } from 'lucide-react';
import { UserRole } from '../types';
import { api } from '../services/api';

const Auth: React.FC<{ store: any }> = ({ store }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'auth' | 'select' | 'create'>(store.user ? 'select' : 'auth');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', gstin: '', fy: '2024-25', address: '' });
  const [loading, setLoading] = useState(false);

  // Password Validation Logic
  const passwordRequirements = useMemo(() => {
    return {
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
      hasLength: password.length >= 8
    };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    if (mode === 'login') return password.length > 0;
    return Object.values(passwordRequirements).every(Boolean);
  }, [passwordRequirements, mode, password]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await store.login(email, password);
        setStep('select');
      } else {
        await store.signup(email, password, name, role);
        setIsAwaitingVerification(true);
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes('CONFIRMATION_REQUIRED') || msg.toLowerCase().includes('email not confirmed')) {
        setIsAwaitingVerification(true);
      } else {
        // Clean up common Supabase technical error messages for the user
        let friendlyMsg = msg;
        if (msg.includes('at least one character of each')) {
          friendlyMsg = "Security Policy: Password must include Uppercase, Lowercase, and Numbers.";
        }
        setError(friendlyMsg || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBypassToLocal = () => {
    setLoading(true);
    api.enableLocalMode();
    store.login(email || "demo@prism.erp", "password")
      .then(() => {
        setStep('select');
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await store.createCompany(newCompany.name, newCompany.gstin, newCompany.fy, newCompany.address);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("AUTH_SESSION_EXPIRED")) {
        setError("Security session expired. Please log in again.");
        setTimeout(() => {
          store.logout();
          setStep('auth');
        }, 2000);
      } else {
        setError(msg || "Failed to establish company hub.");
      }
      setLoading(false);
    }
  };

  if (step === 'auth') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden font-inter">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
        <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-white/20">
            
            {isAwaitingVerification ? (
              <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-blue-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl relative">
                  <Mail className="text-blue-600 animate-pulse" size={48} />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Verify Your Email</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  We've sent a secure verification link to <br/>
                  <span className="text-slate-900 font-bold underline">{email}</span>. <br/>
                  Please click the link in your inbox to activate your account.
                </p>
                <div className="space-y-4">
                  <button 
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "I've Verified, Continue"}
                  </button>
                  <button 
                    onClick={() => { setIsAwaitingVerification(false); setMode('login'); }}
                    className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
                <div className="mt-10 p-4 bg-slate-50 rounded-2xl flex items-start gap-3 text-left">
                  <Info className="text-blue-500 shrink-0" size={18} />
                  <p className="text-[11px] font-medium text-slate-500 leading-tight">
                    Don't see it? Check your spam folder or wait a few minutes. Verification is mandatory for security compliance.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/40 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Building2 className="text-white" size={40} />
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Prism<span className="text-blue-600">ERP</span></h1>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Enterprise Resource Intelligence</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                  <button 
                    onClick={() => { setMode('login'); setError(null); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-blue-600 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => { setMode('signup'); setError(null); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'signup' ? 'bg-white text-blue-600 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-1 font-black text-xs">
                        <AlertCircle size={16} />
                        Auth Error
                      </div>
                      <p className="text-xs font-bold leading-tight">{error}</p>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <>
                      <div className="animate-in slide-in-from-left-4 duration-300">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            type="text" 
                            required 
                            placeholder="Aditya F" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 placeholder-slate-300"
                          />
                        </div>
                      </div>
                      <div className="animate-in slide-in-from-left-4 duration-300 delay-75">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Role</label>
                        <div className="relative">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <select 
                            value={role}
                            onChange={e => setRole(e.target.value as UserRole)}
                            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 appearance-none"
                          >
                            <option value="Admin">Administrator</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Staff">Basic Staff</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        required 
                        placeholder="name@company.com" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 placeholder-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Secret Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        placeholder="Ex: Strong@123" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800 placeholder-slate-300"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password Policy Indicator for Signup */}
                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                        <Requirement met={passwordRequirements.hasUpper} label="A-Z" />
                        <Requirement met={passwordRequirements.hasLower} label="a-z" />
                        <Requirement met={passwordRequirements.hasNumber} label="0-9" />
                        <Requirement met={passwordRequirements.hasSpecial} label="Special" />
                        <Requirement met={passwordRequirements.hasLength} label="8+ chars" />
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || (mode === 'signup' && !isPasswordValid)}
                    className={`w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-2xl group disabled:opacity-50 mt-4 ${isPasswordValid || mode === 'login' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        {mode === 'login' ? 'Authenticate' : 'Establish Account'} 
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={handleBypassToLocal}
                      className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-400 transition-colors text-center"
                    >
                      Bypass to Local Storage Demo
                    </button>
                  )}
                </form>
              </>
            )}

            <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-center gap-3 opacity-30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secured by</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                <div className="w-1 h-1 rounded-full bg-slate-900"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 font-inter">
        <div className="max-w-4xl w-full">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Business Selection</h1>
              <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                User: <span className="text-blue-600 font-bold">{store.user?.name}</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">{store.user?.role}</span>
              </p>
            </div>
            <button 
              onClick={() => store.logout()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 font-bold transition-all shadow-sm"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {store.companies.map((c: any) => (
              <button 
                key={c.id}
                onClick={() => store.selectCompany(c.id)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-left hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                   <Building2 size={120} />
                </div>
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Building2 size={32} className="text-slate-300 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{c.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 font-mono">{c.gstin}</p>
                <div className="flex items-center text-blue-600 font-black text-xs uppercase tracking-widest">
                  Initialize <ChevronRight size={16} className="ml-1 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </button>
            ))}

            {(store.user?.role === 'Admin' || store.user?.role === 'Accountant') && (
              <button 
                onClick={() => setStep('create')}
                className="p-8 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-6 group min-h-[300px]"
              >
                <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl group-hover:shadow-blue-200">
                  <Plus className="text-slate-300 group-hover:text-blue-500 transition-colors" size={40} />
                </div>
                <div className="text-center">
                  <span className="block text-xl font-black text-slate-800">New Entity</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 block">Registration Hub</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 font-inter">
      <div className="max-w-2xl w-full animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-12 text-white flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Company Setup</h2>
              <p className="text-slate-400 mt-2 font-medium">Configure your legal and financial Master Data</p>
            </div>
            <button 
              onClick={() => setStep('select')}
              className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-all group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <form onSubmit={handleCreateCompany} className="p-12 space-y-8">
            {error && (
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle size={20} />
                  <p className="font-black">Critical Setup Error</p>
                </div>
                <p className="font-medium opacity-80">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="col-span-full">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Legal Entity Name</label>
                <div className="relative">
                  <input 
                    required 
                    placeholder="e.g. Prism Global Solutions Pvt Ltd"
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 placeholder-slate-300"
                    value={newCompany.name}
                    onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">GSTIN Certificate ID</label>
                <div className="relative">
                  <input 
                    required 
                    placeholder="27AAACP1234A1Z5"
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm font-bold uppercase placeholder-slate-300"
                    value={newCompany.gstin}
                    onChange={e => setNewCompany({ ...newCompany, gstin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Accounting Period</label>
                <div className="relative">
                  <select 
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold appearance-none text-slate-800"
                    value={newCompany.fy}
                    onChange={e => setNewCompany({ ...newCompany, fy: e.target.value })}
                  >
                    <option value="2024-25">FY 2024-25 (Live)</option>
                    <option value="2023-24">FY 2023-24 (Audited)</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="col-span-full">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Registered Address</label>
                <div className="relative">
                  <textarea 
                    rows={3}
                    placeholder="Headquarters, 5th Floor, Corporate Park, City..."
                    className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800 placeholder-slate-300 resize-none"
                    value={newCompany.address}
                    onChange={e => setNewCompany({ ...newCompany, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-600/30 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Establishing Hub...</span>
                </div>
              ) : (
                <>Establish Business Hub <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Requirement: React.FC<{ met: boolean, label: string }> = ({ met, label }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${met ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
    {met ? <Check size={10} /> : <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-200" />}
    {label}
  </div>
);

export default Auth;

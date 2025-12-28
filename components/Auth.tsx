
import React, { useState } from 'react';
import { Mail, ArrowRight, Building2, Plus, LogOut, ChevronRight, Hash, Calendar, MapPin, Loader2, UserCircle, X, Eye, EyeOff, Lock } from 'lucide-react';

const Auth: React.FC<{ store: any }> = ({ store }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'select' | 'create'>(store.user ? 'select' : 'login');
  const [newCompany, setNewCompany] = useState({ name: '', gstin: '', fy: '2024-25', address: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await store.login(email, password);
      setStep('select');
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await store.createCompany(newCompany.name, newCompany.gstin, newCompany.fy, newCompany.address);
    setLoading(false);
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
        <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-slate-800">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/30">
                <Building2 className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome to Prism<span className="text-blue-600">ERP</span></h1>
              <p className="text-slate-500 font-medium">Professional business accounting suite</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                  <X size={16} />
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="••••••••" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-800"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/20 group"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <p className="text-center text-xs text-slate-400">
                Secure enterprise-grade session encryption active.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-4xl w-full">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Select Business</h1>
              <p className="text-slate-500 mt-2 font-medium">Choose a company to begin accounting</p>
            </div>
            <button 
              onClick={() => store.logout()}
              className="flex items-center gap-2 text-slate-400 hover:text-rose-500 font-bold transition-colors"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {store.companies.map((c: any) => (
              <button 
                key={c.id}
                onClick={() => store.selectCompany(c.id)}
                className="bg-white p-8 rounded-3xl border border-slate-200 text-left hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Building2 size={80} />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
                  <Building2 size={24} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{c.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{c.gstin}</p>
                <div className="flex items-center text-blue-600 font-bold text-sm">
                  Enter Workspace <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}

            <button 
              onClick={() => setStep('create')}
              className="p-8 rounded-3xl border-2 border-dashed border-slate-200 text-left hover:border-blue-300 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-4 group"
            >
              <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Plus className="text-slate-400 group-hover:text-blue-500 transition-colors" size={28} />
              </div>
              <div className="text-center">
                <span className="block font-bold text-slate-800">Add New Business</span>
                <span className="text-xs text-slate-400 font-medium mt-1">Setup GST & Inventory</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-2xl w-full animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-10 text-white flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">New Business Entity</h2>
              <p className="text-slate-400 mt-1 font-medium">Enter your legal registration details</p>
            </div>
            <button 
              onClick={() => setStep('select')}
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateCompany} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Legal Name of Business</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required 
                    placeholder="e.g. Prism Tech Private Limited"
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={newCompany.name}
                    onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">GSTIN Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required 
                    placeholder="27AAACP1234A1Z5"
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp text-sm"
                    value={newCompany.gstin}
                    onChange={e => setNewCompany({ ...newCompany, gstin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Financial Year</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                    value={newCompany.fy}
                    onChange={e => setNewCompany({ ...newCompany, fy: e.target.value })}
                  >
                    <option value="2024-25">2024-25 (Current)</option>
                    <option value="2023-24">2023-24 (Previous)</option>
                  </select>
                </div>
              </div>

              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Principal Place of Business</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                  <textarea 
                    rows={3}
                    placeholder="Sector 18, Business Park, Gurugram, India"
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={newCompany.address}
                    onChange={e => setNewCompany({ ...newCompany, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-2xl shadow-blue-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Establish Business Hub'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;

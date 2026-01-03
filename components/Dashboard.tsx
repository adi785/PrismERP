
import React, { useMemo } from 'react';
import { ShoppingBag, CreditCard, Scale, TrendingUp, Printer, Activity, Clock, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { triggerPrint } from '../utils/exportUtils';

const Dashboard: React.FC<{ store: any }> = ({ store }) => {
  const { stats, company, stockItems, ledgers, vouchers, theme } = store;

  const ratios = useMemo(() => {
    const currentAssets = ledgers.filter((l: any) => l.type === 'Asset').reduce((s: number, l: any) => s + l.currentBalance, 0);
    const currentLiabilities = ledgers.filter((l: any) => l.type === 'Liability').reduce((s: number, l: any) => s + l.currentBalance, 0);
    const currentRatio = currentLiabilities === 0 ? 0 : currentAssets / Math.abs(currentLiabilities);
    const inventoryValuation = stockItems.reduce((s: number, i: any) => s + (i.currentStock * i.purchasePrice), 0);
    const invTurnover = inventoryValuation === 0 ? 0 : stats.totalSales / inventoryValuation;
    return { currentRatio, invTurnover, currentAssets, inventoryValuation };
  }, [ledgers, stockItems, stats.totalSales]);

  const recentActivity = useMemo(() => vouchers.slice(0, 5), [vouchers]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight dark:text-white">Business Intelligence</h2>
          <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Analytics Console</p>
        </div>
        <button onClick={triggerPrint} className="w-full md:w-auto px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:opacity-90 transition-all">
          <Printer size={16} className="inline mr-2" /> Download Report
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 no-print">
        <StatCard label="Total Sales" value={`₹${stats.totalSales.toLocaleString()}`} trend="+12.5%" color="blue" icon={<ShoppingBag />} />
        <StatCard label="Procurement" value={`₹${stats.totalPurchases.toLocaleString()}`} trend="+4.2%" color="purple" icon={<CreditCard />} />
        <StatCard label="Liquidity" value={ratios.currentRatio.toFixed(2)} trend="Healthy" color="emerald" icon={<Scale />} />
        <StatCard label="Inventory" value={`₹${ratios.inventoryValuation.toLocaleString()}`} trend="Asset" color="amber" icon={<TrendingUp />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div>
              <h4 className="text-lg md:text-xl font-black dark:text-white">Financial Velocity</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cash Flow Analytics</p>
            </div>
          </div>
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{name: 'Cycle A', sales: stats.totalSales, purchase: stats.totalPurchases}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', background: theme === 'dark' ? '#0f172a' : '#fff' }} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
                <Bar dataKey="purchase" fill={theme === 'dark' ? '#334155' : '#cbd5e1'} radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-900 p-8 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-2xl text-white flex flex-col border border-white/5">
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <Activity className="text-blue-500" size={20} />
            <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Live Pulse</h3>
          </div>
          <div className="flex-1 space-y-6 md:space-y-8">
            {recentActivity.map((v: any) => (
              <div key={v.id} className="flex items-start gap-4 md:gap-5 group">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-blue-600/20 group-hover:border-blue-500/50 transition-all">
                  <Clock size={14} className="text-slate-500 group-hover:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold truncate">{v.narration || v.type}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase mt-1 truncate">₹{v.totalAmount.toLocaleString()} • {v.date}</p>
                </div>
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mt-2 shrink-0 ${v.type === 'Sales' ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="py-12 md:py-20 text-center text-slate-600 font-bold uppercase text-[9px] tracking-widest border border-dashed border-white/5 rounded-2xl md:rounded-3xl">No records found</div>
            )}
          </div>
          <button className="mt-10 md:mt-12 w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">View Audit Trail</button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend, color, icon }: any) => {
  const colorMap: any = { 
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', 
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400', 
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', 
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' 
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className={`p-3 md:p-4 rounded-xl md:rounded-3xl ${colorMap[color]}`}>{icon}</div>
        <span className="text-[9px] md:text-[10px] font-black px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg md:rounded-xl text-slate-500 uppercase tracking-widest">{trend}</span>
      </div>
      <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-xl md:text-3xl font-black dark:text-white tracking-tight truncate">{value}</h4>
    </div>
  );
};

export default Dashboard;

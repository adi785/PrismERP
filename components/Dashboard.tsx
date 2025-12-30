import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  ShoppingBag, 
  PieChart as PieIcon,
  Activity,
  PackageSearch,
  Printer,
  FileText,
  ShieldCheck,
  TrendingUp,
  Scale
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { triggerPrint } from '../utils/exportUtils';

const emptyChartData = [
  { name: 'Apr', sales: 0, purchase: 0 },
  { name: 'May', sales: 0, purchase: 0 },
  { name: 'Jun', sales: 0, purchase: 0 },
  { name: 'Jul', sales: 0, purchase: 0 },
  { name: 'Aug', sales: 0, purchase: 0 },
  { name: 'Sep', sales: 0, purchase: 0 },
];

const Dashboard: React.FC<{ store: any }> = ({ store }) => {
  const { stats, vouchers, stockItems, company, ledgers } = store;
  const chartData = emptyChartData; 

  // Financial Ratio Engine
  const ratios = useMemo(() => {
    const currentAssets = ledgers.filter((l: any) => l.type === 'Asset').reduce((s: number, l: any) => s + l.currentBalance, 0);
    const currentLiabilities = ledgers.filter((l: any) => l.type === 'Liability').reduce((s: number, l: any) => s + l.currentBalance, 0);
    
    // Liquidity Ratio (Standard: > 1.2 is healthy)
    const currentRatio = currentLiabilities === 0 ? 0 : currentAssets / Math.abs(currentLiabilities);
    
    // Inventory Health (Standard: Sales Volume vs Avg Stock)
    const inventoryValuation = stockItems.reduce((s: number, i: any) => s + (i.currentStock * i.purchasePrice), 0);
    const invTurnover = inventoryValuation === 0 ? 0 : stats.totalSales / inventoryValuation;

    return { currentRatio, invTurnover, currentAssets, currentLiabilities };
  }, [ledgers, stockItems, stats.totalSales]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500 font-medium">Real-time health of {company.name}</p>
        </div>
        <button 
          onClick={triggerPrint}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
        >
          <Printer size={16} /> Print Executive Report
        </button>
      </div>

      {/* SCREEN VIEW CONTENT */}
      <div className="no-print space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Total Sales" 
            value={`₹${stats.totalSales.toLocaleString()}`} 
            trend="0.0%" 
            positive={true} 
            icon={<ShoppingBag className="text-blue-500" />}
          />
          <StatCard 
            label="Total Purchases" 
            value={`₹${stats.totalPurchases.toLocaleString()}`} 
            trend="0.0%" 
            positive={false} 
            icon={<CreditCard className="text-purple-500" />}
          />
          <StatCard 
            label="Current Ratio" 
            value={ratios.currentRatio.toFixed(2)} 
            trend={ratios.currentRatio > 1.2 ? "Optimal" : "Check Liquidity"} 
            positive={ratios.currentRatio > 1.2} 
            icon={<Scale className="text-emerald-500" />}
          />
          <StatCard 
            label="Inv. Turnover" 
            value={`${ratios.invTurnover.toFixed(1)}x`} 
            trend="Stock Velocity" 
            positive={true} 
            icon={<TrendingUp className="text-rose-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight uppercase text-[10px] text-slate-400 mb-2">Revenue Performance</h3>
                <h4 className="text-2xl font-black text-slate-900">Historical Cycles</h4>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sales</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-300 rounded-full"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Purchase</span></div>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="purchase" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 text-white flex flex-col relative overflow-hidden">
            <div className="absolute -top-10 -right-10 p-20 opacity-5">
              <Activity size={180} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-slate-500">Liquidity Cockpit</h3>
            <div className="flex-1 space-y-8">
               <LiquidityItem label="Cash on Hand" value={stats.cashBalance} total={ratios.currentAssets} color="blue" />
               <LiquidityItem label="Bank Balance" value={stats.bankBalance} total={ratios.currentAssets} color="emerald" />
               <LiquidityItem label="Inventory Equity" value={stockItems.reduce((s:number, i:any) => s + (i.currentStock * i.purchasePrice), 0)} total={ratios.currentAssets} color="amber" />
            </div>
            <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Solvency Outlook</p>
               <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Company possesses ₹{ratios.currentRatio.toFixed(2)} in assets for every ₹1.00 of liability.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiquidityItem: React.FC<{ label: string, value: number, total: number, color: 'blue' | 'emerald' | 'amber' }> = ({ label, value, total, color }) => {
  const percent = total === 0 ? 0 : Math.min(100, (value / total) * 100);
  const colorMap = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold mb-3">
        <span className="text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="font-mono">₹{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${colorMap[color]}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, trend: string, positive: boolean, icon: React.ReactNode }> = ({ label, value, trend, positive, icon }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">{icon}</div>
      <div className={`flex items-center text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {trend}
      </div>
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{value}</h4>
  </div>
);

export default Dashboard;
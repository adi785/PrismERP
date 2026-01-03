
import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  ShoppingBag, 
  Activity,
  Printer,
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
  const { stats, company, stockItems, ledgers } = store;
  const chartData = emptyChartData; 

  const ratios = useMemo(() => {
    const currentAssets = ledgers.filter((l: any) => l.type === 'Asset').reduce((s: number, l: any) => s + l.currentBalance, 0);
    const currentLiabilities = ledgers.filter((l: any) => l.type === 'Liability').reduce((s: number, l: any) => s + l.currentBalance, 0);
    const currentRatio = currentLiabilities === 0 ? 0 : currentAssets / Math.abs(currentLiabilities);
    const inventoryValuation = stockItems.reduce((s: number, i: any) => s + (i.currentStock * i.purchasePrice), 0);
    const invTurnover = inventoryValuation === 0 ? 0 : stats.totalSales / inventoryValuation;
    return { currentRatio, invTurnover, currentAssets };
  }, [ledgers, stockItems, stats.totalSales]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Real-time health of {company.name}</p>
        </div>
        <button 
          onClick={triggerPrint}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl"
        >
          <Printer size={16} /> <span className="hidden sm:inline">Print Report</span><span className="sm:hidden">Print</span>
        </button>
      </div>

      <div className="no-print space-y-6 md:space-y-8">
        {/* Responsive Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Total Sales" value={`₹${stats.totalSales.toLocaleString()}`} trend="0.0%" positive icon={<ShoppingBag className="text-blue-500" />} />
          <StatCard label="Total Purchases" value={`₹${stats.totalPurchases.toLocaleString()}`} trend="0.0%" positive={false} icon={<CreditCard className="text-purple-500" />} />
          <StatCard label="Current Ratio" value={ratios.currentRatio.toFixed(2)} trend={ratios.currentRatio > 1.2 ? "Healthy" : "Low"} positive={ratios.currentRatio > 1.2} icon={<Scale className="text-emerald-500" />} />
          <StatCard label="Inv. Turnover" value={`${ratios.invTurnover.toFixed(1)}x`} trend="Velocity" positive icon={<TrendingUp className="text-rose-500" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Resizes with container */}
          <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black text-slate-900">Revenue Cycle</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Period Breakdown</p>
              </div>
            </div>
            <div className="h-[250px] md:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchase" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Liquidity Cockpit */}
          <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-slate-500">Liquidity Cockpit</h3>
            <div className="flex-1 space-y-6">
               <LiquidityItem label="Cash on Hand" value={stats.cashBalance} total={ratios.currentAssets} color="blue" />
               <LiquidityItem label="Bank Balance" value={stats.bankBalance} total={ratios.currentAssets} color="emerald" />
               <LiquidityItem label="Inventory Equity" value={stockItems.reduce((s:number, i:any) => s + (i.currentStock * i.purchasePrice), 0)} total={ratios.currentAssets} color="amber" />
            </div>
            <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/10 text-xs text-slate-400">
               Solvency: ₹{ratios.currentRatio.toFixed(2)} in assets per ₹1.00 liability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiquidityItem = ({ label, value, total, color }: any) => {
  const percent = total === 0 ? 0 : Math.min(100, (value / total) * 100);
  const colorMap: any = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold mb-2">
        <span className="text-slate-400 uppercase">{label}</span>
        <span>₹{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[color]}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, trend, positive, icon }: any) => (
  <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {trend}
      </div>
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-xl md:text-2xl font-black text-slate-800">{value}</h4>
  </div>
);

export default Dashboard;

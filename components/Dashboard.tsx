import React from 'react';
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
  ShieldCheck
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
  const { stats, vouchers, stockItems, company } = store;
  const chartData = emptyChartData; 

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

      {/* COMPREHENSIVE PRINT TEMPLATE */}
      <div className="print-only">
        <div className="mb-10 pb-8 border-b-2 border-slate-900">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase text-slate-900 leading-tight">{company.name}</h1>
              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Financial Status Report • {company.financialYear}</p>
              <p className="text-xs font-mono font-bold text-slate-400 mt-1">GSTIN: {company.gstin}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Date</p>
              <p className="text-lg font-mono font-black text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="border-2 border-slate-100 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Financials</p>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-sm font-bold text-slate-600">Total Sales</span>
                <span className="text-sm font-mono font-black">₹{stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-sm font-bold text-slate-600">Total Purchases</span>
                <span className="text-sm font-mono font-black">₹{stats.totalPurchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-sm font-black text-slate-900">Operating Surplus</span>
                <span className="text-sm font-mono font-black text-blue-600">₹{(stats.totalSales - stats.totalPurchases).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="border-2 border-slate-100 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Liquidity Status</p>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-sm font-bold text-slate-600">Bank Balance</span>
                <span className="text-sm font-mono font-black">₹{stats.bankBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-sm font-bold text-slate-600">Cash-in-Hand</span>
                <span className="text-sm font-mono font-black">₹{stats.cashBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 pb-2 border-b-2 border-slate-900 w-fit">Inventory Audit Summary</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest">
                <th className="px-4 py-3">SKU Description</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Valuation (Cost)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockItems.length > 0 ? stockItems.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-bold">{item.name}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-500">{item.unit}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right">{item.currentStock}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right font-black">₹{(item.currentStock * item.purchasePrice).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-bold uppercase text-xs">No active inventory tracked</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-12 text-center">
             <div className="border-t border-slate-900 pt-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Accountant</p>
             </div>
             <div className="border-t border-slate-900 pt-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Internal Audit</p>
             </div>
             <div className="border-t border-slate-900 pt-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Authorized Signatory</p>
             </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-slate-50 rounded-2xl">
          <div className="flex items-start gap-4">
            <ShieldCheck size={20} className="text-slate-400 shrink-0" />
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              <strong>Data Authenticity:</strong> This executive report is generated directly from the PrismERP production database. The values represent a snapshot in time and are subject to final adjustment during the end-of-year audit process.
            </p>
          </div>
        </div>
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
            label="Bank Balance" 
            value={`₹${stats.bankBalance.toLocaleString()}`} 
            trend="Initial" 
            positive={true} 
            icon={<Wallet className="text-emerald-500" />}
          />
          <StatCard 
            label="Operating Margin" 
            value="0.0%" 
            trend="0.0%" 
            positive={true} 
            icon={<Activity className="text-rose-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Revenue Performance</h3>
                <p className="text-sm text-slate-500">Sales vs Purchases across the financial year</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="purchase" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 text-white flex flex-col">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PieIcon size={20} className="text-blue-400" />
              Inventory Alerts
            </h3>
            <div className="flex-1 flex flex-col justify-center">
               {stockItems.length === 0 ? (
                 <div className="text-center py-10 opacity-40">
                    <PackageSearch className="mx-auto mb-4" size={48} />
                    <p className="text-sm font-medium">No stock items tracked yet</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                   {stockItems.slice(0, 8).map((item: any) => (
                     <div key={item.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400 font-medium truncate pr-4">{item.name}</span>
                          <span className="font-bold whitespace-nowrap">{item.currentStock} {item.unit}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${item.currentStock < 10 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min(100, (item.currentStock / 100) * 100)}%` }}
                          ></div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
            <button className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors">
              Configure Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, trend: string, positive: boolean, icon: React.ReactNode }> = ({ label, value, trend, positive, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        {positive ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
        {trend}
      </div>
    </div>
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h4>
  </div>
);

export default Dashboard;
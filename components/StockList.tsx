
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowRight, AlertTriangle, X, Hash, ShoppingBag, Tag, Layers, TrendingUp, AlertCircle, Edit2, Download, Upload, FileSpreadsheet, History, ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, ShoppingCart, MoreVertical, Eye, Copy, Settings2, Trash2, Boxes, ChevronDown, ListFilter, ClipboardCheck, Scale, Info, Calendar } from 'lucide-react';
import { StockItem, Voucher, InventoryMovement, TrackingType, TrackingDetail } from '../types';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const StockList: React.FC<{ store: any }> = ({ store }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'ledger' | 'tracking'>('overview');
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Omit<StockItem, 'id' | 'currentStock'>>({
    name: '', sku: '', hsn: '', unit: 'Nos', openingStock: 0, purchasePrice: 0, salePrice: 0, gstRate: 18, trackingType: 'none'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => store.stockItems.filter((item: StockItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ), [store.stockItems, searchTerm]);

  const selectedStockItem = useMemo(() => 
    store.stockItems.find((i: StockItem) => i.id === selectedStockId),
    [selectedStockId, store.stockItems]
  );

  const trackingRecords = useMemo(() => 
    store.trackingData.filter((t: TrackingDetail) => t.itemId === selectedStockId),
    [selectedStockId, store.trackingData]
  );

  const handleCreateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;
    await store.addStockItem(formData);
    setIsModalOpen(false);
  };

  if (selectedStockItem) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedStockId(null)} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl text-slate-500 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 no-print"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedStockItem.name}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{selectedStockItem.sku} • {selectedStockItem.trackingType === 'none' ? 'General Stock' : `${selectedStockItem.trackingType} Tracked`}</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl no-print">
            {['overview', 'ledger', 'tracking'].map(t => (
              <button key={t} onClick={() => setDetailTab(t as any)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === t ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
            ))}
          </div>
        </div>

        {detailTab === 'tracking' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="p-8 border-b dark:border-slate-800 flex items-center gap-3">
                 <History size={18} className="text-blue-500" />
                 <h3 className="text-xs font-black uppercase tracking-widest">{selectedStockItem.trackingType === 'batch' ? 'Batch Inventory Hub' : 'Serial Number Registry'}</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-slate-800">
                       <th className="px-10 py-5">{selectedStockItem.trackingType === 'batch' ? 'Batch Identifier' : 'Unique Serial'}</th>
                       {selectedStockItem.trackingType === 'batch' && <th className="px-6 py-5">Expiry Date</th>}
                       <th className="px-10 py-5 text-right">Available Qty</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {trackingRecords.map((t: TrackingDetail) => (
                       <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                         <td className="px-10 py-5 font-mono font-black text-sm text-slate-800 dark:text-slate-200">{t.identifier}</td>
                         {selectedStockItem.trackingType === 'batch' && <td className="px-6 py-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t.expiryDate || 'No Expiry'}</td>}
                         <td className="px-10 py-5 text-right font-black text-slate-900 dark:text-white">{t.currentQty} <span className="text-[10px] opacity-50">{selectedStockItem.unit}</span></td>
                       </tr>
                     ))}
                     {trackingRecords.length === 0 && (
                       <tr><td colSpan={3} className="py-20 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">No tracked records available in stock</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {detailTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</p>
                 <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedStockItem.currentStock} {selectedStockItem.unit}</h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Book Value</p>
                 <h4 className="text-3xl font-black text-emerald-600 tracking-tighter">₹{(selectedStockItem.currentStock * selectedStockItem.purchasePrice).toLocaleString()}</h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost / Sale</p>
                 <h4 className="text-lg font-black text-slate-800 dark:text-white">₹{selectedStockItem.purchasePrice} / ₹{selectedStockItem.salePrice}</h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Code</p>
                 <h4 className="text-lg font-black text-blue-600">HSN {selectedStockItem.hsn} ({selectedStockItem.gstRate}%)</h4>
              </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Stock Master</h2>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center gap-2"><Plus size={18} /> Add SKU</button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex gap-4 no-print shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Filter SKU nomenclature or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold shadow-inner" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item: StockItem) => (
          <div key={item.id} onClick={() => setSelectedStockId(item.id)} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500 hover:shadow-2xl transition-all group cursor-pointer active:scale-95 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Package size={28} /></div>
              <div className="flex flex-col items-end gap-2">
                 <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${item.currentStock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.currentStock < 5 ? 'Low Stock' : 'Available'}</span>
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{item.trackingType !== 'none' && <><Boxes size={10} className="inline mr-1" /> {item.trackingType}</>}</span>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-500 transition-colors">{item.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{item.sku}</p>
            <div className="flex justify-between items-end pt-6 border-t border-slate-50 dark:border-slate-800">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">On Hand</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{item.currentStock} {item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Valuation</p>
                <p className="text-sm font-black text-blue-600 font-mono">₹{(item.currentStock * item.purchasePrice).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div><h2 className="text-3xl font-black">Item Registration</h2><p className="text-slate-400 mt-1">Configure SKU master and tracking type</p></div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
            </div>
            <form onSubmit={handleCreateStockItem} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-full"><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Nomenclature</label><input required className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" placeholder="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">SKU Code</label><input required className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-mono font-black" placeholder="ITEM-001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})}/></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">HSN / SAC</label><input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-mono font-black" placeholder="9999" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})}/></div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Tracking Methodology</label>
                  <select className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black appearance-none outline-none" value={formData.trackingType} onChange={e => setFormData({...formData, trackingType: e.target.value as TrackingType})}>
                    <option value="none">General (No Tracking)</option>
                    <option value="batch">Batch / Lot Tracking</option>
                    <option value="serial">Serial Number Tracking</option>
                  </select>
                </div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Unit of Measure</label><input className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}/></div>

                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Purchase Rate (₹)</label><input type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})}/></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Sale Rate (₹)</label><input type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 font-black" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})}/></div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Authorize Registration</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;

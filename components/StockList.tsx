import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowRight, AlertTriangle, X, Hash, ShoppingBag, Tag, Layers, TrendingUp, AlertCircle, Edit2, Download, Upload, FileSpreadsheet, History, ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, ShoppingCart, MoreVertical, Eye, Copy, Settings2, Trash2 } from 'lucide-react';
import { StockItem, Voucher } from '../types';
import { downloadCSV, parseCSV, triggerPrint } from '../utils/exportUtils';

const StockList: React.FC<{ store: any }> = ({ store }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Omit<StockItem, 'id' | 'currentStock'>>({
    name: '',
    sku: '',
    hsn: '',
    unit: 'Nos',
    openingStock: 0,
    purchasePrice: 0,
    salePrice: 0,
    gstRate: 18
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => store.stockItems.filter((item: StockItem) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.hsn.toLowerCase().includes(searchTerm.toLowerCase())
  ), [store.stockItems, searchTerm]);

  const metrics = useMemo(() => {
    const totalItems = store.stockItems.length;
    const totalValue = store.stockItems.reduce((sum: number, item: StockItem) => sum + (item.currentStock * item.purchasePrice), 0);
    const lowStockCount = store.stockItems.filter((item: StockItem) => item.currentStock < 10).length;
    return { totalItems, totalValue, lowStockCount };
  }, [store.stockItems]);

  const selectedStockItem = useMemo(() => 
    store.stockItems.find((i: StockItem) => i.id === selectedStockId),
    [selectedStockId, store.stockItems]
  );

  const stockHistory = useMemo(() => {
    if (!selectedStockItem) return [];
    return store.vouchers.filter((v: Voucher) => 
      v.narration.toLowerCase().includes(selectedStockItem.name.toLowerCase()) ||
      v.narration.toLowerCase().includes(selectedStockItem.sku.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStockItem, store.vouchers]);

  const handleCreateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      alert("Name and SKU are required.");
      return;
    }
    await store.addStockItem(formData);
    setFormData({
      name: '', sku: '', hsn: '', unit: 'Nos', openingStock: 0, purchasePrice: 0, salePrice: 0, gstRate: 18
    });
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    downloadCSV(store.stockItems, `Inventory_Status_${store.company.name}`);
  };

  if (selectedStockItem) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedStockId(null)} className="p-3 hover:bg-white rounded-2xl text-slate-500 transition-all border border-transparent hover:border-slate-200 no-print">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900">{selectedStockItem.name} Statement</h2>
            <p className="text-slate-500 font-medium">SKU: <span className="font-mono font-bold text-blue-600 uppercase">{selectedStockItem.sku}</span> • Full Audit History</p>
          </div>
          <div className="flex gap-3 no-print">
            <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
              <Printer size={16} /> Print Stock Ledger
            </button>
          </div>
        </div>

        <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
          <h1 className="text-3xl font-black uppercase">{store.company.name}</h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Stock Ledger: {selectedStockItem.name}</p>
          <p className="text-xs font-mono font-bold mt-1 text-slate-400">SKU: {selectedStockItem.sku} • HSN: {selectedStockItem.hsn}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">On Hand</p>
             <p className="text-2xl font-black text-slate-900">{selectedStockItem.currentStock} <span className="text-xs font-bold text-slate-400">{selectedStockItem.unit}</span></p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Book Value (Cost)</p>
             <p className="text-2xl font-black text-blue-600">₹{(selectedStockItem.currentStock * selectedStockItem.purchasePrice).toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Purchase Price</p>
             <p className="text-2xl font-black text-slate-800">₹{selectedStockItem.purchasePrice.toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Rate</p>
             <p className="text-2xl font-black text-slate-500">GST {selectedStockItem.gstRate}%</p>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/30 no-print">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transaction Audit Trail</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/10">
                <th className="px-8 py-5">Date</th>
                <th className="px-6 py-5">Voucher No.</th>
                <th className="px-6 py-5">Movement</th>
                <th className="px-6 py-5">Narration / Details</th>
                <th className="px-8 py-5 text-right">Value Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium italic">No ledger entries found. Stock level is current from opening balance.</p>
                  </td>
                </tr>
              ) : (
                stockHistory.map((v: Voucher) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{v.date}</td>
                    <td className="px-6 py-5 font-mono text-xs font-bold text-blue-600 uppercase tracking-tighter">{v.number}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {v.type === 'Sales' ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            <ArrowUpRight size={12} /> Stock Out
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            <ArrowDownRight size={12} /> Stock In
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-500">{v.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-500 font-medium italic truncate max-w-xs leading-relaxed">"{v.narration}"</td>
                    <td className="px-8 py-5 text-right font-mono font-bold text-slate-900">₹{v.totalAmount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500 font-medium">Global SKU levels and real-time stock valuation</p>
        </div>
        <div className="flex gap-3">
           <button onClick={triggerPrint} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm">
            <Printer size={16} /> Print Valuation
          </button>
           <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm">
            <Download size={16} /> Export (CSV)
          </button>
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-bold">
            <Plus size={18} /> Add New SKU
          </button>
        </div>
      </div>

      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <h1 className="text-3xl font-black uppercase text-slate-900">{store.company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Consolidated Inventory Valuation Report</p>
        <p className="text-xs font-mono font-bold mt-1 text-slate-400">Financial Period: {store.company.financialYear}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl no-print"><Layers size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active SKUs</p>
            <p className="text-2xl font-black text-slate-800">{metrics.totalItems}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl no-print"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Valuation</p>
            <p className="text-2xl font-black text-slate-800">₹{metrics.totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl no-print"><AlertCircle size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reorder Alerts</p>
            <p className="text-2xl font-black text-slate-800">{metrics.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search items by SKU, Name, or HSN Code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center">
             <Package size={64} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching inventory records</p>
          </div>
        )}
        {filteredItems.map((item: StockItem) => (
          <div key={item.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 hover:border-blue-300 transition-all group flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Package size={28} />
              </div>
              <div className="flex items-center gap-2">
                 <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${item.currentStock < 10 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {item.currentStock < 10 ? 'Critically Low' : 'Adequate'}
                </span>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === item.id ? null : item.id);
                    }}
                    className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-800 focus:outline-none"
                  >
                    <MoreVertical size={20} />
                  </button>
                  {activeMenuId === item.id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedStockId(item.id); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Eye size={16} /> View Statement
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); alert("Edit SKU coming soon!"); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Settings2 size={16} /> Edit Details
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.sku); alert("SKU Copied"); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all"
                      >
                        <Copy size={16} /> Copy SKU ID
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight">{item.name}</h3>
            <p className="text-[10px] text-slate-400 font-mono mb-8 uppercase tracking-widest font-black">{item.sku} • HSN: {item.hsn}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Stock Level</p>
                <p className="text-lg font-black text-slate-800">{item.currentStock} <span className="text-[10px] font-bold text-slate-400">{item.unit}</span></p>
              </div>
              
              <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter mb-1.5">Book Valuation</p>
                <p className="text-lg font-black text-blue-600 font-mono">₹{(item.currentStock * item.purchasePrice).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sale Rate</span>
                <span className="text-sm font-bold text-slate-900 font-mono">₹{item.salePrice.toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setSelectedStockId(item.id)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
              >
                View Ledger <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-blue-600" size={24} />
                Register New Stock Item (SKU)
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white hover:shadow rounded-xl transition-all text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateStockItem} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name / Description</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. MacBook Pro M3 14-inch"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SKU / Model Number</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. MBP-M3-14-SLV"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-bold"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HSN Code</label>
                  <input 
                    type="text"
                    placeholder="e.g. 8471"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-bold"
                    value={formData.hsn}
                    onChange={e => setFormData({ ...formData, hsn: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unit of Measure</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="Nos">Numbers (Nos)</option>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Box">Boxes</option>
                    <option value="Kgs">Kilograms</option>
                    <option value="Mtr">Meters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Rate (%)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                    value={formData.gstRate}
                    onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                  />
                </div>

                <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Purchase Price</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                      value={formData.purchasePrice || ''}
                      onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sale Price</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                      value={formData.salePrice || ''}
                      onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opening Stock</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                      value={formData.openingStock || ''}
                      onChange={e => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                >
                  Confirm & Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;
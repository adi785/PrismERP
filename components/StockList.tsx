import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowRight, AlertTriangle, X, Hash, ShoppingBag, Tag, Layers, TrendingUp, AlertCircle, Edit2, Download, Upload, FileSpreadsheet, History, ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, ShoppingCart, MoreVertical, Eye, Copy, Settings2, Trash2, Boxes, ChevronDown } from 'lucide-react';
import { StockItem, Voucher, InventoryMovement } from '../types';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const StockList: React.FC<{ store: any }> = ({ store }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Advanced Stock History Engine
  const historyData = useMemo(() => {
    if (!selectedStockItem) return [];
    
    // Sort vouchers by date ASC to calculate running balance correctly
    const relevantVouchers = [...store.vouchers]
      .filter((v: Voucher) => v.inventory?.some(m => m.itemId === selectedStockItem.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = selectedStockItem.openingStock;
    const history = [{
      id: 'opening-bal',
      date: 'Opening',
      number: '-',
      type: 'Initial Balance',
      change: 0,
      balance: runningBalance,
      isOpening: true
    }];

    relevantVouchers.forEach((v: Voucher) => {
      const movement = v.inventory?.find((m: InventoryMovement) => m.itemId === selectedStockItem.id);
      if (movement) {
        const change = movement.type === 'In' ? movement.quantity : -movement.quantity;
        runningBalance += change;
        history.push({
          id: v.id,
          date: v.date,
          number: v.number,
          type: v.type,
          change: change,
          balance: runningBalance,
          isOpening: false
        });
      }
    });

    return history.reverse(); // Newest transactions first for UI
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

  const handleExportHistoryCSV = () => {
    if (!selectedStockItem) return;
    downloadCSV(historyData, `Stock_History_${selectedStockItem.sku}`);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete SKU: ${name}? This will remove the item from the master catalog. History in vouchers will remain but item references will be detached.`)) {
      store.deleteStockItem(id);
    }
  };

  if (selectedStockItem) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedStockId(null)} className="p-3 hover:bg-white rounded-2xl text-slate-500 transition-all border border-transparent hover:border-slate-200 no-print">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900">{selectedStockItem.name} Ledger</h2>
            <p className="text-slate-500 font-medium">SKU: <span className="font-mono font-bold text-blue-600 uppercase tracking-tighter">{selectedStockItem.sku}</span> • Transactional History</p>
          </div>
          <div className="flex gap-3 no-print">
            <button onClick={handleExportHistoryCSV} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all">
              <Download size={16} /> CSV
            </button>
            <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
              <Printer size={16} /> Print Statement
            </button>
          </div>
        </div>

        <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
          <h1 className="text-3xl font-black uppercase tracking-tight">{store.company.name}</h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Stock Ledger: {selectedStockItem.name}</p>
          <p className="text-xs font-mono font-bold mt-1 text-slate-400">SKU: {selectedStockItem.sku} • HSN: {selectedStockItem.hsn} • FY: {store.company.financialYear}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity"><Boxes size={80} /></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Current Inventory</p>
             <p className="text-3xl font-black text-slate-900 relative z-10">{selectedStockItem.currentStock} <span className="text-xs font-bold text-slate-400 uppercase">{selectedStockItem.unit}</span></p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valuation (at Cost)</p>
             <p className="text-3xl font-black text-blue-600 tracking-tighter">₹{(selectedStockItem.currentStock * selectedStockItem.purchasePrice).toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Cost</p>
             <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{selectedStockItem.purchasePrice.toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Configuration</p>
             <p className="text-3xl font-black text-slate-400 tracking-tighter">GST {selectedStockItem.gstRate}%</p>
           </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg"><History size={18} /></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Movement History & Audit Trail</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5 border-b border-slate-100">Date</th>
                  <th className="px-6 py-5 border-b border-slate-100">Voucher Reference</th>
                  <th className="px-6 py-5 border-b border-slate-100">Transaction Type</th>
                  <th className="px-6 py-5 border-b border-slate-100 text-right">Qty Change</th>
                  <th className="px-8 py-5 border-b border-slate-100 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{row.date}</td>
                    <td className="px-6 py-5">
                      {row.isOpening ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-blue-600 uppercase tracking-tighter">{row.number}</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                          row.isOpening ? 'bg-slate-100 text-slate-500' : 
                          row.change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {row.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-mono font-bold">
                      {row.isOpening ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={row.change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {row.change > 0 ? `+${row.change}` : row.change} {selectedStockItem.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right font-mono font-black text-slate-900">
                      {row.balance} {selectedStockItem.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Intelligence</h2>
          <p className="text-slate-500 font-medium">Global stock valuation and SKU movement control</p>
        </div>
        <div className="flex gap-3">
           <button onClick={triggerPrint} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm">
            <Printer size={16} /> Print Status
          </button>
           <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm">
            <Download size={16} /> Export Master
          </button>
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-bold">
            <Plus size={18} /> Add Stock Item
          </button>
        </div>
      </div>

      <div className="print-only mb-10 pb-8 border-b-2 border-slate-900">
        <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tight">{store.company.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Inventory Valuation & SKU Summary Report</p>
        <p className="text-xs font-mono font-bold mt-1 text-slate-400 uppercase tracking-tighter">Reporting Period: {store.company.financialYear}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5 hover:border-blue-200 transition-colors group">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] no-print group-hover:bg-blue-600 group-hover:text-white transition-all duration-300"><Layers size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Catalog Size</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{metrics.totalItems} SKUs</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5 hover:border-emerald-200 transition-colors group">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] no-print group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300"><TrendingUp size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Book Value</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{metrics.totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex items-center gap-5 hover:border-rose-200 transition-colors group">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-[1.5rem] no-print group-hover:bg-rose-600 group-hover:text-white transition-all duration-300"><AlertCircle size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Low Stock Alerts</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{metrics.lowStockCount} Items</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 flex gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filter inventory by name, SKU ID, or HSN identifier..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print pb-20">
        {filteredItems.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
             <Package size={64} className="mx-auto text-slate-200 mb-6" />
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No matching inventory found</p>
          </div>
        )}
        {filteredItems.map((item: StockItem) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedStockId(item.id)}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group flex flex-col relative overflow-hidden cursor-pointer active:scale-95 duration-300"
          >
            <div className="flex justify-between items-start mb-10">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                <Package size={28} />
              </div>
              <div className="flex flex-col items-end gap-2">
                 <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm ${item.currentStock < 10 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {item.currentStock < 10 ? 'Reorder ASAP' : 'Stock OK'}
                </span>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === item.id ? null : item.id);
                    }}
                    className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-800"
                  >
                    <MoreVertical size={20} />
                  </button>
                  {activeMenuId === item.id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedStockId(item.id); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Eye size={18} /> View History
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); alert("Edit SKU coming soon!"); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Settings2 size={18} /> Adjust Master
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id, item.name); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} /> Delete SKU
                      </button>
                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.sku); alert("SKU ID Copied"); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all"
                      >
                        <Copy size={16} /> Copy SKU ID
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight tracking-tight">{item.name}</h3>
            <p className="text-[10px] text-slate-400 font-mono mb-10 uppercase tracking-[0.2em] font-black">{item.sku} • {item.unit}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100/50 shadow-inner">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity On Hand</p>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">{item.currentStock}</p>
              </div>
              
              <div className="bg-blue-50/30 p-5 rounded-3xl border border-blue-100/30 shadow-inner">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Asset Value</p>
                <p className="text-2xl font-black text-blue-600 font-mono tracking-tighter">₹{(item.currentStock * item.purchasePrice).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Rate</span>
                <span className="text-sm font-black text-slate-900 font-mono">₹{item.salePrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">
                View Ledger <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Package size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Register New Stock Master</h3>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Inventory Cataloging Hub</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-3 hover:bg-white hover:shadow-xl rounded-2xl transition-all text-slate-400 hover:text-rose-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateStockItem} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Full SKU Description</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Dell UltraSharp 27 Monitor - U2723QE"
                    className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-slate-800 placeholder:text-slate-300"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">SKU Unique ID</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. DUL-27-4K-2024"
                    className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-black text-blue-600 placeholder:text-slate-300 uppercase"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">HSN Classification</label>
                  <input 
                    type="text"
                    placeholder="8-digit Tax Category"
                    className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-black placeholder:text-slate-300"
                    value={formData.hsn}
                    onChange={e => setFormData({ ...formData, hsn: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Inventory Unit</label>
                  <div className="relative">
                    <select 
                      className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black appearance-none"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="Nos">Numbers (Nos)</option>
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Box">Bulk Boxes</option>
                      <option value="Kgs">Kilograms</option>
                      <option value="Mtr">Meters</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">GST Bracket (%)</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black"
                    value={formData.gstRate}
                    onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                  />
                </div>

                <div className="col-span-2 grid grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Cost Price</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black shadow-sm"
                      value={formData.purchasePrice || ''}
                      onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Sale Price</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black shadow-sm"
                      value={formData.salePrice || ''}
                      onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Opening Qty</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black shadow-sm"
                      value={formData.openingStock || ''}
                      onChange={e => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 px-8 rounded-[1.5rem] border border-slate-200 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-5 px-8 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all group"
                >
                  <div className="flex items-center justify-center gap-3">
                    Confirm SKU Registration <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                  </div>
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
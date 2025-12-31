
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowRight, AlertTriangle, X, Hash, ShoppingBag, Tag, Layers, TrendingUp, AlertCircle, Edit2, Download, Upload, FileSpreadsheet, History, ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, ShoppingCart, MoreVertical, Eye, Copy, Settings2, Trash2, Boxes, ChevronDown, ListFilter, ClipboardCheck, Scale, Info } from 'lucide-react';
import { StockItem, Voucher, InventoryMovement } from '../types';
import { downloadCSV, triggerPrint } from '../utils/exportUtils';

const StockList: React.FC<{ store: any }> = ({ store }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'ledger' | 'tax'>('overview');
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

  const historyData = useMemo(() => {
    if (!selectedStockItem) return { transactions: [], summary: { in: 0, out: 0 } };
    
    const relevantVouchers = [...store.vouchers]
      .filter((v: Voucher) => v.inventory?.some(m => m.itemId === selectedStockItem.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = selectedStockItem.openingStock;
    let totalIn = 0;
    let totalOut = 0;

    const history = [{
      id: 'opening-bal',
      date: 'Opening',
      number: '-',
      type: 'Initial Balance',
      particulars: 'Book Opening Status',
      change: 0,
      balance: runningBalance,
      isOpening: true
    }];

    relevantVouchers.forEach((v: Voucher) => {
      const movement = v.inventory?.find((m: InventoryMovement) => m.itemId === selectedStockItem.id);
      if (movement) {
        const change = movement.type === 'In' ? movement.quantity : -movement.quantity;
        if (movement.type === 'In') totalIn += movement.quantity;
        else totalOut += movement.quantity;
        
        runningBalance += change;
        history.push({
          id: v.id,
          date: v.date,
          number: v.number,
          type: v.type === 'Journal' ? 'Adjustment' : v.type,
          particulars: v.narration || 'General Movement',
          change: change,
          balance: runningBalance,
          isOpening: false
        });
      }
    });

    return { 
      transactions: history.reverse(),
      summary: { in: totalIn, out: totalOut }
    };
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
    downloadCSV(historyData.transactions, `Stock_Audit_${selectedStockItem.sku}`);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete SKU: ${name}?`)) {
      store.deleteStockItem(id);
      setSelectedStockId(null);
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
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedStockItem.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">{selectedStockItem.sku}</span>
              <span className="text-slate-400 text-xs font-medium">•</span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">HSN: {selectedStockItem.hsn || 'N/A'}</span>
            </div>
          </div>
          <div className="flex gap-3 no-print">
            <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
              <button 
                onClick={() => setDetailTab('overview')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setDetailTab('ledger')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'ledger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Ledger
              </button>
              <button 
                onClick={() => setDetailTab('tax')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${detailTab === 'tax' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Tax Details
              </button>
            </div>
            <button onClick={handleExportHistoryCSV} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <Download size={16} /> Export
            </button>
            <button onClick={triggerPrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {detailTab === 'overview' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatDisplay label="Current Qty" value={`${selectedStockItem.currentStock} ${selectedStockItem.unit}`} icon={<Package className="text-blue-500" />} />
              <StatDisplay label="Valuation" value={`₹${(selectedStockItem.currentStock * selectedStockItem.purchasePrice).toLocaleString()}`} icon={<TrendingUp className="text-emerald-500" />} />
              <StatDisplay label="Standard Cost" value={`₹${selectedStockItem.purchasePrice.toLocaleString()}`} icon={<ShoppingCart className="text-slate-400" />} />
              <StatDisplay label="Retail Price" value={`₹${selectedStockItem.salePrice.toLocaleString()}`} icon={<Tag className="text-amber-500" />} />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4">Product Master Details</h3>
                 <DetailRow label="Item Nomenclature" value={selectedStockItem.name} />
                 <DetailRow label="Stock Keeping Unit (SKU)" value={selectedStockItem.sku} />
                 <DetailRow label="Harmonized System Nomenclature (HSN)" value={selectedStockItem.hsn} />
                 <DetailRow label="Unit of Measurement" value={selectedStockItem.unit} />
                 <DetailRow label="GST Taxation Bracket" value={`${selectedStockItem.gstRate}%`} />
              </div>
              <div className="space-y-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4">Financial Status</h3>
                 <DetailRow label="Opening Stock Level" value={`${selectedStockItem.openingStock} ${selectedStockItem.unit}`} />
                 <DetailRow label="Inward Since Opening" value={`${historyData.summary.in} ${selectedStockItem.unit}`} />
                 <DetailRow label="Outward Since Opening" value={`${historyData.summary.out} ${selectedStockItem.unit}`} />
                 <DetailRow label="Current Inventory Position" value={`${selectedStockItem.currentStock} ${selectedStockItem.unit}`} highlight />
              </div>
            </div>
          </div>
        ) : detailTab === 'ledger' ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Inward (+)</p>
                    <p className="text-2xl font-black text-emerald-600">+{historyData.summary.in} <span className="text-xs">{selectedStockItem.unit}</span></p>
                  </div>
                  <ArrowDownRight size={24} className="text-emerald-200" />
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outward (-)</p>
                    <p className="text-2xl font-black text-rose-600">-{historyData.summary.out} <span className="text-xs">{selectedStockItem.unit}</span></p>
                  </div>
                  <ArrowUpRight size={24} className="text-rose-200" />
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-slate-200">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Book Balance</p>
                    <p className="text-2xl font-black text-blue-400">{selectedStockItem.currentStock} <span className="text-xs">{selectedStockItem.unit}</span></p>
                  </div>
                  <ClipboardCheck size={24} className="text-blue-500/50" />
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                  <ListFilter size={18} className="text-slate-400" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Complete Movement Ledger</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-100">
                        <th className="px-10 py-5">Date</th>
                        <th className="px-6 py-5">Reference</th>
                        <th className="px-6 py-5">Doc Type</th>
                        <th className="px-6 py-5">Particulars / Narration</th>
                        <th className="px-6 py-5 text-right">Movement</th>
                        <th className="px-10 py-5 text-right">Book Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyData.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-5 text-sm font-bold text-slate-800">{tx.date}</td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-blue-600 uppercase tracking-tighter">{tx.number}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${
                               tx.isOpening ? 'bg-slate-100 text-slate-500' : 
                               tx.change > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                             }`}>
                                {tx.type}
                             </span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium text-slate-500 max-w-xs truncate" title={tx.particulars}>{tx.particulars}</p>
                          </td>
                          <td className={`px-6 py-5 text-right font-mono font-black ${tx.change > 0 ? 'text-emerald-600' : tx.change < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                            {tx.isOpening ? '—' : (tx.change > 0 ? `+${tx.change}` : tx.change)}
                          </td>
                          <td className="px-10 py-5 text-right font-mono font-black text-slate-900">
                            {tx.balance} <span className="text-[10px] text-slate-400 font-bold">{selectedStockItem.unit}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150"><Scale size={160} /></div>
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-4">GST Compliance Markers</h3>
                    <div className="flex justify-between items-center">
                       <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">HSN / SAC Code</span>
                       <span className="text-xl font-black text-slate-900 font-mono tracking-tighter">{selectedStockItem.hsn || 'NOT CONFIGURED'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Applicable GST Rate</span>
                       <span className="text-xl font-black text-blue-600 font-mono">{selectedStockItem.gstRate}%</span>
                    </div>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3 mt-8">
                       <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                       <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">The breakdown below represents the standard tax impact based on the active GST rate of {selectedStockItem.gstRate}%.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     <TaxImpactCard 
                        title="Purchase Price Impact" 
                        basePrice={selectedStockItem.purchasePrice} 
                        gstRate={selectedStockItem.gstRate} 
                        type="purchase"
                     />
                     <TaxImpactCard 
                        title="Sales Price Impact" 
                        basePrice={selectedStockItem.salePrice} 
                        gstRate={selectedStockItem.gstRate} 
                        type="sale"
                     />
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Intelligence</h2>
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
        {filteredItems.map((item: StockItem) => (
          <div 
            key={item.id} 
            onClick={() => { setSelectedStockId(item.id); setDetailTab('overview'); }}
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
                        onClick={(e) => { e.stopPropagation(); setSelectedStockId(item.id); setDetailTab('ledger'); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                        <Eye size={18} /> View Ledger
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id, item.name); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} /> Delete SKU
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
                Open Audit <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white hover:shadow-xl rounded-2xl transition-all text-slate-400 hover:text-rose-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCreateStockItem} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Full SKU Description</label>
                  <input type="text" required placeholder="e.g. Dell UltraSharp 27 Monitor" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-slate-800" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">SKU Unique ID</label>
                  <input type="text" required placeholder="SKU-001" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-black text-blue-600 uppercase" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">HSN Classification</label>
                  <input type="text" placeholder="8-digit HSN" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono font-black" value={formData.hsn} onChange={e => setFormData({ ...formData, hsn: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Unit</label>
                  <input type="text" placeholder="Nos" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">GST (%)</label>
                  <input type="number" className="w-full px-6 py-4.5 rounded-[1.5rem] bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black" value={formData.gstRate} onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })} />
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Price</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black" value={formData.purchasePrice || ''} onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sale Price</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black" value={formData.salePrice || ''} onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Qty</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black" value={formData.openingStock || ''} onChange={e => setFormData({ ...formData, openingStock: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 px-8 rounded-[1.5rem] border border-slate-200 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Discard</button>
                <button type="submit" className="flex-1 py-5 px-8 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all group">Register SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TaxImpactCard: React.FC<{ title: string, basePrice: number, gstRate: number, type: 'purchase' | 'sale' }> = ({ title, basePrice, gstRate, type }) => {
  const taxAmount = Number(((basePrice * gstRate) / 100).toFixed(2));
  const totalAmount = Number((basePrice + taxAmount).toFixed(2));
  const cgstSgst = Number((taxAmount / 2).toFixed(2));

  return (
    <div className={`p-8 rounded-[2rem] border-2 flex flex-col shadow-sm ${type === 'purchase' ? 'bg-slate-50 border-slate-100' : 'bg-blue-50/20 border-blue-100/50'}`}>
       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
         {type === 'purchase' ? <ShoppingCart size={14} className="text-slate-400" /> : <Tag size={14} className="text-blue-400" />}
         {title}
       </h4>
       <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
             <span>Base Price</span>
             <span className="text-slate-900 font-mono">₹{basePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase border-t border-dashed pt-4">
             <span>CGST ({(gstRate / 2).toFixed(1)}%)</span>
             <span className="text-slate-700 font-mono">₹{cgstSgst.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
             <span>SGST ({(gstRate / 2).toFixed(1)}%)</span>
             <span className="text-slate-700 font-mono">₹{cgstSgst.toLocaleString()}</span>
          </div>
          <div className="h-px bg-slate-200 mt-2"></div>
          <div className="flex justify-between items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Impact</span>
             <span className={`text-2xl font-black tracking-tighter font-mono ${type === 'purchase' ? 'text-slate-900' : 'text-blue-600'}`}>₹{totalAmount.toLocaleString()}</span>
          </div>
       </div>
    </div>
  );
};

const StatDisplay: React.FC<{ label: string, value: string, icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
  </div>
);

const DetailRow: React.FC<{ label: string, value: string | number, highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center group">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-black ${highlight ? 'text-blue-600 text-lg' : 'text-slate-800'}`}>{value}</span>
  </div>
);

export default StockList;

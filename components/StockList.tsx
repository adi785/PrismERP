
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, Search, Plus, Filter, ArrowRight, AlertTriangle, X, Hash, ShoppingBag, Tag, Layers, TrendingUp, AlertCircle, Edit2, Check, X as CancelIcon } from 'lucide-react';
import { StockItem } from '../types';

const StockList: React.FC<{ store: any }> = ({ store }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string, field: 'purchasePrice' | 'salePrice' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
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

  const handleCreateStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      alert("Name and SKU are required.");
      return;
    }
    await store.addStockItem(formData);
    setFormData({
      name: '',
      sku: '',
      hsn: '',
      unit: 'Nos',
      openingStock: 0,
      purchasePrice: 0,
      salePrice: 0,
      gstRate: 18
    });
    setIsModalOpen(false);
  };

  const startEditing = (id: string, field: 'purchasePrice' | 'salePrice', initialValue: number) => {
    setEditingCell({ id, field });
    setEditValue(initialValue.toString());
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue)) {
      cancelEditing();
      return;
    }

    await store.updateStockItem(editingCell.id, { [editingCell.field]: numericValue });
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEditing();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
          <p className="text-slate-500">Managing global stock levels and product valuation</p>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-bold"
          >
            <Plus size={18} /> New Stock Item
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total SKUs</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.totalItems}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Valuation</p>
            <p className="text-2xl font-bold text-slate-800">₹{metrics.totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search SKU, Name, or HSN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-medium hover:bg-slate-50">
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: StockItem) => (
          <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-300 transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Package size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                 <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${item.currentStock < 10 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {item.currentStock < 10 ? 'Low Stock' : 'In Stock'}
                </span>
                <span className="text-[10px] font-bold text-slate-400">GST {item.gstRate}%</span>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">{item.name}</h3>
            <p className="text-xs text-slate-400 font-mono mb-6 uppercase tracking-wider">{item.sku} • HSN: {item.hsn}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Stock Level</p>
                <p className="text-lg font-bold text-slate-800">{item.currentStock} <span className="text-xs font-normal text-slate-500">{item.unit}</span></p>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative group/price">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                  Sale Price
                  {!(editingCell?.id === item.id && editingCell?.field === 'salePrice') && (
                    <button 
                      onClick={() => startEditing(item.id, 'salePrice', item.salePrice)}
                      className="opacity-0 group-hover/price:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 rounded text-blue-500"
                    >
                      <Edit2 size={10} />
                    </button>
                  )}
                </p>
                {editingCell?.id === item.id && editingCell?.field === 'salePrice' ? (
                  <div className="flex items-center gap-1">
                    <input 
                      autoFocus
                      type="number"
                      className="w-full bg-white border border-blue-500 rounded px-1.5 py-0.5 text-sm font-bold font-mono outline-none"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEdit}
                    />
                  </div>
                ) : (
                  <p 
                    className="text-lg font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => startEditing(item.id, 'salePrice', item.salePrice)}
                  >
                    ₹{item.salePrice.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1 group/cost">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {editingCell?.id === item.id && editingCell?.field === 'purchasePrice' ? (
                  <input 
                    autoFocus
                    type="number"
                    className="w-24 bg-white border border-blue-500 rounded px-1 py-0.5 text-[10px] font-bold font-mono outline-none"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveEdit}
                  />
                ) : (
                  <span 
                    className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                    onClick={() => startEditing(item.id, 'purchasePrice', item.purchasePrice)}
                  >
                    Cost: ₹{item.purchasePrice.toLocaleString()}
                    <Edit2 size={10} className="opacity-0 group-hover/cost:opacity-100" />
                  </span>
                )}
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 transition-all">
                View Ledger <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 mb-1">Valuation Note</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            The system currently uses <strong>Weighted Average Cost</strong> for inventory valuation. Inline edits to <strong>Purchase Price</strong> will only affect future transactions and valuation reports. Past stock movements remain locked to their historical acquisition costs.
          </p>
        </div>
      </div>

      {/* New Stock Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Package size={20} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Create New Stock Item</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white hover:shadow rounded-xl transition-all text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateStockItem} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Apple iPad Air M2"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SKU / Part No.</label>
                    <div className="relative">
                       <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                        type="text"
                        required
                        placeholder="IPAD-M2-128"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp text-sm"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HSN Code</label>
                    <div className="relative">
                       <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                        type="text"
                        placeholder="8471"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp text-sm"
                        value={formData.hsn}
                        onChange={e => setFormData({ ...formData, hsn: e.target.value })}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unit of Measure</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="Nos">Numbers (Nos)</option>
                      <option value="Kgs">Kilograms (Kgs)</option>
                      <option value="Mtrs">Meters (Mtrs)</option>
                      <option value="Box">Boxes (Box)</option>
                      <option value="Pcs">Pieces (Pcs)</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GST Rate (%)</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                      value={formData.gstRate}
                      onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    >
                      <option value="0">Exempt (0%)</option>
                      <option value="5">Standard (5%)</option>
                      <option value="12">Reduced (12%)</option>
                      <option value="18">Standard (18%)</option>
                      <option value="28">Luxury (28%)</option>
                    </select>
                 </div>

                 <div className="col-span-full border-t border-slate-100 pt-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <ShoppingBag size={16} className="text-blue-500" />
                       Pricing & Opening Stock
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Purchase Price</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp"
                            value={formData.purchasePrice || ''}
                            onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sale Price</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp"
                            value={formData.salePrice || ''}
                            onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Opening Stock</label>
                          <input 
                            type="number"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono-erp"
                            value={formData.openingStock || ''}
                            onChange={e => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-8 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/25 transition-all"
                >
                  Save Stock Item
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


import React, { useState, useMemo } from 'react';
import { Save, Plus, Trash2, ArrowLeft, Package, Calculator, CheckCircle2, SlidersHorizontal, AlertTriangle, History, Info, AlertCircle } from 'lucide-react';
import { StockItem } from '../types';

const ADJUSTMENT_REASONS = [
  'Physical Count Discrepancy',
  'Damage / Breakage',
  'Loss / Theft',
  'Return to Vendor (Non-Billable)',
  'Samples / Internal Consumption',
  'Correction of Entry Error'
];

const StockAdjustment: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [items, setItems] = useState<{ id: string, itemId: string, qty: number, type: 'Increase' | 'Decrease', reason: string, narration: string }[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const handleAddItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      itemId: '', 
      qty: 0, 
      type: 'Decrease', 
      reason: 'Damage / Breakage',
      narration: ''
    }]);
  };

  const updateItem = (id: string, updates: any) => {
    setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const hasDeficit = useMemo(() => {
    return items.some(i => {
      const stock = store.stockItems.find((s: StockItem) => s.id === i.itemId);
      if (!stock) return false;
      return i.type === 'Decrease' && i.qty > stock.currentStock;
    });
  }, [items, store.stockItems]);

  const handleSave = async () => {
    if (items.length === 0 || items.some(i => !i.itemId || i.qty <= 0)) {
      alert("Please ensure all lines have a selected item and valid quantity.");
      return;
    }

    if (hasDeficit) {
      alert("Negative Inventory Violation: You cannot decrease stock below 0.");
      return;
    }

    const inventory = items.map(i => ({
      itemId: i.itemId,
      quantity: i.qty,
      rate: store.stockItems.find((s: StockItem) => s.id === i.itemId)?.purchasePrice || 0,
      amount: i.qty * (store.stockItems.find((s: StockItem) => s.id === i.itemId)?.purchasePrice || 0),
      type: (i.type === 'Increase' ? 'In' : 'Out') as 'In' | 'Out'
    }));

    const totalImpactValue = inventory.reduce((sum, mov) => sum + mov.amount, 0);

    try {
      await store.addVoucher({
        number: `ADJ-${Date.now().toString().slice(-6)}`,
        date,
        type: 'Journal',
        entries: [
          { ledgerId: 'l-purchase', debit: totalImpactValue, credit: 0 },
          { ledgerId: 'l-cash', debit: 0, credit: totalImpactValue }
        ],
        inventory,
        narration: `Inventory Adjustment: ${items.map(i => `${i.type} ${i.qty} units due to ${i.reason}`).join('; ')}`,
        totalAmount: totalImpactValue,
        gstTotal: 0
      });
      setIsSaved(true);
    } catch (err: any) {
      alert(err.message || "Failed to post adjustment.");
    }
  };

  if (isSaved) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 px-4 text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
          <CheckCircle2 size={56} className="text-blue-600" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Adjustment Applied</h2>
        <p className="text-slate-500 mb-10 font-medium max-w-md text-center">
          The physical stock levels have been updated and an audit entry was posted to the daybook.
        </p>
        <button 
          onClick={onComplete}
          className="px-10 py-4 bg-slate-900 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
        >
          <ArrowLeft size={20} /> Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm">
            <SlidersHorizontal size={32} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Stock Adjustment</h2>
            <p className="text-slate-500 font-medium text-xs md:text-sm">Reconcile physical vs system inventory levels</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Package size={20} /></div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Adjustment Lines</h3>
              </div>
              <button 
                onClick={handleAddItem}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
              >
                <Plus size={16} /> Add SKU
              </button>
            </div>

            <div className="space-y-6">
              {items.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <SlidersHorizontal size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No adjustments added</p>
                </div>
              ) : (
                items.map(item => {
                  const stock = store.stockItems.find((s: StockItem) => s.id === item.itemId);
                  const isInvalid = stock && item.type === 'Decrease' && item.qty > stock.currentStock;
                  return (
                    <div key={item.id} className={`p-6 rounded-[2rem] border transition-all ${isInvalid ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-slate-100'} space-y-6`}>
                      <div className="grid grid-cols-2 md:grid-cols-12 gap-4 items-end">
                        <div className="col-span-2 md:col-span-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">SKU / Item</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            value={item.itemId}
                            onChange={e => updateItem(item.id, { itemId: e.target.value })}
                          >
                            <option value="">Select SKU...</option>
                            {store.stockItems.map((s: StockItem) => (
                              <option key={s.id} value={s.id}>{s.name} (Current: {s.currentStock} {s.unit})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 md:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Action</label>
                          <select 
                            className={`w-full px-4 py-3 rounded-xl border font-black text-sm outline-none transition-colors ${item.type === 'Increase' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
                            value={item.type}
                            onChange={e => updateItem(item.id, { type: e.target.value as any })}
                          >
                            <option value="Increase">Add (+)</option>
                            <option value="Decrease">Subtract (-)</option>
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Qty</label>
                          <input 
                            type="number"
                            className={`w-full px-4 py-3 rounded-xl bg-white border font-bold text-sm text-center outline-none ${isInvalid ? 'border-rose-500' : 'border-slate-100'}`}
                            value={item.qty || ''}
                            onChange={e => updateItem(item.id, { qty: Number(e.target.value) })}
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Reason</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-100 font-bold text-sm outline-none appearance-none"
                            value={item.reason}
                            onChange={e => updateItem(item.id, { reason: e.target.value })}
                          >
                            {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 md:col-span-1 flex justify-end">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      {stock && (
                        <div className={`flex items-center gap-6 px-4 py-3 rounded-xl border border-dashed ${isInvalid ? 'bg-rose-100/50 border-rose-300' : 'bg-white/50 border-slate-200'}`}>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Projected Level</span>
                            <span className={`text-sm font-black ${isInvalid ? 'text-rose-600' : 'text-slate-800'}`}>
                              {item.type === 'Increase' ? stock.currentStock + item.qty : stock.currentStock - item.qty} {stock.unit}
                            </span>
                          </div>
                          {isInvalid && (
                            <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-tighter">
                              <AlertCircle size={14} /> Negative Value Forbidden
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <button 
            onClick={handleSave}
            disabled={items.length === 0 || hasDeficit}
            className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-600/30 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasDeficit ? 'Deficit Detected' : <><Save size={28} /> Save Adjustment</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;

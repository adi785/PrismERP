
import React, { useState, useRef } from 'react';
// Fix: Added missing Package and BookOpen imports from lucide-react to resolve 'Cannot find name' errors.
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Info, X, Package, BookOpen } from 'lucide-react';
import { parseCSV } from '../utils/exportUtils';
import { AccountType } from '../types';

const ImportCenter: React.FC<{ store: any, onComplete: () => void }> = ({ store, onComplete }) => {
  const [importType, setImportType] = useState<'ledgers' | 'stock'>('ledgers');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    try {
      const data = await parseCSV(selectedFile);
      setPreview(data.slice(0, 5));
    } catch (err) {
      setStatus({ type: 'error', msg: "Failed to parse CSV file." });
    }
  };

  const executeImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const allData = await parseCSV(file);
      let count = 0;

      for (const row of allData) {
        if (importType === 'ledgers') {
          if (!row.Name || !row.Group) continue;
          await store.addLedger({
            name: row.Name,
            group: row.Group,
            type: (row.Type as AccountType) || 'Asset',
            openingBalance: Number(row.OpeningBalance) || 0
          });
        } else {
          if (!row.Name || !row.SKU) continue;
          await store.addStockItem({
            name: row.Name,
            sku: row.SKU,
            hsn: row.HSN || '',
            unit: row.Unit || 'Nos',
            openingStock: Number(row.OpeningStock) || 0,
            purchasePrice: Number(row.PurchasePrice) || 0,
            salePrice: Number(row.SalePrice) || 0,
            gstRate: Number(row.GST) || 18
          });
        }
        count++;
      }
      setStatus({ type: 'success', msg: `Successfully imported ${count} ${importType}.` });
      setPreview([]);
      setFile(null);
    } catch (err) {
      setStatus({ type: 'error', msg: "Import failed due to data inconsistency." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Data Migration Center</h2>
        <p className="text-sm text-slate-500 font-medium">Bulk import master records into your ERP database</p>
      </div>

      {status && (
        <div className={`p-6 rounded-[2rem] border flex items-center justify-between ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          <div className="flex items-center gap-4">
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="font-black text-sm">{status.msg}</p>
          </div>
          <button onClick={() => setStatus(null)}><X size={20} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        <ImportOption 
          active={importType === 'ledgers'} 
          onClick={() => { setImportType('ledgers'); setPreview([]); setFile(null); }}
          label="Ledgers / Chart of Accounts"
          desc="Import your vendor, customer, and internal cash accounts."
          icon={<BookOpen className="text-blue-500" />}
        />
        <ImportOption 
          active={importType === 'stock'} 
          onClick={() => { setImportType('stock'); setPreview([]); setFile(null); }}
          label="Inventory / Stock Items"
          desc="Import your SKUs, pricing, and initial opening quantities."
          icon={<Package className="text-emerald-500" />}
        />
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 p-12 text-center shadow-sm">
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
        {!file ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
              <UploadCloud size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Select Source CSV File</h3>
              <p className="text-slate-500 text-sm mt-1">Download the template to ensure column mapping is correct.</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4">
              <FileSpreadsheet size={32} className="text-blue-500" />
              <div className="text-left">
                <p className="text-sm font-black text-slate-900">{file.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • CSV Document</p>
              </div>
              <button onClick={() => {setFile(null); setPreview([]);}} className="ml-4 p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={20}/></button>
            </div>

            {preview.length > 0 && (
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                <div className="p-4 border-b border-slate-200 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Preview (First 5 rows)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/50 border-b border-slate-100">
                        {Object.keys(preview[0]).map(k => <th key={k} className="px-4 py-3 font-black text-slate-400">{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100/50">
                          {Object.values(r).map((v: any, j) => <td key={j} className="px-4 py-2 font-medium text-slate-600 truncate max-w-[150px]">{String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button 
              onClick={executeImport}
              disabled={isProcessing}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all hover:bg-blue-700"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24}/> Finalize Import</>}
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-[2rem] p-8 flex gap-6">
        <Info className="text-blue-500 shrink-0" size={24} />
        <div className="space-y-2">
          <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Schema Requirements</h4>
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            For <strong>Ledgers</strong>: Ensure columns Name, Group, Type, OpeningBalance exist.<br/>
            For <strong>Stock</strong>: Ensure columns Name, SKU, HSN, Unit, OpeningStock, PurchasePrice, SalePrice exist.
          </p>
        </div>
      </div>
    </div>
  );
};

const ImportOption: React.FC<{ active: boolean, onClick: () => void, label: string, desc: string, icon: React.ReactNode }> = ({ active, onClick, label, desc, icon }) => (
  <button 
    onClick={onClick}
    className={`p-8 rounded-[2.5rem] border text-left transition-all ${active ? 'bg-white border-blue-600 shadow-xl ring-4 ring-blue-50' : 'bg-white border-slate-100 opacity-60 hover:opacity-100'}`}
  >
    <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-6">{icon}</div>
    <h3 className="text-lg font-black text-slate-900 mb-2">{label}</h3>
    <p className="text-xs font-medium text-slate-500 leading-relaxed">{desc}</p>
  </button>
);

export default ImportCenter;

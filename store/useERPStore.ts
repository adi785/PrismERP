
import { useState, useCallback, useEffect } from 'react';
import { Ledger, StockItem, Voucher, Company, User, UserRole, TrackingDetail } from '../types';
import { api } from '../services/api';

export const useERPStore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [trackingData, setTrackingData] = useState<TrackingDetail[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('prism_erp_theme') as 'light' | 'dark') || 'light');
  const [company, setCompany] = useState<Company | null>(() => {
    try {
      const cached = localStorage.getItem('prism_erp_active_company_cache');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [stats, setStats] = useState({ totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('prism_erp_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const refreshData = useCallback(async (providedUser?: User | null) => {
    setIsSyncing(true);
    try {
      const currentUser = providedUser !== undefined ? providedUser : await api.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const [comps, activeCompany] = await Promise.all([api.getCompanies(currentUser.id), api.getSelectedCompany()]);
        setCompanies(comps);
        setCompany(activeCompany);
        if (activeCompany) {
          localStorage.setItem('prism_erp_active_company_cache', JSON.stringify(activeCompany));
          const [l, s, v, st] = await Promise.all([api.getLedgers(), api.getStockItems(), api.getVouchers(), api.getStats()]);
          setLedgers(l);
          setStockItems(s);
          setVouchers(v);
          setStats(st);
          const t = await api.getTrackingForItems(s.map(i => i.id));
          setTrackingData(t);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); setIsSyncing(false); }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const recordVoucher = useCallback(async (voucherData: Omit<Voucher, 'id'>) => {
    // Inward tracking logic: ensure records exist for batches/serials
    if (voucherData.type === 'Purchase' && voucherData.inventory) {
      for (let i = 0; i < voucherData.inventory.length; i++) {
        const mov = voucherData.inventory[i];
        const item = stockItems.find(s => s.id === mov.itemId);
        // This is a placeholder for actual batch/serial object passed from the UI
        // In reality, the UI will pass the identifier in a temporary field
      }
    }

    const saved = await api.recordVoucher(voucherData);
    setVouchers(prev => [saved, ...prev]);
    const [s, l, st] = await Promise.all([api.getStockItems(), api.getLedgers(), api.getStats()]);
    setStockItems(s);
    setLedgers(l);
    setStats(st);
    const t = await api.getTrackingForItems(s.map(i => i.id));
    setTrackingData(t);
  }, [stockItems]);

  return {
    user, companies, company, ledgers, stockItems, vouchers, trackingData, stats, loading, isSyncing, theme, toggleTheme,
    login: async (e: string, p: string) => { const u = await api.login(e, p); setUser(u); return refreshData(u); },
    signup: async (e: string, p: string, n: string, r: UserRole) => { const u = await api.signup(e, p, n, r); setUser(u); return refreshData(u); },
    logout: api.logout,
    createCompany: async (n: string, g: string, f: string, a: string) => { if (!user) return; const c = await api.createCompany({ name: n, gstin: g, financialYear: f, address: a, ownerId: user.id }); await api.selectCompany(c.id); setCompany(c); return refreshData(user); },
    selectCompany: async (id: string) => { await api.selectCompany(id); return refreshData(user); },
    addLedger: async (l: any) => { const s = await api.addLedger(l); setLedgers(prev => [...prev, s]); },
    addStockItem: async (i: any) => { const s = await api.addStockItem(i); setStockItems(prev => [...prev, s]); },
    updateStockItem: async (id: string, u: any) => { const s = await api.updateStockItem(id, u); setStockItems(prev => prev.map(item => item.id === id ? s : item)); },
    deleteStockItem: async (id: string) => { await api.deleteStockItem(id); setStockItems(prev => prev.filter(item => item.id !== id)); },
    addVoucher: recordVoucher,
    ensureTrackingRecord: api.ensureTrackingRecord,
    refreshData
  };
};


import { useState, useCallback, useEffect } from 'react';
import { Ledger, StockItem, Voucher, Company, User, UserRole } from '../types';
import { api } from '../services/api';

export const useERPStore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('prism_erp_theme') as 'light' | 'dark') || 'light';
  });
  const [company, setCompany] = useState<Company | null>(() => {
    try {
      const cached = localStorage.getItem('prism_erp_active_company_cache');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn("Failed to parse cached company data:", e);
      return null;
    }
  });
  const [stats, setStats] = useState({ totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('prism_erp_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const refreshData = useCallback(async (providedUser?: User | null) => {
    setIsSyncing(true);
    try {
      const currentUser = providedUser !== undefined ? providedUser : await api.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        try {
          const [comps, activeCompany] = await Promise.all([
            api.getCompanies(currentUser.id),
            api.getSelectedCompany()
          ]);
          
          setCompanies(comps);
          setCompany(activeCompany);

          if (activeCompany) {
            localStorage.setItem('prism_erp_active_company_cache', JSON.stringify(activeCompany));
            
            const [l, s, v, st] = await Promise.all([
              api.getLedgers(),
              api.getStockItems(),
              api.getVouchers(),
              api.getStats()
            ]);
            setLedgers(l);
            setStockItems(s);
            setVouchers(v);
            setStats(st);
          }
        } catch (dbError: any) {
          console.error("Database schema error detected:", dbError);
          if (dbError.message.includes("Database tables not found")) {
            throw dbError; 
          }
        }
      }
    } catch (error) {
      console.error("ERP Store Refresh Error:", error);
      if (error instanceof Error && error.message.includes("Database tables not found")) {
        throw error;
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshData().catch(e => {
      setLoading(false);
    });
  }, [refreshData]);

  const login = async (email: string, password: string) => {
    const loggedInUser = await api.login(email, password);
    setUser(loggedInUser);
    return refreshData(loggedInUser);
  };

  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    const newUser = await api.signup(email, password, name, role);
    setUser(newUser);
    return refreshData(newUser);
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('prism_erp_session');
    localStorage.removeItem('prism_erp_company_id');
    localStorage.removeItem('prism_erp_active_company_cache');
    localStorage.removeItem('prism_erp_force_local');
  };

  const createCompany = async (name: string, gstin: string, financialYear: string, address: string) => {
    if (!user) throw new Error("Unauthorized: User session not found.");
    const newCompany = await api.createCompany({ name, gstin, financialYear, address, ownerId: user.id });
    await api.selectCompany(newCompany.id);
    setCompany(newCompany);
    setCompanies(prev => [...prev, newCompany]);
    return refreshData(user);
  };

  const selectCompany = async (companyId: string) => {
    await api.selectCompany(companyId);
    return refreshData(user);
  };

  const addLedger = useCallback(async (newLedger: Omit<Ledger, 'id' | 'currentBalance'>) => {
    const saved = await api.addLedger(newLedger);
    setLedgers(prev => [...prev, saved]);
  }, []);

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id' | 'currentStock'>) => {
    const saved = await api.addStockItem(item);
    setStockItems(prev => [...prev, saved]);
  }, []);

  const updateStockItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    const updated = await api.updateStockItem(id, updates);
    setLedgers(await api.getLedgers()); // Update related balances
    setStockItems(prev => prev.map(item => item.id === id ? updated : item));
  }, []);

  const deleteStockItem = useCallback(async (id: string) => {
    await api.deleteStockItem(id);
    setStockItems(prev => prev.filter(item => item.id !== id));
    const st = await api.getStats();
    setStats(st);
  }, []);

  const recordVoucher = useCallback(async (voucherData: Omit<Voucher, 'id'>) => {
    if (voucherData.inventory && voucherData.inventory.length > 0) {
      const stockChanges: Record<string, number> = {};
      for (const mov of voucherData.inventory) {
        const delta = mov.type === 'In' ? mov.quantity : -mov.quantity;
        stockChanges[mov.itemId] = (stockChanges[mov.itemId] || 0) + delta;
      }

      for (const [itemId, change] of Object.entries(stockChanges)) {
        const item = stockItems.find(i => i.id === itemId);
        if (item) {
          const finalStock = item.currentStock + change;
          if (finalStock < 0) {
            throw new Error(`Inventory Deficit: Cannot record ${voucherData.type} voucher. SKU "${item.name}" would drop to ${finalStock} units.`);
          }
        }
      }
    }

    const saved = await api.recordVoucher(voucherData);
    setVouchers(prev => [saved, ...prev]);
    
    if (voucherData.inventory && voucherData.inventory.length > 0) {
      const updatedStock = await api.getStockItems();
      setStockItems(updatedStock);
    }

    const [l, st] = await Promise.all([api.getLedgers(), api.getStats()]);
    setLedgers(l);
    setStats(st);
  }, [stockItems]);

  return {
    user,
    companies,
    company,
    ledgers,
    stockItems,
    vouchers,
    stats,
    loading,
    isSyncing,
    theme,
    toggleTheme,
    login,
    signup,
    logout,
    createCompany,
    selectCompany,
    addLedger,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addVoucher: recordVoucher,
    refreshData
  };
};

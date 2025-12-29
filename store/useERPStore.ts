
import { useState, useCallback, useEffect } from 'react';
import { Ledger, StockItem, Voucher, Company, User, UserRole } from '../types';
import { api } from '../services/api';

export const useERPStore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
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

  const refreshData = useCallback(async (providedUser?: User | null) => {
    setIsSyncing(true);
    try {
      const currentUser = providedUser !== undefined ? providedUser : await api.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
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
      }
    } catch (error) {
      console.error("ERP Store Refresh Error:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
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
    localStorage.removeItem('prism_erp_active_company_cache');
    setUser(null);
    setCompany(null);
    setLedgers([]);
    setStockItems([]);
    setVouchers([]);
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
    setStockItems(prev => prev.map(item => item.id === id ? updated : item));
  }, []);

  const recordVoucher = useCallback(async (voucherData: Omit<Voucher, 'id'>) => {
    const saved = await api.recordVoucher(voucherData);
    setVouchers(prev => [saved, ...prev]);
    api.getStats().then(setStats);
    api.getLedgers().then(setLedgers);
  }, []);

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
    login,
    signup,
    logout,
    createCompany,
    selectCompany,
    addLedger,
    addStockItem,
    updateStockItem,
    addVoucher: recordVoucher,
    refreshData
  };
};

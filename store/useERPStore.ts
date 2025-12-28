
import { useState, useCallback, useEffect } from 'react';
import { Ledger, StockItem, Voucher, Company, User } from '../types';
import { api } from '../services/api';

export const useERPStore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState({ totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 });
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const comps = await api.getCompanies(currentUser.id);
        setCompanies(comps);

        const activeCompany = await api.getSelectedCompany();
        setCompany(activeCompany);

        if (activeCompany) {
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
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const login = async (email: string, password: string) => {
    const loggedInUser = await api.login(email, password);
    setUser(loggedInUser);
    await refreshData();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setCompany(null);
    setLedgers([]);
    setStockItems([]);
    setVouchers([]);
  };

  const createCompany = async (name: string, gstin: string, financialYear: string, address: string) => {
    if (!user) return;
    const newCompany = await api.createCompany({ name, gstin, financialYear, address, ownerId: user.id });
    await api.selectCompany(newCompany.id);
    await refreshData();
  };

  const selectCompany = async (companyId: string) => {
    await api.selectCompany(companyId);
    await refreshData();
  };

  const addLedger = useCallback(async (newLedger: Omit<Ledger, 'id' | 'currentBalance'>) => {
    await api.addLedger(newLedger);
    await refreshData();
  }, [refreshData]);

  const addStockItem = useCallback(async (item: Omit<StockItem, 'id' | 'currentStock'>) => {
    await api.addStockItem(item);
    await refreshData();
  }, [refreshData]);

  const updateStockItem = useCallback(async (id: string, updates: Partial<StockItem>) => {
    await api.updateStockItem(id, updates);
    await refreshData();
  }, [refreshData]);

  const recordVoucher = useCallback(async (voucher: Omit<Voucher, 'id'>) => {
    await api.recordVoucher(voucher);
    await refreshData();
  }, [refreshData]);

  return {
    user,
    companies,
    company,
    ledgers,
    stockItems,
    vouchers,
    stats,
    loading,
    login,
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

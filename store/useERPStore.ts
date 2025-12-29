
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
    // Attempt to hydrate basic company info from cache for instant UI shell
    const cached = localStorage.getItem('prism_erp_active_company_cache');
    return cached ? JSON.parse(cached) : null;
  });
  const [stats, setStats] = useState({ totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Optimized refresh: can accept a user object to skip network round-trip for current user
  const refreshData = useCallback(async (providedUser?: User | null) => {
    setIsSyncing(true);
    try {
      // 1. Resolve User
      const currentUser = providedUser !== undefined ? providedUser : await api.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // 2. Fetch companies and selected company in parallel
        const [comps, activeCompany] = await Promise.all([
          api.getCompanies(currentUser.id),
          api.getSelectedCompany()
        ]);
        
        setCompanies(comps);
        setCompany(activeCompany);

        // Cache the company metadata for the next boot
        if (activeCompany) {
          localStorage.setItem('prism_erp_active_company_cache', JSON.stringify(activeCompany));
          
          // 3. Fetch operational data in parallel - don't block the UI if we already have the shell
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
    // Step 1: Auth
    const loggedInUser = await api.login(email, password);
    // Step 2: Immediate state update to trigger UI transition
    setUser(loggedInUser);
    // Step 3: Background refresh without waiting for user fetch
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
    
    // Perform the heavy lifting
    const newCompany = await api.createCompany({ name, gstin, financialYear, address, ownerId: user.id });
    
    // Update local context for selection
    await api.selectCompany(newCompany.id);
    
    // Update local state to trigger App.tsx re-render immediately
    setCompany(newCompany);
    setCompanies(prev => [...prev, newCompany]);
    
    // Perform the data sync in the background
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
    // Background background re-sync for balances
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


import { Ledger, StockItem, Voucher, Company, User, ERPData } from '../types';
import { INITIAL_LEDGERS, INITIAL_ITEMS } from '../constants';

const USERS_KEY = 'prism_erp_users';
const COMPANIES_KEY = 'prism_erp_companies';
const SESSION_KEY = 'prism_erp_session';
const DATA_PREFIX = 'prism_erp_data_';

interface UserWithPassword extends User {
  password?: string;
}

class BackendAPI {
  private getUsers(): UserWithPassword[] {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveUsers(users: UserWithPassword[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private getAllCompanies(): Company[] {
    const data = localStorage.getItem(COMPANIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveAllCompanies(companies: Company[]): void {
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  }

  private getCompanyData(companyId: string): ERPData {
    const data = localStorage.getItem(`${DATA_PREFIX}${companyId}`);
    if (!data) {
      // For a fresh company, we only provide the standard base ledgers
      const initial: ERPData = {
        ledgers: [...INITIAL_LEDGERS], 
        stockItems: [...INITIAL_ITEMS],
        vouchers: []
      };
      this.saveCompanyData(companyId, initial);
      return initial;
    }
    return JSON.parse(data);
  }

  private saveCompanyData(companyId: string, data: ERPData): void {
    localStorage.setItem(`${DATA_PREFIX}${companyId}`, JSON.stringify(data));
  }

  // Auth Methods
  async login(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Create new user if they don't exist (simulated registration)
      user = { 
        id: `u-${Date.now()}`, 
        email, 
        name: email.split('@')[0],
        password: password 
      };
      users.push(user);
      this.saveUsers(users);
    } else {
      // Validate password if user exists
      if (user.password !== password) {
        throw new Error("Invalid credentials. Please check your password.");
      }
    }
    
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, companyId: null }));
    return { id: user.id, email: user.email, name: user.name };
  }

  async getCurrentUser(): Promise<User | null> {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      const { userId } = JSON.parse(session);
      return this.getUsers().find(u => u.id === userId) || null;
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  // Company Methods
  async getCompanies(userId: string): Promise<Company[]> {
    return this.getAllCompanies().filter(c => c.ownerId === userId);
  }

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    const companies = this.getAllCompanies();
    const newCompany: Company = { ...company, id: `c-${Date.now()}` };
    companies.push(newCompany);
    this.saveAllCompanies(companies);
    return newCompany;
  }

  async selectCompany(companyId: string): Promise<void> {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      session.companyId = companyId;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  async getSelectedCompany(): Promise<Company | null> {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    try {
      const { companyId } = JSON.parse(sessionStr);
      if (!companyId) return null;
      return this.getAllCompanies().find(c => c.id === companyId) || null;
    } catch {
      return null;
    }
  }

  // ERP Data Methods (Scoped by selected company)
  private async getActiveCompanyId(): Promise<string> {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) throw new Error("No active session");
    const { companyId } = JSON.parse(sessionStr);
    if (!companyId) throw new Error("No company selected");
    return companyId;
  }

  async getLedgers(): Promise<Ledger[]> {
    const cid = await this.getActiveCompanyId();
    return this.getCompanyData(cid).ledgers;
  }

  async addLedger(ledger: Omit<Ledger, 'id' | 'currentBalance'>): Promise<Ledger> {
    const cid = await this.getActiveCompanyId();
    const data = this.getCompanyData(cid);
    const newLedger: Ledger = {
      ...ledger,
      id: `l-${Date.now()}`,
      currentBalance: ledger.openingBalance
    };
    data.ledgers.push(newLedger);
    this.saveCompanyData(cid, data);
    return newLedger;
  }

  async getStockItems(): Promise<StockItem[]> {
    const cid = await this.getActiveCompanyId();
    return this.getCompanyData(cid).stockItems;
  }

  async addStockItem(item: Omit<StockItem, 'id' | 'currentStock'>): Promise<StockItem> {
    const cid = await this.getActiveCompanyId();
    const data = this.getCompanyData(cid);
    const newItem: StockItem = {
      ...item,
      id: `i-${Date.now()}`,
      currentStock: item.openingStock
    };
    data.stockItems.push(newItem);
    this.saveCompanyData(cid, data);
    return newItem;
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem> {
    const cid = await this.getActiveCompanyId();
    const data = this.getCompanyData(cid);
    const index = data.stockItems.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Stock item not found");
    
    data.stockItems[index] = { ...data.stockItems[index], ...updates };
    this.saveCompanyData(cid, data);
    return data.stockItems[index];
  }

  async getVouchers(): Promise<Voucher[]> {
    const cid = await this.getActiveCompanyId();
    return this.getCompanyData(cid).vouchers;
  }

  async recordVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    const cid = await this.getActiveCompanyId();
    const data = this.getCompanyData(cid);
    const id = `v-${Date.now()}`;
    const newVoucher: Voucher = { ...voucher, id };

    newVoucher.entries.forEach(entry => {
      const ledger = data.ledgers.find(l => l.id === entry.ledgerId);
      if (ledger) {
        let balanceChange = entry.debit - entry.credit;
        if (['Liability', 'Income', 'Equity'].includes(ledger.type)) {
          balanceChange = entry.credit - entry.debit;
        }
        ledger.currentBalance += balanceChange;
      }
    });

    if (newVoucher.inventory) {
      newVoucher.inventory.forEach(move => {
        const item = data.stockItems.find(i => i.id === move.itemId);
        if (item) {
          const stockChange = move.type === 'In' ? move.quantity : -move.quantity;
          item.currentStock += stockChange;
        }
      });
    }

    data.vouchers.unshift(newVoucher);
    this.saveCompanyData(cid, data);
    return newVoucher;
  }

  async getStats() {
    try {
      const cid = await this.getActiveCompanyId();
      const data = this.getCompanyData(cid);
      const totalSales = data.vouchers
        .filter(v => v.type === 'Sales')
        .reduce((sum, v) => sum + v.totalAmount, 0);
      const totalPurchases = data.vouchers
        .filter(v => v.type === 'Purchase')
        .reduce((sum, v) => sum + v.totalAmount, 0);
      const bankBalance = data.ledgers
        .filter(l => l.group === 'Bank Accounts')
        .reduce((sum, l) => sum + l.currentBalance, 0);
      const cashBalance = data.ledgers
        .find(l => l.name.toLowerCase().includes('cash'))?.currentBalance || 0;

      return { totalSales, totalPurchases, bankBalance, cashBalance };
    } catch {
      return { totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 };
    }
  }
}

export const api = new BackendAPI();

import { Ledger, StockItem, Voucher, Company, User, UserRole } from '../types';
import { INITIAL_LEDGERS, INITIAL_ITEMS } from '../constants';
import { supabase, isSupabaseConfigured } from './supabase';

class BackendAPI {
  private useLocalStorageFallback = !isSupabaseConfigured;

  private handleError(error: any) {
    console.error("API Error Trace:", error);
    
    const message = error.message || "";

    if (message.includes('Email not confirmed')) {
      throw new Error("CONFIRMATION_REQUIRED: Your email has not been confirmed. Please disable 'Confirm Email' in Supabase > Authentication > Providers > Email to bypass this.");
    }

    if (error.code === 'PGRST116' || message.includes('relation')) {
      throw new Error("Database tables not found. Please run the SQL schema script in your Supabase dashboard.");
    }
    
    if (error.code === '42501') {
      throw new Error("Security Violation (RLS): You are not authorized to create this record. Ensure the database policies match the required version in services/supabase.ts.");
    }
    
    throw error;
  }

  // --- Auth Methods ---
  async login(email: string, password: string): Promise<User> {
    if (this.useLocalStorageFallback) {
      const session = localStorage.getItem('prism_erp_session');
      if (session) {
        try {
          const user = JSON.parse(session);
          if (user.email === email) return user;
        } catch (e) {
          localStorage.removeItem('prism_erp_session');
        }
      }
      const user: User = { id: 'local-user', email, name: email.split('@')[0], role: 'Admin' };
      localStorage.setItem('prism_erp_session', JSON.stringify(user));
      return user;
    }

    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) this.handleError(error);

    const { data: profile } = await supabase!.from('profiles').select('*').eq('id', data.user.id).single();

    return {
      id: data.user!.id,
      email: data.user!.email!,
      name: profile?.name || email.split('@')[0],
      role: (profile?.role as UserRole) || 'Staff',
    };
  }

  async signup(email: string, password: string, name: string, role: UserRole = 'Staff'): Promise<User> {
    if (this.useLocalStorageFallback) {
      const user: User = { id: 'local-user-' + Date.now(), email, name, role };
      localStorage.setItem('prism_erp_session', JSON.stringify(user));
      return user;
    }

    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });

    if (error) this.handleError(error);
    if (!data.user) throw new Error("Signup failed");

    return {
      id: data.user.id,
      email: data.user.email!,
      name: name,
      role: role,
    };
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.useLocalStorageFallback) {
      const session = localStorage.getItem('prism_erp_session');
      try {
        return session ? JSON.parse(session) : null;
      } catch {
        return null;
      }
    }
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
      // Fallback check session to handle intermittent getUser failures
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return null;
      const { data: profile } = await supabase!.from('profiles').select('*').eq('id', session.user.id).single();
      return { 
        id: session.user.id, 
        email: session.user.email!, 
        name: profile?.name || session.user.user_metadata?.name || session.user.email!.split('@')[0],
        role: (profile?.role as UserRole) || 'Staff'
      };
    }

    const { data: profile } = await supabase!.from('profiles').select('*').eq('id', user.id).single();

    return { 
      id: user.id, 
      email: user.email!, 
      name: profile?.name || user.user_metadata?.name || user.email!.split('@')[0],
      role: (profile?.role as UserRole) || 'Staff'
    };
  }

  async logout(): Promise<void> {
    if (!this.useLocalStorageFallback && supabase) await supabase.auth.signOut();
    localStorage.removeItem('prism_erp_session');
    localStorage.removeItem('prism_erp_company_id');
    localStorage.removeItem('prism_erp_active_company_cache');
  }

  // --- Company Methods ---
  async getCompanies(userId: string): Promise<Company[]> {
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem('prism_erp_local_companies');
      try {
        const companies: Company[] = data ? JSON.parse(data) : [];
        return companies.filter(c => c.ownerId === userId);
      } catch {
        return [];
      }
    }
    const { data, error } = await supabase!.from('companies').select('*').eq('owner_id', userId);
    if (error) this.handleError(error);
    return (data || []).map(c => this.mapCompany(c));
  }

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    if (this.useLocalStorageFallback) {
      const companiesStr = localStorage.getItem('prism_erp_local_companies');
      const companies = companiesStr ? JSON.parse(companiesStr) : [];
      const newC = { ...company, id: `c-${Date.now()}` };
      companies.push(newC);
      localStorage.setItem('prism_erp_local_companies', JSON.stringify(companies));
      return newC;
    }

    let { data: { user } } = await supabase!.auth.getUser();
    if (!user) {
       // Deep session validation
       const { data: { session } } = await supabase!.auth.getSession();
       if (!session) throw new Error("AUTH_SESSION_EXPIRED: Your security session has expired. Please log in again.");
       user = session.user;
    }

    const { data, error } = await supabase!
      .from('companies')
      .insert([{
        name: company.name,
        gstin: company.gstin,
        financial_year: company.financialYear,
        address: company.address,
        owner_id: user.id
      }])
      .select().single();

    if (error) this.handleError(error);
    
    const seedLedgers = INITIAL_LEDGERS.map(l => ({
      company_id: data.id,
      name: l.name,
      group: l.group,
      type: l.type,
      opening_balance: l.openingBalance,
      current_balance: l.currentBalance
    }));

    const { error: seedError } = await supabase!.from('ledgers').insert(seedLedgers);
    if (seedError) this.handleError(seedError);

    return this.mapCompany(data);
  }

  async selectCompany(companyId: string): Promise<void> {
    localStorage.setItem('prism_erp_company_id', companyId);
  }

  async getSelectedCompany(): Promise<Company | null> {
    const companyId = localStorage.getItem('prism_erp_company_id');
    if (!companyId) return null;

    if (this.useLocalStorageFallback) {
      const user = await this.getCurrentUser();
      if (!user) return null;
      const companies = await this.getCompanies(user.id);
      return companies.find(c => c.id === companyId) || null;
    }

    const { data, error } = await supabase!.from('companies').select('*').eq('id', companyId).maybeSingle();
    if (error) return null;
    return data ? this.mapCompany(data) : null;
  }

  // --- ERP Data Methods ---
  async getLedgers(): Promise<Ledger[]> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem(`prism_erp_ledgers_${cid}`);
      try {
        return data ? JSON.parse(data) : INITIAL_LEDGERS;
      } catch {
        return INITIAL_LEDGERS;
      }
    }
    const { data, error } = await supabase!.from('ledgers').select('*').eq('company_id', cid);
    if (error) this.handleError(error);
    return (data || []).map(l => this.mapLedger(l));
  }

  async addLedger(ledger: Omit<Ledger, 'id' | 'currentBalance'>): Promise<Ledger> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (this.useLocalStorageFallback) {
      const ledgers = await this.getLedgers();
      const newL = { ...ledger, id: `l-${Date.now()}`, currentBalance: ledger.openingBalance };
      ledgers.push(newL);
      localStorage.setItem(`prism_erp_ledgers_${cid}`, JSON.stringify(ledgers));
      return newL;
    }
    const { data, error } = await supabase!
      .from('ledgers')
      .insert([{
        company_id: cid,
        name: ledger.name,
        group: ledger.group,
        type: ledger.type,
        opening_balance: ledger.openingBalance,
        current_balance: ledger.openingBalance
      }])
      .select().single();
    if (error) this.handleError(error);
    return this.mapLedger(data);
  }

  async getStockItems(): Promise<StockItem[]> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem(`prism_erp_stock_${cid}`);
      try {
        return data ? JSON.parse(data) : INITIAL_ITEMS;
      } catch {
        return INITIAL_ITEMS;
      }
    }
    const { data, error } = await supabase!.from('stock_items').select('*').eq('company_id', cid);
    if (error) this.handleError(error);
    return (data || []).map(i => this.mapStockItem(i));
  }

  async addStockItem(item: Omit<StockItem, 'id' | 'currentStock'>): Promise<StockItem> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (this.useLocalStorageFallback) {
      const stock = await this.getStockItems();
      const newI = { ...item, id: `i-${Date.now()}`, currentStock: item.openingStock };
      stock.push(newI);
      localStorage.setItem(`prism_erp_stock_${cid}`, JSON.stringify(stock));
      return newI;
    }
    const { data, error } = await supabase!
      .from('stock_items')
      .insert([{
        company_id: cid,
        name: item.name,
        sku: item.sku,
        hsn: item.hsn,
        unit: item.unit,
        opening_stock: item.openingStock,
        current_stock: item.openingStock,
        purchase_price: item.purchasePrice,
        sale_price: item.salePrice,
        gst_rate: item.gstRate
      }])
      .select().single();
    if (error) this.handleError(error);
    return this.mapStockItem(data);
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem> {
    if (this.useLocalStorageFallback) {
      const cid = localStorage.getItem('prism_erp_company_id');
      const stock = await this.getStockItems();
      const idx = stock.findIndex(i => i.id === id);
      if (idx > -1) {
        stock[idx] = { ...stock[idx], ...updates };
        localStorage.setItem(`prism_erp_stock_${cid}`, JSON.stringify(stock));
        return stock[idx];
      }
      throw new Error("Item not found");
    }
    const mapped = this.mapToStockTable(updates);
    const { data, error } = await supabase!.from('stock_items').update(mapped).eq('id', id).select().single();
    if (error) this.handleError(error);
    return this.mapStockItem(data);
  }

  async getVouchers(): Promise<Voucher[]> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    if (this.useLocalStorageFallback) {
      const data = localStorage.getItem(`prism_erp_vouchers_${cid}`);
      try {
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    }
    const { data, error } = await supabase!.from('vouchers').select('*, voucher_entries(*)').eq('company_id', cid).order('date', { ascending: false });
    if (error) this.handleError(error);
    return (data || []).map(v => this.mapVoucher(v));
  }

  async recordVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (this.useLocalStorageFallback) {
      const vchs = await this.getVouchers();
      const newV = { ...voucher, id: `v-${Date.now()}` };
      vchs.unshift(newV);
      localStorage.setItem(`prism_erp_vouchers_${cid}`, JSON.stringify(vchs));
      return newV;
    }

    const { data: vData, error: vError } = await supabase!.from('vouchers').insert([{
      company_id: cid,
      number: voucher.number,
      date: voucher.date,
      type: voucher.type,
      narration: voucher.narration,
      total_amount: voucher.totalAmount,
      gst_total: voucher.gstTotal
    }]).select().single();

    if (vError) this.handleError(vError);

    const entries = voucher.entries.map(e => ({
      voucher_id: vData.id,
      ledger_id: e.ledgerId,
      debit: e.debit,
      credit: e.credit
    }));
    await supabase!.from('voucher_entries').insert(entries);
    
    for (const e of voucher.entries) {
      const { data: l } = await supabase!.from('ledgers').select('*').eq('id', e.ledgerId).single();
      if (l) {
        let diff = e.debit - e.credit;
        if (['Liability', 'Income', 'Equity'].includes(l.type)) diff = e.credit - e.debit;
        await supabase!.from('ledgers').update({ current_balance: l.current_balance + diff }).eq('id', l.id);
      }
    }

    return { ...voucher, id: vData.id };
  }

  async getStats() {
    try {
      const vchs = await this.getVouchers();
      const ldgs = await this.getLedgers();
      return {
        totalSales: vchs.filter(v => v.type === 'Sales').reduce((sum, v) => sum + v.totalAmount, 0),
        totalPurchases: vchs.filter(v => v.type === 'Purchase').reduce((sum, v) => sum + v.totalAmount, 0),
        bankBalance: ldgs.filter(l => l.group === 'Bank Accounts').reduce((sum, l) => sum + l.currentBalance, 0),
        cashBalance: ldgs.find(l => l.name.toLowerCase().includes('cash'))?.currentBalance || 0
      };
    } catch {
      return { totalSales: 0, totalPurchases: 0, bankBalance: 0, cashBalance: 0 };
    }
  }

  // --- Mappers ---
  private mapCompany(c: any): Company {
    return { id: c.id, name: c.name, gstin: c.gstin, financialYear: c.financial_year, address: c.address, ownerId: c.owner_id };
  }
  private mapLedger(l: any): Ledger {
    return { id: l.id, name: l.name, group: l.group, type: l.type, openingBalance: l.opening_balance, currentBalance: Number(l.current_balance) };
  }
  private mapStockItem(i: any): StockItem {
    return { id: i.id, name: i.name, sku: i.sku, hsn: i.hsn, unit: i.unit, openingStock: i.opening_stock, currentStock: i.current_stock, purchasePrice: i.purchase_price, salePrice: i.sale_price, gstRate: i.gst_rate };
  }
  private mapVoucher(v: any): Voucher {
    return { 
      id: v.id, 
      number: v.number, 
      date: v.date, 
      type: v.type, 
      narration: v.narration, 
      totalAmount: Number(v.total_amount), 
      gstTotal: Number(v.gst_total), 
      entries: (v.voucher_entries || []).map((e: any) => ({ 
        ledgerId: e.ledger_id, 
        debit: Number(e.debit), 
        credit: Number(e.credit) 
      })) 
    };
  }
  private mapToStockTable(u: Partial<StockItem>): any {
    const m: any = {};
    if (u.name) m.name = u.name;
    if (u.purchasePrice !== undefined) m.purchase_price = u.purchasePrice;
    if (u.salePrice !== undefined) m.sale_price = u.salePrice;
    if (u.currentStock !== undefined) m.current_stock = u.currentStock;
    return m;
  }
}

export const api = new BackendAPI();
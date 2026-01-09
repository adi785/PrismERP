
import { Ledger, StockItem, Voucher, Company, User, UserRole, TrackingDetail, TrackingType } from '../types';
import { INITIAL_LEDGERS, INITIAL_ITEMS } from '../constants';
import { supabase, isSupabaseConfigured } from './supabase';

class BackendAPI {
  private useLocalStorageFallback = !isSupabaseConfigured;

  public enableLocalMode() {
    this.useLocalStorageFallback = true;
    localStorage.setItem('prism_erp_force_local', 'true');
  }

  constructor() {
    if (localStorage.getItem('prism_erp_force_local') === 'true') {
      this.useLocalStorageFallback = true;
    }
  }

  private handleError(error: any) {
    console.error("ERP Core Error:", error);
    throw error;
  }

  // Helper to simulate DB delay and retrieval
  private async getFromLocal<T>(key: string): Promise<T[]> {
    await new Promise(r => setTimeout(r, 100)); // Sim delay
    const data = localStorage.getItem(`prism_local_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private async saveToLocal(key: string, data: any[]) {
    await new Promise(r => setTimeout(r, 100));
    localStorage.setItem(`prism_local_${key}`, JSON.stringify(data));
  }

  // --- Auth Methods ---
  async login(email: string, password: string): Promise<User> {
    if (this.useLocalStorageFallback) {
      const user: User = { id: 'local-user', email, name: email.split('@')[0], role: 'Admin' };
      localStorage.setItem('prism_erp_session', JSON.stringify(user));
      return user;
    }
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) this.handleError(error);
    const { data: profile } = await supabase!.from('profiles').select('*').eq('id', data.user.id).single();
    return { id: data.user!.id, email: data.user!.email!, name: profile?.name || email.split('@')[0], role: (profile?.role as UserRole) || 'Staff' };
  }

  async signup(email: string, password: string, name: string, role: UserRole = 'Staff'): Promise<User> {
    if (this.useLocalStorageFallback) {
      const user: User = { id: 'local-user-' + Date.now(), email, name, role };
      localStorage.setItem('prism_erp_session', JSON.stringify(user));
      return user;
    }
    const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { name, role } } });
    if (error) this.handleError(error);
    return { id: data.user!.id, email: data.user!.email!, name, role };
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.useLocalStorageFallback) {
      const session = localStorage.getItem('prism_erp_session');
      try { return session ? JSON.parse(session) : null; } catch { return null; }
    }
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return { id: user.id, email: user.email!, name: profile?.name || user.email!.split('@')[0], role: (profile?.role as UserRole) || 'Staff' };
  }

  async logout(): Promise<void> {
    if (!this.useLocalStorageFallback && supabase) await supabase.auth.signOut();
    localStorage.clear();
  }

  // --- Company Methods ---
  async getCompanies(userId: string): Promise<Company[]> {
    if (this.useLocalStorageFallback) return [];
    const { data, error } = await supabase!.from('companies').select('*').eq('owner_id', userId);
    if (error) this.handleError(error);
    return (data || []).map(c => this.mapCompany(c));
  }

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    if (this.useLocalStorageFallback) throw new Error("Local creation disabled");
    const { data, error } = await supabase!.from('companies').insert([{ name: company.name, gstin: company.gstin, financial_year: company.financialYear, address: company.address }]).select().single();
    if (error) this.handleError(error);
    return this.mapCompany(data);
  }

  async selectCompany(companyId: string): Promise<void> {
    localStorage.setItem('prism_erp_company_id', companyId);
  }

  async getSelectedCompany(): Promise<Company | null> {
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid || this.useLocalStorageFallback) return null;
    const { data, error } = await supabase!.from('companies').select('*').eq('id', cid).maybeSingle();
    return data ? this.mapCompany(data) : null;
  }

  // --- ERP Data Methods ---
  async getLedgers(): Promise<Ledger[]> {
    if (this.useLocalStorageFallback) {
      const local = await this.getFromLocal<Ledger>('ledgers');
      return local.length > 0 ? local : INITIAL_LEDGERS; // Return initial if empty
    }
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    const { data, error } = await supabase!.from('ledgers').select('*').eq('company_id', cid).order('name');
    if (error) this.handleError(error);
    return (data || []).map(l => this.mapLedger(l));
  }

  async addLedger(ledger: Omit<Ledger, 'id' | 'currentBalance'>): Promise<Ledger> {
    if (this.useLocalStorageFallback) {
      const ledgers = await this.getLedgers();
      const newLedger: Ledger = { ...ledger, id: `local-l-${Date.now()}`, currentBalance: ledger.openingBalance };
      ledgers.push(newLedger);
      await this.saveToLocal('ledgers', ledgers);
      return newLedger;
    }
    const cid = localStorage.getItem('prism_erp_company_id');
    const { data, error } = await supabase!.from('ledgers').insert([{ company_id: cid, name: ledger.name, group: ledger.group, type: ledger.type, opening_balance: ledger.openingBalance, current_balance: ledger.openingBalance }]).select().single();
    if (error) this.handleError(error);
    return this.mapLedger(data);
  }

  async getStockItems(): Promise<StockItem[]> {
    if (this.useLocalStorageFallback) {
      return await this.getFromLocal<StockItem>('stock_items');
    }
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    const { data, error } = await supabase!.from('stock_items').select('*').eq('company_id', cid).order('name');
    if (error) this.handleError(error);
    return (data || []).map(i => this.mapStockItem(i));
  }

  async getTrackingForItems(itemIds: string[]): Promise<TrackingDetail[]> {
    if (this.useLocalStorageFallback) {
       const all = await this.getFromLocal<TrackingDetail>('tracking');
       return all.filter(t => itemIds.includes(t.itemId) && t.currentQty > 0);
    }
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase!.from('stock_tracking').select('*').in('item_id', itemIds).gt('current_qty', 0);
    if (error) this.handleError(error);
    return (data || []).map(t => ({
      id: t.id,
      itemId: t.item_id,
      identifier: t.identifier,
      expiryDate: t.expiry_date,
      currentQty: Number(t.current_qty),
      type: t.tracking_type
    }));
  }

  async addStockItem(item: Omit<StockItem, 'id' | 'currentStock'>): Promise<StockItem> {
    if (this.useLocalStorageFallback) {
      const items = await this.getStockItems();
      const newItem: StockItem = { ...item, id: `local-i-${Date.now()}`, currentStock: item.openingStock };
      items.push(newItem);
      await this.saveToLocal('stock_items', items);
      return newItem;
    }
    const cid = localStorage.getItem('prism_erp_company_id');
    const { data, error } = await supabase!.from('stock_items').insert([{
      company_id: cid,
      name: item.name,
      sku: item.sku,
      hsn: item.hsn,
      unit: item.unit,
      opening_stock: item.openingStock,
      current_stock: item.openingStock,
      purchase_price: item.purchasePrice,
      sale_price: item.salePrice,
      gst_rate: item.gstRate,
      tracking_type: item.trackingType
    }]).select().single();
    if (error) this.handleError(error);
    return this.mapStockItem(data);
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem> {
    if (this.useLocalStorageFallback) {
      const items = await this.getStockItems();
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates };
        await this.saveToLocal('stock_items', items);
        return items[idx];
      }
      throw new Error("Item not found");
    }
    const mapped = this.mapToStockTable(updates);
    const { data, error } = await supabase!.from('stock_items').update(mapped).eq('id', id).select().single();
    if (error) this.handleError(error);
    return this.mapStockItem(data);
  }

  async deleteStockItem(id: string): Promise<void> {
    if (this.useLocalStorageFallback) {
      const items = await this.getStockItems();
      await this.saveToLocal('stock_items', items.filter(i => i.id !== id));
      return;
    }
    const { error } = await supabase!.from('stock_items').delete().eq('id', id);
    if (error) this.handleError(error);
  }

  async getVouchers(): Promise<Voucher[]> {
    if (this.useLocalStorageFallback) {
      const v = await this.getFromLocal<Voucher>('vouchers');
      return v.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    const cid = localStorage.getItem('prism_erp_company_id');
    if (!cid) return [];
    const { data, error } = await supabase!.from('vouchers').select('*, voucher_entries(*), inventory_movements(*)').eq('company_id', cid).order('date', { ascending: false }).order('created_at', { ascending: false });
    if (error) this.handleError(error);
    return (data || []).map(v => this.mapVoucher(v));
  }

  async recordVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    if (this.useLocalStorageFallback) {
      const newVoucher: Voucher = { ...voucher, id: `local-v-${Date.now()}` };
      const vouchers = await this.getVouchers();
      vouchers.unshift(newVoucher);
      await this.saveToLocal('vouchers', vouchers);

      // 1. Update Ledger Balances Locally
      const ledgers = await this.getLedgers();
      for (const e of voucher.entries) {
        const l = ledgers.find(ledger => ledger.id === e.ledgerId);
        if (l) {
          let diff = Number(e.debit) - Number(e.credit);
          if (['Liability', 'Income', 'Equity'].includes(l.type)) diff = Number(e.credit) - Number(e.debit);
          l.currentBalance += diff;
        }
      }
      await this.saveToLocal('ledgers', ledgers);

      // 2. Update Stock & Tracking Locally
      if (voucher.inventory && voucher.inventory.length > 0) {
        const stockItems = await this.getStockItems();
        const trackingData = await this.getFromLocal<TrackingDetail>('tracking');

        for (const m of voucher.inventory) {
          const delta = m.type === 'In' ? m.quantity : -m.quantity;
          const item = stockItems.find(i => i.id === m.itemId);
          if (item) item.currentStock += delta;

          if (m.trackingId) {
             const track = trackingData.find(t => t.id === m.trackingId);
             if (track) track.currentQty += delta;
          }
        }
        await this.saveToLocal('stock_items', stockItems);
        await this.saveToLocal('tracking', trackingData);
      }
      return newVoucher;
    }

    const cid = localStorage.getItem('prism_erp_company_id');
    const { data: vData, error: vError } = await supabase!.from('vouchers').insert([{ company_id: cid, number: voucher.number, date: voucher.date, type: voucher.type, narration: voucher.narration, total_amount: voucher.totalAmount, gst_total: voucher.gstTotal }]).select().single();
    if (vError) this.handleError(vError);

    const entries = voucher.entries.map(e => ({ voucher_id: vData.id, ledger_id: e.ledgerId, debit: e.debit, credit: e.credit }));
    await supabase!.from('voucher_entries').insert(entries);

    if (voucher.inventory) {
      for (const m of voucher.inventory) {
        await supabase!.from('inventory_movements').insert([{
          voucher_id: vData.id,
          item_id: m.itemId,
          tracking_id: m.trackingId,
          quantity: m.quantity,
          rate: m.rate,
          amount: m.amount,
          type: m.type
        }]);

        // Sync Stock Levels
        const delta = m.type === 'In' ? m.quantity : -m.quantity;
        
        // 1. Update master item qty
        const { data: item } = await supabase!.from('stock_items').select('current_stock').eq('id', m.itemId).single();
        await supabase!.from('stock_items').update({ current_stock: Number(item.current_stock) + delta }).eq('id', m.itemId);

        // 2. Update tracking qty if applicable
        if (m.trackingId) {
          const { data: track } = await supabase!.from('stock_tracking').select('current_qty').eq('id', m.trackingId).single();
          await supabase!.from('stock_tracking').update({ current_qty: Number(track.current_qty) + delta }).eq('id', m.trackingId);
        }
      }
    }
    
    // Sync Ledger Balances
    for (const e of voucher.entries) {
      const { data: l } = await supabase!.from('ledgers').select('*').eq('id', e.ledgerId).single();
      if (l) {
        let diff = Number(e.debit) - Number(e.credit);
        if (['Liability', 'Income', 'Equity'].includes(l.type)) diff = Number(e.credit) - Number(e.debit);
        await supabase!.from('ledgers').update({ current_balance: Number(l.current_balance) + diff }).eq('id', l.id);
      }
    }
    return { ...voucher, id: vData.id };
  }

  async deleteVoucher(voucherId: string): Promise<void> {
    if (this.useLocalStorageFallback) {
      const vouchers = await this.getVouchers();
      const v = vouchers.find(v => v.id === voucherId);
      if (!v) return;

      // Reverse Effects Local
      const ledgers = await this.getLedgers();
      for (const e of v.entries) {
        const l = ledgers.find(ledger => ledger.id === e.ledgerId);
        if (l) {
          let diff = Number(e.debit) - Number(e.credit);
          if (['Liability', 'Income', 'Equity'].includes(l.type)) diff = Number(e.credit) - Number(e.debit);
          l.currentBalance -= diff; // Reverse
        }
      }
      await this.saveToLocal('ledgers', ledgers);

      if (v.inventory) {
        const stockItems = await this.getStockItems();
        const trackingData = await this.getFromLocal<TrackingDetail>('tracking');
        for (const m of v.inventory) {
          const delta = m.type === 'In' ? m.quantity : -m.quantity;
          const item = stockItems.find(i => i.id === m.itemId);
          if (item) item.currentStock -= delta; // Reverse
          if (m.trackingId) {
             const track = trackingData.find(t => t.id === m.trackingId);
             if (track) track.currentQty -= delta; // Reverse
          }
        }
        await this.saveToLocal('stock_items', stockItems);
        await this.saveToLocal('tracking', trackingData);
      }

      const newVouchers = vouchers.filter(x => x.id !== voucherId);
      await this.saveToLocal('vouchers', newVouchers);
      return;
    }
    
    // 1. Fetch full voucher details to perform reversal
    const { data: v, error: vErr } = await supabase!.from('vouchers').select('*, voucher_entries(*), inventory_movements(*)').eq('id', voucherId).single();
    if (vErr) this.handleError(vErr);

    // 2. Reverse Ledger Balances
    if (v.voucher_entries) {
      for (const e of v.voucher_entries) {
        const { data: l } = await supabase!.from('ledgers').select('*').eq('id', e.ledger_id).single();
        if (l) {
          let diff = Number(e.debit) - Number(e.credit);
          if (['Liability', 'Income', 'Equity'].includes(l.type)) diff = Number(e.credit) - Number(e.debit);
          await supabase!.from('ledgers').update({ current_balance: Number(l.current_balance) - diff }).eq('id', l.id);
        }
      }
    }

    // 3. Reverse Inventory Movements & Tracking
    if (v.inventory_movements) {
      for (const m of v.inventory_movements) {
        const delta = m.type === 'In' ? m.quantity : -m.quantity;
        
        // Reverse Master Stock
        const { data: item } = await supabase!.from('stock_items').select('current_stock').eq('id', m.item_id).single();
        if (item) {
          await supabase!.from('stock_items').update({ current_stock: Number(item.current_stock) - delta }).eq('id', m.item_id);
        }

        // Reverse Tracking
        if (m.tracking_id) {
          const { data: track } = await supabase!.from('stock_tracking').select('current_qty').eq('id', m.tracking_id).single();
          if (track) {
            await supabase!.from('stock_tracking').update({ current_qty: Number(track.current_qty) - delta }).eq('id', m.tracking_id);
          }
        }
      }
    }

    // 4. Finally delete the voucher record (Cascade handles child tables)
    const { error: dErr } = await supabase!.from('vouchers').delete().eq('id', voucherId);
    if (dErr) this.handleError(dErr);
  }

  async ensureTrackingRecord(itemId: string, identifier: string, type: 'batch' | 'serial', expiry?: string): Promise<string> {
    if (this.useLocalStorageFallback) {
      const all = await this.getFromLocal<TrackingDetail>('tracking');
      const exist = all.find(t => t.itemId === itemId && t.identifier === identifier);
      if (exist) return exist.id;
      const newT: TrackingDetail = { id: `local-t-${Date.now()}-${Math.random()}`, itemId, identifier, type, expiryDate: expiry, currentQty: 0 };
      all.push(newT);
      await this.saveToLocal('tracking', all);
      return newT.id;
    }
    const { data: existing } = await supabase!.from('stock_tracking').select('id').eq('item_id', itemId).eq('identifier', identifier).maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase!.from('stock_tracking').insert([{ item_id: itemId, identifier, tracking_type: type, expiry_date: expiry, current_qty: 0 }]).select().single();
    if (error) this.handleError(error);
    return data.id;
  }

  async getStats() {
    const vchs = await this.getVouchers();
    const ldgs = await this.getLedgers();
    return {
      totalSales: vchs.filter(v => v.type === 'Sales').reduce((sum, v) => sum + v.totalAmount, 0),
      totalPurchases: vchs.filter(v => v.type === 'Purchase').reduce((sum, v) => sum + v.totalAmount, 0),
      bankBalance: ldgs.filter(l => l.group === 'Bank Accounts').reduce((sum, l) => sum + l.currentBalance, 0),
      cashBalance: ldgs.find(l => l.name.toLowerCase().includes('cash'))?.currentBalance || 0
    };
  }

  // --- Mappers ---
  private mapCompany(c: any): Company { return { id: c.id, name: c.name, gstin: c.gstin, financialYear: c.financial_year, address: c.address, ownerId: c.owner_id }; }
  private mapLedger(l: any): Ledger { return { id: l.id, name: l.name, group: l.group, type: l.type, openingBalance: Number(l.opening_balance), currentBalance: Number(l.current_balance) }; }
  private mapStockItem(i: any): StockItem { return { id: i.id, name: i.name, sku: i.sku, hsn: i.hsn, unit: i.unit, openingStock: Number(i.opening_stock), currentStock: Number(i.current_stock), purchasePrice: Number(i.purchase_price), salePrice: Number(i.sale_price), gstRate: Number(i.gst_rate), trackingType: (i.tracking_type as TrackingType) || 'none' }; }
  private mapVoucher(v: any): Voucher {
    return { 
      id: v.id, number: v.number, date: v.date, type: v.type, narration: v.narration, totalAmount: Number(v.total_amount), gstTotal: Number(v.gst_total), 
      entries: (v.voucher_entries || []).map((e: any) => ({ ledgerId: e.ledger_id, debit: Number(e.debit), credit: Number(e.credit) })),
      inventory: (v.inventory_movements || []).map((m: any) => ({ itemId: m.item_id, trackingId: m.tracking_id, quantity: Number(m.quantity), rate: Number(m.rate), amount: Number(m.amount), type: m.type as 'In' | 'Out' }))
    };
  }
  private mapToStockTable(u: Partial<StockItem>): any {
    const m: any = {};
    if (u.name) m.name = u.name;
    if (u.purchasePrice !== undefined) m.purchase_price = u.purchasePrice;
    if (u.salePrice !== undefined) m.sale_price = u.salePrice;
    if (u.currentStock !== undefined) m.current_stock = u.currentStock;
    if (u.trackingType !== undefined) m.tracking_type = u.trackingType;
    return m;
  }
}

export const api = new BackendAPI();

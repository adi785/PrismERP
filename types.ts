
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
export type UserRole = 'Admin' | 'Accountant' | 'Staff';
export type TrackingType = 'none' | 'batch' | 'serial';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Ledger {
  id: string;
  name: string;
  group: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
}

export interface TrackingDetail {
  id: string;
  itemId: string;
  identifier: string; // Batch No or Serial No
  expiryDate?: string;
  currentQty: number;
  type: 'batch' | 'serial';
}

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  hsn: string;
  unit: string;
  openingStock: number;
  currentStock: number;
  purchasePrice: number;
  salePrice: number;
  gstRate: number;
  trackingType: TrackingType;
}

export type VoucherType = 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal';

export interface VoucherEntry {
  ledgerId: string;
  debit: number;
  credit: number;
}

export interface InventoryMovement {
  itemId: string;
  trackingId?: string; // Link to specific batch/serial
  quantity: number;
  rate: number;
  amount: number;
  type: 'In' | 'Out';
}

export interface Voucher {
  id: string;
  number: string;
  date: string;
  type: VoucherType;
  entries: VoucherEntry[];
  inventory?: InventoryMovement[];
  narration: string;
  totalAmount: number;
  gstTotal: number;
}

export interface Company {
  id: string;
  name: string;
  gstin: string;
  financialYear: string;
  address: string;
  ownerId: string;
}

export interface ERPData {
  ledgers: Ledger[];
  stockItems: StockItem[];
  vouchers: Voucher[];
}

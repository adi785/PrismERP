
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Ledger {
  id: string;
  name: string;
  group: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
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
  gstRate: number; // Percentage
}

export type VoucherType = 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal';

export interface VoucherEntry {
  ledgerId: string;
  debit: number;
  credit: number;
}

export interface InventoryMovement {
  itemId: string;
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

export interface ERPState {
  company: Company;
  ledgers: Ledger[];
  stockItems: StockItem[];
  vouchers: Voucher[];
}

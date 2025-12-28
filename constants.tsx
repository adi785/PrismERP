
import { Ledger, StockItem, Company } from './types';

/**
 * PRODUCTION READY CONSTANTS
 * Removed mock data for client delivery.
 * Initial company is now a placeholder; users will create their own in the onboarding flow.
 */

export const INITIAL_COMPANY: Company = {
  id: 'temp-001',
  name: "New Business Entity",
  gstin: "00XXXXX0000X0Z0",
  financialYear: "2024-25",
  address: "Principal Business Address",
  ownerId: 'system'
};

// Only standard accounting ledgers that are required for basic operations
export const INITIAL_LEDGERS: Ledger[] = [
  { id: 'l-cash', name: 'Cash Account', group: 'Cash-in-hand', type: 'Asset', openingBalance: 0, currentBalance: 0 },
  { id: 'l-sales', name: 'Sales Account', group: 'Sales Accounts', type: 'Income', openingBalance: 0, currentBalance: 0 },
  { id: 'l-purchase', name: 'Purchase Account', group: 'Purchase Accounts', type: 'Expense', openingBalance: 0, currentBalance: 0 },
  { id: 'l-cgst', name: 'CGST', group: 'Duties & Taxes', type: 'Liability', openingBalance: 0, currentBalance: 0 },
  { id: 'l-sgst', name: 'SGST', group: 'Duties & Taxes', type: 'Liability', openingBalance: 0, currentBalance: 0 },
  { id: 'l-igst', name: 'IGST', group: 'Duties & Taxes', type: 'Liability', openingBalance: 0, currentBalance: 0 },
];

// Start with zero inventory items
export const INITIAL_ITEMS: StockItem[] = [];

import type { VoucherEntry } from '../types';

export interface SalesVoucherEntryOptions {
  settlementLedgerId: string;
  taxableAmount: number;
  totalAmount: number;
  taxType: 'Intra' | 'Inter';
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOffAmount?: number;
}

export function splitTaxAmount(totalAmount: number): { cgst: number; sgst: number };
export function validateVoucherEntries(entries: readonly VoucherEntry[]): void;
export function buildSalesVoucherEntries(options: SalesVoucherEntryOptions): VoucherEntry[];

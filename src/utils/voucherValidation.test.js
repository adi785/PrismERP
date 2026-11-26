import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSalesVoucherEntries, validateVoucherEntries } from './voucherValidation.js';

test('accepts balanced entries with decimal currency amounts', () => {
  assert.doesNotThrow(() => validateVoucherEntries([
    { ledgerId: 'cash', debit: 118.25, credit: 0 },
    { ledgerId: 'sales', debit: 0, credit: 100 },
    { ledgerId: 'tax', debit: 0, credit: 18.25 }
  ]));
});

test('rejects an unbalanced voucher before persistence', () => {
  assert.throws(
    () => validateVoucherEntries([
      { ledgerId: 'cash', debit: 118, credit: 0 },
      { ledgerId: 'sales', debit: 0, credit: 100 }
    ]),
    /not balanced: debit ₹118.00 and credit ₹100.00/
  );
});

test('rejects entries without a ledger', () => {
  assert.throws(
    () => validateVoucherEntries([
      { ledgerId: '', debit: 10, credit: 0 },
      { ledgerId: 'sales', debit: 0, credit: 10 }
    ]),
    /must have a ledger selected/
  );
});

test('rejects negative, non-finite, and double-sided entry amounts', () => {
  const balanced = [
    { ledgerId: 'cash', debit: 10, credit: 0 },
    { ledgerId: 'sales', debit: 0, credit: 10 }
  ];
  assert.throws(() => validateVoucherEntries([
    { ...balanced[0], debit: -1 }, balanced[1]
  ]), /finite, non-negative/);
  assert.throws(() => validateVoucherEntries([
    { ...balanced[0], debit: Number.NaN }, balanced[1]
  ]), /finite, non-negative/);
  assert.throws(() => validateVoucherEntries([
    { ledgerId: 'cash', debit: 10, credit: 1 }, balanced[1]
  ]), /both a debit and a credit/);
});

test('requires at least two ledger entries', () => {
  assert.throws(
    () => validateVoucherEntries([{ ledgerId: 'cash', debit: 0, credit: 0 }]),
    /at least two ledger entries/
  );
});

test('builds a balanced intra-state invoice with CGST and SGST', () => {
  const entries = buildSalesVoucherEntries({
    settlementLedgerId: 'cash',
    taxableAmount: 100,
    totalAmount: 118,
    taxType: 'Intra',
    cgstAmount: 9,
    sgstAmount: 9
  });
  assert.deepEqual(entries, [
    { ledgerId: 'cash', debit: 118, credit: 0 },
    { ledgerId: 'l-sales', debit: 0, credit: 100 },
    { ledgerId: 'l-cgst', debit: 0, credit: 9 },
    { ledgerId: 'l-sgst', debit: 0, credit: 9 }
  ]);
  assert.doesNotThrow(() => validateVoucherEntries(entries));
});

test('builds an inter-state invoice with IGST instead of CGST and SGST', () => {
  const entries = buildSalesVoucherEntries({
    settlementLedgerId: 'receivable',
    taxableAmount: 100,
    totalAmount: 118,
    taxType: 'Inter',
    igstAmount: 18
  });
  assert.deepEqual(entries, [
    { ledgerId: 'receivable', debit: 118, credit: 0 },
    { ledgerId: 'l-sales', debit: 0, credit: 100 },
    { ledgerId: 'l-igst', debit: 0, credit: 18 }
  ]);
  assert.doesNotThrow(() => validateVoucherEntries(entries));
});

test('posts positive and negative round-off on opposite sides', () => {
  const roundedUp = buildSalesVoucherEntries({
    settlementLedgerId: 'cash',
    taxableAmount: 100,
    totalAmount: 119,
    taxType: 'Intra',
    cgstAmount: 9,
    sgstAmount: 9,
    roundOffAmount: 1
  });
  const roundedDown = buildSalesVoucherEntries({
    settlementLedgerId: 'cash',
    taxableAmount: 100,
    totalAmount: 117,
    taxType: 'Intra',
    cgstAmount: 9,
    sgstAmount: 9,
    roundOffAmount: -1
  });

  assert.deepEqual(roundedUp.at(-1), { ledgerId: 'l-roundoff', debit: 0, credit: 1 });
  assert.deepEqual(roundedDown.at(-1), { ledgerId: 'l-roundoff', debit: 1, credit: 0 });
  assert.doesNotThrow(() => validateVoucherEntries(roundedUp));
  assert.doesNotThrow(() => validateVoucherEntries(roundedDown));
});

test('omits zero-value tax and round-off rows', () => {
  const entries = buildSalesVoucherEntries({
    settlementLedgerId: 'cash',
    taxableAmount: 100,
    totalAmount: 100,
    taxType: 'Intra'
  });
  assert.deepEqual(entries, [
    { ledgerId: 'cash', debit: 100, credit: 0 },
    { ledgerId: 'l-sales', debit: 0, credit: 100 }
  ]);
  assert.doesNotThrow(() => validateVoucherEntries(entries));
});

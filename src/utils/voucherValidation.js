/**
 * Small, dependency-free accounting helpers shared by voucher workflows.
 * Amounts are normalized to the currency's two-decimal minor unit (paise).
 */

function toCents(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a finite, non-negative amount.`);
  }
  return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Reject malformed or unbalanced journal entries before any local or remote write.
 * @param {Array<{ledgerId: string, debit: number, credit: number}>} entries
 */
export function validateVoucherEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    throw new Error('A voucher must contain at least two ledger entries.');
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  entries.forEach((entry, index) => {
    const line = index + 1;
    if (!entry || typeof entry.ledgerId !== 'string' || !entry.ledgerId.trim()) {
      throw new Error(`Entry ${line} must have a ledger selected.`);
    }

    const debitCents = toCents(entry.debit, `Entry ${line} debit`);
    const creditCents = toCents(entry.credit, `Entry ${line} credit`);

    if (debitCents > 0 && creditCents > 0) {
      throw new Error(`Entry ${line} cannot contain both a debit and a credit.`);
    }

    totalDebitCents += debitCents;
    totalCreditCents += creditCents;
  });

  if (totalDebitCents !== totalCreditCents) {
    const format = cents => `₹${(cents / 100).toFixed(2)}`;
    throw new Error(
      `Voucher is not balanced: debit ${format(totalDebitCents)} and credit ${format(totalCreditCents)}.`
    );
  }
}

/**
 * Build the ledger side of a sales invoice, including GST and rupee rounding.
 * Positive round-off is credited; negative round-off is debited.
 */
export function buildSalesVoucherEntries({
  settlementLedgerId,
  taxableAmount,
  totalAmount,
  taxType,
  cgstAmount = 0,
  sgstAmount = 0,
  igstAmount = 0,
  roundOffAmount = 0
}) {
  if (typeof settlementLedgerId !== 'string' || !settlementLedgerId.trim()) {
    throw new Error('A settlement ledger is required for a sales invoice.');
  }
  if (taxType !== 'Intra' && taxType !== 'Inter') {
    throw new Error('Sales tax type must be Intra or Inter.');
  }

  const entries = [
    { ledgerId: settlementLedgerId, debit: toCents(totalAmount, 'Invoice total') / 100, credit: 0 },
    { ledgerId: 'l-sales', debit: 0, credit: toCents(taxableAmount, 'Taxable amount') / 100 }
  ];

  const appendCredit = (ledgerId, amount, label) => {
    const cents = toCents(amount, label);
    if (cents > 0) entries.push({ ledgerId, debit: 0, credit: cents / 100 });
  };

  if (taxType === 'Inter') {
    appendCredit('l-igst', igstAmount, 'IGST amount');
  } else {
    appendCredit('l-cgst', cgstAmount, 'CGST amount');
    appendCredit('l-sgst', sgstAmount, 'SGST amount');
  }

  const roundOff = Number(roundOffAmount);
  if (!Number.isFinite(roundOff)) {
    throw new Error('Round-off amount must be finite.');
  }
  const roundOffCents = Math.round((Math.abs(roundOff) + Number.EPSILON) * 100);
  if (roundOffCents > 0) {
    entries.push({
      ledgerId: 'l-roundoff',
      debit: roundOff < 0 ? roundOffCents / 100 : 0,
      credit: roundOff > 0 ? roundOffCents / 100 : 0
    });
  }

  return entries;
}

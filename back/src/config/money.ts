// Money rules from docs/MONEY_RULES.md — the ONLY place the API computes fees.
// All amounts are integer Rupiah.

export const COMMISSION_RATE = 0.05;
export const PROTECTION_FEE = 5_000;
export const HANDLING_FEE_RATE = 0.035;
export const HANDLING_FEE_MIN = 4_000;
export const STORE_DEPOSIT = 500_000;
export const WITHDRAW_FEE = 4_000;
export const BANK_TAX = 2_500;

/** Handling fee = max(3.5% of price, Rp4.000) — paid by the buyer (§2). */
export function handlingFeeFor(price: number): number {
  return Math.max(Math.round(price * HANDLING_FEE_RATE), HANDLING_FEE_MIN);
}

export function commissionFor(price: number, rate = COMMISSION_RATE): number {
  return Math.round(price * rate);
}

export const GATEWAY_METHODS = ['QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC'] as const;
export type GatewayMethod = (typeof GATEWAY_METHODS)[number];
export const TOPUP_METHODS = [...GATEWAY_METHODS, 'BALANCE'] as const;
export type TopupMethod = (typeof TOPUP_METHODS)[number];

export const METHOD_LABEL: Record<TopupMethod, string> = {
  QRIS: 'QRIS',
  VA: 'Virtual Account',
  RETAIL: 'Retail',
  EWALLET: 'E-Wallet',
  CC: 'Kartu Kredit',
  BALANCE: 'Balance (BLC)',
};

/** Charge-to-customer surcharge per payment method (§8). */
export function surchargeFor(method: TopupMethod, amount: number): number {
  switch (method) {
    case 'QRIS':
      return Math.round(amount * 0.015);
    case 'VA':
    case 'RETAIL':
      return 5_000;
    case 'EWALLET':
      return Math.round(amount * 0.025);
    case 'CC':
      return Math.round(amount * 0.04) + 3_000;
    case 'BALANCE':
      return 0;
  }
}

export function discountFor(promo: { kind: 'PERCENT' | 'FIXED'; value: number; min_spend: number }, amount: number): number {
  if (amount < promo.min_spend) return 0;
  const discount = promo.kind === 'PERCENT' ? Math.round((amount * promo.value) / 100) : promo.value;
  return Math.min(discount, amount);
}

/** Preset Balance (BLC) voucher denominations (§8b). 1 BLC = Rp1. */
export const BLC_DENOMINATIONS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000];
export const BLC_MAX_QTY = 10;

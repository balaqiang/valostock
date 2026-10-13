// Money rules from docs/MONEY_RULES.md — the ONLY place the system computes prices and fees.
// All amounts are integer Rupiah.

/** Snap payment window; the job expires PENDING payments a few minutes after it (MONEY_RULES §1). */
export const PAYMENT_MINUTES = 60;
export const PAYMENT_EXPIRY_GRACE_MINUTES = 5;

/** Referral reward for the referrer on the referred Member's first successful top-up (§6). */
export const REFERRAL_REWARD = 10_000;

// ── Payment methods ──
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

/** Charge-to-customer surcharge per payment method for top-ups and Balance vouchers (§3). */
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

export interface PromoRule {
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
}

/** Below min_spend the code is valid but gives Rp0; never brings the price below Rp1 (§4). */
export function discountFor(rule: PromoRule, amount: number): number {
  if (amount < rule.min_spend) return 0;
  const discount = rule.kind === 'PERCENT' ? Math.round((amount * rule.value) / 100) : rule.value;
  return Math.min(discount, amount - 1);
}

export interface TopupPrice {
  basePrice: number;
  discount: number;
  surcharge: number;
  amount: number;
}

/** Total = price − discount + surcharge(method, price − discount) (§4). Used by the quote and the checkout. */
export function priceTopup(retailPrice: number, method: TopupMethod, promo: PromoRule | null): TopupPrice {
  const discount = promo ? discountFor(promo, retailPrice) : 0;
  const surcharge = surchargeFor(method, retailPrice - discount);
  return { basePrice: retailPrice, discount, surcharge, amount: retailPrice - discount + surcharge };
}

// ── Balance (BLC) vouchers (§5). 1 BLC = Rp1. ──
export const BLC_DENOMINATIONS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000];
export const BLC_MAX_QTY = 10;

export interface BalancePrice {
  credit: number;
  surcharge: number;
  amount: number;
}

export function priceBalanceFill(nominal: number, qty: number, method: GatewayMethod): BalancePrice {
  const credit = nominal * qty;
  const surcharge = surchargeFor(method, credit);
  return { credit, surcharge, amount: credit + surcharge };
}

// ── Top-up margin (§2) ──
export const TOPUP_MARGIN_PERCENT = 3;
/** Retail = Digiflazz price + 3%, rounded up to the next Rp100. Integer maths — no float rounding surprises. */
export function topupRetailFor(supplierPrice: number): number {
  return Math.ceil((supplierPrice * (100 + TOPUP_MARGIN_PERCENT)) / 10_000) * 100;
}

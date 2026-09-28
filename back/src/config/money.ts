// Money rules from docs/MONEY_RULES.md — the ONLY place the API computes fees.
// All amounts are integer Rupiah.

export const DEFAULT_COMMISSION_RATE = 0.05;
export const PROTECTION_FEE = 5_000;
export const HANDLING_FEE_RATE = 0.035;
export const HANDLING_FEE_MIN = 4_000;
export const STORE_DEPOSIT = 500_000;
export const WITHDRAW_FEE = 4_000;
export const BANK_TAX = 2_500;
export const TRANSFER_FEE = 4_000;
export const LOCK_FEE = 5_000;

/** Timers (docs/modeling/02-dfd.md §2.3, MONEY_RULES §9). */
export const ORDER_PAYMENT_MINUTES = 60;
export const LOCK_MINUTES = 30;
export const OFFER_HOURS = 24;
export const AUTO_COMPLETE_HOURS = 5;
export const DISPUTE_STORE_HOURS = 72;

/** Handling fee = max(3.5% of price, Rp4.000) — paid by the buyer (§2). */
export function handlingFeeFor(price: number): number {
  return Math.max(Math.round(price * HANDLING_FEE_RATE), HANDLING_FEE_MIN);
}

export function commissionFor(price: number, rate: number): number {
  return Math.round(price * rate);
}

/** Protection window by account price (§6): ≤ Rp10jt → 14 days, otherwise 30. */
export const protectionDaysFor = (price: number): number => (price > 10_000_000 ? 30 : 14);

// ── Store Premium (§5) ──
export const SUBSCRIPTION_PLANS = {
  FREE: { price: 0, commissionRate: 0.05, maxListings: 15, freeFeaturedSlots: 0 },
  PRO: { price: 99_000, commissionRate: 0.045, maxListings: 60, freeFeaturedSlots: 2 },
  BUSINESS: { price: 299_000, commissionRate: 0.04, maxListings: null, freeFeaturedSlots: 6 },
} as const;
export type SubscriptionTier = keyof typeof SUBSCRIPTION_PLANS;
export const SUBSCRIPTION_DAYS = 30;

// ── Featured ads (§7) ──
export const FEATURED_PRICES: Record<number, number> = { 1: 3_000, 3: 9_000, 7: 20_000, 14: 35_000, 30: 60_000 };
export const FREE_FIRST_WEEK_DAYS = 7;

// ── Loyalty & referral (§13b) ──
export const POINTS_PER_RUPIAH = 1 / 1_000; // 1 point per Rp1.000
export const POINTS_REDEEM_UNIT = 100; // 100 points → Rp1.000 Balance
export const RUPIAH_PER_REDEEM_UNIT = 1_000;
export const REFERRAL_REWARD = 10_000;
export const pointsFor = (amount: number): number => Math.floor(amount * POINTS_PER_RUPIAH);

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

/** Charge-to-customer surcharge per payment method for top-up & Balance (§8). */
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

export function discountFor(rule: { kind: 'PERCENT' | 'FIXED'; value: number; min_spend: number }, amount: number): number {
  if (amount < rule.min_spend) return 0;
  const discount = rule.kind === 'PERCENT' ? Math.round((amount * rule.value) / 100) : rule.value;
  return Math.min(discount, amount - 1);
}

/** Preset Balance (BLC) voucher denominations (§8b). 1 BLC = Rp1. */
export const BLC_DENOMINATIONS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000];
export const BLC_MAX_QTY = 10;

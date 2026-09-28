// Money rules shown in the UI — display-only mirrors of docs/MONEY_RULES.md.
// These are rules (code), not data: they are not stored in the database.

// ── Account purchases (§1, §2, §6) ──

/** Mandatory buyer protection per order (§6). */
export const PROTECTION_FEE = 5_000;

/** Optional 30-minute account lock (§1). */
export const LOCK_FEE = 5_000;

/** Handling fee = max(3.5% of price, Rp4.000) — buyer side (§2). */
export function handlingFeeFor(price: number): number {
  return Math.max(Math.round(price * 0.035), 4_000);
}

/** Protection window in days by account price (§6). */
export function protectionDaysFor(price: number): number {
  return price > 10_000_000 ? 30 : 14;
}

/** Store share for an item price at its subscription commission rate. */
export function storeReceives(itemPrice: number, commissionRate: number): number {
  return itemPrice - Math.round(itemPrice * commissionRate);
}

// ── Store payouts (§11) ──

export const WITHDRAW_FEE = 4_000;
export const BANK_TAX = 2_500;
export const TRANSFER_FEE = 4_000;

/** Featured-listing pricing (§7). */
export const featuredPricing = [
  { duration: "1 hari", price: 3_000 },
  { duration: "3 hari", price: 9_000 },
  { duration: "7 hari", price: 20_000 },
  { duration: "14 hari", price: 35_000 },
  { duration: "30 hari", price: 60_000 },
];

// ── Top-up payment methods & surcharges (§8) ──

export type PaymentMethodKind = "QRIS" | "VA" | "RETAIL" | "EWALLET" | "CC" | "BALANCE";

export type MockPaymentMethod = {
  kind: PaymentMethodKind;
  label: string;
  detail: string;
  /** Charge-to-customer rule per MONEY_RULES §8. */
  feeLabel: string;
  requiresAuth?: boolean;
};

export const paymentMethods: MockPaymentMethod[] = [
  { kind: "QRIS", label: "QRIS", detail: "Semua e-wallet & m-banking", feeLabel: "+1,5%" },
  { kind: "VA", label: "Virtual Account", detail: "BCA, BNI, BRI, Mandiri", feeLabel: "+Rp 5.000" },
  { kind: "EWALLET", label: "E-Wallet", detail: "DANA, OVO", feeLabel: "+2,5%" },
  { kind: "RETAIL", label: "Retail", detail: "Alfamart, Alfamidi, DAN+DAN", feeLabel: "+Rp 5.000" },
  { kind: "CC", label: "Kartu Kredit", detail: "Visa, Mastercard", feeLabel: "+4% + Rp 3.000" },
  {
    kind: "BALANCE",
    label: "Balance (BLC)",
    detail: "Saldo closed-loop — khusus top-up",
    feeLabel: "Tanpa biaya",
    requiresAuth: true,
  },
];

/** Mirror of the §8 charge-to-customer table. */
export function surchargeFor(kind: PaymentMethodKind, amount: number): number {
  switch (kind) {
    case "QRIS":
      return Math.round(amount * 0.015);
    case "VA":
    case "RETAIL":
      return 5_000;
    case "EWALLET":
      return Math.round(amount * 0.025);
    case "CC":
      return Math.round(amount * 0.04) + 3_000;
    case "BALANCE":
      return 0;
  }
}

export type PromoRule = {
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
};

export function discountFor(promo: PromoRule, amount: number): number {
  if (amount < promo.minSpend) return 0;
  return promo.kind === "PERCENT"
    ? Math.round((amount * promo.value) / 100)
    : promo.value;
}

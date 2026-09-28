import type { PaymentMethodKind } from '@/lib/fees';

// Preset BLC voucher denominations per docs/MONEY_RULES.md §8b
// (Rp1.000 … Rp5.000.000). 1 BLC = Rp 1.
export const BLC_DENOMINATIONS: readonly number[] = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000,
];

export const BLC_MAX_QTY = 10;

// Balance is filled via the payment gateway — Balance itself is not a fill method.
export const BLC_FILL_METHODS = ['QRIS', 'VA', 'RETAIL', 'EWALLET', 'CC'] as const satisfies readonly PaymentMethodKind[];
export type BlcFillMethod = (typeof BLC_FILL_METHODS)[number];

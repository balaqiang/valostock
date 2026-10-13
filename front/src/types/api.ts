// Response shapes of the Express API (back/). Mirrors docs/ARCHITECTURE.md §3.1
// and the route files in back/src/modules — keep both sides in sync.

export type UserRole = "USER" | "ADMIN";

/** GET /api/auth/me → { user } — never contains secrets. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  /** Closed-loop BLC balance (integer Rupiah, 1:1). */
  balance: number;
  referralCode: string;
  created_at: string;
}

/** GET /api/games, /api/games/:slug */
export interface Game {
  id: number;
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  isHot: boolean;
  uidLabel: string;
  uidHint: string;
  uidExtraLabel: string | null;
  /** Fixed choices for the extra field (e.g. Genshin server) — rendered as a dropdown. */
  uidExtraOptions: string[] | null;
  gradient: string;
  topupCurrency: string | null;
  image: string | null;
}

export interface TopupProduct {
  id: string;
  name: string;
  amountLabel: string;
  retailPrice: number;
  section: "SPECIAL" | "INSTANT";
  icon: string | null;
  popular: boolean;
}

export type GatewayMethod = "QRIS" | "VA" | "RETAIL" | "EWALLET" | "CC";
export type TopupMethod = GatewayMethod | "BALANCE";

/** GET /api/topup/quote — the Ringkasan Pesanan, computed by the API. */
export interface TopupQuote {
  basePrice: number;
  discount: number;
  surcharge: number;
  amount: number;
  promo: { code: string; label: string; minSpend: number; applied: boolean } | null;
}

/** GET /api/balance/quote */
export interface BalanceQuote {
  credit: number;
  surcharge: number;
  amount: number;
}

/** GET /api/balance/vouchers */
export interface BalanceVoucherOptions {
  denominations: number[];
  maxQty: number;
}

export type TransactionKind = "GAME_TOPUP" | "BALANCE_TOPUP";

/** One top-up or Balance invoice (member history, admin lists). */
export interface TransactionRecord {
  id: string;
  invoice_number: string;
  kind: TransactionKind;
  item_name: string;
  /** null for Balance invoices. */
  user_game_id: string | null;
  game_zone_id: string | null;
  contact_email: string | null;
  amount: number;
  /** Display label, e.g. "Virtual Account". */
  payment_method: string;
  status: string;
  gateway_ref: string | null;
  created_at: string;
}

/** GET /api/topup/invoice — public view: game account masked, contact hidden. */
export type PublicTransaction = Omit<TransactionRecord, "user_game_id" | "game_zone_id" | "contact_email"> & {
  user_game_id_masked: string | null;
  game_zone_id_masked: string | null;
};

export type BalanceLedgerType = "TOPUP_CREDIT" | "SPEND_TOPUP" | "REFERRAL_CREDIT";

export interface BalanceLedgerRecord {
  id: string;
  type: BalanceLedgerType;
  amount: number;
  balance_after: number;
  reference: string;
  created_at: string;
}

/** How the payer completes a payment: Midtrans Snap (or the simulator), or already settled from Balance. */
export type PaymentSession = { mode: "MIDTRANS_SNAP"; snapToken: string; redirectUrl: string } | { mode: "BALANCE" };

/** GET /api/payments/:invoice/status */
export interface PaymentStatusView {
  invoice: string;
  purpose: "TOPUP" | "BALANCE_FILL";
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  amount: number;
  method: string;
  redirectUrl: string | null;
  /** Where to send the user next (invoice check or Balance page). */
  next: string;
}

/** GET /api/admin/topup-products */
export interface AdminProduct {
  id: string;
  gameId: number;
  gameName: string;
  name: string;
  amountLabel: string;
  supplierPrice: number;
  retailPrice: number;
  margin: number;
  section: "SPECIAL" | "INSTANT";
  icon: string | null;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
  sold: number;
}

/** GET /api/admin/analytics */
export interface AnalyticsSummary {
  totalRevenue: number;
  totalTransactions: number;
  uniqueAccounts: number;
  avgTicket: number;
}

export interface GameAccountAnalytic {
  user_game_id: string;
  game_zone_id: string | null;
  topup_count: number;
  total_spent: number;
  avg_spent: number;
  first_topup_at: string;
  last_topup_at: string;
  linked_to_user: boolean;
}

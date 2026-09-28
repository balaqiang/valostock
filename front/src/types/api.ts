// Response shapes of the Express API (back/). Mirrors docs/ERD.md and the
// API contract in docs/ARCHITECTURE.md §3.2 — keep both sides in sync.

export type UserRole = "USER" | "ADMIN";

/** GET /api/auth/me → { user } — never contains secrets. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Closed-loop BLC balance (integer Rupiah, 1:1). */
  balance: number;
  role: UserRole;
  created_at: string;
}

export type TransactionKind = "GAME_TOPUP" | "BALANCE_TOPUP";

export interface TransactionRecord {
  id: string;
  invoice_number: string;
  user_game_id: string;
  game_zone_id: string | null;
  item_id: string;
  item_name: string;
  amount: number;
  payment_method: string;
  status: string;
  /** Midtrans transaction id (null for Balance payments or before payment). */
  gateway_ref: string | null;
  user_id: string | null;
  kind: TransactionKind;
  created_at: string;
}

export type BalanceLedgerType = "TOPUP_CREDIT" | "SPEND_TOPUP" | "REFUND_CREDIT" | "ADJUSTMENT";

export interface BalanceLedgerRecord {
  id: string;
  user_id: string;
  type: BalanceLedgerType;
  amount: number;
  balance_after: number;
  reference: string;
  created_at: string;
}

/**
 * How the buyer completes a payment: redirect to Midtrans Snap, or already
 * settled from Balance. PAID is only ever set by the Midtrans webhook.
 */
export type PaymentSession =
  | { mode: "MIDTRANS_SNAP"; snapToken: string; redirectUrl: string }
  | { mode: "BALANCE" };

export interface GameAccountAnalytic {
  user_game_id: string;
  game_zone_id: string | null;
  topup_count: number;
  total_spent: number;
  avg_spent: number;
  first_topup_at: string;
  last_topup_at: string;
  linked_to_user: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalTransactions: number;
  uniqueAccounts: number;
  avgTicket: number;
}

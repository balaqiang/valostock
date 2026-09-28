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

// ── Account orders (GET /api/me/orders, GET /api/orders/:id) ──

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_REKBER"
  | "SAFE"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  /** Who is looking: the buyer, the owner of the selling store, or an admin. */
  viewerRole: "BUYER" | "STORE" | "ADMIN";
  catalog: { id: string; title: string; image: string; game: string };
  store: { slug: string; name: string };
  buyer: { name: string };
  roomCode: string;
  itemPrice: number;
  handlingFee: number;
  protectionFee: number;
  totalPaid: number;
  commissionRate: number;
  commission: number;
  storeReceives: number;
  paymentMethod: string | null;
  payment: { invoice: string; status: string; redirectUrl: string | null } | null;
  createdAt: string;
  paidAt: string | null;
  safeAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface RekberMessage {
  id: number;
  senderRole: "BUYER" | "STORE" | "ADMIN" | "SYSTEM";
  senderName: string;
  body: string;
  createdAt: string;
}

/** GET /api/payments/:invoice/status */
export interface PaymentStatusView {
  invoice: string;
  purpose: "TOPUP" | "BALANCE_FILL" | "ORDER" | "STORE_DEPOSIT";
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  amount: number;
  method: string;
  redirectUrl: string | null;
  /** Where to send the user next (order page, invoice check, …). */
  next: string;
}

// ── Store owner area (GET /api/stores/me …) ──

export type StoreStatus = "PENDING_DEPOSIT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface StoreContext {
  id: string;
  slug: string;
  name: string;
  type: "OWNER" | "RESELLER";
  status: StoreStatus;
  /** Name on the owner's ID card — verified manually by an admin (no KYC provider). */
  ownerLegalName: string;
  description: string;
  depositAmount: number;
  depositStatus: "UNPAID" | "HELD" | "RELEASED";
  identityVerified: boolean;
  reviewNote: string | null;
  createdAt: string;
}

export interface StoreCatalog {
  id: string;
  vsCode: string;
  title: string;
  game: string;
  price: number;
  status: "DRAFT" | "LISTED" | "LOCKED" | "IN_ORDER" | "SOLD" | "DELISTED";
  views: number;
  accountChecked: boolean;
  createdAt: string;
}

export interface StoreLedgerEntry {
  id: string;
  bucket: "ESCROW" | "AVAILABLE";
  type: string;
  amount: number;
  balanceAfter: number;
  refType: string;
  refId: string;
  note: string | null;
  createdAt: string;
}

export interface Withdrawal {
  /** Withdrawal number shown to people, e.g. WD-260928-7K3QX2. */
  id: string;
  amount: number;
  fee: number;
  bank: string;
  accountName: string;
  nameMatch: "MATCH" | "REVIEW" | "MISMATCH";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  reviewNote: string | null;
  date: string;
}

// ── Admin ──

export interface AdminStore extends Omit<StoreContext, "identityVerified"> {
  owner: { name: string; email: string };
}

export interface AdminWithdrawal extends Withdrawal {
  uuid: string;
  store: { name: string; slug: string; ownerLegalName: string };
}

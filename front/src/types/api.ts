// Response shapes of the Express API (back/). Mirrors docs/ARCHITECTURE.md
// and the route files in back/src/modules — keep both sides in sync.
import type { CatalogStatus, FieldTemplate, Listing, StoreLevel, StoreType } from "@/types/domain";

export type UserRole = "USER" | "ADMIN";

/** GET /api/auth/me → { user } — never contains secrets. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Closed-loop BLC balance (integer Rupiah, 1:1). */
  balance: number;
  loyaltyPoints: number;
  referralCode: string;
  role: UserRole;
  /** Admin permissions (`modul:aksi`), empty for normal users. */
  permissions: string[];
  store: { id: string; slug: string; name: string; status: StoreStatus; type: StoreType } | null;
  unreadNotifications: number;
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
  gateway_ref: string | null;
  user_id: string | null;
  kind: TransactionKind;
  created_at: string;
}

export type BalanceLedgerType = "TOPUP_CREDIT" | "SPEND_TOPUP" | "REFUND_CREDIT" | "LOYALTY_CREDIT" | "REFERRAL_CREDIT" | "ADJUSTMENT";

export interface BalanceLedgerRecord {
  id: string;
  user_id: string;
  type: BalanceLedgerType;
  amount: number;
  balance_after: number;
  reference: string;
  created_at: string;
}

/** How the payer completes a payment: Midtrans Snap (or the simulator), or already settled from Balance. */
export type PaymentSession = { mode: "MIDTRANS_SNAP"; snapToken: string; redirectUrl: string } | { mode: "BALANCE" };

export type GatewayMethod = "QRIS" | "VA" | "RETAIL" | "EWALLET" | "CC";

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

// ── Orders ──

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "IN_REKBER" | "SAFE" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "DISPUTED";

export interface OrderItem {
  catalogId: string;
  vsCode: string;
  title: string;
  price: number;
  game: string;
  image: string;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  viewerRole: "BUYER" | "STORE" | "ADMIN";
  catalog: { id: string; title: string; image: string; game: string };
  items: OrderItem[];
  isBundle: boolean;
  store: { slug: string; name: string; type: StoreType };
  buyer: { name: string; email?: string };
  roomCode: string;
  itemsSubtotal: number;
  voucherCode: string | null;
  voucherDiscount: number;
  viaOffer: boolean;
  itemPrice: number;
  handlingFee: number;
  protectionFee: number;
  totalPaid: number;
  commissionRate: number;
  commission: number;
  storeReceives: number;
  paymentMethod: string | null;
  payment: { invoice: string; status: string; redirectUrl: string | null } | null;
  dispute: { id: string; status: DisputeStatus } | null;
  rated: boolean;
  protectionUntil: string | null;
  canDispute: boolean;
  canRate: boolean;
  autoCompleteAt: string | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  safeAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface Attachment {
  path: string;
  url: string | null;
}

export interface RekberMessage {
  id: number;
  senderRole: "BUYER" | "STORE" | "ADMIN" | "SYSTEM";
  senderName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
}

/** GET /api/catalogs/:id/buy-context */
export interface BuyContext {
  lock: { mine: boolean; expiresAt: string } | null;
  offer: { id: string; amount: number; counterAmount: number | null; status: OfferStatus; expiresAt: string; finalAmount: number | null } | null;
  wishlisted: boolean;
  following: boolean;
  vouchers: { code: string; kind: "PERCENT" | "FIXED"; value: number; minSpend: number }[];
  openOrderId: string | null;
  isOwner: boolean;
}

export interface PublicBundle {
  id: string;
  title: string;
  bundlePrice: number;
  itemsTotal: number;
  items: { id: string; title: string; price: number; image: string }[];
}

export interface PublicRating {
  buyer: string;
  overall: number;
  descAccuracy: number;
  attitude: number;
  deliverySpeed: number;
  comment: string | null;
  reply: string | null;
  date: string;
}

// ── Offers ──

export type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "USED";

export interface OfferView {
  id: string;
  catalog: { id: string; title: string; vsCode: string | null; price: number; image: string };
  store: { name: string; slug: string };
  buyer: { name: string };
  amount: number;
  counterAmount: number | null;
  finalAmount: number | null;
  status: OfferStatus;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
}

// ── Disputes ──

export type DisputeStatus = "OPEN" | "STORE_RESPONDED" | "IN_REVIEW" | "RESOLVED_BUYER" | "RESOLVED_STORE" | "CANCELLED";
export type DisputeReason = "NOT_DELIVERED" | "NOT_AS_DESCRIBED" | "RECALLED" | "OTHER";

export interface DisputeSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  storeDeadline: string;
  overdue: boolean;
  openedAfterCompletion: boolean;
  refundAmount: number;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  buyer: { name: string };
  store: { name: string; slug: string };
  itemPrice: number;
  totalPaid: number;
}

export interface DisputeEvent {
  id: number;
  actorRole: "BUYER" | "STORE" | "ADMIN" | "SYSTEM";
  actorName: string;
  type: "OPENED" | "STATEMENT" | "EVIDENCE" | "ADMIN_NOTE" | "RESOLVED";
  body: string;
  attachments: Attachment[];
  createdAt: string;
}

export interface DisputeDetail {
  dispute: DisputeSummary;
  viewerRole: "BUYER" | "STORE" | "ADMIN";
  events: DisputeEvent[];
}

// ── Payments ──

export type PaymentPurpose = "TOPUP" | "BALANCE_FILL" | "ORDER" | "STORE_DEPOSIT" | "SUBSCRIPTION" | "AD" | "LOCK";

/** GET /api/payments/:invoice/status */
export interface PaymentStatusView {
  invoice: string;
  purpose: PaymentPurpose;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  amount: number;
  method: string;
  redirectUrl: string | null;
  /** Where to send the user next (order page, invoice check, …). */
  next: string;
}

/** POST endpoints that start a payment → { invoice, payment }. */
export interface PaymentStart {
  invoice: string;
  payment: PaymentSession;
}

// ── Store owner area ──

export type StoreStatus = "PENDING_DEPOSIT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "CLOSING" | "CLOSED";

export interface StoreContext {
  id: string;
  slug: string;
  name: string;
  type: StoreType;
  level: StoreLevel;
  status: StoreStatus;
  ownerLegalName: string;
  description: string;
  gradient: string;
  depositAmount: number;
  depositStatus: "UNPAID" | "HELD" | "RELEASED";
  identityVerified: boolean;
  rating: number;
  reviews: number;
  sold: number;
  followers: number;
  serviceScore: { descAccuracy: number; attitude: number; deliverySpeed: number };
  reviewNote: string | null;
  createdAt: string;
  subscription?: {
    tier: "FREE" | "PRO" | "BUSINESS";
    commissionRate: number;
    maxListings: number | null;
    freeFeaturedSlots: number;
    usedFeaturedSlots: number;
    periodEnd: string | null;
  } | null;
  balance?: { escrow: number; available: number; deposit: number };
  /** Full deposit required for the Deposit Secured badge (Rp500.000). */
  depositMinimum?: number;
  pendingDeposit?: { invoice: string; redirectUrl: string | null } | null;
}

export interface CatalogReview {
  id: string;
  decision: "SUBMITTED" | "APPROVED" | "REJECTED" | "TAKEDOWN";
  reasons: string[];
  note: string | null;
  date: string;
  actor: string;
}

export interface Inspection {
  checklist: Record<string, boolean>;
  notes: string | null;
  result: "PASSED" | "FAILED";
  date: string;
  media: { path: string; url: string }[];
}

/** GET /api/stores/me/catalogs/:id and /api/admin/catalogs/:id */
export interface CatalogDetail {
  listing: Listing;
  imageItems: { id: string; url: string }[];
  fields: FieldTemplate[];
  reviews: CatalogReview[];
  inspection: Inspection | null;
  submitCount: number;
}

export interface StoreLedgerEntry {
  id: string;
  bucket: "ESCROW" | "AVAILABLE" | "DEPOSIT";
  type: string;
  amount: number;
  balanceAfter: number;
  refType: string;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Withdrawal {
  /** Withdrawal number shown to people, e.g. WD-260928-7K3QX2. */
  id: string;
  uuid: string;
  amount: number;
  fee: number;
  bank: string;
  accountName: string;
  nameMatch: "MATCH" | "REVIEW" | "MISMATCH";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  reviewNote: string | null;
  date: string;
}

export interface TransferView {
  id: string;
  uuid: string;
  amount: number;
  fee: number;
  nameMatch: "MATCH" | "REVIEW";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  reviewNote: string | null;
  date: string;
  order: { id: string; number: string };
  seller: { alias: string; bank: string; name: string };
  store: { name: string; slug: string };
}

export interface ExternalSeller {
  id: string;
  alias: string;
  payoutBank: string;
  payoutAccount: string;
  payoutName: string;
  note: string | null;
  createdAt: string;
  transfers: number;
  paidTotal: number;
}

export interface StoreVoucherFull {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  quota: number | null;
  used: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FlashSaleView {
  id: string;
  catalog: { id: string; title: string; vsCode: string | null; price: number };
  salePrice: number;
  startsAt: string;
  endsAt: string;
  state: "SCHEDULED" | "RUNNING" | "ENDED";
}

export interface BundleView {
  id: string;
  title: string;
  bundlePrice: number;
  status: "ACTIVE" | "INACTIVE" | "SOLD";
  createdAt: string;
  items: { id: string; title: string; price: number; status: CatalogStatus }[];
  itemsTotal: number;
}

export interface AdView {
  id: string;
  catalog: { id: string; title: string };
  durationDays: number;
  price: number;
  isFree: boolean;
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "STOPPED";
  startsAt: string | null;
  endsAt: string | null;
  stopReason: string | null;
  createdAt: string;
}

export interface StoreRatingView {
  id: string;
  orderNumber: string;
  buyer: string;
  overall: number;
  descAccuracy: number;
  attitude: number;
  deliverySpeed: number;
  comment: string | null;
  reply: string | null;
  date: string;
}

export interface ConversationView {
  id: string;
  side: "BUYER" | "STORE";
  counterpart: { name: string; slug: string | null };
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
}

export interface ChatMessage {
  id: number;
  mine: boolean;
  senderRole: "BUYER" | "STORE";
  body: string;
  catalog: { id: string; title: string | null } | null;
  createdAt: string;
}

export interface NotificationView {
  id: string;
  kind: "ORDER" | "SYSTEM" | "STORE";
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ReportView {
  id: string;
  targetType: "CATALOG" | "STORE" | "USER";
  targetId: string;
  targetName: string | null;
  reason: "SCAM" | "FAKE" | "OFF_PLATFORM" | "ABUSE" | "OTHER";
  detail: string | null;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  resolutionNote: string | null;
  createdAt: string;
}

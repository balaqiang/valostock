// Admin panel data (docs/ADMIN_PANEL.md). Every endpoint re-checks the admin's
// permission on the server; null means "not allowed" (403) or unreachable.
import { serverApiGet } from '@/lib/api-server';
import type {
  AnalyticsSummary,
  CatalogDetail,
  DisputeSummary,
  GameAccountAnalytic,
  OrderView,
  StoreContext,
  TransactionRecord,
  TransferView,
  Withdrawal,
} from '@/types/api';
import type { FieldTemplate, Game, HelpBlock, HelpCategory, Listing, NewsArticle } from '@/types/domain';

export const adminGet = <T>(path: string) => serverApiGet<T>(`/api/admin${path}`);

export type QueueCounts = { catalogs: number; stores: number; reports: number; disputes: number; withdrawals: number; transfers: number };

export async function getQueueCounts(): Promise<{ counts: QueueCounts; permissions: string[] } | null> {
  return adminGet<{ counts: QueueCounts; permissions: string[] }>('/queue-counts');
}

export type AdminDashboard = {
  kpi: Record<string, number>;
  queues: Record<string, number>;
  recent: { id: number; action: string; targetType: string; targetId: string; actor: string; date: string }[];
};

export type AdminCatalogRow = Listing & { submitCount: number; storeType: string; storeLevel: string };
export type AdminCatalogDetail = CatalogDetail & {
  store: (StoreContext & { sanctions: number; listedCount: number }) | null;
  reasons: string[];
};

export type AdminStoreRow = StoreContext & { owner: { name: string; email: string }; tier: string; listedCount: number };
export type AdminStoreDetail = {
  store: StoreContext & { owner: { name: string; email: string; phone: string | null } };
  subscription: { tier: string; current_period_end: string | null } | null;
  catalogs: Record<string, number>;
  orders: { id: string; number: string; status: string; itemPrice: number; date: string }[];
  balance: { escrow: number; available: number };
  ledger: { id: string; bucket: string; type: string; amount: number; balanceAfter: number; note: string | null; date: string }[];
  sanctions: { id: string; type: string; amount: number; reason: string; admin: string; date: string }[];
  history: { id: number; action: string; detail: unknown; actor: string; date: string }[];
};

export type AdminReport = {
  id: string;
  targetType: 'CATALOG' | 'STORE' | 'USER';
  targetId: string;
  targetName: string | null;
  targetSlug: string | null;
  reason: 'SCAM' | 'FAKE' | 'OFF_PLATFORM' | 'ABUSE' | 'OTHER';
  detail: string | null;
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string | null;
  reporter: string;
  createdAt: string;
};

export type AdminPayment = {
  id: string;
  invoice: string;
  purpose: string;
  amount: number;
  method: string;
  status: string;
  paymentType: string | null;
  user: string | null;
  createdAt: string;
  paidAt: string | null;
};
export type AdminWebhook = { id: number; source: string; externalId: string; signatureValid: boolean; processed: boolean; invoice: string | null; receivedAt: string };

export type AdminWithdrawal = Withdrawal & { store: { name: string; slug: string; ownerLegalName: string } };

export type AdminFinance = {
  days: number;
  revenue: Record<string, number>;
  balances: Record<string, number>;
  payouts: { kind: string; status: string; n: number; total: number }[];
  daily: { day: string; gmv: number; commission: number; topup: number }[];
};

export type AdminAds = {
  ads: {
    id: string;
    catalog: { id: string; title: string };
    store: string;
    durationDays: number;
    price: number;
    isFree: boolean;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    stopReason: string | null;
  }[];
  subscriptions: { storeId: string; store: { name: string; slug: string }; tier: string; commissionRate: number; periodEnd: string | null; featuredSlots: string }[];
};

export type AdminGame = Game & { id: number; fieldCount: number; listedCount: number; productCount: number };
export type AdminField = FieldTemplate & { usedBy: number };
export type AdminProduct = {
  id: string;
  gameId: number;
  gameSlug: string;
  gameName: string;
  name: string;
  amountLabel: string;
  retailPrice: number;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
  sold: number;
};
export type AdminPromo = {
  id: number;
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  minSpend: number;
  label: string;
  quota: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};
export type AdminHelp = {
  id: number;
  slug: string;
  title: string;
  category: HelpCategory;
  excerpt: string;
  body: HelpBlock[];
  popular: boolean;
  isPublished: boolean;
  helpfulCount: number;
  sortOrder: number;
  updatedAt: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  balance: number;
  points: number;
  isBanned: boolean;
  banReason: string | null;
  orders: number;
  store: string | null;
  createdAt: string;
};

export type AdminUserDetail = {
  user: Omit<AdminUserRow, 'orders' | 'store'> & { referralCode: string };
  store: { id: string; name: string; slug: string; status: string } | null;
  orders: { id: string; number: string; status: string; total: number; date: string }[];
  topups: { invoice: string; status: string; amount: number; date: string }[];
  ledger: { type: string; amount: number; balanceAfter: number; reference: string; date: string }[];
  reports: { made: number; received: number } | null;
};

export type AdminRbac = {
  admins: { id: string; name: string; email: string; roles: string[] }[];
  roles: { key: string; name: string; description: string | null; permissions: string[] }[];
  permissions: { key: string; module: string; description: string }[];
};

export type AuditEntry = { id: number; action: string; targetType: string; targetId: string; detail: unknown; ip: string | null; actor: string; date: string };

export type {
  AnalyticsSummary,
  DisputeSummary,
  GameAccountAnalytic,
  NewsArticle,
  OrderView,
  TransactionRecord,
  TransferView,
};

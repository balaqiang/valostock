// Store-dashboard data. Every call is scoped by the API to the store the
// logged-in user owns (GET /api/stores/me/…) — never picked by a URL slug.
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { serverApiGet } from '@/lib/api-server';
import type {
  AdView,
  BundleView,
  CatalogDetail,
  ConversationView,
  DisputeSummary,
  ExternalSeller,
  FlashSaleView,
  OfferView,
  OrderStatus,
  OrderView,
  StoreContext,
  StoreLedgerEntry,
  StoreRatingView,
  StoreVoucherFull,
  TransferView,
  Withdrawal,
} from '@/types/api';
import type { CatalogStatus, Listing } from '@/types/domain';

export type { StoreContext };

/** The logged-in user's store, whatever its status (null = no store yet). */
export const getMyStore = cache(async (): Promise<StoreContext | null> => {
  return (await serverApiGet<{ store: StoreContext | null }>('/api/stores/me'))?.store ?? null;
});

/**
 * For the store dashboard: the user's store, or a redirect — guests to /login,
 * users without a store (or still paying the deposit / rejected) to /sell.
 * PENDING_REVIEW stores may prepare draft catalogs; SUSPENDED stores are read-only
 * (the API refuses selling actions for both).
 */
export const requireStore = cache(async (returnTo: string): Promise<StoreContext> => {
  await requireUser(returnTo);
  const store = await getMyStore();
  if (!store || !['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'CLOSING'].includes(store.status)) redirect('/sell');
  return store;
});

const get = <T>(path: string) => serverApiGet<T>(`/api/stores/me${path}`);

export type StoreDashboard = {
  catalogs: Partial<Record<CatalogStatus, number>>;
  orders: Partial<Record<OrderStatus, number>>;
  balance: { escrow: number; available: number };
  last30Days: { gmv: number; net: number; n: number } | null;
  pendingOffers: number;
  unreadChats: number;
};

export async function getDashboard(): Promise<StoreDashboard | null> {
  return get<StoreDashboard>('/dashboard');
}

/** Sections are null when the store's plan does not include them (MONEY_RULES §5). */
export type StoreAnalytics = {
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  daily: { day: string; orders: number; gmv: number }[] | null;
  topViewed: { id: string; title: string; vsCode: string | null; views: number; status: CatalogStatus; price: number }[] | null;
  byGame: { game: string; sold: number; gmv: number }[] | null;
  funnel: { views: number; orders: number; wishlists: number };
};

export async function getAnalytics(): Promise<StoreAnalytics | null> {
  return get<StoreAnalytics>('/analytics');
}

export async function getMyCatalogs(status?: CatalogStatus): Promise<Listing[]> {
  return (await get<{ catalogs: Listing[] }>(`/catalogs${status ? `?status=${status}` : ''}`))?.catalogs ?? [];
}

export async function getMyCatalog(id: string): Promise<CatalogDetail | null> {
  return get<CatalogDetail>(`/catalogs/${encodeURIComponent(id)}`);
}

export async function getStoreOrders(): Promise<OrderView[]> {
  return (await get<{ orders: OrderView[] }>('/orders'))?.orders ?? [];
}

export async function getStoreOffers(): Promise<OfferView[]> {
  return (await get<{ offers: OfferView[] }>('/offers'))?.offers ?? [];
}

export async function getStoreDisputes(): Promise<DisputeSummary[]> {
  return (await get<{ disputes: DisputeSummary[] }>('/disputes'))?.disputes ?? [];
}

export async function getStoreBalance(): Promise<{ available: number; escrow: number; deposit: number; ledger: StoreLedgerEntry[] }> {
  return (await get<{ available: number; escrow: number; deposit: number; ledger: StoreLedgerEntry[] }>('/balance')) ?? { available: 0, escrow: 0, deposit: 0, ledger: [] };
}

export async function getWithdrawals(): Promise<Withdrawal[]> {
  return (await get<{ withdrawals: Withdrawal[] }>('/withdrawals'))?.withdrawals ?? [];
}

export type SubscriptionInfo = {
  current: { tier: 'FREE' | 'PRO' | 'BUSINESS'; current_period_end: string | null; used_featured_slots: number; free_featured_slots: number } | null;
  plans: { tier: 'FREE' | 'PRO' | 'BUSINESS'; price: number; commissionRate: number; maxListings: number | null; freeFeaturedSlots: number }[];
  history: { invoice: string; amount: number; status: string; tier: string; date: string }[];
};

export async function getSubscription(): Promise<SubscriptionInfo | null> {
  return get<SubscriptionInfo>('/subscription');
}

export async function getVouchers(): Promise<StoreVoucherFull[]> {
  return (await get<{ vouchers: StoreVoucherFull[] }>('/vouchers'))?.vouchers ?? [];
}

export async function getFlashSales(): Promise<FlashSaleView[]> {
  return (await get<{ flashSales: FlashSaleView[] }>('/flash-sales'))?.flashSales ?? [];
}

export async function getBundles(): Promise<BundleView[]> {
  return (await get<{ bundles: BundleView[] }>('/bundles'))?.bundles ?? [];
}

export type AdsInfo = { ads: AdView[]; prices: Record<string, number>; freeFirstWeekAvailable: boolean; freeSlotsLeft: number };

export async function getAds(): Promise<AdsInfo> {
  return (await get<AdsInfo>('/ads')) ?? { ads: [], prices: {}, freeFirstWeekAvailable: false, freeSlotsLeft: 0 };
}

export async function getRatings(): Promise<{ summary: StoreContext; ratings: StoreRatingView[] } | null> {
  return get<{ summary: StoreContext; ratings: StoreRatingView[] }>('/ratings');
}

export async function getStoreConversations(): Promise<ConversationView[]> {
  return (await get<{ conversations: ConversationView[] }>('/conversations'))?.conversations ?? [];
}

export async function getExternalSellers(): Promise<ExternalSeller[]> {
  return (await get<{ sellers: ExternalSeller[] }>('/external-sellers'))?.sellers ?? [];
}

export async function getExternalSeller(id: string): Promise<{ seller: ExternalSeller; transfers: TransferView[] } | null> {
  return get<{ seller: ExternalSeller; transfers: TransferView[] }>(`/external-sellers/${encodeURIComponent(id)}`);
}

export type TransfersInfo = {
  transfers: TransferView[];
  eligibleOrders: { id: string; number: string; storeReceives: number; completedAt: string }[];
};

export async function getTransfers(): Promise<TransfersInfo> {
  return (await get<TransfersInfo>('/transfers')) ?? { transfers: [], eligibleOrders: [] };
}

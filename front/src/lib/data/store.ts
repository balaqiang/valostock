// Store-dashboard data.
// - Store identity, catalogs, orders, balance and withdrawals come from the
//   Express API (GET /api/stores/me/…), scoped to the store the logged-in
//   user owns — the web app never picks a store by a URL slug.
// - Subscription, ads, vouchers, flash sales, bundles, analytics, ratings,
//   chats, external sellers and notification channels are NOT in the
//   prototype: they show demo data of the persona store (NusaGame) only.
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { serverApiGet } from '@/lib/api-server';
import * as persona from '@/lib/mock/store-dashboard';
import type {
  MockAdCampaign,
  MockBundle,
  MockExternalSeller,
  MockFlashSale,
  MockIncomingOffer,
  MockNotifChannel,
  MockStoreCatalog,
  MockStoreOrder,
  MockStoreRating,
  MockStoreVoucherFull,
  MockTransferRequest,
  StoreOrderStatus,
} from '@/lib/mock/store-dashboard';
import type { OrderView, StoreContext, StoreLedgerEntry, Withdrawal } from '@/types/api';

export type { StoreContext };

/** The logged-in user's store, whatever its status (null = no store yet). */
export const getMyStore = cache(async (): Promise<StoreContext | null> => {
  return (await serverApiGet<{ store: StoreContext | null }>('/api/stores/me'))?.store ?? null;
});

/**
 * For the store dashboard: the user's ACTIVE store, or a redirect — guests to
 * /login, users without an active (admin-verified) store to /sell.
 */
export const requireStore = cache(async (returnTo: string): Promise<StoreContext> => {
  await requireUser(returnTo);
  const store = await getMyStore();
  if (!store || store.status !== 'ACTIVE') redirect('/sell');
  return store;
});

// ── API-backed ──

export async function getStoreBalance(slug: string): Promise<{ available: number; escrow: number; ledger: StoreLedgerEntry[] }> {
  void slug; // the API scopes to the session's own store
  const data = await serverApiGet<{ available: number; escrow: number; ledger: StoreLedgerEntry[] }>('/api/stores/me/balance');
  return data ?? { available: 0, escrow: 0, ledger: [] };
}

export async function getMyCatalogs(slug: string): Promise<MockStoreCatalog[]> {
  void slug;
  return (await serverApiGet<{ catalogs: MockStoreCatalog[] }>('/api/stores/me/catalogs'))?.catalogs ?? [];
}

export async function getMyCatalog(slug: string, id: string): Promise<MockStoreCatalog | undefined> {
  return (await getMyCatalogs(slug)).find((catalog) => catalog.id === id);
}

/** A store order in the dashboard's shape (+ the human order number). */
export type StoreOrder = MockStoreOrder & { orderNumber: string };

const toStoreOrder = (order: OrderView): StoreOrder => ({
  id: order.id,
  orderNumber: order.orderNumber,
  catalogId: order.catalog.id,
  title: order.catalog.title,
  buyer: order.buyer.name,
  itemPrice: order.itemPrice,
  status: order.status as StoreOrderStatus,
  roomCode: order.roomCode,
  createdAt: order.createdAt,
  safeAt: order.safeAt ?? undefined,
});

/** Orders the store has to act on or has handled (paid onwards), newest first. */
export async function getStoreOrders(slug: string): Promise<StoreOrder[]> {
  void slug;
  const orders = (await serverApiGet<{ orders: OrderView[] }>('/api/stores/me/orders'))?.orders ?? [];
  return orders.map(toStoreOrder);
}

export async function getWithdrawals(slug: string): Promise<Withdrawal[]> {
  void slug;
  return (await serverApiGet<{ withdrawals: Withdrawal[] }>('/api/stores/me/withdrawals'))?.withdrawals ?? [];
}

// ── Demo-only (persona store) ──

/** Demo rows belong to the persona store only; any other store sees none. */
function personaRows<T>(slug: string, rows: T[]): T[] {
  return slug === persona.myStoreSlug ? rows : [];
}

export type Subscription = {
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  commissionRate: number;
  maxListings: number;
  freeFeaturedSlots: number;
  usedFeaturedSlots: number;
  currentPeriodEnd: string;
};

/** Subscriptions are future work: every store is on the Free plan (5% commission). */
const FREE_PLAN: Subscription = {
  tier: 'FREE',
  commissionRate: 0.05,
  maxListings: 15,
  freeFeaturedSlots: 0,
  usedFeaturedSlots: 0,
  currentPeriodEnd: '',
};

export async function getSubscription(slug: string): Promise<Subscription> {
  void slug;
  return FREE_PLAN;
}

export async function getIncomingOffers(slug: string): Promise<MockIncomingOffer[]> {
  return personaRows(slug, persona.incomingOffers);
}

export async function getExternalSellers(slug: string): Promise<MockExternalSeller[]> {
  return personaRows(slug, persona.externalSellers);
}

export async function getExternalSeller(slug: string, id: string): Promise<MockExternalSeller | undefined> {
  return (await getExternalSellers(slug)).find((seller) => seller.id === id);
}

export async function getTransferRequests(slug: string): Promise<MockTransferRequest[]> {
  return [...personaRows(slug, persona.transferRequests)].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getVouchers(slug: string): Promise<MockStoreVoucherFull[]> {
  return personaRows(slug, persona.myVouchers);
}

export async function getFlashSales(slug: string): Promise<MockFlashSale[]> {
  return personaRows(slug, persona.myFlashSales);
}

export async function getBundles(slug: string): Promise<MockBundle[]> {
  return personaRows(slug, persona.myBundles);
}

export async function getAds(slug: string): Promise<MockAdCampaign[]> {
  return personaRows(slug, persona.myAds);
}

export type StoreAnalytics = {
  views7d: number;
  visitors7d: number;
  conversion: number;
  revenue30d: number;
  viewsByDay: { day: string; views: number }[];
  bestSellers: { title: string; sold: number; revenue: number }[];
};

const EMPTY_ANALYTICS: StoreAnalytics = {
  views7d: 0,
  visitors7d: 0,
  conversion: 0,
  revenue30d: 0,
  viewsByDay: [],
  bestSellers: [],
};

export async function getAnalytics(slug: string): Promise<StoreAnalytics> {
  return slug === persona.myStoreSlug ? persona.analytics : EMPTY_ANALYTICS;
}

export async function getRatings(slug: string): Promise<MockStoreRating[]> {
  return [...personaRows(slug, persona.storeRatings)].sort((a, b) => b.date.localeCompare(a.date));
}

export type StoreChat = { id: string; buyer: string; lastMessage: string; date: string; unread: number };

export async function getStoreChats(slug: string): Promise<StoreChat[]> {
  return [...personaRows(slug, persona.storeChats)].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNotifChannels(slug: string): Promise<MockNotifChannel[]> {
  return personaRows(slug, persona.notifChannels);
}

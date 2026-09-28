// Store-dashboard data. Every reader is scoped to one store slug, and the
// dashboard only ever passes the slug of the store the API says the
// logged-in user owns (requireStore) — never a slug from the URL.
// TEMPORARY: dashboard contents come from the demo store persona
// (src/lib/mock/store-dashboard) until the Express API serves them.
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
  MockWithdrawal,
} from '@/lib/mock/store-dashboard';
import type { StoreType } from '@/lib/mock/stores';

export type StoreContext = {
  slug: string;
  name: string;
  type: StoreType;
  kycName: string;
  kycStatus: string;
  depositStatus: string;
  depositAmount: number;
  categories: string[];
};

/**
 * The logged-in user's store (GET /api/stores/me), or a redirect: guests go
 * to /login, accounts without a store to the "open a store" guide. Cached per
 * request.
 */
export const requireStore = cache(async (returnTo: string): Promise<StoreContext> => {
  await requireUser(returnTo);
  const data = await serverApiGet<{ store: StoreContext | null }>('/api/stores/me');
  if (!data?.store) redirect('/help/cara-membuka-toko');
  return data.store;
});

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

const FREE_PLAN: Subscription = {
  tier: 'FREE',
  commissionRate: 0.05,
  maxListings: 15,
  freeFeaturedSlots: 0,
  usedFeaturedSlots: 0,
  currentPeriodEnd: '',
};

export async function getSubscription(slug: string): Promise<Subscription> {
  return slug === persona.myStoreSlug ? persona.mySubscription : FREE_PLAN;
}

/** STORE_BALANCES: escrow (held until safe + 5h) and available (withdrawable). */
export async function getStoreBalance(slug: string): Promise<{ available: number; escrow: number }> {
  return slug === persona.myStoreSlug
    ? { available: persona.availableBalance, escrow: persona.escrowBalance }
    : { available: 0, escrow: 0 };
}

// ── Catalogs ──

export async function getMyCatalogs(slug: string): Promise<MockStoreCatalog[]> {
  return personaRows(slug, persona.myCatalogs);
}

export async function getMyCatalog(slug: string, id: string): Promise<MockStoreCatalog | undefined> {
  return (await getMyCatalogs(slug)).find((catalog) => catalog.id === id);
}

// ── Orders & offers ──

/** Orders the store has to act on or has handled (paid onwards), newest first. */
export async function getStoreOrders(slug: string): Promise<MockStoreOrder[]> {
  return [...personaRows(slug, persona.storeOrders)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStoreOrder(slug: string, id: string): Promise<MockStoreOrder | undefined> {
  return (await getStoreOrders(slug)).find((order) => order.id === id);
}

export async function getIncomingOffers(slug: string): Promise<MockIncomingOffer[]> {
  return personaRows(slug, persona.incomingOffers);
}

// ── Payouts ──

export async function getWithdrawals(slug: string): Promise<MockWithdrawal[]> {
  return [...personaRows(slug, persona.withdrawals)].sort((a, b) => b.date.localeCompare(a.date));
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

// ── Promotions, ads, analytics ──

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

// ── Ratings, chat, notification channels ──

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

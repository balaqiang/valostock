// Buyer-scoped data.
// - Orders come from the Express API, which scopes them to the session user
//   (the web app never passes a user id for them).
// - Offers, wishlist, follows, notifications, chats, points, affiliate and
//   reports are NOT in the prototype: they show the demo persona ("Nightfall")
//   from src/lib/mock for every buyer — display only, nothing is persisted.
import { serverApiGet } from '@/lib/api-server';
import type { MockListing } from '@/lib/mock/listings';
import type { MockChat, MockNotification, MockOffer, MockReport, PointsEntry } from '@/lib/mock/buyer';
import { listings as demoListings } from '@/lib/mock/listings';
import * as persona from '@/lib/mock/buyer';
import { stores } from '@/lib/mock/stores';
import type { OrderView } from '@/types/api';

// ── Orders (API) ──

export async function getMyOrders(): Promise<OrderView[]> {
  return (await serverApiGet<{ orders: OrderView[] }>('/api/me/orders'))?.orders ?? [];
}

/** Any order the visitor may see (buyer, owner of the selling store, admin), or null. */
export async function getOrder(orderId: string): Promise<OrderView | null> {
  return (await serverApiGet<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderId)}`))?.order ?? null;
}

// ── Demo-only features (see header) ──

/** Rows of the demo persona, for whichever user is logged in. */
function demoRowsFor<T>(userId: string, rows: T): T {
  void userId;
  return rows;
}

/** Listing details for demo offers / wishlist entries. */
export function demoListingById(id: string): MockListing | undefined {
  return demoListings.find((listing) => listing.id === id);
}

export async function getFollowedGameSlugs(userId: string): Promise<string[]> {
  return demoRowsFor(userId, persona.yourGameSlugs);
}

export async function getFollowingSlugs(userId: string): Promise<string[]> {
  return demoRowsFor(userId, persona.followingSlugs);
}

export async function getWishlistIds(userId: string): Promise<string[]> {
  return demoRowsFor(userId, persona.wishlistIds);
}

export async function getBuyerOffers(userId: string): Promise<MockOffer[]> {
  return demoRowsFor(userId, persona.myOffers);
}

export async function getNotifications(userId: string, kind: 'ORDER' | 'SYSTEM'): Promise<MockNotification[]> {
  return demoRowsFor(userId, kind === 'ORDER' ? persona.orderNotifications : persona.systemNotifications);
}

export async function getChats(userId: string): Promise<MockChat[]> {
  const known = new Set(stores.map((store) => store.slug));
  return demoRowsFor(userId, persona.chats.filter((chat) => known.has(chat.storeSlug)));
}

export async function getPointsLedger(userId: string): Promise<PointsEntry[]> {
  return demoRowsFor(userId, persona.pointsLedger);
}

/** Points balance = sum of the loyalty ledger. */
export async function getLoyaltyPoints(userId: string): Promise<number> {
  return (await getPointsLedger(userId)).reduce((total, entry) => total + entry.points, 0);
}

export type AffiliateSummary = { code: string; referred: number; qualified: number; earnedToBalance: number };

export async function getAffiliate(userId: string): Promise<AffiliateSummary | null> {
  const { code, referred, qualified, earnedToBalance } = persona.affiliate;
  return demoRowsFor(userId, { code, referred, qualified, earnedToBalance });
}

export async function getReports(userId: string): Promise<MockReport[]> {
  return demoRowsFor(userId, persona.myReports);
}

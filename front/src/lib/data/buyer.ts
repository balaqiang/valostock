// Buyer-scoped data. Every reader takes the logged-in user's id; the Express
// API will scope each query to that session user (no IDOR through URL ids).
// TEMPORARY: until those endpoints exist, every buyer sees the demo persona
// ("Nightfall") from src/lib/mock — display only, nothing is persisted.
import type { MockOrder } from '@/lib/mock/orders';
import type { MockListing } from '@/lib/mock/listings';
import type { MockChat, MockNotification, MockOffer, MockReport, PointsEntry } from '@/lib/mock/buyer';
import { orders } from '@/lib/mock/orders';
import * as persona from '@/lib/mock/buyer';
import { stores } from '@/lib/mock/stores';
import { handlingFeeFor, PROTECTION_FEE, protectionDaysFor } from '@/lib/fees';
import { listingById } from '@/lib/data/catalog';

/** Rows of the demo persona, for whichever user is logged in (see header). */
function demoRowsFor<T>(userId: string, rows: T): T {
  void userId;
  return rows;
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

// ── Orders ──

export async function getBuyerOrders(userId: string): Promise<MockOrder[]> {
  return demoRowsFor(userId, orders);
}

/** The order, only if it belongs to this buyer. */
export async function getBuyerOrder(userId: string, orderId: string): Promise<MockOrder | undefined> {
  return (await getBuyerOrders(userId)).find((order) => order.id === orderId);
}

export type OrderDetails = {
  listing: MockListing;
  handlingFee: number;
  protectionFee: number;
  totalPaid: number;
  protectionDays: number;
};

/** Listing + derived money fields for an order (display-only; the API is authoritative). */
export function orderDetails(order: MockOrder): OrderDetails | null {
  const listing = listingById(order.listingId);
  if (!listing) return null;
  const handlingFee = handlingFeeFor(listing.price);
  return {
    listing,
    handlingFee,
    protectionFee: PROTECTION_FEE,
    totalPaid: listing.price + handlingFee + PROTECTION_FEE,
    protectionDays: protectionDaysFor(listing.price),
  };
}

// ── Offers ──

export async function getBuyerOffers(userId: string): Promise<MockOffer[]> {
  return demoRowsFor(userId, persona.myOffers);
}

// ── Messages ──

export async function getNotifications(userId: string, kind: 'ORDER' | 'SYSTEM'): Promise<MockNotification[]> {
  return demoRowsFor(userId, kind === 'ORDER' ? persona.orderNotifications : persona.systemNotifications);
}

export async function getChats(userId: string): Promise<MockChat[]> {
  const known = new Set(stores.map((store) => store.slug));
  return demoRowsFor(userId, persona.chats.filter((chat) => known.has(chat.storeSlug)));
}

// ── Loyalty, affiliate, reports ──

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

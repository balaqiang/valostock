// Buyer-scoped data. The API scopes every query to the session user — the web
// app never passes a user id.
import { serverApiGet } from '@/lib/api-server';
import type {
  ConversationView,
  DisputeDetail,
  DisputeSummary,
  NotificationView,
  OfferView,
  OrderView,
  ReportView,
} from '@/types/api';
import type { Listing, StoreLevel, StoreType } from '@/types/domain';

// ── Orders & disputes ──

export async function getMyOrders(): Promise<OrderView[]> {
  return (await serverApiGet<{ orders: OrderView[] }>('/api/me/orders'))?.orders ?? [];
}

/** Any order the visitor may see (buyer, owner of the selling store, admin), or null. */
export async function getOrder(orderId: string): Promise<OrderView | null> {
  return (await serverApiGet<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderId)}`))?.order ?? null;
}

export async function getMyDisputes(): Promise<DisputeSummary[]> {
  return (await serverApiGet<{ disputes: DisputeSummary[] }>('/api/me/disputes'))?.disputes ?? [];
}

export async function getDispute(id: string): Promise<DisputeDetail | null> {
  return serverApiGet<DisputeDetail>(`/api/disputes/${encodeURIComponent(id)}`);
}

// ── Offers ──

export async function getMyOffers(): Promise<OfferView[]> {
  return (await serverApiGet<{ offers: OfferView[] }>('/api/me/offers'))?.offers ?? [];
}

// ── Wishlist, follows, recently viewed, recommendations ──

export type WishlistItem = { listing: Listing; priceAtSave: number; notifyPriceDrop: boolean; savedAt: string; available: boolean };

export async function getWishlist(): Promise<WishlistItem[]> {
  return (await serverApiGet<{ items: WishlistItem[] }>('/api/me/wishlist'))?.items ?? [];
}

export type FollowedStore = {
  slug: string;
  name: string;
  type: StoreType;
  level: StoreLevel;
  rating: number;
  sold: number;
  followers: number;
  gradient: string;
  followedAt: string;
  listedCount: number;
};

export async function getFollowing(): Promise<FollowedStore[]> {
  return (await serverApiGet<{ stores: FollowedStore[] }>('/api/me/following'))?.stores ?? [];
}

export async function getRecentlyViewed(): Promise<Listing[]> {
  return (await serverApiGet<{ listings: Listing[] }>('/api/me/recently-viewed'))?.listings ?? [];
}

export async function getRecommendations(): Promise<Listing[]> {
  return (await serverApiGet<{ listings: Listing[] }>('/api/me/recommendations'))?.listings ?? [];
}

// ── Notifications & chat ──

export async function getNotifications(kind?: 'ORDER' | 'SYSTEM' | 'STORE'): Promise<{ notifications: NotificationView[]; unread: number }> {
  return (
    (await serverApiGet<{ notifications: NotificationView[]; unread: number }>(`/api/me/notifications${kind ? `?kind=${kind}` : ''}`)) ?? {
      notifications: [],
      unread: 0,
    }
  );
}

export async function getConversations(): Promise<ConversationView[]> {
  return (await serverApiGet<{ conversations: ConversationView[] }>('/api/chat/conversations'))?.conversations ?? [];
}

// ── Points, referral, reports ──

export type PointsInfo = {
  points: number;
  redeemUnit: number;
  rupiahPerUnit: number;
  ledger: { id: string; type: 'EARN' | 'REDEEM' | 'ADJUSTMENT'; points: number; balanceAfter: number; reference: string; createdAt: string }[];
};

export async function getPoints(): Promise<PointsInfo> {
  return (await serverApiGet<PointsInfo>('/api/me/points')) ?? { points: 0, redeemUnit: 100, rupiahPerUnit: 1000, ledger: [] };
}

export type ReferralInfo = {
  code: string;
  link: string;
  reward: number;
  referred: { name: string; joinedAt: string; status: 'PENDING' | 'REWARDED'; reward: number; rewardedAt: string | null }[];
  totalEarned: number;
};

export async function getReferral(): Promise<ReferralInfo | null> {
  return serverApiGet<ReferralInfo>('/api/me/referral');
}

export async function getMyReports(): Promise<ReportView[]> {
  return (await serverApiGet<{ reports: ReportView[] }>('/api/me/reports'))?.reports ?? [];
}

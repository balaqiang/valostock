// Public marketplace data (games, stores, listings, top-up, help) from the
// Express API. The response shapes equal the Mock* types, so pages and
// components use them unchanged.
import { publicApiGet } from '@/lib/api-server';
import type { MockGame } from '@/lib/mock/games';
import type { MockStore } from '@/lib/mock/stores';
import type { MockListing } from '@/lib/mock/listings';
import type { MockTopupProduct } from '@/lib/mock/topup';
import type { MockHelpArticle } from '@/lib/mock/help';

/** A marketplace listing as served by the API (Mock fields + status/description). */
export type Listing = MockListing & { status: string; description: string };

// ── Games ──

export async function getGames(): Promise<MockGame[]> {
  return (await publicApiGet<{ games: MockGame[] }>('/api/games'))?.games ?? [];
}

export async function getGame(slug: string): Promise<MockGame | undefined> {
  return (await publicApiGet<{ game: MockGame }>(`/api/games/${encodeURIComponent(slug)}`))?.game;
}

// ── Stores ──

export async function getStores(): Promise<MockStore[]> {
  return (await publicApiGet<{ stores: MockStore[] }>('/api/stores'))?.stores ?? [];
}

export async function getStore(slug: string): Promise<MockStore | undefined> {
  return (await publicApiGet<{ store: MockStore }>(`/api/stores/${encodeURIComponent(slug)}`))?.store;
}

// ── Listings (public view of CATALOGS) ──

export async function getListings(): Promise<Listing[]> {
  return (await publicApiGet<{ listings: Listing[] }>('/api/listings'))?.listings ?? [];
}

export async function getListing(id: string): Promise<Listing | undefined> {
  return (await publicApiGet<{ listing: Listing }>(`/api/listings/${encodeURIComponent(id)}`))?.listing;
}

export async function listingsByGame(game: string): Promise<Listing[]> {
  return (await publicApiGet<{ listings: Listing[] }>(`/api/listings?game=${encodeURIComponent(game)}`))?.listings ?? [];
}

export async function listingsByStore(storeSlug: string): Promise<Listing[]> {
  return (await publicApiGet<{ listings: Listing[] }>(`/api/listings?store=${encodeURIComponent(storeSlug)}`))?.listings ?? [];
}

// ── Top-up ──

export async function topupProductsByGame(gameSlug: string): Promise<MockTopupProduct[]> {
  return (
    (await publicApiGet<{ products: MockTopupProduct[] }>(`/api/games/${encodeURIComponent(gameSlug)}/topup-products`))
      ?.products ?? []
  );
}

// ── Help center ──

export async function getHelpArticles(): Promise<MockHelpArticle[]> {
  return (await publicApiGet<{ articles: MockHelpArticle[] }>('/api/help'))?.articles ?? [];
}

export async function getHelpArticle(slug: string): Promise<MockHelpArticle | undefined> {
  return (await publicApiGet<{ article: MockHelpArticle }>(`/api/help/${encodeURIComponent(slug)}`))?.article;
}

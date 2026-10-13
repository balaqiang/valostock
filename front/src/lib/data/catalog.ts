// Public marketplace data (games, field templates, stores, listings, top-up,
// help, news) — all from the Express API. Nothing here is computed locally.
import { publicApiGet, serverApiGet } from '@/lib/api-server';
import type { BuyContext, PublicBundle, PublicRating } from '@/types/api';
import type { FieldTemplate, Game, HelpArticle, Listing, NewsArticle, Store, TopupProduct } from '@/types/domain';

export type { Listing };

const q = (value: string) => encodeURIComponent(value);

// ── Games ──

export async function getGames(): Promise<Game[]> {
  return (await publicApiGet<{ games: Game[] }>('/api/games'))?.games ?? [];
}

export async function getGame(slug: string): Promise<Game | undefined> {
  return (await publicApiGet<{ game: Game }>(`/api/games/${q(slug)}`))?.game;
}

/** Catalog columns of a game (form fields for stores, filters for buyers). */
export async function getGameFields(slug: string): Promise<FieldTemplate[]> {
  return (await publicApiGet<{ fields: FieldTemplate[] }>(`/api/games/${q(slug)}/fields`))?.fields ?? [];
}

// ── Stores ──

export async function getStores(): Promise<Store[]> {
  return (await publicApiGet<{ stores: Store[] }>('/api/stores'))?.stores ?? [];
}

export type StorePage = {
  store: Store;
  bundles: { id: string; title: string; bundlePrice: number; itemsTotal: number; catalogIds: string[] }[];
  ratings: PublicRating[];
};

export async function getStorePage(slug: string): Promise<StorePage | null> {
  return publicApiGet<StorePage>(`/api/stores/${q(slug)}`);
}

export async function getStore(slug: string): Promise<Store | undefined> {
  return (await getStorePage(slug))?.store;
}

// ── Listings (public view of CATALOGS) ──

export type ListingQuery = {
  game?: string;
  store?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  limit?: number;
  /** Template filters: attr.<key>=value (SELECT/TEXT) and min.<key>=n (NUMBER). */
  attrs?: Record<string, string>;
  mins?: Record<string, number>;
};

export function listingQueryString(query: ListingQuery): string {
  const params = new URLSearchParams();
  for (const key of ['game', 'store', 'q', 'minPrice', 'maxPrice', 'sort', 'limit'] as const) {
    const value = query[key];
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  for (const [key, value] of Object.entries(query.attrs ?? {})) if (value) params.set(`attr.${key}`, value);
  for (const [key, value] of Object.entries(query.mins ?? {})) if (value) params.set(`min.${key}`, String(value));
  return params.toString();
}

export async function searchListings(query: ListingQuery = {}): Promise<Listing[]> {
  return (await publicApiGet<{ listings: Listing[] }>(`/api/listings?${listingQueryString(query)}`))?.listings ?? [];
}

export const getListings = () => searchListings({ limit: 200 });
export const listingsByGame = (game: string) => searchListings({ game, limit: 200 });
export const listingsByStore = (store: string) => searchListings({ store, limit: 200 });

export type ListingDetail = {
  listing: Listing;
  store: Store | null;
  inspection: { result: 'PASSED' | 'FAILED'; date: string; checklist: Record<string, boolean> } | null;
  bundles: PublicBundle[];
};

export async function getListingDetail(id: string): Promise<ListingDetail | null> {
  return publicApiGet<ListingDetail>(`/api/listings/${q(id)}`);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  return (await getListingDetail(id))?.listing;
}

/** Offer / lock / wishlist / follow state of the current visitor (sends the session cookie). */
export async function getBuyContext(id: string): Promise<BuyContext | null> {
  return serverApiGet<BuyContext>(`/api/catalogs/${q(id)}/buy-context`);
}

export async function getHome(): Promise<{ games: Game[]; listings: Listing[]; featured: Listing[] }> {
  return (await publicApiGet<{ games: Game[]; listings: Listing[]; featured: Listing[] }>('/api/home')) ?? { games: [], listings: [], featured: [] };
}

// ── Top-up ──

export async function topupProductsByGame(gameSlug: string): Promise<TopupProduct[]> {
  return (await publicApiGet<{ products: TopupProduct[] }>(`/api/games/${q(gameSlug)}/topup-products`))?.products ?? [];
}

// ── Help center & news ──

export async function getHelpArticles(): Promise<HelpArticle[]> {
  return (await publicApiGet<{ articles: HelpArticle[] }>('/api/help'))?.articles ?? [];
}

export async function getHelpArticle(slug: string): Promise<HelpArticle | undefined> {
  return (await publicApiGet<{ article: HelpArticle }>(`/api/help/${q(slug)}`))?.article;
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  return (await publicApiGet<{ articles: NewsArticle[] }>('/api/news'))?.articles ?? [];
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | undefined> {
  return (await publicApiGet<{ article: NewsArticle }>(`/api/news/${q(slug)}`))?.article;
}

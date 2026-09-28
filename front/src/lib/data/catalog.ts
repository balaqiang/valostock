// Public marketplace data (games, stores, listings, top-up, help).
// TEMPORARY: read from src/lib/mock until the Express API (back/) serves these
// endpoints — then each reader becomes a fetch through src/lib/api-server.ts.
// Signatures are already async so callers won't change.
import { games } from '@/lib/mock/games';
import { stores } from '@/lib/mock/stores';
import { listings } from '@/lib/mock/listings';
import { topupProducts } from '@/lib/mock/topup';
import { helpArticles } from '@/lib/mock/help';
import { myCatalogs } from '@/lib/mock/store-dashboard';
import type { MockGame } from '@/lib/mock/games';
import type { MockStore } from '@/lib/mock/stores';
import type { MockListing } from '@/lib/mock/listings';
import type { MockTopupProduct } from '@/lib/mock/topup';
import type { MockHelpArticle } from '@/lib/mock/help';
import type { CatalogStatus } from '@/lib/mock/store-dashboard';

// ── Games ──

export async function getGames(): Promise<MockGame[]> {
  return [...games].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getGame(slug: string): Promise<MockGame | undefined> {
  return games.find((game) => game.slug === slug);
}

// ── Stores ──

export async function getStores(): Promise<MockStore[]> {
  return stores;
}

export async function getStore(slug: string): Promise<MockStore | undefined> {
  return stores.find((store) => store.slug === slug);
}

// ── Listings (public view of CATALOGS) ──

/** Catalog statuses that are visible on the marketplace. */
const PUBLIC_STATUSES: CatalogStatus[] = ['LISTED', 'LOCKED', 'IN_ORDER'];

const catalogStatus = new Map(myCatalogs.map((catalog) => [catalog.id, catalog.status]));

function isPublic(listing: MockListing): boolean {
  return PUBLIC_STATUSES.includes(catalogStatus.get(listing.id) ?? 'LISTED');
}

export async function getListings(): Promise<MockListing[]> {
  return listings.filter(isPublic);
}

export async function getListing(id: string): Promise<MockListing | undefined> {
  return listings.find((listing) => listing.id === id && isPublic(listing));
}

/** Any catalog with listing details, whatever its status (e.g. for past orders). */
export function listingById(id: string): MockListing | undefined {
  return listings.find((listing) => listing.id === id);
}

export async function listingsByGame(game: string): Promise<MockListing[]> {
  return (await getListings()).filter((listing) => listing.game === game);
}

export async function listingsByStore(storeSlug: string): Promise<MockListing[]> {
  return (await getListings()).filter((listing) => listing.storeSlug === storeSlug);
}

// ── Top-up ──

export async function topupProductsByGame(gameSlug: string): Promise<MockTopupProduct[]> {
  return topupProducts.filter((product) => product.gameSlug === gameSlug);
}

export async function getTopupProduct(id: string): Promise<MockTopupProduct | undefined> {
  return topupProducts.find((product) => product.id === id);
}

// ── Help center ──

export async function getHelpArticles(): Promise<MockHelpArticle[]> {
  return helpArticles;
}

export async function getHelpArticle(slug: string): Promise<MockHelpArticle | undefined> {
  return helpArticles.find((article) => article.slug === slug);
}

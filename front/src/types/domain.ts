// Marketplace domain shapes as served by the Express API (back/src/modules/public).
// src/lib/mock keeps the same shapes only as the seed source for supabase/seed.sql.

export type StoreType = "OWNER" | "RESELLER";
export type StoreLevel = "AUTHORIZED" | "VERIFIED" | "PLATINUM";

export type Game = {
  id?: number;
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  description: string;
  supportsAccount: boolean;
  supportsTopup: boolean;
  hasSkinApi: boolean;
  isHot: boolean;
  isActive?: boolean;
  sortOrder: number;
  uidLabel: string;
  uidHint: string;
  uidExtraLabel?: string;
  /** Fixed choices for the extra field (e.g. Genshin server) — rendered as a dropdown. */
  uidExtraOptions?: string[];
  gradient: string;
  topupCurrency?: string;
  image?: string | null;
};

export type FieldType = "TEXT" | "NUMBER" | "SELECT" | "TAGS";

/** One column of a game's catalog form (game_field_templates). */
export type FieldTemplate = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  filterable: boolean;
  helpText: string | null;
  sortOrder: number;
};

export type StoreVoucher = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  expiresAt?: string | null;
};

export type Store = {
  id?: string;
  slug: string;
  name: string;
  type: StoreType;
  level: StoreLevel;
  tier?: "FREE" | "PRO" | "BUSINESS";
  identityVerified: boolean;
  depositSecured: boolean;
  rating: number;
  reviews: number;
  sold: number;
  serviceScore: { descAccuracy: number; attitude: number; deliverySpeed: number };
  followers: number;
  joined: string;
  description: string;
  gradient: string;
  vouchers: StoreVoucher[];
};

export type CatalogStatus = "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "LISTED" | "LOCKED" | "IN_ORDER" | "SOLD" | "DELISTED";

/** A catalog as the listing UI reads it (known Valorant/MLBB fields have defaults). */
export type Listing = {
  id: string;
  code: string;
  game: string;
  gameName: string;
  title: string;
  description: string;
  price: number;
  basePrice: number;
  oldPrice?: number;
  flashSale: { endsAt: string | null } | null;
  featured: boolean;
  store: string;
  storeSlug: string;
  storeId: string;
  storeTier?: "FREE" | "PRO" | "BUSINESS";
  verified: boolean;
  accountChecked: boolean;
  instant: boolean;
  image: string;
  images: string[];
  attributes: Record<string, unknown>;
  status: CatalogStatus;
  views: number;
  reviewNote: string | null;
  submittedAt: string | null;
  listedAt: string | null;
  createdAt: string;
  // Well-known attributes (defaults when a game doesn't have them)
  rank: string;
  level: number;
  server: string;
  region: string;
  skins: number;
  totalVp: number;
  remainingVp: number;
  remainingRp: number;
  remainingKc: number;
  agents: string;
  battlepass: string[];
  changeNick: boolean;
  emailStatus: string;
  premier: string;
  episodeAct: string;
  radianite: number;
  verifiedAt: string;
  skinsList: string[];
  rating: number;
  sold: number;
  heroCount?: number;
};

export type TopupProduct = {
  id: string;
  gameSlug: string;
  name: string;
  amountLabel: string;
  retailPrice: number;
  /** SPECIAL = passes, memberships, Welkin; INSTANT = currency packs. */
  section: "SPECIAL" | "INSTANT";
  icon?: string;
  popular?: boolean;
};

export type PromoCode = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  label: string;
};

export type HelpCategory =
  | "GETTING_STARTED"
  | "BECOMING_STORE"
  | "FEES_WITHDRAWAL"
  | "BEFORE_SALE"
  | "AFTER_SALE"
  | "DISPUTES"
  | "TOPUP"
  | "BALANCE"
  | "PENALTIES"
  | "SECURITY";

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type HelpArticle = {
  slug: string;
  title: string;
  category: HelpCategory;
  excerpt: string;
  popular?: boolean;
  body: HelpBlock[];
  helpfulCount?: number;
};

export type NewsCategory = "Pengumuman" | "Pembaruan Platform" | "Panduan" | "Event & Promo" | "Esports" | "Komunitas";

export const newsCategories: readonly NewsCategory[] = [
  "Pengumuman",
  "Pembaruan Platform",
  "Panduan",
  "Event & Promo",
  "Esports",
  "Komunitas",
];

export type NewsBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "list"; items: string[] };

export type NewsArticle = {
  id?: string;
  slug: string;
  category: NewsCategory;
  /** ISO timestamp of publication. */
  date: string;
  author: string;
  title: string;
  excerpt: string;
  cover: string;
  body: NewsBlock[];
  status?: "DRAFT" | "PUBLISHED";
};

// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Store persona: NusaGame (RESELLER, Pro subscription) → owned by the demo
// account nusagame@email.com.

import { BANK_TAX, TRANSFER_FEE, WITHDRAW_FEE } from "@/lib/fees";
// Mirrors docs/ERD.md (CATALOGS, ORDERS, OFFERS, WITHDRAWALS, EXTERNAL_SELLERS,
// TRANSFER_REQUESTS, STORE_VOUCHERS, FLASH_SALES, BUNDLES, FEATURED_LISTINGS,
// RATINGS, NOTIFICATION_CHANNELS) and docs/SITEMAP.md §7. The API owns all of it.

export const myStoreSlug = "nusagame";

/** Verified owner legal name — Account Validation matches payout names against this. */
export const kycName = "Rizky Pratama";

export const mySubscription = {
  tier: "PRO" as "FREE" | "PRO" | "BUSINESS",
  commissionRate: 0.045,
  maxListings: 60,
  freeFeaturedSlots: 2,
  usedFeaturedSlots: 1,
  currentPeriodEnd: "2026-08-01",
};

// ── Catalogs (ERD CATALOGS.status) ──────────────────────────────────

export type CatalogStatus =
  | "DRAFT"
  | "LISTED"
  | "LOCKED"
  | "IN_ORDER"
  | "SOLD"
  | "DELISTED";

export type MockStoreCatalog = {
  id: string;
  /** Platform-issued VS id — empty while DRAFT (issued on publish). */
  vsCode: string | null;
  title: string;
  game: string;
  price: number;
  status: CatalogStatus;
  views: number;
  accountChecked: boolean;
  createdAt: string;
};

export const myCatalogs: MockStoreCatalog[] = [
  {
    id: "vl-002",
    vsCode: "IMT38",
    title: "Akun Valorant Immortal 3 — 87 Skin, Champions 2023",
    game: "valorant",
    price: 4_250_000,
    status: "IN_ORDER",
    views: 1_204,
    accountChecked: true,
    createdAt: "2026-06-20",
  },
  {
    id: "vl-006",
    vsCode: "DMD11",
    title: "Akun Valorant Diamond 1 — Elderflame Operator",
    game: "valorant",
    price: 980_000,
    status: "LISTED",
    views: 645,
    accountChecked: true,
    createdAt: "2026-06-28",
  },
  {
    id: "vl-012",
    vsCode: "SLV10",
    title: "Akun Valorant Silver 1 — Akun Smurf Bersih",
    game: "valorant",
    price: 350_000,
    status: "LOCKED",
    views: 289,
    accountChecked: false,
    createdAt: "2026-07-02",
  },
  {
    id: "ng-101",
    vsCode: "ASC55",
    title: "Akun Valorant Ascendant 3 — Reaver & Prime Bundle",
    game: "valorant",
    price: 2_150_000,
    status: "SOLD",
    views: 1_876,
    accountChecked: true,
    createdAt: "2026-06-05",
  },
  {
    id: "ng-102",
    vsCode: null,
    title: "Akun Mobile Legends Mythic — 120 Skin",
    game: "mobile-legends",
    price: 1_500_000,
    status: "DRAFT",
    views: 0,
    accountChecked: false,
    createdAt: "2026-07-11",
  },
  {
    id: "ng-103",
    vsCode: "GLD77",
    title: "Akun Valorant Gold 1 — Starter Skin Pack",
    game: "valorant",
    price: 420_000,
    status: "DELISTED",
    views: 152,
    accountChecked: false,
    createdAt: "2026-05-18",
  },
];

// ── Store-side orders ───────────────────────────────────────────────

export type StoreOrderStatus =
  | "PAID"
  | "IN_REKBER"
  | "SAFE"
  | "COMPLETED"
  | "DISPUTED";

export type MockStoreOrder = {
  id: string;
  catalogId: string;
  title: string;
  buyer: string;
  itemPrice: number;
  status: StoreOrderStatus;
  roomCode: string;
  createdAt: string;
  safeAt?: string;
};

export const storeOrders: MockStoreOrder[] = [
  {
    id: "ORD-260712-0018",
    catalogId: "vl-002",
    title: "Akun Valorant Immortal 3 — 87 Skin, Champions 2023",
    buyer: "raven_qz",
    itemPrice: 4_250_000,
    status: "IN_REKBER",
    roomCode: "IMT38",
    createdAt: "2026-07-12",
  },
  {
    id: "ORD-260710-0009",
    catalogId: "ng-101",
    title: "Akun Valorant Ascendant 3 — Reaver & Prime Bundle",
    buyer: "kilo.zenith",
    itemPrice: 2_150_000,
    status: "SAFE",
    roomCode: "ASC55",
    createdAt: "2026-07-10",
    safeAt: "2026-07-10",
  },
  {
    id: "ORD-260705-0022",
    catalogId: "vl-012",
    title: "Akun Valorant Silver 1 — Akun Smurf Bersih",
    buyer: "Nightfall",
    itemPrice: 350_000,
    status: "COMPLETED",
    roomCode: "SLV10",
    createdAt: "2026-07-05",
    safeAt: "2026-07-05",
  },
  {
    id: "ORD-260630-0041",
    catalogId: "ng-103",
    title: "Akun Valorant Gold 1 — Starter Skin Pack",
    buyer: "moka_prime",
    itemPrice: 420_000,
    status: "DISPUTED",
    roomCode: "GLD77",
    createdAt: "2026-06-30",
  },
];

// ── Incoming offers (Tawar) ─────────────────────────────────────────

export type MockIncomingOffer = {
  id: string;
  catalogId: string;
  title: string;
  listPrice: number;
  buyer: string;
  buyerTrust: number;
  amount: number;
  expiresAt: string;
};

export const incomingOffers: MockIncomingOffer[] = [
  {
    id: "in-1",
    catalogId: "vl-006",
    title: "Akun Valorant Diamond 1 — Elderflame Operator",
    listPrice: 980_000,
    buyer: "zephyr.aim",
    buyerTrust: 92,
    amount: 850_000,
    expiresAt: "2026-07-13",
  },
  {
    id: "in-2",
    catalogId: "vl-006",
    title: "Akun Valorant Diamond 1 — Elderflame Operator",
    listPrice: 980_000,
    buyer: "dttx_10",
    buyerTrust: 78,
    amount: 900_000,
    expiresAt: "2026-07-14",
  },
  {
    id: "in-3",
    catalogId: "vl-012",
    title: "Akun Valorant Silver 1 — Akun Smurf Bersih",
    listPrice: 350_000,
    buyer: "cutepatootie",
    buyerTrust: 88,
    amount: 300_000,
    expiresAt: "2026-07-13",
  },
];

// ── Store balance & withdrawals (ERD STORE_BALANCES / WITHDRAWALS) ─

/** Released and withdrawable (STORE_BALANCES.available). */
export const availableBalance = 6_364_500;
/** Paid but still held until safe_at + 5h (STORE_BALANCES.escrow). */
export const escrowBalance = 2_053_250;

export type NameMatch = "MATCH" | "REVIEW" | "MISMATCH";

export type MockWithdrawal = {
  id: string;
  amount: number;
  fee: number;
  bank: string;
  accountName: string;
  nameMatch: NameMatch;
  status: "PENDING_VALIDATION" | "PROCESSING" | "COMPLETED" | "FAILED";
  date: string;
};

export const withdrawals: MockWithdrawal[] = [
  {
    id: "WD-260708-004",
    amount: 3_500_000,
    fee: WITHDRAW_FEE + BANK_TAX,
    bank: "BCA •• 4821",
    accountName: "Rizky Pratama",
    nameMatch: "MATCH",
    status: "COMPLETED",
    date: "2026-07-08",
  },
  {
    id: "WD-260701-003",
    amount: 1_200_000,
    fee: WITHDRAW_FEE + BANK_TAX,
    bank: "BNI •• 7702",
    accountName: "Rizki Pratama",
    nameMatch: "REVIEW",
    status: "PROCESSING",
    date: "2026-07-01",
  },
  {
    id: "WD-260620-002",
    amount: 900_000,
    fee: WITHDRAW_FEE + BANK_TAX,
    bank: "Mandiri •• 1108",
    accountName: "Toko Nusa Game",
    nameMatch: "MISMATCH",
    status: "FAILED",
    date: "2026-06-20",
  },
];

// ── External sellers & transfer requests (reseller tooling) ────────

export type MockExternalSeller = {
  id: string;
  alias: string;
  payoutChannel: string;
  payoutAccount: string;
  payoutName: string;
  consignedCount: number;
  createdAt: string;
};

export const externalSellers: MockExternalSeller[] = [
  {
    id: "es-1",
    alias: "Bang Dika (Immortal grinder)",
    payoutChannel: "BCA",
    payoutAccount: "•••• 9917",
    payoutName: "Andika Saputra",
    consignedCount: 3,
    createdAt: "2026-04-12",
  },
  {
    id: "es-2",
    alias: "Sasa MLBB",
    payoutChannel: "DANA",
    payoutAccount: "0813 •••• 221",
    payoutName: "Salsabila Rahma",
    consignedCount: 1,
    createdAt: "2026-06-02",
  },
];

export type MockTransferRequest = {
  id: string;
  orderId: string;
  sellerId: string;
  catalogTitle: string;
  amount: number;
  fee: number;
  nameMatch: NameMatch;
  status: "PENDING_VALIDATION" | "PROCESSING" | "COMPLETED" | "FAILED";
  /** safe_at + 5h (docs/MONEY_RULES.md §11). */
  availableAfter: string;
  date: string;
};

export const transferRequests: MockTransferRequest[] = [
  {
    id: "TR-260710-002",
    orderId: "ORD-260710-0009",
    sellerId: "es-1",
    catalogTitle: "Akun Valorant Ascendant 3 — Reaver & Prime Bundle",
    amount: 1_800_000,
    fee: TRANSFER_FEE,
    nameMatch: "MATCH",
    status: "PROCESSING",
    availableAfter: "2026-07-10",
    date: "2026-07-10",
  },
  {
    id: "TR-260625-001",
    orderId: "ORD-260622-0035",
    sellerId: "es-1",
    catalogTitle: "Akun Valorant Immortal 1 — Oni Collection",
    amount: 2_300_000,
    fee: TRANSFER_FEE,
    nameMatch: "MATCH",
    status: "COMPLETED",
    availableAfter: "2026-06-22",
    date: "2026-06-25",
  },
];

// ── Promotions ──────────────────────────────────────────────────────

export type MockStoreVoucherFull = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  quota: number;
  used: number;
  expiresAt: string;
};

export const myVouchers: MockStoreVoucherFull[] = [
  {
    code: "NUSA25",
    kind: "FIXED",
    value: 25_000,
    minSpend: 500_000,
    quota: 100,
    used: 37,
    expiresAt: "2026-07-31",
  },
  {
    code: "NUSAHYPE",
    kind: "PERCENT",
    value: 5,
    minSpend: 1_000_000,
    quota: 50,
    used: 50,
    expiresAt: "2026-07-05",
  },
];

export type MockFlashSale = {
  id: string;
  catalogId: string;
  title: string;
  listPrice: number;
  salePrice: number;
  startsAt: string;
  endsAt: string;
};

export const myFlashSales: MockFlashSale[] = [
  {
    id: "fs-1",
    catalogId: "vl-006",
    title: "Akun Valorant Diamond 1 — Elderflame Operator",
    listPrice: 980_000,
    salePrice: 899_000,
    startsAt: "2026-07-15",
    endsAt: "2026-07-16",
  },
];

export type MockBundle = {
  id: string;
  title: string;
  items: string[];
  bundlePrice: number;
  itemsTotal: number;
};

export const myBundles: MockBundle[] = [
  {
    id: "bd-1",
    title: "Paket Duo Ranked — Diamond + Silver",
    items: [
      "Akun Valorant Diamond 1 — Elderflame Operator",
      "Akun Valorant Silver 1 — Akun Smurf Bersih",
    ],
    bundlePrice: 1_200_000,
    itemsTotal: 1_330_000,
  },
];

export type MockAdCampaign = {
  id: string;
  kind: "FEATURED" | "BANNER";
  target: string;
  duration: string;
  price: number;
  status: "ACTIVE" | "EXPIRED";
  expiresAt: string;
};

export const myAds: MockAdCampaign[] = [
  {
    id: "ad-1",
    kind: "FEATURED",
    target: "Akun Valorant Diamond 1 — Elderflame Operator",
    duration: "7 hari",
    price: 0,
    status: "ACTIVE",
    expiresAt: "2026-07-16",
  },
  {
    id: "ad-2",
    kind: "BANNER",
    target: "Homepage — kampanye Juli",
    duration: "14 hari",
    price: 150_000,
    status: "EXPIRED",
    expiresAt: "2026-07-01",
  },
];

// ── Analytics (Pro) ─────────────────────────────────────────────────

export const analytics = {
  views7d: 2_431,
  visitors7d: 1_180,
  conversion: 2.4,
  revenue30d: 6_820_000,
  viewsByDay: [
    { day: "Sen", views: 288 },
    { day: "Sel", views: 342 },
    { day: "Rab", views: 305 },
    { day: "Kam", views: 391 },
    { day: "Jum", views: 465 },
    { day: "Sab", views: 359 },
    { day: "Min", views: 281 },
  ],
  bestSellers: [
    { title: "Akun Valorant Ascendant 3 — Reaver & Prime Bundle", sold: 1, revenue: 2_150_000 },
    { title: "Akun Valorant Silver 1 — Akun Smurf Bersih", sold: 1, revenue: 350_000 },
  ],
};

// ── Ratings (reply once) ────────────────────────────────────────────

export type MockStoreRating = {
  id: string;
  orderId: string;
  buyer: string;
  overall: 1 | 0 | -1;
  descAccuracy: number;
  attitude: number;
  deliverySpeed: number;
  comment: string;
  reply: string | null;
  date: string;
};

export const storeRatings: MockStoreRating[] = [
  {
    id: "rt-1",
    orderId: "ORD-260705-0022",
    buyer: "Nightfall",
    overall: 1,
    descAccuracy: 5,
    attitude: 5,
    deliverySpeed: 4,
    comment: "Akun sesuai deskripsi, proses di rekber cepat dan jelas. Mantap!",
    reply: null,
    date: "2026-07-05",
  },
  {
    id: "rt-2",
    orderId: "ORD-260622-0035",
    buyer: "kavya.fps",
    overall: 1,
    descAccuracy: 5,
    attitude: 4,
    deliverySpeed: 5,
    comment: "Fast respon, skin lengkap sesuai list.",
    reply: "Terima kasih sudah belanja di NusaGame! 🙏",
    date: "2026-06-23",
  },
  {
    id: "rt-3",
    orderId: "ORD-260615-0027",
    buyer: "moka_prime",
    overall: -1,
    descAccuracy: 3,
    attitude: 4,
    deliverySpeed: 3,
    comment: "Pengiriman agak lama dari estimasi.",
    reply: null,
    date: "2026-06-16",
  },
];

// ── Chat & notification channels ────────────────────────────────────

export const storeChats = [
  {
    id: "sc-1",
    buyer: "zephyr.aim",
    lastMessage: "Kalau 850rb boleh gak kak?",
    date: "2026-07-12",
    unread: 2,
  },
  {
    id: "sc-2",
    buyer: "raven_qz",
    lastMessage: "Oke, saya cek dulu akunnya di rekber ya.",
    date: "2026-07-12",
    unread: 0,
  },
  {
    id: "sc-3",
    buyer: "cutepatootie",
    lastMessage: "Masih ready akun silver-nya?",
    date: "2026-07-11",
    unread: 1,
  },
];

export type MockNotifChannel = {
  kind: "WHATSAPP" | "DISCORD" | "TELEGRAM";
  label: string;
  target: string;
  active: boolean;
};

export const notifChannels: MockNotifChannel[] = [
  { kind: "WHATSAPP", label: "WhatsApp", target: "+62 812 •••• 890", active: true },
  { kind: "DISCORD", label: "Discord", target: "#nusagame-orders", active: true },
  { kind: "TELEGRAM", label: "Telegram", target: "Belum terhubung", active: false },
];

// ── Settings ────────────────────────────────────────────────────────

export const storeSettings = {
  name: "NusaGame",
  slug: "nusagame",
  type: "RESELLER" as const,
  kycStatus: "APPROVED" as const,
  depositStatus: "HELD" as const,
  depositAmount: 500_000,
  categories: ["Accounts", "Top-Up"],
};

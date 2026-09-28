// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Buyer persona "Nightfall" → the demo account nightfall@email.com. Mirrors
// docs/ERD.md (USERS, BALANCE_LEDGER, LOYALTY_LEDGER, OFFERS, WISHLISTS,
// STORE_FOLLOWS, AFFILIATES, REPORTS, NOTIFICATIONS).

export const buyerProfile = {
  nickname: "Nightfall",
  customerId: "VSB-102-4471",
  country: "Indonesia",
  phone: "+62 812-3456-7890",
  email: "nightfall@email.com",
  language: "Bahasa Indonesia",
  /** Buyer KYC is optional — never required (docs/SITEMAP.md §5.4). */
  kycVerified: false,
  twofaEnabled: false,
  loyaltyPoints: 1_250,
};

// ── Balance (BLC — closed-loop, top-up only) ────────────────────────

export const buyerBalance: number = 69_500;

export type BalanceLedgerEntry = {
  id: string;
  type: "TOPUP_CREDIT" | "SPEND_TOPUP" | "REFUND_CREDIT" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  ref: string;
  date: string;
};

export const balanceLedger: BalanceLedgerEntry[] = [
  {
    id: "bl-004",
    type: "REFUND_CREDIT",
    amount: 48_000,
    balanceAfter: 69_500,
    ref: "TU-260710-0233",
    date: "2026-07-10",
  },
  {
    id: "bl-003",
    type: "SPEND_TOPUP",
    amount: -56_000,
    balanceAfter: 21_500,
    ref: "TU-260709-0102",
    date: "2026-07-09",
  },
  {
    id: "bl-002",
    type: "SPEND_TOPUP",
    amount: -22_500,
    balanceAfter: 77_500,
    ref: "TU-260705-0088",
    date: "2026-07-05",
  },
  {
    id: "bl-001",
    type: "TOPUP_CREDIT",
    amount: 100_000,
    balanceAfter: 100_000,
    ref: "BL-260701-0012",
    date: "2026-07-01",
  },
];

// ── Notifications (order + system tabs) ─────────────────────────────

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  href?: string;
};

export const orderNotifications: MockNotification[] = [
  {
    id: "no-1",
    title: "Akun dinyatakan aman",
    body: "Pesanan ORD-260710-0031 — kamu sudah mengganti email & password. Tekan Selesai jika semuanya sesuai.",
    date: "2026-07-10",
    read: false,
    href: "/orders/ORD-260710-0031",
  },
  {
    id: "no-2",
    title: "Toko mengirim akses akun",
    body: "Pesanan ORD-260711-0042 — SkyVault mengirim detail akun di Rekber Room PLT29.",
    date: "2026-07-11",
    read: false,
    href: "/orders/ORD-260711-0042",
  },
  {
    id: "no-3",
    title: "Pesanan selesai",
    body: "Pesanan ORD-260705-0022 selesai. Jangan lupa beri rating untuk NusaGame.",
    date: "2026-07-05",
    read: true,
    href: "/orders/ORD-260705-0022",
  },
];

export const systemNotifications: MockNotification[] = [
  {
    id: "ns-1",
    title: "Fitur Tawar sudah hadir",
    body: "Nego harga langsung dengan toko dari halaman akun — baca selengkapnya di Berita.",
    date: "2026-07-08",
    read: true,
    href: "/news/fitur-tawar-hadir",
  },
  {
    id: "ns-2",
    title: "Pembaruan kebijakan refund top-up",
    body: "Refund top-up yang gagal kini otomatis masuk ke Balance (BLC).",
    date: "2026-06-25",
    read: true,
    href: "/help/kebijakan-refund-top-up",
  },
];

// ── Chats (normal chat — no transactions) ───────────────────────────

export type MockChat = {
  id: string;
  storeName: string;
  storeSlug: string;
  lastMessage: string;
  date: string;
  unread: number;
};

export const chats: MockChat[] = [
  {
    id: "ch-1",
    storeName: "SkyVault",
    storeSlug: "skyvault",
    lastMessage: "Detail akun sudah dikirim di Rekber Room ya, kak.",
    date: "2026-07-11",
    unread: 1,
  },
  {
    id: "ch-2",
    storeName: "AstralStore",
    storeSlug: "astralstore",
    lastMessage: "Untuk akun Radiant masih available, silakan ditawar.",
    date: "2026-07-09",
    unread: 0,
  },
];

// ── Offers (Tawar) ──────────────────────────────────────────────────

export type MockOffer = {
  id: string;
  listingId: string;
  amount: number;
  counterAmount?: number;
  status: "PENDING" | "ACCEPTED" | "COUNTERED" | "REJECTED" | "EXPIRED";
  expiresAt: string;
};

export const myOffers: MockOffer[] = [
  {
    id: "of-1",
    listingId: "vl-001",
    amount: 7_800_000,
    counterAmount: 8_200_000,
    status: "COUNTERED",
    expiresAt: "2026-07-13",
  },
  {
    id: "of-2",
    listingId: "vl-009",
    amount: 3_300_000,
    status: "PENDING",
    expiresAt: "2026-07-13",
  },
  {
    id: "of-3",
    listingId: "vl-010",
    amount: 1_300_000,
    status: "EXPIRED",
    expiresAt: "2026-07-08",
  },
];

// ── Engagement ──────────────────────────────────────────────────────

export const wishlistIds = ["vl-001", "vl-003", "vl-009"];
export const followingSlugs = ["astralstore", "nusagame"];

/** Games the buyer follows — "Your Games" section on home (SITEMAP §1). */
export const yourGameSlugs = ["valorant", "mobile-legends"];

export type PointsEntry = {
  id: string;
  type: "EARN" | "REDEEM";
  points: number;
  ref: string;
  date: string;
};

export const pointsLedger: PointsEntry[] = [
  { id: "pt-3", type: "EARN", points: 625, ref: "ORD-260705-0022", date: "2026-07-05" },
  { id: "pt-2", type: "REDEEM", points: -500, ref: "Voucher diskon", date: "2026-07-01" },
  { id: "pt-1", type: "EARN", points: 1_125, ref: "ORD-260628-0011", date: "2026-06-29" },
];

// ── Affiliate (rewards → Balance, closed-loop) ──────────────────────

export const affiliate = {
  code: "NIGHTFALL10",
  referred: 4,
  qualified: 2,
  earnedToBalance: 20_000,
};

// ── Reports ─────────────────────────────────────────────────────────

export type MockReport = {
  id: string;
  target: string;
  reason: string;
  status: "OPEN" | "REVIEWING" | "RESOLVED";
  date: string;
};

export const myReports: MockReport[] = [];

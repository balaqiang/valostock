// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Mirrors docs/ERD.md TOPUP_PRODUCTS / TOPUP_PROMO_CODES; sample invoices are
// seeded into `transactions` for the demo buyer.

export type MockTopupProduct = {
  id: string;
  gameSlug: string;
  name: string;
  /** e.g. "475 VP" */
  amountLabel: string;
  retailPrice: number;
  popular?: boolean;
};

export type MockPromoCode = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  label: string;
};

export const promoCodes: MockPromoCode[] = [
  {
    code: "VALO10",
    kind: "PERCENT",
    value: 10,
    minSpend: 50_000,
    label: "Diskon 10% (min. Rp 50.000)",
  },
  {
    code: "HEMAT5K",
    kind: "FIXED",
    value: 5_000,
    minSpend: 100_000,
    label: "Potongan Rp 5.000 (min. Rp 100.000)",
  },
];

export const topupProducts: MockTopupProduct[] = [
  // Valorant — VP
  { id: "vp-475", gameSlug: "valorant", name: "Valorant Points", amountLabel: "475 VP", retailPrice: 56_000 },
  { id: "vp-1000", gameSlug: "valorant", name: "Valorant Points", amountLabel: "1.000 VP", retailPrice: 112_000, popular: true },
  { id: "vp-2050", gameSlug: "valorant", name: "Valorant Points", amountLabel: "2.050 VP", retailPrice: 224_000 },
  { id: "vp-3650", gameSlug: "valorant", name: "Valorant Points", amountLabel: "3.650 VP", retailPrice: 389_000 },
  { id: "vp-5350", gameSlug: "valorant", name: "Valorant Points", amountLabel: "5.350 VP", retailPrice: 559_000 },
  { id: "vp-11000", gameSlug: "valorant", name: "Valorant Points", amountLabel: "11.000 VP", retailPrice: 1_099_000 },
  // Mobile Legends — Diamonds
  { id: "ml-86", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "86 Diamond", retailPrice: 22_500 },
  { id: "ml-172", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "172 Diamond", retailPrice: 44_500, popular: true },
  { id: "ml-257", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "257 Diamond", retailPrice: 66_500 },
  { id: "ml-514", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "514 Diamond", retailPrice: 131_500 },
  { id: "ml-706", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "706 Diamond", retailPrice: 179_000 },
  { id: "ml-2195", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "2.195 Diamond", retailPrice: 549_000 },
  // Genshin Impact — Genesis Crystals
  { id: "gi-60", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "60 Crystal", retailPrice: 16_500 },
  { id: "gi-330", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "330 Crystal", retailPrice: 81_000, popular: true },
  { id: "gi-1090", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "1.090 Crystal", retailPrice: 259_000 },
  { id: "gi-2240", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "2.240 Crystal", retailPrice: 519_000 },
  // Free Fire — Diamonds
  { id: "ff-70", gameSlug: "free-fire", name: "Diamonds", amountLabel: "70 Diamond", retailPrice: 10_000 },
  { id: "ff-355", gameSlug: "free-fire", name: "Diamonds", amountLabel: "355 Diamond", retailPrice: 48_000, popular: true },
  { id: "ff-720", gameSlug: "free-fire", name: "Diamonds", amountLabel: "720 Diamond", retailPrice: 95_000 },
  { id: "ff-1450", gameSlug: "free-fire", name: "Diamonds", amountLabel: "1.450 Diamond", retailPrice: 189_000 },
];

// ── Invoice check ("Cek Invoice Kamu") ──────────────────────────────

export type MockTopupInvoice = {
  invoiceNo: string;
  gameName: string;
  productLabel: string;
  gameUid: string;
  payMethod: string;
  amountPaid: number;
  status: "PENDING" | "PAID" | "PROCESSING" | "SUCCESS" | "FAILED" | "REFUNDED";
  createdAt: string;
};

export const topupInvoices: MockTopupInvoice[] = [
  {
    invoiceNo: "TU-260711-0421",
    gameName: "Valorant",
    productLabel: "1.000 VP",
    gameUid: "Nightfall#GGWP",
    payMethod: "QRIS",
    amountPaid: 113_700,
    status: "SUCCESS",
    createdAt: "2026-07-11",
  },
  {
    invoiceNo: "TU-260711-0398",
    gameName: "Mobile Legends",
    productLabel: "514 Diamond",
    gameUid: "88231902 (2201)",
    payMethod: "Virtual Account",
    amountPaid: 136_500,
    status: "PROCESSING",
    createdAt: "2026-07-11",
  },
  {
    invoiceNo: "TU-260710-0233",
    gameName: "Free Fire",
    productLabel: "355 Diamond",
    gameUid: "512776401",
    payMethod: "E-Wallet",
    amountPaid: 49_200,
    status: "REFUNDED",
    createdAt: "2026-07-10",
  },
];

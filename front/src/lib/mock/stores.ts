// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Mirrors docs/ERD.md STORES + badges from docs/MONEY_RULES.md §13.

export type StoreType = "OWNER" | "RESELLER";
export type StoreLevel = "AUTHORIZED" | "VERIFIED" | "PLATINUM";

export type MockStoreVoucher = {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
};

export type MockStore = {
  slug: string;
  name: string;
  type: StoreType;
  level: StoreLevel;
  identityVerified: boolean;
  depositSecured: boolean;
  rating: number;
  reviews: number;
  sold: number;
  /** 3-dimension Service Score (1–5): description accuracy, attitude, delivery speed. */
  serviceScore: { descAccuracy: number; attitude: number; deliverySpeed: number };
  followers: number;
  joined: string;
  description: string;
  gradient: string;
  vouchers: MockStoreVoucher[];
};

export const stores: MockStore[] = [
  {
    slug: "astralstore",
    name: "AstralStore",
    type: "OWNER",
    level: "PLATINUM",
    identityVerified: true,
    depositSecured: true,
    rating: 4.94,
    reviews: 218,
    sold: 231,
    serviceScore: { descAccuracy: 4.9, attitude: 4.9, deliverySpeed: 5.0 },
    followers: 1240,
    joined: "Mar 2024",
    description:
      "Spesialis akun Valorant rank tinggi dengan koleksi skin langka. Semua akun milik sendiri, diinspeksi sebelum dijual.",
    gradient: "from-violet-600/90 to-fuchsia-500/80",
    vouchers: [
      { code: "ASTRAL50", kind: "FIXED", value: 50_000, minSpend: 1_000_000 },
      { code: "ASTRAL5", kind: "PERCENT", value: 5, minSpend: 2_000_000 },
    ],
  },
  {
    slug: "nusagame",
    name: "NusaGame",
    type: "RESELLER",
    level: "VERIFIED",
    identityVerified: true,
    depositSecured: true,
    rating: 4.87,
    reviews: 395,
    sold: 412,
    serviceScore: { descAccuracy: 4.8, attitude: 4.9, deliverySpeed: 4.8 },
    followers: 2380,
    joined: "Nov 2023",
    description:
      "Reseller store dengan katalog terluas — akun titipan penjual eksternal yang dikurasi dan menjadi tanggung jawab penuh kami.",
    gradient: "from-sky-600/90 to-cyan-500/80",
    vouchers: [{ code: "NUSA25", kind: "FIXED", value: 25_000, minSpend: 500_000 }],
  },
  {
    slug: "verdantshop",
    name: "VerdantShop",
    type: "OWNER",
    level: "VERIFIED",
    identityVerified: true,
    depositSecured: true,
    rating: 4.91,
    reviews: 176,
    sold: 189,
    serviceScore: { descAccuracy: 4.9, attitude: 4.8, deliverySpeed: 4.7 },
    followers: 860,
    joined: "Jun 2024",
    description:
      "Akun Immortal+ pilihan dengan deskripsi detail. Fokus pada akurasi listing dan serah terima yang rapi.",
    gradient: "from-emerald-600/90 to-teal-500/80",
    vouchers: [],
  },
  {
    slug: "gudangakun",
    name: "GudangAkun",
    type: "RESELLER",
    level: "PLATINUM",
    identityVerified: true,
    depositSecured: true,
    rating: 4.82,
    reviews: 702,
    sold: 764,
    serviceScore: { descAccuracy: 4.7, attitude: 4.8, deliverySpeed: 4.9 },
    followers: 3150,
    joined: "Jan 2023",
    description:
      "Toko volume terbesar di valostock.id. Ratusan akun terjual tiap bulan dengan pengiriman cepat.",
    gradient: "from-amber-500/90 to-orange-500/80",
    vouchers: [
      { code: "GUDANG10", kind: "PERCENT", value: 10, minSpend: 750_000 },
    ],
  },
  {
    slug: "skyvault",
    name: "SkyVault",
    type: "OWNER",
    level: "AUTHORIZED",
    identityVerified: true,
    depositSecured: true,
    rating: 4.7,
    reviews: 88,
    sold: 95,
    serviceScore: { descAccuracy: 4.6, attitude: 4.7, deliverySpeed: 4.6 },
    followers: 310,
    joined: "Feb 2025",
    description:
      "Toko baru dengan harga kompetitif. Sedang membangun rekam jejak — semua transaksi lewat escrow.",
    gradient: "from-indigo-600/90 to-blue-500/80",
    vouchers: [{ code: "SKY15", kind: "FIXED", value: 15_000, minSpend: 300_000 }],
  },
];

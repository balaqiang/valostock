// Seed source for supabase/seed.sql (back/scripts/generate-seed.ts). Components
// import only the types in src/types (enforced by ESLint).
// Top-up products mirror docs/modeling/03-erd.md TOPUP_PRODUCTS. supplierPrice is
// the Digiflazz buyer price ("Harga Terbaik") of the official in-game
// denominations; the seed derives retail_price with topupRetailFor()
// (docs/MONEY_RULES.md §8: + 3%, rounded up to Rp100).

export type MockTopupProduct = {
  id: string;
  gameSlug: string;
  name: string;
  /** e.g. "475 VP" */
  amountLabel: string;
  supplierPrice: number;
  section: "SPECIAL" | "INSTANT";
  icon: string;
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
  // Valorant — Digiflazz "Umum"
  { id: "vp-475", gameSlug: "valorant", name: "Valorant Points", amountLabel: "475 VP", supplierPrice: 51_145, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp" },
  { id: "vp-1000", gameSlug: "valorant", name: "Valorant Points", amountLabel: "1.000 VP", supplierPrice: 102_264, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp", popular: true },
  { id: "vp-2050", gameSlug: "valorant", name: "Valorant Points", amountLabel: "2.050 VP", supplierPrice: 204_502, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp" },
  { id: "vp-3650", gameSlug: "valorant", name: "Valorant Points", amountLabel: "3.650 VP", supplierPrice: 355_147, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp" },
  { id: "vp-5350", gameSlug: "valorant", name: "Valorant Points", amountLabel: "5.350 VP", supplierPrice: 510_356, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp" },
  { id: "vp-11000", gameSlug: "valorant", name: "Valorant Points", amountLabel: "11.000 VP", supplierPrice: 1_003_289, section: "INSTANT", icon: "/images/topup-icon/valorant/vp.webp" },
  // Mobile Legends — Digiflazz "Umum"
  { id: "ml-weekly", gameSlug: "mobile-legends", name: "Weekly Diamond Pass", amountLabel: "Weekly Diamond Pass", supplierPrice: 23_256, section: "SPECIAL", icon: "/images/topup-icon/mlbb/weeklypass.webp" },
  { id: "ml-5", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "5 Diamond", supplierPrice: 1_425, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-12", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "12 Diamond", supplierPrice: 3_348, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-19", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "19 Diamond", supplierPrice: 5_210, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-28", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "28 Diamond", supplierPrice: 7_570, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-44", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "44 Diamond", supplierPrice: 11_410, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-59", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "59 Diamond", supplierPrice: 14_899, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-85", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "85 Diamond", supplierPrice: 19_300, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond.png" },
  { id: "ml-170", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "170 Diamond", supplierPrice: 43_000, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png", popular: true },
  { id: "ml-240", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "240 Diamond", supplierPrice: 52_320, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png" },
  { id: "ml-296", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "296 Diamond", supplierPrice: 54_388, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png" },
  { id: "ml-408", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "408 Diamond", supplierPrice: 98_000, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png" },
  { id: "ml-568", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "568 Diamond", supplierPrice: 140_800, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png" },
  { id: "ml-875", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "875 Diamond", supplierPrice: 212_975, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-150.png" },
  { id: "ml-2010", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "2.010 Diamond", supplierPrice: 468_375, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-1000.png" },
  { id: "ml-4830", gameSlug: "mobile-legends", name: "Diamonds", amountLabel: "4.830 Diamond", supplierPrice: 1_125_475, section: "INSTANT", icon: "/images/topup-icon/mlbb/diamond-4800.png" },
  // Genshin Impact — Digiflazz "Indonesia" (the only list with Welkin Moon)
  { id: "gi-welkin", gameSlug: "genshin-impact", name: "Blessing of the Welkin Moon", amountLabel: "Blessing of the Welkin Moon", supplierPrice: 76_817, section: "SPECIAL", icon: "/images/topup-icon/genshin/blessing-of-welkin-moon.webp" },
  { id: "gi-60", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "60 Crystals", supplierPrice: 15_655, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp" },
  { id: "gi-330", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "330 (300+30) Crystals", supplierPrice: 76_817, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp", popular: true },
  { id: "gi-1090", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "1.090 (980+110) Crystals", supplierPrice: 241_775, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp" },
  { id: "gi-2240", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "2.240 (1.980+260) Crystals", supplierPrice: 463_616, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp" },
  { id: "gi-3880", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "3.880 (3.280+600) Crystals", supplierPrice: 772_676, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp" },
  { id: "gi-8080", gameSlug: "genshin-impact", name: "Genesis Crystals", amountLabel: "8.080 (6.480+1.600) Crystals", supplierPrice: 1_629_000, section: "INSTANT", icon: "/images/topup-icon/genshin/crystals.webp" },
  // Free Fire — Digiflazz "Umum" + "Membership"
  { id: "ff-weekly", gameSlug: "free-fire", name: "Membership Mingguan", amountLabel: "Membership Mingguan", supplierPrice: 25_177, section: "SPECIAL", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-monthly", gameSlug: "free-fire", name: "Membership Bulanan", amountLabel: "Membership Bulanan", supplierPrice: 75_398, section: "SPECIAL", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-5", gameSlug: "free-fire", name: "Diamonds", amountLabel: "5 Diamond", supplierPrice: 750, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-12", gameSlug: "free-fire", name: "Diamonds", amountLabel: "12 Diamond", supplierPrice: 1_601, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-50", gameSlug: "free-fire", name: "Diamonds", amountLabel: "50 Diamond", supplierPrice: 4_945, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-70", gameSlug: "free-fire", name: "Diamonds", amountLabel: "70 Diamond", supplierPrice: 7_000, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-140", gameSlug: "free-fire", name: "Diamonds", amountLabel: "140 Diamond", supplierPrice: 11_000, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp", popular: true },
  { id: "ff-355", gameSlug: "free-fire", name: "Diamonds", amountLabel: "355 Diamond", supplierPrice: 28_500, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-720", gameSlug: "free-fire", name: "Diamonds", amountLabel: "720 Diamond", supplierPrice: 58_800, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-1450", gameSlug: "free-fire", name: "Diamonds", amountLabel: "1.450 Diamond", supplierPrice: 151_377, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-2180", gameSlug: "free-fire", name: "Diamonds", amountLabel: "2.180 Diamond", supplierPrice: 234_025, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-3640", gameSlug: "free-fire", name: "Diamonds", amountLabel: "3.640 Diamond", supplierPrice: 399_025, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
  { id: "ff-7290", gameSlug: "free-fire", name: "Diamonds", amountLabel: "7.290 Diamond", supplierPrice: 807_536, section: "INSTANT", icon: "/images/topup-icon/freefire/diamond.webp" },
];

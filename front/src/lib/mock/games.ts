// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Mirrors docs/ERD.md GAMES.

export type MockGame = {
  slug: string;
  name: string;
  publisher: string;
  tagline: string;
  description: string;
  supportsAccount: boolean;
  supportsTopup: boolean;
  hasSkinApi: boolean;
  isHot: boolean;
  sortOrder: number;
  /** Label + hint for the top-up UID field (game-specific). */
  uidLabel: string;
  uidHint: string;
  /** Extra field next to UID, e.g. MLBB zone ID. */
  uidExtraLabel?: string;
  /** Fixed choices for the extra field (e.g. Genshin server). */
  uidExtraOptions?: string[];
  /** Tailwind gradient classes for the game tile/banner art. */
  gradient: string;
  /** Currency sold via top-up, e.g. "VP". */
  topupCurrency?: string;
};

export const games: MockGame[] = [
  {
    slug: "valorant",
    name: "Valorant",
    publisher: "Riot Games",
    tagline: "Tactical shooter 5v5",
    description:
      "Akun Valorant dengan rank, koleksi skin, dan VP, semua dijual toko terverifikasi dan diserahkan lewat Rekber Room.",
    supportsAccount: true,
    supportsTopup: true,
    hasSkinApi: true,
    isHot: true,
    sortOrder: 1,
    uidLabel: "Riot ID",
    uidHint: "Contoh: NamaKamu#TAG, lihat di profil dalam game",
    gradient: "from-rose-500/80 via-red-500/70 to-violet-600/80",
    topupCurrency: "VP",
  },
  {
    slug: "mobile-legends",
    name: "Mobile Legends",
    publisher: "Moonton",
    tagline: "MOBA 5v5 mobile",
    description:
      "Akun Mobile Legends dengan rank, hero, dan skin, dijual toko terverifikasi dengan escrow dan proteksi pembeli.",
    supportsAccount: true,
    supportsTopup: true,
    hasSkinApi: false,
    isHot: true,
    sortOrder: 2,
    uidLabel: "User ID",
    uidHint: "Lihat di profil dalam game, contoh: 12345678",
    uidExtraLabel: "Zone ID",
    gradient: "from-sky-500/80 via-blue-600/70 to-indigo-600/80",
    topupCurrency: "Diamond",
  },
  {
    slug: "genshin-impact",
    name: "Genshin Impact",
    publisher: "HoYoverse",
    tagline: "Open-world action RPG",
    description:
      "Top-up Genesis Crystal Genshin Impact, proses instan, struk dikirim ke email dan WhatsApp.",
    supportsAccount: false,
    supportsTopup: true,
    hasSkinApi: false,
    isHot: false,
    sortOrder: 3,
    uidLabel: "UID",
    uidHint: "UID 9 digit, lihat di pojok kanan bawah layar game",
    uidExtraLabel: "Server",
    uidExtraOptions: ["Asia", "America", "Europe", "TW, HK, MO"],
    gradient: "from-amber-400/80 via-orange-500/70 to-emerald-500/70",
    topupCurrency: "Genesis Crystal",
  },
  {
    slug: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    tagline: "Battle royale mobile",
    description:
      "Top-up Diamond Free Fire, proses instan, struk dikirim ke email dan WhatsApp.",
    supportsAccount: false,
    supportsTopup: true,
    hasSkinApi: false,
    isHot: false,
    sortOrder: 4,
    uidLabel: "Player ID",
    uidHint: "Lihat di profil dalam game",
    gradient: "from-orange-500/80 via-amber-500/70 to-red-600/80",
    topupCurrency: "Diamond",
  },
];

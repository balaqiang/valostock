// Demo data. Read by src/lib/data/* until the Express API (back/) serves it,
// and the seed source for back/prisma/seed.ts. Components import only its
// types (enforced by ESLint).
// Game-specific fields (rank, level, server…) become CATALOGS.attributes (JSON).

export type MockListing = {
  id: string;
  /** Game slug — routes /[game]/account (docs/SITEMAP.md). */
  game: string;
  title: string;
  rank: string;
  skins: number;
  totalVp: number;
  price: number;
  oldPrice?: number;
  store: string;
  /** Store slug — routes /store/[slug]. */
  storeSlug: string;
  verified: boolean;
  rating: number;
  sold: number;
  instant: boolean;
  image: string;
  // Detail page
  code: string;
  server: string;
  images: string[];
  skinsList: string[];
  remainingVp: number;
  remainingRp: number;
  remainingKc: number;
  agents: string;
  battlepass: string[];
  changeNick: boolean;
  emailStatus: string;
  region: string;
  premier: string;
  level: number;
  episodeAct: string;
  radianite: number;
  verifiedAt: string;
};

type DefaultedField =
  | "game"
  | "remainingRp"
  | "remainingKc"
  | "agents"
  | "battlepass"
  | "changeNick"
  | "emailStatus"
  | "region"
  | "premier"
  | "level"
  | "episodeAct"
  | "radianite"
  | "verifiedAt";

type RawListing = Omit<MockListing, "images" | "storeSlug" | DefaultedField> &
  Partial<Pick<MockListing, DefaultedField>>;

const detailDefaults: Pick<MockListing, DefaultedField> = {
  game: "valorant",
  remainingRp: 0,
  remainingKc: 0,
  agents: "FULL",
  battlepass: [],
  changeNick: true,
  emailStatus: "Terverifikasi, bisa diganti",
  region: "IDN",
  premier: "Unverified",
  level: 54,
  episodeAct: "V25 // ACT III",
  radianite: 25,
  verifiedAt: "5 Jul 2026",
};

function storeSlugOf(store: string): string {
  return store.toLowerCase();
}

// 10 product photos in /public/images/products — 5 per listing, cycled.
function productImages(seed: number): string[] {
  return Array.from(
    { length: 5 },
    (_, i) => `/images/products/${((seed + i) % 10) + 1}.jpeg`,
  );
}

const raw: RawListing[] = [
  {
    id: "vl-001",
    title: "Akun Valorant Radiant, Full Skin Vandal & Phantom",
    rank: "Radiant",
    skins: 142,
    totalVp: 208500,
    price: 8500000,
    store: "AstralStore",
    verified: true,
    rating: 4.94,
    sold: 231,
    instant: true,
    image: "/images/agents/Jett_icon.png",
    code: "RDX91",
    server: "Indonesia",
    skinsList: [
      "Champions 2023 Vandal",
      "Kuronami Vandal",
      "Elderflame Operator",
      "RGX 11z Pro Vandal",
      "Oni Phantom",
      "Ion Sheriff",
    ],
    remainingVp: 1250,
    remainingRp: 320,
    battlepass: ["V25 A1 FULL", "V25 A2 FULL", "V25 A3 FULL"],
    level: 214,
    episodeAct: "V26 // ACT IV",
    radianite: 145,
    verifiedAt: "7 Jul 2026",
  },
  {
    id: "vl-002",
    title: "Akun Valorant Immortal 3, 87 Skin, Champions 2023",
    rank: "Immortal 3",
    skins: 87,
    totalVp: 126300,
    price: 4250000,
    oldPrice: 4800000,
    store: "NusaGame",
    verified: true,
    rating: 4.87,
    sold: 412,
    instant: true,
    image: "/images/agents/Reyna_icon.png",
    code: "IMT38",
    server: "Indonesia",
    skinsList: [
      "Champions 2023 Vandal",
      "Prime Vandal",
      "Reaver Vandal",
      "Singularity Phantom",
    ],
    remainingVp: 375,
    remainingRp: 590,
    battlepass: ["V25 A2 FULL", "V25 A3 FULL"],
    level: 121,
    radianite: 80,
    verifiedAt: "6 Jul 2026",
  },
  {
    id: "vl-003",
    title: "Akun Valorant Immortal 1, Reaver Set Lengkap",
    rank: "Immortal 1",
    skins: 64,
    totalVp: 98400,
    price: 2900000,
    store: "VerdantShop",
    verified: true,
    rating: 4.91,
    sold: 189,
    instant: false,
    image: "/images/agents/Omen_icon.png",
    code: "IMR12",
    server: "Asia Pacific",
    skinsList: ["Reaver Vandal", "Oni Phantom", "Prelude to Chaos Vandal"],
    remainingVp: 820,
    battlepass: ["V25 A1 FULL"],
  },
  {
    id: "vl-004",
    title: "Akun Valorant Ascendant 2, Prime & Ion Collection",
    rank: "Ascendant 2",
    skins: 52,
    totalVp: 74200,
    price: 1850000,
    oldPrice: 2100000,
    store: "AstralStore",
    verified: true,
    rating: 4.94,
    sold: 231,
    instant: true,
    image: "/images/agents/Chamber_icon.png",
    code: "ASC27",
    server: "Indonesia",
    skinsList: ["Prime Vandal", "Ion Sheriff", "Neptune Vandal"],
    remainingVp: 145,
    remainingKc: 2100,
  },
  {
    id: "vl-005",
    title: "Akun Valorant Diamond 3, 45 Skin + Buddy Langka",
    rank: "Diamond 3",
    skins: 45,
    totalVp: 58900,
    price: 1250000,
    store: "GudangAkun",
    verified: true,
    rating: 4.82,
    sold: 764,
    instant: true,
    image: "/images/agents/Neon_icon.png",
    code: "DMD53",
    server: "Singapore",
    skinsList: ["Glitchpop Vandal", "Recon Phantom", "Sentinels of Light Vandal"],
    remainingVp: 560,
    agents: "19 Agent",
  },
  {
    id: "vl-006",
    title: "Akun Valorant Diamond 1, Elderflame Operator",
    rank: "Diamond 1",
    skins: 38,
    totalVp: 51200,
    price: 980000,
    store: "NusaGame",
    verified: true,
    rating: 4.87,
    sold: 412,
    instant: false,
    image: "/images/agents/Phoenix_icon.png",
    code: "DMD11",
    server: "Malaysia",
    skinsList: ["Elderflame Operator", "Prime Vandal"],
    remainingVp: 90,
    agents: "17 Agent",
  },
  {
    id: "vl-007",
    title: "Akun Valorant Platinum 2, Glitchpop & RGX",
    rank: "Platinum 2",
    skins: 31,
    totalVp: 42800,
    price: 750000,
    oldPrice: 850000,
    store: "SkyVault",
    verified: false,
    rating: 4.7,
    sold: 95,
    instant: true,
    image: "/images/agents/Sage_icon.png",
    code: "PLT29",
    server: "Philippines",
    skinsList: ["Glitchpop Vandal", "RGX 11z Pro Vandal"],
    remainingVp: 310,
    agents: "15 Agent",
    changeNick: false,
  },
  {
    id: "vl-008",
    title: "Akun Valorant Gold 3, Rank Siap Push, 28 Skin",
    rank: "Gold 3",
    skins: 28,
    totalVp: 33500,
    price: 520000,
    store: "GudangAkun",
    verified: true,
    rating: 4.82,
    sold: 764,
    instant: true,
    image: "/images/agents/Killjoy_icon.png",
    code: "GLD36",
    server: "Indonesia",
    skinsList: ["Recon Phantom", "Neptune Vandal"],
    remainingVp: 205,
    agents: "14 Agent",
  },
  {
    id: "vl-009",
    title: "Akun Valorant Immortal 2, Kuronami & Araxys",
    rank: "Immortal 2",
    skins: 76,
    totalVp: 112700,
    price: 3600000,
    store: "VerdantShop",
    verified: true,
    rating: 4.91,
    sold: 189,
    instant: false,
    image: "/images/agents/Clove_icon.png",
    code: "IMK75",
    server: "Indonesia",
    skinsList: ["Kuronami Vandal", "Araxys Vandal", "Oni Phantom"],
    remainingVp: 980,
    remainingRp: 120,
    battlepass: ["V25 A3 FULL"],
  },
  {
    id: "vl-010",
    title: "Akun Valorant Ascendant 1, Sentinels of Light",
    rank: "Ascendant 1",
    skins: 47,
    totalVp: 66100,
    price: 1550000,
    store: "SkyVault",
    verified: false,
    rating: 4.7,
    sold: 95,
    instant: true,
    image: "/images/agents/Iso_icon.png",
    code: "ASL14",
    server: "Asia Pacific",
    skinsList: ["Sentinels of Light Vandal", "Gaia's Vengeance Vandal"],
    remainingVp: 430,
  },
  {
    id: "vl-011",
    title: "Akun Valorant Platinum 3, Oni Phantom + Melee",
    rank: "Platinum 3",
    skins: 34,
    totalVp: 47300,
    price: 820000,
    oldPrice: 900000,
    store: "AstralStore",
    verified: true,
    rating: 4.94,
    sold: 231,
    instant: true,
    image: "/images/agents/Sova_icon.png",
    code: "PLO33",
    server: "Indonesia",
    skinsList: ["Oni Phantom", "Singularity Phantom"],
    remainingVp: 275,
    agents: "16 Agent",
  },
  {
    id: "vl-012",
    title: "Akun Valorant Silver 1, Akun Smurf Bersih",
    rank: "Silver 1",
    skins: 12,
    totalVp: 14800,
    price: 350000,
    store: "NusaGame",
    verified: true,
    rating: 4.87,
    sold: 412,
    instant: true,
    image: "/images/agents/Astra_icon.png",
    code: "SLV10",
    server: "Indonesia",
    skinsList: ["Prime Vandal"],
    remainingVp: 55,
    agents: "9 Agent",
    changeNick: false,
    premier: "Belum diverifikasi",
  },
];

export const listings: MockListing[] = raw.map((listing, index) => ({
  ...detailDefaults,
  ...listing,
  storeSlug: storeSlugOf(listing.store),
  images: productImages(index),
}));

// Builds a mock account inventory for the detail page: the listing's skin
// count is distributed across weapon categories with real skins from the
// vinfo-api catalog, seeded by listing id so it is stable across builds.
// Real inventories come from the seller's draft once the backend lands.

import {
  getWeaponCatalog,
  type CatalogSkin,
  type Edition,
} from "@/lib/valorant/skins";

export type WeaponGroup = {
  weapon: string;
  typeIcon: string;
  skins: CatalogSkin[];
};

export type CollectionCategory = {
  label: string;
  count: number;
  weapons: WeaponGroup[];
};

export type AccountCollection = {
  categories: CollectionCategory[];
  total: number;
  editions: Record<Edition, number>;
};

const CATEGORIES: { label: string; weapons: string[] }[] = [
  { label: "SIDEARMS", weapons: ["Classic", "Shorty", "Frenzy", "Ghost", "Sheriff"] },
  { label: "SMGS", weapons: ["Stinger", "Spectre"] },
  { label: "SHOTGUNS", weapons: ["Bucky", "Judge"] },
  { label: "RIFLES", weapons: ["Bulldog", "Guardian", "Phantom", "Vandal"] },
  { label: "SNIPER RIFLES", weapons: ["Marshal", "Outlaw", "Operator"] },
  { label: "MACHINE GUNS", weapons: ["Ares", "Odin"] },
  { label: "MELEE", weapons: ["Melee"] },
];

// Popular weapons get a larger share of an account's skins.
const WEIGHTS: Record<string, number> = {
  Vandal: 4,
  Phantom: 4,
  Melee: 3,
  Operator: 2,
  Sheriff: 2,
  Ghost: 2,
};

function weaponTypeIcon(weapon: string): string {
  const file = weapon === "Melee" ? "tactical-knife" : weapon.toLowerCase();
  return `/images/icon/weapon-type/${file}.png`;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function buildCollection(
  listingId: string,
  targetTotal: number,
  featured: string[],
): Promise<AccountCollection> {
  const catalog = await getWeaponCatalog();
  const random = mulberry32(hashSeed(listingId));
  const allWeapons = CATEGORIES.flatMap((category) => category.weapons);
  const totalWeight = allWeapons.reduce(
    (sum, weapon) => sum + (WEIGHTS[weapon] ?? 1),
    0,
  );

  const owned = new Map<string, CatalogSkin[]>();
  for (const weapon of allWeapons) {
    const pool = catalog.get(weapon.toLowerCase()) ?? [];
    const share = Math.round(
      (targetTotal * (WEIGHTS[weapon] ?? 1)) / totalWeight,
    );
    owned.set(weapon, shuffled(pool, random).slice(0, Math.min(share, pool.length)));
  }

  // Featured skins from the listing must appear in their weapon group.
  for (const name of featured) {
    const weapon = allWeapons.find((w) =>
      name.toLowerCase().endsWith(w.toLowerCase()),
    );
    if (!weapon) continue;
    const pool = catalog.get(weapon.toLowerCase()) ?? [];
    const skin = pool.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!skin) continue;
    const current = (owned.get(weapon) ?? []).filter(
      (s) => s.name !== skin.name,
    );
    owned.set(weapon, [skin, ...current]);
  }

  const categories: CollectionCategory[] = CATEGORIES.map((category) => {
    const weapons = category.weapons.map((weapon) => ({
      weapon,
      typeIcon: weaponTypeIcon(weapon),
      skins: owned.get(weapon) ?? [],
    }));
    return {
      label: category.label,
      weapons,
      count: weapons.reduce((sum, group) => sum + group.skins.length, 0),
    };
  });

  const editions: Record<Edition, number> = {
    select: 0,
    deluxe: 0,
    premium: 0,
    ultra: 0,
    exclusive: 0,
  };
  for (const category of categories) {
    for (const group of category.weapons) {
      for (const skin of group.skins) editions[skin.edition]++;
    }
  }

  return {
    categories,
    total: categories.reduce((sum, category) => sum + category.count, 0),
    editions,
  };
}

// Weapon-skin catalog via vinfo-api.com (server-side only).
// Fetched once and cached for a day; failures degrade to an empty catalog
// so pages render without icons instead of breaking.

const API_URL = "https://vinfo-api.com/json/weaponSkins2";

type ApiChroma = { displayIcon?: string | null };
type ApiSkin = {
  name?: string;
  price?: Record<string, number | null>;
  chromas?: ApiChroma[];
};
type ApiWeapon = { displayName?: string; skins?: ApiSkin[] };

export type Edition = "select" | "deluxe" | "premium" | "ultra" | "exclusive";

export type CatalogSkin = {
  name: string;
  icon: string | null;
  edition: Edition;
};

/** Weapon display name (lowercase) → its purchasable skins. */
export type WeaponCatalog = Map<string, CatalogSkin[]>;

// Store tiers by VP price: Select 875, Deluxe 1275, Premium 1775, Ultra 2475.
// No store price (bundle/event-only) counts as Exclusive.
function editionFromPrice(price?: Record<string, number | null>): Edition {
  const vp = price
    ? Object.values(price).find((v): v is number => typeof v === "number")
    : undefined;
  if (vp === undefined) return "exclusive";
  if (vp <= 875) return "select";
  if (vp <= 1275) return "deluxe";
  if (vp <= 1775) return "premium";
  if (vp <= 2475) return "ultra";
  return "exclusive";
}

export async function getWeaponCatalog(): Promise<WeaponCatalog> {
  const catalog: WeaponCatalog = new Map();
  try {
    const res = await fetch(API_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return catalog;

    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return catalog;

    for (const entry of Object.values(data as Record<string, ApiWeapon>)) {
      const weapon = entry?.displayName;
      if (typeof weapon !== "string" || !Array.isArray(entry.skins)) continue;

      const skins: CatalogSkin[] = [];
      for (const skin of entry.skins) {
        if (typeof skin?.name !== "string") continue;
        // Skip non-cosmetic entries (default & random-favorite skins).
        if (/^(standard|random)/i.test(skin.name)) continue;
        skins.push({
          name: skin.name,
          icon: skin.chromas?.[0]?.displayIcon ?? null,
          edition: editionFromPrice(skin.price),
        });
      }
      catalog.set(weapon.toLowerCase(), skins);
    }
  } catch {
    // Network/API failure — render without the catalog.
  }
  return catalog;
}

// Public game catalogue from the API (back/src/modules/games).
import { publicApiGet } from "@/lib/api-server";
import type { Game, TopupProduct } from "@/types/api";

export async function getGames(): Promise<Game[]> {
  return (await publicApiGet<{ games: Game[] }>("/api/games"))?.games ?? [];
}

/** One game and its active products, or null when the slug is unknown. */
export async function getGameWithProducts(slug: string): Promise<{ game: Game; products: TopupProduct[] } | null> {
  return publicApiGet<{ game: Game; products: TopupProduct[] }>(`/api/games/${encodeURIComponent(slug)}`);
}

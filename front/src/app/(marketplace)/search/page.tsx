import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { SearchExplorer } from "@/components/search/search-explorer";
import { getGameFields, getGames, getListings, getStores } from "@/lib/data/catalog";
import { tiersFromOptions } from "@/lib/rank-tiers";

export const metadata: Metadata = {
  title: "Cari Akun | valostock.id",
  description:
    "Cari akun game dengan filter lengkap: game, rank, harga, skin, region, badge, dan level toko. Semua transaksi lewat escrow.",
};

export default async function SearchPage() {
  const [all, games, stores] = await Promise.all([getListings(), getGames(), getStores()]);
  const storeLevels = Object.fromEntries(stores.map((store) => [store.slug, store.level]));
  // Store rating/sold per listing, for the "Rating toko" sort and the cards.
  const byStore = new Map(stores.map((store) => [store.slug, store]));
  const listings = all.map((l) => ({ ...l, rating: byStore.get(l.storeSlug)?.rating ?? 0, sold: byStore.get(l.storeSlug)?.sold ?? 0 }));
  // Rank filter per game, from each game's "rank" field template (Valorant tiers, MLBB tiers, …).
  const accountGames = games.filter((game) => game.supportsAccount);
  const fields = await Promise.all(accountGames.map((game) => getGameFields(game.slug)));
  const rankTiers = Object.fromEntries(
    accountGames.map((game, i) => [game.slug, tiersFromOptions(fields[i]?.find((f) => f.key === "rank")?.options ?? [])]),
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-12">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Cari Akun
            </h1>
            <p className="mt-2 text-text-secondary">
              Semua akun dijual toko terverifikasi dan dilindungi escrow +
              proteksi 14/30 hari.
            </p>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <SearchExplorer
            listings={listings}
            games={accountGames}
            rankTiers={rankTiers}
            storeLevels={storeLevels}
          />
        </Container>
      </main>

      <Footer />
    </div>
  );
}

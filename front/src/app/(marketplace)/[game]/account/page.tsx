import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gamepad2, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { FilterBar, type FilterDef } from "@/components/listings/filter-bar";
import { getGame, listingsByGame } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game: slug } = await params;
  const game = await getGame(slug);
  return {
    title: game
      ? `Akun ${game.name} — valostock.id`
      : "Game tidak ditemukan — valostock.id",
    description: game?.description,
  };
}

// Game-specific filters — mirrors CATALOGS.attributes (JSONB) per game
// (docs/SITEMAP.md §1: "game-specific filters from attributes").
const gameFilters: Record<string, FilterDef[]> = {
  valorant: [
    {
      key: "server",
      label: "Server",
      options: ["Semua", "Indonesia", "Asia Pacific", "Malaysia", "Philippines", "Singapore"],
      defaultValue: "Semua",
    },
    {
      key: "rank",
      label: "Rank",
      options: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
      multi: true,
    },
    {
      key: "vp",
      label: "Valorant Points",
      options: ["0 – 1.000 VP", "1.000 – 5.000 VP", "5.000 – 10.000 VP", "10.000+ VP"],
    },
    {
      key: "level",
      label: "Account Level",
      options: ["1 – 50", "51 – 100", "101 – 200", "200+"],
    },
    {
      key: "skins",
      label: "Skins Count",
      options: ["< 25 skin", "25 – 50 skin", "50 – 100 skin", "100+ skin"],
    },
    { key: "platform", label: "Platforms", options: ["PC", "Console"], multi: true },
  ],
  "mobile-legends": [
    {
      key: "server",
      label: "Server",
      options: ["Semua", "Indonesia", "Malaysia", "Philippines", "Singapore"],
      defaultValue: "Semua",
    },
    {
      key: "rank",
      label: "Rank",
      options: ["Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend", "Mythic", "Mythical Glory"],
      multi: true,
    },
    {
      key: "heroes",
      label: "Jumlah Hero",
      options: ["< 40", "40 – 80", "80 – 120", "120+"],
    },
    {
      key: "skins",
      label: "Jumlah Skin",
      options: ["< 25 skin", "25 – 100 skin", "100 – 300 skin", "300+ skin"],
    },
  ],
};

const sort: FilterDef = {
  key: "sort",
  label: "Urutkan",
  prefix: "Urutkan",
  options: ["Terbaru", "Terpopuler", "Termurah", "Termahal", "Rating toko"],
  defaultValue: "Terbaru",
};

export default async function GameAccountPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game: slug } = await params;
  const game = await getGame(slug);
  if (!game || !game.supportsAccount) notFound();

  const gameListings = await listingsByGame(game.slug);
  const filters = gameFilters[game.slug] ?? [];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* Game banner */}
        <section
          className={`relative overflow-hidden bg-gradient-to-br ${game.gradient}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/30"
          />
          <Container className="relative py-12 sm:py-16">
            <p className="eyebrow text-white/70">{game.publisher}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Akun {game.name}
            </h1>
            <p className="mt-3 max-w-2xl text-white/85">{game.description}</p>
            {game.supportsTopup && (
              <Button
                href={`/${game.slug}/topup`}
                variant="ghost"
                size="md"
                className="mt-5 border border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Wallet className="h-4 w-4" />
                Top-Up {game.topupCurrency}
              </Button>
            )}
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          {filters.length > 0 && <FilterBar filters={filters} sort={sort} />}

          <p className="mt-5 text-sm text-text-secondary">
            <span className="num font-medium text-text">
              {gameListings.length}
            </span>{" "}
            akun {game.name} tersedia
          </p>

          {gameListings.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {gameListings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  priority={index < 4}
                />
              ))}
            </div>
          ) : (
            /* Empty state (SITEMAP §10) */
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Gamepad2 className="h-8 w-8 text-text-secondary" />
              <p className="mt-3 font-medium text-text">
                Belum ada akun {game.name} yang dijual
              </p>
              <p className="mt-1 max-w-sm text-sm text-text-secondary">
                Toko-toko sedang menyiapkan katalognya. Ikuti toko favoritmu
                atau cek game lain dulu.
              </p>
              <div className="mt-4 flex gap-2">
                <Button href="/search" variant="secondary" size="md">
                  Cari akun lain
                </Button>
                {game.supportsTopup && (
                  <Button href={`/${game.slug}/topup`} variant="primary" size="md">
                    Top-Up {game.name}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

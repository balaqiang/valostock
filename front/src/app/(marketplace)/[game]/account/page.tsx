import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gamepad2, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { TemplateFilters, toListingQuery, type FilterValues } from "@/components/listings/template-filters";
import { getGame, getGameFields, searchListings } from "@/lib/data/catalog";

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

export default async function GameAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<FilterValues>;
}) {
  const { game: slug } = await params;
  const values = await searchParams;
  const game = await getGame(slug);
  if (!game || !game.supportsAccount) notFound();

  const fields = await getGameFields(game.slug);
  const gameListings = await searchListings({ game: game.slug, limit: 200, ...toListingQuery(values, fields) });

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
          <TemplateFilters action={`/${game.slug}/account`} fields={fields} values={values} />

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

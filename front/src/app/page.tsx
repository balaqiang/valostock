import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gamepad2,
  Lock,
  ScanLine,
  Search,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { StoreCta } from "@/components/marketing/store-cta";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { GameCard } from "@/components/games/game-card";
import { ListingCard } from "@/components/listings/listing-card";
import { NewsCard } from "@/components/news/news-card";
import { getGames, getListings } from "@/lib/data/catalog";
import { getFollowedGameSlugs } from "@/lib/data/buyer";
import { getCurrentUser } from "@/lib/auth";
import { newsArticles } from "@/app/(marketplace)/news/mock-data";

export const metadata: Metadata = {
  title: "valostock.id — Marketplace Akun Game & Top-Up",
  description:
    "Beli akun game dari toko terverifikasi dengan escrow, atau top-up instan. Dana ditahan sampai akun terbukti aman di tanganmu.",
};

function SectionHeading({
  title,
  href,
  linkLabel = "Lihat semua",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

const trustPoints = [
  { icon: ShieldCheck, label: "Escrow di setiap transaksi" },
  { icon: BadgeCheck, label: "Toko wajib KYC + deposit" },
  { icon: ScanLine, label: "Akun bisa diinspeksi (Account Checked)" },
  { icon: Lock, label: "Serah terima diawasi admin" },
];

export default async function Home() {
  const [games, listings, user] = await Promise.all([getGames(), getListings(), getCurrentUser()]);
  const hotGames = games.filter((game) => game.isHot);
  const featured = listings.slice(0, 4);
  const newest = listings.slice(4, 12);
  const latestNews = newsArticles.slice(0, 3);
  // "Your Games" — games the logged-in buyer follows (hidden for guests).
  const followed = user ? await getFollowedGameSlugs(user.id) : [];
  const yourGames = followed
    .map((slug) => games.find((game) => game.slug === slug))
    .filter((game) => game !== undefined);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* ── Hero / banner ads slot ─────────────────────────────── */}
        <section className="border-b border-border bg-surface">
          <Container className="py-8 sm:py-10">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 px-6 py-12 sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
              />
              <p className="eyebrow text-white/70">
                Marketplace akun game & top-up
              </p>
              <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                Beli akun impianmu, dananya kami jaga sampai aman.
              </h1>
              <p className="mt-4 max-w-xl text-white/80">
                Semua penjual adalah toko terverifikasi (KYC + deposit). Dana
                ditahan di escrow dan serah terima diawasi admin di Rekber
                Room.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href="/search" variant="invert" size="lg" className="bg-white text-zinc-900 hover:bg-white/90">
                  <Search className="h-4 w-4" />
                  Jelajahi Akun
                </Button>
                <Button
                  href="/topup"
                  variant="ghost"
                  size="lg"
                  className="border border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  <Wallet className="h-4 w-4" />
                  Top-Up Instan
                </Button>
              </div>
            </div>

            {/* Trust strip */}
            <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {trustPoints.map((point) => (
                <li
                  key={point.label}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-secondary"
                >
                  <point.icon className="h-4 w-4 flex-none text-primary" />
                  {point.label}
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ── Product-type buttons (SITEMAP: Accounts · Top-Up) ──── */}
        <Container className="py-10 sm:py-12">
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/search"
                className="group flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Gamepad2 className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-text">
                    Akun Game
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Jelajahi akun dari toko terverifikasi — semua lewat escrow.
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 flex-none text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
              <Link
                href="/topup"
                className="group flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Wallet className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-text">
                    Top-Up
                  </span>
                  <span className="block text-sm text-text-secondary">
                    VP, Diamond, dan lainnya — instan, struk ke email/WA.
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 flex-none text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            </div>
          </Reveal>

          {/* ── Your Games (followed) ─────────────────────────────── */}
          {yourGames.length > 0 && (
            <Reveal className="mt-14">
              <SectionHeading title="Game Kamu" href="/account/following" linkLabel="Kelola" />
              <p className="mt-1 text-sm text-text-secondary">
                Berdasarkan game dan toko yang kamu ikuti.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {yourGames.map((game) => (
                  <GameCard key={game.slug} game={game} />
                ))}
              </div>
            </Reveal>
          )}

          {/* ── Hot Games ─────────────────────────────────────────── */}
          <Reveal className="mt-14">
            <SectionHeading title="Game Populer" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...hotGames, ...games.filter((game) => !game.isHot)].map(
                (game) => (
                  <GameCard key={game.slug} game={game} />
                ),
              )}
            </div>
          </Reveal>

          {/* ── Featured listings ─────────────────────────────────── */}
          <Reveal className="mt-14">
            <SectionHeading title="Akun Unggulan" href="/search" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {featured.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  priority={index < 4}
                />
              ))}
            </div>
          </Reveal>

          {/* ── Newest listings ───────────────────────────────────── */}
          <Reveal className="mt-14">
            <SectionHeading title="Baru Ditambahkan" href="/search" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {newest.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Reveal>

          {/* ── News strip ────────────────────────────────────────── */}
          <Reveal className="mt-14">
            <SectionHeading title="Berita Terbaru" href="/news" />
            <div className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((article) => (
                <NewsCard key={article.slug} article={article} />
              ))}
            </div>
          </Reveal>

          {/* Instant-delivery note */}
          <p className="mt-12 flex items-center justify-center gap-2 text-center text-xs text-text-secondary">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Payout toko cair 5 jam setelah akun aman — proteksi pembeli 14/30
            hari di setiap pesanan.
          </p>
        </Container>

        <StoreCta />
      </main>

      <Footer />
    </div>
  );
}

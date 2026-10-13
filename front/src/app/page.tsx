import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck, Wallet, Zap } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { GameCard } from "@/components/games/game-card";
import { getGames } from "@/lib/data/games";

const highlights = [
  { icon: Zap, label: "Item dikirim otomatis setelah pembayaran terkonfirmasi" },
  { icon: ShieldCheck, label: "Harga, biaya layanan, dan total bayar tampil sebelum kamu membayar" },
  { icon: FileSearch, label: "Lacak status kapan saja dengan nomor invoice" },
];

// Beranda = halaman Top-Up (SKPL 4.3.1 + 4.3.4): pick a game, or check an invoice.
export default async function HomePage() {
  const games = await getGames();

  return (
    <SiteShell>
      <section className="border-b border-border bg-surface">
        <Container className="py-12 sm:py-16">
          <p className="eyebrow text-primary">valostock.id</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight text-text sm:text-5xl">
            Top-up game cepat, bayar dengan cara favoritmu
          </h1>
          <p className="mt-4 max-w-2xl text-text-secondary">
            VP, Diamond, dan Genesis Crystal langsung masuk ke akun game. Bayar lewat QRIS, Virtual Account, e-wallet,
            retail, kartu kredit, atau Balance.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-secondary"
              >
                <item.icon className="h-4 w-4 flex-none text-primary" />
                {item.label}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-10 sm:py-12">
        <Reveal>
          <h2 className="font-display text-2xl font-bold tracking-tight text-text">Pilih Game</h2>
          {games.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-text-secondary">
              Daftar game belum bisa dimuat.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {games.map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>
          )}
        </Reveal>

        <Reveal className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/topup/invoice"
              className="group flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary/40"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileSearch className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold text-text">Cek Invoice Kamu</span>
                <span className="block text-sm text-text-secondary">Lacak status top-up dengan nomor invoice.</span>
              </span>
              <ArrowRight className="h-5 w-5 flex-none text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
            </Link>

            <Link
              href="/balance"
              className="group flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary/40"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold text-text">Balance (BLC)</span>
                <span className="block text-sm text-text-secondary">
                  Saldo prabayar khusus top-up, bayar tanpa biaya metode. Tidak bisa dicairkan atau ditransfer.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 flex-none text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>
        </Reveal>
      </Container>
    </SiteShell>
  );
}

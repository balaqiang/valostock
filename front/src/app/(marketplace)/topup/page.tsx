import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileSearch, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { GameCard } from "@/components/games/game-card";
import { getGames } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Top-Up Game — valostock.id",
  description:
    "Top-up VP, Diamond, dan item game lain — instan, bayar lewat QRIS, VA, e-wallet, retail, kartu kredit, atau Balance.",
};

export default async function TopupHubPage() {
  const topupGames = (await getGames()).filter((game) => game.supportsTopup);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-14">
            <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Top-Up Game
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Pilih game, masukkan ID player, bayar — item masuk otomatis dan
              struk dikirim ke email/WhatsApp kamu.
            </p>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-tight text-text">
              Pilih Game
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topupGames.map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Invoice check entry */}
              <Link
                href="/topup/invoice"
                className="group flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileSearch className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold text-text">
                    Cek Invoice Kamu
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Lacak status top-up dengan nomor invoice.
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 flex-none text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
              </Link>

              {/* Balance teaser — closed-loop per MONEY_RULES §8b */}
              <div className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-6">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Wallet className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold text-text">
                    Balance (BLC)
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Saldo prabayar khusus top-up — closed-loop, tidak bisa
                    dicairkan atau dipakai beli akun.{" "}
                    <Link
                      href="/help/kenapa-balance-tidak-bisa-beli-akun"
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      Pelajari
                    </Link>
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

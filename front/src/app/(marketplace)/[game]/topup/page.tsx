import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSearch, Gamepad2, ShieldCheck, Zap } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { GameBannerBackdrop } from "@/components/games/game-banner";
import { Button } from "@/components/ui/button";
import { TopupForm } from "@/components/topup/topup-form";
import { getGame, topupProductsByGame } from "@/lib/data/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game: slug } = await params;
  const game = await getGame(slug);
  return {
    title: game
      ? `Top-Up ${game.name} | valostock.id`
      : "Game tidak ditemukan | valostock.id",
    description: game
      ? `Top-up ${game.topupCurrency ?? "item"} ${game.name} instan, bayar QRIS, VA, e-wallet, retail, kartu kredit, atau Balance.`
      : undefined,
  };
}

const notes = [
  { icon: Zap, label: "Proses instan setelah pembayaran terkonfirmasi" },
  { icon: ShieldCheck, label: "Struk dikirim ke email & WhatsApp kamu" },
  { icon: FileSearch, label: "Lacak status dengan nomor invoice" },
];

export default async function GameTopupPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game: slug } = await params;
  const game = await getGame(slug);
  if (!game || !game.supportsTopup) notFound();

  const products = await topupProductsByGame(game.slug);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* Game banner */}
        <section className="relative overflow-hidden">
          <GameBannerBackdrop image={game.image} gradient={game.gradient} sizes="100vw" priority />
          {!game.image && <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/30" />}
          <Container className="relative py-12 sm:py-16">
            <p className="eyebrow text-white/70">{game.publisher}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Top-Up {game.name}
            </h1>
            <p className="mt-3 max-w-2xl text-white/85">
              {game.topupCurrency} masuk otomatis setelah pembayaran, tanpa
              login akun, cukup {game.uidLabel}.
            </p>
            {game.supportsAccount && (
              <Button
                href={`/${game.slug}/account`}
                variant="ghost"
                size="md"
                className="mt-5 border border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <Gamepad2 className="h-4 w-4" />
                Lihat Akun {game.name}
              </Button>
            )}
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          {/* Notes strip */}
          <ul className="mb-8 grid gap-3 sm:grid-cols-3">
            {notes.map((note) => (
              <li
                key={note.label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
              >
                <note.icon className="h-4 w-4 flex-none text-primary" />
                {note.label}
              </li>
            ))}
          </ul>

          <TopupForm game={game} products={products} />

          <p className="mt-10 text-center text-xs text-text-secondary">
            Sudah memesan?{" "}
            <Link
              href="/topup/invoice"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Cek status invoice kamu di sini
            </Link>
            . Refund hanya jika item tidak masuk, dikembalikan ke Balance
            (lihat{" "}
            <Link
              href="/help/kebijakan-refund-top-up"
              className="font-medium text-primary hover:text-primary-hover"
            >
              kebijakan refund
            </Link>
            ).
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

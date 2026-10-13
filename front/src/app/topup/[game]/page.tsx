import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSearch, ShieldCheck, Zap } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";
import { GameBannerBackdrop } from "@/components/games/game-banner";
import { TopupForm } from "@/components/topup/topup-form";
import { getGameWithProducts } from "@/lib/data/games";

type Params = { params: Promise<{ game: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getGameWithProducts((await params).game);
  if (!data) return { title: "Game tidak ditemukan | valostock.id" };
  const { game } = data;
  return {
    title: `Top-Up ${game.name} | valostock.id`,
    description: `Top-up ${game.topupCurrency ?? "item"} ${game.name}, bayar QRIS, VA, e-wallet, retail, kartu kredit, atau Balance.`,
  };
}

const notes = [
  { icon: Zap, label: "Item dikirim setelah pembayaran terkonfirmasi" },
  { icon: ShieldCheck, label: "Total bayar dihitung server sebelum kamu membayar" },
  { icon: FileSearch, label: "Lacak status dengan nomor invoice" },
];

// Form Top-Up (SKPL 4.3.5): banner, five steps and the order summary.
export default async function GameTopupPage({ params }: Params) {
  const data = await getGameWithProducts((await params).game);
  if (!data) notFound();
  const { game, products } = data;

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <GameBannerBackdrop image={game.image} gradient={game.gradient} sizes="100vw" priority />
        {!game.image && <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/30" />}
        <Container className="relative py-12 sm:py-16">
          <p className="eyebrow text-white/70">{game.publisher}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Top-Up {game.name}</h1>
          <p className="mt-3 max-w-2xl text-white/85">
            {game.topupCurrency} masuk otomatis setelah pembayaran, tanpa login akun game, cukup {game.uidLabel}.
          </p>
        </Container>
      </section>

      <Container className="py-8 pb-28 sm:py-10 lg:pb-10">
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
          <Link href="/topup/invoice" className="font-medium text-primary hover:text-primary-hover">
            Cek status invoice kamu di sini
          </Link>
          .
        </p>
      </Container>
    </SiteShell>
  );
}

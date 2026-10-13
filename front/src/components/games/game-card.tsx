import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import type { Game } from "@/types/api";
import { GameBannerBackdrop } from "@/components/games/game-banner";

/** Game card on Beranda — opens the top-up form of that game. */
export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/topup/${game.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-200 hover:border-primary/40"
    >
      <div className="relative flex aspect-[4/3] items-end overflow-hidden p-4 sm:aspect-[5/3]">
        <GameBannerBackdrop
          image={game.image}
          gradient={game.gradient}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {game.isHot && (
          <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Flame className="h-3 w-3" />
            Populer
          </span>
        )}
        <div className="relative">
          <h3 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">{game.name}</h3>
          <p className="text-xs text-white/80">{game.publisher}</p>
        </div>
      </div>
      <span className="flex items-center justify-between px-4 py-3 text-sm font-medium text-text">
        Top-Up {game.topupCurrency ?? ""}
        <ArrowRight className="h-4 w-4 text-text-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
      </span>
    </Link>
  );
}

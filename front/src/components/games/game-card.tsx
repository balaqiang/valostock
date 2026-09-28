import Link from "next/link";
import { Flame, Gamepad2, Wallet } from "lucide-react";
import type { Game as MockGame } from "@/types/domain";

/** Per-game card on home/top-up hub — links to /[game]/account & /[game]/topup. */
export function GameCard({ game }: { game: MockGame }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-200 hover:border-primary/40">
      <div
        className={`relative flex aspect-[5/2] items-end bg-gradient-to-br p-4 ${game.gradient}`}
      >
        {game.isHot && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Flame className="h-3 w-3" />
            Hot
          </span>
        )}
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight text-white">
            {game.name}
          </h3>
          <p className="text-xs text-white/80">{game.tagline}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        {game.supportsAccount ? (
          <Link
            href={`/${game.slug}/account`}
            className="inline-flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-text transition-colors duration-200 hover:bg-surface-elevated hover:text-primary"
          >
            <Gamepad2 className="h-4 w-4" />
            Akun
          </Link>
        ) : (
          <span
            aria-disabled
            className="inline-flex items-center justify-center gap-1.5 py-3 text-sm text-text-secondary/50"
          >
            <Gamepad2 className="h-4 w-4" />
            Akun
          </span>
        )}
        {game.supportsTopup ? (
          <Link
            href={`/${game.slug}/topup`}
            className="inline-flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-text transition-colors duration-200 hover:bg-surface-elevated hover:text-primary"
          >
            <Wallet className="h-4 w-4" />
            Top-Up
          </Link>
        ) : (
          <span
            aria-disabled
            className="inline-flex items-center justify-center gap-1.5 py-3 text-sm text-text-secondary/50"
          >
            <Wallet className="h-4 w-4" />
            Top-Up
          </span>
        )}
      </div>
    </article>
  );
}

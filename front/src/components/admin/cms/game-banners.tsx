"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GameBannerBackdrop } from "@/components/games/game-banner";
import { CmsImageUpload } from "@/components/admin/cms/image-upload";
import type { Game } from "@/types/domain";

/** Banner per game: preview as the game card shows it, upload to replace, remove to fall back to the gradient. */
export function CmsGameBanners({ games }: { games: Game[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const save = async (game: Game, image: string | null) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/cms/games/${game.id}/banner`, { method: "PUT", body: JSON.stringify({ image }) });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan banner game.");
    }
  };

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <li key={game.slug} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="relative flex aspect-[5/2] items-end overflow-hidden p-4">
              <GameBannerBackdrop image={game.image} gradient={game.gradient} sizes="(min-width: 640px) 50vw, 100vw" />
              <div className="relative">
                <p className="font-display text-xl font-bold text-white">{game.name}</p>
                <p className="text-xs text-white/80">{game.image ? "Banner kustom" : "Gradien bawaan (belum ada banner)"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <CmsImageUpload kind="games" label={game.image ? "Ganti banner" : "Unggah banner"} onUploaded={(img) => save(game, img.path)} />
              {game.image && (
                <button
                  type="button"
                  onClick={() => window.confirm(`Hapus banner ${game.name}? Kartu dan header kembali ke gradien.`) && save(game, null)}
                  className="text-sm font-medium text-text-secondary hover:text-red-600"
                >
                  Hapus banner
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-secondary">Dipakai di kartu game (beranda, top-up) dan header halaman game. Rasio ideal 5:2 atau lebih lebar, subjek di tengah.</p>
    </div>
  );
}

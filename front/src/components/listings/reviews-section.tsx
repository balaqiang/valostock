import { Minus, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { formatDbDateTime } from "@/lib/format";
import type { PublicRating } from "@/types/api";

/** Real store reviews (ratings table) — buyers can only rate after a completed order. */
export function ReviewsSection({
  store,
  rating,
  reviews,
  ratings,
}: {
  store: string;
  rating: number;
  reviews: number;
  ratings: PublicRating[];
}) {
  const positive = ratings.filter((r) => r.overall === 1).length;
  const negative = ratings.filter((r) => r.overall === -1).length;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-text">Ulasan {store}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="num font-semibold text-text">{rating.toLocaleString("id-ID")}</span> dari{" "}
            <span className="num">{reviews}</span> ulasan
          </p>
        </div>
        {ratings.length > 0 && (
          <p className="text-xs text-text-secondary">
            <span className="num">{positive}</span> positif · <span className="num">{ratings.length - positive - negative}</span> netral ·{" "}
            <span className="num">{negative}</span> negatif (20 terbaru)
          </p>
        )}
      </div>
      {ratings.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border py-8 text-center text-sm text-text-secondary">Belum ada ulasan untuk toko ini.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ratings.slice(0, 6).map((r, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-text">
                  {r.overall === 1 ? (
                    <ThumbsUp className="h-4 w-4 text-emerald-500" />
                  ) : r.overall === -1 ? (
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-text-secondary" />
                  )}
                  {r.buyer}
                </p>
                <span className="text-xs text-text-secondary">{formatDbDateTime(r.date)}</span>
              </div>
              <p className="num mt-1 text-xs text-text-secondary">
                Akurasi {r.descAccuracy}/5 · Sikap {r.attitude}/5 · Kecepatan {r.deliverySpeed}/5
              </p>
              {r.comment && <p className="mt-2 text-sm text-text">{r.comment}</p>}
              {r.reply && (
                <p className="mt-2 rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
                  <span className="font-medium text-text">Balasan toko:</span> {r.reply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

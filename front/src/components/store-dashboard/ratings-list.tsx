"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareReply, Minus, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatDbDateTime } from "@/lib/format";
import type { StoreRatingView } from "@/types/api";

/** Reviews with one professional reply per review (STORE_RULES §5), saved by the API. */
export function RatingsList({ ratings }: { ratings: StoreRatingView[] }) {
  const router = useRouter();
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/stores/me/ratings/${id}/reply`, { method: "POST", body: JSON.stringify({ reply: draft.trim() }) });
      setReplying(null);
      setDraft("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim balasan.");
    } finally {
      setBusy(false);
    }
  };

  if (ratings.length === 0) return <p className="text-sm text-text-secondary">Belum ada ulasan.</p>;

  return (
    <ul className="space-y-3">
      {ratings.map((r) => (
        <li key={r.id} className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              {r.overall === 1 ? (
                <ThumbsUp className="h-4 w-4 text-emerald-500" />
              ) : r.overall === -1 ? (
                <ThumbsDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-text-secondary" />
              )}
              {r.buyer}
              <span className="num text-xs font-normal text-text-secondary">· {r.orderNumber}</span>
            </p>
            <span className="text-xs text-text-secondary">{formatDbDateTime(r.date)}</span>
          </div>
          <p className="num mt-1 text-xs text-text-secondary">
            Akurasi {r.descAccuracy}/5 · Sikap {r.attitude}/5 · Kecepatan {r.deliverySpeed}/5
          </p>
          {r.comment && <p className="mt-2 text-sm text-text">{r.comment}</p>}
          {r.reply ? (
            <p className="mt-3 rounded-lg bg-surface-elevated px-3 py-2 text-sm text-text-secondary">
              <span className="font-medium text-text">Balasan toko:</span> {r.reply}
            </p>
          ) : replying === r.id ? (
            <div className="mt-3 space-y-2">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                placeholder="Balas dengan sopan dan profesional…"
              />
              <div className="flex gap-2">
                <Button size="md" onClick={() => send(r.id)} disabled={busy || draft.trim().length < 2}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim balasan
                </Button>
                <Button size="md" variant="ghost" onClick={() => setReplying(null)}>
                  Batal
                </Button>
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
          ) : (
            <Button size="md" variant="ghost" className="mt-2" onClick={() => setReplying(r.id)}>
              <MessageSquareReply className="h-4 w-4" /> Balas
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

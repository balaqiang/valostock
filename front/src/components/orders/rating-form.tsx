"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const DIMS = [
  { key: "descAccuracy", label: "Akurasi deskripsi" },
  { key: "attitude", label: "Sikap toko" },
  { key: "deliverySpeed", label: "Kecepatan kirim" },
] as const;

/** Rating after completion: overall 👍/😐/👎 + 3-dimension service score (1–5). */
export function RatingForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [overall, setOverall] = useState<-1 | 0 | 1>(1);
  const [scores, setScores] = useState({ descAccuracy: 5, attitude: 5, deliverySpeed: 5 });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/orders/${orderId}/rating`, {
        method: "POST",
        body: JSON.stringify({ overall, ...scores, comment: comment.trim() || undefined }),
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan penilaian.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-text">Beri penilaian untuk toko</h2>
      <div className="mt-3 flex gap-2">
        {(
          [
            [1, ThumbsUp, "Puas"],
            [0, Minus, "Biasa"],
            [-1, ThumbsDown, "Kecewa"],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setOverall(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
              overall === value ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {DIMS.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text-secondary">{d.label}</span>
            <span className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} bintang`} onClick={() => setScores((s) => ({ ...s, [d.key]: n }))}>
                  <Star className={cn("h-5 w-5", n <= scores[d.key] ? "fill-amber-400 text-amber-400" : "text-border-strong")} />
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      <textarea
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Ceritakan pengalamanmu (opsional)"
        className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      <Button className="mt-3" onClick={submit} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim penilaian
      </Button>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

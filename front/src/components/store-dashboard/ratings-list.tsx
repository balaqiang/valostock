"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareReply, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";
import type { MockStoreRating } from "@/lib/mock/store-dashboard";

/** Review list with one professional reply per review (STORE_RULES §5). */
export function RatingsList({ ratings: storeRatings }: { ratings: MockStoreRating[] }) {
  const [replies, setReplies] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      storeRatings
        .filter((rating) => rating.reply)
        .map((rating) => [rating.id, rating.reply as string]),
    ),
  );
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const send = (id: string) => {
    setReplies((current) => ({ ...current, [id]: draft.trim() }));
    setReplying(null);
    setDraft("");
  };

  return (
    <ul className="space-y-3">
      {storeRatings.map((rating) => {
        const reply = replies[rating.id];
        return (
          <li
            key={rating.id}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text">
                {rating.overall === 1 ? (
                  <ThumbsUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                )}
                {rating.buyer}
                <span className="num text-xs font-normal text-text-secondary">
                  · {rating.orderId} · {formatDateShort(rating.date)}
                </span>
              </p>
              <p className="num text-xs text-text-secondary">
                Deskripsi {rating.descAccuracy} · Sikap {rating.attitude} ·
                Kecepatan {rating.deliverySpeed}
              </p>
            </div>

            <p className="mt-2 text-sm text-text-secondary">
              &ldquo;{rating.comment}&rdquo;
            </p>

            {reply ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-lg bg-surface-elevated px-4 py-3"
              >
                <p className="text-xs font-semibold text-text">
                  Balasan toko{" "}
                  <span className="font-normal text-text-secondary">
                    (satu kali per ulasan)
                  </span>
                </p>
                <p className="mt-1 text-sm text-text-secondary">{reply}</p>
              </motion.div>
            ) : replying === rating.id ? (
              <div className="mt-3">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Balas secara profesional — balasan tidak bisa diubah."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!draft.trim()}
                    onClick={() => send(rating.id)}
                  >
                    Kirim Balasan
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setReplying(null)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={() => {
                  setReplying(rating.id);
                  setDraft("");
                }}
              >
                <MessageSquareReply className="h-4 w-4" />
                Balas (1×)
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

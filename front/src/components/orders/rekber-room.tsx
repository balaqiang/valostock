"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDbDateTime } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { OrderView, RekberMessage } from "@/types/api";

const POLL_MS = 5_000;

const roleLabel: Record<RekberMessage["senderRole"], string> = {
  BUYER: "Pembeli",
  STORE: "Toko",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
};

/**
 * Rekber Room (DFD 6.3): the hand-over conversation of one order, stored by the
 * API as dispute evidence. Prototype: refreshes by polling every 5 seconds
 * (realtime Socket.IO is future work).
 */
export function RekberRoom({
  orderId,
  roomCode,
  viewerRole,
  canSend,
}: {
  orderId: string;
  roomCode: string;
  viewerRole: OrderView["viewerRole"];
  canSend: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<RekberMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      apiFetch<{ messages: RekberMessage[] }>(`/api/orders/${orderId}/messages`)
        .then((data) => setMessages(data.messages))
        .catch(() => undefined),
    [orderId],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/orders/${orderId}/messages`, { method: "POST", body: JSON.stringify({ body }) });
      setDraft("");
      await load();
      // The store's first message moves the order to IN_REKBER — refresh the page status.
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
        <MessageSquare className="h-4 w-4 text-primary" />
        Rekber Room <span className="num">{roomCode}</span>
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Semua pesan tercatat sebagai bukti serah terima. Jangan bertransaksi di luar platform.
      </p>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3">
        {messages.length === 0 && <p className="py-6 text-center text-xs text-text-secondary">Belum ada pesan.</p>}
        {messages.map((message) => {
          const mine = message.senderRole === viewerRole;
          const system = message.senderRole === "SYSTEM";
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start", system && "justify-center")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  system
                    ? "bg-surface-elevated text-center text-xs text-text-secondary"
                    : mine
                      ? "bg-primary text-white"
                      : "border border-border bg-surface text-text",
                )}
              >
                {!system && (
                  <p className={cn("text-[11px] font-semibold", mine ? "text-white/80" : "text-text-secondary")}>
                    {message.senderName} · {roleLabel[message.senderRole]}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-text-secondary")}>
                  {formatDbDateTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {canSend && (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={viewerRole === "STORE" ? "Kirim data akses akun di sini…" : "Tulis pesan ke toko…"}
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
          <Button type="submit" variant="primary" size="md" disabled={sending || !draft.trim()} aria-label="Kirim">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

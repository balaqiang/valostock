"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatDbDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage, ConversationView } from "@/types/api";

const POLL_MS = 5_000;

/**
 * Buyer ↔ store chat (in-app only). Contact details and off-platform links
 * are refused by the API. Refreshes by polling (Socket.IO is future work).
 */
export function ChatPanel({ conversations, initialId }: { conversations: ConversationView[]; initialId?: string }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | undefined>(initialId ?? conversations[0]?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const active = conversations.find((c) => c.id === activeId);

  const load = useCallback(() => {
    if (!activeId) return Promise.resolve();
    return apiFetch<{ messages: ChatMessage[] }>(`/api/chat/conversations/${activeId}/messages`)
      .then((data) => setMessages(data.messages))
      .catch(() => undefined);
  }, [activeId]);

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
    if (!activeId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/chat/conversations/${activeId}/messages`, { method: "POST", body: JSON.stringify({ body: draft.trim() }) });
      setDraft("");
      await load();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
        <MessageSquare className="h-8 w-8 text-text-secondary" />
        <p className="mt-3 text-sm font-medium text-text">Belum ada percakapan</p>
      </div>
    );
  }

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[260px_1fr]">
      <ul className="max-h-[520px] overflow-y-auto border-b border-border md:border-b-0 md:border-r">
        {conversations.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn("flex w-full items-start gap-3 px-4 py-3 text-left", c.id === activeId ? "bg-primary/10" : "hover:bg-surface-elevated")}
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                {c.counterpart.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text">{c.counterpart.name}</span>
                  {c.unread > 0 && <span className="num rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                </span>
                <span className="block truncate text-xs text-text-secondary">{c.lastMessage ?? "-"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex min-h-[420px] flex-col">
        {active && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">{active.counterpart.name}</p>
            {active.counterpart.slug && (
              <Link href={`/store/${active.counterpart.slug}`} className="text-xs text-primary">
                Lihat toko →
              </Link>
            )}
          </div>
        )}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" style={{ maxHeight: 420 }}>
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "bg-primary text-white" : "bg-surface-elevated text-text")}>
                {m.catalog && (
                  <Link href={`/catalog/${m.catalog.id}`} className={cn("mb-1 block text-xs underline", m.mine ? "text-white/80" : "text-primary")}>
                    {m.catalog.title}
                  </Link>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", m.mine ? "text-white/70" : "text-text-secondary")}>{formatDbDateTime(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              placeholder="Tulis pesan… (dilarang berbagi kontak/link luar)"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </div>
    </div>
  );
}

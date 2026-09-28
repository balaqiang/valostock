"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";

/** Opens (or continues) the in-app chat with a store, optionally about one catalog. */
export function ChatStoreButton({
  storeSlug,
  catalogId,
  returnTo,
  variant = "secondary",
  className,
}: {
  storeSlug: string;
  catalogId?: string;
  returnTo: string;
  variant?: "primary" | "secondary" | "ghost" | "invert";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    const body = window.prompt("Pesan untuk toko:", catalogId ? "Halo, akun ini masih tersedia?" : "Halo!")?.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ conversationId: string }>("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ storeSlug, body, catalogId }),
      });
      router.push(`/account/messages/chat?c=${res.conversationId}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal memulai chat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant={variant} onClick={start} disabled={busy} className={className}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        Chat Toko
      </Button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}

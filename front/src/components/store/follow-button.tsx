"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatCompact } from "@/lib/format";

/** Follow / unfollow a store (store_follows). Followers get a notification when a new catalog is approved. */
export function FollowButton({
  slug,
  followers,
  initialFollowing = false,
  loggedIn = true,
}: {
  slug: string;
  followers: number;
  initialFollowing?: boolean;
  loggedIn?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(followers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/store/${slug}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/stores/${slug}/follow`, { method: following ? "DELETE" : "POST" });
      setCount((c) => c + (following ? -1 : 1));
      setFollowing(!following);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        aria-pressed={following}
        onClick={toggle}
        disabled={busy}
        className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 ${
          following ? "border border-border bg-surface-elevated text-text" : "bg-primary text-white hover:bg-primary-hover"
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {following ? "Mengikuti" : "Ikuti Toko"}
        <span className={`num text-xs ${following ? "text-text-secondary" : "text-white/75"}`}>{formatCompact(Math.max(0, count))}</span>
      </motion.button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}

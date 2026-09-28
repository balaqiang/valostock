"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { formatCompact } from "@/lib/format";

/** Local-state follow toggle — real follows go through the API (engagement module). */
export function FollowButton({ followers }: { followers: number }) {
  const [following, setFollowing] = useState(false);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      aria-pressed={following}
      onClick={() => setFollowing((value) => !value)}
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 ${
        following
          ? "border border-border bg-surface-elevated text-text"
          : "bg-primary text-white hover:bg-primary-hover"
      }`}
    >
      {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {following ? "Mengikuti" : "Ikuti Toko"}
      <span className={`num text-xs ${following ? "text-text-secondary" : "text-white/75"}`}>
        {formatCompact(followers + (following ? 1 : 0))}
      </span>
    </motion.button>
  );
}

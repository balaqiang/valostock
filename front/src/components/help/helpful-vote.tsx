"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";

/** "Apakah artikel ini membantu?" — local state only; real votes go to the API. */
export function HelpfulVote() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  if (vote) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-text-secondary"
      >
        {vote === "up"
          ? "Terima kasih atas masukanmu! 🎉"
          : "Terima kasih, kami akan perbaiki artikel ini."}
      </motion.p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-medium text-text">Apakah artikel ini membantu?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setVote("up")}
          aria-label="Ya, membantu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setVote("down")}
          aria-label="Tidak membantu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

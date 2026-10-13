"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-violet-600 to-fuchsia-600",
  "from-indigo-600 to-sky-500",
  "from-emerald-600 to-teal-500",
  "from-rose-600 to-orange-500",
  "from-zinc-800 to-zinc-600",
  "from-amber-500 to-red-500",
];

/** Storefront banner colour (stores.gradient), saved through PATCH /api/stores/me. */
export function GradientPicker({ current }: { current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (gradient: string) => {
    setBusy(gradient);
    setError(null);
    try {
      await apiFetch("/api/stores/me", { method: "PATCH", body: JSON.stringify({ gradient }) });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {GRADIENTS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => pick(g)}
            aria-label={g}
            className={cn("relative h-14 w-24 rounded-xl bg-gradient-to-br ring-offset-2 ring-offset-background", g, g === current && "ring-2 ring-primary")}
          >
            {busy === g ? (
              <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white" />
            ) : g === current ? (
              <Check className="absolute inset-0 m-auto h-5 w-5 text-white" />
            ) : null}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Check, ImageUp, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Checklist per ERD INSPECTION_CHECKLISTS — login-only, seller keeps 2FA.
const checks = [
  { key: "login_success", label: "Login berhasil tanpa kendala" },
  { key: "no_restriction", label: "Tidak ada pembatasan/penalti aktif" },
  { key: "inventory_matches", label: "Inventory sesuai deskripsi listing" },
  { key: "rank_matches", label: "Rank sesuai deskripsi listing" },
  { key: "twofa_active", label: "2FA tetap aktif di tangan penjual" },
];

/** Inspection form — the real record (checklist + media + timestamp) is stored
 *  by the API in private storage; media never gets a public URL. */
export function InspectionForm({ alreadyChecked }: { alreadyChecked: boolean }) {
  const [ticked, setTicked] = useState<Set<string>>(
    () => new Set(alreadyChecked ? checks.map((check) => check.key) : []),
  );
  const [result, setResult] = useState<"PASSED" | "FAILED" | null>(
    alreadyChecked ? "PASSED" : null,
  );

  const allTicked = ticked.size === checks.length;

  const toggle = (key: string) => {
    if (result) return;
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <ul className="space-y-2.5">
        {checks.map((check) => (
          <li key={check.key}>
            <button
              type="button"
              onClick={() => toggle(check.key)}
              disabled={!!result}
              aria-pressed={ticked.has(check.key)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors duration-200",
                  ticked.has(check.key)
                    ? "border-primary bg-primary text-white"
                    : "border-border-strong bg-background",
                )}
              >
                {ticked.has(check.key) && <Check className="h-3.5 w-3.5" />}
              </span>
              <span
                className={cn(
                  "text-sm",
                  ticked.has(check.key) ? "text-text" : "text-text-secondary",
                )}
              >
                {check.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Notes + media (private storage) */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!!result}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <ImageUp className="h-4 w-4" />
          Unggah screenshot
        </button>
        <button
          type="button"
          disabled={!!result}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Video className="h-4 w-4" />
          Unggah video
        </button>
      </div>
      <textarea
        rows={2}
        disabled={!!result}
        placeholder="Catatan inspeksi (opsional)…"
        className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:outline-none disabled:opacity-50"
      />

      {result ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
            result === "PASSED"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {result === "PASSED" ? (
            <>
              <BadgeCheck className="h-4 w-4 flex-none" />
              Inspeksi LULUS — listing mendapat badge Account Checked.
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 flex-none" />
              Inspeksi GAGAL tercatat — perbaiki masalah akun sebelum mengulang.
            </>
          )}
        </motion.p>
      ) : (
        <div className="mt-5 flex gap-2.5">
          <Button
            variant="primary"
            size="lg"
            disabled={!allTicked}
            onClick={() => setResult("PASSED")}
          >
            <BadgeCheck className="h-4 w-4" />
            Lulus Inspeksi
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setResult("FAILED")}>
            <XCircle className="h-4 w-4" />
            Gagal
          </Button>
        </div>
      )}
    </div>
  );
}

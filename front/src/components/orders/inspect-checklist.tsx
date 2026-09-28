"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Buyer-side inspection steps before Complete (docs/SITEMAP.md §3 /orders/[id]).
const steps = [
  "Ganti email akun ke email milikmu sendiri",
  "Ganti password dan aktifkan 2FA milikmu",
  "Keluarkan semua sesi/perangkat lain yang masih login",
  "Periksa rank, skin, dan isi akun sesuai deskripsi listing",
];

/** Local-state checklist + Complete — the real action calls the API. */
export function InspectChecklist({ completed }: { completed: boolean }) {
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(completed ? steps.map((_, index) => index) : []),
  );
  const [done, setDone] = useState(completed);
  const allChecked = checked.size === steps.length;

  const toggle = (index: number) => {
    if (done) return;
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-text">
        Checklist inspeksi sebelum Selesai
      </h2>
      <ul className="mt-4 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step}>
            <button
              type="button"
              onClick={() => toggle(index)}
              disabled={done}
              aria-pressed={checked.has(index)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors duration-200",
                  checked.has(index)
                    ? "border-primary bg-primary text-white"
                    : "border-border-strong bg-background",
                )}
              >
                {checked.has(index) && <Check className="h-3.5 w-3.5" />}
              </span>
              <span
                className={cn(
                  "text-sm",
                  checked.has(index) ? "text-text" : "text-text-secondary",
                )}
              >
                {step}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {done ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm font-medium text-primary"
        >
          <PartyPopper className="h-4 w-4 flex-none" />
          Pesanan selesai — dana diteruskan ke toko. Jangan lupa beri rating!
        </motion.p>
      ) : (
        <>
          <Button
            variant="primary"
            size="lg"
            className="mt-5 w-full"
            disabled={!allChecked}
            onClick={() => setDone(true)}
          >
            Selesaikan Pesanan
          </Button>
          <p className="mt-2 text-center text-xs text-text-secondary">
            Menekan Selesai meneruskan dana ke toko — pastikan semua langkah
            di atas sudah kamu lakukan.
          </p>
        </>
      )}
    </div>
  );
}

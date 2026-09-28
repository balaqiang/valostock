"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paymentMethods, type PaymentMethodKind } from "@/lib/fees";
import { formatRupiah } from "@/lib/format";

/**
 * Checkout payment-method selector (docs/SITEMAP.md §3). Account purchases run
 * through Midtrans Snap into escrow; the handling fee already covers payment cost, so no
 * per-method surcharge here. Balance is shown but DISABLED — it is closed-loop
 * (top-up only) and can never buy accounts (docs/MONEY_RULES.md §8b).
 */
export function PayForm({ total }: { total: number }) {
  const [method, setMethod] = useState<PaymentMethodKind | null>(null);

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {paymentMethods.map((item) => {
          const disabled = item.kind === "BALANCE";
          return (
            <motion.button
              key={item.kind}
              type="button"
              whileTap={disabled ? undefined : { scale: 0.98 }}
              disabled={disabled}
              onClick={() => setMethod(item.kind)}
              aria-pressed={method === item.kind}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-200",
                method === item.kind
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:border-primary/40",
                disabled &&
                  "cursor-not-allowed opacity-55 hover:border-border",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
                  {item.label}
                  {disabled && <Lock className="h-3 w-3 text-text-secondary" />}
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {disabled
                    ? "Tidak bisa untuk pembelian akun (closed-loop)"
                    : item.detail}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-5 w-full"
        disabled={!method}
      >
        Bayar {formatRupiah(total)}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
        <ShieldCheck className="h-3.5 w-3.5 flex-none text-primary" />
        Dana ditahan di escrow — diteruskan ke toko setelah kamu konfirmasi
        akun aman.
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/form-alert";
import { apiFetch } from "@/lib/api";
import type { PaymentSession } from "@/types/api";
import { cn } from "@/lib/utils";
import { paymentMethods, type PaymentMethodKind } from "@/lib/fees";
import { formatRupiah } from "@/lib/format";

/**
 * Checkout payment-method selector (docs/SITEMAP.md §3). Account purchases run
 * through Midtrans Snap into escrow; the handling fee already covers payment cost, so no
 * per-method surcharge here. Balance is shown but DISABLED — it is closed-loop
 * (top-up only) and can never buy accounts (docs/MONEY_RULES.md §8b).
 */
export function PayForm({ orderId, total }: { orderId: string; total: number }) {
  const [method, setMethod] = useState<PaymentMethodKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The API creates the Midtrans Snap transaction; the browser only follows the redirect.
  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!method || method === "BALANCE") return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ payment: PaymentSession }>(`/api/orders/${orderId}/pay`, {
        method: "POST",
        body: JSON.stringify({ method }),
      });
      if (data.payment.mode === "MIDTRANS_SNAP") window.location.assign(data.payment.redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat pembayaran.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={pay}>
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

      <div className="mt-5">
        <FormAlert message={error} />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-3 w-full"
        disabled={!method || loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Menyiapkan pembayaran..." : `Bayar ${formatRupiah(total)}`}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
        <ShieldCheck className="h-3.5 w-3.5 flex-none text-primary" />
        Dana ditahan di escrow — diteruskan ke toko setelah kamu konfirmasi
        akun aman.
      </p>
    </form>
  );
}

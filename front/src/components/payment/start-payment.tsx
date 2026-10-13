"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { GatewayMethod, PaymentSession } from "@/types/api";

export const GATEWAY_OPTIONS: { value: GatewayMethod; label: string }[] = [
  { value: "QRIS", label: "QRIS" },
  { value: "VA", label: "Virtual Account" },
  { value: "EWALLET", label: "E-Wallet" },
  { value: "RETAIL", label: "Retail (Alfamart/Indomaret)" },
  { value: "CC", label: "Kartu Kredit" },
];

/**
 * Starts a Midtrans Snap payment (or the built-in simulator in simulation
 * mode): POSTs `{ ...body, method }` to the endpoint, then redirects to the
 * payment page. The amount is always computed by the API.
 */
export function StartPayment({
  endpoint,
  body,
  label,
  confirm,
  compact = false,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  label: string;
  confirm?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<GatewayMethod>("QRIS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ payment?: PaymentSession; free?: boolean }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ ...body, method }),
      });
      if (res.payment?.mode === "MIDTRANS_SNAP") {
        window.location.assign(res.payment.redirectUrl);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memulai pembayaran.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Metode pembayaran"
          value={method}
          onChange={(e) => setMethod(e.target.value as GatewayMethod)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-text focus:border-primary focus:outline-none"
        >
          {GATEWAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="button" onClick={start} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {label}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

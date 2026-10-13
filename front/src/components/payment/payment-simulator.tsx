"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { PaymentStatusView } from "@/types/api";

/**
 * /payment/simulate — stand-in for the Midtrans payment page when the API runs
 * with PAYMENT_MODE=simulation (no Sandbox keys). The API refuses this
 * endpoint in real Midtrans mode.
 */
export function PaymentSimulator() {
  const params = useSearchParams();
  const router = useRouter();
  const invoice = params.get("invoice") ?? "";
  const [payment, setPayment] = useState<PaymentStatusView | null>(null);
  const [busy, setBusy] = useState<"PAID" | "FAILED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) return;
    apiFetch<{ payment: PaymentStatusView }>(`/api/payments/${encodeURIComponent(invoice)}/status`)
      .then((data) => setPayment(data.payment))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Invoice tidak ditemukan."));
  }, [invoice]);

  const decide = async (result: "PAID" | "FAILED") => {
    setBusy(result);
    setError(null);
    try {
      await apiFetch(`/api/payments/${encodeURIComponent(invoice)}/simulate`, {
        method: "POST",
        body: JSON.stringify({ result }),
      });
      router.push(`/payment/finish?invoice=${encodeURIComponent(invoice)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulasi gagal.");
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-surface p-8">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <FlaskConical className="h-3.5 w-3.5" />
        Mode simulasi, bukan pembayaran sungguhan
      </p>
      <h1 className="mt-4 font-display text-2xl font-bold text-text">Simulasi Pembayaran</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Halaman ini menggantikan halaman Midtrans saat backend berjalan dengan <code>PAYMENT_MODE=simulation</code>.
      </p>

      {payment && (
        <dl className="mt-6 space-y-2 rounded-xl bg-surface-elevated p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Invoice</dt>
            <dd className="num font-mono font-semibold text-text">{payment.invoice}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Metode</dt>
            <dd className="text-text">{payment.method}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-text-secondary">Total</dt>
            <dd className="num font-bold text-primary">{formatRupiah(payment.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Status</dt>
            <dd className="text-text">{payment.status}</dd>
          </div>
        </dl>
      )}

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {payment?.status === "PENDING" && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={() => decide("PAID")} disabled={busy !== null}>
            {busy === "PAID" && <Loader2 className="h-4 w-4 animate-spin" />}
            Bayar (simulasi berhasil)
          </Button>
          <Button variant="secondary" size="lg" onClick={() => decide("FAILED")} disabled={busy !== null}>
            {busy === "FAILED" && <Loader2 className="h-4 w-4 animate-spin" />}
            Gagalkan
          </Button>
        </div>
      )}
      {payment && payment.status !== "PENDING" && (
        <Button href={payment.next} variant="secondary" size="md" className="mt-6">
          Invoice sudah diproses, lanjut
        </Button>
      )}
    </div>
  );
}

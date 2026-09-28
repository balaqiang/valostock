"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GATEWAY_OPTIONS } from "@/components/payment/start-payment";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { GatewayMethod, PaymentSession } from "@/types/api";

const selectClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none";

/** Featured listing: free (first week once, or a plan slot) or paid via Midtrans. */
export function AdCreator({
  catalogs,
  prices,
  freeAvailable,
}: {
  catalogs: { id: string; title: string; code: string }[];
  prices: Record<string, number>;
  freeAvailable: boolean;
}) {
  const router = useRouter();
  const [catalogId, setCatalogId] = useState(catalogs[0]?.id ?? "");
  const [duration, setDuration] = useState(7);
  const [useFree, setUseFree] = useState(freeAvailable);
  const [method, setMethod] = useState<GatewayMethod>("QRIS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (catalogs.length === 0) return <p className="text-sm text-text-secondary">Belum ada katalog yang tayang untuk diiklankan.</p>;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ payment?: PaymentSession }>("/api/stores/me/ads", {
        method: "POST",
        body: JSON.stringify({ catalogId, durationDays: useFree ? 7 : duration, useFree, ...(useFree ? {} : { method }) }),
      });
      if (res.payment?.mode === "MIDTRANS_SNAP") {
        window.location.assign(res.payment.redirectUrl);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat iklan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-medium text-text">Katalog</span>
          <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)} className={selectClass}>
            {catalogs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-text">Durasi</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={useFree} className={selectClass}>
            {Object.entries(prices).map(([days, price]) => (
              <option key={days} value={days}>
                {days} hari — {formatRupiah(price)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={useFree} disabled={!freeAvailable} onChange={(e) => setUseFree(e.target.checked)} className="h-4 w-4 accent-primary" />
        <span className="text-text">Pakai jatah gratis (7 hari)</span>
        {!freeAvailable && <span className="text-xs text-text-secondary">— jatah gratis habis</span>}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {!useFree && (
          <select aria-label="Metode pembayaran" value={method} onChange={(e) => setMethod(e.target.value as GatewayMethod)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-text">
            {GATEWAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <Button type="button" onClick={submit} disabled={busy || !catalogId}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          {useFree ? "Aktifkan gratis" : `Bayar ${formatRupiah(prices[String(duration)] ?? 0)}`}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";

/**
 * Admin verdict (disputes:resolve). Buyer wins before completion → escrow
 * refunded; after completion → compensation from the store. Store wins →
 * order completed and escrow released. Optional sanction on the store.
 */
export function DisputeResolver({ disputeId, afterCompletion, itemPrice }: { disputeId: string; afterCompletion: boolean; itemPrice: number }) {
  const router = useRouter();
  const [winner, setWinner] = useState<"BUYER" | "STORE">("BUYER");
  const [note, setNote] = useState("");
  const [compensation, setCompensation] = useState(String(itemPrice));
  const [sanction, setSanction] = useState<"" | "WARNING" | "SUSPEND" | "FINE">("");
  const [fine, setFine] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!window.confirm(`Putuskan sengketa: ${winner === "BUYER" ? "pembeli" : "toko"} menang? Keputusan final dan tercatat di audit log.`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          winner,
          note: note.trim(),
          ...(winner === "BUYER" && afterCompletion ? { compensation: Number(compensation) } : {}),
          ...(sanction ? { sanction: { type: sanction, ...(sanction === "FINE" ? { amount: Number(fine) || 0 } : {}), reason: note.trim() } } : {}),
        }),
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memutus sengketa.");
    } finally {
      setBusy(false);
    }
  };

  const select = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text";

  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className="mb-1 block font-medium text-text">Pemenang</span>
          <select value={winner} onChange={(e) => setWinner(e.target.value as "BUYER" | "STORE")} className={select}>
            <option value="BUYER">Pembeli {afterCompletion ? "(kompensasi dari toko)" : "(refund escrow)"}</option>
            <option value="STORE">Toko {afterCompletion ? "(tanpa kompensasi)" : "(pesanan selesai, dana dilepas)"}</option>
          </select>
        </label>
        {winner === "BUYER" && afterCompletion && (
          <label>
            <span className="mb-1 block font-medium text-text">Kompensasi (Rp)</span>
            <input type="number" value={compensation} onChange={(e) => setCompensation(e.target.value)} className={`${select} num`} />
            <span className="text-xs text-text-secondary">Default harga akun {formatRupiah(itemPrice)}.</span>
          </label>
        )}
        <label>
          <span className="mb-1 block font-medium text-text">Sanksi toko (opsional)</span>
          <select value={sanction} onChange={(e) => setSanction(e.target.value as typeof sanction)} className={select}>
            <option value="">Tanpa sanksi</option>
            <option value="WARNING">Peringatan</option>
            <option value="FINE">Denda (potong deposit)</option>
            <option value="SUSPEND">Tangguhkan toko</option>
          </select>
        </label>
        {sanction === "FINE" && (
          <label>
            <span className="mb-1 block font-medium text-text">Nilai denda (Rp)</span>
            <input type="number" value={fine} onChange={(e) => setFine(e.target.value)} className={`${select} num`} />
          </label>
        )}
      </div>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Alasan putusan (wajib, dikirim ke kedua pihak)…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      <Button onClick={submit} disabled={busy || note.trim().length < 3}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Putuskan
      </Button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

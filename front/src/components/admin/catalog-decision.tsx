"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * DecisionBar for a catalog (ADMIN_PANEL §3.2): approve → LISTED, reject with
 * one or more template reasons (+ note, required for "Lainnya") → REJECTED,
 * takedown of a LISTED catalog → DELISTED. Recorded in catalog_reviews + audit_logs.
 */
export function CatalogDecision({
  catalogId,
  status,
  reasons,
  canModerate,
  canTakedown,
}: {
  catalogId: string;
  status: string;
  reasons: string[];
  canModerate: boolean;
  canTakedown: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"reject" | "takedown" | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "approve" | "reject" | "takedown") => {
    if (action === "approve" && !window.confirm("Setujui katalog ini? Katalog langsung tayang di marketplace.")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/catalogs/${catalogId}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "approve" ? { note: note.trim() || undefined } : { reasons: picked, note: note.trim() || undefined }),
      });
      setMode(null);
      setPicked([]);
      setNote("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(false);
    }
  };

  const pending = status === "PENDING_REVIEW";
  if (!(pending && canModerate) && !(status === "LISTED" && canTakedown)) {
    return <p className="text-sm text-text-secondary">Tidak ada keputusan yang bisa diambil untuk status ini.</p>;
  }

  return (
    <div className="space-y-3">
      {mode === null && (
        <div className="flex flex-wrap gap-2">
          {pending && canModerate && (
            <>
              <Button onClick={() => send("approve")} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Setujui
              </Button>
              <Button variant="secondary" onClick={() => setMode("reject")} disabled={busy}>
                <X className="h-4 w-4" /> Tolak
              </Button>
            </>
          )}
          {status === "LISTED" && canTakedown && (
            <Button variant="secondary" onClick={() => setMode("takedown")} disabled={busy}>
              <ShieldAlert className="h-4 w-4" /> Turunkan
            </Button>
          )}
        </div>
      )}
      {mode === null && pending && canModerate && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan persetujuan (opsional)"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none"
        />
      )}

      {mode && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold text-text">{mode === "reject" ? "Alasan penolakan" : "Alasan penurunan"} (pilih minimal satu)</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => {
              const on = picked.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== r) : [...p, r]))}
                  className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary")}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={picked.includes("Lainnya") ? "Catatan wajib untuk alasan Lainnya…" : "Catatan untuk toko (disarankan: apa yang harus diperbaiki)…"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={() => send(mode)} disabled={busy || picked.length === 0}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "reject" ? "Tolak katalog" : "Turunkan katalog"}
            </Button>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Batal
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

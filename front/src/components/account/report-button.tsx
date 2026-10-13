"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import { reportReasonLabel } from "@/lib/labels";

type Reason = keyof typeof reportReasonLabel;

/** Report a catalog / store / user to the moderators (reports table, ADMIN_PANEL §3.4). */
export function ReportButton({ targetType, targetId, returnTo }: { targetType: "CATALOG" | "STORE" | "USER"; targetId: string; returnTo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("FAKE");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/api/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, detail: detail.trim() || undefined }) });
      setMessage({ ok: true, text: "Laporan terkirim. Pantau statusnya di Akun → Laporan." });
      setOpen(false);
      setDetail("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengirim laporan." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-sm">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-600">
          <Flag className="h-3.5 w-3.5" /> Laporkan
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <select value={reason} onChange={(e) => setReason(e.target.value as Reason)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-text">
            {(Object.keys(reportReasonLabel) as Reason[]).map((r) => (
              <option key={r} value={r}>
                {reportReasonLabel[r]}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={2000}
            placeholder="Ceritakan singkat masalahnya…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="md" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim laporan
            </Button>
            <Button size="md" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}
      {message && <p className={`mt-1 text-xs ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}

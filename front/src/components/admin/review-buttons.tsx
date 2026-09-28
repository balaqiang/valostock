"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

/**
 * Approve / reject buttons for an admin queue item. The decision (and the
 * reason, required when rejecting) is recorded by the API in audit_logs.
 */
export function ReviewButtons({ endpoint, approveLabel = "Setujui" }: { endpoint: string; approveLabel?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    let note: string | undefined;
    if (decision === "reject") {
      note = window.prompt("Alasan penolakan (wajib):")?.trim();
      if (!note) return;
    } else if (!window.confirm(`${approveLabel}?`)) {
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      await apiFetch(`${endpoint}/${decision}`, { method: "POST", body: JSON.stringify(note ? { note } : {}) });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="primary" size="md" onClick={() => decide("approve")} disabled={busy !== null}>
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {approveLabel}
        </Button>
        <Button variant="secondary" size="md" onClick={() => decide("reject")} disabled={busy !== null}>
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Tolak
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

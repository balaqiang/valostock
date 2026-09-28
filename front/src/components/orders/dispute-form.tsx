"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { disputeReasonLabel } from "@/lib/labels";
import type { DisputeReason } from "@/types/api";

/** Opens a dispute with evidence (private storage). The store has 72 hours to respond; an admin decides. */
export function DisputeForm({ orderId, afterCompletion }: { orderId: string; afterCompletion: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DisputeReason>("NOT_AS_DESCRIBED");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("reason", reason);
    form.append("description", description.trim());
    for (const file of files) form.append("files", file);
    try {
      const res = await apiFetch<{ disputeId: string }>(`/api/orders/${orderId}/dispute`, { method: "POST", body: form });
      router.push(`/disputes/${res.disputeId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuka sengketa.");
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Gavel className="h-4 w-4" /> Ajukan sengketa
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary">
        {afterCompletion
          ? "Pesanan sudah selesai, tetapi masih dalam masa proteksi. Jika terbukti, toko wajib memberi kompensasi."
          : "Dana tetap ditahan escrow selama sengketa berjalan."}
      </p>
      <select value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text">
        {(Object.keys(disputeReasonLabel) as DisputeReason[]).map((r) => (
          <option key={r} value={r}>
            {disputeReasonLabel[r]}
          </option>
        ))}
      </select>
      <textarea
        rows={4}
        minLength={10}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Jelaskan masalahnya secara runtut (min. 10 karakter)…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => input.current?.click()}>
          <Paperclip className="h-4 w-4" /> Bukti {files.length > 0 && `(${files.length})`}
        </Button>
        <Button type="button" onClick={submit} disabled={busy || description.trim().length < 10}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kirim sengketa
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

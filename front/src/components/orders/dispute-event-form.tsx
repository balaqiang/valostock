"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

/** Statement / evidence in a dispute (buyer, store) or an admin note. */
export function DisputeEventForm({ disputeId, placeholder }: { disputeId: string; placeholder: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("body", body.trim());
    for (const file of files) form.append("files", file);
    try {
      await apiFetch(`/api/disputes/${disputeId}/events`, { method: "POST", body: form });
      setBody("");
      setFiles([]);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => input.current?.click()}>
          <Paperclip className="h-4 w-4" /> Bukti {files.length > 0 && `(${files.length})`}
        </Button>
        <Button type="button" onClick={submit} disabled={busy || body.trim().length < 2}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

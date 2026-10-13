"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Uploads one CMS image (API checks the real file type too) and hands back its storage path + URL. */
export function CmsImageUpload({
  kind,
  label = "Unggah gambar",
  onUploaded,
}: {
  kind: "banners" | "games";
  label?: string;
  onUploaded: (image: { path: string; url: string }) => void | Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Pakai gambar PNG, JPEG, atau WebP.");
    if (file.size > MAX_BYTES) return setError("Ukuran gambar maksimal 2 MB.");
    const form = new FormData();
    form.append("image", file);
    setBusy(true);
    try {
      await onUploaded(await apiFetch<{ path: string; url: string }>(`/api/admin/cms/uploads?kind=${kind}`, { method: "POST", body: form }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "Mengunggah…" : label}
      </Button>
      <p className="mt-1.5 text-xs text-text-secondary">PNG/JPEG/WebP, maks. 2 MB.</p>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const MAX_IMAGES = 10;

/**
 * Catalog photos in Supabase Storage (public bucket). Uploads go through the
 * API, which checks the real file type and picks the object path.
 */
export function CatalogImages({
  catalogId,
  images,
  editable,
  listed,
}: {
  catalogId: string;
  images: { id: string; url: string }[];
  editable: boolean;
  listed: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (listed && !window.confirm("Menambah foto membuat katalog kembali menunggu verifikasi admin. Lanjutkan?")) return;
    const form = new FormData();
    for (const file of Array.from(files).slice(0, MAX_IMAGES - images.length)) form.append("images", file);
    setBusy("upload");
    setError(null);
    try {
      await apiFetch(`/api/stores/me/catalogs/${catalogId}/images`, { method: "POST", body: form });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (imageId: string) => {
    if (!window.confirm(listed ? "Hapus foto? Katalog akan kembali menunggu verifikasi admin." : "Hapus foto ini?")) return;
    setBusy(imageId);
    setError(null);
    try {
      await apiFetch(`/api/stores/me/catalogs/${catalogId}/images/${imageId}`, { method: "DELETE" });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">
          Belum ada foto. Minimal satu foto wajib sebelum katalog diajukan, tampilkan rank, inventori, dan level akun.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, index) => (
            <li key={img.id} className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-elevated">
              <Image src={img.url} alt={`Foto ${index + 1}`} fill sizes="240px" className="object-cover" unoptimized />
              {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">Sampul</span>}
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  disabled={busy !== null}
                  aria-label="Hapus foto"
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {busy === img.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && images.length < MAX_IMAGES && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={busy !== null}>
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Unggah foto
          </Button>
          <span className="text-xs text-text-secondary">PNG/JPG/WebP, maks. 2 MB per foto, {MAX_IMAGES} foto per katalog.</span>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

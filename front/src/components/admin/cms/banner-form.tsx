"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CmsImageUpload } from "@/components/admin/cms/image-upload";
import type { CmsBanner } from "@/lib/data/admin";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

/** ISO ↔ `datetime-local` (the admin's local time). */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

/** Create or edit a home banner. */
export function CmsBannerForm({ banner, nextOrder = 0, onDone }: { banner?: CmsBanner; nextOrder?: number; onDone?: () => void }) {
  const router = useRouter();
  const [image, setImage] = useState<{ path: string; url: string } | null>(banner ? { path: banner.image, url: banner.imageUrl } : null);
  const [form, setForm] = useState({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    ctaLabel: banner?.ctaLabel ?? "",
    linkUrl: banner?.linkUrl ?? "",
    sortOrder: banner?.sortOrder ?? nextOrder,
    isActive: banner?.isActive ?? true,
    startsAt: toLocal(banner?.startsAt ?? null),
    endsAt: toLocal(banner?.endsAt ?? null),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!image) return setError("Unggah gambar banner dulu.");
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        subtitle: form.subtitle || null,
        image: image.path,
        ctaLabel: form.ctaLabel || null,
        linkUrl: form.linkUrl || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
      };
      await apiFetch(banner ? `/api/admin/cms/banners/${banner.id}` : "/api/admin/cms/banners", {
        method: banner ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      router.refresh();
      onDone?.();
      if (!banner) {
        setImage(null);
        setForm((f) => ({ ...f, title: "", subtitle: "", ctaLabel: "", linkUrl: "", startsAt: "", endsAt: "", sortOrder: f.sortOrder + 1 }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan banner.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div>
        <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface-elevated">
          {image ? (
            <Image src={image.url} alt="" fill sizes="320px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">Belum ada gambar</span>
          )}
        </div>
        <div className="mt-3">
          <CmsImageUpload kind="banners" label={image ? "Ganti gambar" : "Unggah gambar"} onUploaded={setImage} />
          <p className="mt-1 text-xs text-text-secondary">Rasio ideal 21:9 (mis. 1680×720). Di ponsel gambar dipotong ke tengah.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Judul *</span>
          <input required minLength={2} maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Subjudul</span>
          <textarea rows={2} maxLength={240} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-text-secondary">Label tombol</span>
          <input maxLength={40} placeholder="mis. Top-Up Sekarang" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-text-secondary">Link tombol</span>
          <input maxLength={300} placeholder="/topup atau https://…" value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-text-secondary">Mulai tampil (opsional)</span>
          <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-text-secondary">Berhenti tampil (opsional)</span>
          <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-text-secondary">Urutan</span>
          <input type="number" min={0} max={1000} value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} className={`${inputClass} num`} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-text">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4" />
          Aktif
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {banner ? "Simpan banner" : "Tambah banner"}
          </Button>
          {onDone && (
            <button type="button" onClick={onDone} className="text-sm text-text-secondary hover:text-text">
              Batal
            </button>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </form>
  );
}

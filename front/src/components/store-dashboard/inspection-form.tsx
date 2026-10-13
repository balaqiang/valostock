"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Inspection } from "@/types/api";

// Login-only checklist (account_inspections.checklist) — the seller keeps 2FA.
const checks = [
  { key: "login_success", label: "Login berhasil tanpa kendala" },
  { key: "no_restriction", label: "Tidak ada pembatasan/penalti aktif" },
  { key: "inventory_matches", label: "Inventory sesuai deskripsi katalog" },
  { key: "rank_matches", label: "Rank sesuai deskripsi katalog" },
  { key: "twofa_active", label: "2FA tetap aktif di tangan penjual" },
] as const;

/**
 * Records the inspection: checklist + notes + media (private bucket, signed
 * URLs only). All items ticked = PASSED → "Account Checked" badge.
 */
export function InspectionForm({ catalogId, current }: { catalogId: string; current: Inspection | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checks.map((c) => [c.key, current?.checklist[c.key] ?? false])),
  );
  const [notes, setNotes] = useState(current?.notes ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const passed = checks.every((c) => ticked[c.key]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    const form = new FormData();
    form.append("checklist", JSON.stringify(ticked));
    if (notes.trim()) form.append("notes", notes.trim());
    for (const file of files) form.append("media", file);
    try {
      await apiFetch(`/api/stores/me/catalogs/${catalogId}/inspection`, { method: "POST", body: form });
      setFiles([]);
      setDone(passed ? "Inspeksi lulus, badge Account Checked aktif." : "Inspeksi tersimpan (belum lulus).");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan inspeksi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ul className="space-y-2.5">
        {checks.map((check) => (
          <li key={check.key}>
            <button
              type="button"
              onClick={() => setTicked((t) => ({ ...t, [check.key]: !t[check.key] }))}
              aria-pressed={ticked[check.key]}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border",
                  ticked[check.key] ? "border-primary bg-primary text-white" : "border-border-strong bg-background",
                )}
              >
                {ticked[check.key] && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="text-sm text-text">{check.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-text">Catatan</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          placeholder="mis. Login via Riot Client 12:40 WIB, inventori 120 skin dicek."
        />
      </label>

      <div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,video/mp4,application/pdf"
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
        />
        <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
          <ImageUp className="h-4 w-4" /> Pilih bukti (foto/video/PDF)
        </Button>
        <p className="mt-1 text-xs text-text-secondary">
          {files.length > 0 ? `${files.length} file dipilih.` : "Maks. 5 file, 10 MB per file. Disimpan privat, hanya bisa dibuka lewat tautan sementara."}
        </p>
        {current && current.media.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {current.media.map((m, i) => (
              <li key={m.path}>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  Bukti {i + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
          Simpan inspeksi {passed ? "(Lulus)" : "(Belum lulus)"}
        </Button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {done && <p className="text-sm text-emerald-600 dark:text-emerald-400">{done}</p>}
      </div>
    </div>
  );
}

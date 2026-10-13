"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { handlingFeeFor, storeReceives } from "@/lib/fees";
import { formatRupiah } from "@/lib/format";
import type { CatalogDetail } from "@/types/api";
import type { FieldTemplate, Game } from "@/types/domain";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

type AttrValue = string | number | string[];

/** Attribute value → the text shown in its input. */
function toInput(field: FieldTemplate, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (field.type === "TAGS" && Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Catalog form driven by the game's field templates (admin-managed): the
 * columns, which are required, the SELECT options. The API validates again
 * and drops unknown keys; the store never sets the VS code or the status.
 */
export function CatalogEditor({
  games,
  detail,
  initialFields,
  commissionRate,
}: {
  games: Game[];
  detail?: CatalogDetail;
  /** Columns of the first game, for a new catalog. */
  initialFields?: FieldTemplate[];
  commissionRate: number;
}) {
  const router = useRouter();
  const listing = detail?.listing;
  const locked = listing ? ["LOCKED", "IN_ORDER", "SOLD"].includes(listing.status) : false;
  const [gameSlug, setGameSlug] = useState(listing?.game ?? games[0]?.slug ?? "");
  const [fields, setFields] = useState<FieldTemplate[]>(detail?.fields ?? initialFields ?? []);
  const [loadingFields, setLoadingFields] = useState(false);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState<number | "">(listing?.basePrice ?? "");
  const [oldPrice, setOldPrice] = useState<number | "">(listing?.oldPrice && !listing.flashSale ? listing.oldPrice : "");
  const [instant, setInstant] = useState(listing?.instant ?? false);
  const [attrs, setAttrs] = useState<Record<string, string>>(() =>
    Object.fromEntries((detail?.fields ?? []).map((f) => [f.key, toInput(f, listing?.attributes[f.key])])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Switching game (new / draft catalog): load that game's columns.
  const changeGame = async (slug: string) => {
    setGameSlug(slug);
    setLoadingFields(true);
    try {
      const res = await apiFetch<{ fields: FieldTemplate[] }>(`/api/games/${encodeURIComponent(slug)}/fields`);
      setFields(res.fields);
    } catch {
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const attributes = () => {
    const out: Record<string, AttrValue> = {};
    for (const f of fields) {
      const raw = (attrs[f.key] ?? "").trim();
      if (!raw) continue;
      out[f.key] =
        f.type === "NUMBER"
          ? Number(raw.replace(/[.,\s]/g, ""))
          : f.type === "TAGS"
            ? raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
            : raw;
    }
    return out;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    const body = {
      ...(listing && listing.status !== "DRAFT" ? {} : { gameSlug }),
      title,
      description: description || undefined,
      price: Number(price),
      oldPrice: oldPrice === "" ? null : Number(oldPrice),
      instant,
      attributes: attributes(),
    };
    try {
      if (listing) {
        const res = await apiFetch<CatalogDetail>(`/api/stores/me/catalogs/${listing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setSaved(
          listing.status === "LISTED" && res.listing.status === "PENDING_REVIEW"
            ? "Tersimpan. Katalog kembali menunggu verifikasi admin karena data utamanya berubah."
            : "Perubahan tersimpan.",
        );
        router.refresh();
      } else {
        const res = await apiFetch<CatalogDetail>("/api/stores/me/catalogs", { method: "POST", body: JSON.stringify(body) });
        router.push(`/store-dashboard/catalogs/${res.listing.id}?created=1`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  const priceNum = typeof price === "number" ? price : 0;

  return (
    <form onSubmit={save} className="space-y-6">
      <fieldset disabled={locked} className="space-y-6 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-text">Game</span>
            <select
              value={gameSlug}
              onChange={(e) => void changeGame(e.target.value)}
              disabled={Boolean(listing && listing.status !== "DRAFT")}
              className={inputClass}
            >
              {games.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
            {listing && listing.status !== "DRAFT" && <span className="mt-1 block text-xs text-text-secondary">Game hanya bisa diganti saat masih draf.</span>}
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="font-medium text-text">Proses instan</span>
            <span className="text-xs text-text-secondary">(data akun siap dikirim segera setelah dibayar)</span>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-text">Judul <span className="text-red-500">*</span></span>
          <input required minLength={5} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="mis. Akun Valorant Immortal 3, 120 skin, full agent" />
          <span className="mt-1 block text-xs text-text-secondary">Tanpa klaim mutlak (&quot;100% aman&quot;) dan tanpa kontak/link di luar platform.</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-text">Deskripsi</span>
          <textarea rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Kondisi akun, status email, riwayat, hal yang perlu diketahui pembeli…" />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-text">Harga (Rp) <span className="text-red-500">*</span></span>
            <input required type="number" min={10000} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputClass} num`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-text">Harga coret (opsional)</span>
            <input type="number" min={1} value={oldPrice} onChange={(e) => setOldPrice(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputClass} num`} />
          </label>
          <div className="rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
            <p>
              Pembeli bayar ± <span className="num font-medium text-text">{formatRupiah(priceNum + (priceNum ? handlingFeeFor(priceNum) + 5000 : 0))}</span>
            </p>
            <p className="mt-1">
              Kamu terima ± <span className="num font-medium text-text">{formatRupiah(priceNum ? storeReceives(priceNum, commissionRate) : 0)}</span> (komisi{" "}
              {(commissionRate * 100).toLocaleString("id-ID")}%)
            </p>
            <p className="mt-1">Perkiraan, angka final dihitung server saat checkout.</p>
          </div>
        </div>

        <div>
          <h3 className="font-display text-base font-bold text-text">Data akun</h3>
          <p className="text-xs text-text-secondary">Kolom ditentukan admin per game dan dipakai sebagai filter pencarian pembeli.</p>
          {loadingFields ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat kolom…
            </p>
          ) : fields.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">Game ini belum punya kolom khusus.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className={`block text-sm ${f.type === "TAGS" ? "sm:col-span-2" : ""}`}>
                  <span className="mb-1.5 block font-medium text-text">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </span>
                  {f.type === "SELECT" ? (
                    <select value={attrs[f.key] ?? ""} onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))} className={inputClass}>
                      <option value="">, pilih , </option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "TAGS" ? (
                    <textarea rows={2} value={attrs[f.key] ?? ""} onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))} className={inputClass} placeholder="Pisahkan dengan koma" />
                  ) : (
                    <input
                      type={f.type === "NUMBER" ? "number" : "text"}
                      min={f.type === "NUMBER" ? 0 : undefined}
                      value={attrs[f.key] ?? ""}
                      onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))}
                      className={`${inputClass} ${f.type === "NUMBER" ? "num" : ""}`}
                    />
                  )}
                  {f.helpText && <span className="mt-1 block text-xs text-text-secondary">{f.helpText}</span>}
                </label>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-text-secondary">Kolom bertanda * wajib diisi sebelum katalog bisa diajukan ke admin (draf boleh belum lengkap).</p>
        </div>
      </fieldset>

      {locked ? (
        <p className="text-sm text-text-secondary">Katalog sedang dalam transaksi atau sudah terjual, tidak bisa diubah.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {listing ? "Simpan perubahan" : "Simpan sebagai draf"}
          </Button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">{saved}</p>}
        </div>
      )}
    </form>
  );
}

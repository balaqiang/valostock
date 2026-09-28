import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import type { FieldTemplate } from "@/types/domain";

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none";

export type FilterValues = Record<string, string | undefined>;

/**
 * Game filters generated from the admin-managed field templates (filterable
 * columns): SELECT → exact match (attr.<key>), NUMBER → minimum (min.<key>).
 * A plain GET form — the API does the filtering (jsonb containment).
 */
export function TemplateFilters({ action, fields, values }: { action: string; fields: FieldTemplate[]; values: FilterValues }) {
  const filterable = fields.filter((f) => f.filterable);
  return (
    <form method="get" action={action} className="rounded-2xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs sm:col-span-2">
          <span className="mb-1 block font-medium text-text-secondary">Cari judul / VS code</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input name="q" defaultValue={values.q ?? ""} placeholder="mis. Immortal, VS7K3QX" className={`${inputClass} pl-9`} />
          </span>
        </label>
        {filterable.map((f) =>
          f.type === "NUMBER" ? (
            <label key={f.key} className="block text-xs">
              <span className="mb-1 block font-medium text-text-secondary">{f.label} minimal</span>
              <input type="number" min={0} name={`min.${f.key}`} defaultValue={values[`min.${f.key}`] ?? ""} className={`${inputClass} num`} />
            </label>
          ) : (
            <label key={f.key} className="block text-xs">
              <span className="mb-1 block font-medium text-text-secondary">{f.label}</span>
              {f.type === "SELECT" ? (
                <select name={`attr.${f.key}`} defaultValue={values[`attr.${f.key}`] ?? ""} className={inputClass}>
                  <option value="">Semua</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input name={`attr.${f.key}`} defaultValue={values[`attr.${f.key}`] ?? ""} className={inputClass} />
              )}
            </label>
          ),
        )}
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Harga min (Rp)</span>
          <input type="number" min={0} name="minPrice" defaultValue={values.minPrice ?? ""} className={`${inputClass} num`} />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Harga maks (Rp)</span>
          <input type="number" min={0} name="maxPrice" defaultValue={values.maxPrice ?? ""} className={`${inputClass} num`} />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-text-secondary">Urutkan</span>
          <select name="sort" defaultValue={values.sort ?? "newest"} className={inputClass}>
            <option value="newest">Terbaru</option>
            <option value="popular">Terpopuler</option>
            <option value="price_asc">Termurah</option>
            <option value="price_desc">Termahal</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
          <SlidersHorizontal className="h-4 w-4" /> Terapkan filter
        </button>
        <Link href={action} className="text-xs text-text-secondary hover:text-primary">
          Reset
        </Link>
      </div>
    </form>
  );
}

/** searchParams → the API query of lib/data/catalog.searchListings. */
export function toListingQuery(values: FilterValues, fields: FieldTemplate[]) {
  const attrs: Record<string, string> = {};
  const mins: Record<string, number> = {};
  for (const f of fields.filter((x) => x.filterable)) {
    const a = values[`attr.${f.key}`];
    const m = values[`min.${f.key}`];
    if (a && f.type !== "NUMBER") attrs[f.key] = a;
    if (m && f.type === "NUMBER" && Number.isFinite(Number(m))) mins[f.key] = Number(m);
  }
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const sort = ["newest", "popular", "price_asc", "price_desc"].includes(values.sort ?? "") ? (values.sort as "newest") : undefined;
  return { q: values.q || undefined, minPrice: num(values.minPrice), maxPrice: num(values.maxPrice), sort, attrs, mins };
}

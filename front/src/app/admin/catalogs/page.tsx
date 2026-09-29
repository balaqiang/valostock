import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminCatalogRow } from "@/lib/data/admin";
import { getGames } from "@/lib/data/catalog";
import { catalogStatusLabel, catalogStatusTone, storeTypeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { StoreType } from "@/types/domain";

export const metadata: Metadata = { title: "Moderasi Katalog | Admin" };

const TABS = ["PENDING_REVIEW", "REJECTED", "LISTED", "DELISTED", "ALL"] as const;

function hoursSince(iso: string | null) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000) : 0;
}

export default async function AdminCatalogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; game?: string; store?: string; q?: string; overdue?: string }>;
}) {
  const sp = await searchParams;
  const status = TABS.includes(sp.status as (typeof TABS)[number]) ? sp.status! : "PENDING_REVIEW";
  const params = new URLSearchParams({ status });
  for (const key of ["game", "store", "q", "overdue"] as const) if (sp[key]) params.set(key, sp[key]!);
  const [data, games] = await Promise.all([adminGet<{ catalogs: AdminCatalogRow[] }>(`/catalogs?${params}`), getGames()]);
  if (!data) return <Denied permission="catalogs:view" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Moderasi Katalog"
        description="Setiap katalog diperiksa sebelum dijual: foto, atribut game, deskripsi, harga, kontak luar, klaim mutlak, dan duplikasi akun. Antrean diurutkan dari yang paling lama diajukan."
      />
      <StatusTabs
        base="/admin/catalogs"
        current={status}
        tabs={TABS.map((t) => ({ value: t, label: t === "ALL" ? "Semua" : catalogStatusLabel[t] }))}
      />
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="status" value={status} />
        <select name="game" defaultValue={sp.game ?? ""} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="">Semua game</option>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <input name="store" defaultValue={sp.store ?? ""} placeholder="slug toko" className="h-9 rounded-lg border border-border bg-background px-3" />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="judul / VS code" className="h-9 rounded-lg border border-border bg-background px-3" />
        <label className="flex h-9 items-center gap-1.5 text-xs text-text-secondary">
          <input type="checkbox" name="overdue" value="1" defaultChecked={Boolean(sp.overdue)} className="accent-primary" /> menunggu &gt; 24 jam
        </label>
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Filter</button>
      </form>

      <Table head={["Katalog", "Toko", "Harga", "Diajukan", "Status", ""]} empty="Antrean kosong.">
        {data.catalogs.map((c) => {
          const waited = hoursSince(c.submittedAt);
          return (
            <tr key={c.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <span className="relative h-12 w-20 flex-none overflow-hidden rounded-md bg-surface-elevated">
                    <Image src={c.image} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  </span>
                  <span className="min-w-0">
                    <Link href={`/admin/catalogs/${c.id}`} className="block max-w-xs truncate font-medium text-text hover:text-primary">
                      {c.title}
                    </Link>
                    <span className="num text-xs text-text-secondary">
                      {c.code || "-"} · {c.gameName}
                      {c.submitCount > 1 && ` · diajukan ${c.submitCount}×`}
                    </span>
                  </span>
                </div>
              </Td>
              <Td>
                {c.store}
                <span className="block text-xs text-text-secondary">
                  {storeTypeLabel[c.storeType as StoreType]} · {c.storeLevel}
                </span>
              </Td>
              <Td className="num whitespace-nowrap">{formatRupiah(c.basePrice)}</Td>
              <Td className={`whitespace-nowrap text-xs ${c.status === "PENDING_REVIEW" && waited >= 24 ? "font-semibold text-red-600" : "text-text-secondary"}`}>
                {c.submittedAt ? `${formatDbDateTime(c.submittedAt)}${c.status === "PENDING_REVIEW" ? ` · ${waited} jam` : ""}` : "-"}
              </Td>
              <Td>
                <Tone tone={catalogStatusTone[c.status]}>{catalogStatusLabel[c.status]}</Tone>
              </Td>
              <Td>
                <Link href={`/admin/catalogs/${c.id}`} className="text-xs font-medium text-primary">
                  Tinjau →
                </Link>
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

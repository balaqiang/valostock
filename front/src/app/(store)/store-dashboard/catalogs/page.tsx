import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Gem, PackagePlus } from "lucide-react";
import { BulkActions } from "@/components/store-dashboard/bulk-actions";
import { Button } from "@/components/ui/button";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { getDashboard, getMyCatalogs, requireStore } from "@/lib/data/store";
import { catalogStatusLabel, catalogStatusTone } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { CatalogStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Katalog Toko | valostock.id" };

const TABS: (CatalogStatus | "ALL")[] = ["ALL", "DRAFT", "PENDING_REVIEW", "REJECTED", "LISTED", "IN_ORDER", "SOLD", "DELISTED"];

export default async function StoreCatalogsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const store = await requireStore("/store-dashboard/catalogs");
  const { status: raw } = await searchParams;
  const status = TABS.includes(raw as CatalogStatus) ? (raw as CatalogStatus | "ALL") : "ALL";
  const [catalogs, dashboard] = await Promise.all([getMyCatalogs(status === "ALL" ? undefined : status), getDashboard()]);
  const counts = dashboard?.catalogs ?? {};
  const active = (counts.PENDING_REVIEW ?? 0) + (counts.LISTED ?? 0) + (counts.LOCKED ?? 0) + (counts.IN_ORDER ?? 0);
  const max = store.subscription?.maxListings;
  const tier = store.subscription?.tier ?? "FREE";
  const everything = status === "ALL" ? catalogs : await getMyCatalogs();

  return (
    <div className="space-y-6">
      <DashHeader
        title="Katalog"
        description={
          <>
            Alur: <strong>Draf</strong> → ajukan → <strong>Menunggu Verifikasi</strong> → admin menyetujui (<strong>Tayang</strong>) atau menolak dengan alasan.{" "}
            Aktif <span className="num font-medium text-text">{active}</span> dari {max ?? "tanpa batas"} (paket {store.subscription?.tier ?? "FREE"}).
          </>
        }
        actions={
          <Button href="/store-dashboard/catalogs/new">
            <PackagePlus className="h-4 w-4" /> Katalog Baru
          </Button>
        }
      />

      {tier === "FREE" ? (
        <Link href="/store-dashboard/subscription" className="flex items-center gap-2 text-xs text-text-secondary hover:text-primary">
          <Gem className="h-3.5 w-3.5" /> Aksi massal (ajukan/sembunyikan banyak katalog) tersedia di paket Pro & Business.
        </Link>
      ) : (
        <BulkActions items={everything.map((c) => ({ id: c.id, title: c.title, code: c.code, status: c.status }))} />
      )}

      <StatusTabs
        base="/store-dashboard/catalogs"
        current={status}
        tabs={TABS.map((t) => ({
          value: t,
          label: t === "ALL" ? "Semua" : catalogStatusLabel[t],
          count: t === "ALL" ? undefined : counts[t],
        }))}
      />

      <Table head={["Katalog", "Harga", "Status", "Dilihat", "Diperbarui", ""]} empty="Belum ada katalog di status ini.">
        {catalogs.map((c) => (
          <tr key={c.id}>
            <Td>
              <div className="flex items-center gap-3">
                <span className="relative h-10 w-16 flex-none overflow-hidden rounded-md bg-surface-elevated">
                  <Image src={c.image} alt="" fill sizes="64px" className="object-cover" unoptimized />
                </span>
                <span className="min-w-0">
                  <Link href={`/store-dashboard/catalogs/${c.id}`} className="block max-w-xs truncate font-medium text-text hover:text-primary">
                    {c.title}
                  </Link>
                  <span className="text-xs text-text-secondary">
                    {c.code || "Belum ada VS code"} · {c.gameName}
                    {c.accountChecked && " · Account Checked"}
                  </span>
                </span>
              </div>
            </Td>
            <Td className="num whitespace-nowrap">
              {formatRupiah(c.price)}
              {c.flashSale && <span className="block text-xs text-amber-600">flash sale</span>}
            </Td>
            <Td>
              <Tone tone={catalogStatusTone[c.status]}>{catalogStatusLabel[c.status]}</Tone>
              {c.status === "REJECTED" && c.reviewNote && <p className="mt-1 max-w-xs text-xs text-red-600 dark:text-red-400">{c.reviewNote}</p>}
            </Td>
            <Td className="num">{c.views}</Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(c.submittedAt ?? c.createdAt)}</Td>
            <Td>
              <Link href={`/store-dashboard/catalogs/${c.id}`} className="text-xs font-medium text-primary">
                Kelola →
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, HandCoins, Package, Timer, TrendingUp, Wallet } from "lucide-react";
import { DashHeader, Panel, StatCard, Tone } from "@/components/dashboard/ui";
import { catalogStatusLabel, orderStatusTone, storeOrderStatusLabel } from "@/lib/labels";
import { getDashboard, getMyCatalogs, getStoreOrders, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { CatalogStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Dashboard Toko | valostock.id" };

const ACTION_STATUSES = new Set(["PAID", "IN_REKBER", "SAFE", "DISPUTED"]);

export default async function StoreOverviewPage() {
  const store = await requireStore("/store-dashboard");
  const [dashboard, orders, rejected] = await Promise.all([getDashboard(), getStoreOrders(), getMyCatalogs("REJECTED")]);
  const catalogs = dashboard?.catalogs ?? {};
  const active = orders.filter((o) => ACTION_STATUSES.has(o.status)).slice(0, 6);
  const sub = store.subscription;

  return (
    <div className="space-y-6">
      <DashHeader
        title={`Halo, ${store.name}`}
        description="Ringkasan toko: pesanan yang perlu ditindak, status verifikasi katalog, dan saldo."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendapatan bersih 30 hari"
          value={formatRupiah(dashboard?.last30Days?.net ?? 0)}
          hint={`${dashboard?.last30Days?.n ?? 0} pesanan selesai`}
          icon={TrendingUp}
          href="/store-dashboard/analytics"
        />
        <StatCard label="Saldo tersedia" value={formatRupiah(dashboard?.balance.available ?? 0)} icon={Wallet} href="/store-dashboard/balance" />
        <StatCard label="Ditahan escrow" value={formatRupiah(dashboard?.balance.escrow ?? 0)} icon={Timer} href="/store-dashboard/balance" />
        <StatCard
          label="Tawaran menunggu"
          value={dashboard?.pendingOffers ?? 0}
          icon={HandCoins}
          href="/store-dashboard/offers"
          tone={(dashboard?.pendingOffers ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Pesanan yang perlu ditindak"
          description="Kirim data akun lewat Rekber Room setelah pesanan dibayar."
          actions={
            <Link href="/store-dashboard/orders" className="text-xs font-medium text-primary">
              Semua pesanan →
            </Link>
          }
        >
          {active.length === 0 ? (
            <p className="text-sm text-text-secondary">Tidak ada pesanan aktif.</p>
          ) : (
            <ul className="divide-y divide-border">
              {active.map((o) => (
                <li key={o.id}>
                  <Link href={`/store-dashboard/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{o.catalog.title}</span>
                      <span className="text-xs text-text-secondary">
                        {o.orderNumber} · {o.buyer.name} · {formatDbDateTime(o.createdAt)}
                      </span>
                    </span>
                    <Tone tone={orderStatusTone[o.status]}>{storeOrderStatusLabel[o.status]}</Tone>
                    <ArrowRight className="h-4 w-4 text-text-secondary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Katalog" description="Setiap katalog diverifikasi admin sebelum tayang.">
          <ul className="space-y-2 text-sm">
            {(["PENDING_REVIEW", "LISTED", "REJECTED", "DRAFT", "IN_ORDER", "SOLD"] as CatalogStatus[]).map((s) => (
              <li key={s} className="flex items-center justify-between">
                <Link href={`/store-dashboard/catalogs?status=${s}`} className="text-text-secondary hover:text-primary">
                  {catalogStatusLabel[s]}
                </Link>
                <span className="num font-semibold text-text">{catalogs[s] ?? 0}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
            Paket <strong className="text-text">{sub?.tier ?? "FREE"}</strong> · batas katalog aktif{" "}
            <strong className="num text-text">{sub?.maxListings ?? "tanpa batas"}</strong>
          </p>
          <Link href="/store-dashboard/catalogs/new" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Package className="h-4 w-4" /> Tambah katalog
          </Link>
        </Panel>
      </div>

      {rejected.length > 0 && (
        <Panel title="Katalog ditolak admin" description="Perbaiki sesuai alasan lalu ajukan ulang.">
          <ul className="divide-y divide-border">
            {rejected.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-red-500" />
                <span className="min-w-0 flex-1">
                  <Link href={`/store-dashboard/catalogs/${c.id}`} className="block text-sm font-medium text-text hover:text-primary">
                    {c.code} · {c.title}
                  </Link>
                  <span className="text-xs text-text-secondary">{c.reviewNote}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="flex items-center gap-2 text-xs text-text-secondary">
        <Clock className="h-3.5 w-3.5" /> Dana dilepas ke saldo tersedia 5 jam setelah pembeli mengonfirmasi akun aman (atau saat pembeli menekan Selesai).
      </p>
    </div>
  );
}

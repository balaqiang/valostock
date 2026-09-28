import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Banknote, Coins, Gavel, HandCoins, Landmark, Package, Receipt, Send, Store, Wallet } from "lucide-react";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, StatCard } from "@/components/dashboard/ui";
import { adminGet, type AdminDashboard } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard Admin — valostock.id" };

export default async function AdminDashboardPage() {
  const data = await adminGet<AdminDashboard>("/dashboard");
  if (!data) return <Denied permission="dashboard:view" />;
  const { kpi, queues, recent } = data;
  const n = (key: string) => Number(kpi[key] ?? 0);
  const q = (key: string) => Number(queues[key] ?? 0);

  return (
    <div className="space-y-6">
      <DashHeader title="Dashboard" description="KPI platform dan antrean keputusan — dimulai dari yang paling lama menunggu." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="GMV hari ini" value={formatRupiah(n("gmv_today"))} icon={Banknote} />
        <StatCard label="GMV 30 hari" value={formatRupiah(n("gmv_30d"))} icon={Banknote} hint={`Komisi ${formatRupiah(n("commission_30d"))}`} />
        <StatCard label="Pesanan aktif" value={n("active_orders")} icon={Receipt} href="/admin/orders" />
        <StatCard label="Top-up sukses 30 hari" value={n("topups_30d")} icon={Coins} href="/admin/topups" />
        <StatCard label="Escrow ditahan" value={formatRupiah(n("escrow_held"))} icon={Landmark} href="/admin/finance" />
        <StatCard label="Float Balance (liabilitas)" value={formatRupiah(n("balance_float"))} icon={Wallet} href="/admin/finance" />
        <StatCard label="Katalog tayang" value={n("listed_catalogs")} icon={Package} hint={`${n("active_stores")} toko aktif · ${n("users")} pengguna`} />
      </div>

      <Panel title="Antrean keputusan">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/admin/catalogs", label: "Katalog menunggu verifikasi", count: q("catalogs"), extra: q("catalogs_overdue") ? `${q("catalogs_overdue")} > 24 jam` : null, icon: Package },
            { href: "/admin/stores", label: "Toko menunggu verifikasi", count: q("stores"), icon: Store },
            { href: "/admin/disputes", label: "Sengketa berjalan", count: q("disputes"), extra: q("disputes_overdue") ? `${q("disputes_overdue")} lewat tenggat` : null, icon: Gavel },
            { href: "/admin/withdrawals", label: "Penarikan menunggu", count: q("withdrawals"), icon: HandCoins },
            { href: "/admin/transfers", label: "Transfer menunggu", count: q("transfers"), icon: Send },
            { href: "/admin/reports", label: "Laporan terbuka", count: q("reports"), icon: AlertTriangle },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 ${item.count > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}
            >
              <item.icon className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-text">{item.label}</span>
                {item.extra && <span className="text-xs font-medium text-red-600">{item.extra}</span>}
              </span>
              <span className="num font-display text-xl font-bold text-text">{item.count}</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="Aktivitas terbaru" actions={<Link href="/admin/audit" className="text-xs font-medium text-primary">Audit log →</Link>}>
        {recent.length === 0 ? (
          <p className="text-sm text-text-secondary">Belum ada aktivitas.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-text">{r.action}</span>{" "}
                  <span className="text-text-secondary">
                    · {r.targetType} {r.targetId.slice(0, 8)} · {r.actor}
                  </span>
                </span>
                <span className="text-xs text-text-secondary">{formatDbDateTime(r.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

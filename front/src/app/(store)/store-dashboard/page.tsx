import type { Metadata } from "next";
import { storeOrderStatusLabel } from "@/lib/labels";
import { storeReceives as receivesAt } from "@/lib/fees";
import {
  getAnalytics,
  getIncomingOffers,
  getStoreOrders,
  getStoreBalance,
  getSubscription,
  requireStore,
} from "@/lib/data/store";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Package,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dashboard Toko — valostock.id",
};

export default async function StoreOverviewPage() {
  const store = await requireStore("/store-dashboard");
  const [analytics, incomingOffers, storeOrders, balance, subscription] = await Promise.all([
    getAnalytics(store.slug),
    getIncomingOffers(store.slug),
    getStoreOrders(store.slug),
    getStoreBalance(store.slug),
    getSubscription(store.slug),
  ]);
  const { available, escrow } = balance;
  const storeReceives = (itemPrice: number) => receivesAt(itemPrice, subscription.commissionRate);

  const stats = [
  {
    label: "Pendapatan 30 hari",
    value: formatRupiah(analytics.revenue30d),
    icon: TrendingUp,
    href: "/store-dashboard/analytics",
  },
  {
    label: "Saldo tersedia",
    value: formatRupiah(available),
    icon: Wallet,
    href: "/store-dashboard/balance",
  },
  {
    label: "Ditahan escrow",
    value: formatRupiah(escrow),
    icon: Timer,
    href: "/store-dashboard/balance",
  },
  {
    label: "Penawaran masuk",
    value: `${incomingOffers.length}`,
    icon: HandCoins,
    href: "/store-dashboard/offers",
  },
];

  const needsAction = storeOrders.filter(
    (order) => order.status === "IN_REKBER" || order.status === "DISPUTED",
  );

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Ringkasan penjualan, saldo, dan hal yang butuh tindakanmu."
      />

      {/* Alerts */}
      {needsAction.length > 0 && (
        <div className="mt-6 space-y-2">
          {needsAction.map((order) => (
            <Link
              key={order.id}
              href={`/store-dashboard/orders/${order.id}`}
              className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 transition-colors duration-200 hover:border-amber-500/60"
            >
              <AlertTriangle className="h-4 w-4 flex-none text-amber-500" />
              <span className="min-w-0 flex-1 text-sm text-text">
                {order.status === "DISPUTED"
                  ? `Sengketa aktif di ${order.orderNumber} — tanggapi sebelum tenggat 72 jam.`
                  : `${order.buyer} menunggu pengiriman akun di Rekber Room ${order.roomCode}.`}
              </span>
              <ArrowRight className="h-4 w-4 flex-none text-text-secondary" />
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-primary/40"
          >
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="num mt-3 truncate font-display text-lg font-bold text-text">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
            <Package className="h-4 w-4 text-primary" />
            Pesanan Terbaru
          </h2>
          <Link
            href="/store-dashboard/orders"
            className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
          >
            Lihat semua
          </Link>
        </div>

        <ul className="mt-4 space-y-3">
          {storeOrders.slice(0, 3).map((order) => (
            <li key={order.id}>
              <Link
                href={`/store-dashboard/orders/${order.id}`}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="num block text-xs text-text-secondary">
                    {order.orderNumber} · {formatDateShort(order.createdAt)} · pembeli:{" "}
                    {order.buyer}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-text group-hover:text-primary">
                    {order.title}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="num text-sm font-semibold text-text">
                    {formatRupiah(storeReceives(order.itemPrice))}
                  </span>
                  <Badge
                    variant={
                      order.status === "COMPLETED"
                        ? "success"
                        : order.status === "DISPUTED"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {storeOrderStatusLabel[order.status]}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-secondary">
          Nominal di atas adalah bagianmu setelah komisi — estimasi tampilan;
          angka final dihitung API.
        </p>
      </section>
    </div>
  );
}

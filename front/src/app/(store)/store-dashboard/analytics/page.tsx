import type { Metadata } from "next";
import { getAnalytics, getSubscription, requireStore } from "@/lib/data/store";
import { BarChart3, Download, Eye, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Analytics Toko — valostock.id",
};

export default async function StoreAnalyticsPage() {
  const store = await requireStore("/store-dashboard/analytics");
  const [analytics, mySubscription] = await Promise.all([getAnalytics(store.slug), getSubscription(store.slug)]);
  const stats = [
  {
    label: "Dilihat (7 hari)",
    value: analytics.views7d.toLocaleString("id-ID"),
    icon: Eye,
  },
  {
    label: "Pengunjung (7 hari)",
    value: analytics.visitors7d.toLocaleString("id-ID"),
    icon: Users,
  },
  {
    label: "Konversi",
    value: `${analytics.conversion.toLocaleString("id-ID")}%`,
    icon: TrendingUp,
  },
  {
    label: "Pendapatan 30 hari",
    value: formatRupiah(analytics.revenue30d),
    icon: BarChart3,
  },
];
  const maxViews = Math.max(1, ...analytics.viewsByDay.map((day) => day.views));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Analytics"
          description={`Termasuk dalam paket ${mySubscription.tier} — pantau performa etalase dan listingmu.`}
        />
        <Button variant="secondary" size="md">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="num mt-3 truncate font-display text-lg font-bold text-text">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Views by day */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-text">
          Kunjungan 7 Hari Terakhir
        </h2>
        <div className="mt-5 flex h-40 items-end gap-2 sm:gap-3">
          {analytics.viewsByDay.map((day) => (
            <div key={day.day} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="num text-[10px] text-text-secondary">
                {day.views}
              </span>
              <div
                className="w-full rounded-t-md bg-primary/80 transition-colors duration-200 hover:bg-primary"
                style={{ height: `${(day.views / maxViews) * 100}%` }}
              />
              <span className="text-[10px] font-medium text-text-secondary">
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-text">
          Terlaris (30 hari)
        </h2>
        <ul className="mt-4 space-y-3">
          {analytics.bestSellers.map((item, index) => (
            <li
              key={item.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Badge className="num">#{index + 1}</Badge>
                <span className="truncate text-sm font-medium text-text">
                  {item.title}
                </span>
              </span>
              <span className="num text-sm text-text-secondary">
                {item.sold} terjual ·{" "}
                <span className="font-semibold text-text">
                  {formatRupiah(item.revenue)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

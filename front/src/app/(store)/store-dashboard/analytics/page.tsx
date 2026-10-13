import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Eye, Gem, Heart, ShoppingBag } from "lucide-react";
import { DashHeader, Panel, StatCard, Table, Td, Tone } from "@/components/dashboard/ui";
import { getAnalytics, requireStore } from "@/lib/data/store";
import { catalogStatusLabel, catalogStatusTone } from "@/lib/labels";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics Toko | valostock.id" };

export default async function StoreAnalyticsPage() {
  await requireStore("/store-dashboard/analytics");
  const a = await getAnalytics();
  const daily = a?.daily ?? [];
  const gmv30 = daily.reduce((sum, d) => sum + d.gmv, 0);
  const orders30 = daily.reduce((sum, d) => sum + d.orders, 0);
  const maxGmv = Math.max(1, ...daily.map((d) => d.gmv));
  const funnel = a?.funnel ?? { views: 0, orders: 0, wishlists: 0 };
  const conversion = funnel.views ? (funnel.orders / funnel.views) * 100 : 0;

  return (
    <div className="space-y-6">
      <DashHeader title="Analytics" description={`Kinerja toko 30 hari terakhir · paket ${a?.tier ?? "FREE"}. Free: corong kunjungan · Pro: + GMV harian & katalog terpopuler · Business: + penjualan per game.`} />
      {a && a.tier !== "BUSINESS" && (
        <Link href="/store-dashboard/subscription" className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Gem className="h-4 w-4" /> {a.tier === "FREE" ? "Upgrade ke Pro untuk grafik harian dan katalog terpopuler." : "Upgrade ke Business untuk analitik penjualan per game."}
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {a?.daily && <StatCard label="GMV 30 hari" value={formatRupiah(gmv30)} icon={BarChart3} />}
        {a?.daily && <StatCard label="Pesanan selesai 30 hari" value={orders30} icon={ShoppingBag} />}
        <StatCard label="Total dilihat" value={funnel.views.toLocaleString("id-ID")} icon={Eye} hint={`Konversi ${conversion.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`} />
        <StatCard label="Disimpan ke wishlist" value={funnel.wishlists} icon={Heart} />
      </div>

      {a?.daily && (
      <Panel title="GMV harian (30 hari)">
        <div className="flex h-40 items-end gap-1">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div className="w-full rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${Math.max(2, (d.gmv / maxGmv) * 150)}px` }} />
              <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-text px-2 py-1 text-[10px] text-background group-hover:block">
                {d.day.slice(5)} · {formatRupiah(d.gmv)}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {a?.topViewed && (
        <Panel title="Katalog paling banyak dilihat">
          <Table head={["Katalog", "Dilihat", "Status"]}>
            {(a?.topViewed ?? []).map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/store-dashboard/catalogs/${c.id}`} className="block max-w-[220px] truncate hover:text-primary">
                    {c.vsCode ?? "Draf"} · {c.title}
                  </Link>
                </Td>
                <Td className="num">{c.views}</Td>
                <Td>
                  <Tone tone={catalogStatusTone[c.status]}>{catalogStatusLabel[c.status]}</Tone>
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
        )}
        {a?.byGame && (
        <Panel title="Penjualan per game">
          <Table head={["Game", "Terjual", "GMV"]} empty="Belum ada penjualan.">
            {(a?.byGame ?? []).map((g) => (
              <tr key={g.game}>
                <Td>{g.game}</Td>
                <Td className="num">{g.sold}</Td>
                <Td className="num">{formatRupiah(g.gmv)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        )}
      </div>
    </div>
  );
}

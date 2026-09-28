import type { Metadata } from "next";
import { BarChart3, Gamepad2, Receipt, Trophy, Wallet } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { getAdminAnalytics } from "@/lib/data/me";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Analytics Akun Game — Admin valostock.id",
  robots: { index: false },
};

// Admin panel (docs/SITEMAP.md §8): top-up activity per game account —
// frequency, total and average spend. Successful game top-ups only; BLC
// purchases are excluded.
export default async function GameAccountAnalyticsPage() {
  await requireAdmin("/admin/analytics");
  const { summary, accounts } = await getAdminAnalytics();
  const topSpend = accounts[0]?.total_spent ?? 0;

  const kpis = [
    { label: "Total Pendapatan Top-Up", value: formatRupiah(summary.totalRevenue), icon: Wallet },
    { label: "Total Transaksi Top-Up", value: summary.totalTransactions.toLocaleString("id-ID"), icon: Receipt },
    { label: "Akun Game Unik", value: summary.uniqueAccounts.toLocaleString("id-ID"), icon: Gamepad2 },
    { label: "Rata-rata per Transaksi", value: formatRupiah(summary.avgTicket), icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <section className="border-b border-border bg-surface">
          <Container className="py-10 sm:py-12">
            <Badge>ADMIN</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Analytics Akun Game
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Seberapa sering setiap akun game di-top-up, total Rupiah yang
              dibelanjakan, dan rata-rata per transaksi. Hanya top-up game yang
              berhasil; pembelian Balance tidak dihitung.
            </p>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-border bg-surface p-5">
                <kpi.icon className="h-5 w-5 text-primary" />
                <p className="num mt-3 truncate font-display text-xl font-bold text-text">
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">{kpi.label}</p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
              <Trophy className="h-4 w-4 text-primary" />
              Peringkat Akun Game (Total Belanja)
            </h2>

            {accounts.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-text-secondary">
                Belum ada top-up game yang berhasil.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-secondary">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">ID Akun Game</th>
                      <th className="px-4 py-3 text-right font-medium">Frekuensi</th>
                      <th className="px-4 py-3 font-medium">Total Belanja</th>
                      <th className="px-4 py-3 text-right font-medium">Rata-rata</th>
                      <th className="px-4 py-3 font-medium">Top-Up Terakhir</th>
                      <th className="px-4 py-3 font-medium">Pembeli</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((account, index) => (
                      <tr
                        key={`${account.user_game_id}|${account.game_zone_id ?? ""}`}
                        className="bg-background"
                      >
                        <td className="num px-4 py-3 text-text-secondary">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-text">
                          {account.user_game_id}
                          {account.game_zone_id && (
                            <span className="text-text-secondary"> ({account.game_zone_id})</span>
                          )}
                        </td>
                        <td className="num px-4 py-3 text-right text-text">
                          {account.topup_count.toLocaleString("id-ID")}×
                        </td>
                        <td className="px-4 py-3">
                          <span className="num font-semibold text-text">
                            {formatRupiah(account.total_spent)}
                          </span>
                          <span className="mt-1 block h-1.5 w-full max-w-[160px] rounded-full bg-surface-elevated">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{
                                width: `${topSpend ? Math.max(4, (account.total_spent / topSpend) * 100) : 0}%`,
                              }}
                            />
                          </span>
                        </td>
                        <td className="num px-4 py-3 text-right text-text">
                          {formatRupiah(account.avg_spent)}
                        </td>
                        <td className="num whitespace-nowrap px-4 py-3 text-text-secondary">
                          {formatDbDateTime(account.last_topup_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={account.linked_to_user ? "default" : "secondary"}>
                            {account.linked_to_user ? "Member" : "Guest"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

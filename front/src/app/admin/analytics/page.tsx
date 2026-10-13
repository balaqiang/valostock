import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { DashHeader, StatCard, Table, Td } from "@/components/dashboard/ui";
import { adminGet, type AnalyticsSummary, type GameAccountAnalytic } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Analitik Top-Up | Admin" };

export default async function AdminAnalyticsPage() {
  const data = await adminGet<{ summary: AnalyticsSummary; accounts: GameAccountAnalytic[] }>("/analytics");
  if (!data) return <Denied permission="audit:view" />;
  const { summary, accounts } = data;

  return (
    <div className="space-y-6">
      <DashHeader title="Analitik Top-Up per Akun Game" description="Top-up sukses dikelompokkan per ID akun game (+ zona). Membantu melihat pelanggan terbesar dan pola top-up." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pendapatan top-up" value={formatRupiah(summary.totalRevenue)} />
        <StatCard label="Transaksi sukses" value={summary.totalTransactions} />
        <StatCard label="Akun game unik" value={summary.uniqueAccounts} />
        <StatCard label="Rata-rata per transaksi" value={formatRupiah(summary.avgTicket)} />
      </div>
      <Table head={["#", "Akun game", "Top-up", "Total", "Rata-rata", "Pertama / terakhir", "Terhubung akun"]} empty="Belum ada top-up sukses.">
        {accounts.map((a, i) => (
          <tr key={`${a.user_game_id}-${a.game_zone_id ?? ""}`}>
            <Td className="num text-xs">{i + 1}</Td>
            <Td className="num text-xs">
              {a.user_game_id}
              {a.game_zone_id ? ` (${a.game_zone_id})` : ""}
            </Td>
            <Td className="num">{a.topup_count}</Td>
            <Td className="num">{formatRupiah(Number(a.total_spent))}</Td>
            <Td className="num">{formatRupiah(Number(a.avg_spent))}</Td>
            <Td className="text-xs text-text-secondary">
              {formatDbDateTime(a.first_topup_at)}
              <span className="block">{formatDbDateTime(a.last_topup_at)}</span>
            </Td>
            <Td className="text-xs">{a.linked_to_user ? "Ya" : "Tamu"}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

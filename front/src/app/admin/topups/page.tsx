import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { getCurrentUser } from "@/lib/auth";
import { DashHeader, Panel, Table, Td } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { adminGet, type TransactionRecord } from "@/lib/data/admin";
import { topupStatus } from "@/lib/topup-status";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Top-Up & Balance — Admin" };

function Rows({ items, canRefund }: { items: TransactionRecord[]; canRefund?: boolean }) {
  return (
    <Table head={["Invoice", "Item", "Akun game", "Jumlah", "Metode", "Status", "Waktu", ""]} empty="Belum ada transaksi.">
      {items.map((t) => {
        const s = topupStatus(t.status);
        return (
          <tr key={t.id}>
            <Td className="num text-xs">{t.invoice_number}</Td>
            <Td className="text-xs">{t.item_name}</Td>
            <Td className="num text-xs">
              {t.user_game_id}
              {t.game_zone_id ? ` (${t.game_zone_id})` : ""}
            </Td>
            <Td className="num">{formatRupiah(t.amount)}</Td>
            <Td className="text-xs">{t.payment_method}</Td>
            <Td>
              <Badge variant={s.variant}>{s.label}</Badge>
            </Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(t.created_at)}</Td>
            <Td>
              {canRefund && ["PAID", "PROCESSING", "SUCCESS"].includes(t.status) && (
                <ActionButton variant="ghost" endpoint={`/api/admin/topups/${t.id}/refund`} prompt="Alasan refund (mis. item tidak masuk ke akun) — wajib:" promptRequired>
                  Refund
                </ActionButton>
              )}
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}

export default async function AdminTopupsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [data, user] = await Promise.all([
    adminGet<{ topups: TransactionRecord[]; balanceFills: TransactionRecord[] }>(`/topups${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    getCurrentUser(),
  ]);
  if (!data) return <Denied permission="payments:view" />;
  return (
    <div className="space-y-6">
      <DashHeader title="Top-Up & Balance" description="Invoice top-up game (pengiriman Digiflazz disimulasikan: PAID → SUCCESS) dan isi Balance (closed-loop). Refund top-up yang tidak masuk: pembeli login menerima Balance, tamu masuk antrean refund." />
      <form className="flex gap-2 text-sm">
        <input name="q" defaultValue={q ?? ""} placeholder="no. invoice / ID game / email" className="h-9 w-72 rounded-lg border border-border bg-background px-3" />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Cari</button>
      </form>
      <Panel title="Top-up game">
        <Rows items={data.topups} canRefund={user?.permissions.includes("payouts:approve")} />
      </Panel>
      <Panel title="Isi Balance">
        <Rows items={data.balanceFills} />
      </Panel>
    </div>
  );
}

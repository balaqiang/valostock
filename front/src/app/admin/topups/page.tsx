import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, Table, Td } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { adminGet } from "@/lib/data/admin";
import { topupStatus } from "@/lib/topup-status";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { TransactionRecord } from "@/types/api";

export const metadata: Metadata = { title: "Top-Up & Balance | Admin" };

function Rows({ items }: { items: TransactionRecord[] }) {
  return (
    <Table head={["Invoice", "Item", "Akun game", "Kontak", "Jumlah", "Metode", "Status", "Waktu"]} empty="Belum ada transaksi.">
      {items.map((t) => {
        const s = topupStatus(t.status);
        return (
          <tr key={t.id}>
            <Td className="num text-xs">{t.invoice_number}</Td>
            <Td className="text-xs">{t.item_name}</Td>
            <Td className="num text-xs">
              {t.user_game_id ?? "-"}
              {t.game_zone_id ? ` (${t.game_zone_id})` : ""}
            </Td>
            <Td className="text-xs text-text-secondary">{t.contact_email ?? "-"}</Td>
            <Td className="num">{formatRupiah(t.amount)}</Td>
            <Td className="text-xs">{t.payment_method}</Td>
            <Td>
              <Badge variant={s.variant}>{s.label}</Badge>
            </Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(t.created_at)}</Td>
          </tr>
        );
      })}
    </Table>
  );
}

// Top-Up & Balance (SKPL 4.3.14): search by invoice number, email or game account ID.
export default async function AdminTopupsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const data = await adminGet<{ topups: TransactionRecord[]; balanceFills: TransactionRecord[] }>(
    `/topups${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );
  if (!data) return <Denied />;
  return (
    <div className="space-y-6">
      <DashHeader
        title="Top-Up & Balance"
        description="Invoice top-up game (pengiriman Digiflazz disimulasikan: lunas → Berhasil) dan pengisian Balance (closed-loop)."
      />
      <form className="flex gap-2 text-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="no. invoice / email / ID akun game"
          aria-label="Cari invoice"
          className="h-9 w-72 rounded-lg border border-border bg-background px-3"
        />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Cari</button>
      </form>
      <Panel title="Top-up game">
        <Rows items={data.topups} />
      </Panel>
      <Panel title="Isi Balance">
        <Rows items={data.balanceFills} />
      </Panel>
    </div>
  );
}

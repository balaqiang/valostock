import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, StatCard, Table, Td } from "@/components/dashboard/ui";
import { adminGet, type AdminFinance } from "@/lib/data/admin";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Keuangan — Admin" };

const REVENUE: [string, string][] = [
  ["commission", "Komisi pesanan"],
  ["handling_fees", "Biaya penanganan"],
  ["protection_fees", "Proteksi"],
  ["subscriptions", "Langganan toko"],
  ["ads", "Iklan featured"],
  ["lock_fees", "Biaya lock"],
  ["topup_surcharge", "Surcharge metode top-up"],
  ["withdraw_fees", "Biaya penarikan"],
  ["transfer_fees", "Biaya transfer"],
];

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(raw)) ? Number(raw) : 30;
  const data = await adminGet<AdminFinance>(`/finance?days=${days}`);
  if (!data) return <Denied permission="finance:view" />;
  const r = (k: string) => Number(data.revenue[k] ?? 0);
  const b = (k: string) => Number(data.balances[k] ?? 0);
  const totalRevenue = REVENUE.reduce((sum, [k]) => sum + r(k), 0);
  const maxGmv = Math.max(1, ...data.daily.map((d) => Number(d.gmv)));

  return (
    <div className="space-y-6">
      <DashHeader
        title="Keuangan"
        description="Ringkasan hanya-baca dari ledger dan pembayaran. Escrow dan float Balance adalah liabilitas, bukan pendapatan."
        actions={
          <span className="flex gap-1 text-xs">
            {[7, 30, 90, 365].map((d) => (
              <Link key={d} href={`/admin/finance?days=${d}`} className={`rounded-full px-3 py-1 ${d === days ? "bg-primary text-white" : "border border-border"}`}>
                {d} hari
              </Link>
            ))}
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Pendapatan platform (${days} hari)`} value={formatRupiah(totalRevenue)} tone="success" />
        <StatCard label="Escrow berjalan" value={formatRupiah(b("escrow"))} />
        <StatCard label="Saldo tersedia toko" value={formatRupiah(b("store_available"))} />
        <StatCard label="Float Balance pembeli" value={formatRupiah(b("balance_float"))} hint={`Deposit toko ditahan ${formatRupiah(b("deposits_held"))}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Pendapatan per sumber">
          <Table head={["Sumber", "Jumlah"]}>
            {REVENUE.map(([k, label]) => (
              <tr key={k}>
                <Td>{label}</Td>
                <Td className="num">{formatRupiah(r(k))}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-text-secondary">Volume top-up sukses: {formatRupiah(r("topup_volume"))} (margin produk di luar ringkasan ini).</p>
        </Panel>
        <Panel title="Payout per status">
          <Table head={["Jenis", "Status", "Jumlah", "Total"]} empty="Belum ada payout.">
            {data.payouts.map((p) => (
              <tr key={`${p.kind}-${p.status}`}>
                <Td>{p.kind === "WITHDRAWAL" ? "Penarikan" : "Transfer"}</Td>
                <Td className="text-xs">{p.status}</Td>
                <Td className="num">{p.n}</Td>
                <Td className="num">{formatRupiah(Number(p.total))}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      <Panel title="GMV harian">
        <div className="flex h-40 items-end gap-0.5">
          {data.daily.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div className="w-full rounded-t bg-primary/70 group-hover:bg-primary" style={{ height: `${Math.max(2, (Number(d.gmv) / maxGmv) * 150)}px` }} />
              <span className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-text px-2 py-1 text-[10px] text-background group-hover:block">
                {d.day} · GMV {formatRupiah(Number(d.gmv))} · top-up {formatRupiah(Number(d.topup))}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type DisputeSummary } from "@/lib/data/admin";
import { disputeReasonLabel, disputeStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Sengketa — Admin" };

const TABS = [
  { value: "ACTIVE", label: "Berjalan" },
  { value: "OPEN", label: "Menunggu toko" },
  { value: "STORE_RESPONDED", label: "Toko menanggapi" },
  { value: "IN_REVIEW", label: "Ditinjau" },
  { value: "CLOSED", label: "Selesai" },
];

export default async function AdminDisputesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "ACTIVE";
  const data = await adminGet<{ disputes: DisputeSummary[] }>(`/disputes?status=${status}`);
  if (!data) return <Denied permission="disputes:resolve" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Sengketa"
        description="Tenggat tanggapan toko 72 jam (merah = lewat). Buka sengketa untuk membaca timeline dan bukti privat, lalu putuskan dengan catatan."
      />
      <StatusTabs base="/admin/disputes" current={status} tabs={TABS} />
      <Table head={["Pesanan", "Alasan", "Pembeli / Toko", "Nilai", "Tenggat toko", "Status", ""]} empty="Tidak ada sengketa.">
        {data.disputes.map((d) => (
          <tr key={d.id}>
            <Td className="num text-xs">{d.orderNumber}</Td>
            <Td>
              {disputeReasonLabel[d.reason]}
              {d.openedAfterCompletion && <span className="block text-xs text-text-secondary">setelah selesai (proteksi)</span>}
            </Td>
            <Td className="text-xs">
              {d.buyer.name}
              <span className="block text-text-secondary">{d.store.name}</span>
            </Td>
            <Td className="num">{formatRupiah(d.itemPrice)}</Td>
            <Td className={`whitespace-nowrap text-xs ${d.overdue ? "font-semibold text-red-600" : "text-text-secondary"}`}>{formatDbDateTime(d.storeDeadline)}</Td>
            <Td>
              <Tone tone={d.overdue ? "destructive" : d.status.startsWith("RESOLVED") || d.status === "CANCELLED" ? "secondary" : "warning"}>
                {disputeStatusLabel[d.status]}
              </Tone>
            </Td>
            <Td>
              <Link href={`/disputes/${d.id}`} className="text-xs font-medium text-primary">
                Buka →
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

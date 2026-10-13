import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, Table, Td, Tone } from "@/components/dashboard/ui";
import { getStoreDisputes, requireStore } from "@/lib/data/store";
import { disputeReasonLabel, disputeStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Sengketa | valostock.id" };

export default async function StoreDisputesPage() {
  await requireStore("/store-dashboard/disputes");
  const disputes = await getStoreDisputes();
  return (
    <div className="space-y-6">
      <DashHeader
        title="Sengketa"
        description="Tanggapi setiap sengketa dalam 72 jam dengan pernyataan dan bukti (tangkapan layar rekber, video). Admin memutuskan; putusan bisa berupa refund, kompensasi, atau sanksi."
      />
      <Table head={["Pesanan", "Alasan", "Nilai", "Tenggat toko", "Status", ""]} empty="Tidak ada sengketa.">
        {disputes.map((d) => (
          <tr key={d.id}>
            <Td className="num text-xs">{d.orderNumber}</Td>
            <Td>
              {disputeReasonLabel[d.reason]}
              <span className="block max-w-xs truncate text-xs text-text-secondary">{d.description}</span>
            </Td>
            <Td className="num">{formatRupiah(d.itemPrice)}</Td>
            <Td className={`text-xs ${d.overdue ? "font-semibold text-red-600" : "text-text-secondary"}`}>{formatDbDateTime(d.storeDeadline)}</Td>
            <Td>
              <Tone tone={d.status.startsWith("RESOLVED") || d.status === "CANCELLED" ? "secondary" : "warning"}>{disputeStatusLabel[d.status]}</Tone>
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

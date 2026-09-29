import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, KeyValues, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { getExternalSeller, getStoreBalance, getTransfers, requireStore } from "@/lib/data/store";
import { TRANSFER_FEE } from "@/lib/fees";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Penjual Eksternal | valostock.id" };

export default async function ExternalSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/external-sellers/${id}`);
  if (store.type !== "RESELLER") redirect("/store-dashboard");
  const [data, { eligibleOrders }, balance] = await Promise.all([getExternalSeller(id), getTransfers(), getStoreBalance()]);
  if (!data) notFound();
  const { seller, transfers } = data;

  return (
    <div className="space-y-6">
      <DashHeader title={seller.alias} back={{ href: "/store-dashboard/external-sellers", label: "Penjual Eksternal" }} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Data penjual">
          <KeyValues
            rows={[
              ["Rekening", `${seller.payoutBank} ${seller.payoutAccount}`],
              ["Atas nama", seller.payoutName],
              ["Total terkirim", <span key="t" className="num">{formatRupiah(seller.paidTotal)}</span>],
              ["Catatan", seller.note ?? "-"],
            ]}
          />
        </Panel>
        <Panel
          className="lg:col-span-2"
          title="Ajukan transfer"
          description={`Dari saldo tersedia tokomu (${formatRupiah(balance.available)}). Satu transfer per pesanan selesai; biaya ${formatRupiah(TRANSFER_FEE)} dipotong dari jumlah.`}
        >
          {store.status !== "ACTIVE" ? (
            <p className="text-sm text-text-secondary">Toko tidak aktif.</p>
          ) : eligibleOrders.length === 0 ? (
            <p className="text-sm text-text-secondary">Belum ada pesanan selesai yang bisa ditransfer.</p>
          ) : (
            <ApiForm
              endpoint="/api/stores/me/transfers"
              extra={{ externalSellerId: seller.id }}
              submitLabel="Ajukan transfer"
              successMessage="Transfer diajukan, menunggu persetujuan admin."
              fields={[
                {
                  name: "orderId",
                  label: "Pesanan",
                  type: "select",
                  required: true,
                  defaultValue: eligibleOrders[0]?.id,
                  options: eligibleOrders.map((o) => ({ value: o.id, label: `${o.number} · bagian toko ${formatRupiah(o.storeReceives)}` })),
                },
                { name: "amount", label: "Jumlah (Rp)", type: "money", required: true, min: TRANSFER_FEE + 1, hint: "Maksimal sebesar bagian toko dari pesanan itu." },
              ]}
            />
          )}
        </Panel>
      </div>
      <Panel title="Riwayat transfer ke penjual ini">
        <Table head={["No.", "Pesanan", "Jumlah", "Status", "Tanggal"]} empty="Belum ada transfer.">
          {transfers.map((t) => (
            <tr key={t.id}>
              <Td className="num text-xs">{t.id}</Td>
              <Td className="num text-xs">{t.order.number}</Td>
              <Td className="num">{formatRupiah(t.amount)}</Td>
              <Td>
                <Tone tone={t.status === "COMPLETED" ? "success" : t.status === "REJECTED" ? "destructive" : "warning"}>{t.status}</Tone>
              </Td>
              <Td className="text-xs text-text-secondary">{formatDbDateTime(t.date)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

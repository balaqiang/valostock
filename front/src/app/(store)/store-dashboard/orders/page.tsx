import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { getStoreOrders, requireStore } from "@/lib/data/store";
import { orderStatusTone, storeOrderStatusLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

export const metadata: Metadata = { title: "Pesanan Toko — valostock.id" };

const GROUPS: Record<string, { label: string; statuses: OrderStatus[] | null }> = {
  action: { label: "Perlu tindakan", statuses: ["PAID", "IN_REKBER", "SAFE", "DISPUTED"] },
  unpaid: { label: "Belum dibayar", statuses: ["PENDING_PAYMENT"] },
  done: { label: "Selesai", statuses: ["COMPLETED"] },
  closed: { label: "Batal / Refund", statuses: ["CANCELLED", "REFUNDED"] },
  all: { label: "Semua", statuses: null },
};

export default async function StoreOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStore("/store-dashboard/orders");
  const { tab: raw } = await searchParams;
  const tab = raw && raw in GROUPS ? raw : "action";
  const all = await getStoreOrders();
  const inGroup = (key: string) => {
    const statuses = GROUPS[key]!.statuses;
    return statuses ? all.filter((o) => statuses.includes(o.status)) : all;
  };
  const orders = inGroup(tab);

  return (
    <div className="space-y-6">
      <DashHeader
        title="Pesanan & Rekber"
        description="Setelah pesanan dibayar, kirim data akun lewat Rekber Room. Dana ditahan escrow dan dilepas 5 jam setelah pembeli mengonfirmasi akun aman."
      />
      <StatusTabs
        base="/store-dashboard/orders"
        param="tab"
        current={tab}
        tabs={Object.entries(GROUPS).map(([value, g]) => ({ value, label: g.label, count: value === "all" ? undefined : inGroup(value).length }))}
      />
      <Table head={["Pesanan", "Pembeli", "Harga", "Kamu terima", "Status", ""]} empty="Tidak ada pesanan di kelompok ini.">
        {orders.map((o) => (
          <tr key={o.id}>
            <Td>
              <span className="num block text-xs font-medium text-primary">{o.orderNumber}</span>
              <span className="block max-w-xs truncate text-xs text-text-secondary">
                {o.isBundle ? `Bundle · ${o.items.length} akun` : o.catalog.title} · {formatDbDateTime(o.createdAt)}
              </span>
            </Td>
            <Td>{o.buyer.name}</Td>
            <Td className="num whitespace-nowrap">
              {formatRupiah(o.itemPrice)}
              {o.voucherDiscount > 0 && <span className="block text-xs text-text-secondary">voucher −{formatRupiah(o.voucherDiscount)}</span>}
            </Td>
            <Td className="num whitespace-nowrap font-medium">
              {formatRupiah(o.storeReceives)}
              <span className="block text-xs font-normal text-text-secondary">komisi {(o.commissionRate * 100).toLocaleString("id-ID")}%</span>
            </Td>
            <Td>
              <Tone tone={orderStatusTone[o.status]}>{storeOrderStatusLabel[o.status]}</Tone>
            </Td>
            <Td>
              <Link href={`/orders/${o.id}`} className="text-xs font-medium text-primary">
                Buka rekber →
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

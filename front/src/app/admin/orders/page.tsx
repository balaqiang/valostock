import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type OrderView } from "@/lib/data/admin";
import { orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Pesanan | Admin" };

const STATUSES = ["PENDING_PAYMENT", "PAID", "IN_REKBER", "SAFE", "COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) params.set("status", sp.status);
  const data = await adminGet<{ orders: OrderView[] }>(`/orders?${params}`);
  if (!data) return <Denied permission="orders:view" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Pesanan"
        description="Cari berdasarkan no. pesanan, VS code, email pembeli, atau nama toko. Buka pesanan untuk melihat rekber dan mengirim pesan sebagai admin. Refund pesanan yang sudah dibayar hanya lewat putusan sengketa."
      />
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="ORD-… / VS… / email / toko" className="h-9 w-72 rounded-lg border border-border bg-background px-3" />
        <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {orderStatusLabel[s]}
            </option>
          ))}
        </select>
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Cari</button>
      </form>
      <Table head={["Pesanan", "Pembeli", "Toko", "Total", "Komisi", "Status", ""]} empty="Tidak ada pesanan.">
        {data.orders.map((o) => (
          <tr key={o.id}>
            <Td>
              <Link href={`/orders/${o.id}`} className="num text-xs font-medium text-primary">
                {o.orderNumber}
              </Link>
              <span className="block max-w-[220px] truncate text-xs text-text-secondary">
                {o.isBundle ? `Bundle ${o.items.length} akun` : `${o.items[0]?.vsCode ?? ""} · ${o.catalog.title}`}
              </span>
              <span className="block text-xs text-text-secondary">{formatDbDateTime(o.createdAt)}</span>
            </Td>
            <Td className="text-xs">
              {o.buyer.name}
              <span className="block text-text-secondary">{o.buyer.email}</span>
            </Td>
            <Td className="text-xs">{o.store.name}</Td>
            <Td className="num whitespace-nowrap">{formatRupiah(o.totalPaid)}</Td>
            <Td className="num whitespace-nowrap text-xs">{formatRupiah(o.commission)}</Td>
            <Td>
              <Tone tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Tone>
            </Td>
            <Td>
              {o.status === "PENDING_PAYMENT" && (
                <ActionButton variant="ghost" endpoint={`/api/admin/orders/${o.id}/cancel`} prompt="Alasan pembatalan (wajib):" promptRequired>
                  Batalkan
                </ActionButton>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

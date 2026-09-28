import type { Metadata } from "next";
import { storeOrderStatusLabel } from "@/lib/labels";
import { storeReceives as receivesAt } from "@/lib/fees";
import { getStoreOrders, getSubscription, requireStore } from "@/lib/data/store";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pesanan Toko — valostock.id",
};

export default async function StoreOrdersPage() {
  const store = await requireStore("/store-dashboard/orders");
  const [mySubscription, storeOrders] = await Promise.all([getSubscription(store.slug), getStoreOrders(store.slug)]);
  const storeReceives = (itemPrice: number) => receivesAt(itemPrice, mySubscription.commissionRate);
  return (
    <div>
      <PageHeader
        title="Pesanan & Rekber"
        description="Semua pesanan tokomu — kirim akun lewat Rekber Room dan pantau statusnya."
      />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-medium">Pesanan</th>
              <th className="px-4 py-3 font-medium">Pembeli</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">
                Kamu Terima ({(mySubscription.commissionRate * 100).toLocaleString("id-ID")}% komisi)
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {storeOrders.map((order) => (
              <tr key={order.id} className="bg-background">
                <td className="max-w-[240px] px-4 py-3">
                  <Link
                    href={`/store-dashboard/orders/${order.id}`}
                    className="num block text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="block truncate text-xs text-text-secondary">
                    {order.title} · {formatDateShort(order.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3 text-text">{order.buyer}</td>
                <td className="num px-4 py-3 text-right text-text-secondary">
                  {formatRupiah(order.itemPrice)}
                </td>
                <td className="num px-4 py-3 text-right font-medium text-text">
                  {formatRupiah(storeReceives(order.itemPrice))}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      order.status === "COMPLETED"
                        ? "success"
                        : order.status === "DISPUTED"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {storeOrderStatusLabel[order.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

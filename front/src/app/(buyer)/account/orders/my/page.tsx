import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { OrdersExplorer } from "@/components/account/orders-explorer";
import { requireUser } from "@/lib/auth";
import { getBuyerOrders, orderDetails, type OrderDetails } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Pesanan Saya — valostock.id",
};

export default async function MyOrdersPage() {
  const user = await requireUser("/account/orders/my");
  const orders = await getBuyerOrders(user.id);
  const details: Record<string, OrderDetails> = {};
  for (const order of orders) {
    const item = orderDetails(order);
    if (item) details[order.id] = item;
  }

  return (
    <div>
      <PageHeader
        title="Pesanan Saya"
        description="Semua pesanan akunmu — dari pembayaran sampai rating."
      />
      <div className="mt-6">
        <OrdersExplorer orders={orders} details={details} />
      </div>
    </div>
  );
}

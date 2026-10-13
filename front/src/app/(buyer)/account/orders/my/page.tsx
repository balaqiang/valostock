import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { OrdersExplorer } from "@/components/account/orders-explorer";
import { requireUser } from "@/lib/auth";
import { getMyOrders } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Pesanan Saya | valostock.id",
};

export default async function MyOrdersPage() {
  await requireUser("/account/orders/my");
  const orders = await getMyOrders();

  return (
    <div>
      <PageHeader
        title="Pesanan Saya"
        description="Semua pesanan akunmu, dari pembayaran sampai rating."
      />
      <div className="mt-6">
        <OrdersExplorer orders={orders} />
      </div>
    </div>
  );
}

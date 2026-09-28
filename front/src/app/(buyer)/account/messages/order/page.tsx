import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { NotificationList } from "@/components/account/notification-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Notifikasi Pesanan — valostock.id",
};

export default async function OrderNotificationsPage() {
  const user = await requireUser("/account/messages/order");
  const orderNotifications = await getNotifications(user.id, "ORDER");

  return (
    <div>
      <PageHeader
        title="Notifikasi Pesanan"
        description="Pembayaran, pengiriman, sengketa, dan penyelesaian pesananmu."
      />
      <div className="mt-6">
        <NotificationList items={orderNotifications} />
      </div>
    </div>
  );
}

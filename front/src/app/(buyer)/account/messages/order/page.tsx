import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { NotificationList } from "@/components/account/notification-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Notifikasi Pesanan — valostock.id" };

export default async function OrderNotificationsPage() {
  await requireUser("/account/messages/order");
  const { notifications } = await getNotifications("ORDER");
  return (
    <div>
      <PageHeader title="Notifikasi Pesanan" description="Pembayaran, rekber, tawaran, dan sengketa." />
      <div className="mt-6">
        <NotificationList items={notifications} />
      </div>
    </div>
  );
}

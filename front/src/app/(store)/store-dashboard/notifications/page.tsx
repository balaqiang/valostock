import type { Metadata } from "next";
import { NotificationList } from "@/components/account/notification-list";
import { DashHeader } from "@/components/dashboard/ui";
import { getNotifications } from "@/lib/data/buyer";
import { requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Notifikasi Toko — valostock.id" };

export default async function StoreNotificationsPage() {
  await requireStore("/store-dashboard/notifications");
  const { notifications } = await getNotifications();
  return (
    <div className="space-y-6">
      <DashHeader title="Notifikasi" description="Keputusan admin (toko, katalog, penarikan), pesanan, tawaran, dan sengketa." />
      <NotificationList items={notifications} />
    </div>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { NotificationList } from "@/components/account/notification-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Notifikasi Sistem | valostock.id" };

export default async function SystemNotificationsPage() {
  await requireUser("/account/messages/system");
  const [system, store] = await Promise.all([getNotifications("SYSTEM"), getNotifications("STORE")]);
  const items = [...system.notifications, ...store.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <PageHeader title="Notifikasi Sistem" description="Harga turun di wishlist, katalog baru dari toko yang kamu ikuti, poin, referral, dan info akun." />
      <div className="mt-6">
        <NotificationList items={items} />
      </div>
    </div>
  );
}

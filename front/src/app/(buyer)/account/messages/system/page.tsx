import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { NotificationList } from "@/components/account/notification-list";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/buyer";

export const metadata: Metadata = {
  title: "Notifikasi Sistem — valostock.id",
};

export default async function SystemNotificationsPage() {
  const user = await requireUser("/account/messages/system");
  const systemNotifications = await getNotifications(user.id, "SYSTEM");

  return (
    <div>
      <PageHeader
        title="Notifikasi Sistem"
        description="Pengumuman platform dan pembaruan kebijakan."
      />
      <div className="mt-6">
        <NotificationList items={systemNotifications} />
      </div>
    </div>
  );
}

import { StoreDashboardShell } from "@/components/store-dashboard/shell";
import {
  getIncomingOffers,
  getStoreChats,
  getStoreOrders,
  getSubscription,
  requireStore,
} from "@/lib/data/store";

// Store shell (docs/SITEMAP.md §7) — professional dashboard layout (fixed
// sidebar + topbar, no public nav/footer). `store`-guarded: only the logged-in
// owner of a store gets in, and every page reads that store's own data.
export default async function StoreDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await requireStore("/store-dashboard");
  const [subscription, orders, offers, chats] = await Promise.all([
    getSubscription(store.slug),
    getStoreOrders(store.slug),
    getIncomingOffers(store.slug),
    getStoreChats(store.slug),
  ]);

  const info = {
    name: store.name,
    slug: store.slug,
    type: store.type,
    tier: subscription.tier,
    commissionRate: subscription.commissionRate,
    alertCount:
      orders.filter((order) => order.status === "IN_REKBER" || order.status === "DISPUTED").length +
      offers.length,
    unreadChats: chats.reduce((sum, chat) => sum + chat.unread, 0),
  };

  return <StoreDashboardShell info={info}>{children}</StoreDashboardShell>;
}

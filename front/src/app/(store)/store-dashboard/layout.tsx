import { StoreDashboardShell } from "@/components/store-dashboard/shell";
import { getCurrentUser } from "@/lib/auth";
import { getDashboard, requireStore } from "@/lib/data/store";

// Store shell (docs/SITEMAP.md §7) — fixed sidebar + topbar, no public nav/footer.
// `store`-guarded: only the logged-in owner of a store gets in, and every page
// reads that store's own data (the API scopes /stores/me/* to the session).
export default async function StoreDashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await requireStore("/store-dashboard");
  const [dashboard, user] = await Promise.all([getDashboard(), getCurrentUser()]);

  const info = {
    name: store.name,
    slug: store.slug,
    type: store.type,
    status: store.status,
    tier: store.subscription?.tier ?? "FREE",
    commissionRate: store.subscription?.commissionRate ?? 0.05,
    alertCount: user?.unreadNotifications ?? 0,
    unreadChats: dashboard?.unreadChats ?? 0,
    pendingOffers: dashboard?.pendingOffers ?? 0,
    toDeliver: dashboard?.orders.PAID ?? 0,
  };

  return <StoreDashboardShell info={info}>{children}</StoreDashboardShell>;
}

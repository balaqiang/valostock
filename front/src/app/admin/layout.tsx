import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getQueueCounts } from "@/lib/data/admin";

// Admin panel (docs/ADMIN_PANEL.md). Only role ADMIN gets in (others: 404);
// each page and every API call re-checks the specific permission.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/admin");
  const queue = await getQueueCounts();
  return (
    <AdminShell info={{ name: user.name, email: user.email, permissions: queue?.permissions ?? user.permissions, counts: queue?.counts ?? {} }}>
      {children}
    </AdminShell>
  );
}

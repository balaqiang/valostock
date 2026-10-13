import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";

// Panel Admin. Only role ADMIN gets in (others: 404); every API call re-checks the role.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/admin");
  return <AdminShell info={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}

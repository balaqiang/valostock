import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { RoleEditor } from "@/components/admin/role-editor";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, Panel, Table, Td } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminRbac } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Admin & Peran | Admin" };

export default async function AdminAdminsPage() {
  const [data, me] = await Promise.all([adminGet<AdminRbac>("/admins"), getCurrentUser()]);
  if (!data) return <Denied permission="rbac:manage" />;
  const roles = data.roles.map((r) => ({ key: r.key, name: r.name }));

  return (
    <div className="space-y-6">
      <DashHeader title="Admin & Peran" description="Hanya Super Admin (rbac:manage). Izin dicek server di setiap endpoint; menu yang izinnya tidak dimiliki disembunyikan." />
      <Panel title="Admin">
        <div className="space-y-4">
          {data.admins.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium text-text">{a.name}</span> <span className="text-text-secondary">· {a.email}</span>
                </p>
                {a.id !== me?.id && (
                  <ActionButton variant="ghost" method="DELETE" endpoint={`/api/admin/admins/${a.id}`} confirm={`Cabut akses admin ${a.email}?`}>
                    Cabut akses
                  </ActionButton>
                )}
              </div>
              <RoleEditor userId={a.id} current={a.roles} roles={roles} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Jadikan pengguna admin">
        <RoleEditor current={[]} roles={roles} />
      </Panel>
      <Panel title="Peran & izin">
        <Table head={["Peran", "Izin"]}>
          {data.roles.map((r) => (
            <tr key={r.key}>
              <Td>
                <span className="font-medium">{r.name}</span>
                <span className="block text-xs text-text-secondary">{r.description}</span>
              </Td>
              <Td className="text-xs">
                <span className="flex flex-wrap gap-1">
                  {r.permissions.map((p) => (
                    <code key={p} className="rounded bg-surface-elevated px-1.5 py-0.5">
                      {p}
                    </code>
                  ))}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

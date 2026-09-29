import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminUserRow } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Pengguna | Admin" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const data = await adminGet<{ users: AdminUserRow[] }>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  if (!data) return <Denied permission="users:view" />;

  return (
    <div className="space-y-6">
      <DashHeader title="Pengguna" description="Cari pengguna, lihat ringkasan, dan blokir/aktifkan akun (alasan wajib). Pengguna yang diblokir tidak bisa login atau bertransaksi." />
      <form className="flex gap-2 text-sm">
        <input name="q" defaultValue={q ?? ""} placeholder="nama / email / HP" className="h-9 w-72 rounded-lg border border-border bg-background px-3" />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Cari</button>
      </form>
      <Table head={["Pengguna", "Peran", "Balance", "Pesanan", "Toko", "Status", "Daftar"]}>
        {data.users.map((u) => (
          <tr key={u.id}>
            <Td>
              <Link href={`/admin/users/${u.id}`} className="font-medium text-text hover:text-primary">
                {u.name}
              </Link>
              <span className="block text-xs text-text-secondary">
                {u.email}
                {u.phone && ` · ${u.phone}`}
              </span>
            </Td>
            <Td>
              <Tone tone={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Tone>
            </Td>
            <Td className="num">{formatRupiah(u.balance)}</Td>
            <Td className="num">{u.orders}</Td>
            <Td className="text-xs">{u.store ?? "-"}</Td>
            <Td>
              <Tone tone={u.isBanned ? "destructive" : "success"}>{u.isBanned ? "Diblokir" : "Aktif"}</Tone>
            </Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">{formatDbDateTime(u.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

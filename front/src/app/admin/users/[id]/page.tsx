import type { Metadata } from "next";
import Link from "next/link";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, KeyValues, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminUserDetail } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Detail Pengguna — Admin" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, me] = await Promise.all([adminGet<AdminUserDetail>(`/users/${id}`), getCurrentUser()]);
  if (!data) return <Denied permission="users:view" />;
  const { user: u } = data;
  const canBan = (me?.permissions.includes("users:ban") ?? false) && u.role !== "ADMIN";
  const canAdjust = me?.permissions.includes("payouts:approve") ?? false;

  return (
    <div className="space-y-6">
      <DashHeader
        title={u.name}
        back={{ href: "/admin/users", label: "Pengguna" }}
        description={
          <span className="flex items-center gap-2">
            <Tone tone={u.isBanned ? "destructive" : "success"}>{u.isBanned ? `Diblokir: ${u.banReason ?? ""}` : "Aktif"}</Tone> {u.email}
          </span>
        }
        actions={
          canBan &&
          (u.isBanned ? (
            <ActionButton variant="primary" endpoint={`/api/admin/users/${u.id}/unban`} confirm="Aktifkan kembali akun ini?">
              Aktifkan
            </ActionButton>
          ) : (
            <ActionButton endpoint={`/api/admin/users/${u.id}/ban`} prompt="Alasan pemblokiran (wajib):" promptKey="reason" promptRequired>
              Blokir akun
            </ActionButton>
          ))
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Ringkasan">
          <KeyValues
            rows={[
              ["Peran", u.role],
              ["HP", u.phone ?? "-"],
              ["Balance", formatRupiah(u.balance)],
              ["Poin", u.points.toLocaleString("id-ID")],
              ["Kode referral", u.referralCode],
              ["Laporan dibuat / diterima", `${data.reports?.made ?? 0} / ${data.reports?.received ?? 0}`],
              [
                "Toko",
                data.store ? (
                  <Link key="s" href={`/admin/stores/${data.store.id}`} className="text-primary">
                    {data.store.name} ({data.store.status})
                  </Link>
                ) : (
                  "-"
                ),
              ],
              ["Daftar", formatDbDateTime(u.createdAt)],
            ]}
          />
        </Panel>
        <Panel title="Ledger Balance (20 terakhir)">
          <Table head={["Jenis", "Jumlah", "Saldo", "Referensi"]} empty="Belum ada.">
            {data.ledger.map((l, i) => (
              <tr key={i}>
                <Td className="text-xs">{l.type}</Td>
                <Td className="num text-xs">{formatRupiah(l.amount)}</Td>
                <Td className="num text-xs">{formatRupiah(l.balanceAfter)}</Td>
                <Td className="num text-xs text-text-secondary">{l.reference}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
      {canAdjust && (
        <Panel title="Penyesuaian Balance" description="Koreksi saja (bukan pencairan): nilai positif menambah, negatif mengurangi. Tercatat sebagai ADJUSTMENT + audit log.">
          <ApiForm
            endpoint={`/api/admin/users/${u.id}/balance-adjust`}
            columns={2}
            submitLabel="Simpan penyesuaian"
            successMessage="Balance disesuaikan."
            fields={[
              { name: "amount", label: "Jumlah (Rp, boleh negatif)", type: "number", required: true },
              { name: "reason", label: "Alasan", type: "text", required: true },
            ]}
          />
        </Panel>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Pesanan">
          <Table head={["No.", "Status", "Total", "Tanggal"]} empty="Belum ada.">
            {data.orders.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/orders/${o.id}`} className="num text-xs text-primary">
                    {o.number}
                  </Link>
                </Td>
                <Td className="text-xs">{o.status}</Td>
                <Td className="num text-xs">{formatRupiah(o.total)}</Td>
                <Td className="text-xs text-text-secondary">{formatDbDateTime(o.date)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Top-up">
          <Table head={["Invoice", "Status", "Jumlah", "Tanggal"]} empty="Belum ada.">
            {data.topups.map((t) => (
              <tr key={t.invoice}>
                <Td className="num text-xs">{t.invoice}</Td>
                <Td className="text-xs">{t.status}</Td>
                <Td className="num text-xs">{formatRupiah(t.amount)}</Td>
                <Td className="text-xs text-text-secondary">{formatDbDateTime(t.date)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminWithdrawal } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Penarikan Dana | Admin" };

const TABS = [
  { value: "PENDING", label: "Menunggu" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "ALL", label: "Semua" },
];

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "PENDING";
  const [data, user] = await Promise.all([adminGet<{ withdrawals: AdminWithdrawal[] }>(`/withdrawals?status=${status}`), getCurrentUser()]);
  if (!data) return <Denied permission="finance:view" />;
  const canApprove = user?.permissions.includes("payouts:approve") ?? false;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Penarikan Dana Toko"
        description="Maker-checker: toko mengajukan, admin keuangan menyetujui (transfer Midtrans Iris disimulasikan) atau menolak, dana ditolak kembali ke saldo toko lewat PAYOUT_REVERSAL. Nama rekening MISMATCH sudah ditolak sistem."
      />
      <StatusTabs base="/admin/withdrawals" current={status} tabs={TABS} />
      <Table head={["No.", "Toko", "Rekening", "Nama rekening", "Jumlah", "Status", ""]} empty="Tidak ada penarikan.">
        {data.withdrawals.map((w) => (
          <tr key={w.uuid}>
            <Td className="num text-xs">
              {w.id}
              <span className="block text-text-secondary">{formatDbDateTime(w.date)}</span>
            </Td>
            <Td className="text-xs">
              {w.store.name}
              <span className="block text-text-secondary">KTP: {w.store.ownerLegalName}</span>
            </Td>
            <Td className="num text-xs">{w.bank}</Td>
            <Td className="text-xs">
              {w.accountName}{" "}
              <Tone tone={w.nameMatch === "MATCH" ? "success" : "warning"}>{w.nameMatch}</Tone>
            </Td>
            <Td className="num whitespace-nowrap">
              {formatRupiah(w.amount)}
              <span className="block text-xs text-text-secondary">biaya {formatRupiah(w.fee)} · ditransfer {formatRupiah(w.amount - w.fee)}</span>
            </Td>
            <Td>
              <Tone tone={w.status === "COMPLETED" ? "success" : w.status === "REJECTED" ? "destructive" : "warning"}>{w.status}</Tone>
              {w.reviewNote && <p className="mt-1 text-xs text-text-secondary">{w.reviewNote}</p>}
            </Td>
            <Td>
              {w.status === "PENDING" && canApprove && (
                <span className="flex gap-1">
                  <ActionButton variant="primary" endpoint={`/api/admin/withdrawals/${w.uuid}`} body={{ decision: "approve" }} confirm={`Setujui transfer ${formatRupiah(w.amount - w.fee)} ke ${w.accountName}?`}>
                    Setujui
                  </ActionButton>
                  <ActionButton variant="ghost" endpoint={`/api/admin/withdrawals/${w.uuid}`} body={{ decision: "reject" }} prompt="Alasan penolakan (wajib):" promptRequired>
                    Tolak
                  </ActionButton>
                </span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

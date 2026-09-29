import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type AdminRefund } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Refund | Admin" };

const TABS = [
  { value: "PENDING", label: "Menunggu" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "ALL", label: "Semua" },
];

const SOURCE: Record<AdminRefund["source"], string> = {
  PAID_AFTER_CANCEL: "Dibayar setelah pesanan/tagihan ditutup",
  LOCK_UNAVAILABLE: "Lock dibayar, akun sudah tidak tersedia",
  TOPUP_UNDELIVERED: "Top-up tamu tidak terkirim",
};

export default async function AdminRefundsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "PENDING";
  const [data, user] = await Promise.all([adminGet<{ refunds: AdminRefund[] }>(`/refunds?status=${status}`), getCurrentUser()]);
  if (!data) return <Denied permission="payments:view" />;
  const canComplete = user?.permissions.includes("payouts:approve") ?? false;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Refund"
        description="Uang yang masuk tetapi tujuannya sudah tidak ada tidak pernah disimpan diam-diam. Selesaikan refund ke metode pembayaran asal (Midtrans refund disimulasikan) dengan catatan."
      />
      <StatusTabs base="/admin/refunds" current={status} tabs={TABS} />
      <Table head={["Referensi", "Sumber", "Pengguna", "Jumlah", "Metode", "Status", ""]} empty="Tidak ada refund.">
        {data.refunds.map((r) => (
          <tr key={r.id}>
            <Td className="num text-xs">
              {r.reference}
              {r.invoice !== r.reference && <span className="block text-text-secondary">{r.invoice}</span>}
              <span className="block text-text-secondary">{formatDbDateTime(r.createdAt)}</span>
            </Td>
            <Td className="text-xs">{SOURCE[r.source]}</Td>
            <Td className="text-xs">{r.user ?? "tamu"}</Td>
            <Td className="num">{formatRupiah(r.amount)}</Td>
            <Td className="text-xs">{r.method}</Td>
            <Td>
              <Tone tone={r.status === "COMPLETED" ? "success" : "warning"}>{r.status === "COMPLETED" ? "Selesai" : "Menunggu"}</Tone>
              {r.note && (
                <p className="mt-1 max-w-xs text-xs text-text-secondary">
                  {r.note}
                  {r.handler && `, ${r.handler}`}
                </p>
              )}
            </Td>
            <Td>
              {r.status === "PENDING" && canComplete && (
                <ActionButton variant="primary" endpoint={`/api/admin/refunds/${r.id}/complete`} prompt="Catatan refund (wajib), mis. dikembalikan ke VA pembeli:" promptRequired>
                  Selesaikan
                </ActionButton>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

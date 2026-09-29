import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { ActionButton } from "@/components/dashboard/action-button";
import { DashHeader, StatusTabs, Table, Td, Tone } from "@/components/dashboard/ui";
import { getCurrentUser } from "@/lib/auth";
import { adminGet, type TransferView } from "@/lib/data/admin";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Transfer Penjual Eksternal | Admin" };

const TABS = [
  { value: "PENDING", label: "Menunggu" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "ALL", label: "Semua" },
];

export default async function AdminTransfersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.value === raw) ? raw! : "PENDING";
  const [data, user] = await Promise.all([adminGet<{ transfers: TransferView[] }>(`/transfers?status=${status}`), getCurrentUser()]);
  if (!data) return <Denied permission="finance:view" />;
  const canApprove = user?.permissions.includes("payouts:approve") ?? false;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Transfer ke Penjual Eksternal"
        description="Toko reseller membayar penjual eksternalnya dari saldo tersedia toko sendiri, satu transfer per pesanan selesai. Admin memeriksa pengenalan nama rekening (REVIEW = periksa lebih teliti)."
      />
      <StatusTabs base="/admin/transfers" current={status} tabs={TABS} />
      <Table head={["No.", "Toko", "Penjual eksternal", "Pesanan", "Jumlah", "Status", ""]} empty="Tidak ada transfer.">
        {data.transfers.map((t) => (
          <tr key={t.uuid}>
            <Td className="num text-xs">
              {t.id}
              <span className="block text-text-secondary">{formatDbDateTime(t.date)}</span>
            </Td>
            <Td className="text-xs">{t.store.name}</Td>
            <Td className="text-xs">
              {t.seller.alias} · {t.seller.bank}
              <span className="block">
                a.n. {t.seller.name} <Tone tone={t.nameMatch === "MATCH" ? "success" : "warning"}>{t.nameMatch}</Tone>
              </span>
            </Td>
            <Td className="num text-xs">{t.order.number}</Td>
            <Td className="num whitespace-nowrap">
              {formatRupiah(t.amount)}
              <span className="block text-xs text-text-secondary">diterima {formatRupiah(t.amount - t.fee)}</span>
            </Td>
            <Td>
              <Tone tone={t.status === "COMPLETED" ? "success" : t.status === "REJECTED" ? "destructive" : "warning"}>{t.status}</Tone>
              {t.reviewNote && <p className="mt-1 text-xs text-text-secondary">{t.reviewNote}</p>}
            </Td>
            <Td>
              {t.status === "PENDING" && canApprove && (
                <span className="flex gap-1">
                  <ActionButton variant="primary" endpoint={`/api/admin/transfers/${t.uuid}`} body={{ decision: "approve" }} confirm="Setujui transfer ini?">
                    Setujui
                  </ActionButton>
                  <ActionButton variant="ghost" endpoint={`/api/admin/transfers/${t.uuid}`} body={{ decision: "reject" }} prompt="Alasan penolakan (wajib):" promptRequired>
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

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { ActionButton } from "@/components/dashboard/action-button";
import { ApiForm } from "@/components/dashboard/api-form";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { getExternalSellers, getTransfers, requireStore } from "@/lib/data/store";
import { formatDbDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Penjual Eksternal — valostock.id" };

const PAYOUT = { PENDING: ["Menunggu admin", "warning"], COMPLETED: ["Terkirim", "success"], REJECTED: ["Ditolak — dana kembali", "destructive"] } as const;

export default async function ExternalSellersPage() {
  const store = await requireStore("/store-dashboard/external-sellers");
  if (store.type !== "RESELLER") redirect("/store-dashboard");
  const [sellers, { transfers }] = await Promise.all([getExternalSellers(), getTransfers()]);

  return (
    <div className="space-y-6">
      <DashHeader
        title="Penjual Eksternal & Transfer"
        description="Penjual titipan yang kamu kelola. Setelah pesanan selesai, bayar mereka dari saldo tersedia tokomu lewat Transfer Request (disetujui admin, biaya Rp4.000)."
      />
      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Tokomu bertanggung jawab penuh atas penjual eksternal: identitas (KTP), keaslian akun, dan kerugian pembeli. Platform hanya mengenal tokomu.
      </p>

      <Panel title="Tambah penjual eksternal">
        <ApiForm
          endpoint="/api/stores/me/external-sellers"
          columns={2}
          submitLabel="Simpan penjual"
          fields={[
            { name: "alias", label: "Nama / alias", type: "text", required: true },
            { name: "payoutBank", label: "Bank / e-wallet", type: "text", required: true, placeholder: "BCA" },
            { name: "payoutAccount", label: "Nomor rekening", type: "text", required: true, hint: "6–20 digit" },
            { name: "payoutName", label: "Nama pemilik rekening", type: "text", required: true },
            { name: "note", label: "Catatan internal", type: "textarea" },
          ]}
        />
      </Panel>

      <Table head={["Penjual", "Rekening", "Transfer", "Total terkirim", ""]} empty="Belum ada penjual eksternal.">
        {sellers.map((s) => (
          <tr key={s.id}>
            <Td>
              <Link href={`/store-dashboard/external-sellers/${s.id}`} className="font-medium text-text hover:text-primary">
                {s.alias}
              </Link>
              <span className="block text-xs text-text-secondary">sejak {formatDbDateTime(s.createdAt)}</span>
            </Td>
            <Td className="text-xs">
              {s.payoutBank} {s.payoutAccount} a.n. {s.payoutName}
            </Td>
            <Td className="num">{s.transfers}</Td>
            <Td className="num">{formatRupiah(s.paidTotal)}</Td>
            <Td>
              <span className="flex gap-1">
                <Link href={`/store-dashboard/external-sellers/${s.id}`} className="text-xs font-medium text-primary">
                  Transfer →
                </Link>
                {s.transfers === 0 && (
                  <ActionButton variant="ghost" method="DELETE" endpoint={`/api/stores/me/external-sellers/${s.id}`} confirm={`Hapus ${s.alias}?`}>
                    Hapus
                  </ActionButton>
                )}
              </span>
            </Td>
          </tr>
        ))}
      </Table>

      <Panel title="Riwayat transfer">
        <Table head={["No.", "Penjual", "Pesanan", "Jumlah", "Nama", "Status"]} empty="Belum ada transfer.">
          {transfers.map((t) => (
            <tr key={t.id}>
              <Td className="num text-xs">{t.id}</Td>
              <Td>{t.seller.alias}</Td>
              <Td className="num text-xs">{t.order.number}</Td>
              <Td className="num">
                {formatRupiah(t.amount)}
                <span className="block text-xs text-text-secondary">diterima {formatRupiah(t.amount - t.fee)}</span>
              </Td>
              <Td>
                <Tone tone={t.nameMatch === "MATCH" ? "success" : "warning"}>{t.nameMatch}</Tone>
              </Td>
              <Td>
                <Tone tone={PAYOUT[t.status][1]}>{PAYOUT[t.status][0]}</Tone>
                {t.reviewNote && <p className="mt-1 text-xs text-text-secondary">{t.reviewNote}</p>}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

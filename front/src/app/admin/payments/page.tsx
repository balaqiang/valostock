import type { Metadata } from "next";
import { Denied } from "@/components/admin/denied";
import { DashHeader, Panel, Table, Td, Tone } from "@/components/dashboard/ui";
import { adminGet, type AdminPayment, type AdminWebhook } from "@/lib/data/admin";
import { paymentPurposeLabel } from "@/lib/labels";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { PaymentPurpose } from "@/types/api";

export const metadata: Metadata = { title: "Pembayaran — Admin" };

const PURPOSES = Object.keys(paymentPurposeLabel) as PaymentPurpose[];
const STATUSES = ["PENDING", "PAID", "EXPIRED", "FAILED"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ purpose?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.purpose && (PURPOSES as string[]).includes(sp.purpose)) params.set("purpose", sp.purpose);
  if (sp.status && STATUSES.includes(sp.status)) params.set("status", sp.status);
  if (sp.q) params.set("q", sp.q);
  const data = await adminGet<{ payments: AdminPayment[]; webhooks: AdminWebhook[] }>(`/payments?${params}`);
  if (!data) return <Denied permission="payments:view" />;

  return (
    <div className="space-y-6">
      <DashHeader
        title="Pembayaran & Webhook"
        description="Semua pembayaran Midtrans per tujuan. Status hanya berubah dari Status API Midtrans, webhook bertanda tangan valid, atau endpoint simulasi."
      />
      <form className="flex flex-wrap gap-2 text-sm">
        <select name="purpose" defaultValue={sp.purpose ?? ""} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="">Semua tujuan</option>
          {PURPOSES.map((p) => (
            <option key={p} value={p}>
              {paymentPurposeLabel[p]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="invoice / email" className="h-9 w-56 rounded-lg border border-border bg-background px-3" />
        <button className="h-9 rounded-lg bg-primary px-4 text-white">Filter</button>
      </form>
      <Table head={["Invoice", "Tujuan", "Pengguna", "Jumlah", "Metode", "Status", "Dibuat / dibayar"]} empty="Tidak ada pembayaran.">
        {data.payments.map((p) => (
          <tr key={p.id}>
            <Td className="num text-xs">{p.invoice}</Td>
            <Td className="text-xs">{paymentPurposeLabel[p.purpose as PaymentPurpose] ?? p.purpose}</Td>
            <Td className="text-xs">{p.user ?? "tamu"}</Td>
            <Td className="num">{formatRupiah(p.amount)}</Td>
            <Td className="text-xs">
              {p.method}
              {p.paymentType && <span className="block text-text-secondary">{p.paymentType}</span>}
            </Td>
            <Td>
              <Tone tone={p.status === "PAID" ? "success" : p.status === "PENDING" ? "warning" : "secondary"}>{p.status}</Tone>
            </Td>
            <Td className="whitespace-nowrap text-xs text-text-secondary">
              {formatDbDateTime(p.createdAt)}
              {p.paidAt && <span className="block">✓ {formatDbDateTime(p.paidAt)}</span>}
            </Td>
          </tr>
        ))}
      </Table>
      <Panel title="Log webhook Midtrans (100 terakhir)">
        <Table head={["#", "External ID", "Invoice", "Tanda tangan", "Diproses", "Diterima"]} empty="Belum ada webhook (mode simulasi tidak memakai webhook).">
          {data.webhooks.map((w) => (
            <tr key={w.id}>
              <Td className="num text-xs">{w.id}</Td>
              <Td className="num max-w-[220px] truncate text-xs">{w.externalId}</Td>
              <Td className="num text-xs">{w.invoice ?? "-"}</Td>
              <Td>
                <Tone tone={w.signatureValid ? "success" : "destructive"}>{w.signatureValid ? "Valid" : "Tidak valid"}</Tone>
              </Td>
              <Td className="text-xs">{w.processed ? "Ya" : "Tidak"}</Td>
              <Td className="text-xs text-text-secondary">{formatDbDateTime(w.receivedAt)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

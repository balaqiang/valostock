import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewButtons } from "@/components/admin/review-buttons";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { serverApiGet } from "@/lib/api-server";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import type { AdminWithdrawal, Withdrawal } from "@/types/api";

export const metadata: Metadata = { title: "Penarikan Dana — Admin valostock.id", robots: { index: false } };

const tabs: { status: Withdrawal["status"] | "ALL"; label: string }[] = [
  { status: "PENDING", label: "Menunggu" },
  { status: "COMPLETED", label: "Selesai" },
  { status: "REJECTED", label: "Ditolak" },
  { status: "ALL", label: "Semua" },
];

const matchVariant = (match: Withdrawal["nameMatch"]) =>
  match === "MATCH" ? "success" : match === "REVIEW" ? "warning" : "destructive";

// Maker-checker: the store requests (balance already debited), the admin
// approves (simulated bank transfer) or rejects (funds return to the store).
export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/withdrawals");
  const { status: raw } = await searchParams;
  const status = tabs.some((tab) => tab.status === raw) ? (raw as Withdrawal["status"] | "ALL") : "PENDING";
  const query = status === "ALL" ? "" : `?status=${status}`;
  const withdrawals =
    (await serverApiGet<{ withdrawals: AdminWithdrawal[] }>(`/api/admin/withdrawals${query}`))?.withdrawals ?? [];

  return (
    <AdminShell
      active="/admin/withdrawals"
      title="Penarikan Dana"
      description="Setujui penarikan jika nama rekening cocok dengan nama pemilik toko. Di prototype, transfer bank (Midtrans Iris) disimulasikan; penolakan mengembalikan dana ke saldo toko."
    >
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin/withdrawals?status=${tab.status}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab.status === status ? "bg-text text-background" : "border border-border text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {withdrawals.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-sm text-text-secondary">
          <Landmark className="h-4 w-4" /> Tidak ada penarikan pada status ini.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {withdrawals.map((w) => (
            <li key={w.uuid} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="num font-mono font-semibold text-text">{w.id}</span>
                  <Badge variant={w.status === "COMPLETED" ? "success" : w.status === "REJECTED" ? "destructive" : "warning"}>
                    {w.status}
                  </Badge>
                </p>
                <p className="text-text-secondary">
                  Toko <span className="font-medium text-text">{w.store.name}</span> · pemilik terverifikasi:{" "}
                  <span className="font-medium text-text">{w.store.ownerLegalName}</span>
                </p>
                <p className="text-text-secondary">
                  Ke {w.bank} a.n. <span className="font-medium text-text">{w.accountName}</span>{" "}
                  <Badge variant={matchVariant(w.nameMatch)}>{w.nameMatch}</Badge>
                </p>
                <p className="text-text-secondary">
                  Jumlah <span className="num font-semibold text-text">{formatRupiah(w.amount)}</span> · biaya{" "}
                  <span className="num">{formatRupiah(w.fee)}</span> · diterima{" "}
                  <span className="num">{formatRupiah(w.amount - w.fee)}</span> · {formatDbDateTime(w.date)}
                </p>
                {w.reviewNote && <p className="text-xs text-text-secondary">Catatan admin: {w.reviewNote}</p>}
              </div>
              {w.status === "PENDING" && <ReviewButtons endpoint={`/api/admin/withdrawals/${w.uuid}`} approveLabel="Setujui & transfer" />}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

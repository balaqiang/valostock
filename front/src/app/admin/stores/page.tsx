import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewButtons } from "@/components/admin/review-buttons";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { serverApiGet } from "@/lib/api-server";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { storeTypeLabel } from "@/lib/labels";
import type { AdminStore, StoreStatus } from "@/types/api";

export const metadata: Metadata = { title: "Verifikasi Toko — Admin valostock.id", robots: { index: false } };

const tabs: { status: StoreStatus | "ALL"; label: string }[] = [
  { status: "PENDING_REVIEW", label: "Menunggu verifikasi" },
  { status: "PENDING_DEPOSIT", label: "Belum bayar deposit" },
  { status: "ACTIVE", label: "Aktif" },
  { status: "REJECTED", label: "Ditolak" },
  { status: "ALL", label: "Semua" },
];

const statusVariant = (status: StoreStatus) =>
  status === "ACTIVE" ? "success" : status === "REJECTED" || status === "SUSPENDED" ? "destructive" : "warning";

// Manual store verification (replaces a KYC provider): the admin checks the
// owner's legal name and store data, then approves or rejects with a note.
export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/stores");
  const { status: raw } = await searchParams;
  const status = tabs.some((tab) => tab.status === raw) ? (raw as StoreStatus | "ALL") : "PENDING_REVIEW";
  const query = status === "ALL" ? "" : `?status=${status}`;
  const stores = (await serverApiGet<{ stores: AdminStore[] }>(`/api/admin/stores${query}`))?.stores ?? [];

  return (
    <AdminShell
      active="/admin/stores"
      title="Verifikasi Toko"
      description="Periksa nama pemilik (sesuai KTP) dan data toko yang sudah membayar deposit, lalu setujui atau tolak. Setiap keputusan tercatat di audit log."
    >
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin/stores?status=${tab.status}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab.status === status ? "bg-text text-background" : "border border-border text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {stores.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-sm text-text-secondary">
          <Store className="h-4 w-4" /> Tidak ada toko pada status ini.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {stores.map((store) => (
            <li key={store.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{store.name}</span>
                  <Badge variant={statusVariant(store.status)}>{store.status}</Badge>
                  <span className="text-xs text-text-secondary">{storeTypeLabel[store.type]}</span>
                </p>
                <p className="text-text-secondary">
                  Nama pemilik (KTP): <span className="font-medium text-text">{store.ownerLegalName}</span>
                </p>
                <p className="text-text-secondary">
                  Akun: {store.owner.name} · {store.owner.email}
                </p>
                <p className="text-text-secondary">
                  Deposit: <span className="num">{formatRupiah(store.depositAmount)}</span> ({store.depositStatus}) · Daftar{" "}
                  {formatDbDateTime(store.createdAt)}
                </p>
                {store.description && <p className="text-xs text-text-secondary">“{store.description}”</p>}
                {store.reviewNote && <p className="text-xs text-text-secondary">Catatan admin: {store.reviewNote}</p>}
              </div>
              {store.status === "PENDING_REVIEW" && <ReviewButtons endpoint={`/api/admin/stores/${store.id}`} approveLabel="Setujui toko" />}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

import type { Metadata } from "next";
import { getExternalSeller, getStoreOrders, getTransferRequests, requireStore } from "@/lib/data/store";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileKey, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/account/bits";
import { TransferRequestForm } from "@/components/store-dashboard/transfer-request-form";
import { formatDateShort, formatRupiah } from "@/lib/format";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/external-sellers/${id}`);
  const seller = await getExternalSeller(store.slug, id);
  return {
    title: seller
      ? `${seller.alias} — Penjual Eksternal`
      : "Penjual tidak ditemukan — valostock.id",
  };
}

export default async function ExternalSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/external-sellers/${id}`);
  const [seller, transferRequests, storeOrders] = await Promise.all([
    getExternalSeller(store.slug, id),
    getTransferRequests(store.slug),
    getStoreOrders(store.slug),
  ]);
  if (!seller) notFound();

  const transfers = transferRequests.filter(
    (transfer) => transfer.sellerId === seller.id,
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-text-secondary"
      >
        <Link
          href="/store-dashboard/external-sellers"
          className="transition-colors duration-200 hover:text-text"
        >
          Penjual Eksternal
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate text-text">{seller.alias}</span>
      </nav>

      <div className="mt-4">
        <PageHeader
          title={seller.alias}
          description={`Terdaftar sejak ${formatDateShort(seller.createdAt)} · ${seller.consignedCount} akun titipan`}
        />
      </div>

      {/* Record */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <FileKey className="h-4 w-4 text-primary" />
          Data Penjual (dipegang toko)
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-text-secondary">Identitas (KTP)</dt>
            <dd className="mt-0.5 font-medium text-text">
              Tersimpan terenkripsi ✓
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">Rekening payout</dt>
            <dd className="num mt-0.5 font-medium text-text">
              {seller.payoutChannel} {seller.payoutAccount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">Nama pemilik rekening</dt>
            <dd className="mt-0.5 font-medium text-text">{seller.payoutName}</dd>
          </div>
        </dl>
      </div>

      {/* New transfer */}
      <div className="mt-5">
        <TransferRequestForm seller={seller} orders={storeOrders} />
      </div>

      {/* Transfer history */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-text">
          <History className="h-4 w-4 text-primary" />
          Riwayat Transfer
        </h2>
        {transfers.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {transfers.map((transfer) => (
              <li
                key={transfer.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <span className="min-w-0">
                  <span className="num block text-xs text-text-secondary">
                    {transfer.id} · {transfer.orderId} ·{" "}
                    {formatDateShort(transfer.date)}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-text">
                    {transfer.catalogTitle}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="num text-sm font-semibold text-text">
                    {formatRupiah(transfer.amount)}
                  </span>
                  <Badge
                    variant={
                      transfer.status === "COMPLETED"
                        ? "success"
                        : transfer.status === "FAILED"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {transfer.status === "COMPLETED"
                      ? "Terkirim"
                      : transfer.status === "PROCESSING"
                        ? "Diproses"
                        : transfer.status === "FAILED"
                          ? "Gagal"
                          : "Validasi"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-secondary">
            Belum ada transfer ke penjual ini.
          </p>
        )}
      </section>
    </div>
  );
}

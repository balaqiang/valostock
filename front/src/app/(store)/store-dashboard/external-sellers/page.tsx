import type { Metadata } from "next";
import { requireStore, getExternalSellers } from "@/lib/data/store";
import Link from "next/link";
import { ChevronRight, Info, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Penjual Eksternal — valostock.id",
};

export default async function ExternalSellersPage() {
  const store = await requireStore("/store-dashboard/external-sellers");
  const externalSellers = await getExternalSellers(store.slug);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Penjual Eksternal"
          description="Penjual titipan yang kamu kelola — identitas (KTP) dipegang tokomu, dan tokomu bertanggung jawab penuh atas mereka."
        />
        <Button variant="primary" size="md">
          <UserPlus className="h-4 w-4" />
          Tambah Penjual
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        Jika penjual eksternal merugikan pembeli, tokomu yang ditindak
        (rating, potongan deposit, suspensi). Platform hanya mengenal tokomu —
        pastikan identitas dan keaslian akun titipan sebelum listing.
      </p>

      {externalSellers.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {externalSellers.map((seller) => (
            <li key={seller.id}>
              <Link
                href={`/store-dashboard/external-sellers/${seller.id}`}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-text group-hover:text-primary">
                    {seller.alias}
                  </span>
                  <span className="num mt-0.5 block text-xs text-text-secondary">
                    {seller.payoutChannel} {seller.payoutAccount} a.n.{" "}
                    {seller.payoutName} · sejak {formatDateShort(seller.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <span className="num">{seller.consignedCount}</span> akun titipan
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-text-secondary group-hover:text-primary" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={Users}
            title="Belum ada penjual eksternal"
            body="Tambahkan penjual titipan untuk mulai me-reseller akun mereka."
          />
        </div>
      )}
    </div>
  );
}

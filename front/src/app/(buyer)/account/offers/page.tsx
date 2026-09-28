import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { ActionButton } from "@/components/dashboard/action-button";
import { BuyButton } from "@/components/listings/buy-button";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { offerStatusLabel } from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { getMyOffers } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Penawaran Saya — valostock.id" };

export default async function MyOffersPage() {
  await requireUser("/account/offers");
  const offers = await getMyOffers();

  return (
    <div>
      <PageHeader title="Penawaran Saya" description="Nego harga dengan toko. Harga yang disepakati berlaku 24 jam — beli sebelum kedaluwarsa." />
      {offers.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/catalog/${offer.catalog.id}`} className="truncate text-sm font-medium text-text hover:text-primary">
                  {offer.catalog.title}
                </Link>
                <Badge
                  variant={
                    offer.status === "ACCEPTED" ? "success" : offer.status === "COUNTERED" ? "warning" : offer.status === "PENDING" ? "default" : "secondary"
                  }
                >
                  {offerStatusLabel[offer.status]}
                </Badge>
              </div>
              <dl className="num mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
                <div>
                  Harga katalog: <span className="font-medium text-text">{formatRupiah(offer.catalog.price)}</span>
                </div>
                <div>
                  Tawaranmu: <span className="font-medium text-text">{formatRupiah(offer.amount)}</span>
                </div>
                {offer.counterAmount && (
                  <div>
                    Tawaran balik {offer.store.name}: <span className="font-semibold text-primary">{formatRupiah(offer.counterAmount)}</span>
                  </div>
                )}
                <div>Berlaku s.d. {formatDbDateTime(offer.expiresAt)}</div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {offer.status === "ACCEPTED" && offer.finalAmount && (
                  <div className="w-56">
                    <BuyButton catalogId={offer.catalog.id} offerId={offer.id} size="md" label={`Beli ${formatRupiah(offer.finalAmount)}`} returnTo="/account/offers" />
                  </div>
                )}
                {offer.status === "COUNTERED" && (
                  <ActionButton variant="primary" endpoint={`/api/offers/${offer.id}/accept-counter`} confirm={`Terima tawaran balik ${formatRupiah(offer.counterAmount ?? 0)}?`}>
                    Terima tawaran balik
                  </ActionButton>
                )}
                {["PENDING", "COUNTERED", "ACCEPTED"].includes(offer.status) && (
                  <ActionButton variant="ghost" endpoint={`/api/offers/${offer.id}/cancel`} confirm="Batalkan tawaran ini?">
                    Batalkan
                  </ActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={HandCoins} title="Belum ada penawaran" body="Tekan Tawar di halaman akun untuk mulai nego dengan toko." />
        </div>
      )}
    </div>
  );
}

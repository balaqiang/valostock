import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";
import { offerStatusLabel } from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { getBuyerOffers } from "@/lib/data/buyer";
import { listingById } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Penawaran Saya — valostock.id",
};

export default async function MyOffersPage() {
  const user = await requireUser("/account/offers");
  const myOffers = await getBuyerOffers(user.id);

  return (
    <div>
      <PageHeader
        title="Penawaran Saya"
        description="Status nego (Tawar) yang sedang berjalan — terima penawaran balik sebelum kedaluwarsa."
      />

      {myOffers.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {myOffers.map((offer) => {
            const listing = listingById(offer.listingId);
            if (!listing) return null;
            return (
              <li key={offer.id}>
                <Link
                  href={`/catalog/${listing.id}`}
                  className="group block rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-text group-hover:text-primary">
                      {listing.title}
                    </span>
                    <Badge
                      variant={
                        offer.status === "ACCEPTED"
                          ? "success"
                          : offer.status === "COUNTERED"
                            ? "warning"
                            : offer.status === "PENDING"
                              ? "default"
                              : "secondary"
                      }
                    >
                      {offerStatusLabel[offer.status]}
                    </Badge>
                  </div>
                  <dl className="num mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
                    <div>
                      Harga listing:{" "}
                      <span className="font-medium text-text">
                        {formatRupiah(listing.price)}
                      </span>
                    </div>
                    <div>
                      Tawaranmu:{" "}
                      <span className="font-medium text-text">
                        {formatRupiah(offer.amount)}
                      </span>
                    </div>
                    {offer.counterAmount && (
                      <div>
                        Tawaran balik toko:{" "}
                        <span className="font-semibold text-primary">
                          {formatRupiah(offer.counterAmount)}
                        </span>
                      </div>
                    )}
                    <div>Berlaku s.d. {formatDateShort(offer.expiresAt)}</div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={HandCoins}
            title="Belum ada penawaran"
            body="Tekan Tawar di halaman akun untuk mulai nego dengan toko."
          />
        </div>
      )}
    </div>
  );
}

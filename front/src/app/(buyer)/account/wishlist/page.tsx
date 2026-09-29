import type { Metadata } from "next";
import { BellRing, Heart } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { ActionButton } from "@/components/dashboard/action-button";
import { ListingCard } from "@/components/listings/listing-card";
import { requireUser } from "@/lib/auth";
import { getRecentlyViewed, getWishlist } from "@/lib/data/buyer";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Wishlist | valostock.id" };

export default async function WishlistPage() {
  await requireUser("/account/wishlist");
  const [items, recent] = await Promise.all([getWishlist(), getRecentlyViewed()]);

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Wishlist" description="Akun yang kamu simpan. Notifikasi harga turun dikirim saat harga baru disetujui admin lebih rendah dari harga saat kamu simpan." />
        {items.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item.listing.id} className="space-y-2">
                <ListingCard listing={item.listing} />
                <div className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                  {!item.available && <span className="font-medium text-red-600">Sudah tidak dijual · </span>}
                  <span>
                    Disimpan di <span className="num">{formatRupiah(item.priceAtSave)}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <ActionButton
                    variant="ghost"
                    method="PATCH"
                    endpoint={`/api/me/wishlist/${item.listing.id}`}
                    body={{ notifyPriceDrop: !item.notifyPriceDrop }}
                  >
                    <BellRing className="h-3.5 w-3.5" /> {item.notifyPriceDrop ? "Matikan alert harga" : "Nyalakan alert harga"}
                  </ActionButton>
                  <ActionButton variant="ghost" method="DELETE" endpoint={`/api/me/wishlist/${item.listing.id}`}>
                    Hapus
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState icon={Heart} title="Wishlist kosong" body="Simpan akun incaranmu dari halaman katalog." />
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <PageHeader title="Terakhir dilihat" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {recent.slice(0, 6).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

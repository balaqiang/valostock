import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { ListingCard } from "@/components/listings/listing-card";
import { requireUser } from "@/lib/auth";
import { getWishlistIds } from "@/lib/data/buyer";
import { listingById } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Wishlist — valostock.id",
};

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = (await getWishlistIds(user.id))
    .map((id) => listingById(id))
    .filter((listing) => listing !== undefined);

  return (
    <div>
      <PageHeader
        title="Wishlist"
        description="Akun yang kamu simpan — nyalakan notifikasi penurunan harga agar tidak ketinggalan."
      />

      {items.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={Heart}
            title="Wishlist kosong"
            body="Simpan akun incaranmu dari halaman katalog."
          />
        </div>
      )}
    </div>
  );
}

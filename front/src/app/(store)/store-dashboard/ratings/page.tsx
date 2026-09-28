import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { RatingsList } from "@/components/store-dashboard/ratings-list";
import { getStore } from "@/lib/data/catalog";
import { getRatings, requireStore } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Ulasan Toko — valostock.id",
};

export default async function StoreRatingsPage() {
  const { slug } = await requireStore("/store-dashboard/ratings");
  const [store, ratings] = await Promise.all([getStore(slug), getRatings(slug)]);

  return (
    <div>
      <PageHeader
        title="Ulasan"
        description={`Rating ${store?.rating ?? "-"} dari ${store?.reviews ?? 0} ulasan. Kamu bisa membalas setiap ulasan satu kali — manipulasi ulasan dilarang keras.`}
      />
      <div className="mt-6">
        <RatingsList ratings={ratings} />
      </div>
    </div>
  );
}

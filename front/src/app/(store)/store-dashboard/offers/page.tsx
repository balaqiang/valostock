import type { Metadata } from "next";
import { DashHeader } from "@/components/dashboard/ui";
import { OffersInbox } from "@/components/store-dashboard/offers-inbox";
import { getStoreOffers, requireStore } from "@/lib/data/store";

export const metadata: Metadata = { title: "Penawaran Masuk | valostock.id" };

export default async function StoreOffersPage() {
  await requireStore("/store-dashboard/offers");
  const offers = await getStoreOffers();
  return (
    <div className="space-y-6">
      <DashHeader
        title="Penawaran Masuk"
        description="Terima, tolak, atau beri tawaran balik. Tawaran berlaku 24 jam; harga yang disepakati berlaku 24 jam untuk checkout pembeli."
      />
      <OffersInbox offers={offers} />
    </div>
  );
}

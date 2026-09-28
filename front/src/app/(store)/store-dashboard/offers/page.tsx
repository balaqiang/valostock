import type { Metadata } from "next";
import { PageHeader } from "@/components/account/bits";
import { OffersInbox } from "@/components/store-dashboard/offers-inbox";
import { getIncomingOffers, requireStore } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "Penawaran Masuk — valostock.id",
};

export default async function StoreOffersPage() {
  const store = await requireStore("/store-dashboard/offers");
  const offers = await getIncomingOffers(store.slug);
  return (
    <div>
      <PageHeader
        title="Penawaran Masuk"
        description="Terima, tolak, atau beri tawaran balik — setiap penawaran punya masa berlaku."
      />
      <div className="mt-6">
        <OffersInbox offers={offers} />
      </div>
    </div>
  );
}

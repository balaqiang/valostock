import type { Metadata } from "next";
import { getMyCatalogs, getSubscription, requireStore } from "@/lib/data/store";
import { Layers, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { CatalogsExplorer } from "@/components/store-dashboard/catalogs-explorer";

export const metadata: Metadata = {
  title: "Katalog Toko — valostock.id",
};

export default async function StoreCatalogsPage() {
  const store = await requireStore("/store-dashboard/catalogs");
  const [myCatalogs, mySubscription] = await Promise.all([getMyCatalogs(store.slug), getSubscription(store.slug)]);
  const activeCount = myCatalogs.filter(
    (catalog) => catalog.status === "LISTED" || catalog.status === "LOCKED",
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Katalog"
          description={`${activeCount} listing aktif dari maksimal ${mySubscription.maxListings} (paket ${mySubscription.tier}).`}
        />
        <div className="flex gap-2">
          {/* Bulk ops — Premium benefit (MONEY_RULES §5) */}
          <Button variant="secondary" size="md">
            <Layers className="h-4 w-4" />
            Bulk Ops
          </Button>
          <Button href="/store-dashboard/catalogs/new" variant="primary" size="md">
            <PackagePlus className="h-4 w-4" />
            Listing Baru
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <CatalogsExplorer catalogs={myCatalogs} />
      </div>
    </div>
  );
}

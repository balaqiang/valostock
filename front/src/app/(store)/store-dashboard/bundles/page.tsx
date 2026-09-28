import type { Metadata } from "next";
import { requireStore, getBundles } from "@/lib/data/store";
import { BadgePercent, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Bundel — valostock.id",
};

export default async function BundlesPage() {
  const store = await requireStore("/store-dashboard/bundles");
  const myBundles = await getBundles(store.slug);
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Bundel"
          description="Jual beberapa akun sekaligus dengan satu harga paket."
        />
        <Button variant="primary" size="md">
          <BadgePercent className="h-4 w-4" />
          Buat Bundel
        </Button>
      </div>

      {myBundles.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {myBundles.map((bundle) => (
            <li
              key={bundle.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-text">
                  {bundle.title}
                </h2>
                <span className="num flex items-baseline gap-2 text-sm">
                  <span className="text-text-secondary line-through">
                    {formatRupiah(bundle.itemsTotal)}
                  </span>
                  <span className="font-bold text-primary">
                    {formatRupiah(bundle.bundlePrice)}
                  </span>
                  <Badge>
                    Hemat{" "}
                    {Math.round(
                      (1 - bundle.bundlePrice / bundle.itemsTotal) * 100,
                    )}
                    %
                  </Badge>
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {bundle.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-text-secondary"
                  >
                    <Package className="h-3 w-3 flex-none text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={BadgePercent} title="Belum ada bundel" />
        </div>
      )}
    </div>
  );
}

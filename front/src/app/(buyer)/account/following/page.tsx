import type { Metadata } from "next";
import Link from "next/link";
import { Star, Store } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { StoreBadges } from "@/components/store/store-badges";
import { formatCompact } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getFollowingSlugs } from "@/lib/data/buyer";
import { getStores } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Mengikuti — valostock.id",
};

export default async function FollowingPage() {
  const user = await requireUser("/account/following");
  const [slugs, stores] = await Promise.all([getFollowingSlugs(user.id), getStores()]);
  const followed = slugs
    .map((slug) => stores.find((store) => store.slug === slug))
    .filter((store) => store !== undefined);

  return (
    <div>
      <PageHeader
        title="Mengikuti"
        description="Toko yang kamu ikuti — dapat kabar saat mereka menambah listing baru."
      />

      {followed.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {followed.map((store) => (
            <li key={store.slug}>
              <Link
                href={`/store/${store.slug}`}
                className="group flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-primary/40"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
                  {store.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text group-hover:text-primary">
                    {store.name}
                    <span className="num inline-flex items-center gap-1 text-xs font-normal text-text-secondary">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {store.rating} · {formatCompact(store.followers)} pengikut
                    </span>
                  </span>
                  <StoreBadges store={store} className="mt-1.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={Store}
            title="Belum mengikuti toko"
            body="Ikuti toko favoritmu dari halaman storefront mereka."
          />
        </div>
      )}
    </div>
  );
}

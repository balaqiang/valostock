import type { Metadata } from "next";
import Link from "next/link";
import { Star, Store } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/account/bits";
import { FollowButton } from "@/components/store/follow-button";
import { formatCompact } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getFollowing } from "@/lib/data/buyer";
import { storeLevelLabel, storeTypeLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Toko yang Diikuti — valostock.id" };

export default async function FollowingPage() {
  await requireUser("/account/following");
  const stores = await getFollowing();

  return (
    <div>
      <PageHeader title="Mengikuti" description="Toko yang kamu ikuti — kamu dapat notifikasi saat katalog baru mereka disetujui admin." />
      {stores.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {stores.map((store) => (
            <li key={store.slug} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${store.gradient} font-display text-lg font-bold text-white`}>
                {store.name.charAt(0)}
              </span>
              <Link href={`/store/${store.slug}`} className="group min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text group-hover:text-primary">
                  {store.name}
                  <span className="num inline-flex items-center gap-1 text-xs font-normal text-text-secondary">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {store.rating} · {formatCompact(store.sold)} terjual · {store.listedCount} akun tayang
                  </span>
                </span>
                <span className="text-xs text-text-secondary">
                  {storeTypeLabel[store.type]} · {storeLevelLabel[store.level]}
                </span>
              </Link>
              <FollowButton slug={store.slug} followers={store.followers} initialFollowing />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState icon={Store} title="Belum mengikuti toko" body="Ikuti toko favoritmu dari halaman etalase mereka." />
        </div>
      )}
    </div>
  );
}

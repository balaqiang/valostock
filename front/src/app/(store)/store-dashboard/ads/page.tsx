import type { Metadata } from "next";
import { featuredPricing } from "@/lib/fees";
import { getAds, getSubscription, requireStore } from "@/lib/data/store";
import { Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Iklan & Featured — valostock.id",
};

export default async function StoreAdsPage() {
  const store = await requireStore("/store-dashboard/ads");
  const [mySubscription, myAds] = await Promise.all([getSubscription(store.slug), getAds(store.slug)]);
  const freeLeft =
    mySubscription.freeFeaturedSlots - mySubscription.usedFeaturedSlots;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Iklan & Featured"
          description="Naikkan visibilitas listing dengan slot featured atau banner kampanye."
        />
        <Button variant="primary" size="md">
          <Megaphone className="h-4 w-4" />
          Pasang Iklan
        </Button>
      </div>

      {/* Free slots (Premium perk) */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
        <Sparkles className="h-5 w-5 flex-none text-primary" />
        <p className="text-sm text-text">
          Paket {mySubscription.tier}:{" "}
          <span className="num font-semibold">{freeLeft}</span> dari{" "}
          <span className="num">{mySubscription.freeFeaturedSlots}</span> slot
          featured gratis tersisa bulan ini.
        </p>
      </div>

      {/* Pricing per MONEY_RULES §7 */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-text">
          Harga Featured Listing
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {featuredPricing.map((option) => (
            <div
              key={option.duration}
              className="rounded-xl border border-border bg-surface p-3.5 text-center"
            >
              <p className="text-xs text-text-secondary">{option.duration}</p>
              <p className="num mt-1 text-sm font-semibold text-text">
                {formatRupiah(option.price)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          Minggu pertama gratis untuk setiap toko baru (sekali). Banner ads
          (homepage/kategori/pencarian) dihargai per kampanye.
        </p>
      </section>

      {/* Campaigns */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold tracking-tight text-text">
          Kampanye Kamu
        </h2>
        <ul className="mt-4 space-y-3">
          {myAds.map((ad) => (
            <li
              key={ad.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-text">
                  <Badge variant="outline">
                    {ad.kind === "FEATURED" ? "Featured" : "Banner"}
                  </Badge>
                  <span className="truncate">{ad.target}</span>
                </span>
                <span className="num mt-1 block text-xs text-text-secondary">
                  {ad.duration} · sampai {formatDateShort(ad.expiresAt)} ·{" "}
                  {ad.price === 0 ? "Slot gratis" : formatRupiah(ad.price)}
                </span>
              </span>
              <Badge variant={ad.status === "ACTIVE" ? "success" : "secondary"}>
                {ad.status === "ACTIVE" ? "Aktif" : "Berakhir"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

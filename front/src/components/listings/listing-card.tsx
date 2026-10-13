import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Star, Zap } from "lucide-react";
import { formatCompact, formatRupiah } from "@/lib/format";
import type { Listing as MockListing } from "@/types/domain";

export function ListingCard({
  listing,
  priority = false,
}: {
  listing: MockListing;
  /** Set on above-the-fold cards so the LCP image loads eagerly. */
  priority?: boolean;
}) {
  const discount = listing.oldPrice
    ? Math.round((1 - listing.price / listing.oldPrice) * 100)
    : null;

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-200 hover:border-primary/40">
      <Link href={`/catalog/${listing.id}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 280px"
            priority={priority}
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {listing.rank}
          </span>
          {listing.instant && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-violet-300 backdrop-blur-sm">
              <Zap className="h-3 w-3" />
              Instan
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-text">
            {listing.title}
          </h3>

          <p className="mt-1.5 text-xs text-text-secondary">
            {listing.skins} skin ·{" "}
            <span className="num">
              {listing.game === "valorant"
                ? `TOTAL VP ${listing.totalVp.toLocaleString("id-ID")}`
                : listing.heroCount
                  ? `${listing.heroCount} hero`
                  : `Level ${listing.level}`}
            </span>
          </p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="num text-lg font-bold tracking-tight text-text">
              {formatRupiah(listing.price)}
            </span>
            {listing.oldPrice && (
              <>
                <span className="num text-xs text-text-secondary line-through">
                  {formatRupiah(listing.oldPrice)}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3 text-xs text-text-secondary">
            {listing.verified && (
              <BadgeCheck className="h-4 w-4 flex-none text-primary" />
            )}
            <span className="truncate font-medium text-text">
              {listing.store}
            </span>
            <span className="ml-auto inline-flex flex-none items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="num">{listing.rating}</span>
              <span aria-hidden>·</span>
              <span className="num">{formatCompact(listing.sold)} terjual</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

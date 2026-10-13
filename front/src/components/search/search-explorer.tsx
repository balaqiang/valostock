"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { cn } from "@/lib/utils";
import type { Game as MockGame } from "@/types/domain";
import type { StoreLevel } from "@/types/domain";
import type { Listing as MockListing } from "@/types/domain";
import { storeLevelLabel } from "@/lib/labels";
import { rankTier } from "@/lib/rank-tiers";

const PAGE_SIZE = 8;

// SITEMAP §1 /search sidebar: game, rank, price range, skins, region,
// badges, store level. Filtering is client-side over the listings the API returned
// (the per-game pages filter server-side through the field templates). Rank tiers
// come from each game's "rank" template, so every account game gets its own ranks.

const priceRanges = [
  { label: "Semua harga", min: 0, max: Infinity },
  { label: "< Rp 500 rb", min: 0, max: 500_000 },
  { label: "Rp 500 rb sampai 1 jt", min: 500_000, max: 1_000_000 },
  { label: "Rp 1 jt sampai 3 jt", min: 1_000_000, max: 3_000_000 },
  { label: "> Rp 3 jt", min: 3_000_000, max: Infinity },
] as const;

const skinRanges = [
  { label: "Semua", min: 0, max: Infinity },
  { label: "< 25 skin", min: 0, max: 25 },
  { label: "25 sampai 50 skin", min: 25, max: 50 },
  { label: "50 sampai 100 skin", min: 50, max: 100 },
  { label: "100+ skin", min: 100, max: Infinity },
] as const;

const badgeFilters = [
  { key: "verified", label: "Toko terverifikasi" },
  { key: "instant", label: "Pengiriman instan" },
] as const;

const sortOptions = [
  { key: "newest", label: "Terbaru" },
  { key: "cheapest", label: "Termurah" },
  { key: "priciest", label: "Termahal" },
  { key: "rating", label: "Rating toko" },
] as const;

type SortKey = (typeof sortOptions)[number]["key"];

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold text-text"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary transition-colors duration-150 hover:text-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary transition-colors duration-150 hover:text-text">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function SearchExplorer({
  listings,
  games: accountGames,
  rankTiers,
  storeLevels,
}: {
  listings: MockListing[];
  games: MockGame[];
  /** Tiers per game slug, highest first (from the "rank" field template). */
  rankTiers: Record<string, string[]>;
  storeLevels: Record<string, StoreLevel>;
}) {
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<string>("all");
  // Selected ranks as "game:tier", so e.g. "Mythic" never matches "Mythical Glory".
  const [ranks, setRanks] = useState<Set<string>>(new Set());
  const [priceIdx, setPriceIdx] = useState(0);
  const [skinIdx, setSkinIdx] = useState(0);
  const [servers, setServers] = useState<Set<string>>(new Set());
  const [badges, setBadges] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<Set<StoreLevel>>(new Set());
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [mobileFilters, setMobileFilters] = useState(false);

  const serverOptions = useMemo(
    () => [...new Set(listings.filter((listing) => game === "all" || listing.game === game).map((listing) => listing.server).filter(Boolean))],
    [listings, game],
  );
  const rankGames = accountGames.filter((item) => (game === "all" || item.slug === game) && (rankTiers[item.slug]?.length ?? 0) > 0);

  /** Switch game; ranks and servers of other games no longer apply. */
  const selectGame = (slug: string) => {
    setGame(slug);
    if (slug !== "all") {
      setRanks((current) => new Set([...current].filter((key) => key.startsWith(`${slug}:`))));
      const allowed = new Set(listings.filter((listing) => listing.game === slug).map((listing) => listing.server));
      setServers((current) => new Set([...current].filter((server) => allowed.has(server))));
    }
    setPage(1);
  };

  const toggle = <T,>(set: Set<T>, value: T, update: (next: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
    setPage(1);
  };

  const reset = () => {
    setQuery("");
    setGame("all");
    setRanks(new Set());
    setPriceIdx(0);
    setSkinIdx(0);
    setServers(new Set());
    setBadges(new Set());
    setLevels(new Set());
    setSort("newest");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const price = priceRanges[priceIdx];
    const skin = skinRanges[skinIdx];
    const result = listings.filter((listing) => {
      if (
        query &&
        !`${listing.title} ${listing.rank} ${listing.store}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      if (game !== "all" && listing.game !== game) return false;
      if (ranks.size > 0 && !ranks.has(`${listing.game}:${rankTier(listing.rank)}`)) return false;
      if (listing.price < price.min || listing.price >= price.max) return false;
      if (listing.skins < skin.min || listing.skins >= skin.max) return false;
      if (servers.size > 0 && !servers.has(listing.server)) return false;
      if (badges.has("verified") && !listing.verified) return false;
      if (badges.has("instant") && !listing.instant) return false;
      if (levels.size > 0) {
        const level = storeLevels[listing.storeSlug];
        if (!level || !levels.has(level)) return false;
      }
      return true;
    });

    switch (sort) {
      case "cheapest":
        return [...result].sort((a, b) => a.price - b.price);
      case "priciest":
        return [...result].sort((a, b) => b.price - a.price);
      case "rating":
        return [...result].sort((a, b) => b.rating - a.rating);
      default:
        return result;
    }
  }, [listings, storeLevels, query, game, ranks, priceIdx, skinIdx, servers, badges, levels, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const sidebar = (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Filter</h2>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors duration-200 hover:text-primary"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="mt-2">
        <FilterGroup title="Game">
          <RadioRow
            name="game"
            label="Semua game"
            checked={game === "all"}
            onChange={() => selectGame("all")}
          />
          {accountGames.map((item) => (
            <RadioRow
              key={item.slug}
              name="game"
              label={item.name}
              checked={game === item.slug}
              onChange={() => selectGame(item.slug)}
            />
          ))}
        </FilterGroup>

        {rankGames.length > 0 && (
          <FilterGroup title="Rank">
            {rankGames.map((item) => (
              <div key={item.slug} className="space-y-2">
                {rankGames.length > 1 && (
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary/80">{item.name}</p>
                )}
                {rankTiers[item.slug]!.map((tier) => {
                  const key = `${item.slug}:${tier}`;
                  return <CheckRow key={key} label={tier} checked={ranks.has(key)} onChange={() => toggle(ranks, key, setRanks)} />;
                })}
              </div>
            ))}
          </FilterGroup>
        )}

        <FilterGroup title="Harga">
          {priceRanges.map((range, index) => (
            <RadioRow
              key={range.label}
              name="price"
              label={range.label}
              checked={priceIdx === index}
              onChange={() => {
                setPriceIdx(index);
                setPage(1);
              }}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Jumlah Skin">
          {skinRanges.map((range, index) => (
            <RadioRow
              key={range.label}
              name="skins"
              label={range.label}
              checked={skinIdx === index}
              onChange={() => {
                setSkinIdx(index);
                setPage(1);
              }}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Region / Server">
          {serverOptions.length === 0 && <p className="text-xs text-text-secondary">Belum ada akun untuk game ini.</p>}
          {serverOptions.map((server) => (
            <CheckRow
              key={server}
              label={server}
              checked={servers.has(server)}
              onChange={() => toggle(servers, server, setServers)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Badge">
          {badgeFilters.map((badge) => (
            <CheckRow
              key={badge.key}
              label={badge.label}
              checked={badges.has(badge.key)}
              onChange={() => toggle(badges, badge.key, setBadges)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Level Toko">
          {(Object.keys(storeLevelLabel) as StoreLevel[]).map((level) => (
            <CheckRow
              key={level}
              label={storeLevelLabel[level]}
              checked={levels.has(level)}
              onChange={() => toggle(levels, level, setLevels)}
            />
          ))}
        </FilterGroup>
      </div>
    </div>
  );

  return (
    <div>
      {/* Search + sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari akun, rank, atau toko…"
            aria-label="Cari akun"
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            className="lg:hidden"
            onClick={() => setMobileFilters((value) => !value)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="hidden sm:inline">Urutkan</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Mobile filter panel */}
      <AnimatePresence>
        {mobileFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-4 overflow-hidden lg:hidden"
          >
            {sidebar}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:self-start">{sidebar}</aside>

        <div className="min-w-0">
          <p className="text-sm text-text-secondary">
            Menampilkan{" "}
            <span className="num font-medium text-text">{shown.length}</span>{" "}
            dari{" "}
            <span className="num font-medium text-text">{filtered.length}</span>{" "}
            akun
          </p>

          {shown.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {shown.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  priority={index < 3}
                />
              ))}
            </div>
          ) : (
            /* Empty state (SITEMAP §10) */
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Search className="h-8 w-8 text-text-secondary" />
              <p className="mt-3 font-medium text-text">Tidak ada akun yang cocok</p>
              <p className="mt-1 text-sm text-text-secondary">
                Coba longgarkan filter atau ubah kata kunci pencarian.
              </p>
              <Button variant="secondary" size="md" className="mt-4" onClick={reset}>
                Reset filter
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Navigasi halaman"
              className="mt-8 flex items-center justify-center gap-1.5"
            >
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNo) => (
                  <button
                    key={pageNo}
                    type="button"
                    aria-current={pageNo === currentPage ? "page" : undefined}
                    onClick={() => setPage(pageNo)}
                    className={cn(
                      "num inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-200",
                      pageNo === currentPage
                        ? "bg-primary text-white"
                        : "border border-border text-text-secondary hover:bg-surface-elevated hover:text-text",
                    )}
                  >
                    {pageNo}
                  </button>
                ),
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

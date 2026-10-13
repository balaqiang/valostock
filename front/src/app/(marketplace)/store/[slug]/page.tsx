import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Star, Ticket } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { StoreBadges } from "@/components/store/store-badges";
import { FollowButton } from "@/components/store/follow-button";
import { ListingCard } from "@/components/listings/listing-card";
import { formatCompact, formatRupiah } from "@/lib/format";
import { getStore, getStorePage, listingsByStore } from "@/lib/data/catalog";
import { getFollowing } from "@/lib/data/buyer";
import { getCurrentUser } from "@/lib/auth";
import { ChatStoreButton } from "@/components/chat/chat-store-button";
import { ReportButton } from "@/components/account/report-button";
import { BuyButton } from "@/components/listings/buy-button";
import { formatDbDateTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  return {
    title: store
      ? `${store.name}, Toko di valostock.id`
      : "Toko tidak ditemukan | valostock.id",
    description: store?.description,
  };
}

const serviceDims = [
  { key: "descAccuracy", label: "Akurasi deskripsi" },
  { key: "attitude", label: "Sikap layanan" },
  { key: "deliverySpeed", label: "Kecepatan kirim" },
] as const;

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getStorePage(slug);
  if (!page) notFound();
  const { store, bundles, ratings } = page;

  const [storeListings, user] = await Promise.all([listingsByStore(store.slug), getCurrentUser()]);
  const following = user ? (await getFollowing()).some((f) => f.slug === store.slug) : false;
  const isOwner = user?.store?.slug === store.slug;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        {/* Custom banner (homepage-editor slot) */}
        <section
          className={`relative overflow-hidden bg-gradient-to-br ${store.gradient}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/25"
          />
          <Container className="relative py-12 sm:py-16">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-white/15 font-display text-2xl font-bold text-white backdrop-blur-sm">
                  {store.name.charAt(0)}
                </span>
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                    {store.name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                      <span className="num">{store.rating}</span>
                      <span className="num">({store.reviews} ulasan)</span>
                    </span>
                    <span className="num">{formatCompact(store.sold)} terjual</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Sejak {store.joined}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isOwner && <ChatStoreButton storeSlug={store.slug} returnTo={`/store/${store.slug}`} variant="invert" />}
                {!isOwner && <FollowButton slug={store.slug} followers={store.followers} initialFollowing={following} loggedIn={Boolean(user)} />}
              </div>
            </div>
          </Container>
        </section>

        <Container className="py-8 sm:py-10">
          {/* Badges + description */}
          <StoreBadges store={store} />
          <p className="mt-4 max-w-3xl text-text-secondary">{store.description}</p>
          {store.type === "RESELLER" && (
            <p className="mt-2 max-w-3xl text-xs text-text-secondary">
              Reseller Store menjual akun titipan penjual eksternal dan
              bertanggung jawab penuh atas identitas penjual, keaslian akun,
              dan penanganan masalah.
            </p>
          )}

          {/* Service Score — 3 dimensions per docs */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {serviceDims.map((dim) => {
              const value = store.serviceScore[dim.key];
              return (
                <div
                  key={dim.key}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs text-text-secondary">{dim.label}</p>
                    <p className="num text-sm font-semibold text-text">
                      {value.toFixed(1)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Store vouchers */}
          {store.vouchers.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold tracking-tight text-text">
                Voucher Toko
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {store.vouchers.map((voucher) => (
                  <div
                    key={voucher.code}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3"
                  >
                    <Ticket className="h-5 w-5 flex-none text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {voucher.kind === "PERCENT"
                          ? `Diskon ${voucher.value}%`
                          : `Potongan ${formatRupiah(voucher.value)}`}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Min. belanja {formatRupiah(voucher.minSpend)}
                      </p>
                    </div>
                    <Badge className="num ml-2">{voucher.code}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listings */}
          <div className="mt-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight text-text">
                Katalog {store.name}
              </h2>
              <p className="text-sm text-text-secondary">
                <span className="num font-medium text-text">
                  {storeListings.length}
                </span>{" "}
                akun aktif
              </p>
            </div>

            {storeListings.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {storeListings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    priority={index < 4}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border py-16 text-center text-sm text-text-secondary">
                Toko ini belum punya listing aktif.
              </div>
            )}
          </div>

          {/* Bundles */}
          {bundles.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl font-bold tracking-tight text-text">Bundle Hemat</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {bundles.map((bundle) => (
                  <div key={bundle.id} className="rounded-2xl border border-border bg-surface p-5">
                    <p className="font-semibold text-text">{bundle.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {bundle.catalogIds.length} akun ·{" "}
                      <span className="num font-semibold text-text">{formatRupiah(bundle.bundlePrice)}</span>{" "}
                      <span className="num line-through">{formatRupiah(bundle.itemsTotal)}</span>
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs text-text-secondary">
                      {bundle.catalogIds.map((id) => {
                        const item = storeListings.find((l) => l.id === id);
                        return <li key={id}>• {item?.title ?? id}</li>;
                      })}
                    </ul>
                    {!isOwner && (
                      <div className="mt-4 w-48">
                        <BuyButton bundleId={bundle.id} size="md" label="Beli bundle" returnTo={`/store/${store.slug}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold tracking-tight text-text">Ulasan Pembeli</h2>
            {ratings.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">Belum ada ulasan.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ratings.map((r, i) => (
                  <li key={i} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-text">{r.buyer}</span>
                      <span className="text-xs text-text-secondary">{formatDbDateTime(r.date)}</span>
                    </div>
                    <p className="num mt-1 text-xs text-text-secondary">
                      Akurasi {r.descAccuracy}/5 · Sikap {r.attitude}/5 · Kecepatan {r.deliverySpeed}/5
                    </p>
                    {r.comment && <p className="mt-2 text-sm text-text">{r.comment}</p>}
                    {r.reply && (
                      <p className="mt-2 rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text-secondary">
                        <span className="font-medium text-text">Balasan toko:</span> {r.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isOwner && store.id && (
            <div className="mt-8">
              <ReportButton targetType="STORE" targetId={store.id} returnTo={`/store/${store.slug}`} />
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

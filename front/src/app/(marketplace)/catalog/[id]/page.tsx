import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  Star,
  Store,
  Timer,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { BuyButton } from "@/components/listings/buy-button";
import { ImageSlider } from "@/components/listings/image-slider";
import { Tabs } from "@/components/listings/tabs";
import { CollectionView } from "@/components/listings/collection-view";
import { AgentsGrid, AGENTS } from "@/components/listings/agents-grid";
import { ReviewsSection } from "@/components/listings/reviews-section";
import { FaqSection } from "@/components/listings/faq-section";
import { StoreBadges } from "@/components/store/store-badges";
import { formatCompact, formatRupiah } from "@/lib/format";
import type { Listing as MockListing } from "@/types/domain";
import { handlingFeeFor, PROTECTION_FEE, protectionDaysFor } from "@/lib/fees";
import { getBuyContext, getGame, getGameFields, getListing, getListingDetail, getStorePage } from "@/lib/data/catalog";
import { getCurrentUser } from "@/lib/auth";
import { BuyPanel } from "@/components/listings/buy-panel";
import { formatDbDateTime } from "@/lib/format";
import type { FieldTemplate } from "@/types/domain";
import { buildCollection } from "./collection";

/** Any game: every catalog column (from the admin-managed templates) with its value. */
function AttributeSheet({ listing, fields }: { listing: MockListing; fields: FieldTemplate[] }) {
  const value = (f: FieldTemplate) => {
    const v = listing.attributes[f.key];
    if (v === undefined || v === null || v === "") return "-";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "-";
    return typeof v === "number" ? v.toLocaleString("id-ID") : String(v);
  };
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <dl className="divide-y divide-border">
        {fields.map((f) => (
          <SheetRow key={f.key} label={f.label} value={value(f)} />
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-elevated px-4 py-3">
        <span className="num font-display text-lg font-bold text-text">{formatRupiah(listing.price)}</span>
        <span className="num rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold tracking-wider text-text">CODE: {listing.code}</span>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  return {
    title: listing
      ? `${listing.title} | valostock.id`
      : "Akun tidak ditemukan | valostock.id",
  };
}

const paymentMethods = ["QRIS", "VA Bank", "OVO", "GoPay", "DANA"];

function rankIcon(rank: string): string {
  return `/images/ranks/${rank.replace(/ /g, "_")}_Rank.png`;
}

function weaponOf(skinName: string): string {
  return skinName.split(" ").at(-1) ?? "";
}

function skinlineOf(skinName: string): string {
  return skinName.split(" ").slice(0, -1).join(" ");
}

function ownedAgents(agents: string): number {
  if (agents === "FULL") return AGENTS.length;
  const parsed = Number.parseInt(agents, 10);
  return Number.isNaN(parsed) ? AGENTS.length : parsed;
}

function SpecTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

function SheetRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 flex-none text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

function DescriptionSheet({ listing }: { listing: MockListing }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Check className="h-3.5 w-3.5" />
        READY
      </span>

      <dl className="mt-4 divide-y divide-border">
        <SheetRow
          label="Rank"
          value={
            <span className="inline-flex items-center gap-2">
              <Image
                src={rankIcon(listing.rank)}
                alt=""
                width={20}
                height={20}
              />
              {listing.rank}
            </span>
          }
        />
        <SheetRow
          label="Skins"
          value={
            <ul className="space-y-0.5">
              {listing.skinsList.map((skin) => (
                <li key={skin}>{skin}</li>
              ))}
            </ul>
          }
        />
        <SheetRow
          label="Remaining VP"
          value={<span className="num">{listing.remainingVp.toLocaleString("id-ID")}</span>}
        />
        <SheetRow
          label="Remaining RP"
          value={<span className="num">{listing.remainingRp.toLocaleString("id-ID")}</span>}
        />
        <SheetRow
          label="Remaining KC"
          value={<span className="num">{listing.remainingKc.toLocaleString("id-ID")}</span>}
        />
        <SheetRow
          label="Total VP"
          value={
            <span className="num font-semibold">
              {listing.totalVp.toLocaleString("id-ID")} VP
            </span>
          }
        />
        <SheetRow label="Agent" value={listing.agents} />
        <SheetRow
          label="Battlepass"
          value={
            listing.battlepass.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {listing.battlepass.map((bp) => (
                  <span
                    key={bp}
                    className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-medium"
                  >
                    {bp}
                  </span>
                ))}
              </span>
            ) : (
              "-"
            )
          }
        />
        <SheetRow
          label="Change Nick"
          value={listing.changeNick ? "READY" : "Belum tersedia"}
        />
        <SheetRow label="Email" value={listing.emailStatus} />
        <SheetRow label="Region" value={`${listing.region} (REQUIRED)`} />
        <SheetRow label="Premier" value={listing.premier} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-elevated px-4 py-3">
        <span className="num font-display text-lg font-bold text-text">
          {formatRupiah(listing.price)}
        </span>
        <span className="num rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold tracking-wider text-text">
          CODE: {listing.code}
        </span>
      </div>
    </div>
  );
}

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getListingDetail(id);
  if (!detail) notFound();
  const { listing, store, inspection, bundles } = detail;

  const [game, fields, storePage, context, user] = await Promise.all([
    getGame(listing.game),
    getGameFields(listing.game),
    getStorePage(listing.storeSlug),
    getBuyContext(listing.id),
    getCurrentUser(),
  ]);
  const isValorant = listing.game === "valorant";

  const collection = isValorant ? await buildCollection(listing.id, listing.skins, listing.skinsList) : null;
  // If the skin API is unreachable the collection is empty — fall back
  // to the listing's own count so the page stays truthful.
  const skinsCount = collection && collection.total > 0 ? collection.total : listing.skins;
  const agentCount = ownedAgents(listing.agents);

  const hotWeapons = [...new Set(listing.skinsList.map(weaponOf))]
    .slice(0, 2)
    .join(" / ")
    .toUpperCase();
  const hotSkins = listing.skinsList.slice(0, 2).map(skinlineOf).join(" / ");
  const handlingFee = handlingFeeFor(listing.price);
  const totalPay = listing.price + handlingFee + PROTECTION_FEE;
  const protectionDays = protectionDaysFor(listing.price);
  const discount = listing.oldPrice
    ? Math.round((1 - listing.price / listing.oldPrice) * 100)
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="py-8 sm:py-10">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-text-secondary"
          >
            <Link href="/" className="transition-colors duration-200 hover:text-text">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              href={game ? `/${game.slug}/account` : "/search"}
              className="transition-colors duration-200 hover:text-text"
            >
              Akun {game?.name ?? "Game"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="truncate text-text">{listing.title}</span>
          </nav>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
            {/* ── Left column ────────────────────────────────────── */}
            <div className="min-w-0">
              {/* Account Checked banner — only when the store's inspection passed */}
              {listing.accountChecked && inspection?.result === "PASSED" && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <ClipboardCheck className="h-5 w-5 flex-none text-primary" />
                  <p className="min-w-0 flex-1 text-sm text-text">
                    <span className="font-semibold">Account Checked</span>{" "}
                    <span className="text-text-secondary">
                      diinspeksi oleh {listing.store} · {formatDbDateTime(inspection.date)}
                    </span>
                  </p>
                  <span className="flex-none -rotate-3 rounded border border-primary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Checked
                  </span>
                </div>
              )}
              {listing.status !== "LISTED" && (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  Akun ini sedang dalam transaksi pembeli lain. Simpan ke wishlist, jika transaksinya batal, akun kembali dijual.
                </div>
              )}

              <ImageSlider images={listing.images} alt={listing.title} />

              {/* Rank + delivery chips */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text">
                  {isValorant && <Image
                    src={rankIcon(listing.rank)}
                    alt=""
                    width={16}
                    height={16}
                  />}
                  {listing.rank}
                </span>
                {listing.instant && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                    <Zap className="h-3 w-3 text-primary" />
                    Pengiriman instan
                  </span>
                )}
                <span className="num inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold tracking-wider text-text">
                  VS: {listing.code}
                </span>
              </div>

              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
                {listing.title}
              </h1>

              {/* Store type + trust badges (SITEMAP §3) */}
              {store && (
                <StoreBadges
                  store={store}
                  accountChecked={listing.verified}
                  className="mt-4"
                />
              )}
              {listing.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{listing.description}</p>
              )}

              {isValorant ? (
              <>
              {/* Spec tiles (iGV-style) */}
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <SpecTile label="Server" value={listing.server} />
                <SpecTile
                  label="Rank"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Image
                        src={rankIcon(listing.rank)}
                        alt=""
                        width={18}
                        height={18}
                      />
                      {listing.rank}
                    </span>
                  }
                />
                <SpecTile label="Weapon" value={hotWeapons} />
                <SpecTile
                  label="Valorant Points"
                  value={
                    <span className="num">
                      {listing.remainingVp.toLocaleString("id-ID")}
                    </span>
                  }
                />
                <SpecTile
                  label="Account Level"
                  value={<span className="num">{listing.level}</span>}
                />
                <SpecTile
                  label="Skins Count"
                  value={<span className="num">{skinsCount}</span>}
                />
                <SpecTile label="Hot Skins" value={hotSkins} />
                <SpecTile
                  label="Agents Amount"
                  value={<span className="num">{agentCount}</span>}
                />
                <SpecTile label="Episode & Act" value={listing.episodeAct} />
                <SpecTile
                  label="Kingdom Credits"
                  value={
                    <span className="num">
                      {listing.remainingKc.toLocaleString("id-ID")}
                    </span>
                  }
                />
                <SpecTile
                  label="Radianite Points"
                  value={<span className="num">{listing.radianite}</span>}
                />
                <SpecTile
                  label="Verified Email"
                  value={listing.emailStatus.startsWith("Terverifikasi") ? "Yes" : "No"}
                />
              </dl>

              {/* Recovery Risk — self-declared, never platform-verified */}
              <div className="mt-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="text-text-secondary">Recovery Risk:</span>
                  <span
                    className={`font-semibold ${
                      listing.verified ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {listing.verified ? "LOW" : "MEDIUM"}
                  </span>
                  <span className="text-text-secondary">
                    Confidence:{" "}
                    <span className="font-medium text-text">
                      {listing.verified ? "Tinggi" : "Sedang"}
                    </span>
                  </span>
                  {listing.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-text">
                      <FileCheck className="h-3 w-3 text-primary" />
                      Evidence Submitted
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">
                  Deklarasi mandiri penjual, bukan verifikasi platform.
                  Deklarasi palsu berujung suspensi permanen.
                </p>
              </div>

              {/* Offer description / product verification */}
              <div className="mt-8">
                <Tabs
                  items={[
                    {
                      label: "Deskripsi Penawaran",
                      content: <DescriptionSheet listing={listing} />,
                    },
                    {
                      label: "Verifikasi Produk",
                      content: (
                        <Tabs
                          size="sm"
                          items={[
                            {
                              label: `Collection (${skinsCount})`,
                              content: (
                                collection ? <CollectionView collection={collection} /> : null
                              ),
                            },
                            {
                              label: `Agents (${agentCount}/${AGENTS.length})`,
                              content: <AgentsGrid owned={agentCount} />,
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              </div>
              </>
              ) : (
                <div className="mt-8">
                  <h2 className="mb-3 font-display text-lg font-bold text-text">Data akun</h2>
                  <AttributeSheet listing={listing} fields={fields} />
                </div>
              )}


              {bundles.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-xl font-bold tracking-tight text-text">Beli sekaligus (bundle)</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {bundles.map((bundle) => (
                      <div key={bundle.id} className="rounded-2xl border border-border bg-surface p-5">
                        <p className="font-semibold text-text">{bundle.title}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          <span className="num font-semibold text-text">{formatRupiah(bundle.bundlePrice)}</span>{" "}
                          <span className="num line-through">{formatRupiah(bundle.itemsTotal)}</span>
                        </p>
                        <ul className="mt-2 space-y-0.5 text-xs text-text-secondary">
                          {bundle.items.map((item) => (
                            <li key={item.id}>
                              • <Link href={`/catalog/${item.id}`} className="hover:text-primary">{item.title}</Link>
                            </li>
                          ))}
                        </ul>
                        {!context?.isOwner && (
                          <div className="mt-4 w-48">
                            <BuyButton bundleId={bundle.id} size="md" label="Beli bundle" returnTo={`/catalog/${listing.id}`} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <ReviewsSection store={listing.store} rating={store?.rating ?? 0} reviews={store?.reviews ?? 0} ratings={storePage?.ratings ?? []} />
              <FaqSection />
            </div>

            {/* ── Right column ───────────────────────────────────── */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-sm font-semibold text-text">
                  Perlindungan pembeli
                </h2>
                <ul className="mt-3 space-y-2 text-xs text-text-secondary">
                  <li className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 flex-none text-primary" />
                    Dana ditahan di escrow sampai kamu klik Selesai
                  </li>
                  <li className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 flex-none text-primary" />
                    Serah terima di Rekber Room, diawasi admin, tercatat
                    sebagai bukti
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Timer className="h-4 w-4 flex-none text-primary" />
                    Proteksi {protectionDays} hari termasuk di setiap pesanan
                  </li>
                </ul>

                <div className="mt-5 border-t border-border pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                      Kode akun
                    </span>
                    <span className="num rounded-md bg-surface-elevated px-2 py-1 text-xs font-semibold tracking-wider text-text">
                      {listing.code}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
                    <span className="num font-display text-3xl font-bold tracking-tight text-text">
                      {formatRupiah(listing.price)}
                    </span>
                    {listing.oldPrice && (
                      <>
                        <span className="num text-sm text-text-secondary line-through">
                          {formatRupiah(listing.oldPrice)}
                        </span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          -{discount}%
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    Stok:{" "}
                    <span className="font-medium text-text">Terakhir</span>
                  </p>
                </div>

                {/* Fee breakdown per docs/MONEY_RULES.md §2 — display only */}
                <dl className="mt-4 space-y-1.5 rounded-xl bg-surface-elevated p-3.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <dt>Harga akun</dt>
                    <dd className="num">{formatRupiah(listing.price)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Biaya penanganan (maks. 3,5%)</dt>
                    <dd className="num">{formatRupiah(handlingFee)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Proteksi {protectionDays} hari (wajib)</dt>
                    <dd className="num">{formatRupiah(PROTECTION_FEE)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-text">
                    <dt>Total bayar</dt>
                    <dd className="num">{formatRupiah(totalPay)}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <BuyPanel
                    catalogId={listing.id}
                    price={listing.price}
                    status={listing.status}
                    storeSlug={listing.storeSlug}
                    context={context}
                    loggedIn={Boolean(user)}
                  />
                </div>

                <p className="mt-3 text-center text-xs text-text-secondary">
                  Akun dikunci otomatis untukmu selama menunggu pembayaran (60 menit), tidak bisa dibeli orang lain.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                  {paymentMethods.map((method) => (
                    <span
                      key={method}
                      className="rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              {/* Store card */}
              <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
                <Link
                  href={`/store/${listing.storeSlug}`}
                  className="group flex items-center gap-3"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary">
                    {listing.store.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-text transition-colors duration-200 group-hover:text-primary">
                      <span className="truncate">{listing.store}</span>
                      {listing.verified && (
                        <BadgeCheck className="h-4 w-4 flex-none text-primary" />
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Member sejak {store?.joined ?? "2024"}
                    </p>
                  </div>
                </Link>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <dt className="text-xs text-text-secondary">
                      Rating toko
                    </dt>
                    <dd className="mt-0.5 flex items-center gap-1 text-sm font-medium text-text">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="num">{store?.rating ?? 0}</span>
                      <span className="num text-xs font-normal text-text-secondary">
                        · {store?.reviews ?? 0} ulasan
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">
                      Total pesanan
                    </dt>
                    <dd className="num mt-0.5 text-sm font-medium text-text">
                      {formatCompact(store?.sold ?? 0)} terjual
                    </dd>
                  </div>
                </dl>

                <Button
                  href={`/store/${listing.storeSlug}`}
                  variant="secondary"
                  size="md"
                  className="mt-4 w-full"
                >
                  <Store className="h-4 w-4" />
                  Kunjungi Toko
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

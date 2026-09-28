import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronRight,
  Flag,
  MessageSquare,
  ShieldCheck,
  Star,
  Timer,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InspectChecklist } from "@/components/orders/inspect-checklist";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { orderStatusLabel, orderSteps, stepIndexOf } from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { getBuyerOrder, orderDetails } from "@/lib/data/buyer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pesanan ${id} — valostock.id` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const order = await getBuyerOrder(user.id, id);
  const details = order ? orderDetails(order) : null;
  if (!order || !details) notFound();

  const { listing, handlingFee, protectionFee, totalPaid, protectionDays } =
    details;
  const step = stepIndexOf(order.status);
  const unpaid = order.status === "PENDING_PAYMENT";
  const inRekber = order.status === "IN_REKBER" || order.status === "SAFE";
  const completed = order.status === "COMPLETED";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="max-w-4xl py-8 sm:py-10">
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
              href="/account/orders/my"
              className="transition-colors duration-200 hover:text-text"
            >
              Pesanan Saya
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="num text-text">{order.id}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="num font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
                {order.id}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Dibuat {formatDateLong(order.createdAt)}
              </p>
            </div>
            <Badge
              variant={
                completed ? "success" : unpaid ? "warning" : "default"
              }
            >
              {orderStatusLabel[order.status]}
            </Badge>
          </div>

          {/* Timeline: Unpaid → Paid → In Rekber → Safe → Completed */}
          <ol className="mt-8 grid grid-cols-5 gap-2">
            {orderSteps.map((item, index) => {
              const reached = index <= step;
              return (
                <li key={item.key} className="text-center">
                  <div className="flex items-center">
                    <span
                      className={`h-0.5 flex-1 ${index === 0 ? "opacity-0" : reached ? "bg-primary" : "bg-border"}`}
                    />
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-semibold ${
                        reached
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-text-secondary"
                      }`}
                    >
                      {reached ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span
                      className={`h-0.5 flex-1 ${index === orderSteps.length - 1 ? "opacity-0" : index < step ? "bg-primary" : "bg-border"}`}
                    />
                  </div>
                  <p
                    className={`mt-2 text-[11px] leading-tight sm:text-xs ${
                      reached ? "font-medium text-text" : "text-text-secondary"
                    }`}
                  >
                    {item.label}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left: action area per status */}
            <div className="min-w-0 space-y-6">
              {unpaid && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Timer className="h-4 w-4 text-amber-500" />
                    Selesaikan pembayaranmu
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Pesanan dibatalkan otomatis jika tidak dibayar. Dana masuk
                    escrow — bukan langsung ke toko.
                  </p>
                  <Button
                    href={`/checkout/${order.id}/pay`}
                    variant="primary"
                    size="lg"
                    className="mt-4"
                  >
                    Bayar Sekarang
                  </Button>
                </div>
              )}

              {inRekber && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Rekber Room aktif
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Serah terima berlangsung di Rekber Room{" "}
                    <span className="num font-semibold text-text">
                      {listing.code}
                    </span>{" "}
                    — diawasi admin dan seluruh percakapan tercatat sebagai
                    bukti.
                  </p>
                  <Button variant="primary" size="lg" className="mt-4">
                    <MessageSquare className="h-4 w-4" />
                    Masuk Rekber Room
                  </Button>
                </div>
              )}

              {(order.status === "SAFE" || completed) && (
                <InspectChecklist completed={completed} />
              )}

              {completed && (
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <h2 className="text-sm font-semibold text-text">
                    Penilaianmu
                  </h2>
                  {order.rated ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      Kamu sudah memberi rating untuk {listing.store}. Terima
                      kasih!
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-text-secondary">
                        Beri rating keseluruhan + skor layanan (akurasi
                        deskripsi, sikap, kecepatan) untuk membantu pembeli
                        lain.
                      </p>
                      <Button variant="primary" size="md" className="mt-4">
                        <Star className="h-4 w-4" />
                        Beri Rating
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Protection + dispute */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Proteksi {protectionDays} hari
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Jendela dukungan & penanganan keamanan — bantuan recall dan
                  sengketa, bukan penahanan dana. Ada masalah? Ajukan dalam 72
                  jam.
                </p>
                <Button variant="secondary" size="md" className="mt-4">
                  <Flag className="h-4 w-4" />
                  Laporkan / Ajukan Sengketa
                </Button>
              </div>
            </div>

            {/* Right: order summary */}
            <aside className="lg:self-start">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-sm font-semibold text-text">Detail Pesanan</h2>
                <Link
                  href={`/catalog/${listing.id}`}
                  className="group mt-4 flex gap-3"
                >
                  <span className="relative h-16 w-20 flex-none overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    <Image
                      src={listing.images[0]}
                      alt={listing.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium text-text transition-colors duration-200 group-hover:text-primary">
                      {listing.title}
                    </span>
                    <span className="num mt-0.5 block text-xs text-text-secondary">
                      VS: {listing.code}
                    </span>
                  </span>
                </Link>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <dt>Harga akun</dt>
                    <dd className="num">{formatRupiah(listing.price)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Biaya penanganan</dt>
                    <dd className="num">{formatRupiah(handlingFee)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Proteksi</dt>
                    <dd className="num">{formatRupiah(protectionFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
                    <dt>Total</dt>
                    <dd className="num">{formatRupiah(totalPaid)}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-border pt-4">
                  <Link
                    href={`/store/${listing.storeSlug}`}
                    className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
                  >
                    Toko: {listing.store} →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

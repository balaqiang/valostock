import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, ShieldCheck, Timer } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderActions } from "@/components/orders/order-actions";
import { RekberRoom } from "@/components/orders/rekber-room";
import { RatingForm } from "@/components/orders/rating-form";
import { DisputeForm } from "@/components/orders/dispute-form";
import { formatDbDateTime, formatRupiah } from "@/lib/format";
import { disputeStatusLabel, orderStatusLabel, orderSteps, stepIndexOf } from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Detail Pesanan — valostock.id" };

const REKBER_VISIBLE = new Set(["PAID", "IN_REKBER", "SAFE", "COMPLETED", "DISPUTED", "REFUNDED"]);
const REKBER_WRITABLE = new Set(["PAID", "IN_REKBER", "SAFE", "DISPUTED"]);

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/orders/${id}`);
  const order = await getOrder(id);
  if (!order) notFound();

  const step = stepIndexOf(order.status);
  const unpaid = order.status === "PENDING_PAYMENT";
  const completed = order.status === "COMPLETED";
  const cancelled = order.status === "CANCELLED";
  const protectionDays = order.itemPrice > 10_000_000 ? 30 : 14;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />

      <main className="flex-1">
        <Container className="max-w-4xl py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Link href="/" className="transition-colors duration-200 hover:text-text">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              href={order.viewerRole === "STORE" ? "/store-dashboard/orders" : "/account/orders/my"}
              className="transition-colors duration-200 hover:text-text"
            >
              {order.viewerRole === "STORE" ? "Pesanan Toko" : "Pesanan Saya"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="num text-text">{order.orderNumber}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="num font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
                {order.orderNumber}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">Dibuat {formatDbDateTime(order.createdAt)} WIB</p>
            </div>
            <Badge variant={completed ? "success" : unpaid ? "warning" : cancelled ? "destructive" : "default"}>
              {orderStatusLabel[order.status]}
            </Badge>
          </div>

          {!cancelled && (
            <ol className="mt-8 grid grid-cols-5 gap-2">
              {orderSteps.map((item, index) => {
                const reached = index <= step;
                return (
                  <li key={item.key} className="text-center">
                    <div className="flex items-center">
                      <span className={`h-0.5 flex-1 ${index === 0 ? "opacity-0" : reached ? "bg-primary" : "bg-border"}`} />
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-xs font-semibold ${
                          reached ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary"
                        }`}
                      >
                        {reached ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span
                        className={`h-0.5 flex-1 ${index === orderSteps.length - 1 ? "opacity-0" : index < step ? "bg-primary" : "bg-border"}`}
                      />
                    </div>
                    <p className={`mt-2 text-[11px] leading-tight sm:text-xs ${reached ? "font-medium text-text" : "text-text-secondary"}`}>
                      {item.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-6">
              {unpaid && order.viewerRole === "BUYER" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                    <Timer className="h-4 w-4 text-amber-500" />
                    Selesaikan pembayaranmu
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Akun ini dikunci untukmu selama menunggu pembayaran. Dana masuk escrow — bukan langsung ke toko.
                  </p>
                  <Button href={`/checkout/${order.id}/pay`} variant="primary" size="lg" className="mt-4">
                    Bayar Sekarang
                  </Button>
                </div>
              )}

              {cancelled && (
                <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-secondary">
                  Pesanan ini dibatalkan. Akun kembali dijual di katalog.
                </p>
              )}

              {REKBER_VISIBLE.has(order.status) && (
                <RekberRoom
                  orderId={order.id}
                  roomCode={order.roomCode}
                  viewerRole={order.viewerRole}
                  canSend={REKBER_WRITABLE.has(order.status)}
                />
              )}

              <OrderActions order={order} />

              {order.canRate && <RatingForm orderId={order.id} />}

              {order.status === "SAFE" && order.autoCompleteAt && (
                <p className="rounded-xl bg-surface-elevated px-4 py-3 text-xs text-text-secondary">
                  Jika tidak ada sengketa, pesanan selesai otomatis pada {formatDbDateTime(order.autoCompleteAt)} WIB dan dana dilepas ke toko.
                </p>
              )}

              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Proteksi {protectionDays} hari
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Jendela dukungan & penanganan keamanan — bantuan recall dan sengketa, bukan penahanan dana.
                  {order.protectionUntil && <> Aktif sampai {formatDbDateTime(order.protectionUntil)} WIB.</>}
                </p>
                {order.dispute ? (
                  <Link href={`/disputes/${order.dispute.id}`} className="mt-4 inline-flex text-sm font-medium text-primary">
                    Lihat sengketa ({disputeStatusLabel[order.dispute.status]}) →
                  </Link>
                ) : order.canDispute ? (
                  <div className="mt-4">
                    <DisputeForm orderId={order.id} afterCompletion={completed} />
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="lg:self-start">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-sm font-semibold text-text">Detail Pesanan</h2>
                <Link href={`/catalog/${order.catalog.id}`} className="group mt-4 flex gap-3">
                  <span className="relative h-16 w-20 flex-none overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    <Image src={order.catalog.image} alt={order.catalog.title} fill sizes="80px" className="object-cover" unoptimized />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium text-text transition-colors duration-200 group-hover:text-primary">
                      {order.catalog.title}
                    </span>
                    <span className="num mt-0.5 block text-xs text-text-secondary">VS: {order.roomCode}</span>
                  </span>
                </Link>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  {order.isBundle && (
                    <ul className="mb-2 space-y-0.5 text-xs text-text-secondary">
                      {order.items.map((item) => (
                        <li key={item.catalogId} className="flex justify-between gap-2">
                          <span className="truncate">{item.vsCode} · {item.title}</span>
                          <span className="num">{formatRupiah(item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {order.voucherDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-text-secondary">
                        <dt>Subtotal</dt>
                        <dd className="num">{formatRupiah(order.itemsSubtotal)}</dd>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <dt>Voucher {order.voucherCode}</dt>
                        <dd className="num">−{formatRupiah(order.voucherDiscount)}</dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-text-secondary">
                    <dt>Harga akun{order.viaOffer ? " (hasil nego)" : ""}</dt>
                    <dd className="num">{formatRupiah(order.itemPrice)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Biaya penanganan</dt>
                    <dd className="num">{formatRupiah(order.handlingFee)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Proteksi</dt>
                    <dd className="num">{formatRupiah(order.protectionFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
                    <dt>Total</dt>
                    <dd className="num">{formatRupiah(order.totalPaid)}</dd>
                  </div>
                  {order.viewerRole !== "BUYER" && (
                    <>
                      <div className="flex justify-between pt-2 text-text-secondary">
                        <dt>Komisi platform ({(order.commissionRate * 100).toLocaleString("id-ID")}%)</dt>
                        <dd className="num">−{formatRupiah(order.commission)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-text">
                        <dt>Diterima toko</dt>
                        <dd className="num">{formatRupiah(order.storeReceives)}</dd>
                      </div>
                    </>
                  )}
                </dl>

                <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                  <Link
                    href={`/store/${order.store.slug}`}
                    className="font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
                  >
                    Toko: {order.store.name} →
                  </Link>
                  <p className="text-xs text-text-secondary">Pembeli: {order.buyer.name}</p>
                  {order.payment && <p className="num text-xs text-text-secondary">Invoice: {order.payment.invoice}</p>}
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

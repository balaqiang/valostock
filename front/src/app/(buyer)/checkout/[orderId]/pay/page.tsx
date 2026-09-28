import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Timer } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { PayForm } from "@/components/checkout/pay-form";
import { formatRupiah } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data/buyer";

export const metadata: Metadata = { title: "Pembayaran — valostock.id" };

export default async function CheckoutPayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  await requireUser(`/checkout/${orderId}/pay`);
  const order = await getOrder(orderId);
  if (!order || order.viewerRole !== "BUYER") notFound();
  const unpaid = order.status === "PENDING_PAYMENT";

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
              href={`/orders/${order.id}`}
              className="transition-colors duration-200 hover:text-text"
            >
              Pesanan
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-text">Pembayaran</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Pilih Metode Pembayaran
            </h1>
            {unpaid ? (
              <Badge variant="warning">
                <Timer />
                Menunggu pembayaran
              </Badge>
            ) : (
              <Badge variant="secondary">Tidak menunggu pembayaran</Badge>
            )}
          </div>
          <p className="num mt-1 text-sm text-text-secondary">
            No. pesanan: {order.orderNumber}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            {/* Method selector */}
            <div className="min-w-0">
              {unpaid ? (
                <PayForm orderId={order.id} total={order.totalPaid} />
              ) : (
                <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
                  Pesanan ini sudah dibayar atau dibatalkan.{" "}
                  <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:text-primary-hover">
                    Lihat pesanan →
                  </Link>
                </p>
              )}
            </div>

            {/* Order summary */}
            <aside className="lg:order-first lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-sm font-semibold text-text">
                  Ringkasan Pesanan
                </h2>

                <Link
                  href={`/catalog/${order.catalog.id}`}
                  className="group mt-4 flex gap-3"
                >
                  <span className="relative h-16 w-20 flex-none overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    <Image
                      src={order.catalog.image}
                      alt={order.catalog.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium text-text transition-colors duration-200 group-hover:text-primary">
                      {order.catalog.title}
                    </span>
                    <span className="num mt-0.5 block text-xs text-text-secondary">
                      VS: {order.roomCode} · {order.store.name}
                    </span>
                  </span>
                </Link>

                {/* item + handling + protection per docs/MONEY_RULES.md §2 */}
                <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <dt>Harga akun</dt>
                    <dd className="num">{formatRupiah(order.itemPrice)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Biaya penanganan (maks. 3,5%)</dt>
                    <dd className="num">{formatRupiah(order.handlingFee)}</dd>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <dt>Proteksi {order.itemPrice > 10_000_000 ? 30 : 14} hari (wajib)</dt>
                    <dd className="num">{formatRupiah(order.protectionFee)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-text">
                    <dt>Total bayar</dt>
                    <dd className="num">{formatRupiah(order.totalPaid)}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

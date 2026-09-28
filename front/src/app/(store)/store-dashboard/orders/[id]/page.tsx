import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  MessageSquare,
  Send,
  Timer,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/account/bits";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { storeOrderStatusLabel } from "@/lib/labels";
import { storeReceives as receivesAt } from "@/lib/fees";
import { getStoreOrder, getSubscription, requireStore } from "@/lib/data/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pesanan ${id} — Dashboard Toko` };
}

export default async function StoreOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await requireStore(`/store-dashboard/orders/${id}`);
  const [order, mySubscription] = await Promise.all([getStoreOrder(store.slug, id), getSubscription(store.slug)]);
  if (!order) notFound();
  const storeReceives = (itemPrice: number) => receivesAt(itemPrice, mySubscription.commissionRate);

  const commission = Math.round(order.itemPrice * mySubscription.commissionRate);

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-text-secondary"
      >
        <Link
          href="/store-dashboard/orders"
          className="transition-colors duration-200 hover:text-text"
        >
          Pesanan
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="num text-text">{order.id}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={order.id}
          description={`${order.title} · pembeli: ${order.buyer} · ${formatDateLong(order.createdAt)}`}
        />
        <Badge
          variant={
            order.status === "COMPLETED"
              ? "success"
              : order.status === "DISPUTED"
                ? "destructive"
                : "default"
          }
        >
          {storeOrderStatusLabel[order.status]}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* Status-specific action */}
          {order.status === "IN_REKBER" && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Send className="h-4 w-4 text-primary" />
                Kirim akun di Rekber Room {order.roomCode}
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
                <li>• Serahkan seluruh akses akun hanya di dalam Rekber Room.</li>
                <li>
                  • Simpan bukti pengiriman (screenshot sebelum/sesudah; video
                  disimpan ≥ 1 bulan).
                </li>
                <li>
                  • Jangan pernah konfirmasi pengiriman sebelum benar-benar
                  terkirim.
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" size="md">
                  <MessageSquare className="h-4 w-4" />
                  Masuk Rekber Room
                </Button>
                <Button variant="secondary" size="md">
                  <Camera className="h-4 w-4" />
                  Unggah Bukti Pengiriman
                </Button>
              </div>
            </div>
          )}

          {order.status === "SAFE" && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Timer className="h-4 w-4 text-primary" />
                Akun aman — menunggu rilis dana
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Pembeli sudah menerima akun dengan aman
                {order.safeAt ? ` pada ${formatDateLong(order.safeAt)}` : ""}.
                Dana (setelah komisi) tersedia untuk ditarik 5 jam setelah
                status aman. Untuk akun titipan, Transfer Request ke penjual
                eksternal juga terbuka setelah jendela yang sama.
              </p>
            </div>
          )}

          {order.status === "DISPUTED" && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Sengketa aktif — tanggapi sebelum tenggat
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Kirim pernyataan lengkap + bukti pengiriman dalam 72 jam.
                Melewatkan tenggat dapat dianggap menerima klaim pembeli.
                Keputusan arbitrase platform bersifat final.
              </p>
              <Button variant="secondary" size="md" className="mt-4">
                Kirim Tanggapan & Bukti
              </Button>
            </div>
          )}

          {order.status === "COMPLETED" && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-text">
                Pesanan selesai 🎉
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Dana sudah masuk ke saldo tokomu. Simpan bukti pengiriman
                minimal 1 bulan untuk berjaga-jaga.
              </p>
            </div>
          )}
        </div>

        {/* Money summary */}
        <aside className="lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <Wallet className="h-4 w-4 text-primary" />
              Rincian Dana
            </h2>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-text-secondary">
                <dt>Harga akun</dt>
                <dd className="num">{formatRupiah(order.itemPrice)}</dd>
              </div>
              <div className="flex justify-between text-text-secondary">
                <dt>
                  Komisi platform (
                  {(mySubscription.commissionRate * 100).toLocaleString("id-ID")}%)
                </dt>
                <dd className="num">−{formatRupiah(commission)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-text">
                <dt>Masuk saldo toko</dt>
                <dd className="num">{formatRupiah(storeReceives(order.itemPrice))}</dd>
              </div>
            </dl>
            <p className="num mt-4 border-t border-border pt-3 text-xs text-text-secondary">
              Rekber Room: {order.roomCode}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
